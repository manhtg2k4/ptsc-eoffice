// src/feature-management/feature-management.service.ts
import { BadRequestException, Injectable, ForbiddenException } from '@nestjs/common';
import { validateAndParseSortParam } from 'src/utils/sort-validator.util';
// import { InjectModel } from '@nestjs/mongoose';
import {
  FeatureManagementEntity,
  FeatureType,
  StatusFeature
} from './feature-management.entity';
import {
  areFiltersValid,
} from '../utils/util';
import { STATUS, POSITION_LEVEL } from 'src/variables/CONST_STATUS';
import {
  CreateFeatureManagementDto,
  updateFeatureManagementDto,
} from './feature-management.validation';
import { TableConfigService } from 'src/table-config/table-config.service';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, Brackets } from 'typeorm';
import { RolesProcessEntity } from 'src/role-feature/role-feature-sql/roles-process.entity';
import { TableConfigEntity } from 'src/table-config/table-config.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { AuthorityDocumentEntity } from 'src/authority-process/authority-process.entity';
import { isSuperAdminByKeycloakId } from 'src/utils/super-admin.util';
import { checkAdminPermission } from 'src/common/guards/admin-check.helper';
@Injectable()
export class FeatureManagementService {
  constructor(
    // @InjectModel(FeatureManagement.name)
    // private readonly featureManagementModel: Model<FeatureManagementDocument>,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
    private readonly tableConfigService: TableConfigService,
    @InjectRepository(TableConfigEntity, 'mssqlConnection') // Thêm repo để xóa
    private readonly tableConfigRepository: Repository<TableConfigEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RoleFeatureEntity, 'mssqlConnection')
    private readonly roleFeatureRepository: Repository<RoleFeatureEntity>,
    @InjectRepository(AuthorityDocumentEntity, 'mssqlConnection')
    private readonly authorityDocumentRepo: Repository<AuthorityDocumentEntity>,
    @InjectRepository(RolesProcessEntity, 'mssqlConnection')
    private readonly rolesProcessRepo: Repository<RolesProcessEntity>,
  ) { }


  //   async syncFeatureManagementFromMongo() {
  //   const mongoDocs = await this.featureManagementModel.find({});

  //   console.log('mongoDocs length:', mongoDocs.length);

  //   if (!mongoDocs || mongoDocs.length === 0) {
  //     return { total: 0, synced: 0, errors: [] };
  //   }

  //   const total = mongoDocs.length;
  //   const errors: any[] = [];
  //   let syncedCount = 0;

  //   // Lấy danh sách ID
  //   const mongoIds = mongoDocs.map((d) => d.id);

  //   // Lấy record SQL đã tồn tại
  //   const existingSqlRecords = await this.featureManagementRepo.find({
  //     where: { id: In(mongoIds) },
  //   });

  //   const sqlMap = new Map(existingSqlRecords.map((r) => [r.id, r]));

  //   // Đồng bộ từng record
  //   for (const doc of mongoDocs) {
  //     const raw = doc as any; // fix kiểu Mongoose không có trong TS

  //     try {
  //       const exists = sqlMap.get(raw.id);

  //       const entityData: Partial<FeatureManagementEntity> = {
  //         id: raw.id,
  //         code: raw.code,
  //         formCode: raw.formCode ?? undefined,

  //         isFollowAssignee: raw.isFollowAssignee ?? 0,
  //         isAuthorized: raw.isAuthorized ?? 0,
  //         isCount: raw.isCount ?? 0,

  //         authorizedFunction: raw.authorizedFunction ?? undefined,
  //         name: raw.name ?? undefined,
  //         criteria: raw.criteria ?? undefined,

  //         url: raw.url ?? undefined,
  //         apiUrl: raw.apiUrl ?? undefined,

  //         processID: raw.processID ?? undefined,

  //         // ⭐ Sửa ENUM
  //         statusFeature: (raw.statusFeature as StatusFeature) ?? StatusFeature.ACTIVE,

  //         description: raw.description ?? undefined,
  //         fields: raw.fields ?? undefined,
  //         valueField: raw.valueField ?? undefined,

  //         createdBy: raw.createdBy ?? undefined,
  //         updatedBy: raw.updatedBy ?? undefined,

  //         // ⭐ Sửa ENUM
  //         featureType: (raw.featureType as FeatureType) ?? FeatureType.LIST,

  //         status: raw.status ?? 1,

  //         createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
  //         updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),

  //         mpath: raw.mpath ?? undefined,

  //         // ⭐ Nếu Mongo có parentId thì map luôn
  //         parentId: raw.parentId ?? undefined,
  //       };

  //       if (exists) {
  //         this.featureManagementRepo.merge(exists, entityData);
  //         await this.featureManagementRepo.save(exists);
  //       } else {
  //         const newEntity = this.featureManagementRepo.create(entityData);
  //         await this.featureManagementRepo.save(newEntity);
  //       }

  //       syncedCount++;
  //     } catch (err) {
  //       errors.push({
  //         id: raw.id,
  //         error: err.message,
  //       });
  //     }
  //   }

  //   return { total, synced: syncedCount, errors };
  // }

  // Lấy processId
  async getProcessIdByCode(code: string): Promise<string | null> {
    const f = await this.featureManagementRepo.findOne({
      select: ['processID'],
      where: {
        code,
        status: 1,
        statusFeature: StatusFeature.ACTIVE,
      },
    });

    return f?.processID ?? null;
  }

  // Lấy viewConfigCode
  async getViewConfigCodeByProcessFn(code: string): Promise<string | null> {
    const f = await this.featureManagementRepo.findOne({
      select: ['valueField'],
      where: {
        code,
        status: 1,
        statusFeature: StatusFeature.ACTIVE,
      },
    });

    let valueField;
    if (f?.valueField) {
      valueField = f.valueField;
    } else {
      return null;
    }

    return valueField.code ?? null;
  }

  async findAll(queryParams: any, userId?: string) {
    const normalizedQueryParams: Record<string, any> = {};
    if (queryParams && typeof queryParams === 'object') {
      for (const [k, v] of Object.entries(queryParams)) {
        normalizedQueryParams[k.trim()] = v;
      }
    }

    const {
      page = 1,
      limit = 25,
      sort = '-createdAt',
      includePermissionActions,
      userId: queryUserIdParam,
      groupId: queryGroupIdParam,
      ...filters
    } = normalizedQueryParams;

    const isIncludePermission =
      includePermissionActions === 'true' ||
      includePermissionActions === true ||
      includePermissionActions === '1';

    const targetUserId = typeof queryUserIdParam === 'string' ? queryUserIdParam.trim() : queryUserIdParam;
    const targetGroupId = typeof queryGroupIdParam === 'string' ? queryGroupIdParam.trim() : queryGroupIdParam;

    const orConditions: any[] = [];
    const searchTerm = filters.code;

    // ====== 1) Chuẩn hóa multi-value string: "a,b,c" ======
    for (const key of Object.keys(filters)) {
      if (typeof filters[key] === 'string' && filters[key].includes(',')) {
        filters[key] = filters[key].split(',').map((x) => x.trim());
      }
    }

    // ====== 2) Tìm theo code + name ======
    if (searchTerm && filters.name && searchTerm === filters.name) {
      orConditions.push({ code: searchTerm });
      orConditions.push({ name: searchTerm });
      delete filters.code;
      delete filters.name;
    }

    const query = this.featureManagementRepo.createQueryBuilder('feature');

    const keyMap: Record<string, string> = {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      processId: 'processID',
      processID: 'processID',
      featureType: 'featureType',
      parentID: 'parentId',
    };

    // ====== 3) Xử lý đặc biệt cho featureType = 'list' ======
    if (filters.featureType === 'list') {
      orConditions.push({ featureType: 'list' });
      orConditions.push({ featureType: 'fullList' });
      orConditions.push({ featureType: 'completeList' });
      delete filters.featureType;
    }

    // ====== 4) Nếu featureType là array => IN ======
    if (Array.isArray(filters.featureType)) {
      query.andWhere(`feature.featureType IN (:...fts)`, {
        fts: filters.featureType,
      });
      delete filters.featureType;
    }

    // ====== 5) Filters bình thường ======
    for (const rawKey of Object.keys(filters)) {
      const cleanKey = rawKey.trim().replace(/[^a-zA-Z0-9_.]/g, '');
      if (!cleanKey) continue;
      const dbKey = keyMap[cleanKey] || cleanKey;
      query.andWhere(`feature.${dbKey} = :${cleanKey}`, { [cleanKey]: filters[rawKey] });
    }

    // ====== 6) OR conditions ======
    if (orConditions.length > 0) {
      const orQuery = orConditions
        .map((cond, i) => {
          const key = Object.keys(cond)[0];
          const dbKey = keyMap[key] || key;
          return `feature.${dbKey} LIKE :or${i}`;
        })
        .join(' OR ');

      const orParams = orConditions.reduce((acc, cond, idx) => {
        const key = Object.keys(cond)[0];
        acc[`or${idx}`] = `%${cond[key]}%`;
        return acc;
      }, {} as Record<string, any>);

      query.andWhere(`(${orQuery})`, orParams);
    }

    // ====== 7) Chỉ lấy active ======
    query.andWhere('feature.status = :status', { status: STATUS.ACTIVED });

    // ====== 7.5) Phân quyền ======
    if (userId) {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        select: ['id', 'role', 'position', 'rolesByProcess'],
      });

      let isAdmin = await checkAdminPermission(userId).catch(() => false);
      isAdmin = isAdmin || isSuperAdminByKeycloakId(userId);
      if (user) {
        if (user.position && POSITION_LEVEL[user.position] === POSITION_LEVEL.Admin) {
          isAdmin = true;
        }
        if (user.role) {
          const roleLower = user.role.toLowerCase();
          isAdmin = isAdmin || roleLower.includes('admin') || roleLower.includes('quản trị') || roleLower.includes('administrator') || roleLower.includes('super admin');
        }
      }

      if (user && !isAdmin) {
        const rolesByProcess = Array.isArray(user.rolesByProcess) ? user.rolesByProcess : [];
        const permSet = new Set<string>();

        if (rolesByProcess.length > 0) {
          const processKeys = [...new Set(rolesByProcess.map((p) => p.processKey).filter(Boolean))];

          const roleFeatures: any[] = [];
          const chunkSize = 2000;
          for (let i = 0; i < processKeys.length; i += chunkSize) {
            const chunk = processKeys.slice(i, i + chunkSize);
            const chunkFeatures = await this.roleFeatureRepository.find({
              where: { processKey: In(chunk) },
              select: ['processKey', 'roles'],
            });
            roleFeatures.push(...chunkFeatures);
          }

          for (const proc of rolesByProcess) {
            const rf = roleFeatures.find((r: any) => r.processKey === proc.processKey);
            if (!rf) continue;

            for (const roleObject of proc.roles || []) {
              const roleCode = roleObject.roleCode;
              const role = (rf as any).roles?.find((r: any) => r.roleCode === roleCode);
              if (!role) continue;

              for (const perm of role.permissions || []) {
                permSet.add(perm);
              }
            }
          }
        }

        const userRoles = Array.from(permSet);
        if (userRoles.length > 0) {
          const chunkSize = 2000;
          const chunks: string[][] = [];
          for (let i = 0; i < userRoles.length; i += chunkSize) {
            chunks.push(userRoles.slice(i, i + chunkSize));
          }

          const inConditions: string[] = [];
          const parameters: Record<string, any> = {};

          chunks.forEach((chunk, index) => {
            const paramKey = `userRoles${index}`;
            inConditions.push(`feature.code IN (:...${paramKey})`);
            parameters[paramKey] = chunk;
          });

          query.andWhere(`(${inConditions.join(' OR ')})`, parameters);
        } else {
          // If no roles match, ensure no results are returned
          query.andWhere('1 = 0');
        }
      }
    }

    // ====== 8) Sort (dung shared utility) ======
    const sortResult1 = validateAndParseSortParam(sort);
    if (Object.keys(sortResult1).length > 0) {
      (Object.entries(sortResult1) as [string, 'ASC' | 'DESC'][]).forEach(([key, order]) => {
        const dbKey = keyMap[key] || key;
        query.addOrderBy(`feature.${dbKey}`, order);
      });
    } else {
      query.orderBy('feature.createdAt', 'DESC');
    }

    // ====== 9) Pagination ======
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 10, 1);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await query.skip(skip).take(limitNum).getManyAndCount();
    const totalPages = Math.ceil(total / limitNum);

    // Fetch and map roles/users
    const rawSearchKeys = data.flatMap(item => [item.processID, item.id]).filter((id): id is string => !!id && typeof id === 'string');
    const searchProcessKeys = [...new Set(rawSearchKeys.map(k => k.trim()))];
    let mappedData: any[] = [];

    if (isIncludePermission) {
      // ======= XỬ LÝ LẤY ROLE TỪ roles_process (KHI includePermissionActions = true) =======
      let matchedRolesProcess: RolesProcessEntity[] = [];
      let roleFeatures: RoleFeatureEntity[] = [];

      if (searchProcessKeys.length > 0) {
        const [rolesProcessResult, roleFeaturesResult] = await Promise.all([
          (() => {
            const qb = this.rolesProcessRepo.createQueryBuilder('rp')
              .where('rp.isActive = :isActive', { isActive: true });

            const loweredKeys = searchProcessKeys.map(k => k.toLowerCase());
            qb.andWhere(
              new Brackets((b) => {
                b.where('LOWER(RTRIM(LTRIM(rp.processKey))) IN (:...loweredKeys)', { loweredKeys })
                 .orWhere('LOWER(RTRIM(LTRIM(rp.id))) IN (:...loweredKeys)', { loweredKeys });
              }),
            );

            const permissionConditions: string[] = [];
            const params: Record<string, any> = { loweredKeys, isActive: true };

            if (targetGroupId) {
              permissionConditions.push(`EXISTS (
                SELECT 1 FROM roles_process_groups rpg
                WHERE rpg.role_id = rp.id AND LOWER(RTRIM(LTRIM(rpg.group_id))) = :targetGroupId
              )`);
              params.targetGroupId = targetGroupId.trim().toLowerCase();
            }

            if (targetUserId) {
              permissionConditions.push(`EXISTS (
                SELECT 1 FROM roles_process_users rpu
                WHERE rpu.role_id = rp.id AND LOWER(RTRIM(LTRIM(rpu.user_id))) = :targetUserId
              )`);
              permissionConditions.push(`EXISTS (
                SELECT 1 FROM roles_process_groups rpg2
                INNER JOIN user_group_users ugu ON ugu.group_user_id = rpg2.group_id
                WHERE rpg2.role_id = rp.id AND LOWER(RTRIM(LTRIM(ugu.user_id))) = :targetUserId
              )`);
              params.targetUserId = targetUserId.trim().toLowerCase();
            }

            if (permissionConditions.length > 0) {
              qb.andWhere(`(${permissionConditions.join(' OR ')})`, params);
            }

            return qb.getMany();
          })(),
          this.roleFeatureRepository.find({
            where: [
              { processKey: In(searchProcessKeys) },
              { id: In(searchProcessKeys) },
            ],
          }),
        ]);

        matchedRolesProcess = rolesProcessResult;
        roleFeatures = roleFeaturesResult;
      }

      mappedData = data.map((item: any) => {
        const itemProcessID = item.processID ? String(item.processID).trim().toLowerCase() : '';
        const itemId = item.id ? String(item.id).trim().toLowerCase() : '';

        const rf = roleFeatures.find(r => {
          const rKey = r.processKey ? String(r.processKey).trim().toLowerCase() : '';
          const rId = r.id ? String(r.id).trim().toLowerCase() : '';
          return (itemProcessID && (rKey === itemProcessID || rId === itemProcessID)) ||
                 (itemId && (rKey === itemId || rId === itemId));
        });

        const matchingRpList = matchedRolesProcess.filter(rp => {
          const rpKey = rp.processKey ? String(rp.processKey).trim().toLowerCase() : '';
          const rpId = rp.id ? String(rp.id).trim().toLowerCase() : '';
          return (itemProcessID && (rpKey === itemProcessID || rpId === itemProcessID)) ||
                 (itemId && (rpKey === itemId || rpId === itemId));
        });

        const mappedRoles = matchingRpList.map(rp => {
          const rfRole = (rf?.roles || []).find((r: any) => {
            const rCode = r.roleCode ? String(r.roleCode).trim().toLowerCase() : '';
            const rName = r.name ? String(r.name).trim().toLowerCase() : '';
            const rId = r.id ? String(r.id).trim().toLowerCase() : '';
            const rpCode = rp.roleCode ? String(rp.roleCode).trim().toLowerCase() : '';
            const rpName = rp.roleName ? String(rp.roleName).trim().toLowerCase() : '';
            const rpId = rp.id ? String(rp.id).trim().toLowerCase() : '';
            return (rpCode && rCode === rpCode) || (rpName && rName === rpName) || (rpId && rId === rpId);
          });

          const permissions = Array.isArray(rfRole?.permissions) ? rfRole.permissions : [];

          return {
            id: rp.id,
            _id: rp.id,
            name: rp.roleName,
            roleCode: rp.roleCode,
            description: rp.description,
            processKey: rp.processKey,
            isActive: rp.isActive,
            permissions,
          };
        });

        return {
          ...item,
          roles: mappedRoles,
        };
      });
    } else {
      // ======= GIỮ NGUYÊN 100% LOGIC CŨ KHI includePermissionActions LÀ FALSE/OMITTED =======
      const processIDs = [...new Set(data.map(item => item.processID).filter((id): id is string => !!id))];
      let roleFeatures: RoleFeatureEntity[] = [];
      if (processIDs.length > 0) {
        roleFeatures = await this.roleFeatureRepository.find({
          where: { processKey: In(processIDs) }
        });
      }

      const allUserIds = new Set<string>();
      roleFeatures.forEach(rf => {
        if (Array.isArray(rf.roles)) {
          rf.roles.forEach((role: any) => {
            if (Array.isArray(role.users)) {
              role.users.forEach((u: any) => {
                if (!u) return;
                const uId = typeof u === 'string' ? u : (u.id || u._id || u.userId);
                if (uId && typeof uId === 'string') {
                  allUserIds.add(uId);
                }
              });
            }
          });
        }
      });

      const usersMap = new Map<string, { id: string; name: string }>();
      if (allUserIds.size > 0) {
        const userIdArray = Array.from(allUserIds);
        for (let i = 0; i < userIdArray.length; i += 1000) {
          const chunk = userIdArray.slice(i, i + 1000);
          const chunkUsers = await this.usersRepository.find({
            where: { id: In(chunk) },
            select: ['id', 'name']
          });
          chunkUsers.forEach(u => {
            usersMap.set(u.id, { id: u.id, name: u.name || 'Unknown' });
          });
        }
      }

      mappedData = data.map((item: any) => {
        const rf = roleFeatures.find(r => r.processKey === item.processID);
        const mappedRoles = rf && Array.isArray(rf.roles)
          ? rf.roles.map((role: any) => ({
              ...role,
              _id: role.id,
              users: Array.isArray(role.users)
                ? role.users
                    .map((u: any) => {
                      const uId = typeof u === 'string' ? u : (u?.id || u?._id || u?.userId);
                      if (!uId) return u;
                      return usersMap.get(uId);
                    })
                    .filter((u: any) => u)
                : []
            }))
          : [];
        return {
          ...item,
          roles: mappedRoles
        };
      });
    }

    return {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      data: mappedData,
      filter: filters,
    };
  }



  async findAllNotFilter() {
    const query = this.featureManagementRepo.createQueryBuilder('feature')
      .where('feature.featureType IN (:...types)', { types: ['list', 'fullList', 'completeList'] });

    const [data, totalRecords] = await query.getManyAndCount();

    return {
      total: totalRecords,
      data,
    };
  }

  // findOnlyPopupAndForm
  async findOnlyPopupAndForm(queryParams: QueryParams) {
    const { page = 1, limit = 25, sort = '-createdAt', ...filters } = queryParams as any;

    if (!areFiltersValid(filters)) {
      return { success: false, message: `tìm kiếm không được chứa ký tự đặc biệt` };
    }

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 10, 1);
    const skip = (pageNum - 1) * limitNum;

    const query = this.featureManagementRepo.createQueryBuilder('feature');

    // Map camelCase -> DB column
    const keyMap: Record<string, string> = {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      processId: 'processID',
      processID: 'processID',
      featureType: 'featureType',
      parentID: 'parentId',
    };

    // AND filters
    Object.keys(filters).forEach((key) => {
      const dbKey = keyMap[key] || key;
      query.andWhere(`feature.${dbKey} = :${key}`, { [key]: filters[key] });
    });

    // OR condition: featureType = 'form' OR 'popup'
    query.andWhere('feature.featureType IN (:...types)', { types: ['form', 'popup'] });

    // Always active
    query.andWhere('feature.status = :status', { status: STATUS.ACTIVED });

    // Sorting (dung shared utility)
    const sortResult2 = validateAndParseSortParam(sort);
    if (Object.keys(sortResult2).length > 0) {
      (Object.entries(sortResult2) as [string, 'ASC' | 'DESC'][]).forEach(([key, order]) => {
        const dbKey = keyMap[key] || key;
        query.addOrderBy(`feature.${dbKey}`, order);
      });
    } else {
      query.orderBy('feature.createdAt', 'DESC');
    }

    const [data, totalRecords] = await query.skip(skip).take(limitNum).getManyAndCount();
    const totalPages = Math.ceil(totalRecords / limitNum);

    return { total: totalRecords, page: pageNum, limit: limitNum, totalPages, data, filter: filters };
  }

  // findAllDynamicForm
  async findAllDynamicForm(queryParams: QueryParams) {
    const { page = 1, limit = 25, sort = '-createdAt', ...filters } = queryParams as any;

    if (!areFiltersValid(filters)) {
      return { success: false, message: `tìm kiếm không được chứa ký tự đặc biệt` };
    }

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 10, 1);
    const skip = (pageNum - 1) * limitNum;

    const keyMap: Record<string, string> = {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      processId: 'processID',
      processID: 'processID',
      featureType: 'featureType',
      parentID: 'parentId',
    };

    let query = this.featureManagementRepo.createQueryBuilder('feature');

    Object.keys(filters).forEach((key) => {
      const dbKey = keyMap[key] || key;
      query = query.andWhere(`feature.${dbKey} = :${key}`, { [key]: filters[key] });
    });

    // FeatureType in form + popup
    query = query.andWhere('feature.featureType IN (:...types)', { types: ['form', 'popup'] });
    query = query.andWhere('feature.status = :status', { status: STATUS.ACTIVED });

    // Secure sorting (dung shared utility)
    const sortResult3 = validateAndParseSortParam(sort);
    if (Object.keys(sortResult3).length > 0) {
      (Object.entries(sortResult3) as [string, 'ASC' | 'DESC'][]).forEach(([key, order]) => {
        const dbKey = keyMap[key] || key;
        query.addOrderBy(`feature.${dbKey}`, order);
      });
    } else {
      query.orderBy('feature.createdAt', 'DESC');
    }

    const [dataRaw, totalRecords] = await query.skip(skip).take(limitNum).getManyAndCount();

    const data = dataRaw.map((item) => ({
      id: item.id,
      name: item.name ?? '',
      fields: (item.fields || []).map((f: any) => ({
        id: f.props?.field,
        label: f.props?.label,
        type: 'string',
        defaultValue: 'left',
        _id: f._id || null,
      })),
      status: item.status || null,
      createdAt: item.createdAt || null,
      updatedAt: item.updatedAt || null,
    }));

    return { total: totalRecords, page: pageNum, limit: limitNum, totalPages: Math.ceil(totalRecords / limitNum), data, filter: filters };
  }


  async listParent() {
    return this.featureManagementRepo.find({ where: { status: STATUS.ACTIVED } });
  }

  async findById(id: string) {
    if (!id) return null;

    const data = await this.featureManagementRepo.createQueryBuilder('feature')
      .addSelect('feature.valueField')
      .addSelect('feature.fields')
      .where('feature.id = :id AND feature.status = :status', {
        id,
        status: STATUS.ACTIVED,
      })
      .getOne();

    return data || null;
  }

  async findByCode(code: string, userId?: string, existingEntity?: FeatureManagementEntity, checkSubtab?: boolean) {
    if (!code) return null;

    const data = existingEntity || await this.featureManagementRepo.createQueryBuilder('feature')
      .addSelect('feature.valueField')
      .addSelect('feature.fields')
      .where('feature.code = :code', { code })
      .getOne();

    if (!data) return null;

    if (userId) {
      const tableConfig = await this.tableConfigService.findOne(userId, code);

      if (tableConfig?.columns && Array.isArray(tableConfig.columns)) {
        if (data.valueField) data.valueField.field = tableConfig.columns;
        else data.valueField = { field: tableConfig.columns };
      }
      // Phân quyền
      if (!checkSubtab) {
        const user = await this.usersRepository.findOne({
          where: { id: userId },
          select: ['id', 'role', 'position', 'rolesByProcess'],
        });

        if (!user) throw new BadRequestException('User không tồn tại');

        let isAdmin = await checkAdminPermission(userId).catch(() => false);
        isAdmin = isAdmin || isSuperAdminByKeycloakId(userId);
        if (user) {
          if (user.position && POSITION_LEVEL[user.position] === POSITION_LEVEL.Admin) {
            isAdmin = true;
          }
          if (user.role) {
            const roleLower = user.role.toLowerCase();
            isAdmin = isAdmin || roleLower.includes('admin') || roleLower.includes('quản trị') || roleLower.includes('administrator') || roleLower.includes('superadmin');
          }
        }

        if (!isAdmin) {
          const permSet = new Set<string>();

          // Lấy roles từ roles_process (gán trực tiếp + qua nhóm)
          const safeUserId = userId;

          // 1. Role gán trực tiếp
          const directRoles: any[] = await this.rolesProcessRepo.manager.query(`
            SELECT rp.process_key AS processKey, rp.role_code AS roleCode
            FROM roles_process_users rpu
            INNER JOIN roles_process rp ON rp.id = rpu.role_id AND rp.is_active = 1
            WHERE rpu.user_id = '${safeUserId}'
          `);

          // 2. Role gán qua nhóm
          const groupRoles: any[] = await this.rolesProcessRepo.manager.query(`
            SELECT DISTINCT rp.process_key AS processKey, rp.role_code AS roleCode
            FROM roles_process_groups rpg
            INNER JOIN roles_process rp ON rp.id = rpg.role_id AND rp.is_active = 1
            INNER JOIN user_group_users ugu ON ugu.group_user_id = rpg.group_id
            WHERE ugu.user_id = '${safeUserId}'
          `);

          const allUserRoles = [...directRoles, ...groupRoles];


          if (allUserRoles.length > 0) {
            const processKeys = [...new Set(allUserRoles.map((r: any) => r.processKey).filter(Boolean))];

            let roleFeatures: any[] = [];
            if (processKeys.length > 0) {
              roleFeatures = await this.roleFeatureRepository.createQueryBuilder('rf')
                .select(['rf.processKey', 'rf.roles'])
                .where('rf.processKey IN (SELECT value FROM OPENJSON(:processKeys))')
                .setParameter('processKeys', JSON.stringify(processKeys))
                .getMany();
            }

            const roleFeatureMap = new Map(roleFeatures.map((rf: any) => [rf.processKey, rf]));

            for (const r of allUserRoles) {
              const rf = roleFeatureMap.get(r.processKey);
              if (!rf) {
                // console.log(`[FEATURE DEBUG] No roleFeature for processKey=${r.processKey}`);
                continue;
              }
              const role = rf.roles?.find((ro: any) => ro.roleCode === r.roleCode);
              if (!role) {
                // console.log(`[FEATURE DEBUG] No role match for roleCode=${r.roleCode} in processKey=${r.processKey}`);
                continue;
              }
              for (const perm of role.permissions || []) {
                permSet.add(perm);
              }
            }
          }

          const userRoles = Array.from(permSet);


          // Kiểm tra quyền truy cập mã tính năng này
          if (!userRoles.includes(code)) {
            let isAuthorizedByAuthor = false;
            // Nếu là ủy quyền thì cột này phải bằng isAuthorized truy thì mới kiểm tra ủy quyền
            if (data.isAuthorized) {
              isAuthorizedByAuthor = await this.checkUserAuthorizationForFeature(userId, code, userRoles, data.authorizedFunction);
            }

            if (!isAuthorizedByAuthor) {
              throw new ForbiddenException('Bạn không có quyền truy cập chức năng này');
            }
          }

          if (
            Array.isArray(data.fields) && !data.authorizedFunction
          ) {
            for (const field of data.fields) {
              if (
                field?.props?.children &&
                Array.isArray(field.props.children)
              ) {
                for (const child of field.props.children) {
                  if (child?.type === 'subtab') {
                    const subtabs = child?.props?.subtabs;

                    if (Array.isArray(subtabs)) {
                      child.props.subtabs = subtabs.filter((st: any) => {
                        if (!st?.func) return false;
                        return userRoles.includes(st.func);
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return data;
  }

  /**
   * Merge fields từ cha và con, đặc biệt là gộp subtabs
   */
  private mergeFields(childFields: any[], parentFields: any[]) {
    // Duyệt qua các fields của cha
    for (const pField of parentFields) {
      if (!pField.props?.children) continue;

      for (const pChild of pField.props.children) {
        if (pChild.type === 'subtab' && Array.isArray(pChild.props?.subtabs)) {
          let merged = false;
          // Tìm subtab tương ứng trong childFields để gộp
          for (const cField of childFields) {
            if (!cField.props?.children) continue;

            for (const cChild of cField.props.children) {
              if (cChild.type === 'subtab' && Array.isArray(cChild.props?.subtabs)) {
                // Gộp subtabs và loại bỏ trùng lặp theo func
                const combinedSubtabs = [...cChild.props.subtabs, ...pChild.props.subtabs];
                const uniqueSubtabs: any[] = [];
                const seenFunc = new Set();

                for (const st of combinedSubtabs) {
                  if (st?.func && !seenFunc.has(st.func)) {
                    seenFunc.add(st.func);
                    uniqueSubtabs.push(st);
                  }
                }
                cChild.props.subtabs = uniqueSubtabs;
                merged = true;
                break;
              }
            }
            if (merged) break;
          }
        }
      }
    }
  }

  async create(data: CreateFeatureManagementDto) {
    // Ép statusFeature về enum nhưng dùng any để tránh lỗi type
    const entityData: any = {
      ...data,
      statusFeature:
        data.statusFeature === StatusFeature.INACTIVE
          ? StatusFeature.INACTIVE
          : StatusFeature.ACTIVE,
      featureType: data.featureType || FeatureType.LIST,
      // Parse JSON nếu cần
      criteria: typeof data.criteria === 'string' ? JSON.parse(data.criteria) : data.criteria,
      fields: typeof data.fields === 'string' ? JSON.parse(data.fields) : data.fields,
      valueField: typeof data.valueField === 'string' ? JSON.parse(data.valueField) : data.valueField,
      countList: typeof (data as any).countList === 'string' ? JSON.parse((data as any).countList.trim().replace(/^'|'$/g, '')) : (data as any).countList,
    };

    const entity = this.featureManagementRepo.create(entityData);
    return this.featureManagementRepo.save(entity);
  }

  async updateById(id: string, updateData: updateFeatureManagementDto) {
    if (!id) return null;

    const existing = await this.featureManagementRepo.createQueryBuilder('feature')
      .addSelect('feature.valueField')
      .addSelect('feature.fields')
      .where('feature.id = :id AND feature.status = :status', {
        id,
        status: STATUS.ACTIVED,
      })
      .getOne();

    if (!existing) return null;

    Object.assign(existing, updateData);
    const updated = await this.featureManagementRepo.save(existing);

    if (updateData.code) {
      await this.tableConfigRepository.delete({ module: updateData.code });
    }

    return updated;
  }

  async deleteById(id: string) {
    if (!id) return null; // SQL Server dùng UUID string, không cần isValidMongoId

    // Tìm parent
    const parent = await this.featureManagementRepo.findOne({ where: { id } });
    if (!parent) return null;

    // Xóa hoặc đánh dấu deleted các child
    const children = await this.featureManagementRepo.find({ where: { parent: { id: parent.id } } });
    for (const child of children) {
      child.status = STATUS.DELETED;
      await this.featureManagementRepo.save(child);
    }

    // Đánh dấu parent deleted
    parent.status = STATUS.DELETED;
    await this.featureManagementRepo.save(parent);

    return parent;
  }

  async deleteManyByIds(ids: string[]) {
    const validIds = ids.filter(Boolean); // chỉ giữ UUID hợp lệ
    if (validIds.length === 0) return false;

    await Promise.all(
      validIds.map(async (id) => {
        const parent = await this.featureManagementRepo.findOne({ where: { id } });
        if (!parent) return;

        const children = await this.featureManagementRepo.find({ where: { parent: { id: parent.id } } });
        for (const child of children) {
          child.status = STATUS.DELETED;
          await this.featureManagementRepo.save(child);
        }

        parent.status = STATUS.DELETED;
        await this.featureManagementRepo.save(parent);
      }),
    );

    return true;
  }

  // async syncFromMongo(): Promise<{
  //   total: number;
  //   synced: number;
  //   errors: any[];
  // }> {
  //   const mongoFeatures: FeatureManagementDocument[] = await this.featureManagementModel
  //     .find({ status: { $ne: STATUS.DELETED } })
  //     .exec();

  //   if (!mongoFeatures || mongoFeatures.length === 0) {
  //     return { total: 0, synced: 0, errors: [] };
  //   }

  //   const total = mongoFeatures.length;
  //   const errors: any[] = [];
  //   let syncedCount = 0;

  //   const mongoCodes = mongoFeatures.map((f) => f.code);
  //   const existingSqlFeatures = await this.featureManagementRepo.find({
  //     where: { code: TypeOrmIn(mongoCodes) },
  //   });
  //   const sqlFeatureMap = new Map(
  //     existingSqlFeatures.map((f) => [f.code, f]),
  //   );

  //   const mongoIdToCodeMap = new Map(mongoFeatures.map((f) => [(f._id as any).toString(), f.code]));

  //   for (const mongoFeature of mongoFeatures) {
  //     try {
  //       const existingEntity = sqlFeatureMap.get(mongoFeature.code);

  //       const entityData: Partial<FeatureManagementEntity> = {
  //         code: mongoFeature.code,
  //         name: mongoFeature.name,
  //         formCode: mongoFeature.formCode,
  //         isFollowAssignee: mongoFeature.isFollowAssignee,
  //         isAuthorized: mongoFeature.isAuthorized,
  //         isCount: mongoFeature.isCount,
  //         authorizedFunction: mongoFeature.authorizedFunction,
  //         url: mongoFeature.url,
  //         apiUrl: mongoFeature.apiUrl,
  //         processID: mongoFeature.processID,
  //         statusFeature: mongoFeature.statusFeature as any,
  //         description: mongoFeature.description,
  //         fields: mongoFeature.fields,
  //         valueField: mongoFeature.valueField,
  //         featureType: mongoFeature.featureType as FeatureType,
  //         status: mongoFeature.status,
  //         criteria: mongoFeature.criteria,
  //         createdBy: mongoFeature.createdBy,
  //         updatedBy: mongoFeature.updatedBy,
  //       };

  //       if (existingEntity) {
  //         this.featureManagementRepo.merge(existingEntity, entityData);
  //         await this.featureManagementRepo.save(existingEntity);
  //       } else {
  //         const newEntity = this.featureManagementRepo.create({
  //           ...entityData,
  //           id: uuidv4(),
  //         });
  //         const savedEntity = await this.featureManagementRepo.save(newEntity);
  //         sqlFeatureMap.set(savedEntity.code, savedEntity);
  //       }
  //       syncedCount++;
  //     } catch (e) {
  //       errors.push({ id: (mongoFeature as any)._id, code: mongoFeature.code, error: e.message });
  //     }
  //   }

  //   // Cập nhật quan hệ cha-con
  //   for (const mongoFeature of mongoFeatures) {
  //     if (mongoFeature.parentId) {
  //       try {
  //         const childCode = mongoFeature.code;
  //         const parentCode = mongoIdToCodeMap.get(mongoFeature.parentId.toString());

  //         if (childCode && parentCode) {
  //           const childEntity = sqlFeatureMap.get(childCode);
  //           const parentEntity = sqlFeatureMap.get(parentCode);

  //           if (childEntity && parentEntity) {
  //             childEntity.parent = parentEntity;
  //             await this.featureManagementRepo.save(childEntity);
  //           }
  //         }
  //       } catch (e) {
  //         errors.push({ id: (mongoFeature as any)._id, code: mongoFeature.code, error: `Failed to set parent: ${e.message}` });
  //       }
  //     }
  //   }

  //   return {
  //     total,
  //     synced: syncedCount,
  //     errors,
  //   };
  // }

  private async checkUserAuthorizationForFeature(userId: string, code: string, userRoles: string[], authorizedFunction?: string): Promise<boolean> {
    const now = new Date();
    const activeAuthorities = await this.authorityDocumentRepo.createQueryBuilder('auth')
      .select('auth.author')
      .where('auth.authorized = :userId', { userId })
      .andWhere('auth.status = 1')
      .andWhere('auth.stage = 1')
      .andWhere('auth.startDate <= :now', { now })
      .andWhere('auth.endDate >= :now', { now })
      .getMany();

    if (activeAuthorities.length === 0) return false;

    const authorIds = activeAuthorities.map(a => a.author).filter(Boolean);
    if (authorIds.length === 0) return false;

    const authors = await this.usersRepository.find({
      where: { id: In(authorIds) },
      select: ['id', 'role', 'position', 'rolesByProcess'],
    });

    for (const author of authors) {
      let isAuthorAdmin = false;
      if (author.position && POSITION_LEVEL[author.position] === POSITION_LEVEL.Admin) {
        isAuthorAdmin = true;
      }
      if (author.role) {
        const roleLower = author.role.toLowerCase();
        isAuthorAdmin = isAuthorAdmin || roleLower.includes('admin') || roleLower.includes('quản trị') || roleLower.includes('administrator') || roleLower.includes('superadmin');
      }

      if (isAuthorAdmin) {
        if (!userRoles.includes(code)) {
          userRoles.push(code); // Cho phép đi qua check subtab
        }
        return true;
      }

      const authorRolesByProcess = Array.isArray(author.rolesByProcess) ? author.rolesByProcess : [];
      const authorPermSet = new Set<string>();

      if (authorRolesByProcess.length > 0) {
        const processKeys = [...new Set(authorRolesByProcess.map((p: any) => p.processKey).filter(Boolean))];

        let roleFeatures: any[] = [];
        if (processKeys.length > 0) {
          roleFeatures = await this.roleFeatureRepository.createQueryBuilder('rf')
            .select(['rf.processKey', 'rf.roles'])
            .where('rf.processKey IN (SELECT value FROM OPENJSON(:processKeys))')
            .setParameter('processKeys', JSON.stringify(processKeys))
            .getMany();
        }

        for (const proc of authorRolesByProcess) {
          const rf = roleFeatures.find((r: any) => r.processKey === proc.processKey);
          if (!rf) continue;

          for (const roleObject of proc.roles || []) {
            const roleCode = roleObject.roleCode;
            const role = (rf as any).roles?.find((r: any) => r.roleCode === roleCode);
            if (!role) continue;

            for (const perm of role.permissions || []) {
              authorPermSet.add(perm);
            }
          }
        }
      }

      const authorPermArray = Array.from(authorPermSet);
      if (authorPermArray.includes(code) || (authorizedFunction && authorPermArray.includes(authorizedFunction))) {
        for (const perm of authorPermArray) {
          if (!userRoles.includes(perm)) {
            userRoles.push(perm);
          }
        }
        return true; // Tìm thấy author có quyền là đủ
      }
    }

    return false;
  }
}

interface QueryParams {
  page?: string | number;
  limit?: string | number;
  sort?: string;
  [key: string]: unknown;
}
