import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { STATUS } from '../variables/CONST_STATUS';
import { RoleGroupService } from 'src/role-group/role-group.service';
import { QueryParams } from 'src/interfaces';
import { EntityRoleGroupService } from 'src/entity-rolegroup/entity-rolegroup.service';
import { EntityRoleGroupController } from 'src/entity-rolegroup/entity-rolegroup.controller';
import { CreateMenuManagerDto, UpdateMenuManagerDto } from './menu-manager.dto';
import { MenuManagerEntity } from './entities/menu-manager.entity';
import { DocumentsService } from 'src/documents/documents.service';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { UsersService } from '../users/users.service';
import { UserEntity } from 'src/users/entities/user.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { ListRoleEntity } from 'src/list-role/entities/list-role.entity';
import { RolesProcessEntity } from 'src/role-feature/role-feature-sql/roles-process.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { SqlRepoCountService } from 'src/database/sqlRepoCount.mssql';
import Redis from 'ioredis';
import { SUPER_ADMIN } from 'src/utils/super-admin.util';
import { getDtoKeys, validateAndParseSortParam } from 'src/utils/sort-validator.util';
@Injectable()
export class MenuManagerService {
  // public static MenuManagerModule: Model<MenuManagerDocument>;
  // public static FeatureManagementModule: Model<FeatureManagementDocument>;

  /**
   * Check if user is Super Admin by comparing SUPER_ADMIN with:
   * 1. userId (keycloak UUID from JWT)
   * 2. keycloak_user_id from DB
   * 3. id (internal DB ID) from DB
   */
  private async isSuperAdminByAnyId(userId: string): Promise<boolean> {
    if (!SUPER_ADMIN || !userId) return false;

    // 1. Check directly against userId (keycloak UUID)
    if (userId === SUPER_ADMIN) return true;

    // 2. Check against keycloak_user_id from DB
    const userByKeycloak = await this.userRepository.findOne({
      where: { keycloakUserId: userId },
      select: ['id', 'keycloakUserId'],
    });
    if (userByKeycloak?.keycloakUserId === SUPER_ADMIN) return true;
    if (userByKeycloak?.id === SUPER_ADMIN) return true;

    // 3. Check against id (internal DB ID) from DB
    const userById = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'keycloakUserId'],
    });
    if (userById?.id === SUPER_ADMIN) return true;
    if (userById?.keycloakUserId === SUPER_ADMIN) return true;

    return false;
  }

  // Cache cho countFeatures (cache 5 phút vì ít thay đổi)
  private countFeaturesCache: { data: any[]; timestamp: number } | null = null;
  private readonly COUNT_FEATURES_CACHE_TTL = 2 * 60 * 1000; // 2 phút

  constructor(
    @InjectRepository(MenuManagerEntity, 'mssqlConnection')
    private readonly menuRepo: Repository<MenuManagerEntity>,

    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(RoleFeatureEntity, 'mssqlConnection')
    private readonly roleFeatureRepo: Repository<RoleFeatureEntity>,

    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserRepo: Repository<GroupUserEntity>,

    @InjectRepository(ListRoleEntity, 'mssqlConnection')
    private readonly listRoleRepo: Repository<ListRoleEntity>,

    @InjectRepository(RolesProcessEntity, 'mssqlConnection')
    private readonly rolesProcessRepo: Repository<RolesProcessEntity>,
    private readonly documentsService: DocumentsService, // Inject DocumentsService
    private readonly usersService: UsersService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject('REDIS_CLIENT') private redis: Redis,
    private readonly countService: SqlRepoCountService,
  ) {
  }

  async onModuleInit() {
    await this.ensureCodeRouterColumn();
  }

  private async ensureCodeRouterColumn() {
    try {
      await this.menuRepo.query(`
        IF COL_LENGTH('menu_managers', 'code_router') IS NULL
        BEGIN
          ALTER TABLE menu_managers ADD code_router VARCHAR(255) NULL;
        END
      `);
    } catch (error) {
      console.error('Error ensuring code_router column:', error);
    }
  }

  // Clear cache helper
  async clearCache() {
    return new Promise<void>((resolve, reject) => {
      const stream = this.redis.scanStream({
        match: 'menu_user:*',
        count: 100,
      });

      stream.on('data', async (keys: string[]) => {
        if (keys.length) {
          await this.redis.del(...keys);
        }
      });

      stream.on('end', () => {
        resolve();
      });

      stream.on('error', (error) => {
        console.error('Error clearing cache:', error);
        reject(error);
      });
    });
  }

  private async findActiveGroupsByUserIds(
    userIds: string[],
  ): Promise<Array<Pick<GroupUserEntity, 'id' | 'roles'>>> {
    const uniqueUserIds = [
      ...new Set(userIds.filter((userId) => Boolean(userId))),
    ];

    if (uniqueUserIds.length === 0) {
      return [];
    }

    return this.groupUserRepo
      .createQueryBuilder('g')
      .select(['g.id', 'g.roles'])
      .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = g.id')
      .where('ugu.user_id IN (:...userIds)', { userIds: uniqueUserIds })
      .andWhere('g.status = :groupStatus', {
        groupStatus: STATUS.ACTIVED,
      })
      .distinct(true)
      .getMany();
  }

  // Filter hidden menus if user belongs to restricted role groups
  private async applyRoleGroupFilter(qb: any, alias: string, userId?: string, providedGroupIds?: string[]) {
    let userGroupIds = providedGroupIds;

    if (!userGroupIds && userId) {
      const userGroups = await this.findActiveGroupsByUserIds([userId]);
      userGroupIds = userGroups.map((g) => g.id);
    }

    if (userGroupIds && userGroupIds.length > 0) {
      userGroupIds.forEach((grpId, idx) => {
        qb.andWhere(
          `(${alias}.roleGroupIds NOT LIKE :hideId${idx} OR ${alias}.roleGroupIds IS NULL)`,
          { [`hideId${idx}`]: `%"${grpId}"%` } // Matches the GUID inside the JSON array string
        );
      });
    }
  }

  // Tạo menu
  async create(createDto: CreateMenuManagerDto): Promise<MenuManagerEntity> {
    const _id = uuidv4();
    let parentEntity: MenuManagerEntity | null = null;
    let path = _id; // Mặc định path là ID của chính nó (cho root)

    if (createDto.parent) {
      parentEntity = await this.menuRepo.findOne({
        where: { _id: createDto.parent, status: STATUS.ACTIVED },
      });
      if (!parentEntity) {
        throw new BadRequestException(
          `Đơn vị cha với ID ${createDto.parent} không tồn tại`,
        );
      }
      // Logic: Path cha + / + ID hiện tại
      // Nếu cha chưa có path (dữ liệu cũ), dùng ID cha làm gốc
      const parentPath = parentEntity.path || parentEntity._id;
      path = `${parentPath}/${_id}`;
    }

    const entity = this.menuRepo.create({
      _id,
      ...createDto,
      parent: parentEntity || undefined,
      status: STATUS.ACTIVED,
      path,
    });

    await this.clearCache(); // Clear cache on create
    return this.menuRepo.save(entity);
  }
  // Lấy danh sách
  async findAll(queryParams: QueryParams, userId?: string) {
    // === SUPER ADMIN BYPASS ===
    if (userId && await this.isSuperAdminByAnyId(userId)) {
      return this.getAllMenusForSuperAdmin(queryParams);
    }

    const {
      page = 1,
      limit = 25,
      sort = '-createdAt',
      ...filters
    } = queryParams;
    const qb = this.menuRepo
      .createQueryBuilder('m')
      .where('m.status = :status', { status: STATUS.ACTIVED });

    if (filters.code)
      qb.andWhere('m.code LIKE :code', { code: `%${filters.code}%` });
    if (filters.name)
      qb.andWhere('m.name LIKE :name', { name: `%${filters.name}%` });

    await this.applyRoleGroupFilter(qb, 'm', userId);

    const allowedSortFields = [
      ...getDtoKeys(CreateMenuManagerDto),
      'createdAt', 'updatedAt'
    ];
    const sortResult = validateAndParseSortParam(sort, allowedSortFields);

    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit as string, 10) || 10, 1);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await qb
      .orderBy(
        Object.keys(sortResult).length > 0
          ? Object.entries(sortResult).reduce((acc, [key, order]) => ({ ...acc, [`m.${key}`]: order }), {})
          : { 'm.createdAt': 'DESC' }
      )
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    return {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      data,
    };
  }

  // Danh sách menu kèm feature
  async findAllMenuv1(queryParams: QueryParams, userId: string) {
    // === SUPER ADMIN BYPASS ===
    if (await this.isSuperAdminByAnyId(userId)) {
      return this.getAllMenusForSuperAdmin(queryParams);
    }

    const { sort = '-createdAt', ...filters } = queryParams;

    const qb = this.menuRepo
      .createQueryBuilder('m')
      .where('m.status = :status', { status: STATUS.ACTIVED });

    // --- THAY ĐỔI Ở ĐÂY ---
    // Chỉ thị cho TypeORM: Với quan hệ 'parent', chỉ lấy ID thôi, không join bảng
    qb.loadAllRelationIds({
      relations: ['parent'],
    });
    // ----------------------

    if (filters.code)
      qb.andWhere('m.code LIKE :code', { code: `%${filters.code}%` });
    if (filters.name)
      qb.andWhere('m.name LIKE :name', { name: `%${filters.name}%` });

    await this.applyRoleGroupFilter(qb, 'm', userId);

    let sortField = 'm.createdAt';
    let sortOrder: 'ASC' | 'DESC' = 'DESC';
    if (typeof sort === 'string') {
      if (sort.startsWith('-')) {
        sortField = `m.${sort.substring(1)}`;
        sortOrder = 'DESC';
      } else {
        sortField = `m.${sort}`;
        sortOrder = 'ASC';
      }
    }

    const data = await qb.orderBy(sortField, sortOrder).getMany();

    // Lấy list function codes để map feature
    const codes = data.map((d) => d.function).filter(Boolean) as string[];
    const featureMap = await this.buildFeatureMap(codes);

    const formatted = data.map((item) => {
      return {
        ...item,
        parent: item.parent || null,
        path: item.path || '',
        function: item.function
          ? {
            code: item.function,
            path: featureMap[item.function]?.path || '',
            type: featureMap[item.function]?.type || '',
          }
          : {
            code: '',
            path: '',
            type: '',
          },
      };
    });

    return { data: formatted };
  }

  // src/menu-manager/menu-manager.service.ts

  async findAllMenu(queryParams: QueryParams, userId: string, authorId?: string) {
    const {
      page = 1,
      limit = 9999,
      sort = '-createdAt',
      ...filters
    } = queryParams;

    // === VALIDATE FILTERS ===
    const invalidKeys = Object.keys(filters).filter((key) =>
      /[<>\[\]{}|\\^% ]/.test(String(filters[key])),
    );
    if (invalidKeys.length > 0) {
      return {
        success: false,
        message: 'Tìm kiếm không được chứa ký tự đặc biệt',
      };
    }

    // === QUERY BUILDER ===
    const qb = this.menuRepo
      .createQueryBuilder('m')
      .where('m.status = :status', { status: STATUS.ACTIVED });

    if (filters.code) {
      qb.andWhere('m.code LIKE :code', { code: `%${filters.code}%` });
    }
    if (filters.name) {
      qb.andWhere('m.name LIKE :name', { name: `%${filters.name}%` });
    }
    // if (filters.hidden) {
    // }
    qb.andWhere('m.hidden = :hidden', { hidden: 1 });
    qb.loadAllRelationIds({
      relations: ['parent'],
    });

    await this.applyRoleGroupFilter(qb, 'm', userId);

    // === PHÂN TRANG & SORT ===
    const pageNum = Math.max(parseInt(page as any, 10) || 1, 1);
    const limitNum = Math.min(
      Math.max(parseInt(limit as any, 10) || 10, 1),
      9999,
    );
    const skip = (pageNum - 1) * limitNum;

    const allowedSortFields = [
      ...getDtoKeys(CreateMenuManagerDto),
      'id', 'createdAt', 'updatedAt', 'path'
    ];
    const sortResult = validateAndParseSortParam(sort, allowedSortFields);

    let orderByOptions: Record<string, 'ASC' | 'DESC'> = {};

    if (Object.keys(sortResult).length > 0) {
      Object.entries(sortResult).forEach(([key, order]) => {
        orderByOptions[`m.${key}`] = order as 'ASC' | 'DESC';
      });
    } else {
      orderByOptions = { 'm.createdAt': 'DESC' };
    }

    // === LẤY DATA MENU ===
    const [data, total] = await qb
      .orderBy(orderByOptions)
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    if (data.length === 0) {
      return {
        data: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      };
    }

    const codes = [
      ...new Set(
        data
          .map((item) => item.function)
          .filter((code): code is string => Boolean(code)),
      ),
    ];

    let countFeaturesResult: any[];
    const now = Date.now();
    const datausers = await this.usersService.findProcessRoleInfoById(userId);

    countFeaturesResult = await this.featureManagementRepo
      .createQueryBuilder('f')
      .select(['f.code', 'f.authorizedFunction'])
      .where('f.status = 1 AND f.is_count = 1')
      .getMany();
    this.countFeaturesCache = {
      data: countFeaturesResult,
      timestamp: now,
    };
    const featuresResult =
      codes.length > 0
        ? await this.featureManagementRepo
          .createQueryBuilder('f')
          .select(['f.code', 'f.url AS path', 'f.featureType AS type'])
          .where('f.code IN (:...codes)', { codes })
          .getRawMany()
        : [];

    let featureMap: Record<string, { path: string; type: string }> = {};
    if (featuresResult.length > 0) {
      featureMap = featuresResult.reduce(
        (map, f) => {
          if (!f.f_code) {
            return map;
          }
          map[f.f_code] = {
            path: f.path || '',
            type: f.type || '',
          };
          return map;
        },
        {} as Record<string, { path: string; type: string }>,
      );
    }

    // // === BUILD COUNT CODES ===
    const countFeatures = countFeaturesResult;
    // Loại bỏ duplicate và null/undefined
    const countCodes = [
      ...new Set(
        countFeatures
          .flatMap((f) => [f.code, f.authorizedFunction])
          .filter((code): code is string => Boolean(code)),
      ),
    ];

    const userRoles: string[] = datausers.roles || [];
    const commonCodes = (userId !== authorId)
      ? this.getCommonStrings(countCodes, userRoles)
      : countCodes;
    // === GỌI getCountsSummary (có thể timeout nếu quá nhiều) ===
    let counts: Record<string, number> = {};
    if (userId && countCodes.length > 0) {
      try {
        // Gọi với timeout ngắn hơn để tránh block quá lâu
        const countsPromise = this.documentsService.getCountsSummary(
          userId,
          commonCodes,
        );

        // Timeout 15 giây cho getCountsSummary
        const timeoutPromise = new Promise<Record<string, number>>(
          (_, reject) =>
            setTimeout(() => reject(new Error('Count summary timeout')), 20000),
        );

        counts = await Promise.race([countsPromise, timeoutPromise]);
      } catch (error) {
        console.error('Error fetching counts for menu:', error);
        counts = {};
      }
    }

    const countMap: Record<string, number> = {};

    countFeatures.forEach((f) => {
      if (f.code) {
        const totalForThisMenu =
          (counts[f.code] ?? 0) + 0;
        countMap[f.code] = totalForThisMenu;
      }
    });

    countMap['TraCuuVbDi'] = 0;

    const formattedData = data.map((item) => {
      const code = item.function || '';
      const featureInfo = featureMap[code] || { path: '', type: '' };

      return {
        ...item,
        parent: item.parent || null,
        path: item.path || '',
        function: {
          code,
          path: featureInfo.path,
          type: featureInfo.type,
          // count: countMap[code] ?? 0, // tự động lấy count theo code
        },
      };
    });

    return {
      data: formattedData,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }
  async findMenuByUserV1(queryParams: QueryParams, userId: string) {
    try {
      const {
        page = 1,
        limit = 9999,
        sort = '-createdAt',
        ...filters
      } = queryParams;

      // ================= GET USER =================
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'rolesByProcess'],
      });
      if (!user) throw new BadRequestException('User không tồn tại');

      // ================= COLLECT PERMISSIONS =================
      const rolesByProcess = Array.isArray(user.rolesByProcess)
        ? user.rolesByProcess
        : [];

      const permSet = new Set<string>();

      if (rolesByProcess.length > 0) {
        const processKeys = [
          ...new Set(rolesByProcess.map((p) => p.processKey).filter(Boolean)),
        ];

        const roleFeatures = await this.roleFeatureRepo.find({
          where: { processKey: In(processKeys) },
          select: ['processKey', 'roles'],
        });

        for (const proc of rolesByProcess) {
          const rf = roleFeatures.find((r) => r.processKey === proc.processKey);
          if (!rf) continue;

          for (const roleObject of proc.roles || []) {
            const role = rf.roles?.find(
              (r) => r.roleCode === roleObject.roleCode,
            );
            if (!role) continue;

            for (const perm of role.permissions || []) {
              permSet.add(perm);
            }
          }
        }
      }

      const perms = Array.from(permSet);

      const staticMenuIds: string[] = [];
      const userGroups = await this.findActiveGroupsByUserIds([userId]);

      const roleIdsFromGroups = userGroups.flatMap((g) => g.roles || []);
      // const staticPermissions: any[] = [];

      if (roleIdsFromGroups.length > 0) {
        const listRoles = await this.listRoleRepo.find({
          where: { id: In(roleIdsFromGroups), status: STATUS.ACTIVED },
          // relations: ['functionName'],
        });
        // const staticPermMap = new Map();
        for (const role of listRoles) {
          if (role.roles && Array.isArray(role.roles)) {
            for (const permission of role.roles) {
              if (permission && typeof permission === 'object' && 'functionName' in permission && permission.functionName) {
                const funcId = permission.functionName;
                staticMenuIds.push(funcId);
              }
            }
          }
        }
      }

      if (!perms.length && !staticMenuIds.length) {
        return { data: [], total: 0, page: 1, limit: 0, totalPages: 0 };
      }

      const menusByPerms = await this.menuRepo
        .createQueryBuilder('m')
        .leftJoin('m.parent', 'p')
        .select([
          'm._id',
          'm.path',
          'p._id',
        ])
        .where(new Brackets((qb) => {
          if (perms.length) {
            qb.where('m.function IN (:...perms)', { perms });
          }
          if (staticMenuIds.length) {
            if (perms.length) {
              qb.orWhere('m._id IN (:...staticMenuIds)', { staticMenuIds });
            } else {
              qb.where('m._id IN (:...staticMenuIds)', { staticMenuIds });
            }
          }
        }))
        .andWhere('m.status = :status', { status: STATUS.ACTIVED })
        .andWhere('m.hidden = :hidden', { hidden: 1 });

      const userGroupIds = userGroups.map(g => g.id);
      await this.applyRoleGroupFilter(menusByPerms, 'm', userId, userGroupIds);

      const menusByPermsData = await menusByPerms.getMany();

      if (!menusByPermsData.length) {
        return { data: [], total: 0, page: 1, limit: 0, totalPages: 0 };
      }

      // ================= COLLECT MENU IDS FROM PATH =================
      const menuIdSet = new Set<string>();

      for (const menu of menusByPermsData) {
        // add id của chính menu
        if (menu._id) {
          menuIdSet.add(String(menu._id));
        }

        // add các id trong path (id/id/id)
        if (menu.path) {
          const ids = menu.path.split('/').filter(Boolean);
          for (const id of ids) {
            menuIdSet.add(id);
          }
        }
      }

      const menuIds = Array.from(menuIdSet);

      if (!menuIds.length) {
        return { data: [], total: 0, page: 1, limit: 0, totalPages: 0 };
      }


      const qb = this.menuRepo
        .createQueryBuilder('m')
        .where('m.status = :status', { status: STATUS.ACTIVED })
        .andWhere('m._id IN (:...menuIds)', { menuIds })
        .loadAllRelationIds({
          relations: ['parent'],
        });

      await this.applyRoleGroupFilter(qb, 'm', userId, userGroupIds);

      const [data, total] = await qb.getManyAndCount();


      if (!data.length) {
        return { data: [], total: 0, totalPages: 0 };
      }

      // ================= FEATURE MAP =================
      const codes = [...new Set(data.map((d) => d.function).filter(Boolean))];

      const features = await this.featureManagementRepo
        .createQueryBuilder('f')
        .select(['f.code', 'f.url AS path', 'f.featureType AS type'])
        .where('f.code IN (:...codes)', { codes })
        .getRawMany();

      const featureMap = features.reduce((acc, f) => {
        acc[f.f_code] = { path: f.path || '', type: f.type || '' };
        return acc;
      }, {} as Record<string, { path: string; type: string }>);

      // ================= COUNT LOGIC =================
      let countMap: Record<string, number> = {};
      try {
        const countFeaturesResult = await this.featureManagementRepo
          .createQueryBuilder('f')
          .select(['f.code', 'f.authorizedFunction'])
          .where('f.status = 1 AND f.is_count = 1')
          .getMany();

        const countCodes = [
          ...new Set(
            countFeaturesResult
              .flatMap((f) => [f.code, f.authorizedFunction])
              .filter((code): code is string => Boolean(code)),
          ),
        ];

        // Lọc lấy những count codes nằm trong các menu đã tìm được
        const relevantCountCodes = countCodes.filter((code) =>
          codes.includes(code) || data.some((d) => d.function === code)
        );

        if (relevantCountCodes.length > 0) {
          try {
            const counts = await this.documentsService.getCountsSummary(
              userId,
              relevantCountCodes,
            );

            // Build countMap từ các menus đã tìm được
            countFeaturesResult.forEach((f) => {
              if (f.code && codes.includes(f.code)) {
                countMap[f.code] = counts[f.code] ?? 0;
              }
            });
          } catch (error) {
            console.error('Error fetching counts for findMenuByUser:', error);
            countMap = {};
          }
        }
      } catch (error) {
        console.error('Error in count logic for findMenuByUser:', error);
        countMap = {};
      }

      // ================= FORMAT =================
      const formattedData = data.map((item) => {
        const code = item.function || '';
        return {
          ...item,
          function: {
            code,
            path: featureMap[code]?.path || '',
            type: featureMap[code]?.type || '',
            count: countMap[code] ?? 0,
          },
        };
      });

      return {
        data: formattedData,
        total,
      };
    } catch (error) {
      console.error('Error in findMenuByUser:', error);
      throw new BadRequestException('Lỗi khi lấy menu cho user');
    }
  }

  // Helper: lấy tất cả menu cho Super Admin
  private async getAllMenusForSuperAdmin(queryParams: QueryParams) {
    const {
      page = 1,
      limit = 9999,
      sort = '-createdAt',
      ...filters
    } = queryParams;

    const qb = this.menuRepo
      .createQueryBuilder('m')
      .where('m.status = :status', { status: STATUS.ACTIVED });

    if (filters.hidden) {
      qb.andWhere('m.hidden = :hidden', { hidden: 1 });
    }

    if (filters.code) {
      qb.andWhere('m.code LIKE :code', { code: `%${filters.code}%` });
    }
    if (filters.name) {
      qb.andWhere('m.name LIKE :name', { name: `%${filters.name}%` });
    }

    const pageNum = Math.max(parseInt(page as any, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit as any, 10) || 10, 1), 9999);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await qb
      .orderBy('m.createdAt', 'DESC')
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    const codes = [...new Set(data.map((d) => d.function).filter(Boolean))];
    const features = codes.length > 0
      ? await this.featureManagementRepo
        .createQueryBuilder('f')
        .select(['f.code', 'f.url AS path', 'f.featureType AS type'])
        .where('f.code IN (:...codes)', { codes })
        .getRawMany()
      : [];

    const featureMap = features.reduce((acc, f) => {
      acc[f.f_code] = { path: f.path || '', type: f.type || '' };
      return acc;
    }, {} as Record<string, { path: string; type: string }>);

    const formattedData = data.map((item) => {
      const code = item.function || '';
      return {
        ...item,
        parent: item.parent || null,
        path: item.path || '',
        function: {
          code,
          path: featureMap[code]?.path || '',
          type: featureMap[code]?.type || '',
          count: 0,
        },
      };
    });

    return {
      data: formattedData,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async findMenuByUser(queryParams: QueryParams, userId: string, includeCount: boolean = false) {
    try {
      const {
        page = 1,
        limit = 9999,
        sort = '-createdAt',
        ...filters
      } = queryParams;

      // === SUPER ADMIN BYPASS ===
      if (await this.isSuperAdminByAnyId(userId)) {
        return this.getAllMenusForSuperAdmin(queryParams);
      }

      // === CACHE CHECK ===
      // const cacheKey = `menu_user:${userId}`;
      // const cachedData = await this.redis.get(cacheKey);

      // if (cachedData) {
      //   console.log('Cache hit for user:', userId);
      //   return JSON.parse(cachedData);
      // }


      const authorId = await this.usersService.getAuthorIdIfAuthorized(userId);

      // ================= GET USER & AUTHOR (PARALLEL) =================
      const userIds = [userId];
      if (authorId) userIds.push(authorId);

      // ================= COLLECT PERMISSIONS TỪ roles_process (USER + AUTHOR) =================
      const permSet = new Set<string>();
      const authorPermSet = new Set<string>();

      // Lấy tất cả user IDs cần check (user + author)
      const allIds = [userId];
      if (authorId) allIds.push(authorId);
      const idList = allIds.map(id => `'${id}'`).join(',');

      // 1. Lấy roleCodes từ roles_process_users (gán trực tiếp cho user)
      const directRoles: Array<{ processKey: string; roleCode: string; userId: string }> = await this.rolesProcessRepo.manager.query(`
        SELECT rp.process_key AS processKey, rp.role_code AS roleCode, rpu.user_id AS userId
        FROM roles_process_users rpu
        INNER JOIN roles_process rp ON rp.id = rpu.role_id AND rp.is_active = 1
        WHERE rpu.user_id IN (${idList})
      `);

      // 2. Lấy roleCodes từ roles_process_groups (gán qua nhóm)
      const groupRoles: Array<{ processKey: string; roleCode: string; userId: string }> = await this.rolesProcessRepo.manager.query(`
        SELECT rp.process_key AS processKey, rp.role_code AS roleCode, ugu.user_id AS userId
        FROM roles_process_groups rpg
        INNER JOIN roles_process rp ON rp.id = rpg.role_id AND rp.is_active = 1
        INNER JOIN user_group_users ugu ON ugu.group_user_id = rpg.group_id
        WHERE ugu.user_id IN (${idList})
      `);

      const allUserRoles = [...directRoles, ...groupRoles];

      if (allUserRoles.length > 0) {
        const processKeys = [...new Set(allUserRoles.map(r => r.processKey).filter(Boolean))];

        // Lấy permissions từ roleFeatures
        const roleFeatures = await this.roleFeatureRepo.find({
          where: { processKey: In(processKeys) },
          select: ['processKey', 'roles'],
        });

        const roleFeatureMap = new Map(roleFeatures.map(rf => [rf.processKey, rf]));

        // Tách user roles vs author roles
        const userRoleCodes = new Set<string>();
        const authorRoleCodes = new Set<string>();

        for (const r of allUserRoles) {
          const rf = roleFeatureMap.get(r.processKey);
          if (!rf) {
            continue;
          }
          const role = rf.roles?.find((ro) => ro.roleCode === r.roleCode);
          if (!role) {
            continue;
          }
          for (const perm of role.permissions || []) {
            if (r.userId === userId) {
              userRoleCodes.add(perm);
            } else {
              authorRoleCodes.add(perm);
            }
          }
        }

        // Gán vào permSet/authorPermSet
        for (const p of userRoleCodes) permSet.add(p);
        for (const p of authorRoleCodes) authorPermSet.add(p);
      }

      const perms = Array.from(permSet);

      // ================= FILTER AUTHOR PERMS QUA UỶ QUYỀN =================
      let authorizedPerms: string[] = [];

      if (authorPermSet.size > 0) {
        const authorizedFeatures = await this.featureManagementRepo.find({
          where: {
            authorizedFunction: In([...authorPermSet]),
            isAuthorized: true,
            status: STATUS.ACTIVED,
          },
          select: ['code'],
        });

        authorizedPerms = authorizedFeatures.map((f) => f.code);
      }

      // ================= MERGE VÀO PERMS =================
      const finalPerms = [...new Set([...perms, ...authorizedPerms])];

      // ================= STATIC MENU IDS =================
      const staticMenuIds: string[] = [];

      // Lấy groups của user & author (PARALLEL)
      const groupUserIds = [userId];
      if (authorId) groupUserIds.push(authorId);

      const allGroups = await this.findActiveGroupsByUserIds(groupUserIds);

      const allGroupIds = allGroups.map(g => g.id);
      const roleIdsFromGroups = allGroups.flatMap((g) => g.roles || []);

      if (roleIdsFromGroups.length > 0) {
        const uniqueRoleIds = [...new Set(roleIdsFromGroups)];

        const listRoles = await this.listRoleRepo.find({
          where: { id: In(uniqueRoleIds), status: STATUS.ACTIVED },
        });

        const staticMenuIdSet = new Set<string>();

        for (const role of listRoles) {
          if (role.roles && Array.isArray(role.roles)) {
            for (const permission of role.roles) {
              if (
                permission &&
                typeof permission === 'object' &&
                'functionName' in permission &&
                permission.functionName
              ) {
                staticMenuIdSet.add(permission.functionName);
              }
            }
          }
        }

        staticMenuIds.push(...staticMenuIdSet);
      }

      if (!finalPerms.length && !staticMenuIds.length) {
        return { data: [], total: 0, page: 1, limit: 0, totalPages: 0 };
      }

      // ================= QUERY MENUS =================
      const menusByPerms = await this.menuRepo
        .createQueryBuilder('m')
        .leftJoin('m.parent', 'p')
        .select(['m._id', 'm.path', 'p._id'])
        .where(
          new Brackets((qb) => {
            if (finalPerms.length) {
              qb.where('m.function IN (:...perms)', { perms: finalPerms });
            }
            if (staticMenuIds.length) {
              if (finalPerms.length) {
                qb.orWhere('m._id IN (:...staticMenuIds)', { staticMenuIds });
              } else {
                qb.where('m._id IN (:...staticMenuIds)', { staticMenuIds });
              }
            }
          })
        )
        .andWhere('m.status = :status', { status: STATUS.ACTIVED })
        .andWhere('m.hidden = :hidden', { hidden: 1 });

      await this.applyRoleGroupFilter(menusByPerms, 'm', userId, allGroupIds);

      const menusByPermsData = await menusByPerms.getMany();

      if (!menusByPermsData.length) {
        return { data: [], total: 0, page: 1, limit: 0, totalPages: 0 };
      }

      // ================= COLLECT MENU IDS FROM PATH =================
      const menuIdSet = new Set<string>();

      for (const menu of menusByPermsData) {
        if (menu._id) {
          menuIdSet.add(String(menu._id));
        }

        if (menu.path) {
          const ids = menu.path.split('/').filter(Boolean);
          for (const id of ids) {
            menuIdSet.add(id);
          }
        }
      }

      const menuIds = Array.from(menuIdSet);

      if (!menuIds.length) {
        return { data: [], total: 0, page: 1, limit: 0, totalPages: 0 };
      }

      const qb = this.menuRepo
        .createQueryBuilder('m')
        .where('m.status = :status', { status: STATUS.ACTIVED })
        .andWhere('m._id IN (:...menuIds)', { menuIds })
        .loadAllRelationIds({
          relations: ['parent'],
        });

      await this.applyRoleGroupFilter(qb, 'm', userId, allGroupIds);

      const [data, total] = await qb.getManyAndCount();

      if (!data.length) {
        return { data: [], total: 0, totalPages: 0 };
      }

      // ================= FEATURE MAP =================
      const codes = [...new Set(data.map((d) => d.function).filter((c): c is string => Boolean(c)))];

      const features = await this.featureManagementRepo
        .createQueryBuilder('f')
        .select(['f.code', 'f.url AS path', 'f.featureType AS type'])
        .where('f.code IN (:...codes)', { codes })
        .getRawMany();

      const featureMap = features.reduce((acc, f) => {
        acc[f.f_code] = { path: f.path || '', type: f.type || '' };
        return acc;
      }, {} as Record<string, { path: string; type: string }>);

      // ================= COUNT LOGIC =================
      let countMap: Record<string, number> = {};
      if (includeCount) {
        countMap = await this.getMenuCountsForCodes(userId, codes);
      }

      // ================= FORMAT =================
      const formattedData = data.map((item) => {
        const code = item.function || '';
        const functionObj: any = {
          code,
          path: featureMap[code]?.path || '',
          type: featureMap[code]?.type || '',
          count: includeCount ? (countMap[code] ?? 0) : 0,
        };
        return {
          ...item,
          function: functionObj,
        };
      });

      const result = {
        data: formattedData,
        total,
      };

      // === SET CACHE ===
      // await this.redis.set(
      //   cacheKey,
      //   JSON.stringify(result),
      //   'EX',
      //   60 * 60 * 5,
      // );

      return result;
    } catch (error) {
      console.error('[MENU ERROR] findMenuByUser:', error?.message, error?.stack);
      throw new BadRequestException('Lỗi khi lấy menu cho user: ' + error?.message);
    }
  }

  private async getMenuCountsForCodes(
    userId: string,
    codes: string[],
  ): Promise<Record<string, number>> {
    let countMap: Record<string, number> = {};
    try {
      const countFeaturesResult = await this.featureManagementRepo
        .createQueryBuilder('f')
        .select(['f.code', 'f.authorizedFunction', 'f.countList'])
        .where('f.status = 1 AND f.is_count = 1')
        .getMany();

      const countCodes = [
        ...new Set(
          countFeaturesResult
            .flatMap((f) => [f.code, f.authorizedFunction])
            .filter((code): code is string => Boolean(code))
        ),
      ];

      const relevantCountCodes = countCodes.filter(
        (code) => codes.includes(code)
      );

      if (relevantCountCodes.length > 0) {
        try {
          // Lấy context dùng chung
          let receiverUnit: string | null = null;
          let role: string | null = null;
          try {
            const user = await this.userRepository.findOne({
              where: { id: userId },
              select: ['id', 'parent', 'role'],
              relations: ['parent'],
            });
            receiverUnit = user?.parent?.id || null;
            role = user?.role || null;
          } catch (err) { }
          const extraParams = { receiverUnit, role };

          const countListFeatures = countFeaturesResult.filter(f => f.countList && (Array.isArray(f.countList) ? f.countList.length > 0 : typeof f.countList === 'string'));
          const normalCountCodes = relevantCountCodes.filter(code => !countListFeatures.some(f => f.code === code));

          let counts: Record<string, number> = {};
          if (normalCountCodes.length > 0) {
            counts = await this.documentsService.getCountsSummary(
              userId,
              normalCountCodes
            );
          }

          // Đếm song song cho các features dùng countList động
          await Promise.all(
            countListFeatures.map(async (f) => {
              if (f.code && codes.includes(f.code)) {
                let countListFns: any[] = [];
                if (typeof f.countList === 'string') {
                  try { countListFns = JSON.parse(f.countList); } catch (e) { countListFns = []; }
                } else if (Array.isArray(f.countList)) {
                  countListFns = f.countList;
                }
                if (countListFns.length > 0) {
                  try {
                    const rs = await this.buildCountMapFromCountList(
                      userId,
                      f.code,
                      countListFns,
                      extraParams
                    );
                    countMap[f.code] = rs?.total ?? 0;
                  } catch (err) {
                    countMap[f.code] = 0;
                  }
                } else {
                  countMap[f.code] = 0;
                }
              }
            })
          );

          // Đếm cho các features bình thường
          countFeaturesResult.forEach((f) => {
            if (f.code && codes.includes(f.code) && countMap[f.code] === undefined) {
              countMap[f.code] = counts[f.code] ?? 0;
            }
          });
        } catch (error) {
          console.error('Error fetching counts for getMenuCountsForCodes:', error);
        }
      }
    } catch (error) {
      console.error('Error in getMenuCountsForCodes:', error);
    }
    return countMap;
  }

  async findMenuCountsByUser(queryParams: QueryParams, userId: string) {
    // 1. Lấy danh sách menu của user mà không tính count
    const menuResult = await this.findMenuByUser(queryParams, userId, false);
    if (!menuResult || !menuResult.data) {
      return { countMap: {} };
    }

    // 2. Lấy ra tất cả codes từ menu (bao gồm cả code rỗng thì bỏ qua)
    const codes = [...new Set(menuResult.data.map((d) => d.function?.code).filter((c): c is string => Boolean(c)))];

    // 3. Khởi tạo countMap với tất cả codes = 0 (để FE có thể map đầy đủ)
    const countMap: Record<string, number> = {};
    for (const code of codes) {
      countMap[code] = 0;
    }

    // 4. Tính toán actual counts (chỉ cho những feature có is_count = 1), ghi đè lên countMap
    const actualCounts = await this.getMenuCountsForCodes(userId, codes);
    Object.assign(countMap, actualCounts);

    return { countMap };
  }

  async findMenuForApp(queryParams: QueryParams, userId: string) {
    try {
      const {
        page = 1,
        limit = 9999,
        sort = '-createdAt',
        ...filters
      } = queryParams;

      // === SUPER ADMIN BYPASS ===
      if (await this.isSuperAdminByAnyId(userId)) {
        return this.getAllMenusForSuperAdmin(queryParams);
      }

      const authorId = await this.usersService.getAuthorIdIfAuthorized(userId);

      // ================= GET USER & AUTHOR (PARALLEL) =================
      const userIds = [userId];
      if (authorId) userIds.push(authorId);

      const users = await this.userRepository.find({
        where: { id: In(userIds) },
        select: ['id', 'rolesByProcess'],
      });

      const user = users.find((u) => u.id === userId);
      if (!user) throw new BadRequestException('User không tồn tại');

      const author = authorId ? users.find((u) => u.id === authorId) : null;

      // ================= COLLECT PERMISSIONS (USER + AUTHOR) =================
      const allRolesByProcess = [
        ...(Array.isArray(user.rolesByProcess) ? user.rolesByProcess : []),
        ...(author && Array.isArray(author.rolesByProcess) ? author.rolesByProcess : []),
      ];

      const permSet = new Set<string>();
      const authorPermSet = new Set<string>();

      if (allRolesByProcess.length > 0) {
        const processKeys = [
          ...new Set(allRolesByProcess.map((p) => p.processKey).filter(Boolean)),
        ];

        const roleFeatures = await this.roleFeatureRepo.find({
          where: { processKey: In(processKeys) },
          select: ['processKey', 'roles'],
        });

        const roleFeatureMap = new Map(
          roleFeatures.map((rf) => [rf.processKey, rf])
        );

        // Process user permissions
        if (Array.isArray(user.rolesByProcess)) {
          for (const proc of user.rolesByProcess) {
            const rf = roleFeatureMap.get(proc.processKey);
            if (!rf) continue;

            for (const roleObject of proc.roles || []) {
              const role = rf.roles?.find((r) => r.roleCode === roleObject.roleCode);
              if (!role) continue;

              for (const perm of role.permissions || []) {
                permSet.add(perm);
              }
            }
          }
        }

        // Process author permissions
        if (author && Array.isArray(author.rolesByProcess)) {
          for (const proc of author.rolesByProcess) {
            const rf = roleFeatureMap.get(proc.processKey);
            if (!rf) continue;

            for (const roleObject of proc.roles || []) {
              const role = rf.roles?.find((r) => r.roleCode === roleObject.roleCode);
              if (!role) continue;

              for (const perm of role.permissions || []) {
                authorPermSet.add(perm);
              }
            }
          }
        }
      }

      const perms = Array.from(permSet);

      // ================= FILTER AUTHOR PERMS QUA UỶ QUYỀN =================
      let authorizedPerms: string[] = [];

      if (authorPermSet.size > 0) {
        const authorizedFeatures = await this.featureManagementRepo.find({
          where: {
            authorizedFunction: In([...authorPermSet]),
            isAuthorized: true,
            status: STATUS.ACTIVED,
          },
          select: ['code'],
        });

        authorizedPerms = authorizedFeatures.map((f) => f.code);
      }

      // ================= MERGE VÀO PERMS =================
      const finalPerms = [...new Set([...perms, ...authorizedPerms])];

      // ================= STATIC MENU IDS =================
      const staticMenuIds: string[] = [];

      // Lấy groups của user & author (PARALLEL)
      const groupUserIds = [userId];
      if (authorId) groupUserIds.push(authorId);

      const allGroups = await this.findActiveGroupsByUserIds(groupUserIds);

      const allGroupIds = allGroups.map(g => g.id);
      const roleIdsFromGroups = allGroups.flatMap((g) => g.roles || []);

      if (roleIdsFromGroups.length > 0) {
        const uniqueRoleIds = [...new Set(roleIdsFromGroups)];

        const listRoles = await this.listRoleRepo.find({
          where: { id: In(uniqueRoleIds), status: STATUS.ACTIVED },
        });

        const staticMenuIdSet = new Set<string>();

        for (const role of listRoles) {
          if (role.roles && Array.isArray(role.roles)) {
            for (const permission of role.roles) {
              if (
                permission &&
                typeof permission === 'object' &&
                'functionName' in permission &&
                permission.functionName
              ) {
                staticMenuIdSet.add(permission.functionName);
              }
            }
          }
        }

        staticMenuIds.push(...staticMenuIdSet);
      }

      if (!finalPerms.length && !staticMenuIds.length) {
        return { data: [], total: 0, page: 1, limit: 0, totalPages: 0 };
      }

      // ================= QUERY MENUS =================
      const menusByPerms = await this.menuRepo
        .createQueryBuilder('m')
        .leftJoin('m.parent', 'p')
        .select(['m._id', 'm.path', 'p._id'])
        .where(
          new Brackets((qb) => {
            if (finalPerms.length) {
              qb.where('m.function IN (:...perms)', { perms: finalPerms });
            }
            if (staticMenuIds.length) {
              if (finalPerms.length) {
                qb.orWhere('m._id IN (:...staticMenuIds)', { staticMenuIds });
              } else {
                qb.where('m._id IN (:...staticMenuIds)', { staticMenuIds });
              }
            }
          })
        )
        .andWhere('m.status = :status', { status: STATUS.ACTIVED })
        .andWhere('m.hidden = :hidden', { hidden: 1 });

      await this.applyRoleGroupFilter(menusByPerms, 'm', userId, allGroupIds);

      const menusByPermsData = await menusByPerms.getMany();

      if (!menusByPermsData.length) {
        return { data: [], total: 0, page: 1, limit: 0, totalPages: 0 };
      }

      // ================= COLLECT MENU IDS FROM PATH =================
      const menuIdSet = new Set<string>();

      for (const menu of menusByPermsData) {
        if (menu._id) {
          menuIdSet.add(String(menu._id));
        }

        if (menu.path) {
          const ids = menu.path.split('/').filter(Boolean);
          for (const id of ids) {
            menuIdSet.add(id);
          }
        }
      }

      const menuIds = Array.from(menuIdSet);

      if (!menuIds.length) {
        return { data: [], total: 0, page: 1, limit: 0, totalPages: 0 };
      }

      const qb = this.menuRepo
        .createQueryBuilder('m')
        .where('m.status = :status', { status: STATUS.ACTIVED })
        .andWhere('m._id IN (:...menuIds)', { menuIds })
        .loadAllRelationIds({
          relations: ['parent'],
        });

      await this.applyRoleGroupFilter(qb, 'm', userId, allGroupIds);

      const [data, total] = await qb.getManyAndCount();

      if (!data.length) {
        return { data: [], total: 0, totalPages: 0 };
      }

      // ================= FEATURE MAP =================
      const codes = [...new Set(data.map((d) => d.function).filter(Boolean))];

      const features = await this.featureManagementRepo
        .createQueryBuilder('f')
        .select(['f.code', 'f.url AS path', 'f.featureType AS type'])
        .where('f.code IN (:...codes)', { codes })
        .getRawMany();

      const featureMap = features.reduce((acc, f) => {
        acc[f.f_code] = { path: f.path || '', type: f.type || '' };
        return acc;
      }, {} as Record<string, { path: string; type: string }>);

      // ================= COUNT LOGIC =================
      let countMap: Record<string, number> = {};
      try {
        const countFeaturesResult = await this.featureManagementRepo
          .createQueryBuilder('f')
          .select(['f.code', 'f.authorizedFunction'])
          .where('f.status = 1 AND f.is_count = 1')
          .getMany();

        const countCodes = [
          ...new Set(
            countFeaturesResult
              .flatMap((f) => [f.code, f.authorizedFunction])
              .filter((code): code is string => Boolean(code))
          ),
        ];

        const relevantCountCodes = countCodes.filter(
          (code) => codes.includes(code) || data.some((d) => d.function === code)
        );

        if (relevantCountCodes.length > 0) {
          try {
            const counts = await this.documentsService.getCountsSummary(
              userId,
              relevantCountCodes
            );

            countFeaturesResult.forEach((f) => {
              if (f.code && codes.includes(f.code)) {
                countMap[f.code] = counts[f.code] ?? 0;
              }
            });
          } catch (error) {
            console.error('Error fetching counts for findMenuForApp:', error);
            countMap = {};
          }
        }
      } catch (error) {
        console.error('Error in count logic for findMenuForApp:', error);
        countMap = {};
      }

      // ================= FORMAT =================
      const formattedData = data.map((item) => {
        const code = item.function || '';
        return {
          ...item,
          codeApp: item.codeApp,
          function: {
            code,
            path: featureMap[code]?.path || '',
            type: featureMap[code]?.type || '',
            count: countMap[code] ?? 0,
          },
        };
      });

      return {
        data: formattedData,
        total,
      };
    } catch (error) {
      console.error('Error in findMenuForApp:', error);
      throw new BadRequestException('Lỗi khi lấy menu cho app');
    }
  }

  getCommonStrings(arr1: string[], arr2: string[]): string[] {
    const set2 = new Set(arr2);
    return arr1.filter((item) => set2.has(item));
  }

  async getMenuCounts(userId: string, codes?: string[]) {
    try {
      // 1. Lấy context dùng chung
      let receiverUnit: string | null = null;
      let role: string | null = null;
      try {
        const user = await this.userRepository.findOne({
          where: { id: userId },
          select: ['id', 'parent', 'role'],
          relations: ['parent'],
        });
        receiverUnit = user?.parent?.id || null;
        role = user?.role || null;
      } catch (err) {
        console.warn('[getMenuCounts] Failed to fetch context:', err.message);
      }

      // 2. Query tối ưu: Gộp Feature và Menu trong 1 câu lệnh
      const qb = this.featureManagementRepo
        .createQueryBuilder('f')
        .leftJoin(MenuManagerEntity, 'm', 'm.function = f.code')
        .leftJoin('m.parent', 'mp')
        .select([
          'f.code AS f_code',
          'f.url AS path',
          'f.featureType AS type',
          'f.countList AS f_count_list',
          'm._id AS m_id',
          'mp._id AS m_parent_id'
        ])
        .where("f.isCount = :isCount", { isCount: true });

      if (codes && codes.length > 0) {
        qb.andWhere('f.code IN (:...codes)', { codes });
      }

      const filteredFeatures = await qb.getRawMany();

      if (!filteredFeatures.length) {
        return {
          success: true, countMap: {
            ...codes?.reduce((acc, code) => {
              acc[code] = 0;
              return acc;
            }, {})
          }
        };
      }

      // 3. Thực hiện đếm tuần tự theo lô (Chunking) để tránh sập DB và RAM
      const countMap: Record<string, any> = {};
      const extraParams = { receiverUnit, role }; // Truyền receiverUnit và role xuống

      const chunkSize = 5;
      for (let i = 0; i < filteredFeatures.length; i += chunkSize) {
        const chunk = filteredFeatures.slice(i, i + chunkSize);
        
        await Promise.all(
          chunk.map(async (f) => {
            const code = f.f_code;
            let countValue = 0;

            // Parse countList từ DB
            let countListFns: any[] = [];
            const rawCountList = f.f_count_list;
            if (rawCountList) {
              if (typeof rawCountList === 'string') {
                try { countListFns = JSON.parse(rawCountList); } catch (e) { countListFns = []; }
              } else if (Array.isArray(rawCountList)) {
                countListFns = rawCountList;
              }
            }

            if (countListFns.length > 0) {
              try {
                // Gọi hàm đếm động, truyền kèm authorId để xử lý ủy quyền bên trong buildCountMapFromCountList
                const rs = await this.buildCountMapFromCountList(
                  userId,
                  code,
                  countListFns,
                  { ...extraParams },
                );
                countValue = rs?.total ?? 0;
              } catch (err: any) {
                console.error(`[getMenuCounts] Error counting for ${code}:`, err?.message || err);
              }
            }

            countMap[code] = countValue;
          })
        );
      }

      return { success: true, countMap };
    } catch (error) {
      console.error('Error in getMenuCounts:', error);
      throw new BadRequestException('Lỗi khi lấy số lượng menu');
    }
  }

  async buildCountMapFromCountList(
    userId: string,
    processFn: string,
    countListEntries: any[],
    extraParams?: Record<string, any>,
  ): Promise<{ total: number; detail: Record<string, number> }> {
    if (!countListEntries?.length) return { total: 0, detail: {} };
    let total = 0;
    const detail: Record<string, number> = {};

    // 1. Lấy hoặc sử dụng context được truyền vào
    // let authorId = extraParams?.authorId;
    let receiverUnit = extraParams?.receiverUnit;

    if (receiverUnit === undefined) {
      try {
        // if (authorId === undefined) authorId = await this.documentsService.getAuthorIdIfAuthorized(_userId);
        if (receiverUnit === undefined) {
          const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'parent'],
            relations: ['parent'],
          });
          receiverUnit = user?.parent?.id || null;
        }
      } catch (err) {
        console.warn('[buildCountMapFromCountList] Context fetch failed:', err.message);
      }
    }

    // 2. Xác định userId thực tế (nếu có ủy quyền)
    const isAuthorized = /uq$/i.test(processFn);
    // const userId = authorId && isAuthorized ? authorId : _userId;

    // 3. Thực hiện các hàm đếm TUẦN TỰ (Sequential) thay vì Promise.all vô hạn
    for (const entry of countListEntries) {
      let fnName: string;
      let entryParams: any = {};

      if (typeof entry === 'string') {
        fnName = entry;
      } else if (typeof entry === 'object' && entry !== null) {
        fnName = entry.handler;
        entryParams = entry.params || {};
      } else {
        continue;
      }

      const fn = (this.countService as any)[fnName];
      if (typeof fn !== 'function') {
        console.warn(`[COUNT] Hàm không tồn tại: ${fnName}`);
        continue;
      }

      try {
        // Gộp tham số: mặc định + tham số từ DB + tham số bổ sung từ context/code
        const finalArgs = {
          userId,
          receiverUnit,
          processFn,
          ...entryParams,
          ...(extraParams ?? {}),
        };

        const rs = await fn.call(this.countService, finalArgs);
        const count = Number((rs as any)?.total ?? rs ?? 0);

        // Cập nhật kết quả
        total += count;
        detail[fnName] = (detail[fnName] || 0) + count;
      } catch (err: any) {
        console.error(`[COUNT ERROR DETAIL] Function ${fnName} for ${processFn} failed:`, err?.message || err);
      }
    }
    return { total, detail };
  }

  async findAllMenuWithFeature(queryParams: QueryParams, userId: string) {
    try {
      const {
        page = 1,
        limit = 9999,
        sort = '-createdAt',
        ...filters
      } = queryParams;

      // === SUPER ADMIN BYPASS ===
      if (await this.isSuperAdminByAnyId(userId)) {
        return this.getAllMenusForSuperAdmin(queryParams);
      }

      // === VALIDATE FILTERS ===
      const invalidKeys = Object.keys(filters).filter((key) =>
        /[<>\[\]{}|\\^% ]/.test(String(filters[key])),
      );
      if (invalidKeys.length > 0) {
        return {
          success: false,
          message: 'Tìm kiếm không được chứa ký tự đặc biệt',
        };
      }

      // === QUERY BUILDER ===
      const qb = this.menuRepo
        .createQueryBuilder('m')
        .where('m.status = :status', { status: STATUS.ACTIVED });

      if (filters.code) {
        qb.andWhere('m.code LIKE :code', { code: `%${filters.code}%` });
      }
      if (filters.name) {
        qb.andWhere('m.name LIKE :name', { name: `%${filters.name}%` });
      }
      // if (filters.hidden) {
      //   qb.andWhere('m.hidden = :hidden', { hidden: 1 });
      // }
      qb.loadAllRelationIds({
        relations: ['parent'],
      });

      // await this.applyRoleGroupFilter(qb, 'm', userId);

      // === PHÂN TRANG & SORT ===
      const pageNum = Math.max(parseInt(page as any, 10) || 1, 1);
      const limitNum = Math.min(
        Math.max(parseInt(limit as any, 10) || 10, 1),
        9999,
      );
      const skip = (pageNum - 1) * limitNum;

      // === XỬ LÝ SORT – HỖ TRỢ ĐẦY ĐỦ STRING & OBJECT (SỬA LỖI NÀY) ===
      let orderByOptions: Record<string, 'ASC' | 'DESC'> = {
        'm.createdAt': 'DESC',
      }; // default

      if (sort) {
        try {
          // Nếu sort là string JSON (do URL encode), thử parse
          let parsedSort: any = sort;

          if (typeof sort === 'string') {
            // Trường hợp frontend gửi JSON encode: %7B"field":1%7D
            if (sort.includes('{') || sort.includes('[')) {
              parsedSort = JSON.parse(sort);
            } else {
              // Trường hợp string bình thường: "createdAt", "-name", "+code"
              const field = sort.startsWith('-')
                ? sort.substring(1)
                : sort.startsWith('+')
                  ? sort.substring(1)
                  : sort;

              if (field) {
                orderByOptions = {
                  [`m.${field}`]: sort.startsWith('-') ? 'DESC' : 'ASC',
                };
              }
            }
          }

          // Nếu là object (từ JSON.parse hoặc gửi trực tiếp)
          if (
            typeof parsedSort === 'object' &&
            parsedSort !== null &&
            !Array.isArray(parsedSort)
          ) {
            orderByOptions = {};
            const allowedFields = [
              'id',
              'name',
              'code',
              'order',
              'createdAt',
              'updatedAt',
              'function',
              'path',
            ]; // whitelist để tránh injection

            Object.entries(parsedSort).forEach(([field, direction]) => {
              const cleanField = field.trim();
              if (allowedFields.includes(cleanField)) {
                const dir =
                  direction === 1 ||
                    direction === '1' ||
                    direction === 'asc' ||
                    direction === 'ASC'
                    ? 'ASC'
                    : 'DESC';
                orderByOptions[`m.${cleanField}`] = dir;
              }
            });
          }
        } catch (error) {
          console.warn('Invalid sort parameter, using default', error);
          // Giữ default
        }
      }

      // Nếu không có field hợp lệ → dùng default
      if (Object.keys(orderByOptions).length === 0) {
        orderByOptions = { 'm.createdAt': 'DESC' };
      }

      // === LẤY DATA MENU ===
      const [data, total] = await qb
        .orderBy(orderByOptions)
        .skip(skip)
        .take(limitNum)
        .getManyAndCount();

      if (data.length === 0) {
        return {
          data: [],
          total: 0,
          page: pageNum,
          limit: limitNum,
          totalPages: 0,
        };
      }

      const codes = [
        ...new Set(
          data
            .map((item) => item.function)
            .filter((code): code is string => Boolean(code)),
        ),
      ];

      let countFeaturesResult: any[];
      // const now = Date.now();
      // const datausers = await this.usersService.findProcessRoleInfoById(userId);

      // countFeaturesResult = await this.featureManagementRepo
      //   .createQueryBuilder('f')
      //   .select(['f.code', 'f.authorizedFunction'])
      //   .where('f.status = 1 AND f.is_count = 1')
      //   .getMany();
      // this.countFeaturesCache = {
      //   data: countFeaturesResult,
      //   timestamp: now,
      // };
      const featuresResult =
        codes.length > 0
          ? await this.featureManagementRepo
            .createQueryBuilder('f')
            .select(['f.code', 'f.url AS path', 'f.featureType AS type'])
            .where('f.code IN (:...codes)', { codes })
            .getRawMany()
          : [];

      let featureMap: Record<string, { path: string; type: string }> = {};
      if (featuresResult.length > 0) {
        featureMap = featuresResult.reduce(
          (map, f) => {
            if (!f.f_code) {
              return map;
            }
            map[f.f_code] = {
              path: f.path || '',
              type: f.type || '',
            };
            return map;
          },
          {} as Record<string, { path: string; type: string }>,
        );
      }

      // // === BUILD COUNT CODES ===
      // const countFeatures = countFeaturesResult;
      // // Loại bỏ duplicate và null/undefined
      // const countCodes = [
      //   ...new Set(
      //     countFeatures
      //       .flatMap((f) => [f.code, f.authorizedFunction])
      //       .filter((code): code is string => Boolean(code)),
      //   ),
      // ];

      // const userRoles: string[] = datausers.roles || [];
      // const commonCodes = (userId !== authorId)
      //   ? this.getCommonStrings(countCodes, userRoles)
      //   : countCodes;
      // // === GỌI getCountsSummary (có thể timeout nếu quá nhiều) ===
      // let counts: Record<string, number> = {};
      // if (userId && countCodes.length > 0) {
      //   try {
      //     // Gọi với timeout ngắn hơn để tránh block quá lâu
      //     const countsPromise = this.documentsService.getCountsSummary(
      //       userId,
      //       commonCodes,
      //     );

      //     // Timeout 15 giây cho getCountsSummary
      //     const timeoutPromise = new Promise<Record<string, number>>(
      //       (_, reject) =>
      //         setTimeout(() => reject(new Error('Count summary timeout')), 20000),
      //     );

      //     counts = await Promise.race([countsPromise, timeoutPromise]);
      //   } catch (error) {
      //     console.error('Error fetching counts for menu:', error);
      //     counts = {}; 
      //   }
      // }

      // const countMap: Record<string, number> = {};

      // countFeatures.forEach((f) => {
      //   if (f.code) {
      //     const totalForThisMenu =
      //       (counts[f.code] ?? 0) + 0;
      //     countMap[f.code] = totalForThisMenu;
      //   }
      // });

      // countMap['TraCuuVbDi'] = 0;

      const formattedData = data.map((item) => {
        const code = item.function || '';
        const featureInfo = featureMap[code] || { path: '', type: '' };

        return {
          ...item,
          parent: item.parent || null,
          path: item.path || '',
          function: {
            code,
            path: featureInfo.path,
            type: featureInfo.type,
            // count: countMap[code] ?? 0, // tự động lấy count theo code
          },
        };
      });

      return {
        data: formattedData,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (error) {
      console.error('Error in findAllMenuWithFeature:', error);
      throw error;
    }
  }
  async deleteManyByIds(ids: string[]) {
    const validIds = ids.filter((_id) => typeof _id === 'string' && _id.trim());
    if (validIds.length === 0) return false;

    const res = await this.menuRepo.update(
      { _id: In(validIds) },
      { status: STATUS.DELETED },
    );
    if ((res.affected || 0) > 0) {
      await this.clearCache();
    }
    return (res.affected || 0) > 0;
  }

  async findById(_id: string): Promise<{ data: any }> {
    const unit = await this.menuRepo.findOne({
      where: { _id, status: STATUS.ACTIVED },
      relations: ['parent'],
    });
    if (!unit) throw new BadRequestException('Không tìm thấy đơn vị');

    let roleGroups: any[] = [];
    if (unit.roleGroupIds && unit.roleGroupIds.length > 0) {
      const groups = await this.groupUserRepo.find({
        where: { id: In(unit.roleGroupIds), status: 1 },
      });
      roleGroups = groups.map((g) => ({
        id: g.id,
        _id: g.id,
        name: g.name,
        code: g.code,
      }));
    }

    const { roleGroupIds, ...restUnit } = unit as any;
    const mappedUnit = {
      ...restUnit,
      parent: unit.parent?._id || null,
      roleGroups,
    };
    return { data: mappedUnit };
  }

  async findByIdUpdate(_id: string): Promise<{ data: MenuManagerEntity }> {
    const unit = await this.menuRepo.findOne({
      where: { _id, status: STATUS.ACTIVED },
      relations: ['parent'],
    });
    if (!unit) throw new BadRequestException('Không tìm thấy đơn vị');
    return { data: unit };
  }

  async update(
    _id: string,
    updateDto: UpdateMenuManagerDto,
  ): Promise<MenuManagerEntity> {
    const unit = await this.menuRepo.findOne({
      where: { _id, status: STATUS.ACTIVED },
      relations: ['parent'],
    });
    if (!unit) {
      throw new BadRequestException(`Không tìm thấy đơn vị với ID ${_id}`);
    }

    // Store old path to find children later
    const oldPath = unit.path;

    if (updateDto.code && updateDto.code !== unit.code) {
      const dup = await this.menuRepo.findOne({
        where: { code: updateDto.code, status: STATUS.ACTIVED },
      });
      if (dup) {
        throw new BadRequestException(`Mã đơn vị ${updateDto.code} đã tồn tại`);
      }
    }

    // Determine the new parent, if it's being changed.
    let parentToSet: MenuManagerEntity | null | undefined = unit.parent;
    if (updateDto.hasOwnProperty('parent')) {
      if (updateDto.parent === null) {
        parentToSet = null;
      } else {
        if (updateDto.parent === _id) {
          throw new BadRequestException('Không thể gán đơn vị cha là chính nó');
        }
        const potentialParent = await this.menuRepo.findOne({
          where: { _id: updateDto.parent, status: STATUS.ACTIVED },
        });
        if (!potentialParent) {
          throw new BadRequestException('Đơn vị cha không tồn tại hoặc không hoạt động');
        }
        // Cycle detection: prevent moving a node into its own descendant
        if (potentialParent.path && unit.path && potentialParent.path.startsWith(unit.path)) {
          throw new BadRequestException('Không thể di chuyển một menu vào bên trong con của nó.');
        }
        parentToSet = potentialParent;
      }
    }

    const merged = this.menuRepo.merge(unit, {
      ...updateDto,
      parent: parentToSet || undefined,
    });

    // Correctly update the path for the node itself
    if (merged.parent) {
      merged.path = `${merged.parent.path}/${merged._id}`;
    } else {
      merged.path = merged._id;
    }

    const saved = await this.menuRepo.save(merged);

    // If path has changed, update all descendants
    if (saved.path !== oldPath) {
      const children = await this.menuRepo
        .createQueryBuilder('m')
        .where('m.path LIKE :pattern', { pattern: `${oldPath}/%` })
        .getMany();

      if (children.length > 0) {
        for (const child of children) {
          if (child.path) {
            child.path = child.path.replace(oldPath as string, saved.path as string);
          }
        }
        await this.menuRepo.save(children);
      }
    }

    await this.clearCache(); // Clear cache on update
    return saved;
  }

  // API đồng bộ lại toàn bộ path (One-time script)
  async fixPaths(): Promise<string> {
    // Lấy tất cả menu (không lọc status để đảm bảo cây trọn vẹn)
    const allMenus = await this.menuRepo.find({
      relations: ['parent'],
    });

    const childrenMap = new Map<string, MenuManagerEntity[]>();
    const roots: MenuManagerEntity[] = [];

    // Xây dựng cấu trúc cây
    for (const menu of allMenus) {
      if (!menu.parent) {
        roots.push(menu);
      } else {
        const pId = menu.parent._id;
        if (!childrenMap.has(pId)) {
          childrenMap.set(pId, []);
        }
        childrenMap.get(pId)?.push(menu);
      }
    }

    let updatedCount = 0;
    const toSave: MenuManagerEntity[] = [];
    const queue: { node: MenuManagerEntity; calculatedPath: string }[] = [];

    // Đưa các node gốc vào queue
    for (const root of roots) {
      queue.push({ node: root, calculatedPath: root._id });
    }

    // Duyệt cây (BFS)
    while (queue.length > 0) {
      const { node, calculatedPath } = queue.shift()!;

      // Nếu path hiện tại sai, cập nhật lại
      if (node.path !== calculatedPath) {
        node.path = calculatedPath;
        toSave.push(node);
        updatedCount++;
      }

      // Tiếp tục với các con
      const children = childrenMap.get(node._id);
      if (children) {
        for (const child of children) {
          queue.push({
            node: child,
            calculatedPath: `${calculatedPath}/${child._id}`,
          });
        }
      }
    }

    // Lưu xuống DB (batch save)
    if (toSave.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < toSave.length; i += chunkSize) {
        await this.menuRepo.save(toSave.slice(i, i + chunkSize));
      }
    }

    if (updatedCount > 0) {
      await this.clearCache();
    }
    return `Đã đồng bộ path cho ${updatedCount} / ${allMenus.length} menu.`;
  }

  async delete(_id: string): Promise<{ deletedCount: number }> {
    // 1. Tìm menu cần xóa và lấy thông tin cha
    const target = await this.menuRepo.findOne({
      where: { _id },
      relations: ['parent'],
    });

    if (!target) {
      throw new NotFoundException(`Đơn vị với ID ${_id} không tồn tại`);
    }

    const oldPath = target.path || target._id;
    const newParent = target.parent || null;
    // Nếu có cha mới (ông nội), lấy path của ông nội. Nếu không (thành root), prefix là rỗng.
    const newPathPrefix = newParent ? (newParent.path || newParent._id) : null;

    // 2. Tìm tất cả con cháu đang hoạt động để cập nhật path
    const descendants = await this.menuRepo
      .createQueryBuilder('m')
      .where('m.path LIKE :pattern', { pattern: `${oldPath}/%` })
      .andWhere('m.status != :del', { del: STATUS.DELETED })
      .getMany();

    const toUpdate: MenuManagerEntity[] = [];

    for (const child of descendants) {
      // 3. Cập nhật Parent cho con trực tiếp
      // Con trực tiếp là con có path dạng: "OldPath/ChildID"
      const isDirectChild = child.path === `${oldPath}/${child._id}`;
      if (isDirectChild) {
        child.parent = newParent || undefined;
      }

      // 4. Tính toán Path mới
      // Cắt bỏ phần path của menu bị xóa khỏi đầu chuỗi
      const suffix = (child.path || '').substring(oldPath.length); // VD: "/ChildID/GrandChildID"

      if (newPathPrefix) {
        // Nối vào path của cha mới: "GrandParentPath/ChildID..."
        child.path = `${newPathPrefix}${suffix}`;
      } else {
        // Trở thành root: Bỏ dấu "/" ở đầu nếu có -> "ChildID..."
        child.path = suffix.startsWith('/') ? suffix.substring(1) : suffix;
      }
      toUpdate.push(child);
    }

    // Lưu thay đổi cho các con
    if (toUpdate.length > 0) {
      await this.menuRepo.save(toUpdate);
    }

    // 5. Xóa mềm menu target
    const newCode = target.code
      ? `${target.code}_deleted_${target._id}`
      : `deleted_${target._id}`;

    await this.menuRepo.update(
      { _id: target._id },
      { status: STATUS.DELETED, code: newCode },
    );

    await this.clearCache(); // Clear cache on delete
    return { deletedCount: 1 };
  }

  private async buildFeatureMap(
    codes: string[],
  ): Promise<any[]> {
    if (!codes.length) return [];
    const list = await this.featureManagementRepo
      .createQueryBuilder('f')
      .select(['f.code', 'f.url AS path', 'f.featureType AS type'])
      .where('f.code IN (:...codes)', { codes })
      .getRawMany()
    return list;
  }

  /**
   * Đồng bộ dữ liệu từ Mongo (menu_managers collection) sang MSSQL.
   * - Giữ nguyên _id (_id) làm khoá chính bên SQL để không vỡ quan hệ parent/path.
   * - Không ghi đè path nếu đã có; ưu tiên path từ Mongo.
   */
  // async syncFromMongo(): Promise<{
  //   total: number;
  //   synced: number;
  //   errors: any[];
  // }> {
  //   const mongoMenus = await this.mongoMenuModel.find({}).lean();
  //   const total = mongoMenus.length;
  //   const errors: any[] = [];
  //   let synced = 0;

  //   for (const doc of mongoMenus) {
  //     const _id = String(doc._id);
  //     try {
  //       const parentId = doc.parent ? String(doc.parent) : null;
  //       const entity: Partial<MenuManagerEntity> = {
  //         _id: _id,
  //         name: doc.name,
  //         code: doc.code,
  //         settingIcon: doc.settingIcon,
  //         hidden: Boolean(doc.hidden),
  //         dynamicMenu:
  //           doc.dynamicMenu !== undefined ? Boolean(doc.dynamicMenu) : true,
  //         order: doc.order ?? undefined,
  //         function: doc.function ? String(doc.function) : undefined, // Ensure it's a string or undefined
  //         status: doc.status ?? STATUS.ACTIVED,
  //         path: doc.path ? String(doc.path) : undefined, // Ensure it's a string or undefined
  //         managers: Array.isArray(doc.managers)
  //           ? doc.managers.map((m: any) => String(m))
  //           : [],
  //         groupUsers: Array.isArray(doc.groupUsers)
  //           ? doc.groupUsers.map((g: any) => String(g))
  //           : [],
  //         parent: parentId ? ({ _id: parentId } as any) : undefined,
  //         codeRouter: doc.codeRouter ? String(doc.codeRouter) : undefined,
  //       };

  //       await this.menuRepo.save(entity);
  //       synced++;
  //     } catch (e: any) {
  //       console.log('doc', doc);
  //       console.log(e);
  //       errors.push({ _id, error: e.message });
  //     }
  //   }

  //   return { total, synced, errors };
  // }
}

