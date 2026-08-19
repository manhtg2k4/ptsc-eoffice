import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  TreeRepository,
  FindOptionsWhere,
  In,
  SelectQueryBuilder,
  Like,
  IsNull,
  Raw,
} from 'typeorm';
import { CustomSenderUnitEntity } from 'src/custom-sender-unit/custom-sender-unit.entity';
import { OrganizationUnitEntity } from './organization-unit.entity';
import {
  CreateOrganizationUnitDto,
  UpdateOrganizationUnitDto,
} from '../organization-unit.dto';
import { isValidMongoId } from '../../utils/util';
import { clampLimit, clampPage } from '../../utils/pagination.validator';
import { STATUS } from '../../variables/CONST_STATUS';
import { QueryParams } from '../../interfaces';
// import { EntityRoleGroupService } from '../../entity-rolegroup/entity-rolegroup.service';
// import { EntityRoleGroupController } from '../../entity-rolegroup/entity-rolegroup.controller';
import { v4 as uuidv4 } from 'uuid';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { UserEntity } from 'src/users/entities/user.entity';
import { TaskUserRole } from 'src/task/entity/task.constants';
import { RoleGroupEntity } from 'src/role-group/role-group.entity';
import { EntityRoleGroupEntity } from 'src/entity-rolegroup/entities/entity-rolegroup.entity';
import { GetChildOrganizationsDto, GetChildOrganizationsResponseDto, OrganizationUnitDto } from '../dto/get-child-organizations.dto';
import { ConnectionPool } from 'mssql';
import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';

@Injectable()
export class OrganizationUnitService {
  private treeRepository: TreeRepository<OrganizationUnitEntity>;
  private pool: ConnectionPool;
  private dbname: string;
  private static readonly MAX_DYNAMIC_FILTERS = 30;
  private static readonly FILTER_FIELD_MAP: Record<string, string> = {
    id: 'org.id',
    name: 'org.name',
    code: 'org.code',
    type: 'org.type',
    phoneNumber: 'org.phone_number',
    phone_number: 'org.phone_number',
    email: 'org.email',
    leader: 'org.leader',
    position: 'org.position',
    address: 'org.address',
    description: 'org.description',
    mpath: 'org.mpath',
    parentId: 'org.parentId',
    parent_id: 'org.parentId',
    parentName: 'parent.name',
    parent_name: 'parent.name',
  };
  private static readonly SORT_FIELD_MAP: Record<string, string> = {
    id: 'org.id',
    name: 'org.name',
    code: 'org.code',
    type: 'org.type',
    phoneNumber: 'org.phone_number',
    phone_number: 'org.phone_number',
    email: 'org.email',
    leader: 'org.leader',
    position: 'org.position',
    address: 'org.address',
    description: 'org.description',
    mpath: 'org.mpath',
    parent: 'parent.name',
    parentName: 'parent.name',
    parent_name: 'parent.name',
    createdAt: 'org.created_at',
    updatedAt: 'org.updated_at',
    created_at: 'org.created_at',
    updated_at: 'org.updated_at',
    status: 'org.status',
  };
  constructor(
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection') // BẮT BUỘC
    private readonly orgUnitRepository: Repository<OrganizationUnitEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    private readonly sqlsvRepo: SQLSVRepository,
    @InjectRepository(RoleGroupEntity, 'mssqlConnection')
    private readonly roleGroupRepository: Repository<RoleGroupEntity>,
    @InjectRepository(EntityRoleGroupEntity, 'mssqlConnection')
    private readonly entityRoleGroupRepository: Repository<EntityRoleGroupEntity>,
    @InjectRepository(CustomSenderUnitEntity, 'mssqlConnection')
    private readonly customSenderUnitRepo: Repository<CustomSenderUnitEntity>,
    @InjectRepository(BpmnDesignEntity, 'mssqlConnection')
    private readonly bpmnDesignRepository: Repository<BpmnDesignEntity>,
  ) {
    this.treeRepository = this.orgUnitRepository.manager.getTreeRepository(
      OrganizationUnitEntity,
    );
  }

  private normalizeParentIdValue(parentId: string | null | undefined): string | null {
    if (parentId === null || parentId === undefined) {
      return null;
    }

    const normalized = String(parentId).trim();
    if (!normalized) {
      return null;
    }

    const lowered = normalized.toLowerCase();
    if (lowered === 'null' || lowered === 'undefined') {
      return null;
    }

    return normalized;
  }

  private normalizeFilters(rawFilters: Record<string, unknown>): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...rawFilters };
    const filterRaw = rawFilters?.filter;

    if (typeof filterRaw === 'string' && filterRaw.trim().startsWith('{')) {
      try {
        Object.assign(merged, JSON.parse(filterRaw));
      } catch {
        // Ignore invalid JSON filter and keep direct query filters.
      }
    } else if (filterRaw && typeof filterRaw === 'object' && !Array.isArray(filterRaw)) {
      Object.assign(merged, filterRaw as Record<string, unknown>);
    }

    delete merged.filter;

    // Loại bỏ khoảng trắng ở đầu và cuối của các bộ lọc dạng chuỗi
    for (const key of Object.keys(merged)) {
      if (typeof merged[key] === 'string') {
        merged[key] = (merged[key] as string).trim();
      }
    }

    return merged;
  }

  private applyAccentLikeFilters(
    queryBuilder: SelectQueryBuilder<OrganizationUnitEntity>,
    rawFilters: Record<string, unknown>,
  ): void {
    const normalized = this.normalizeFilters(rawFilters);
    const allowedEntries = Object.entries(normalized).filter(([key, value]) => {
      if (value === undefined || value === null || value === '') return false;
      return Boolean(OrganizationUnitService.FILTER_FIELD_MAP[key]);
    });

    const getCleanValue = (val: unknown) => {
      const stringVal = Array.isArray(val)
        ? val.join(',')
        : typeof val === 'object' && val !== null
          ? JSON.stringify(val)
          : String(val);
      // Chuẩn hóa NFC và loại bỏ khoảng trắng thừa
      return String(stringVal).normalize('NFC').trim();
    };

    const nameEntry = allowedEntries.find((e) => e[0] === 'name');
    const codeEntry = allowedEntries.find((e) => e[0] === 'code');

    let entriesToProcess = allowedEntries;

    if (nameEntry && codeEntry) {
      const cleanName = getCleanValue(nameEntry[1]);
      const cleanCode = getCleanValue(codeEntry[1]);
      queryBuilder.andWhere(
        `(org.name COLLATE SQL_Latin1_General_CP1_CI_AI LIKE :nameFilterParam OR org.code COLLATE SQL_Latin1_General_CP1_CI_AI LIKE :codeFilterParam)`,
        {
          nameFilterParam: `%${cleanName}%`,
          codeFilterParam: `%${cleanCode}%`,
        }
      );
      
      entriesToProcess = allowedEntries.filter(
        (e) => e[0] !== 'name' && e[0] !== 'code'
      );
    }

    const limitedEntries = entriesToProcess.slice(
      0,
      OrganizationUnitService.MAX_DYNAMIC_FILTERS,
    );

    for (let i = 0; i < limitedEntries.length; i++) {
      const [key, value] = limitedEntries[i];
      const columnExpr = OrganizationUnitService.FILTER_FIELD_MAP[key];
      const cleanValue = getCleanValue(value);
      const paramName = `dynamicFilter_${key}_${i}`;

      queryBuilder.andWhere(
        `${columnExpr} COLLATE SQL_Latin1_General_CP1_CI_AI LIKE :${paramName}`,
        {
          [paramName]: `%${cleanValue}%`,
        }
      );
    }

    if (allowedEntries.length > OrganizationUnitService.MAX_DYNAMIC_FILTERS) {
      console.warn(
        `[OrganizationUnitService] Too many filters (${allowedEntries.length}), capped at ${OrganizationUnitService.MAX_DYNAMIC_FILTERS}.`,
      );
    }
  }

  private parseSort(
    sort: unknown,
  ): { sortExpr: string; sortOrder: 'ASC' | 'DESC' } {
    let sortField = 'updated_at';
    let sortOrder: 'ASC' | 'DESC' = 'DESC';

    if (sort) {
      try {
        if (typeof sort === 'string' && sort.trim().startsWith('{')) {
          const sortObj = JSON.parse(sort);
          const key = Object.keys(sortObj || {})[0];
          if (key) {
            sortField = key;
            const val = sortObj[key];
            sortOrder =
              val === 1 || String(val).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
          }
        } else if (typeof sort === 'string' && sort.includes(',')) {
          const [field, order] = sort.split(',');
          sortField = field?.trim() || 'updated_at';
          sortOrder = order?.trim().toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        } else if (typeof sort === 'string') {
          sortField = sort.trim();
          sortOrder = 'ASC';
        }
      } catch (error) {
        console.warn('Lỗi parse sort param:', error);
      }
    }

    return {
      sortExpr:
        OrganizationUnitService.SORT_FIELD_MAP[sortField] || 'org.updated_at',
      sortOrder,
    };
  }

  private applyIdsFilterByCsv(
    queryBuilder: SelectQueryBuilder<OrganizationUnitEntity>,
    ids: string[],
    columnExpr = 'org.id',
    paramName = 'idCsv',
  ): void {
    const uniqueIds = Array.from(
      new Set((ids || []).map((id) => String(id || '').trim()).filter(Boolean)),
    );

    if (uniqueIds.length === 0) {
      queryBuilder.andWhere('1 = 0');
      return;
    }

    queryBuilder.andWhere(
      `${columnExpr} IN (SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(:${paramName}, ','))`,
      { [paramName]: uniqueIds.join(',') },
    );
  }

  getPool(): ConnectionPool {
    return this.pool;
  }
  // Tạo đơn vị mới
  async create(createDto: CreateOrganizationUnitDto): Promise<any> {
    // Kiểm tra mã đơn vị đã tồn tại
    const existingCode = await this.orgUnitRepository.findOneBy({
      code: createDto.code,
      status: STATUS.ACTIVED,
    });
    if (existingCode) {
      throw new BadRequestException({
        message: `Mã đơn vị ${createDto.code} đã tồn tại`,
      });
    }

    let parentUnit: OrganizationUnitEntity | null = null;
    if (createDto.parent) {
      parentUnit = await this.orgUnitRepository.findOneBy({
        id: createDto.parent,
        status: STATUS.ACTIVED,
      });
      if (!parentUnit) {
        throw new BadRequestException({
          success: false,
          message: `Đơn vị cha với ID ${createDto.parent} không tồn tại`,
        });
      }
    }

    // Lưu các quyền của đơn vị vào bảng ánh xạ
    // if (createDto.roleGroup && Array.isArray(createDto.roleGroup)) {
    //     this.roleGroupService.create({
    //         clientId: 'TTHC', // Thay đổi theo yêu cầu
    //         name: `Quyền của ${createDto.name}`,
    //         code: `RG_${createDto.code}`,
    //         entityType: 'organization',
    //         roles: createDto.roleGroup,
    //     });
    // }

    // Tạo đơn vị mới
    const newId = uuidv4();
    const newUnit = this.orgUnitRepository.create({
      id: newId,
      ...createDto,
      parent: parentUnit || undefined,
      mpath: parentUnit && parentUnit.mpath ? `${parentUnit.mpath}/${newId}` : newId,
      status: STATUS.ACTIVED,
    });

    // Lưu đơn vị mới
    return this.orgUnitRepository.save(newUnit);
  }

  // Lấy tất cả đơn vị
  async findAllv1(queryParams: QueryParams) {
    const { page = 1, limit = 25, sort = 'name,ASC', ...filters } = queryParams;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const queryBuilder = this.orgUnitRepository.createQueryBuilder('org');

    // Áp dụng filter
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        queryBuilder.andWhere(`org.${key} LIKE :${key}`, {
          [key]: `%${value}%`,
        });
      }
    });

    queryBuilder.andWhere('org.status = :status', { status: STATUS.ACTIVED });

    // Áp dụng sort
    if (sort) {
      const [field, order] = sort.split(',');
      queryBuilder.orderBy(
        `org.${field}`,
        order.toUpperCase() as 'ASC' | 'DESC',
      );
      // Phân trang
      queryBuilder.skip((pageNum - 1) * limitNum).take(limitNum);
      // Phân trang
      const [data, total] = await queryBuilder.getManyAndCount();

      return {
        data,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    }
  }

  private buildHierarchicalFlatList(
    items: OrganizationUnitEntity[],
  ): OrganizationUnitEntity[] {
    const itemMap = new Map<string, OrganizationUnitEntity>();
    const childrenMap = new Map<string | null, OrganizationUnitEntity[]>();

    // 1. Tạo Map tra cứu nhanh và nhóm các con theo parentId
    items.forEach((item) => {
      itemMap.set(item.id, item);
      const pid = item.parent
        ? this.normalizeParentIdValue(item.parent.id)
        : this.normalizeParentIdValue(item.parentId);
      if (!childrenMap.has(pid)) {
        childrenMap.set(pid, []);
      }
      childrenMap.get(pid)!.push(item);
    });

    // 2. Xác định các nhóm gốc (root) trong tập dữ liệu này
    // Một nhóm là gốc nếu parentId là null HOẶC cha của nó KHÔNG nằm trong tập dữ liệu hiện tại
    const rootPids = Array.from(childrenMap.keys()).filter(
      (pid) => pid === null || !itemMap.has(pid),
    );

    const result: OrganizationUnitEntity[] = [];
    const visited = new Set<string>();

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      const node = itemMap.get(nodeId);
      if (!node) return;

      visited.add(nodeId);
      result.push(node);

      const children = childrenMap.get(nodeId);
      if (children) {
        children.forEach((child) => traverse(child.id));
      }
    };

    // 3. Xử lý từng nhóm gốc (đảm bảo các con cùng cha luôn đứng cạnh nhau)
    rootPids.forEach((pid) => {
      const children = childrenMap.get(pid);
      if (children) {
        children.forEach((child) => traverse(child.id));
      }
    });

    return result;
  }

  async findAll(queryParams: QueryParams, userId?: string) {
    // Loại bỏ khoảng trắng ở đầu và cuối của các tham số truy vấn dạng chuỗi
    const cleanedQueryParams = { ...queryParams };
    for (const key of Object.keys(cleanedQueryParams)) {
      if (typeof cleanedQueryParams[key] === 'string') {
        cleanedQueryParams[key] = (cleanedQueryParams[key] as string).trim();
      }
    }

    const {
      page = 1,
      limit = 25,
      sort = 'name,ASC',
      noLimit,
      isMergeCustom,
      isTreeSearch,
      excludeAncestors,
      ...rawFilters
    } = cleanedQueryParams;
    const pageNum = clampPage(page ?? 1);
    const limitNum = clampLimit(limit ?? 10);

    const queryBuilder = this.orgUnitRepository.createQueryBuilder('org');
    queryBuilder.leftJoinAndSelect('org.parent', 'parent');

    const filters = this.normalizeFilters(rawFilters as Record<string, unknown>);

    // Kiểm tra điều kiện lọc theo cấp độ (maxLevel)
    const levelVal = filters.maxLevel !== undefined && filters.maxLevel !== null ? Number(filters.maxLevel) : null;
    if (levelVal !== null && !isNaN(levelVal) && levelVal > 1) {
      queryBuilder.andWhere(
        `ISNULL(LEN(org.mpath) - LEN(REPLACE(org.mpath, '/', '')), 0) <= :maxSlashCount`,
        { maxSlashCount: levelVal - 1 }
      );
    }

    // Kiểm tra điều kiện lấy cấp 1 (root nodes)
    if (
      filters.maxLevel === 1 ||
      filters.maxLevel === '1' ||
      filters.parentId === 'null' ||
      filters.parentId === null ||
      filters.parent_id === 'null' ||
      filters.parent_id === null ||
      filters.parent === 'null' ||
      filters.parent === null
    ) {
        queryBuilder.andWhere(
        '(org.parent IS NULL OR org.parentId IS NULL OR org.parentId = \'\' OR org.parentId = \'null\')',
        );
      delete filters.maxLevel;
      delete filters.parentId;
      delete filters.parent_id;
      delete filters.parent;
    } else {
      delete filters.maxLevel;
    }

    this.applyAccentLikeFilters(
      queryBuilder,
      filters,
    );

    queryBuilder.andWhere('org.status = :status', { status: STATUS.ACTIVED });

    const { sortExpr, sortOrder } = this.parseSort(sort);
    queryBuilder.orderBy(sortExpr, sortOrder);

    // 1. Lấy tất cả bản ghi khớp (chưa skip/take để bảo toàn phân cấp)
    const orgUnits = await queryBuilder.getMany();

    // Kiểm tra xem có bất kỳ filter tìm kiếm nào được áp dụng không (name, code, type, v.v.)
    const hasSearchFilter = Object.keys(filters).some(
      (key) => filters[key] !== undefined && filters[key] !== null && filters[key] !== '',
    );

    // 1.5. Nếu có filter tìm kiếm hoặc yêu cầu tree search, ta cần lấy thêm các ancestors để dựng được cây đầy đủ
    const shouldFetchAncestors =
      !(excludeAncestors === 'true' || excludeAncestors === true) &&
      (((isTreeSearch === 'true' || isTreeSearch === true) || hasSearchFilter) && orgUnits.length > 0);

    if (shouldFetchAncestors) {
      const allActiveUnits = await this.orgUnitRepository.find({
        where: { status: STATUS.ACTIVED },
        select: ['id', 'parentId'],
      });
      const parentMap = new Map<string, string | null>();
      allActiveUnits.forEach(u =>
        parentMap.set(u.id, this.normalizeParentIdValue(u.parentId)),
      );

      const ancestorIds = new Set<string>();
      orgUnits.forEach((ou) => {
        // 1. Phân tích từ mpath
        if (ou.mpath) {
          const parts = ou.mpath.split('/').map(p => p.trim()).filter(Boolean);
          parts.forEach(id => {
            if (id !== ou.id) {
              ancestorIds.add(id);
            }
          });
        }

        // 2. Dự phòng bằng parentMap đệ quy
        let currId = parentMap.get(ou.id);
        const visited = new Set<string>();
        while (currId && currId !== 'null' && currId !== 'undefined') {
          if (visited.has(currId)) {
            break; // Tránh vòng lặp vô hạn
          }
          visited.add(currId);
          ancestorIds.add(currId);
          currId = parentMap.get(currId);
        }
      });

      // Loại bỏ những id đã có trong orgUnits
      orgUnits.forEach((ou) => ancestorIds.delete(ou.id));

      if (ancestorIds.size > 0) {
        const ancestors = await this.orgUnitRepository.find({
          where: { id: In([...ancestorIds]) },
          relations: ['parent'],
        });
        orgUnits.push(...ancestors);
      }
    }

    let data = [...orgUnits];
    const shouldMerge = isMergeCustom === 'true' || isMergeCustom === true;

    // 2. Nếu có userId và yêu cầu gộp, lấy thêm các đơn vị gửi tùy chỉnh của user đó
    if (userId && shouldMerge) {
      // Loại bỏ khoảng trắng của từ khóa tìm kiếm trước khi query
      const searchName = String(filters?.name || filters?.search || '').trim();
      const escapedSearchName = String(searchName).normalize('NFC').replace(/'/g, "''");
      const customWhere: any[] = searchName
        ? [
          { 
            createdBy: userId, 
            status: 1, 
            name: Raw(alias => `${alias} COLLATE SQL_Latin1_General_CP1_CI_AI LIKE :searchName`, { searchName: `%${escapedSearchName}%` }) 
          },
          { 
            createdBy: userId, 
            status: 1, 
            code: Raw(alias => `${alias} COLLATE SQL_Latin1_General_CP1_CI_AI LIKE :searchCode`, { searchCode: `%${escapedSearchName}%` }) 
          },
        ]
        : [{ createdBy: userId, status: 1 }];

      const customUnits = await this.customSenderUnitRepo.find({
        where: customWhere,
        // order: { name: 'ASC' },
        order: { name: 'DESC' },

      });

      // Chuyển đổi CustomSenderUnitEntity sang structure giống OrganizationUnitEntity
      const formattedCustomUnits = customUnits.map((u) => {
        const item = new OrganizationUnitEntity();
        Object.assign(item, {
          ...u,
          name: `${u.name}`,
          parent: this.normalizeParentIdValue(u.parentId)
            ? { id: this.normalizeParentIdValue(u.parentId)! }
            : null,
          parentId: this.normalizeParentIdValue(u.parentId),
        });
        return item;
      });

      data = [...data, ...formattedCustomUnits];
    }


    // 3. Xây dựng danh sách phẳng có phân cấp
    const combinedList = [...data];
    const idMap = new Map(combinedList.map(u => [u.id, u]));

    // Chuẩn hóa parent: Nếu cha không nằm trong kết quả trả về, gán null để hiển thị ở cấp gốc
    const normalizedData = combinedList.map(u => {
      const normalizedParentId = this.normalizeParentIdValue(u.parentId);
      if (normalizedParentId && !idMap.has(normalizedParentId)) {
        return { ...u, parent: null, parentId: null };
      }
      if (normalizedParentId !== u.parentId) {
        return { ...u, parentId: normalizedParentId };
      }
      return u;
    });

    const sortedData = this.buildHierarchicalFlatList(normalizedData);

    // 4. Phân trang trong bộ nhớ
    const total = sortedData.length;
    const paginatedData =
      noLimit === 'true' || noLimit === true
        ? sortedData
        : sortedData.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    const mapedData = paginatedData.map((item) => {
      return {
        ...item,
        _id: item.id,
        level: item.mpath ? item.mpath.split('/').filter(Boolean).length : 1,
        // Giữ structure giống với CustomSenderUnit: parent là null hoặc object {id}
        parent: item.parent
          ? (typeof item.parent === 'string' ? { id: item.parent } : item.parent)
          : (this.normalizeParentIdValue(item.parentId)
            ? { id: this.normalizeParentIdValue(item.parentId)! }
            : null),
      };
    });

    return {
      success: true,
      data: mapedData,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }
  async findAllByTaskRole(
    queryParams: QueryParams & { typeTaskUser?: TaskUserRole },
  ) {
    const {
      page = 1,
      limit = 25,
      sort = 'name,ASC',
      noLimit,
      typeTaskUser,
      isAuthority,
      ...filters
    } = queryParams;

    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.max(Number(limit), 1);

    const queryBuilder = this.orgUnitRepository.createQueryBuilder('org');

    /** JOIN parent */
    queryBuilder.leftJoinAndSelect('org.parent', 'parent');

    /** 1️⃣ FILTER (ACCENT-INSENSITIVE) */
    this.applyAccentLikeFilters(
      queryBuilder,
      filters as Record<string, unknown>,
    );

    queryBuilder.andWhere('org.status = :status', {
      status: STATUS.ACTIVED,
    });

    const bpmnDesign = await this.bpmnDesignRepository.findOne({
      where: { id: 'QUY_TRINH_CV_PHONG_BAN' as any },
      select: ['id', 'unit'],
    });
    const unitIds = Array.isArray(bpmnDesign?.unit)
      ? bpmnDesign.unit.map((id: any) => String(id).trim()).filter(Boolean)
      : [];
    if (unitIds.length > 0) {
      queryBuilder.andWhere('org.id IN (:...unitIds)', { unitIds });
    } else {
      queryBuilder.andWhere('1 = 0');
    }

    /** 2️⃣ FAKE LOGIC THEO TASK ROLE */
    switch (typeTaskUser) {
      case TaskUserRole.ASSIGNER:
        // Fake: đơn vị cấp cao (không có parent)
        // queryBuilder.andWhere('org.parent IS NULL');
        break;

      case TaskUserRole.DIRECTOR:
        // Fake: đơn vị có parent nhưng không phải cấp thấp nhất
        // queryBuilder.andWhere('org.parent IS NOT NULL');
        break;

      case TaskUserRole.SUPPORTER:
        // Fake: tất cả đơn vị active (không thêm điều kiện)
        break;

      case TaskUserRole.VIEWER:
        // Fake: đơn vị cấp thấp (không có đơn vị con)
        // queryBuilder.andWhere(
        //   `org.id NOT IN (
        //   SELECT DISTINCT child.parent_id 
        //   FROM organization_unit child 
        //   WHERE child.parent_id IS NOT NULL
        // )`,
        // );
        break;
    }

    /** 3️⃣ SORT */
    const { sortExpr, sortOrder } = this.parseSort(sort);
    queryBuilder.orderBy(sortExpr, sortOrder);

    /** 4️⃣ LẤY TẤT CẢ VÀ SẮP XẾP PHÂN CẤP */
    const data = await queryBuilder.getMany();
    const sortedData = this.buildHierarchicalFlatList(data);

    /** 5️⃣ PHÂN TRANG */
    const total = sortedData.length;
    const paginatedData =
      noLimit === 'true' || noLimit === true
        ? sortedData
        : sortedData.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    const mappedData = paginatedData.map((item) => ({
      ...item,
      _id: item.id,
      parent: item.parent ? item.parent.id : null,
      parentName: item.parent ? item.parent.name : null,
    }));

    return {
      data: mappedData,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      typeTaskUser: typeTaskUser || null,
    };
  }

  // Lấy tất cả đơn vị đang hoạt động (không phân trang, dạng cây)
  async findAllActive() {
    return this.treeRepository.findTrees();
  }

  async deleteManyByIds(ids: string[]) {
    if (!ids || ids.length === 0) {
      return { affected: 0 };
    }
    const result = await this.orgUnitRepository.update(
      { id: In(ids) },
      { status: STATUS.DELETED },
    );

    return { affected: result.affected || 0 };
  }

  // Tìm đơn vị theo ID
  async findById(id: string): Promise<any> {
    const unit = await this.orgUnitRepository.findOne({
      where: { id, status: STATUS.ACTIVED },
      relations: ['parent'],
    });

    if (!unit) throw new BadRequestException('Không tìm thấy đơn vị');

    const unitId = `RG_${unit.code}`;

    // const mapping = await this.entityRoleGroupService.findByUnitId(
    //     unitId,
    //     'TTHC',
    // );
    // if (!mapping) return unit;

    // const roleGroup = await EntityRoleGroupController.RoleGroup.findById(
    //     mapping.roleGroupId.toString(),
    // );
    // if (!roleGroup) return unit;

    const data = {
      ...unit,
      // roleGroup: roleGroup,
    };
    return data;
  }

  async findByIdUpdate(id: string): Promise<any> {
    // 1. Unit
    const unit = await this.orgUnitRepository.createQueryBuilder('org')
      .leftJoin('org.parent', 'parent')
      .addSelect(['parent.id', 'parent.name', 'parent.code'])
      .where('org.id = :id', { id })
      .andWhere('org.status = :status', { status: STATUS.ACTIVED })
      .getOne();

    if (!unit) {
      throw new BadRequestException('Không tìm thấy đơn vị');
    }

    const unitId = `RG_${unit.code}`;

    // 2. entity_role_group mapping
    const mapping = await this.entityRoleGroupRepository.findOne({
      where: {
        unitId,
        clientId: 'TTHC',
        isActive: true,
        entityType: 'organization',
      },
    });

    if (!mapping) {
      return unit;
    }

    // 3. role_groups
    const roleGroup = await this.roleGroupRepository.findOne({
      where: {
        id: mapping.roleGroupId,
      },
    });

    if (!roleGroup) {
      return unit;
    }

    // 4. Result giống Mongo
    return {
      ...unit,
      roleGroup,
    };
  }

  // Cập nhật đơn vị
  async update(
    id: string,
    updateDto: UpdateOrganizationUnitDto,
  ): Promise<OrganizationUnitEntity> {
    const unit = await this.orgUnitRepository.findOne({
      where: { id: id, status: STATUS.ACTIVED },
      relations: ['parent'],
    });
    if (!unit) {
      throw new BadRequestException(`Không tìm thấy đơn vị với ID ${id}`);
    }

    if (updateDto.code && updateDto.code !== unit.code) {
      const existingCode = await this.orgUnitRepository.findOneBy({
        code: updateDto.code,
        status: STATUS.ACTIVED,
      });
      if (existingCode) {
        throw new BadRequestException({
          message: `Mã đơn vị ${updateDto.code} đã tồn tại`,
        });
      }
    }

    if (
      updateDto.roleGroup !== undefined &&
      !Array.isArray(updateDto.roleGroup)
    ) {
      throw new BadRequestException({
        message: 'roleGroup phải là một mảng',
      });
    }

    const { roleGroup, ...restUpdate } = updateDto as any;

    // Cập nhật parent nếu có
    if (
      updateDto.parent !== undefined &&
      updateDto.parent !== (unit.parent ? unit.parent.id : null)
    ) {
      if (updateDto.parent === id) {
        throw new BadRequestException('Không thể gán đơn vị cha là chính nó');
      }
      const parent = updateDto.parent
        ? await this.orgUnitRepository.findOneBy({
          id: updateDto.parent,
          status: STATUS.ACTIVED,
        })
        : null;
      if (updateDto.parent && !parent) {
        throw new BadRequestException(
          'Đơn vị cha không tồn tại hoặc không hoạt động',
        );
      }

      const oldMpath = unit.mpath || unit.id;
      let isSwapNeeded = false;

      // Kiểm tra nếu parent mới đang là đơn vị cấp dưới của unit
      if (parent && parent.mpath && (parent.mpath === oldMpath || parent.mpath.startsWith(`${oldMpath}/`))) {
        isSwapNeeded = true;
      }

      if (isSwapNeeded) {
        // Thuật toán Tách Nhánh (Extract Node): 
        // Bốc A (unit) ném xuống dưới C (parent). 
        // Các con trực tiếp của A (ví dụ B) sẽ được đôn lên thay thế vị trí của A (làm con của cha A cũ).
        const aParentMpath = oldMpath.includes('/') ? oldMpath.substring(0, oldMpath.lastIndexOf('/')) : '';
        
        // 1. Tìm tất cả descendants của A (bao gồm cả C)
        const descendants = await this.orgUnitRepository.find({
          where: { mpath: Like(`${oldMpath}/%`), status: STATUS.ACTIVED }
        });

        // 2. Xóa A khỏi đường dẫn mpath của tất cả descendants, đôn chúng lên 1 cấp
        for (const d of descendants) {
          if (d.mpath && d.mpath.startsWith(`${oldMpath}/`)) {
            if (aParentMpath) {
              d.mpath = aParentMpath + d.mpath.substring(oldMpath.length);
            } else {
              d.mpath = d.mpath.substring(oldMpath.length + 1); // Bỏ phần "A/" ở đầu
            }
          }

          // Những đơn vị đang là con trực tiếp của A sẽ được đôn lên làm con của cha cũ của A
          if (d.parentId === unit.id) {
            d.parentId = unit.parentId;
          }
        }

        // 3. A (unit) trở thành con của C (parent)
        // Lưu ý: C nằm trong danh sách descendants, nên mpath của C vừa được cập nhật ở vòng lặp trên
        const cInDescendants = descendants.find(d => d.id === parent!.id);
        const cNewMpath = cInDescendants ? cInDescendants.mpath : parent!.mpath;

        unit.parent = parent;
        unit.parentId = parent!.id;
        unit.mpath = cNewMpath ? `${cNewMpath}/${unit.id}` : unit.id;

        // Lưu các descendants đã được đôn lên
        if (descendants.length > 0) {
          await this.orgUnitRepository.save(descendants, { chunk: 100 });
        }
      } else {
        // Logic gán cha bình thường
        const newMpath = parent && parent.mpath ? `${parent.mpath}/${unit.id}` : unit.id;
        
        unit.parent = parent ?? null;
        unit.parentId = parent ? parent.id : null;
        unit.mpath = newMpath;

        if (oldMpath !== newMpath) {
          const descendants = await this.orgUnitRepository.find({
            where: { mpath: Like(`${oldMpath}/%`), status: STATUS.ACTIVED }
          });

          for (const child of descendants) {
            if (child.mpath && child.mpath.startsWith(`${oldMpath}/`)) {
              child.mpath = newMpath + child.mpath.substring(oldMpath.length);
            }
          }
          
          if (descendants.length > 0) {
            await this.orgUnitRepository.save(descendants, { chunk: 100 });
          }
        }
      }
    }

    // Merge các trường còn lại
    this.orgUnitRepository.merge(unit, restUpdate);

    const updatedUnit = await this.orgUnitRepository.save(unit);

    if (!updatedUnit) {
      throw new BadRequestException(`Không thể cập nhật đơn vị với ID ${id}`);
    }

    // if (Array.isArray(roleGroup)) {
    //     const unitId = `RG_${updatedUnit.code}`;

    //     let mapping = await this.entityRoleGroupService.findByUnitId(
    //         unitId,
    //         'TTHC',
    //     );

    //     if (!mapping) {
    //         await this.roleGroupService.create({
    //             clientId: 'TTHC',
    //             name: `Quyền của ${updateDto.name || updatedUnit.name}`,
    //             code: unitId,
    //             entityType: 'organization',
    //             roles: roleGroup,
    //         });
    //     } else {
    //         await this.roleGroupService.update(mapping.roleGroupId.toString(), {
    //             clientId: 'TTHC',
    //             entityType: 'organization',
    //             name: `Quyền của ${updateDto.name || updatedUnit.name}`,
    //             code: unitId,
    //             roles: roleGroup,
    //         });
    //     }
    // }

    return updatedUnit;
  }

  // Xóa đơn vị
  async delete(id: string): Promise<void> {
    // Lấy đơn vị cha
    const unit = await this.orgUnitRepository.findOneBy({ id });
    if (!unit) {
      throw new BadRequestException(`Đơn vị với ID ${id} không tồn tại`);
    }

    // Tìm tất cả các đơn vị con có parentId là id của đơn vị cha
    const childUnits = await this.orgUnitRepository.find({
      where: { parentId: id },
    });

    // Cập nhật trạng thái của đơn vị cha và tất cả đơn vị con thành "DELETED"
    const idsToDelete = [id, ...childUnits.map(unit => unit.id)]; // Bao gồm cả ID của đơn vị cha và các đơn vị con

    await this.orgUnitRepository.update(
      { id: In(idsToDelete) },
      { status: STATUS.DELETED },
    );
  }


  async orgFakeData(queryParams: QueryParams) {
    try {
      const ids = [
        '68afb3a1cb36081f0bba5dd6',
        '68afbefecb36081f0bbbef2e',
        '68afc41fcb36081f0bbef554',
        '68afc3f5cb36081f0bbef552',
      ]

      const {
        page = 1,
        limit = 25,
        sort = 'name,ASC',
        noLimit,
        ...filters
      } = queryParams;
      const pageNum = Math.max(Number(page), 1);
      const limitNum = Math.max(Number(limit), 1);

      const queryBuilder = this.orgUnitRepository.createQueryBuilder('org');

      queryBuilder.leftJoinAndSelect('org.parent', 'parent');
      this.applyIdsFilterByCsv(queryBuilder, ids);
      this.applyAccentLikeFilters(queryBuilder, filters as Record<string, unknown>);

      queryBuilder.andWhere('org.status = :status', { status: STATUS.ACTIVED });

      const { sortExpr, sortOrder } = this.parseSort(sort);
      queryBuilder.orderBy(sortExpr, sortOrder);

      const data = await queryBuilder.getMany();

      // 2. Xây dựng danh sách phẳng có phân cấp
      const sortedData = this.buildHierarchicalFlatList(data);

      // 3. Phân trang trong bộ nhớ
      const total = sortedData.length;
      const paginatedData =
        noLimit === 'true' || noLimit === true
          ? sortedData
          : sortedData.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      const mapedData = paginatedData.map((item) => {
        return {
          ...item,
          _id: item.id,
          parent: item.parent ? item.parent.id : null,
        };
      });

      return {
        data: mapedData,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (error) {
      return [];
    }
  }


  /**
   * Đồng bộ dữ liệu từ collection 'organizationunits' (MongoDB)
   * sang bảng 'organization_units' (MySQL).
   */
  // async syncFromMongo(): Promise<{
  //   total: number;
  //   synced: number;
  //   errors: any[];
  // }> {
  //   // 1. Lấy tất cả bản ghi từ MongoDB
  //   let mongoUnits = await this.mongoRepo.organizationUnitCollection
  //     .find({})
  //     .toArray();
  //   if (!mongoUnits || mongoUnits.length === 0) {
  //     return { total: 0, synced: 0, errors: [] };
  //   }

  //   // 2. Lọc trùng theo name + code (chỉ giữ 1 bản ghi)
  //   const uniqueMap = new Map<string, any>();

  //   for (const item of mongoUnits) {
  //     const key = `${item.name}::${item.code}`;

  //     // Nếu bản ghi này mới hơn → ghi đè
  //     if (!uniqueMap.has(key)) {
  //       uniqueMap.set(key, item);
  //     } else {
  //       const existing = uniqueMap.get(key);

  //       // Ưu tiên bản ghi updatedAt mới hơn
  //       const existingTime = existing.updatedAt
  //         ? new Date(existing.updatedAt).getTime()
  //         : 0;
  //       const currentTime = item.updatedAt
  //         ? new Date(item.updatedAt).getTime()
  //         : 0;

  //       if (currentTime > existingTime) {
  //         uniqueMap.set(key, item);
  //       }
  //     }
  //   }

  //   // Gán lại mongoUnits sau khi lọc trùng
  //   mongoUnits = Array.from(uniqueMap.values());

  //   const total = mongoUnits.length;

  //   const errors: any[] = [];
  //   const upsertedEntities: OrganizationUnitEntity[] = [];

  //   // 3. Tiếp tục logic sync như cũ
  //   for (const mongoUnit of mongoUnits) {
  //     try {
  //       const existingEntity = await this.orgUnitRepository.findOneBy({
  //         id: mongoUnit._id.toString(),
  //       });

  //       const entityData: Partial<OrganizationUnitEntity> = {
  //         id: mongoUnit._id.toString(),
  //         name: mongoUnit.name,
  //         code: mongoUnit.code,
  //         type: mongoUnit.type,
  //         phoneNumber: mongoUnit.phoneNumber || undefined,
  //         email: mongoUnit.email || undefined,
  //         leader: mongoUnit.leader || undefined,
  //         position: mongoUnit.position || undefined,
  //         address: mongoUnit.address || undefined,
  //         description: mongoUnit.description || undefined,
  //         status: mongoUnit.status,
  //         mpath: mongoUnit.path || '',
  //         // parent: mongoUnit.parent || '',
  //       };

  //       if (mongoUnit.parent) {
  //         entityData.parent = {
  //           id: mongoUnit.parent.toString(),
  //         } as OrganizationUnitEntity;
  //       }

  //       if (existingEntity) {
  //         this.orgUnitRepository.merge(existingEntity, entityData);
  //         upsertedEntities.push(existingEntity);
  //       } else {
  //         const newEntity = this.orgUnitRepository.create(entityData);
  //         upsertedEntities.push(newEntity);
  //       }
  //     } catch (e) {
  //       errors.push({ id: mongoUnit._id.toString(), error: e.message });
  //     }
  //   } //

  //   if (upsertedEntities.length > 0) {
  //     await this.orgUnitRepository.save(upsertedEntities, { chunk: 100 });
  //   }

  //   return { total, synced: upsertedEntities.length, errors };
  // }
  async getChildOrganizations(
    userId: string,
    dto: GetChildOrganizationsDto,
  ): Promise<GetChildOrganizationsResponseDto> {
    return this.getChildOrganizationsInternal(userId, dto);
  }

  async getChildOrganizationsByCode(
    userId: string,
    dto: GetChildOrganizationsDto,
  ): Promise<GetChildOrganizationsResponseDto> {
    return this.getChildOrganizationsInternal(userId, dto, dto.code);
  }

  private async getChildOrganizationsInternal(
    userId: string,
    dto: GetChildOrganizationsDto,
    code?: string,
  ): Promise<GetChildOrganizationsResponseDto> {
    try {
      let targetOrgId: string;
      let targetOrg: OrganizationUnitEntity | null = null;

      if (code) {
        // Tìm đúng phòng ban có code tương ứng
        targetOrg = await this.orgUnitRepository.findOne({
          where: {
            code: code,
            status: STATUS.ACTIVED,
          },
        });

        if (!targetOrg) {
          throw new NotFoundException('Phòng ban không tồn tại');
        }

        targetOrgId = targetOrg.id;
      } else if (!dto.organizationId) {
        // Nếu không truyền organizationId, lấy từ user hiện tại
        const user = await this.userRepository.findOne({
          where: { id: userId },
          select: ['id', 'parent'],
          relations: ['parent'],
        });

        if (!user || !user.parent) {
          throw new BadRequestException('User chưa được gán phòng ban');
        }

        targetOrgId = user.parent.id;
      } else {
        targetOrgId = dto.organizationId;
      }

      // Kiểm tra phòng ban có tồn tại không (nếu chưa tìm theo code)
      if (!targetOrg) {
        targetOrg = await this.orgUnitRepository.findOne({
          where: {
            id: targetOrgId,
            status: STATUS.ACTIVED
          },
        });

        if (!targetOrg) {
          throw new NotFoundException('Phòng ban không tồn tại');
        }
      }

      // Tải các đơn vị vào bộ nhớ
      let allActiveUnits: OrganizationUnitEntity[];
      const levelCondition = dto.maxLevel !== undefined && dto.maxLevel !== null
        ? Raw(alias => `ISNULL(LEN(${alias}) - LEN(REPLACE(${alias}, '/', '')), 0) <= ${dto.maxLevel! - 1}`)
        : undefined;

      const isTargetSpecified = !!dto.organizationId || !!code;

      if (!isTargetSpecified) {
        // Chỉ lấy các phòng ban gốc (parentId is null)
        const baseWhere: any = { status: STATUS.ACTIVED };
        if (levelCondition) baseWhere.mpath = levelCondition;

        allActiveUnits = await this.orgUnitRepository.find({
          where: [
            { ...baseWhere, parentId: IsNull() },
            { ...baseWhere, parentId: 'null' },
            { ...baseWhere, parentId: 'undefined' },
          ],
          select: ['id', 'parentId', 'name', 'code', 'type', 'order', 'mpath'],
        });
      } else {
        // Tải tất cả các đơn vị đang hoạt động để xây dựng quan hệ cha-con
        const where: any = { status: STATUS.ACTIVED };
        if (levelCondition) where.mpath = levelCondition;

        allActiveUnits = await this.orgUnitRepository.find({
          where,
          select: ['id', 'parentId', 'name', 'code', 'type', 'order', 'mpath'],
        });
      }
      const parentMap = new Map<string, string | null>();
      allActiveUnits.forEach(u =>
        parentMap.set(u.id, this.normalizeParentIdValue(u.parentId)),
      );

      const getLevel = (unit: OrganizationUnitEntity): number => {
        let lvl = 1;
        let currId = parentMap.get(unit.id);
        const visited = new Set<string>();
        while (currId && currId !== 'null' && currId !== 'undefined') {
          if (visited.has(currId)) break;
          visited.add(currId);
          lvl++;
          currId = parentMap.get(currId);
        }
        if (lvl === 1 && unit.mpath) {
          lvl = unit.mpath.split('/').filter(Boolean).length;
        }
        return lvl;
      };

      const childIds = new Set<string>();

      if (!isTargetSpecified) {
        // Nếu không truyền parentId (organizationId), lấy những thằng có parentId là null
        allActiveUnits.forEach(u => {
          const normalizedParentId = this.normalizeParentIdValue(u.parentId);
          const hasNoParent = !normalizedParentId;
          if (hasNoParent) {
            childIds.add(u.id);
          } else if (u.mpath) {
            const segments = u.mpath.split('/').filter(Boolean);
            if (segments.length <= 1) {
              childIds.add(u.id);
            }
          }
        });
      } else {
        childIds.add(targetOrgId);

        // Tìm tất cả con, cháu, chắt... của targetOrgId
        allActiveUnits.forEach(u => {
          if (u.id !== targetOrgId) {
            let isDescendant = false;

            // 1. Kiểm tra bằng parentMap đệ quy
            let currId = this.normalizeParentIdValue(u.parentId);
            const visited = new Set<string>();
            while (currId && currId !== 'null' && currId !== 'undefined') {
              if (currId === targetOrgId) {
                isDescendant = true;
                break;
              }
              if (visited.has(currId)) break;
              visited.add(currId);
              currId = parentMap.get(currId) ?? null;
            }

            // 2. Dự phòng bằng mpath
            if (!isDescendant && u.mpath) {
              const segments = u.mpath.split('/').filter(Boolean);
              if (segments.includes(targetOrgId)) {
                isDescendant = true;
              }
            }

            if (isDescendant) {
              childIds.add(u.id);
            }
          }
        });
      }

      // Lọc theo từ khóa tìm kiếm (name hoặc filter.name)
      const filters = this.normalizeFilters(dto as any);
      const searchName = String(filters.name || filters.search || '').trim().normalize('NFC').toLowerCase();

      let finalChildIds = new Set<string>();
      if (searchName) {
        // Tìm các node khớp điều kiện tìm kiếm
        const matchedIds = new Set<string>();
        allActiveUnits.forEach(u => {
          if (childIds.has(u.id)) {
            const uName = (u.name || '').normalize('NFC').toLowerCase();
            const uCode = (u.code || '').normalize('NFC').toLowerCase();
            if (uName.includes(searchName) || uCode.includes(searchName)) {
              matchedIds.add(u.id);
            }
          }
        });

        // Lấy thêm các ancestors của các node khớp điều kiện để giữ cấu trúc cây
        matchedIds.forEach(id => {
          finalChildIds.add(id);
          let currId = parentMap.get(id) ?? null;
          const visited = new Set<string>();
          while (currId && currId !== 'null' && currId !== 'undefined' && currId !== targetOrgId) {
            if (visited.has(currId)) break;
            visited.add(currId);
            if (childIds.has(currId)) {
              finalChildIds.add(currId);
            }
            currId = parentMap.get(currId) ?? null;
          }
        });

        if (isTargetSpecified) {
          finalChildIds.add(targetOrgId);
        }
      } else {
        finalChildIds = childIds;
      }

      const page = Math.max(Number(dto.page) || 1, 1);
      const limit = Math.max(Number(dto.limit) || 30, 1);
      const noLimit = dto.noLimit === true || String(dto.noLimit) === 'true';
      const tracePath = dto.tracePath;

      let traceIds: string[] = [];
      if (tracePath) {
        const parsedIds = tracePath.split(',').map(id => id.trim()).filter(id => id);
        if (parsedIds.length > 0) {
          parsedIds.forEach((id) => {
            traceIds.push(id);
            let currId = parentMap.get(id);
            let hasParent = false;
            const visited = new Set<string>();
            while (currId && currId !== 'null' && currId !== 'undefined') {
              hasParent = true;
              if (visited.has(currId)) break;
              visited.add(currId);
              traceIds.push(currId);
              currId = parentMap.get(currId);
            }
            if (!hasParent) {
              const unit = allActiveUnits.find(u => u.id === id);
              if (unit && unit.mpath) {
                const paths = unit.mpath.split('/').filter(p => p && p !== id);
                traceIds.push(...paths);
              }
            }
          });
          traceIds = [...new Set(traceIds)];
        }
      }

      const buildHierarchicalFlatList = (nodes: OrganizationUnitEntity[]): OrganizationUnitEntity[] => {
        const map: Record<string, { node: OrganizationUnitEntity; children: any[] }> = {};
        nodes.forEach(node => {
          map[node.id] = { node, children: [] };
        });

        const roots: any[] = [];
        nodes.forEach(node => {
          const parentId = node.parentId;
          if (parentId && map[parentId]) {
            map[parentId].children.push(map[node.id]);
          } else {
            roots.push(map[node.id]);
          }
        });

        const sortFn = (a: any, b: any) => {
          const orderA = a.node.order ?? 0;
          const orderB = b.node.order ?? 0;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          const nameA = a.node.name || '';
          const nameB = b.node.name || '';
          return nameA.localeCompare(nameB, 'vi');
        };

        const traverse = (items: any[]): OrganizationUnitEntity[] => {
          items.sort(sortFn);
          const result: OrganizationUnitEntity[] = [];
          items.forEach(item => {
            result.push(item.node);
            if (item.children.length > 0) {
              result.push(...traverse(item.children));
            }
          });
          return result;
        };

        return traverse(roots);
      };

      const matchingOrgs = allActiveUnits.filter(u => finalChildIds.has(u.id));
      const sortedOrgs = buildHierarchicalFlatList(matchingOrgs);
      const total = sortedOrgs.length;

      let organizations: OrganizationUnitEntity[] = [];
      if (noLimit) {
        organizations = sortedOrgs;
      } else {
        organizations = sortedOrgs.slice((page - 1) * limit, page * limit);

        if (traceIds.length > 0) {
          const traceOrganizations = allActiveUnits.filter(u => traceIds.includes(u.id));
          const existingIds = new Set(organizations.map(org => org.id));
          traceOrganizations.forEach(org => {
            if (!existingIds.has(org.id)) {
              organizations.push(org);
              existingIds.add(org.id);
            }
          });

          organizations = buildHierarchicalFlatList(organizations);
        }
      }


      const data: OrganizationUnitDto[] = organizations.map(org => {
        const level = getLevel(org);

        return {
          id: org.id,
          name: org.name,
          code: org.code,
          type: org.type,
          mpath: org.mpath || '',
          parentId: org.parentId,
          level: level,
        };
      });

      return {
        data,
        total: total,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to get child organizations: ${error.message}`);
    }
  }

  /**
   * GET /organization-units/tree
   * - Không có organizationId → trả về các node level=1 (parentId null)
   * - Có organizationId      → trả về các con trực tiếp của node đó
   * - tracePath              → dùng mpath để truy vết ancestors (hỗ trợ cả Mongo ID)
   */
  async getOrganizationTree(
    userId: string,
    dto: GetChildOrganizationsDto,
  ): Promise<GetChildOrganizationsResponseDto> {
    try {
      const page = Math.max(Number(dto.page) || 1, 1);
      const limit = Math.max(Number(dto.limit) || 30, 1);
      const noLimit = dto.noLimit === true || String(dto.noLimit) === 'true';
      const tracePath = dto.tracePath;
      const organizationId = dto.organizationId;

      // 1. Tải toàn bộ đơn vị active để xây dựng cây
      const where: any = { status: STATUS.ACTIVED };
      if (dto.maxLevel !== undefined && dto.maxLevel !== null) {
        where.mpath = Raw(alias => `ISNULL(LEN(${alias}) - LEN(REPLACE(${alias}, '/', '')), 0) <= ${dto.maxLevel! - 1}`);
      }

      const allActiveUnits = await this.orgUnitRepository.find({
        where,
        select: ['id', 'parentId', 'name', 'code', 'type', 'order', 'mpath'],
      });

      // Build id → unit map
      const unitMap = new Map<string, OrganizationUnitEntity>();
      allActiveUnits.forEach(u => unitMap.set(u.id, u));

      // ── Bước 2a: Xây dựng mpathDerivedParent từ TOÀN BỘ mpath ──────────────
      // Scan qua mpath của mọi unit để suy ngược parent-child.
      // VD: C có mpath = "A/B/C" → biết B's parent = A, C's parent = B
      // Điều này khắc phục trường hợp unit B chỉ có mpath = "B" (thiếu ancestor)
      // nhưng child C của nó có mpath đầy đủ A/B/C
      const mpathDerivedParent = new Map<string, string>();
      allActiveUnits.forEach(u => {
        if (!u.mpath) return;
        const parts = u.mpath.split('/').filter(Boolean);
        for (let i = 1; i < parts.length; i++) {
          if (!mpathDerivedParent.has(parts[i])) {
            mpathDerivedParent.set(parts[i], parts[i - 1]);
          }
        }
      });

      // ── Bước 2b: Build effectiveParentMap ──────────────────────────────────
      // Thứ tự ưu tiên:
      //   1. SQL parentId (hợp lệ)
      //   2. mpathDerivedParent (từ mpath của các unit khác)
      //   3. Tự tính từ mpath của chính unit (selfIdx > 0)
      //   4. null (cấp 1)
      const effectiveParentMap = new Map<string, string | null>();
      allActiveUnits.forEach(u => {
        // 1. SQL parentId hợp lệ và cha thực sự tồn tại trong tập active
        const normalizedParentId = this.normalizeParentIdValue(u.parentId);
        if (normalizedParentId && unitMap.has(normalizedParentId)) {
          effectiveParentMap.set(u.id, normalizedParentId);
          return;
        }
        // 2. Từ mpath của unit khác (scan toàn cục)
        if (mpathDerivedParent.has(u.id)) {
          effectiveParentMap.set(u.id, mpathDerivedParent.get(u.id)!);
          return;
        }
        // 3. Tự tính từ mpath của chính unit
        if (u.mpath) {
          const parts = u.mpath.split('/').filter(Boolean);
          const selfIdx = parts.indexOf(u.id);
          if (selfIdx > 0) {
            effectiveParentMap.set(u.id, parts[selfIdx - 1]);
            return;
          }
        }
        // 4. Cấp 1 (không có cha)
        effectiveParentMap.set(u.id, null);
      });

      // Helper: tính level dựa trên effectiveParentMap
      const getLevel = (unitId: string): number => {
        let lvl = 1;
        let currId = effectiveParentMap.get(unitId);
        const visited = new Set<string>();
        while (currId && currId !== 'null' && currId !== 'undefined') {
          if (visited.has(currId)) break;
          visited.add(currId);
          lvl++;
          currId = effectiveParentMap.get(currId);
        }
        return lvl;
      };

      // 2. Xác định tập childIds cần hiển thị
      const childIds = new Set<string>();

      if (!organizationId) {
        // Lấy cấp 1: effectiveParentId = null
        allActiveUnits.forEach(u => {
          const ep = effectiveParentMap.get(u.id);
          if (!ep || ep === 'null' || ep === 'undefined') {
            childIds.add(u.id);
          }
        });
      } else {
        // Chỉ lấy các con trực tiếp của node đang expand
        allActiveUnits.forEach(u => {
          if (u.id === organizationId) return;
          const ep = effectiveParentMap.get(u.id);
          if (ep === organizationId) {
            childIds.add(u.id);
          }
        });
      }

      // 3. Xử lý tracePath: dùng mpath để truy vết ancestors
      let traceIds: string[] = [];
      if (tracePath) {
        const parsedIds = tracePath
          .split(',')
          .map(id => id.trim())
          .filter(id => !!id);

        if (parsedIds.length > 0) {
          parsedIds.forEach(id => {
            traceIds.push(id);

            // Nếu unit có trong DB → trace qua effectiveParentMap
            if (effectiveParentMap.has(id)) {
              let currId = effectiveParentMap.get(id);
              const visited = new Set<string>();
              while (currId && currId !== 'null' && currId !== 'undefined') {
                if (visited.has(currId)) break;
                visited.add(currId);
                traceIds.push(currId);
                currId = effectiveParentMap.get(currId);
              }
            } else {
              // Unit KHÔNG có trong DB → tìm qua mpath của các unit khác chứa id này
              const found = allActiveUnits.find(
                u => u.mpath && u.mpath.split('/').includes(id),
              );
              if (found && found.mpath) {
                const parts = found.mpath.split('/').filter(Boolean);
                const idx = parts.indexOf(id);
                for (let i = 0; i < (idx >= 0 ? idx : parts.length); i++) {
                  traceIds.push(parts[i]);
                }
              }
            }

            // Luôn tách thêm mpath của chính unit để lấy ancestors
            const selfUnit = unitMap.get(id);
            if (selfUnit?.mpath) {
              selfUnit.mpath
                .split('/')
                .filter(p => p && p !== id)
                .forEach(p => traceIds.push(p));
            }
          });

          traceIds = [...new Set(traceIds)];
        }
      }

      // 5. Helper: flatten cây dùng effectiveParentMap (không phụ thuộc SQL parentId)
      const buildFlatList = (
        nodes: OrganizationUnitEntity[],
      ): OrganizationUnitEntity[] => {
        const map: Record<
          string,
          { node: OrganizationUnitEntity; children: any[] }
        > = {};
        nodes.forEach(node => {
          map[node.id] = { node, children: [] };
        });
        const roots: any[] = [];
        nodes.forEach(node => {
          const pid = effectiveParentMap.get(node.id);
          if (pid && map[pid]) {
            map[pid].children.push(map[node.id]);
          } else {
            roots.push(map[node.id]);
          }
        });
        const sortFn = (a: any, b: any) => {
          const oa = a.node.order ?? 0;
          const ob = b.node.order ?? 0;
          if (oa !== ob) return oa - ob;
          return (a.node.name || '').localeCompare(b.node.name || '', 'vi');
        };
        const traverse = (items: any[]): OrganizationUnitEntity[] => {
          items.sort(sortFn);
          const result: OrganizationUnitEntity[] = [];
          items.forEach(item => {
            result.push(item.node);
            if (item.children.length > 0)
              result.push(...traverse(item.children));
          });
          return result;
        };
        return traverse(roots);
      };

      // 6. Lọc + phân trang
      const matchingOrgs = allActiveUnits.filter(u => childIds.has(u.id));
      const sortedOrgs = buildFlatList(matchingOrgs);
      const total = sortedOrgs.length; // total = số kết quả chính (cấp 1 / con trực tiếp)

      let organizations: OrganizationUnitEntity[];
      if (noLimit) {
        organizations = sortedOrgs;
      } else {
        organizations = sortedOrgs.slice((page - 1) * limit, page * limit);
      }

      // Luôn append trace units (cả noLimit và có pagination)
      if (traceIds.length > 0) {
        const traceOrgs = allActiveUnits.filter(u => traceIds.includes(u.id));
        const existingIds = new Set(organizations.map(o => o.id));
        traceOrgs.forEach(org => {
          if (!existingIds.has(org.id)) {
            organizations.push(org);
            existingIds.add(org.id);
          }
        });
        organizations = buildFlatList(organizations);
      }

      // 7. Map response — parentId và level lấy từ effectiveParentMap (không từ SQL raw)
      const data: OrganizationUnitDto[] = organizations.map(org => ({
        id: org.id,
        name: org.name,
        code: org.code,
        type: org.type,
        mpath: org.mpath || '',
        parentId: effectiveParentMap.get(org.id) ?? null,
        level: getLevel(org.id),
      }));

      return { data, total };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to get organization tree: ${error.message}`,
      );
    }
  }
}
