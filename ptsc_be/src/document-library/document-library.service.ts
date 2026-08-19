import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as moment from 'moment';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { DocumentLibraryEntity } from './entities/document-library.entity';
import { CreateDocumentLibraryDto } from './dto/create-document-library.dto';
import { UpdateDocumentLibraryDto } from './dto/update-document-library.dto';
import { GroupUserService } from '../group-users/group-users.service';
import { UserEntity } from '../users/entities/user.entity';
import { OrganizationUnitEntity } from '../organization-unit/organization-unit_sql/organization-unit.entity';
import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { getUserFlowConfig } from 'src/utils/util';

// Map chức vụ (position) sang tên tiếng Việt
const POSITION_MAP: Record<string, string> = {
  'Admin': 'Quản trị hệ thống',
  'Vanthu': 'Văn thư',
  'Giamdoc': 'Giám đốc',
  'Phogiamdoc': 'Phó giám đốc',
  'Truongphong': 'Trưởng phòng',
  'Photruongphong': 'Phó trưởng phòng',
  'Canbo': 'Cán bộ',
  'TONG_GIAM_DOC': 'Tổng giám đốc',
  'PHO_TONG_GIAM_DOC': 'Phó Tổng giám đốc',
  'GIAM_DOC': 'Giám đốc',
  'PHO_GIAM_DOC': 'Phó Giám đốc',
  'TRUONG_PHONG': 'Trưởng phòng',
  'PHO_PHONG': 'Phó phòng',
  'NHAN_VIEN': 'Nhân viên',
};

const removeDiacritics = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};


@Injectable()
export class DocumentLibraryService {
  constructor(
    @InjectRepository(DocumentLibraryEntity, 'mssqlConnection')
    private readonly repository: Repository<DocumentLibraryEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly unitRepository: Repository<OrganizationUnitEntity>,
    private readonly groupUserService: GroupUserService,
    private readonly sqlsvRepo: SQLSVRepository,
    @InjectRepository(BpmnDesignEntity, 'mssqlConnection')
    private readonly bpmnRepo: Repository<BpmnDesignEntity>,
  ) {}

  async checkPermission(userId: string) {
    try {
      const group = await this.groupUserService.findByCode('TVDC');
      if (group && group.data && group.data.users) {
        const userIds = group.data.users.map((u: any) => u.id);
        return userIds.includes(userId);
      }
      return false;
    } catch {
      return false;
    }
  }

  async checkActionPermission(userId: string, req: any) {
    try {
      const method = req.method;
      const body = req.body;
      const params = req.params;
      
      const unitId = await this.getUserUnitId(userId);

      // Helper cho thao tác Create (Upload file, tạo folder con)
      // User cần có quyền Edit trên parentId hoặc bất kỳ ancestor nào của parentId
      const canCreateInParent = async (parentId: number) => {
        const parent = await this.repository.findOne({ where: { id: parentId } });
        if (!parent) return false;
        
        if (this.hasEditAccess(parent, userId, unitId)) return true;
        
        if (parent.path) {
          const ancestorIds = parent.path.split('/').map(Number).filter(id => id && id !== parent.id);
          if (ancestorIds.length > 0) {
            const ancestors = await this.repository.find({
              where: { id: In(ancestorIds) },
              select: ['id', 'owner', 'editOrganizationUnit', 'editPermissions']
            });
            for (const ancestor of ancestors) {
              if (this.hasEditAccess(ancestor, userId, unitId)) return true;
            }
          }
        }
        return false;
      };

      // Helper cho thao tác Update / Delete
      // User cần là OWNER, HOẶC có quyền Edit từ một thư mục CHA (ancestor)
      const canModifyDoc = async (docId: number) => {
        const doc = await this.repository.findOne({ where: { id: docId } });
        if (!doc) return false;
        
        // Không được phép sửa/xóa thư mục gốc (root folder) nếu không thuộc TVDC
        if (!doc.parentId) return false;
        
        if (doc.owner === userId) return true;
        
        if (doc.path) {
          const ancestorIds = doc.path.split('/').map(Number).filter(id => id && id !== doc.id);
          if (ancestorIds.length > 0) {
            const ancestors = await this.repository.find({
              where: { id: In(ancestorIds) },
              select: ['id', 'owner', 'editOrganizationUnit', 'editPermissions']
            });
            for (const ancestor of ancestors) {
              if (this.hasEditAccess(ancestor, userId, unitId)) return true;
            }
          }
        }
        return false;
      };

      // POST /api/document-library => create
      if (method === 'POST') {
        const parentId = body.parentId;
        // root level requires TVDC => return false if parentId null
        if (!parentId) return false;
        
        return await canCreateInParent(Number(parentId));
      }
      
      // PATCH /api/document-library/:id => update
      // DELETE /api/document-library/:id => remove
      if (method === 'PATCH' || method === 'DELETE') {
        // DELETE multiple
        if (body?.ids && Array.isArray(body.ids)) {
          for (const id of body.ids) {
            if (!(await canModifyDoc(Number(id)))) return false;
          }
          return true;
        }
        
        // PATCH update-order
        if (body && Array.isArray(body) && body[0]?.sortOrder !== undefined) {
           for (const item of body) {
              if (!(await canModifyDoc(Number(item.id)))) return false;
           }
           return true;
        }

        // Single item patch/delete
        const id = params?.id;
        if (!id) return false;
        
        return await canModifyDoc(Number(id));
      }
      
      return false;
    } catch {
      return false;
    }
  }

  private hasEditAccess(doc: DocumentLibraryEntity, userId: string, unitId: string | null): boolean {
    if (doc.owner === userId) return true;
    
    if (doc.editOrganizationUnit && unitId && doc.editOrganizationUnit === unitId) return true;
    
    if (doc.editPermissions) {
      try {
        const editPerms = JSON.parse(doc.editPermissions);
        if (Array.isArray(editPerms) && editPerms.includes(userId)) return true;
      } catch {
        // ignore JSON parse error
      }
    }
    
    return false;
  }

  async canManagePermissions(docId: number, userId: string): Promise<boolean> {
    try {
      const isTVDC = await this.checkPermission(userId);
      if (isTVDC) return true;

      const doc = await this.repository.findOne({ where: { id: docId } });
      if (!doc) return false;

      if (doc.owner === userId) return true;

      const unitId = await this.getUserUnitId(userId);

      if (doc.path) {
        const ancestorIds = doc.path
          .split('/')
          .map(Number)
          .filter(id => id && id !== doc.id);

        if (ancestorIds.length > 0) {
          const ancestors = await this.repository.find({
            where: { id: In(ancestorIds) },
            select: ['id', 'owner', 'editOrganizationUnit', 'editPermissions']
          });

          for (const ancestor of ancestors) {
            if (ancestor.owner === userId) return true;
            if (this.hasEditAccess(ancestor, userId, unitId)) return true;
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  async findAll(query: any, userId?: string) {
    // 4. Validate input: page, limit, parentId
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
    const parentId = query.parentId ? Number(query.parentId) : null;
    const searchAll = query.searchAll === 'true' || query.searchAll === true;

    const qb = this.repository.createQueryBuilder('doc');

    const isSharedWithMe = query.filter?.sharedWithMe === 'true' || query.filter?.sharedWithMe === true;

    // 2. Use bind param for WHERE
    if (parentId !== null && !isNaN(parentId)) {
      qb.where('doc.parentId = :parentId', { parentId });
    } else if (isSharedWithMe) {
      qb.where('doc.status = :activeStatus', { activeStatus: 1 });
    } else if (!searchAll) {
      qb.where('doc.parentId IS NULL');
    } else {
      qb.where('1=1');
    }

    qb.andWhere('doc.status = :activeStatus', { activeStatus: 1 });

    if (query.filter) {
      const filter = query.filter;
      const unitId = userId ? await this.getUserUnitId(userId) : null;

      // 3. Whitelist filter keys
      const allowedFilters = ['name', 'type', 'fileType', 'isPersonal', 'sharedWithMe'];

      for (const key of Object.keys(filter)) {
        if (!allowedFilters.includes(key)) continue;

        const value = filter[key];
        if (value === undefined || value === null || value === '') continue;

        if (key === 'isPersonal') {
          if ((value === 'true' || value === true) && userId && (parentId === null || isNaN(parentId))) {
            qb.andWhere(new Brackets(bqb => {
              bqb.where('doc.owner = :userId', { userId });
              bqb.orWhere('doc.editPermissions LIKE :userSearch', { userSearch: `%"${userId}"%` });
              bqb.orWhere('doc.viewUserPermissions LIKE :userSearch', { userSearch: `%"${userId}"%` });
              if (unitId) {
                bqb.orWhere('doc.viewPermissions LIKE :unitSearch', { unitSearch: `%"${unitId}"%` });
              }
            }));
          }
        } else if (key === 'sharedWithMe') {
          if ((value === 'true' || value === true) && userId && (parentId === null || isNaN(parentId))) {
            qb.andWhere(new Brackets(bqb => {
              bqb.where('doc.editPermissions LIKE :userSearch', { userSearch: `%"${userId}"%` });
              bqb.orWhere('doc.viewUserPermissions LIKE :userSearch', { userSearch: `%"${userId}"%` });
              if (unitId) {
                bqb.orWhere('doc.viewPermissions LIKE :unitSearch', { unitSearch: `%"${unitId}"%` });
              }
            }));
            qb.andWhere('doc.owner != :userId', { userId });

            // Only get the top-most shared folders/files (no shared ancestors)
            qb.andWhere(
              `NOT EXISTS (
                SELECT 1 FROM document_library parent_doc
                WHERE parent_doc.status = 1
                  AND parent_doc.id != doc.id
                  AND CHARINDEX('/' + CAST(parent_doc.id AS VARCHAR) + '/', '/' + doc.path + '/') > 0
                  AND (
                    parent_doc.edit_permissions LIKE :userSearch
                    OR parent_doc.view_user_permissions LIKE :userSearch
                    ${unitId ? 'OR parent_doc.view_permissions LIKE :unitSearch' : ''}
                  )
                  AND parent_doc.owner != :userId
              )`
            );
          }
        } else if (key === 'name') {
          // keyword validation: string, limited length
          const keyword = String(value).trim().substring(0, 100);
          const words = keyword.split(/\s+/).filter(Boolean);
          if (words.length > 0) {
            words.forEach((word, index) => {
              const paramName = `nameWord${index}`;
              // 1. No concat: Using bind param with fixed COLLATE string
              qb.andWhere(
                `doc.name COLLATE Latin1_General_CI_AI LIKE :${paramName} COLLATE Latin1_General_CI_AI`,
                { [paramName]: `%${word}%` }
              );
            });
          }
        } else if (key === 'type') {
          qb.andWhere('doc.type = :docType', { docType: value });
        } else if (key === 'fileType') {
          qb.andWhere('doc.fileType = :fType', { fType: value });
        }
      }
    }

    // 3. Whitelist sort key and order
    const allowedSortKeys = ['id', 'name', 'type', 'sortOrder', 'createdAt', 'updatedAt'];
    const sortKey = allowedSortKeys.includes(query.sort?.key) ? query.sort.key : 'sortOrder';
    const sortOrder = query.sort?.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // 1. No concat for query structure: use fixed strings for common fields if possible, 
    // but here we use the validated sortKey from the whitelist.
    qb.orderBy(`doc.${sortKey}`, sortOrder);
    if (sortKey !== 'sortOrder') {
      qb.addOrderBy('doc.sortOrder', 'ASC');
    }
    qb.addOrderBy('doc.type', 'DESC');
    qb.addOrderBy('doc.createdAt', 'DESC');

    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    
    const unitId = userId ? await this.getUserUnitId(userId) : null;
    const ownerIds = [...new Set(data.map(item => item.owner).filter(id => id))];
    const ownersMap = await this.getUserNamesMap(ownerIds);
    const ancestorPermsMap = await this.getAncestorPermsMap(data);

    // Collect all permission IDs from all loaded folders
    const allPermIds = new Set<string>();
    data.forEach(item => {
      const vps = item.viewPermissions ? JSON.parse(item.viewPermissions) : [];
      const vups = item.viewUserPermissions ? JSON.parse(item.viewUserPermissions) : [];
      const eps = item.editPermissions ? JSON.parse(item.editPermissions) : [];
      [...vps, ...vups, ...eps].forEach(id => {
        if (id) allPermIds.add(id);
      });
    });

    // Find which of these IDs are actually users
    const userEntities = allPermIds.size > 0
      ? await this.userRepository.find({
          where: { id: In(Array.from(allPermIds)) },
          select: ['id']
        })
      : [];
    const userIdsSet = new Set(userEntities.map(u => u.id));

    const mappedData = data.map(item => this.mapEntityToResponse(item, userId, unitId, ownersMap, ancestorPermsMap, userIdsSet));

    return {
      data: mappedData,
      total,
      page,
      limit,
    };
  }


  async findOne(id: number, userId?: string) {
    const doc = await this.repository.findOne({ where: { id, status: 1 } });
    if (!doc) throw new NotFoundException('Document not found');
    
    const unitId = userId ? await this.getUserUnitId(userId) : null;
    
    // Get children if folder to collect all owner IDs
    let children: DocumentLibraryEntity[] = [];
    if (doc.type === 'folder') {
      children = await this.repository.find({
        where: { parentId: id, status: 1 },
        order: { type: 'DESC', createdAt: 'DESC' } 
      });
    }

    // Collect all owner IDs (main doc + children)
    const ownerIds = [...new Set([doc.owner, ...children.map(c => c.owner)].filter(id => id))];
    const ownersMap = await this.getUserNamesMap(ownerIds);

    const ancestorPermsMap = await this.getAncestorPermsMap([doc, ...children]);

    // Collect all permission IDs from main doc and children
    const allPermIds = new Set<string>();
    [doc, ...children].forEach(item => {
      const vps = item.viewPermissions ? JSON.parse(item.viewPermissions) : [];
      const vups = item.viewUserPermissions ? JSON.parse(item.viewUserPermissions) : [];
      const eps = item.editPermissions ? JSON.parse(item.editPermissions) : [];
      [...vps, ...vups, ...eps].forEach(id => {
        if (id) allPermIds.add(id);
      });
    });

    // Find which of these IDs are actually users
    const userEntities = allPermIds.size > 0
      ? await this.userRepository.find({
          where: { id: In(Array.from(allPermIds)) },
          select: ['id']
        })
      : [];
    const userIdsSet = new Set(userEntities.map(u => u.id));

    const response: any = this.mapEntityToResponse(doc, userId, unitId, ownersMap, ancestorPermsMap, userIdsSet);
    
    // Populate permissions and organization unit details
    await this.populateResponseExtras(response, doc);

    // Nếu là file, lấy thêm thông tin file vật lý
    if (doc.type === 'file' && doc.fileId) {
      response['file_info'] = await this.getFileInfo(doc.fileId);
    }

    // Nếu là folder, lấy thêm danh sách con
    if (doc.type === 'folder') {
      response['children'] = children.map(child => this.mapEntityToResponse(child, userId, unitId, ownersMap, ancestorPermsMap, userIdsSet));
    }
    
    return response;
  }

  private async getUserUnitId(userId: string): Promise<string | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['parent']
    });
    return user?.parent?.id || null;
  }

  private async mapUserIdsToObjects(userIds: string[]) {
    if (!userIds || userIds.length === 0) return [];
    
    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      select: ['id', 'name']
    });
    
    return users.map(u => ({ id: u.id, name: u.name }));
  }

  private async mapUnitIdsToObjects(unitIds: string[]) {
    if (!unitIds || unitIds.length === 0) return [];
    
    const units = await this.unitRepository.find({
      where: { id: In(unitIds) },
      select: ['id', 'name']
    });
    
    return units.map(u => ({ id: u.id, name: u.name }));
  }

  private async getUserNamesMap(userIds: string[]): Promise<Record<string, string>> {
    const map: Record<string, string> = {};
    if (!userIds || userIds.length === 0) return map;

    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      select: ['id', 'name']
    });

    users.forEach(u => {
      map[u.id] = u.name;
    });

    return map;
  }

  private async getFileInfo(fileId: number) {
    try {
      // 5. No dynamic raw SQL -> Using QueryBuilder
      const file = await this.repository.manager
        .createQueryBuilder()
        .select(['id', 'file_name', 'file_size', 'mime_type', 'file_path', 'storage_type', 'created_at'])
        .from('files', 'f')
        .where('f.id = :fileId', { fileId })
        .andWhere('f.status = :status', { status: 1 })
        .getRawOne();
      
      if (file) {
        const fileName = file.file_name?.toLowerCase() || '';
        const mimeType = file.mime_type?.toLowerCase() || '';
        
        let category = 'OTHER';
        if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) {
          category = 'PDF';
        } else if (
          mimeType.includes('word') || 
          mimeType.includes('officedocument.wordprocessingml') ||
          fileName.endsWith('.doc') || 
          fileName.endsWith('.docx')
        ) {
          category = 'WORD';
        } else if (
          mimeType.includes('excel') || 
          mimeType.includes('officedocument.spreadsheetml') ||
          fileName.endsWith('.xls') || 
          fileName.endsWith('.xlsx') ||
          fileName.endsWith('.csv')
        ) {
          category = 'EXCEL';
        } else if (
          mimeType.includes('presentation') || 
          mimeType.includes('officedocument.presentationml') ||
          fileName.endsWith('.ppt') || 
          fileName.endsWith('.pptx')
        ) {
          category = 'POWERPOINT';
        } else if (
          mimeType.startsWith('image/') || 
          ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'].some(ext => fileName.endsWith(ext))
        ) {
          category = 'IMAGE';
        }

        return {
          ...file,
          fileTypeCategory: category
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async create(dto: CreateDocumentLibraryDto, userId?: string) {
    const doc = this.repository.create({
      ...dto,
      viewPermissions: dto.viewPermissions ? JSON.stringify(dto.viewPermissions) : '[]',
      editPermissions: dto.editPermissions ? JSON.stringify(dto.editPermissions) : '[]',
      viewUserPermissions: dto.viewUserPermissions ? JSON.stringify(dto.viewUserPermissions) : '[]',
      status: 1,
      owner: userId,
    });

    // Save first to get the auto-increment ID
    const savedDoc = await this.repository.save(doc);

    // Calculate path based on the new ID
    if (dto.parentId) {
      const parent = await this.repository.findOne({ where: { id: dto.parentId } });
      savedDoc.path = parent ? `${parent.path}/${savedDoc.id}` : savedDoc.id.toString();
    } else {
      savedDoc.path = savedDoc.id.toString();
    }

    // Update path
    await this.repository.update(savedDoc.id, { path: savedDoc.path });

    const unitId = userId ? await this.getUserUnitId(userId) : null;
    const ownersMap = userId ? await this.getUserNamesMap([userId]) : {};
    const ancestorPermsMap = await this.getAncestorPermsMap([savedDoc]);

    // Collect all permission IDs from savedDoc
    const allPermIds = new Set<string>();
    const vps = savedDoc.viewPermissions ? JSON.parse(savedDoc.viewPermissions) : [];
    const vups = savedDoc.viewUserPermissions ? JSON.parse(savedDoc.viewUserPermissions) : [];
    const eps = savedDoc.editPermissions ? JSON.parse(savedDoc.editPermissions) : [];
    [...vps, ...vups, ...eps].forEach(id => {
      if (id) allPermIds.add(id);
    });

    // Find which of these IDs are actually users
    const userEntities = allPermIds.size > 0
      ? await this.userRepository.find({
          where: { id: In(Array.from(allPermIds)) },
          select: ['id']
        })
      : [];
    const userIdsSet = new Set(userEntities.map(u => u.id));

    const response: any = this.mapEntityToResponse(savedDoc, userId, unitId, ownersMap, ancestorPermsMap, userIdsSet);

    // Populate extras cho response trả về ngay khi tạo
    await this.populateResponseExtras(response, savedDoc);

    return response;
  }

  private async populateResponseExtras(response: any, entity: DocumentLibraryEntity) {
    // Map permissions: viewPermissions -> Units, editPermissions -> Users, viewUserPermissions -> Users
    response.viewPermissions = await this.mapUnitIdsToObjects(response.viewPermissions);
    response.editPermissions = await this.mapUserIdsToObjects(response.editPermissions);
    response.viewUserPermissions = await this.mapUserIdsToObjects(response.viewUserPermissions);

    // Map editOrganizationUnit từ ID sang Object {id, name}
    if (entity.editOrganizationUnit) {
      const editUnits = await this.mapUnitIdsToObjects([entity.editOrganizationUnit]);
      response.editOrganizationUnit = editUnits.length > 0 
        ? editUnits[0] 
        : { id: entity.editOrganizationUnit, name: null };
    } else {
      response.editOrganizationUnit = null;
    }
  }

  async update(id: number, dto: UpdateDocumentLibraryDto, userId?: string) {
    const doc = await this.repository.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    const isModifyingPermissions = 
      dto.viewPermissions !== undefined || 
      dto.editPermissions !== undefined || 
      dto.viewUserPermissions !== undefined;

    if (isModifyingPermissions && userId) {
      const canManage = await this.canManagePermissions(id, userId);
      if (!canManage) {
        throw new BadRequestException('Bạn không có quyền phân quyền trên thư mục/file này. Bạn chỉ được phép phân quyền trên các thư mục/file con bên trong.');
      }
    }

    const updatedData: any = { ...dto };
    if (dto.viewPermissions) updatedData.viewPermissions = JSON.stringify(dto.viewPermissions);
    if (dto.editPermissions) updatedData.editPermissions = JSON.stringify(dto.editPermissions);
    if (dto.viewUserPermissions) updatedData.viewUserPermissions = JSON.stringify(dto.viewUserPermissions);

    await this.repository.update(id, updatedData);
    return this.findOne(id, userId);
  }

  async remove(id: number) {
    const doc = await this.repository.findOne({ where: { id, status: 1 } });
    if (!doc) throw new NotFoundException('Document not found');

    if (doc.type === 'folder') {
      await this.repository
        .createQueryBuilder()
        .update()
        .set({ status: 3 })
        .where('path LIKE :path', { path: `${doc.path}%` })
        .execute();
    } else {
      await this.repository.update(id, { status: 3 });
    }
    
    return { success: true };
  }

  async removeMultiple(ids: number[]) {
    if (!ids || ids.length === 0) return { success: false, message: 'No IDs provided' };

    for (const id of ids) {
      const doc = await this.repository.findOne({ where: { id, status: 1 } });
      if (doc) {
        if (doc.type === 'folder') {
          await this.repository
            .createQueryBuilder()
            .update()
            .set({ status: 3 })
            .where('path LIKE :path', { path: `${doc.path}%` })
            .execute();
        } else {
          await this.repository.update(id, { status: 3 });
        }
      }
    }

    return { success: true };
  }

  async updateOrder(orders: { id: number; sortOrder: number }[]) {
    if (!orders || orders.length === 0) return { success: false };

    await this.repository.manager.transaction(async (transactionalEntityManager) => {
      for (const item of orders) {
        await transactionalEntityManager.update(DocumentLibraryEntity, item.id, {
          sortOrder: item.sortOrder,
        });
      }
    });

    return { success: true };
  }

  private async getAncestorPermsMap(data: DocumentLibraryEntity[]) {
    const ancestorIds = new Set<number>();
    data.forEach(item => {
      if (item.path) {
        item.path.split('/').forEach(idStr => {
          const num = Number(idStr);
          if (num) ancestorIds.add(num);
        });
      }
      if (item.parentId) {
        ancestorIds.add(item.parentId);
      }
    });
    
    const map: Record<number, any> = {};
    let currentIdsToFetch = Array.from(ancestorIds);

    while (currentIdsToFetch.length > 0) {
      const ancestors = await this.repository.find({
        where: { id: In(currentIdsToFetch) },
        select: ['id', 'parentId', 'path', 'owner', 'viewPermissions', 'editPermissions', 'viewUserPermissions']
      });

      const nextIdsToFetch: number[] = [];
      ancestors.forEach(a => {
        map[a.id] = {
          id: a.id,
          parentId: a.parentId,
          path: a.path,
          owner: a.owner,
          viewPermissions: a.viewPermissions ? JSON.parse(a.viewPermissions) : [],
          editPermissions: a.editPermissions ? JSON.parse(a.editPermissions) : [],
          viewUserPermissions: a.viewUserPermissions ? JSON.parse(a.viewUserPermissions) : []
        };
        if (a.path) {
          a.path.split('/').forEach(idStr => {
            const num = Number(idStr);
            if (num && !map[num] && !currentIdsToFetch.includes(num)) {
              nextIdsToFetch.push(num);
            }
          });
        }
        if (a.parentId && !map[a.parentId] && !currentIdsToFetch.includes(a.parentId)) {
          nextIdsToFetch.push(a.parentId);
        }
      });

      currentIdsToFetch = Array.from(new Set(nextIdsToFetch));
    }
    return map;
  }

  private mapEntityToResponse(
    entity: DocumentLibraryEntity, 
    userId?: string, 
    unitId?: string | null,
    ownersMap: Record<string, string> = {},
    ancestorPermsMap: Record<number, any> = {},
    userIdsSet: Set<string> = new Set()
  ) {
    const rawViewPerms = entity.viewPermissions ? JSON.parse(entity.viewPermissions) : [];
    const rawViewUserPerms = entity.viewUserPermissions ? JSON.parse(entity.viewUserPermissions) : [];

    const viewPerms: string[] = [];
    const viewUserPerms: string[] = [];

    rawViewPerms.forEach(id => {
      if (userIdsSet.has(id)) {
        viewUserPerms.push(id);
      } else {
        viewPerms.push(id);
      }
    });

    rawViewUserPerms.forEach(id => {
      if (userIdsSet.has(id)) {
        viewUserPerms.push(id);
      } else {
        viewPerms.push(id);
      }
    });

    const finalViewPerms = [...new Set(viewPerms)];
    const finalViewUserPerms = [...new Set(viewUserPerms)];
    const editPerms = entity.editPermissions ? JSON.parse(entity.editPermissions) : [];
    
    let canView = false;
    let canEdit = false;
    let inheritedEditAccess = false;

    if (userId) {
      const pathIdsSet = new Set<number>();
      if (entity.path) {
        entity.path.split('/').forEach(idStr => {
          const num = Number(idStr);
          if (num) pathIdsSet.add(num);
        });
      }
      let currParentId = entity.parentId;
      while (currParentId) {
        pathIdsSet.add(currParentId);
        currParentId = ancestorPermsMap[currParentId]?.parentId;
      }
      pathIdsSet.add(entity.id);
      
      for (const id of Array.from(pathIdsSet)) {
        let permOwner = entity.owner;
        let pView = finalViewPerms;
        let pEdit = editPerms;
        let pViewUser = finalViewUserPerms;
        const isAncestor = id !== entity.id;

        if (isAncestor && ancestorPermsMap[id]) {
          permOwner = ancestorPermsMap[id].owner;
          pView = ancestorPermsMap[id].viewPermissions;
          pEdit = ancestorPermsMap[id].editPermissions;
          pViewUser = ancestorPermsMap[id].viewUserPermissions;
        }

        if (permOwner === userId) {
          canView = true;
          if (!canEdit) {
            canEdit = true;
            if (isAncestor) inheritedEditAccess = true;
          }
        } else {
          if (pEdit.includes(userId)) {
            if (!canEdit) {
              canEdit = true;
              if (isAncestor) inheritedEditAccess = true;
            }
            canView = true;
          }
          if (pView.includes(userId) || (unitId && pView.includes(unitId))) {
            canView = true;
          }
          if (pViewUser.includes(userId)) {
            canView = true;
          }
        }
        
        if (canView && canEdit) break; // Optimization
      }
    }
    const result = {
      ...entity,
      viewPermissions: finalViewPerms,
      editPermissions: editPerms,
      viewUserPermissions: finalViewUserPerms,
      canView,
      canEdit,
      inheritedEditAccess,
      canShare: userId ? (entity.owner === userId || inheritedEditAccess) : false,
      isOwner: userId ? entity.owner === userId : false,
      owner: ownersMap[entity.owner] || entity.owner,
      createdAt: entity.createdAt ? moment(entity.createdAt).format('DD/MM/YYYY HH:mm') : null,
      updatedAt: entity.updatedAt ? moment(entity.updatedAt).format('DD/MM/YYYY HH:mm') : null,
    };

    // Ensure sortOrder is 0 if null
    if (result.sortOrder === null || result.sortOrder === undefined) {
      result.sortOrder = 0;
    }

    return result;
  }

  /**
   * Lấy danh sách đơn vị/phòng ban dạng tree kèm users bên trong
   * Dùng cho thư viện tài liệu (thay thế API meeting-schedule/organization-units)
   */
  async getOrganizationUnitsTree(userId: string, parentId?: string, search?: string, hasUser?: boolean) {
    try {
      const bpmn = await getUserFlowConfig(this.sqlsvRepo, userId, 'ArchiveRecord');
      const processKey = bpmn?.flowConfig?.id;

      if (!processKey) {
        return {
          success: true,
          message: 'Không tìm thấy cấu hình luồng cho user',
          data: [],
        };
      }

      // Lấy unit từ bpmn_design
      const bpmnDesign = await this.bpmnRepo.findOne({
        where: { processKey },
        select: ['unit'],
      });

      if (!bpmnDesign || !bpmnDesign.unit || bpmnDesign.unit.length === 0) {
        return {
          success: true,
          message: 'Không có phòng nào trong luồng',
          data: [],
        };
      }

      const normalizeUnitId = (value: unknown): string | null => {
        const id = String(value ?? '').trim();
        if (!id || ['null', 'undefined'].includes(id.toLowerCase())) return null;
        return id;
      };

      const unitIds = Array.from(
        new Set(
          (Array.isArray(bpmnDesign.unit) ? bpmnDesign.unit : [])
            .map(normalizeUnitId)
            .filter((id): id is string => !!id),
        ),
      );

      if (unitIds.length === 0) {
        return {
          success: true,
          message: 'Không có phòng nào trong luồng',
          data: [],
        };
      }

      // Lấy các phòng thực sự
      const configuredOrgUnits = await this.unitRepository.createQueryBuilder('unit')
        .select([
          'unit.id AS id',
          'unit.name AS name',
          'unit.code AS code',
          'unit.parentId AS parentId',
          'unit.mpath AS mpath',
          'unit.type AS type'
        ])
        .where('unit.status = :status', { status: 1 })
        .andWhere('unit.id IN (SELECT value FROM OPENJSON(:unitIdsJson))', { unitIdsJson: JSON.stringify(unitIds) })
        .orderBy('unit.name', 'ASC')
        .getRawMany();

      if (configuredOrgUnits.length === 0) {
        return {
          success: true,
          message: 'Không có phòng nào trong luồng',
          data: [],
        };
      }

      const configuredUnitIds = new Set(configuredOrgUnits.map((u) => u.id));
      const missingParentIds = new Set<string>();

      for (const unit of configuredOrgUnits) {
        const mpath = String(unit.mpath ?? '').trim();
        if (mpath) {
          mpath
            .split('/')
            .map(normalizeUnitId)
            .filter((id): id is string => !!id)
            .forEach((id) => {
              if (!configuredUnitIds.has(id)) {
                missingParentIds.add(id);
              }
            });
        }

        const pId = normalizeUnitId(unit.parentId);
        if (pId && !configuredUnitIds.has(pId)) {
          missingParentIds.add(pId);
        }
      }

      const allUnitIds = [...configuredUnitIds, ...missingParentIds];

      const [missingOrgUnits, users] = await Promise.all([
        missingParentIds.size > 0
          ? this.unitRepository.createQueryBuilder('unit')
            .select([
              'unit.id AS id',
              'unit.name AS name',
              'unit.code AS code',
              'unit.parentId AS parentId',
              'unit.mpath AS mpath',
              'unit.type AS type'
            ])
            .where('unit.status = :status', { status: 1 })
            .andWhere('unit.id IN (SELECT value FROM OPENJSON(:missingParentIdsJson))', { missingParentIdsJson: JSON.stringify([...missingParentIds]) })
            .orderBy('unit.name', 'ASC')
            .getRawMany()
          : Promise.resolve([]),
        this.userRepository.createQueryBuilder('user')
          .innerJoin('user.parent', 'parent')
          .select([
            'user.id AS id',
            'user.name AS name',
            'user.codeND AS codeND',
            'user.position AS position',
            'parent.id AS parentId'
          ])
          .where('user.status = :status', { status: 1 })
          .andWhere('parent.id IN (SELECT value FROM OPENJSON(:allUnitIdsJson))', { allUnitIdsJson: JSON.stringify(allUnitIds) })
          .orderBy('user.name', 'ASC')
          .getRawMany(),
      ]);

      let allOrgUnits = [...configuredOrgUnits, ...missingOrgUnits];

      if (hasUser) {
        const directUnitIdsWithUsers = new Set(users.map(u => u.parentId).filter((id): id is string => !!id));
        const unitsWithUsersAndTheirAncestors = new Set<string>();

        for (const unit of allOrgUnits) {
          if (directUnitIdsWithUsers.has(unit.id)) {
            unitsWithUsersAndTheirAncestors.add(unit.id);
            
            const mpath = String(unit.mpath ?? '').trim();
            if (mpath) {
              mpath
                .split('/')
                .map(normalizeUnitId)
                .filter((id): id is string => !!id)
                .forEach(id => unitsWithUsersAndTheirAncestors.add(id));
            }
            
            let pId = normalizeUnitId(unit.parentId);
            while (pId) {
              unitsWithUsersAndTheirAncestors.add(pId);
              const parentObj = allOrgUnits.find(u => u.id === pId);
              pId = parentObj ? normalizeUnitId(parentObj.parentId) : null;
            }
          }
        }

        // Lọc lại allOrgUnits và configuredUnitIds
        allOrgUnits = allOrgUnits.filter(u => unitsWithUsersAndTheirAncestors.has(u.id));

        const filteredConfiguredIds = new Set<string>();
        configuredUnitIds.forEach(id => {
          if (unitsWithUsersAndTheirAncestors.has(id)) {
            filteredConfiguredIds.add(id);
          }
        });
        configuredUnitIds.clear();
        filteredConfiguredIds.forEach(id => configuredUnitIds.add(id));
      }

      // Map users theo unit
      const usersByOrgUnit = new Map<string, any[]>();
      const formattedUsers = users.map(user => {
        const role = user.position ? (POSITION_MAP[user.position] || user.position) : null;
        const displayTitle = role ? `${user.name} - ${role}` : user.name;
        
        const formattedUser = {
          id: user.id,
          name: user.name,
          username: user.username,
          codeND: user.codeND || null,
          position: user.position,
          title: displayTitle,
          role,
          types: 'user',
          parentId: user.parentId,
        };

        const orgUnitId = user.parentId;
        if (orgUnitId) {
          if (!usersByOrgUnit.has(orgUnitId)) {
            usersByOrgUnit.set(orgUnitId, []);
          }
          usersByOrgUnit.get(orgUnitId)!.push(formattedUser);
        }

        return formattedUser;
      });

      // Nhóm các đơn vị theo parentId vào Map
      const unitsByParent = new Map<string | null, any[]>();
      for (const unit of allOrgUnits) {
        const pId = normalizeUnitId(unit.parentId);
        if (!unitsByParent.has(pId)) {
          unitsByParent.set(pId, []);
        }
        unitsByParent.get(pId)!.push(unit);
      }

      const isDefaultUnit = (unit: any): boolean =>
        unit.code === 'DEFAULT_GROUP' || unit.name === 'DEFAULT_GROUP';

      const isRoomUnit = (unit: any): boolean =>
        String(unit.type ?? '').trim().toLowerCase() === 'phong';

      const isSelectedPhongDvUnit = (unit: any): boolean =>
        String(unit?.type ?? '').trim().toLowerCase() === 'phongdv' &&
        configuredUnitIds.has(unit.id);

      const isVisibleUnit = (unit: any): boolean =>
        configuredUnitIds.has(unit.id);

      const allOrgUnitsById = new Map(allOrgUnits.map(unit => [unit.id, unit]));
      const hasSelectedPhongDvAncestor = (unit: any): boolean => {
        const visited = new Set<string>();
        let ancestorId = normalizeUnitId(unit.parentId);

        while (ancestorId && !visited.has(ancestorId)) {
          visited.add(ancestorId);
          const ancestor = allOrgUnitsById.get(ancestorId);
          if (!ancestor) return false;
          if (isSelectedPhongDvUnit(ancestor)) return true;
          ancestorId = normalizeUnitId(ancestor.parentId);
        }

        return false;
      };

      const shouldPromoteRoomToRoot = (unit: any): boolean => {
        if (!isRoomUnit(unit) || !configuredUnitIds.has(unit.id)) return false;
        return !hasSelectedPhongDvAncestor(unit);
      };

      const shouldPromoteUnitToRoot = (unit: any): boolean =>
        shouldPromoteRoomToRoot(unit) ||
        (isSelectedPhongDvUnit(unit) && !hasSelectedPhongDvAncestor(unit));

      // Chỉ PhongDV cao nhất được tích mới đưa ra ngoài cùng.
      // Các PhongDV/Phong bên dưới giữ nguyên quan hệ cha-con.
      const getVisibleChildUnits = (parentUnitId: string): any[] => {
        const collect = (currentParentId: string, path: Set<string>): any[] => {
          const visibleChildren: any[] = [];

          for (const unit of unitsByParent.get(currentParentId) || []) {
            if (path.has(unit.id)) continue;

            if (shouldPromoteUnitToRoot(unit)) continue;

            if (!isDefaultUnit(unit) && isVisibleUnit(unit)) {
              visibleChildren.push(unit);
              continue;
            }

            path.add(unit.id);
            visibleChildren.push(...collect(unit.id, path));
            path.delete(unit.id);
          }

          return visibleChildren;
        };

        return collect(parentUnitId, new Set([parentUnitId]));
      };

      const allOrgUnitIds = new Set(allOrgUnits.map(unit => unit.id));
      const fullRoots = allOrgUnits.filter(unit => {
        const unitParentId = normalizeUnitId(unit.parentId);
        return !unitParentId || !allOrgUnitIds.has(unitParentId);
      });

      let rootUsers: any[] = [];
      if (fullRoots.length === 1) {
        rootUsers = usersByOrgUnit.get(fullRoots[0].id) || [];
      } else {
        for (const root of fullRoots) {
          if (!isVisibleUnit(root)) {
            rootUsers.push(...(usersByOrgUnit.get(root.id) || []));
          }
        }
      }

      const getLevel1BaseUnits = (): any[] => {
        const roots: any[] = [];

        if (fullRoots.length === 1) {
          if (!shouldPromoteUnitToRoot(fullRoots[0])) {
            roots.push(...getVisibleChildUnits(fullRoots[0].id));
          }
        } else {
          for (const root of fullRoots) {
            if (!isDefaultUnit(root) && isVisibleUnit(root) && !shouldPromoteUnitToRoot(root)) {
              roots.push(root);
            } else if (!shouldPromoteUnitToRoot(root)) {
              roots.push(...getVisibleChildUnits(root.id));
            }
          }
        }

        roots.push(...allOrgUnits.filter(unit => shouldPromoteUnitToRoot(unit)));

        return Array.from(
          new Map(roots.map(unit => [unit.id, unit])).values(),
        );
      };

      // Helper to compute hasChildren for a unit
      const computeHasChildren = (unitId: string): boolean => {
        if (getVisibleChildUnits(unitId).length > 0) return true;

        const unitUsers = usersByOrgUnit.get(unitId) || [];
        if (unitUsers.length > 0) return true;

        return false;
      };

      // Helper to build the full recursive tree (non-lazy)
      const buildFullTree = (parentId: string | null): any[] => {
        if (parentId === null) {
          const level1Units = getLevel1BaseUnits();
          const children: any[] = [];
          for (const unit of level1Units) {
            if (unit.code === 'DEFAULT_GROUP' || unit.name === 'DEFAULT_GROUP') continue;

            const unitUsers = usersByOrgUnit.get(unit.id) || [];
            const unitChildren = buildFullTree(unit.id);

            children.push({
              id: unit.id,
              name: unit.name,
              code: unit.code,
              title: unit.name,
              type: unit.type || null,
              parentId: null,
              types: 'organization_unit',
              users: unitUsers,
              children: unitChildren,
              isLoaded: true,
              hasChildren: unitChildren.length > 0 || unitUsers.length > 0,
            });
          }
          return [...children, ...rootUsers];
        }

        const children: any[] = [];
        const directChildren = getVisibleChildUnits(parentId);

        for (const unit of directChildren) {
          const unitUsers = usersByOrgUnit.get(unit.id) || [];
          const unitChildren = buildFullTree(unit.id);

          children.push({
            id: unit.id,
            name: unit.name,
            code: unit.code,
            title: unit.name,
            type: unit.type || null,
            parentId,
            types: 'organization_unit',
            users: unitUsers,
            children: unitChildren,
            isLoaded: true,
            hasChildren: unitChildren.length > 0 || unitUsers.length > 0,
          });
        }

        return children;
      };

      // Case 1: Search is active
      if (search && search.trim().length >= 3) {
        const cleanTerm = removeDiacritics(search.trim());
        
        const matchedUsers = formattedUsers.filter(u => 
          removeDiacritics(u.name || '').includes(cleanTerm) || 
          removeDiacritics(u.username || '').includes(cleanTerm) ||
          removeDiacritics(u.codeND || '').includes(cleanTerm)
        );
        const matchedUnits = allOrgUnits.filter(u =>
          isVisibleUnit(u) && (
            removeDiacritics(u.name || '').includes(cleanTerm) ||
            removeDiacritics(u.code || '').includes(cleanTerm)
          )
        );

        const neededUnitIds = new Set<string>();
        const matchedUserIds = new Set(matchedUsers.map(u => u.id));

        const addUnitAndParents = (unitId: string) => {
          let currentId: string | null = unitId;
          while (currentId) {
            neededUnitIds.add(currentId);
            const unitObj = allOrgUnits.find(u => u.id === currentId);
            if (unitObj && shouldPromoteUnitToRoot(unitObj)) break;
            currentId = unitObj ? normalizeUnitId(unitObj.parentId) : null;
          }
        };

        matchedUnits.forEach(u => addUnitAndParents(u.id));
        matchedUsers.forEach(u => {
          if (u.parentId) addUnitAndParents(u.parentId);
        });

        // Xác định danh sách phòng ban gốc hiển thị của luồng
        const level1BaseUnits = getLevel1BaseUnits();
        let rootUsers: any[] = [];
        if (fullRoots.length === 1) {
          rootUsers = (usersByOrgUnit.get(fullRoots[0].id) || [])
            .filter(user => matchedUserIds.has(user.id));
        } else {
          for (const root of fullRoots) {
            if (!isVisibleUnit(root)) {
              rootUsers.push(...(usersByOrgUnit.get(root.id) || [])
                .filter(user => matchedUserIds.has(user.id)));
            }
          }
        }

        const buildSearchTree = (parentId: string | null): any[] => {
          if (parentId === null) {
            const children: any[] = [];
            for (const unit of level1BaseUnits) {
              if (unit.code === 'DEFAULT_GROUP' || unit.name === 'DEFAULT_GROUP') continue;
              if (!neededUnitIds.has(unit.id)) continue;

              const unitUsers = (usersByOrgUnit.get(unit.id) || [])
                .filter(user => matchedUserIds.has(user.id));
              
              const unitChildren = buildSearchTree(unit.id);

              children.push({
                id: unit.id,
                name: unit.name,
                code: unit.code,
                title: unit.name,
                type: unit.type || null,
                parentId: null,
                types: 'organization_unit',
                users: unitUsers,
                children: unitChildren,
                isLoaded: true,
                hasChildren: unitChildren.length > 0 || unitUsers.length > 0,
              });
            }
            return [...children, ...rootUsers];
          }

          const children: any[] = [];
          const directChildren = getVisibleChildUnits(parentId);

          for (const unit of directChildren) {
            if (!neededUnitIds.has(unit.id)) continue;

            const unitUsers = (usersByOrgUnit.get(unit.id) || [])
              .filter(user => matchedUserIds.has(user.id));
            
            const unitChildren = buildSearchTree(unit.id);

            children.push({
              id: unit.id,
              name: unit.name,
              code: unit.code,
              title: unit.name,
              type: unit.type || null,
              parentId,
              types: 'organization_unit',
              users: unitUsers,
              children: unitChildren,
              isLoaded: true,
              hasChildren: unitChildren.length > 0 || unitUsers.length > 0,
            });
          }

          return children;
        };

        return {
          success: true,
          message: 'Tìm kiếm đơn vị/phòng ban theo luồng thành công',
          data: buildSearchTree(null),
        };
      }

      // Case 2: parentId is provided (Full subtree loading)
      const normalizedParentId = normalizeUnitId(parentId);
      if (normalizedParentId) {
        const subTree = buildFullTree(normalizedParentId);
        const directUsers = usersByOrgUnit.get(normalizedParentId) || [];
        const parentUnit = allOrgUnits.find(unit => unit.id === normalizedParentId);
        if (
          parentUnit &&
          configuredUnitIds.has(parentUnit.id) &&
          (isRoomUnit(parentUnit) || isSelectedPhongDvUnit(parentUnit))
        ) {
          const responseParentId = shouldPromoteUnitToRoot(parentUnit)
            ? null
            : normalizeUnitId(parentUnit.parentId);

          return {
            success: true,
            message: 'Lấy danh sách đơn vị/phòng ban con thành công',
            data: [
              {
                id: parentUnit.id,
                name: parentUnit.name,
                code: parentUnit.code,
                title: parentUnit.name,
                type: parentUnit.type,
                parentId: responseParentId,
                types: 'organization_unit',
                children: subTree,
                users: directUsers,
                isLoaded: true,
                hasChildren: subTree.length > 0 || directUsers.length > 0,
              },
            ],
          };
        }

        return {
          success: true,
          message: 'Lấy danh sách đơn vị/phòng ban con thành công',
          data: [...subTree, ...directUsers],
        };
      }

      // Case 3: Initial load (Return full recursive tree)
      return {
        success: true,
        message: 'Lấy danh sách đơn vị/phòng ban theo luồng thành công',
        data: buildFullTree(null),
      };

    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: 'Lấy danh sách đơn vị/phòng ban theo luồng thất bại',
        errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
      });
    }
  }
}

