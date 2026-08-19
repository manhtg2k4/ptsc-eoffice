import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, IsNull, Brackets } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CustomSenderUnitEntity } from './custom-sender-unit.entity';
import { CreateCustomSenderUnitDto } from './dto/create-custom-sender-unit.dto';
import { UpdateCustomSenderUnitDto } from './dto/update-custom-sender-unit.dto';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';

const STATUS_ACTIVE = 1;
const STATUS_DELETED = 0;

@Injectable()
export class CustomSenderUnitService {
  constructor(
    @InjectRepository(CustomSenderUnitEntity, 'mssqlConnection')
    private readonly repo: Repository<CustomSenderUnitEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection') 
    private readonly organizationRepo: Repository<OrganizationUnitEntity>,
  ) { }

  /**
   * Tạo mới đơn vị gửi tùy chỉnh
   */
  async create(
    dto: CreateCustomSenderUnitDto,
    userId: string,
    userName?: string,
  ): Promise<CustomSenderUnitEntity> {
    const existing = await this.repo.findOne({
      where: {
        code: dto.code,
        createdBy: userId,
        status: STATUS_ACTIVE,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Mã đơn vị gửi "${dto.code}" đã tồn tại trong danh sách của bạn.`,
      );
    }

    // Generate ID trước để tính mpath
    const entityId = uuidv4();
    
    // Tính mpath để khớp với organization_units
    let mpath: string;
    if (dto.parentId) {
      // Con: mpath = parent.mpath + . + parentId
      // Tìm parent từ custom_sender_units hoặc organization_units
      let parent: any = await this.repo.findOne({
        where: { id: dto.parentId, status: STATUS_ACTIVE },
        select: ['mpath', 'id'],
      });
      
      // Nếu không tìm trong custom, tìm trong organization
      if (!parent) {
        parent = await this.organizationRepo.findOne({
          where: { id: dto.parentId },
          select: ['mpath', 'id'],
        });
      }
      
      if (!parent) {
        throw new NotFoundException(
          `Không tìm thấy đơn vị cha với ID "${dto.parentId}".`,
        );
      }
      
      mpath = parent.mpath ? `${parent.mpath}.${entityId}` : entityId;
    } else {
      // Root: mpath = id (giống organization_units)
      mpath = entityId;
    }

    const entity = this.repo.create({
      id: entityId,
      name: dto.name,
      code: dto.code,
      parentId: dto.parentId || null,
      mpath: mpath,
      createdBy: userId,
      createdByName: userName || null,
      status: STATUS_ACTIVE,
    });

    return this.repo.save(entity);
  }

  /**
   * Lấy danh sách đơn vị gửi của user hiện tại
   */
  async findByUser(
    userId: string,
    queryParams?: { page?: number; limit?: number; name?: string },
  ) {
    const page = Math.max(Number(queryParams?.page) || 1, 1);
    const limit = Math.max(Number(queryParams?.limit) || 50, 1);

    // Sử dụng QueryBuilder để xử lý logic "Cấp 1" phức tạp
    const query = this.repo.createQueryBuilder('unit')
      .where('unit.status = :status', { status: STATUS_ACTIVE })
      .andWhere('unit.createdBy = :userId', { userId });

    if (queryParams?.name) {
      query.andWhere('(unit.name LIKE :name OR unit.code LIKE :name)', { name: `%${queryParams.name}%` });
    } else {
      // Logic Cấp 1: parentId là null, rỗng, hoặc không nằm trong bảng custom_sender_units hoặc organization_units
      query.andWhere(new Brackets(qb => {
        qb.where('unit.parentId IS NULL')
          .orWhere("unit.parentId = ''")
          .orWhere('unit.parentId NOT IN (SELECT id FROM custom_sender_units WHERE status = 1)')
          .orWhere('unit.parentId NOT IN (SELECT id FROM organization_units)');
      }));
    }

    const total = await query.getCount();
    const entities = await query
      .orderBy('unit.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // BƯỚC 2: Lấy tên đơn vị cha thủ công để tránh lỗi Join
    const parentIds = entities
      .map(e => e.parentId)
      .filter(id => !!id);

    let parentMap = {};
    if (parentIds.length > 0) {
      const parents = await this.repo.find({
        where: { id: In(parentIds) }
      });
      parentMap = parents.reduce((acc, p) => {
        acc[p.id] = p.name;
        return acc;
      }, {});
    }

    const data = entities.map((item) => ({
      ...item,
      _id: item.id,
      parentName: item.parentId ? parentMap[item.parentId] || null : null,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Lấy tất cả đơn vị gửi tùy chỉnh + organization units (top-level)
   * Source: 'custom' từ custom_sender_units (có thể xóa)
   *         'organization' từ organization_units (không thể xóa)
   */
  async findAll(queryParams?: {
    page?: number;
    limit?: number;
    name?: string;
    nameTree?: string;
    code?: string;
    sort?: Record<string, number | string>;
    processFn?: string;
  }) {
    const page = Math.max(Number(queryParams?.page) || 1, 1);
    const limit = Math.max(Number(queryParams?.limit) || 50, 1);
    const searchTerm = queryParams?.name || queryParams?.nameTree || null;
    const codeTerm = queryParams?.code || null;

    // ========== BƯỚC 1: Lấy custom sender units ==========
    // Khi search: trả về tất cả match (cả parent và con)
    // Khi không search: chỉ trả về root units (parentId = null)
    const customQuery = this.repo.createQueryBuilder('unit')
      .where('unit.status = :status', { status: STATUS_ACTIVE });

    if (searchTerm || codeTerm) {
      customQuery.andWhere(new Brackets(qb => {
        if (searchTerm) {
          qb.where('LOWER(unit.name) LIKE LOWER(:q)', { q: `%${searchTerm}%` })
            .orWhere('LOWER(unit.code) LIKE LOWER(:q)', { q: `%${searchTerm}%` });
        }
        if (codeTerm) {
          qb.orWhere('LOWER(unit.code) LIKE LOWER(:code)', { code: `%${codeTerm}%` });
        }
      }));
    } else {
      // Không search: chỉ lấy root units
      customQuery.andWhere('unit.parentId IS NULL');
    }

    const customEntities = await customQuery.getMany();

    // ========== BƯỚC 2: Lấy organization units ==========
    // Khi search: trả về tất cả match (cả parent và con)
    // Khi không search: chỉ trả về root units (parent = null)
    const orgQuery = this.organizationRepo.createQueryBuilder('org');

    if (searchTerm || codeTerm) {
      orgQuery.andWhere(new Brackets(qb => {
        if (searchTerm) {
          qb.where('LOWER(org.name) LIKE LOWER(:q)', { q: `%${searchTerm}%` })
            .orWhere('LOWER(org.code) LIKE LOWER(:q)', { q: `%${searchTerm}%` });
        }
        if (codeTerm) {
          qb.orWhere('LOWER(org.code) LIKE LOWER(:code)', { code: `%${codeTerm}%` });
        }
      }));
    } else {
      // Không search: chỉ lấy root units
      orgQuery.andWhere('org.parent IS NULL');
    }

    const orgEntities = await orgQuery.getMany();

    // ========== BƯỚC 3: Merge + Format dữ liệu ==========
    // Convert organization units → format compatible
    const mergedData = [
      ...customEntities.map(item => ({
        ...item,
        source: 'custom', // Đánh dấu nguồn
        createdAt: item.createdAt,
      })),
      ...orgEntities.map(item => ({
        ...item,
        source: 'organization',
        id: item.id,
        name: item.name,
        code: item.code,
        parentId: null, // Organization units không có parentId trong custom logic
        createdAt: item.createdAt,
      })),
    ];

    // ========== BƯỚC 4: Sort ==========
    const allowedSortFields = ['name', 'code', 'nameTree', 'createdAt', 'updatedAt'];
    let sortField = 'createdAt';
    let sortDirection: 'ASC' | 'DESC' = 'DESC';

    if (queryParams?.sort && typeof queryParams.sort === 'object') {
      for (const [field, order] of Object.entries(queryParams.sort)) {
        if (allowedSortFields.includes(field)) {
          sortField = field === 'nameTree' ? 'name' : field;
          sortDirection = order === '-1' || order === -1 ? 'DESC' : 'ASC';
          break;
        }
      }
    }

    const sorted = mergedData.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'DESC' ? -comparison : comparison;
    });

    // ========== BƯỚC 5: Paginate ==========
    const total = sorted.length;
    const paginatedData = sorted.slice((page - 1) * limit, page * limit);

    // ========== BƯỚC 6: Lấy parent info ==========
    const parentIds = [
      ...new Set(
        paginatedData
          .filter(e => e.source === 'custom' && e.parentId)
          .map(e => e.parentId)
          .filter(Boolean),
      ),
    ];

    let parentMap: Record<string, any> = {};
    if (parentIds.length > 0) {
      const systemParents = await this.organizationRepo.find({ where: { id: In(parentIds) } });
      const customParents = await this.repo.find({ where: { id: In(parentIds) } });
      const allParents = [...systemParents, ...customParents];
      parentMap = allParents.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);
    }

    // ========== BƯỚC 7: Đếm children cho TẤT CẢ items, không chỉ page hiện tại ==========
    // Để hasChildren chính xác, cần query toàn bộ children của merged data
    const customIds = sorted.filter(e => e.source === 'custom').map(e => e.id);
    let childCountMap: Record<string, number> = {};
    
    // Đếm children từ custom_sender_units
    if (customIds.length > 0) {
      const children = await this.repo.find({
        where: { parentId: In(customIds), status: STATUS_ACTIVE },
        select: ['parentId'],
      });
      childCountMap = children.reduce((acc, child) => {
        if (child.parentId) {
          acc[child.parentId] = (acc[child.parentId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
    }

    // Đếm children từ organization_units cho org parents
    const orgIds = sorted.filter(e => e.source === 'organization').map(e => e.id);
    if (orgIds.length > 0) {
      const orgChildCounts = await this.organizationRepo.createQueryBuilder('org')
        .select('org.parent', 'parentId')
        .addSelect('COUNT(org.id)', 'count')
        .where('org.parent IN (:...orgIds)', { orgIds })
        .andWhere('org.status = :status', { status: 1 })
        .groupBy('org.parent')
        .getRawMany();

      for (const row of orgChildCounts) {
        childCountMap[row.parentId] = (childCountMap[row.parentId] || 0) + Number(row.count);
      }

      const customChildCounts = await this.repo.createQueryBuilder('unit')
        .select('unit.parentId', 'parentId')
        .addSelect('COUNT(unit.id)', 'count')
        .where('unit.parentId IN (:...orgIds)', { orgIds })
        .andWhere('unit.status = :status', { status: STATUS_ACTIVE })
        .groupBy('unit.parentId')
        .getRawMany();

      for (const row of customChildCounts) {
        childCountMap[row.parentId] = (childCountMap[row.parentId] || 0) + Number(row.count);
      }
    }

    // ========== BƯỚC 8: Format response ==========
    const data = paginatedData.map((item) => {
      const parent = item.source === 'custom' && item.parentId ? parentMap[item.parentId] : null;

      return {
        ...item,
        _id: item.id,
        nameTree: item.name,
        parentName: parent?.name || null,
        parentCode: parent?.code || null,
        organizationUnit: parent ? { id: parent.id, name: parent.name, code: parent.code } : null,
        parent: null,
        source: item.source, // Đánh dấu nguồn để frontend dùng khi gọi findOne
        flags: {
          hasChildren: (childCountMap[item.id] || 0) > 0,
        },
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Lấy danh sách đơn vị con theo parentId (lazy-load tree)
   * Hỗ trợ cả custom_sender_units và organization_units
   */
  async getChildrenByParentId(
    parentId: string,
    queryParams?: { page?: number; limit?: number },
  ) {
    const page = Math.max(Number(queryParams?.page) || 1, 1);
    const limit = Math.max(Number(queryParams?.limit) || 10, 1);

    // Kiểm tra parent từ bảng nào
    const isCustomParent = await this.repo.findOne({ where: { id: parentId } });
    const isOrgParent = await this.organizationRepo.findOne({ where: { id: parentId } });

    let entities: any[] = [];
    let total = 0;

    // ========== Nếu parent từ custom_sender_units ==========
    if (isCustomParent) {
      [entities, total] = await this.repo.findAndCount({
        where: {
          parentId,
          status: STATUS_ACTIVE,
        },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      entities = entities.map(e => ({
        ...e,
        source: 'custom',
      }));
    }
    // ========== Nếu parent từ organization_units ==========
    else if (isOrgParent) {
      // Lấy organization units con
      const orgQuery = this.organizationRepo.createQueryBuilder('org')
        .where('org.parent = :parentId', { parentId })
        .orderBy('org.createdAt', 'DESC');
      
      const orgEntities = await orgQuery.getMany();
      
      // Lấy custom units con (parentId = parentId của org unit)
      const customEntities = await this.repo.findAndCount({
        where: {
          parentId,
          status: STATUS_ACTIVE,
        },
        order: { createdAt: 'DESC' },
      });

      // Merge: organization units + custom units
      entities = [
        ...orgEntities.map(e => ({
          ...e,
          source: 'organization',
        })),
        ...customEntities[0].map(e => ({
          ...e,
          source: 'custom',
        })),
      ];
      
      // Paginate sau khi merge
      total = entities.length;
      entities = entities.slice((page - 1) * limit, page * limit);
    } else {
      throw new NotFoundException(`Không tìm thấy đơn vị cha với ID: ${parentId}`);
    }

    // ========== Đếm con cho mỗi child ==========
    const entityIds = entities.map((e) => e.id);
    let childCountMap: Record<string, number> = {};

    if (entityIds.length > 0 && isCustomParent) {
      // Custom units: đếm children trong custom_sender_units bằng GROUP BY
      const customChildCounts = await this.repo.createQueryBuilder('unit')
        .select('unit.parentId', 'parentId')
        .addSelect('COUNT(unit.id)', 'count')
        .where('unit.parentId IN (:...entityIds)', { entityIds })
        .andWhere('unit.status = :status', { status: STATUS_ACTIVE })
        .groupBy('unit.parentId')
        .getRawMany();

      for (const row of customChildCounts) {
        childCountMap[row.parentId] = Number(row.count);
      }
    } else if (entityIds.length > 0 && isOrgParent) {
      // Organization units: đếm children từ organization_units + custom_units
      const orgChildCounts = await this.organizationRepo.createQueryBuilder('org')
        .select('org.parent', 'parentId')
        .addSelect('COUNT(org.id)', 'count')
        .where('org.parent IN (:...entityIds)', { entityIds })
        .andWhere('org.status = :status', { status: 1 })
        .groupBy('org.parent')
        .getRawMany();

      for (const row of orgChildCounts) {
        childCountMap[row.parentId] = (childCountMap[row.parentId] || 0) + Number(row.count);
      }

      const customChildCounts = await this.repo.createQueryBuilder('unit')
        .select('unit.parentId', 'parentId')
        .addSelect('COUNT(unit.id)', 'count')
        .where('unit.parentId IN (:...entityIds)', { entityIds })
        .andWhere('unit.status = :status', { status: STATUS_ACTIVE })
        .groupBy('unit.parentId')
        .getRawMany();

      for (const row of customChildCounts) {
        childCountMap[row.parentId] = (childCountMap[row.parentId] || 0) + Number(row.count);
      }
    }

    // ========== Format response ==========
    const data = entities.map((item) => {
      const parentIdValue = item.source === 'custom' 
        ? item.parentId 
        : (item as OrganizationUnitEntity).parent;
      
      return {
        ...item,
        _id: item.id,
        nameTree: item.name,
        parent: parentIdValue ? { id: parentIdValue } : null,
        flags: {
          hasChildren: (childCountMap[item.id] || 0) > 0,
        },
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Lấy chi tiết 1 đơn vị gửi
   * Tối ưu: nếu có source, query trực tiếp bảng đó; nếu không, query lần lượt
   */
  async findOne(id: string, source?: 'custom' | 'organization'): Promise<any> {
    let entity: CustomSenderUnitEntity | OrganizationUnitEntity | null = null;
    let foundSource = source;

    // ========== BƯỚC 1: Query dựa vào source ==========
    if (source === 'custom') {
      // Query custom_sender_units trực tiếp
      entity = await this.repo.findOne({
        where: { id, status: STATUS_ACTIVE }
      });
      if (!entity) foundSource = undefined;
    } else if (source === 'organization') {
      // Query organization_units trực tiếp
      entity = await this.organizationRepo.findOne({
        where: { id }
      });
      if (!entity) foundSource = undefined;
    } else {
      // Không có source: query custom trước, sau đó organization
      entity = await this.repo.findOne({
        where: { id, status: STATUS_ACTIVE }
      });
      foundSource = entity ? 'custom' : undefined;

      if (!entity) {
        entity = await this.organizationRepo.findOne({
          where: { id }
        });
        foundSource = entity ? 'organization' : undefined;
      }
    }

    if (!entity) {
      throw new NotFoundException('Không tìm thấy đơn vị gửi.');
    }

    // ========== BƯỚC 2: Lấy parent info ==========
    let parentInfo: any = null;
    let parentId = foundSource === 'custom' 
      ? entity.parentId 
      : (entity as OrganizationUnitEntity).parent;

    if (parentId) {
      // Tìm parent từ custom_sender_units trước
      parentInfo = await this.repo.findOne({
        where: { id: parentId as string, status: STATUS_ACTIVE },
        select: ['id', 'name', 'code', 'mpath'],
      });

      // Nếu không có trong custom, tìm trong organization
      if (!parentInfo) {
        parentInfo = await this.organizationRepo.findOne({
          where: { id: parentId as string },
          select: ['id', 'name', 'code', 'mpath'],
        });
      }
    }

    // ========== BƯỚC 3: Đếm children từ cả 2 bảng ==========
    const customChildCount = await this.repo.count({
      where: { parentId: id, status: STATUS_ACTIVE },
    });

    const orgChildCount = await this.organizationRepo
      .createQueryBuilder('org')
      .where('org.parent = :parentId', { parentId: id })
      .getCount();

    const childrenCount = customChildCount + orgChildCount;

    // ========== BƯỚC 4: Format response ==========
    return {
      ...entity,
      _id: entity.id,
      source: foundSource,
      parentInfo: parentInfo ? {
        id: parentInfo.id,
        name: parentInfo.name,
        code: parentInfo.code,
        mpath: parentInfo.mpath,
      } : null,
      childrenCount,
      flags: {
        hasChildren: childrenCount > 0,
      },
    };
  }

  /**
   * Cập nhật đơn vị gửi (chỉ owner hoặc văn thư)
   */
  async update(
    id: string,
    dto: UpdateCustomSenderUnitDto,
    userId: string,
    isAdmin: boolean,
  ): Promise<CustomSenderUnitEntity> {
    const findResult = await this.findOne(id);
    const entity = findResult as CustomSenderUnitEntity;

    if (!isAdmin && entity.createdBy !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền chỉnh sửa đơn vị gửi này.',
      );
    }

    if (dto.code && dto.code !== entity.code) {
      const existing = await this.repo.findOne({
        where: {
          code: dto.code,
          createdBy: entity.createdBy,
          status: STATUS_ACTIVE,
        },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Mã đơn vị gửi "${dto.code}" đã tồn tại.`,
        );
      }
    }

    // Nếu parentId thay đổi, cập nhật mpath
    if (dto.parentId !== undefined && dto.parentId !== entity.parentId) {
      let mpath: string;
      if (dto.parentId) {
        // Con: mpath = parent.mpath + . + parentId
        // Tìm parent từ custom_sender_units hoặc organization_units
        let parent: any = await this.repo.findOne({
          where: { id: dto.parentId, status: STATUS_ACTIVE },
          select: ['mpath', 'id'],
        });
        
        // Nếu không tìm trong custom, tìm trong organization
        if (!parent) {
          parent = await this.organizationRepo.findOne({
            where: { id: dto.parentId },
            select: ['mpath', 'id'],
          });
        }
        
        if (!parent) {
          throw new NotFoundException(
            `Không tìm thấy đơn vị cha với ID "${dto.parentId}".`,
          );
        }
        mpath = parent.mpath ? `${parent.mpath}.${id}` : id;
      } else {
        // Root: mpath = id (giống organization_units)
        mpath = id;
      }
      entity.mpath = mpath;
      entity.parentId = dto.parentId || null;

      // Cập nhật mpath của tất cả node con
      await this.updateChildrenMpath(id, mpath);
    }

    this.repo.merge(entity, dto);
    return this.repo.save(entity);
  }

  /**
   * Cập nhật mpath của tất cả con (recursive)
   * parentMpath = mpath của parent, child.mpath = parentMpath + . + child.id
   */
  private async updateChildrenMpath(parentId: string, parentMpath: string): Promise<void> {
    const children = await this.repo.find({
      where: { parentId, status: STATUS_ACTIVE },
    });

    for (const child of children) {
      // Child mpath = parent.mpath + . + child.id
      const newMpath = `${parentMpath}.${child.id}`;
      await this.repo.update(child.id, { mpath: newMpath });
      
      // Recursive: update con của con
      await this.updateChildrenMpath(child.id, newMpath);
    }
  }

  /**
   * Xóa mềm đơn vị gửi (chỉ owner hoặc văn thư)
   * Không được xóa nếu còn đơn vị con
   * Không thể xóa đơn vị từ organization_units
   */
  async remove(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<void> {
    // Kiểm tra xem item có tồn tại trong custom_sender_units không
    const isCustomUnit = await this.repo.findOne({
      where: { id, status: STATUS_ACTIVE }
    });

    if (!isCustomUnit) {
      // Nếu không tìm thấy trong custom_sender_units, có thể từ organization_units
      const isOrgUnit = await this.organizationRepo.findOne({
        where: { id }
      });

      if (isOrgUnit) {
        throw new ForbiddenException(
          `Không thể xóa "${isOrgUnit.name}" vì đây là đơn vị tổ chức hệ thống. Chỉ có thể xóa các đơn vị gửi tùy chỉnh.`,
        );
      }

      throw new NotFoundException('Không tìm thấy đơn vị gửi.');
    }

    const entity = isCustomUnit;

    if (!isAdmin && entity.createdBy !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền xóa đơn vị gửi này.',
      );
    }

    // Kiểm tra xem còn có đơn vị con không
    const childCount = await this.repo.count({
      where: {
        parentId: id,
        status: STATUS_ACTIVE,
      },
    });

    if (childCount > 0) {
      throw new ForbiddenException(
        `Không thể xóa đơn vị gửi "${entity.name}" vì còn ${childCount} đơn vị con. Vui lòng xóa các đơn vị con trước.`,
      );
    }

    entity.status = STATUS_DELETED;
    await this.repo.save(entity);
  }

  /**
   * Xóa nhiều đơn vị gửi
   * Trả về: { deletedCount, failedCount, failedItems: [{id, reason}] }
   */
  async removeMany(
    ids: string[],
    userId: string,
    isAdmin: boolean,
  ): Promise<{ deletedCount: number; failedCount: number; failedItems: any[] }> {
    if (!ids || ids.length === 0) {
      return { deletedCount: 0, failedCount: 0, failedItems: [] };
    }

    // Lấy tất cả entities để sắp xếp theo thứ tự xóa an toàn (con trước, cha sau)
    const entities = await this.repo.find({
      where: { id: In(ids), status: STATUS_ACTIVE },
      select: ['id', 'mpath'],
      order: { mpath: 'DESC' }, // DESC để con (mpath dài hơn) trước, cha sau
    });

    // Sắp xếp lại ids theo thứ tự entities
    const sortedIds = entities.map(e => e.id);

    let deletedCount = 0;
    const failedItems: any[] = [];

    for (const id of sortedIds) {
      try {
        await this.remove(id, userId, isAdmin);
        deletedCount++;
      } catch (error: any) {
        failedItems.push({
          id,
          reason: error?.message || 'Lỗi xóa không xác định',
        });
      }
    }

    return {
      deletedCount,
      failedCount: failedItems.length,
      failedItems,
    };
  }
}
