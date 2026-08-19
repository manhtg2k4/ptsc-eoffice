// src/database/repositories/mongoRepo.ts
import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { ListRoleEntity } from 'src/list-role/entities/list-role.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { AgencyEntity } from 'src/orgationies/agencies.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { removeVietnameseTones } from 'src/utils/util';
import { STATUS } from 'src/variables/CONST_STATUS';
import { Brackets, In, Raw, Repository } from 'typeorm';
import { USER_PERMISSION_ASSIGNMENT } from 'src/variable/CONST_STATUS';

export interface UserInfo {
  _id: string;
  name: string;
  username?: string | null;
  codeND?: string | null;
  position?: string | null;
  role?: string | null;
  parent?: string | null;     // cũng nên thêm null nếu DB có thể trả null
  parentType?: string | null;
  orgType?: string | null;
  organizationName?: string | null;
  organizationCode?: string | null;
  rootOrganizationName?: string | null;
  rootOrganizationCode?: string | null;
  types?: string;
  leader?: string | null;
  personalSecretary?: string | null;
}


// Interface chính xác cho document trả về từ rolefeatures
export interface RoleFeatureDocument extends Document {
  processKey: string;
  roles?: Array<{
    name?: string;
    roleCode: string;
    users: string[];
    permissions?: string[];
  }>;
}
export interface OrganizationUnitDocument {
  _id: string;

  name: string;
  code: string;
  type: string;

  phoneNumber?: string | null;
  email?: string | null;

  leader?: string | null;
  position?: string | null;

  address?: string | null;
  description?: string | null;

  permissions?: string[] | null;

  order?: number | null;
  parent?: string | null;

  status: number;
  path?: string;

  managers?: Array<string>;
  groupUsers?: Array<string>;

  createdAt?: Date | string;
  updatedAt?: Date | string;

  __v?: number;

  // Thêm field bạn đã gán trong code
  types?: 'company' | 'user';
}

@Injectable()
export class SQLSVRepository {
  private readonly logger = new Logger(SQLSVRepository.name);
  private readonly lookupCacheTtl = 3 * 60 * 1000;
  private readonly userByIdCache = new Map<string, { value: any; expiry: number }>();
  private readonly agencyByIdCache = new Map<string, { value: any; expiry: number }>();
  private readonly organizationUnitByIdCache = new Map<string, { value: any; expiry: number }>();
  private readonly usersByIdsCache = new Map<string, { value: any[]; expiry: number }>();
  private readonly organizationUnitsByIdsCache = new Map<string, { value: any[]; expiry: number }>();

  constructor(

    @InjectRepository(BpmnDesignEntity, 'mssqlConnection')
    private readonly bpmnDesignEntity: Repository<BpmnDesignEntity>,
    @InjectRepository(RoleFeatureEntity, 'mssqlConnection')
    private readonly roleFeaturesRepository: Repository<RoleFeatureEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AgencyEntity, 'mssqlConnection')
    private readonly agencyRepository: Repository<AgencyEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly organizationUnitRepository: Repository<OrganizationUnitEntity>,

    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserRepo: Repository<GroupUserEntity>,

    @InjectRepository(ListRoleEntity, 'mssqlConnection')
    private readonly listRoleEntity: Repository<ListRoleEntity>,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
    @Optional() @Inject('REDIS_CLIENT') private readonly redisClient?: any,
  ) {
    // this.client = client;
    // this.db = client.db();
  }

  private async getRedisBackedCache<T>(
    cache: Map<string, { value: T; expiry: number }>,
    key: string,
  ): Promise<T | null> {
    const now = Date.now();
    const local = cache.get(key);
    if (local && local.expiry > now) {
      return local.value;
    }

    try {
      const cached = await this.redisClient?.get(`outgoing_map:${key}`);
      if (!cached) return null;

      const parsed = JSON.parse(cached) as T;
      cache.set(key, { value: parsed, expiry: now + this.lookupCacheTtl });
      return parsed;
    } catch {
      return null;
    }
  }

  private async setRedisBackedCache<T>(
    cache: Map<string, { value: T; expiry: number }>,
    key: string,
    value: T,
  ): Promise<void> {
    cache.set(key, { value, expiry: Date.now() + this.lookupCacheTtl });
    try {
      await this.redisClient?.set(`outgoing_map:${key}`, JSON.stringify(value), 'PX', this.lookupCacheTtl);
    } catch {
      // ignore redis cache errors
    }
  }

  private buildIdsCacheKey(prefix: string, ids: string[], extra?: string): string {
    const normalizedIds = Array.from(new Set((ids || []).map((id) => String(id || '').trim()).filter(Boolean))).sort();
    return `${prefix}:${normalizedIds.join(',')}${extra ? `:${extra}` : ''}`;
  }

  // public get usersCollection(): Collection<WithId<Document>> {
  //   return this.db.collection('users');
  // }

  // public get roleFeaturesCollection(): Collection<RoleFeatureDocument> {
  //   return this.db.collection<RoleFeatureDocument>('rolefeatures');
  // }
  // public get agentciesCollection(): Collection<any> {
  //   return this.db.collection<any>('agencies');
  // }

  // Tìm người dùng theo roleCode để gửi notification
  // ✅ MỚI: Dùng bảng roles_process thay vì parse JSON roles_dynamic
  async findUsersByRoleCodes(
    roleCodes: string[],
    processKey?: string,
  ): Promise<{ id: number }[]> {
    if (!roleCodes?.length) return [];

    const manager = this.groupUserRepo.manager;

    // BƯỚC 1: Tìm role_id từ bảng roles_process (dùng createQueryBuilder để hỗ trợ IN clause)
    const roleQb = this.groupUserRepo.manager.createQueryBuilder()
      .select(['rp.id AS id'])
      .from('roles_process', 'rp')
      .where('rp.role_code IN (:...roleCodes)', { roleCodes })
      .andWhere('rp.is_active = 1');

    if (processKey) {
      roleQb.andWhere('rp.process_key = :processKey', { processKey });
    }

    const roles = await roleQb.getRawMany();
    if (!roles.length) return [];

    const roleIds = roles.map((r: any) => r.id);

    // BƯỚC 2: Tìm group_id từ bảng roles_process_groups
    // Query: SELECT group_id FROM roles_process_groups WHERE role_id IN (...)
    const groupRows = await manager.query(`
      SELECT DISTINCT rpg.group_id AS id
      FROM roles_process_groups rpg
      WHERE rpg.role_id IN (${roleIds.map((_, i) => `@${i}`).join(',')})
    `, roleIds);

    if (!groupRows.length) return [];

    const matchedGroupIds = groupRows.map((g: any) => g.id);

    // BƯỚC 3: Tìm User ID thuộc các Group thỏa mãn điều kiện
    const rawResults = await manager.query(`
      SELECT DISTINCT ugu.user_id AS id
      FROM user_group_users ugu
      INNER JOIN users u ON u.id = ugu.user_id AND u.status = 1
      WHERE ugu.group_user_id IN (${matchedGroupIds.map((_, i) => `@${i}`).join(',')})
    `, matchedGroupIds);

    // remove duplicate by id
    const uniqueUsers: { id: number }[] = [
      ...(new Map(
        rawResults.map((u: any) => [u.id, { id: u.id }])
      ).values() as Iterable<{ id: number }>),
    ];

    return uniqueUsers;
  }

  public get agenciesRepository(): Repository<AgencyEntity> {
    return this.agencyRepository;
  }

  // public get configurationsCollection(): Collection<ConfigurationDocument> {
  //   return this.db.collection<ConfigurationDocument>('configurations');
  // }

  // public get organizationUnitCollection(): Collection<OrganizationUnitDocument> {
  //   return this.db.collection<OrganizationUnitDocument>('organizationunits');
  // }
  // public get bpmnDesignsCollection(): Collection<BpmnDesignDocument> {
  //   return this.db.collection<BpmnDesignDocument>('bpmndesigns');
  // }
  /**
   * Lấy danh sách user theo roleCode (codeND) và status = 1
   */
  async getUsersByRoleMongoDB(roleCode: string): Promise<UserInfo[]> {
    try {
      const users = await this.userRepository.find({
        where: {
          codeND: roleCode,
          status: 1,
        },
        select: {
          id: true,
          name: true,
        },
      });

      return users.map((u) => ({
        _id: u.id,
        name: u.name ?? 'Không rõ tên',
      }));
    } catch (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }
  }
  async getUsersRolesByProcessMongoDB(
    roleCode: string,
    processKey: string,
  ): Promise<UserInfo[]> {
    try {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select(['user.id', 'user.name'])
        .where('user.status = :status', { status: 1 })
        .andWhere(
          `EXISTS (
            SELECT 1 
            FROM OPENJSON(CASE WHEN ISJSON(user.roles_by_process) > 0 THEN user.roles_by_process ELSE '[]' END) AS rp
            CROSS APPLY OPENJSON(JSON_QUERY(rp.value, '$.roles')) AS r
            WHERE JSON_VALUE(r.value, '$.roleCode') = :roleCode
          )`,
          { roleCode },
        )
        .getMany();

      return users.map((user) => ({
        _id: user.id,
        name: user.name || 'Không rõ tên',
      }));
    } catch (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }
  }
  /**
   * Lấy danh sách user theo roleCode (codeND) và status = 1
   */
  async getUsersByRole(roleCode: string): Promise<UserInfo[]> {
    try {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select(['user.id', 'user.name'])
        .where('user.codeND = :roleCode', { roleCode })
        .andWhere('user.status = :status', { status: 1 })
        .getMany();

      return users.map((user) => ({
        _id: user.id,
        name: user.name ?? 'Không rõ tên',
      }));
    } catch (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }
  }
  async getUsersRolesByProcess(roleCode: string): Promise<UserInfo[]> {
    try {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select(['user.id', 'user.name'])
        .where('user.status = :status', { status: 1 })
        .andWhere(
          `EXISTS (
            SELECT 1 
            FROM OPENJSON(CASE WHEN ISJSON(user.roles_by_process) > 0 THEN user.roles_by_process ELSE '[]' END) AS rp
            CROSS APPLY OPENJSON(JSON_QUERY(rp.value, '$.roles')) AS r
            WHERE JSON_VALUE(r.value, '$.roleCode') = :roleCode
          )`,
          { roleCode },
        )
        .getMany();

      return users.map((user) => ({
        _id: user.id,
        name: user.name || 'Không rõ tên',
      }));
    } catch (error) {
      console.error('Error fetching users by role in process:', error);
      return [];
    }
  }
  // Kiểm tra người dùng hiện tại có trong flow không 
  async isUserInFlow(userId: string, processKey: string): Promise<boolean> {
    const doc = await this.roleFeaturesRepository.findOne({
      where: { processKey },
      select: ['roles'],
    });

    if (!doc?.roles) return false;

    let roles: any[];

    try {
      roles =
        typeof doc.roles === 'string'
          ? JSON.parse(doc.roles)
          : doc.roles;
    } catch {
      return false;
    }

    for (const role of roles) {
      if (role?.users?.includes(userId)) {
        return true; // thấy là return luôn → nhanh
      }
    }

    return false;
  }

  /**
   * Lấy danh sách user tham gia trong một flow theo processKey và roleCode
   */

  private async getUserRoleCodes(userId: string, processKey: string): Promise<string[]> {
    try {
      const roles: any[] = await this.roleFeaturesRepository.manager.query(`
        SELECT DISTINCT rp.role_code AS roleCode
        FROM roles_process rp
        INNER JOIN roles_process_users rpu ON rp.id = rpu.role_id
        WHERE rpu.user_id = '${userId}' AND rp.process_key = '${processKey}' AND rp.is_active = 1

        UNION

        SELECT DISTINCT rp.role_code AS roleCode
        FROM roles_process rp
        INNER JOIN roles_process_groups rpg ON rp.id = rpg.role_id
        INNER JOIN user_group_users ugu ON ugu.group_user_id = rpg.group_id
        WHERE ugu.user_id = '${userId}' AND rp.process_key = '${processKey}' AND rp.is_active = 1
      `);
      return roles.map(r => r.roleCode).filter(Boolean);
    } catch (e) {
      this.logger.error(`Error in getUserRoleCodes for user ${userId}, process ${processKey}:`, e);
      return [];
    }
  }

  async getUserRole(userId: string, processKey: string) {
    // 1. Lấy đúng quy trình (tương đương $match: { processKey })
    const doc = await this.roleFeaturesRepository.findOne({
      where: { processKey },
      select: ['roles'], // chỉ cần roles
    });

    if (!doc || !doc.roles?.length) return null;

    const userRoleCodes = await this.getUserRoleCodes(userId, processKey);
    if (!userRoleCodes || userRoleCodes.length === 0) return null;

    // 2. Tìm role khớp với danh sách vai trò lấy được từ cấu trúc mới
    const foundRole = doc.roles.find(
      (r) => r && userRoleCodes.includes(r.roleCode),
    );

    if (!foundRole) return null;

    // 3. Trả về đúng cấu trúc MongoDB
    return {
      _id: foundRole.id, // id trong mảng roles (Mongo: roles._id)
      name: foundRole.name,
      roleCode: foundRole.roleCode,
      permissions: foundRole.permissions ?? [],
    };
  }

  async getUserPermissions(userId: string, processKey: string): Promise<string[]> {
    // 1. Lấy thông tin role_feature của quy trình
    const roleFeatureDoc = await this.roleFeaturesRepository.findOne({
      where: { processKey },
      select: ['roles'],
    });

    if (!roleFeatureDoc || !roleFeatureDoc.roles?.length) return [];

    const userRoleCodes = await this.getUserRoleCodes(userId, processKey);
    if (!userRoleCodes || userRoleCodes.length === 0) return [];

    // 2. Tổng hợp tất cả permissions từ các roleCode đã tìm thấy
    const allPermissions = new Set<string>();
    roleFeatureDoc.roles.forEach(r => {
      if (r && userRoleCodes.includes(r.roleCode) && Array.isArray(r.permissions)) {
        r.permissions.forEach(p => allPermissions.add(p));
      }
    });

    return Array.from(allPermissions);
  }

  async getUserFeatures(userId: string): Promise<{ results: Array<{ code: string; processID?: string }>; resProcessId: Array<{ code: string; processID?: string }> }> {
    try {
      const authorizedProcessKeys = new Set<string>();
      const results: Array<{ code: string; processID?: string }> = [];
      const resProcessId: Array<{ code: string; processID?: string }> = [];

      // 1. Lấy thông tin từ Nhóm (GroupUser -> roles_dynamic)
      const groupRoles = await this.groupUserRepo
        .createQueryBuilder('g')
        .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = g.id')
        .where('ugu.user_id = :userId', { userId })
        .andWhere('g.status = 1')
        .select('g.roles_dynamic', 'roles_dynamic')
        .getRawMany();

      groupRoles.forEach(gr => {
        const roles = typeof gr.roles_dynamic === 'string' ? JSON.parse(gr.roles_dynamic) : gr.roles_dynamic;
        if (Array.isArray(roles)) {
          roles.forEach(r => {
            if (r.processKey) authorizedProcessKeys.add(r.processKey);
            if (r.roleCode) {
              // Thêm vào results nếu chưa có
              if (!results.some(item => item.code === r.roleCode)) {
                results.push({ code: r.roleCode, processID: r.processKey });
              }
            }
          });
        }
      });

      // 2. Lấy ProcessKey từ bảng role_feature (JSON roles)
      const roleFeatures = await this.roleFeaturesRepository
        .createQueryBuilder('rf')
        .andWhere('rf.roles IS NOT NULL')
        .select(['rf.processKey', 'rf.roles'])
        .getMany();

      roleFeatures.forEach(rf => {
        const roles = rf.roles as any[];
        if (Array.isArray(roles)) {
          const isAssigned = roles.some(r => Array.isArray(r.users) && r.users.includes(userId));
          if (isAssigned) {
            authorizedProcessKeys.add(rf.processKey);
          }
        }
      });

      // 3. Từ ProcessKey, lấy Code từ bảng bpmn_design (trường related_processes)
      if (authorizedProcessKeys.size > 0) {
        const designs = await this.bpmnDesignEntity
          .createQueryBuilder('b')
          .where('b.id IN (:...keys)', {
            keys: Array.from(authorizedProcessKeys),
          })
          .andWhere('b.status = 1')
          .select(['b.id', 'b.relatedProcesses'])
          .getMany();

        // 2. Lấy feature_management
        const features = await this.featureManagementRepo
          .createQueryBuilder('f')
          .where('f.status = 1')
          .andWhere('f.processID IN (:...keys)', {
            keys: Array.from(authorizedProcessKeys),
          })
          .select(['f.processID'])
          .getMany();

        // 3. Tạo map processID từ feature_management
        const featureProcessMap = new Set(
          features.map(f => f.processID).filter(Boolean),
        );

        // 4. Mapping
        designs.forEach(d => {
          // Chỉ xử lý nếu processID tồn tại trong feature_management
          if (!featureProcessMap.has(d.id)) return;

          if (Array.isArray(d.relatedProcesses)) {
            d.relatedProcesses.forEach(code => {
              if (code) {
                resProcessId.push({
                  code,
                  processID: d.id, // processID của feature_management
                });
              }
            });
          }
        });
      }

      return { results, resProcessId };
    } catch (e) {
      console.error('[getUserFeatures Error]', e.message);
      return { results: [], resProcessId: [] };
    }
  }

  async getUserFeatureCodes(userId: string): Promise<string[]> {
    try {
      const featureCodes = new Set<string>();
      const roleCodesByProcess = new Map<string, Set<string>>();

      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'rolesByProcess'],
      });

      if (Array.isArray(user?.rolesByProcess)) {
        user.rolesByProcess.forEach((processRole: any) => {
          if (!processRole?.processKey || !Array.isArray(processRole.roles)) return;

          const roleSet = roleCodesByProcess.get(processRole.processKey) ?? new Set<string>();
          processRole.roles.forEach((role: any) => {
            if (role?.roleCode) roleSet.add(role.roleCode);
          });
          roleCodesByProcess.set(processRole.processKey, roleSet);
        });
      }

      const groupRoles = await this.groupUserRepo
        .createQueryBuilder('g')
        .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = g.id')
        .where('ugu.user_id = :userId', { userId })
        .andWhere('g.status = :status', { status: STATUS.ACTIVED })
        .select('g.roles_dynamic', 'roles_dynamic')
        .getRawMany();

      groupRoles.forEach((groupRole) => {
        const roles = typeof groupRole.roles_dynamic === 'string'
          ? JSON.parse(groupRole.roles_dynamic)
          : groupRole.roles_dynamic;

        if (!Array.isArray(roles)) return;

        roles.forEach((role: any) => {
          if (!role?.processKey || !role?.roleCode) return;

          const roleSet = roleCodesByProcess.get(role.processKey) ?? new Set<string>();
          roleSet.add(role.roleCode);
          roleCodesByProcess.set(role.processKey, roleSet);
        });
      });

      const roleFeatures = await this.roleFeaturesRepository.find({
        select: ['processKey', 'roles'],
      });

      roleFeatures.forEach((roleFeature) => {
        if (!Array.isArray(roleFeature.roles)) return;

        const roleSet = roleCodesByProcess.get(roleFeature.processKey) ?? new Set<string>();

        roleFeature.roles.forEach((role) => {
          if (Array.isArray(role.users) && role.users.includes(userId)) {
            roleSet.add(role.roleCode);
          }
        });

        if (roleSet.size === 0) return;

        roleFeature.roles.forEach((role) => {
          if (!roleSet.has(role.roleCode) || !Array.isArray(role.permissions)) return;
          role.permissions.forEach((permission) => {
            if (permission) featureCodes.add(permission);
          });
        });
      });

      const mappedFeatures = await this.getUserFeatures(userId);
      [...mappedFeatures.results, ...mappedFeatures.resProcessId].forEach((feature) => {
        if (feature.code) featureCodes.add(feature.code);
        if (feature.processID) featureCodes.add(feature.processID);
      });

      return Array.from(featureCodes);
    } catch (e) {
      console.error('[getUserFeatureCodes Error]', e instanceof Error ? e.message : String(e));
      return [];
    }
  }

  async getUsersInFlowv2(
    processKey: string,
    roleCode: string | string[],
    limit = 100,
    page = 1,
    userId?: string,
    checkAllowedUnits = false,
    parentNotNull = false,
  ): Promise<{ usersWithType: UserInfo[]; total: number }> {
    try {
      // 0. Lấy thông tin phòng ban ngang cấp và cấp cao hơn của user đang đăng nhập
      let allowedUnitIds: string[] = [];
      if (userId && checkAllowedUnits) {
        const currentUser = await this.userRepository.findOne({
          where: { id: userId },
          relations: ['parent'],
        });
        if (currentUser?.parent) {
          const unitId = currentUser.parent.id;
          const parentParentId = currentUser.parent.parentId;

          let siblingUnitIds: string[] = [];
          if (parentParentId) {
            const siblingUnits = await this.organizationUnitRepository.createQueryBuilder('ou')
              .select(['ou.id'])
              .where('ou.parentId = :parentParentId AND ou.status = 1', { parentParentId })
              .getRawMany(); // Dùng getRawMany để lấy thẳng giá trị thô từ DB, cực nhanh
            siblingUnitIds = siblingUnits.map(u => u.ou_id);
          }

          const mpath = currentUser.parent.mpath || '';
          const mpathUnits = mpath ? mpath.split('/').filter(Boolean) : [];
          allowedUnitIds = [...new Set([unitId, parentParentId, ...siblingUnitIds, ...mpathUnits])].filter(Boolean) as string[];
        }
      }

      // 1. Lấy cấu hình role trong flow
      // Với SQL Server, nếu roles được lưu dưới dạng JSON, cần query phù hợp
      const roleFeaturesQuery = this.roleFeaturesRepository
        .createQueryBuilder('rf')
        .select(['rf.id', 'rf.processKey', 'rf.roles'])
        .where('rf.processKey = :processKey', { processKey });

      const docs = await roleFeaturesQuery.getMany();

      // 2. Gom userIds theo role
      const userIds: string[] = [];

      for (const doc of docs) {
        const roles = doc.roles || [];

        for (const role of roles) {
          if (!role.users?.length) continue;

          // Kiểm tra roleCode có match không (match roleCode hoặc match trong permissions)
          const targetCodes = Array.isArray(roleCode) ? roleCode : [roleCode];
          const matched = targetCodes.some((rc) => {
            const code = rc.toLowerCase();
            return (
              role.roleCode?.toLowerCase() === code ||
              role.roleCode?.toLowerCase().includes(code) ||
              role.permissions?.some((p) => p.toLowerCase().includes(code))
            );
          });

          if (matched) {
            const users = role.users ?? [];
            users.forEach((id) => {
              // Hỗ trợ cả string và number ID, ép về string để so sánh
              const idStr = String(id);
              if (id && !userIds.includes(idStr)) {
                userIds.push(idStr);
              }
            });
          }
        }
      }

      if (!docs.length) {
        // Nếu không có cấu hình trong role_feature, vẫn thử lấy theo role mặc định của user
      }

      // 1.2. Lấy thêm user theo role mặc định (codeND) hoặc trong rolesByProcess
      const targetCodes = Array.isArray(roleCode) ? roleCode : [roleCode];

      // 1.2.1. Lấy user theo role mặc định codeND (sử dụng Index)
      const globalUsersQuery = this.userRepository
        .createQueryBuilder('user')
        .select(['user.id'])
        .where('user.status = :status', { status: 1 })
        .andWhere('user.codeND IN (:...targetCodes)', { targetCodes });

      const globalUsersByCode = await globalUsersQuery.getMany();

      globalUsersByCode.forEach((u) => {
        if (u.id && !userIds.includes(u.id)) {
          userIds.push(u.id);
        }
      });

      // 1.2.2. Lấy user theo roles_by_process bằng cách lọc LIKE nhanh trên DB, sau đó lọc in-memory
      const candidateUsersQuery = this.userRepository
        .createQueryBuilder('user')
        .select(['user.id', 'user.roles_by_process'])
        .where('user.status = :status', { status: 1 })
        .andWhere('user.roles_by_process LIKE :processKeyPattern', { processKeyPattern: `%${processKey}%` });

      const candidateUsers = await candidateUsersQuery.getMany();

      for (const u of candidateUsers) {
        if (!u.rolesByProcess || !Array.isArray(u.rolesByProcess)) continue;
        const matched = u.rolesByProcess.some((rp: any) => {
          if (rp.processKey !== processKey) return false;
          return rp.roles?.some((r: any) => targetCodes.includes(r.roleCode));
        });
        if (matched && !userIds.includes(u.id)) {
          userIds.push(u.id);
        }
      }

      // 1.3. Lấy thêm user từ GroupUser (roles_dynamic) - tối ưu bằng LIKE và lọc in-memory
      const targetCodesLower = targetCodes.map((code) => String(code).toLowerCase());
      const lowerProcessKey = processKey.toLowerCase();

      const candidateGroupsQuery = this.groupUserRepo
        .createQueryBuilder('g')
        .innerJoinAndSelect('g.users', 'u')
        .select([
          'g.id',
          'g.name',
          'g.code',
          'g.status',
          'g.roles_dynamic',
          'u.id',
          'u.status',
          'u.parent',
        ])
        .where('g.status = :status', { status: STATUS.ACTIVED })
        .andWhere('g.roles_dynamic LIKE :processKeyPattern', { processKeyPattern: `%${processKey}%` });

      const candidateGroups = await candidateGroupsQuery.getMany();

      candidateGroups.forEach((g) => {
        if (!g.roles_dynamic || !Array.isArray(g.roles_dynamic)) {
          return;
        }
        const matched = g.roles_dynamic.some((r: any) => {
          return r.processKey?.toLowerCase() === lowerProcessKey &&
            (r.roleCode ? targetCodesLower.includes(r.roleCode.toLowerCase()) : false);
        });
        if (matched) {
          (g.users || []).forEach((u) => {
            if (u.id && Number(u.status) === STATUS.ACTIVED && !userIds.includes(u.id)) {
              userIds.push(u.id);
            }
          });
        }
      });

      if (!userIds.length) {
        return { usersWithType: [], total: 0 };
      }

      let totalCount = 0;
      const users: UserEntity[] = [];
      const CHUNK_SIZE = 1000;

      for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
        const chunk = userIds.slice(i, i + CHUNK_SIZE);

        const countQuery = this.userRepository
          .createQueryBuilder('user')
          .where('user.id IN (:...chunk)', { chunk })
          .andWhere('user.status = :status', { status: 1 });

        const selectQuery = this.userRepository
          .createQueryBuilder('user')
          .leftJoin('user.parent', 'parent')
          .select([
            'user.id',
            'user.name',
            'user.codeND',
            'user.username',
            'user.position',
            'user.role',
            'user.organizationName',
            'user.organizationCode',
            'user.leader',
            'parent.id',
            'parent.name',
            'parent.code',
            'parent.mpath',
            'parent.type',
          ])
          .where('user.id IN (:...chunk)', { chunk })
          .andWhere('user.status = :status', { status: 1 });

        if (allowedUnitIds.length > 0) {
          countQuery.andWhere('user.parent IN (:...allowedUnitIds)', { allowedUnitIds });
          selectQuery.andWhere('user.parent IN (:...allowedUnitIds)', { allowedUnitIds });
        }

        if (parentNotNull) {
          countQuery.andWhere('user.parent IS NOT NULL');
          selectQuery.andWhere('user.parent IS NOT NULL');
        }

        const [chunkCount, chunkUsers] = await Promise.all([
          countQuery.getCount(),
          selectQuery.getMany(),
        ]);

        totalCount += chunkCount;
        users.push(...chunkUsers);
      }
      // 5. Map sang format UserInfo
      // 5. Thu thập toàn bộ ID tổ chức gốc từ mpath của parent
      const rootOrgIds = new Set<string>();
      users.forEach((u) => {
        if (u.parent?.mpath) {
          const parts = u.parent.mpath.split('/').filter(Boolean);
          if (parts.length > 0) {
            rootOrgIds.add(parts[0]);
          }
        } else if (u.parent?.id) {
          // Nếu không có mpath, coi chính nó là gốc (hoặc có thể nó là gốc rồi)
          rootOrgIds.add(u.parent.id);
        }
      });

      // 6. Lấy tên/code của các tổ chức gốc
      const rootOrgs =
        rootOrgIds.size > 0
          ? await this.organizationUnitRepository.find({
            where: { id: In(Array.from(rootOrgIds)) },
            select: ['id', 'name', 'code'],
          })
          : [];
      const rootOrgMap = new Map(rootOrgs.map((o) => [o.id, o]));

      // 7. Map sang format UserInfo
      const usersWithType = users.map((u) => {
        let rootOrgName: string | null = null;
        let rootOrgCode: string | null = null;

        if (u.parent?.mpath) {
          const parts = u.parent.mpath.split('/').filter(Boolean);
          if (parts.length > 0) {
            const root = rootOrgMap.get(parts[0]);
            if (root) {
              rootOrgName = root.name;
              rootOrgCode = root.code;
            }
          }
        } else if (u.parent?.id) {
          const root = rootOrgMap.get(u.parent.id);
          if (root) {
            rootOrgName = root.name;
            rootOrgCode = root.code;
          }
        }

        return {
          _id: u.id,
          name: u.name ?? 'Không rõ tên',
          codeND: u.codeND,
          username: u.username,
          position: u.position,
          role: u.role,
          leader: u.leader,
          parent: u.parent?.id,
          parentType: u.parent?.type || null,
          orgType: u.parent?.type || null,
          organizationName: u.organizationName || u.parent?.name || null,
          organizationCode: u.organizationCode || u.parent?.code || null,
          rootOrganizationName: rootOrgName,
          rootOrganizationCode: rootOrgCode,
          types: 'user',
        };
      });

      return {
        usersWithType,
        total: totalCount, // Trả về tổng số thực tế (không phải length của page hiện tại)
      };
    } catch (e) {
      console.error('Error in getUsersInFlow:', e);
      return { usersWithType: [], total: 0 };
    }
  }
  async getUsersInFlow(
    processKey: string,
    roleCode: string | string[],
    limit = 100,
    page = 1,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId?: string,
  ): Promise<{ usersWithType: UserInfo[]; total: number }> {
    try {
      // const _t0 = Date.now();
      const targetCodes = [...new Set(Array.isArray(roleCode) ? roleCode : [roleCode])];
      const safeProcessKey = processKey.replace(/'/g, "''");
      const roleCodeConditions = targetCodes.map(rc => {
        const safeRc = rc.replace(/'/g, "''");
        return `rp.role_code = '${safeRc}'`;
      }).join(' OR ');

      // console.log (`[getUsersInFlow:${processKey}] START roleCode=${JSON.stringify(targetCodes)} limit=${limit}`);

      const permissionAssignmentType = USER_PERMISSION_ASSIGNMENT.USING;
      let jsonDuration = 0;
      let rbacDuration = 0;
      const userIdsSet = new Set<string>();
      const jsonUserIdsSet = new Set<string>();
      const rbacUserIdsSet = new Set<string>();

      // --- JSON MODE ---
      if (permissionAssignmentType === USER_PERMISSION_ASSIGNMENT.JSON || permissionAssignmentType === USER_PERMISSION_ASSIGNMENT.JSON_RBAC) {
        const tJsonStart = Date.now();
        // 1. Lấy cấu hình role trong flow
        const roleFeaturesQuery = this.roleFeaturesRepository
          .createQueryBuilder('rf')
          .select(['rf.id', 'rf.processKey', 'rf.roles'])
          .where('rf.processKey = :processKey', { processKey });

        const docs = await roleFeaturesQuery.getMany();

        // 2. Gom userIds theo role
        const targetCodes = [...new Set(Array.isArray(roleCode) ? roleCode : [roleCode])];

        for (const doc of docs) {
          const roles = doc.roles || [];

          for (const role of roles) {
            // Kiểm tra roleCode có match không (match roleCode hoặc match trong permissions)
            const matched = targetCodes.some((rc) => {
              const code = rc.toLowerCase();
              return (
                role.roleCode?.toLowerCase() === code ||
                role.roleCode?.toLowerCase().includes(code) ||
                role.permissions?.some((p: string) => p.toLowerCase().includes(code))
              );
            });

            if (matched) {
              const users = role.users ?? [];
              users.forEach((id) => {
                const idStr = String(id);
                if (id) {
                  jsonUserIdsSet.add(idStr);
                }
              });
            }
          }
        }

        // 1.2.1. Lấy user theo role mặc định codeND (sử dụng Index)
        const targetCodesList = [...new Set(Array.isArray(roleCode) ? roleCode : [roleCode])];
        const globalUsersByCode = await this.userRepository
          .createQueryBuilder('user')
          .select(['user.id'])
          .where('user.status = :status', { status: 1 })
          .andWhere('user.codeND IN (:...targetCodesList)', { targetCodesList })
          .andWhere('user.parent IS NOT NULL')
          .getMany();

        globalUsersByCode.forEach((u) => {
          if (u.id) {
            jsonUserIdsSet.add(u.id);
          }
        });

        // 1.2.2. Lấy user theo roles_by_process bằng cách lọc chính xác qua OPENJSON ngay trên DB
        const matchedUsers = await this.userRepository
          .createQueryBuilder('user')
          .select(['user.id'])
          .where('user.status = :status', { status: 1 })
          .andWhere('user.parent IS NOT NULL')
          .andWhere(
            `EXISTS (
              SELECT 1
              FROM OPENJSON(CASE WHEN ISJSON(user.roles_by_process) > 0 THEN user.roles_by_process ELSE '[]' END)
              WITH (
                processKey nvarchar(100) '$.processKey',
                roles nvarchar(max) '$.roles' AS JSON
              ) p
              OUTER APPLY OPENJSON(p.roles)
              WITH (
                roleCode nvarchar(100) '$.roleCode'
              ) r
              WHERE p.processKey = :processKey
                AND r.roleCode IN (:...targetCodesList)
            )`,
            { processKey, targetCodesList }
          )
          .getMany();

        matchedUsers.forEach((u) => {
          if (u.id) {
            jsonUserIdsSet.add(u.id);
          }
        });

        // 1.3. Lấy thêm user từ GroupUser (roles_dynamic)
        const matchedGroupIds13 = await this.groupUserRepo
          .createQueryBuilder('g')
          .select('g.id AS id')
          .where('g.status = :status', { status: STATUS.ACTIVED })
          .andWhere(
            `EXISTS (
              SELECT 1 FROM OPENJSON(g.roles_dynamic)
              WITH (
                processKey NVARCHAR(100) '$.processKey',
                roleCode   NVARCHAR(100) '$.roleCode'
              ) j
              WHERE j.processKey = :processKey
                AND j.roleCode IN (:...targetCodesList)
            )`,
            { processKey, targetCodesList }
          )
          .getRawMany();

        if (matchedGroupIds13.length > 0) {
          const groupIds13 = matchedGroupIds13.map(g => g.id);
          const groupUserRows = await this.groupUserRepo.manager
            .createQueryBuilder()
            .select('ugu.user_id AS userId')
            .from('user_group_users', 'ugu')
            .innerJoin('users', 'u', 'u.id = ugu.user_id AND u.status = :uStatus AND u.parent IS NOT NULL', { uStatus: STATUS.ACTIVED })
            .where('ugu.group_user_id IN (:...groupIds13)', { groupIds13 })
            .getRawMany();

          groupUserRows.forEach((row) => {
            if (row.userId) {
              jsonUserIdsSet.add(row.userId);
            }
          });
        }
        jsonUserIdsSet.forEach((id) => {
          userIdsSet.add(id);
        });
        jsonDuration = Date.now() - tJsonStart;
        const jsonUserIds = Array.from(jsonUserIdsSet);
        this.logger.log(`[getUsersInFlow:${processKey}] JSON mode took ${jsonDuration}ms (Found ${jsonUserIds.length} user IDs)`);
      }

      // --- RBAC MODE ---
      if (permissionAssignmentType === USER_PERMISSION_ASSIGNMENT.RBAC || permissionAssignmentType === USER_PERMISSION_ASSIGNMENT.JSON_RBAC) {
        const tRbacStart = Date.now();
        const manager = this.userRepository.manager;

        // 1. Lấy user IDs gán trực tiếp (JOIN roles_process_users) - Tối ưu bằng Raw SQL
        const directUserRows = targetCodes.length > 0
          ? await manager.query<{ userId: string }[]>(`
              SELECT DISTINCT u.id AS userId
              FROM roles_process rp
              INNER JOIN roles_process_users rpu ON rpu.role_id = rp.id
              INNER JOIN users u ON u.id = rpu.user_id AND u.status = 1
              WHERE rp.process_key = '${safeProcessKey}'
                AND rp.is_active = 1
                AND (${roleCodeConditions})
                AND u.parent IS NOT NULL
            `).catch(() => [])
          : [];

        // 2. Lấy user IDs gán qua nhóm (JOIN roles_process_groups) - Tối ưu bằng Raw SQL
        // Luồng: roles_process -> roles_process_groups -> group_users -> user_group_users -> users
        const groupUserRows = targetCodes.length > 0
          ? await manager.query<{ userId: string }[]>(`
              SELECT DISTINCT u.id AS userId
              FROM roles_process rp
              INNER JOIN roles_process_groups rpg ON rpg.role_id = rp.id
              INNER JOIN group_users gu ON gu.id = rpg.group_id AND gu.status = 1
              INNER JOIN user_group_users ugu ON ugu.group_user_id = gu.id
              INNER JOIN users u ON u.id = ugu.user_id AND u.status = 1
              WHERE rp.process_key = '${safeProcessKey}'
                AND rp.is_active = 1
                AND (${roleCodeConditions})
                AND u.parent IS NOT NULL
            `).catch(() => [])
          : [];

        // Gộp user IDs từ Direct & Group vào rbacUserIdsSet
        directUserRows.forEach((row) => {
          if (row.userId) rbacUserIdsSet.add(row.userId);
        });
        groupUserRows.forEach((row) => {
          if (row.userId) rbacUserIdsSet.add(row.userId);
        });

        // 3. Lấy user IDs gán qua mã nhóm trực tiếp (không qua roles_process)
        const groupCodeConditions = targetCodes.map(rc => {
          const safeRc = rc.replace(/'/g, "''");
          return `gu.code = '${safeRc}'`;
        }).join(' OR ');

        const directGroupUserRows = targetCodes.length > 0
          ? await manager.query<{ userId: string }[]>(`
              SELECT DISTINCT ugu.user_id AS userId
              FROM group_users gu
              INNER JOIN user_group_users ugu ON ugu.group_user_id = gu.id
              INNER JOIN users u ON u.id = ugu.user_id AND u.status = 1
              WHERE (${groupCodeConditions})
                AND gu.status = 1
                AND u.parent IS NOT NULL
            `).catch(() => [])
          : [];

        directGroupUserRows.forEach((row) => {
          if (row.userId) rbacUserIdsSet.add(row.userId);
        });

        // 3. Lấy thêm user theo role mặc định codeND (sử dụng Index)
        const globalUsersByCode = await this.userRepository
          .createQueryBuilder('user')
          .select(['user.id'])
          .where('user.status = :status', { status: 1 })
          .andWhere('user.codeND IN (:...targetCodes)', { targetCodes })
          .andWhere('user.parent IS NOT NULL')
          .getMany();

        globalUsersByCode.forEach((u) => {
          if (u.id) {
            rbacUserIdsSet.add(u.id);
          }
        });

        rbacUserIdsSet.forEach((id) => {
          userIdsSet.add(id);
        });
        rbacDuration = Date.now() - tRbacStart;
        const rbacUserIds = Array.from(rbacUserIdsSet);
        this.logger.log(`[getUsersInFlow:${processKey}] RBAC mode took ${rbacDuration}ms (Found ${rbacUserIds.length} user IDs)`);
      }

      // --- BENCHMARK ---
      if (permissionAssignmentType === USER_PERMISSION_ASSIGNMENT.JSON_RBAC) {
        this.logger.log(
          `[getUsersInFlow:${processKey}] BENCHMARK RESULT:\n` +
          `  - JSON mode: ${jsonDuration}ms\n` +
          `  - RBAC mode: ${rbacDuration}ms\n` +
          `  -> Winner: ${rbacDuration < jsonDuration ? 'RBAC' : 'JSON'} (Diff: ${Math.abs(jsonDuration - rbacDuration)}ms)`
        );
      }

      const userIds = Array.from(userIdsSet);

      if (!userIds.length) {
        return { usersWithType: [], total: 0 };
      }

      // Tổng số user
      const totalCount = userIds.length;

      // Phân trang
      const skip = (page - 1) * limit;
      const pageIds = userIds.slice(skip, skip + limit);

      let users: UserEntity[] = [];
      if (pageIds.length > 0) {
        users = await this.userRepository
          .createQueryBuilder('user')
          .leftJoin('user.parent', 'parent')
          .select([
            'user.id',
            'user.name',
            'user.codeND',
            'user.position',
            'user.role',
            'user.organizationName',
            'user.organizationCode',
            'user.username',
            'user.leader',
            'user.personalSecretary',
            'parent.id',
            'parent.name',
            'parent.code',
            'parent.mpath',
            'parent.type',
          ])
          .where(
            `user.id IN (
              SELECT [value]
              FROM OPENJSON(:pageIdsJson)
              WITH (value NVARCHAR(100) '$')
            )`,
            { pageIdsJson: JSON.stringify(pageIds) }
          )
          .andWhere('user.status = :status', { status: 1 })
          .getMany();
      }
      // console.log (`[getUsersInFlow:${processKey}] Step2 page fetch count=${users.length} of total=${totalCount} | ${Date.now() - _t4}ms`);


      // 5. Thu thập toàn bộ ID tổ chức gốc từ mpath của parent
      const rootOrgIds = new Set<string>();
      users.forEach((u) => {
        if (u.parent?.mpath) {
          const parts = u.parent.mpath.split('/').filter(Boolean);
          if (parts.length > 0) {
            rootOrgIds.add(parts[0]);
          }
        } else if (u.parent?.id) {
          rootOrgIds.add(u.parent.id);
        }
      });

      // 6. Lấy tên/code của các tổ chức gốc
      const rootOrgs =
        rootOrgIds.size > 0
          ? await this.organizationUnitRepository.find({
            where: { id: In(Array.from(rootOrgIds)) },
            select: ['id', 'name', 'code'],
          })
          : [];
      const rootOrgMap = new Map(rootOrgs.map((o) => [o.id, o]));

      // 7. Map sang format UserInfo
      const usersWithType = users.map((u) => {
        let rootOrgName: string | null = null;
        let rootOrgCode: string | null = null;

        if (u.parent?.mpath) {
          const parts = u.parent.mpath.split('/').filter(Boolean);
          if (parts.length > 0) {
            const root = rootOrgMap.get(parts[0]);
            if (root) {
              rootOrgName = root.name;
              rootOrgCode = root.code;
            }
          }
        } else if (u.parent?.id) {
          const root = rootOrgMap.get(u.parent.id);
          if (root) {
            rootOrgName = root.name;
            rootOrgCode = root.code;
          }
        }

        return {
          _id: u.id,
          name: u.name ?? 'Không rõ tên',
          codeND: u.codeND,
          position: u.position,
          role: u.role,
          username: u.username,
          leader: u.leader,
          personalSecretary: u.personalSecretary,
          parent: u.parent?.id,
          parentType: u.parent?.type || null,
          orgType: u.parent?.type || null,
          organizationName: u.organizationName || u.parent?.name || null,
          organizationCode: u.organizationCode || u.parent?.code || null,
          rootOrganizationName: rootOrgName,
          rootOrganizationCode: rootOrgCode,
          types: 'user',
        };
      });

      return {
        usersWithType,
        total: totalCount,
      };
    } catch (e) {
      console.error('Error in getUsersInFlow:', e);
      return { usersWithType: [], total: 0 };
    }
  }
  async returnUser(prevUser: string, limit = 100, page = 1, name?: string) {
    const skip = (page - 1) * limit;

    // 1. Kiểm tra ID hợp lệ
    if (!prevUser || typeof prevUser !== 'string') {
      return { usersWithType: [], total: 0 };
    }

    /* ----------------------------------------------------
     * 2. Build filter giống Mongo
     * ---------------------------------------------------- */
    const qb = this.userRepository
      .createQueryBuilder('u')
      .leftJoin('u.parent', 'parent')
      .leftJoin('parent.parent', 'grandParent')
      .select([
        'u.id',
        'u.name',
        'u.username',
        'u.codeND',
        'u.position',
        'u.role',
        'parent.id',
        'parent.name',
        'grandParent.id',
        'grandParent.name',
      ])
      .where('u.id = :id', { id: prevUser })
      .andWhere('u.status = 1');

    // Nếu có name → thêm OR LIKE giống Mongo $or regex
    if (name && name.trim()) {
      const search = `%${name}%`;

      qb.andWhere(
        `(u.name LIKE :search 
      OR u.username LIKE :search
      OR u.codeND LIKE :search)`,
        { search },
      );
    }

    // 3. Đếm tổng (giống Mongo: total = data.length của page)
    qb.orderBy('u.id', 'DESC').skip(skip).take(limit);

    const usersData = await qb.getMany();
    const usersWithType = usersData.map((u) => ({
      _id: u.id,
      name: u.name ?? 'Không rõ tên',
      username: u.username,
      codeND: u.codeND,
      position: u.position,
      role: u.role,
      parent: u.parent?.id ?? null,
      parentName: u.parent?.name ?? null,
      grandParent: u.parent?.parent?.id ?? null,
      grandParentName: u.parent?.parent?.name ?? null,
      types: 'user',
    }));

    return {
      usersWithType,
      total: usersData.length,
    };
  }

  async getUserById(userId: string) {
    const cacheKey = typeof userId === 'string' ? `sqlsv:user:${userId.trim()}` : '';
    if (cacheKey) {
      const cached = await this.getRedisBackedCache<any>(this.userByIdCache, cacheKey);
      if (cached) return cached;
    }
    // 1. Kiểm tra ID hợp lệ (giữ nguyên logic như Mongo)
    if (!userId || typeof userId !== 'string') {
      return null;
    }

    // 2. Query TypeORM thay cho findOne + projection
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        status: 1,
      },
      relations: ['parent'],
      select: {
        id: true,
        name: true,
        username: true,
        codeND: true,
        emailUser: true,
        position: true,
        role: true,
        avatar: true,
        phoneNumberUser: true,
        organizationName: true,
        organizationCode: true,
        gender: true,
        birthday: true,
        googleEmail: true,
        leader: true,
        personalSecretary: true,
        parent: {
          id: true,
          name: true,
          code: true,
          type: true,
          mpath: true,
        },
      },
    });

    if (!user) return null;

    let rootOrgName: string | null = null;
    let rootOrgCode: string | null = null;

    if (user.parent?.mpath) {
      const parts = user.parent.mpath.split('/').filter(Boolean);
      if (parts.length > 0) {
        const root = await this.organizationUnitRepository.findOne({
          where: { id: parts[0] },
          select: ['id', 'name', 'code'],
        }).catch(() => null);
        if (root) {
          rootOrgName = root.name;
          rootOrgCode = root.code;
        }
      }
    } else if (user.parent?.id) {
      const root = await this.organizationUnitRepository.findOne({
        where: { id: user.parent.id },
        select: ['id', 'name', 'code'],
      }).catch(() => null);
      if (root) {
        rootOrgName = root.name;
        rootOrgCode = root.code;
      }
    }

    // Đảm bảo luôn có name hợp lệ (fallback: username -> codeND -> User_ID)
    const displayName =
      user.name || user.username || user.codeND || `User_${user.id}`;

    const normalized = {
      ...user,
      name: displayName,
      rootOrganizationName: rootOrgName,
      rootOrganizationCode: rootOrgCode,
      types: 'user',
    };
    if (cacheKey) {
      await this.setRedisBackedCache(this.userByIdCache, cacheKey, normalized);
    }
    return normalized;
  }
  /**
   * Lấy danh sách email của người dùng theo mảng ID
   * 
   * @param {string[]} userIds - Mảng ID của người dùng
   * @returns {Promise<string[]>} - Danh sách email của người dùng
   */
  async getEmailsByUserIds(userIds: string[]): Promise<string[]> {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return [];
    }

    const users = await this.userRepository.find({
      where: {
        id: In(userIds),
        status: 1,
      },
      select: {
        id: true,
        emailUser: true,
      },
    });

    return users
      .map(user => user.emailUser)
      .filter((email): email is string => !!email);
  }
  async getUsersByIds(userIds: string[]) {
    if (!userIds || userIds.length === 0) return [];
    const normalizedIds = Array.from(new Set((userIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
    const cacheKey = this.buildIdsCacheKey('sqlsv:users-by-ids', normalizedIds);
    const cached = await this.getRedisBackedCache<any[]>(this.usersByIdsCache, cacheKey);
    if (cached) return JSON.parse(JSON.stringify(cached));
    const startedAt = Date.now();
    const users = await this.userRepository.find({
      where: { id: In(normalizedIds), status: 1 },
      relations: ['parent'],
    });
    await this.setRedisBackedCache(this.usersByIdsCache, cacheKey, users);
    return users;
  }

  async getAgenciesByIds(orgIds: string[]): Promise<any[]> {
    const normalizedIds = Array.from(new Set((orgIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
    if (!normalizedIds.length) return [];

    const startedAt = Date.now();
    const agencies = await this.agencyRepository.find({
      where: { id: In(normalizedIds), status: 1 },
      select: {
        id: true,
        name: true,
        code: true,
      },
      relations: ['parent'],
    });

    const mapped = agencies.map((agency) => ({
      _id: agency.id,
      id: agency.id,
      name: agency.name,
      code: agency.code,
      types: 'user',
    }));
    return mapped;
  }

  /**
   * Lấy danh sách ID của phòng ban hiện tại và tất cả phòng ban con trong cây tổ chức.
   * Người dùng chức cao → thấy được tất cả orgId của phòng ban con.
   * Người dùng thường (không có cấp dưới) → vẫn trả về orgId phòng ban của chính họ.
   */
  async getSubordinateOrgIds(userId: string): Promise<string[]> {
    if (!userId) return [];

    const user = await this.userRepository.findOne({
      where: { id: userId, status: 1 },
      relations: ['parent'],
      select: { id: true, parent: { id: true, mpath: true } },
    });

    if (!user || !user.parent) {
      return [];
    }

    const orgId = user.parent.id;

    const subOrgs = await this.organizationUnitRepository
      .createQueryBuilder('org')
      .select('org.id')
      .where('org.status = 1')
      .andWhere(
        '(org.id = :orgId OR org.mpath LIKE :mpathPattern)',
        { orgId, mpathPattern: `%${orgId}%` }
      )
      .getMany();

    return subOrgs.map(o => o.id);
  }

  /**
   * Lấy danh sách userId của tất cả cán bộ cấp dưới trong cây tổ chức.
   * Người dùng chức cao → thấy được tất cả userId của phòng ban con.
   * Người dùng thường → chỉ thấy chính mình.
   * @param userId - ID của người dùng hiện tại
   * @returns Danh sách userId bao gồm cả bản thân và cấp dưới
   */
  async getSubordinateUserIds(userId: string): Promise<string[]> {
    if (!userId) return [];

    // 1. Lấy phòng ban của user hiện tại
    const user = await this.userRepository.findOne({
      where: { id: userId, status: 1 },
      relations: ['parent'],
      select: { id: true, parent: { id: true, mpath: true } },
    });

    if (!user || !user.parent) {
      // Không có phòng ban → chỉ trả về chính mình
      return [userId];
    }

    const orgId = user.parent.id;

    // 2. Lấy tất cả phòng ban con (bao gồm chính nó) dựa vào mpath
    const subOrgs = await this.organizationUnitRepository
      .createQueryBuilder('org')
      .select('org.id')
      .where('org.status = 1')
      .andWhere(
        '(org.id = :orgId OR org.mpath LIKE :mpathPattern)',
        { orgId, mpathPattern: `%${orgId}%` }
      )
      .getMany();

    const orgIds = subOrgs.map(o => o.id);

    if (orgIds.length === 0) return [userId];

    // 3. Lấy tất cả userId thuộc các phòng ban đó
    const subUsers = await this.userRepository
      .createQueryBuilder('u')
      .select('u.id')
      .innerJoin('u.parent', 'dept')
      .where('u.status = 1')
      .andWhere('dept.id IN (:...orgIds)', { orgIds })
      .getMany();

    const ids = subUsers.map(u => u.id);

    // Đảm bảo luôn bao gồm bản thân
    if (!ids.includes(userId)) ids.push(userId);

    return ids;
  }



  /**
   * Lấy danh sách nhóm của user
   */
  async getUserGroups(userId: string) {
    if (!userId) return [];

    const user = await this.userRepository.findOne({
      where: { id: userId, status: 1 },
      relations: ['groupUsers'],
      select: {
        id: true,
      },
    });

    return user?.groupUsers || [];
  }

  async getAgentciesById(orgId: string) {
    const cacheKey = typeof orgId === 'string' ? `sqlsv:agency:${orgId.trim()}` : '';
    if (cacheKey) {
      const cached = await this.getRedisBackedCache<any>(this.agencyByIdCache, cacheKey);
      if (cached) return cached;
    }
    // Kiểm tra id hợp lệ (ở SQL là string, không cần ObjectId)
    if (!orgId || typeof orgId !== 'string') {
      return null;
    }

    // Query bằng TypeORM repository
    const agency = await this.agencyRepository.findOne({
      where: { id: orgId, status: 1 },
      select: {
        id: true,
        name: true,
        code: true,
      },
      relations: ['parent'],
    });

    if (!agency) return null;

    const normalized = {
      _id: agency.id,
      name: agency.name,
      code: agency.code,
      types: 'user',
    };
    if (cacheKey) {
      await this.setRedisBackedCache(this.agencyByIdCache, cacheKey, normalized);
    }
    return normalized;
  }
  async getOrganizationUnitById(orgId: string) {
    const cacheKey = typeof orgId === 'string' ? `sqlsv:org:${orgId.trim()}` : '';
    if (cacheKey) {
      const cached = await this.getRedisBackedCache<any>(this.organizationUnitByIdCache, cacheKey);
      if (cached) return cached;
    }
    // 1. Validate ID giống Mongo
    if (!orgId || typeof orgId !== 'string') {
      return null;
    }

    // 2. Query TypeORM giống findOne + projection
    const unit = await this.organizationUnitRepository.findOne({
      where: {
        id: orgId,
        status: 1,
      },
      select: {
        id: true,
        name: true,
        code: true,
        position: true,
        // role: true,
        parent: true,
      },
    });

    if (!unit) return null;

    const normalized = {
      ...unit,
      types: 'user', // giữ nguyên logic Mongo
    };
    if (cacheKey) {
      await this.setRedisBackedCache(this.organizationUnitByIdCache, cacheKey, normalized);
    }
    return normalized;
  }

  async getOrganizationUnitsByIds(
    ids: string[],
    name?: string,
  ): Promise<any[]> {
    if (!ids.length) return [];

    const qb = this.organizationUnitRepository
      .createQueryBuilder('ou')
      .where('ou.id IN (:...ids)', { ids })
      .andWhere('ou.status = 1');

    // Nếu có name → lọc theo name_unsigned LIKE '%value%'
    if (name && name.trim()) {
      const unsigned = removeVietnameseTones(name);
      qb.andWhere('ou.name_unsigned LIKE :search', {
        search: `%${unsigned}%`,
      });
    }

    // Project bỏ groupUsers (Mongo project: { groupUsers: 0 })
    qb.select([
      'ou.id',
      'ou.name',
      'ou.codeND',
      'ou.position',
      // 'ou.role',
      'ou.parent',
      'ou.name_unsigned',
    ]);

    const orgUnits = await qb.getMany();

    return orgUnits.map((ou) => ({
      ...ou,
      types: 'company',
    }));
  }

  async getOrganizationUnitsByIdsSafe(
    ids: string[],
    name?: string,
  ): Promise<any[]> {
    const normalizedIds = Array.from(
      new Set((ids || []).map((id) => String(id || '').trim()).filter(Boolean)),
    );
    if (!normalizedIds.length) return [];
    const normalizedName = name && name.trim() ? removeVietnameseTones(name).toLowerCase() : '';
    const cacheKey = this.buildIdsCacheKey('sqlsv:org-units-by-ids-safe', normalizedIds, normalizedName || undefined);
    const cached = await this.getRedisBackedCache<any[]>(this.organizationUnitsByIdsCache, cacheKey);
    if (cached) return JSON.parse(JSON.stringify(cached));

    const startedAt = Date.now();
    let orgUnits = await this.organizationUnitRepository.find({
      where: {
        id: In(normalizedIds),
        status: 1,
      },
      select: {
        id: true,
        name: true,
        code: true,
        position: true,
        parent: true,
      },
    });

    if (name && name.trim()) {
      const normalizedSearch = removeVietnameseTones(name).toLowerCase();
      orgUnits = orgUnits.filter((ou) =>
        removeVietnameseTones(String(ou.name || '')).toLowerCase().includes(normalizedSearch),
      );
    }

    const mapped = orgUnits.map((ou) => ({
      ...ou,
      types: 'user',
    }));
    await this.setRedisBackedCache(this.organizationUnitsByIdsCache, cacheKey, mapped);
    return mapped;
  }

  async getOrganizationNamesByIds(ids: string[]): Promise<any[]> {
    if (!ids || ids.length === 0) return [];

    return this.organizationUnitRepository.find({
      where: {
        id: In(ids),
        status: 1,
      },
      select: ['id', 'name'],
    });
  }

  async getOrganizationUnitsByIdsWithParents(
    ids: string[],
    name?: string,
  ): Promise<any[]> {
    if (!ids.length) return [];

    /* ==========================================
       1. Lấy phòng ban gốc (baseOrgUnits)
    ========================================== */
    // cách 1 lấy kiểu đơn giản k query nhiều
    // const list = await this.organizationUnitRepository.find({
    //   where: { status: 1 },
    //   relations: ['parent'],
    // });

    const baseOrgUnits = await this.organizationUnitRepository
      .createQueryBuilder('ou')
      // .leftJoinAndSelect('ou.parent', 'parent')
      .leftJoin('ou.parent', 'parent')
      // .select([
      //   'ou.id',
      //   'ou.name',
      //   'ou.code',
      //   'ou.type',
      //   'ou.mpath',
      //   'ou.status',
      //   // 'ou.parentId'
      // ])
      .addSelect(['parent.id', 'parent.name', 'parent.code'])
      .where('ou.id IN (:...ids)', { ids })
      .andWhere('ou.status = :status', { status: 1 })
      .getMany();

    if (!baseOrgUnits.length) return [];

    /* ==========================================
       2. Gom toàn bộ ancestor từ path
    ========================================== */
    const allIds = new Set<string>();

    baseOrgUnits.forEach((ou) => {
      if (ou.mpath) {
        const mpathStr = Array.isArray(ou.mpath)
          ? ou.mpath.join('/')
          : (ou.mpath ?? '');

        mpathStr.split('/').forEach((id) => allIds.add(id));

        // mpathStr.split('/').forEach((id) => allIds.add(id));
      }
    });

    if (!allIds.size) return [];

    /* ==========================================
       3. Query full cây phòng ban theo ancestor
    ========================================== */
    const qb = this.organizationUnitRepository
      .createQueryBuilder('ou')
      // .leftJoinAndSelect('ou.parent', 'parent')
      .leftJoin('ou.parent', 'parent')
      .select([
        'ou.id',
        'ou.name',
        'ou.code',
        'ou.type',
        'ou.mpath',
        'ou.status',
        'ou.parent',
        'ou.createdAt',
        'ou.updatedAt',
      ])
      .addSelect(['parent.id', 'parent.name', 'parent.code'])
      .where('ou.id IN (:...ids)', { ids: Array.from(allIds) })
      .andWhere('ou.status = 1');

    if (name?.trim()) {
      qb.andWhere('ou.name_unsigned LIKE :search', {
        search: `%${removeVietnameseTones(name)}%`,
      });
    }

    const orgUnits = await qb.getMany();
    const mappedRooms = orgUnits.map((unit) => ({
      ...unit,
      _id: unit.id,
      id: unit.id,
      path: unit.mpath, // map mpath thành path
      mpath: undefined,
      parent: unit?.parent?.id || null,
    }));
    return mappedRooms.map((ou) => ({
      ...ou,
      types: 'company',
    }));
  }

  /**
   * Lấy phòng ban cha lớn nhất (root parent) của phòng ban
   * @param orgUnitId - ID của phòng ban cần tìm root parent
   * @returns Phòng ban cha lớn nhất hoặc null nếu không tìm thấy
   */
  async getTopParentOrganizationUnit(orgUnitId: string): Promise<any | null> {
    if (!orgUnitId) return null;

    // 1. Lấy thông tin phòng ban hiện tại
    const orgUnit = await this.organizationUnitRepository.findOne({
      where: { id: orgUnitId, status: 1 },
      select: ['id', 'name', 'code', 'mpath'],
    });

    if (!orgUnit) return null;

    // 2. Parse mpath để lấy root parent ID
    let rootParentId: string;

    if (orgUnit.mpath) {
      const mpathStr = Array.isArray(orgUnit.mpath)
        ? orgUnit.mpath.join('/')
        : (orgUnit.mpath ?? '');

      const pathParts = mpathStr.split('/').filter(Boolean);

      // ID đầu tiên trong mpath là root parent
      rootParentId = pathParts.length > 0 ? pathParts[0] : orgUnitId;
    } else {
      // Nếu không có mpath, chính nó có thể là root
      rootParentId = orgUnitId;
    }

    // 3. Query phòng ban root
    const rootOrgUnit = await this.organizationUnitRepository
      .createQueryBuilder('ou')
      .leftJoin('ou.parent', 'parent')
      .select([
        'ou.id',
        'ou.name',
        'ou.code',
        'ou.type',
        'ou.mpath',
        'ou.status',
        'ou.createdAt',
        'ou.updatedAt',
      ])
      .addSelect(['parent.id', 'parent.name', 'parent.code'])
      .where('ou.id = :id', { id: rootParentId })
      .andWhere('ou.status = 1')
      .getOne();

    if (!rootOrgUnit) return null;

    // 4. Map sang format MongoDB-like
    return {
      ...rootOrgUnit,
      _id: rootOrgUnit.id,
      id: undefined,
      path: rootOrgUnit.mpath,
      mpath: undefined,
      parent: rootOrgUnit.parent?.id || null,
      types: 'company',
    };
  }

  /**
   * Lấy TẤT CẢ phòng ban, sắp xếp theo độ liên quan đến phòng ban của user
   * - Phòng ban của user (exact) → ưu tiên 1
   * - Ancestors (phòng ban cha) → ưu tiên 2
   * - Descendants (phòng ban con) → ưu tiên 3
   * - Phòng ban còn lại → ưu tiên 4
   *
   * Input/Output giữ nguyên so với getOrganizationUnitsForUser
   */
  async getAllOrganizationUnitsSortedByRelevance(
    userId: string,
    name?: string,
  ): Promise<any[]> {
    let userParentId: string | null = null;
    const ancestorIds = new Set<string>();
    const descendantIds = new Set<string>();

    if (userId) {
      const user = await this.userRepository.findOne({
        where: { id: userId, status: 1 },
        relations: ['parent'],
      });

      if (user?.parent?.id) {
        userParentId = user.parent.id;

        const userOrg = await this.organizationUnitRepository.findOne({
          where: { id: userParentId, status: 1 },
        });

        if (userOrg?.mpath) {
          const mpathStr = Array.isArray(userOrg.mpath)
            ? userOrg.mpath.join('/')
            : (userOrg.mpath ?? '');

          mpathStr
            .split('/')
            .filter((id) => id && id !== userParentId)
            .forEach((id) => ancestorIds.add(id));
        }

        const descendants = await this.organizationUnitRepository
          .createQueryBuilder('ou')
          .select('ou.id')
          .where('ou.status = 1')
          .andWhere('ou.id != :selfId', { selfId: userParentId })
          .andWhere('ou.mpath LIKE :mpathPattern', {
            mpathPattern: `%${userParentId}%`,
          })
          .getMany();

        descendants.forEach((d) => descendantIds.add(d.id));
      }
    }

    /* ==========================================
      5. Query toàn bộ phòng ban (status = 1)
    ========================================== */
    const qb = this.organizationUnitRepository
      .createQueryBuilder('ou')
      .leftJoin('ou.parent', 'parent')
      .select([
        'ou.id',
        'ou.name',
        'ou.code',
        'ou.type',
        'ou.mpath',
        'ou.status',
        'ou.parent',
        'ou.order',
        'ou.createdAt',
        'ou.updatedAt',
      ])
      .addSelect(['parent.id', 'parent.name', 'parent.code'])
      .where('ou.status = 1')
      .orderBy('CASE WHEN ou.order IS NULL THEN 1 ELSE 0 END', 'ASC')
      .addOrderBy('ou.order', 'ASC');

    if (name?.trim()) {
      // Escape ký tự đặc biệt của SQL LIKE trước khi truyền vào query
      const safeName = removeVietnameseTones(name).replace(/[%_\\]/g, '\\$&');
      qb.andWhere('ou.name_unsigned LIKE :search', {
        search: `%${safeName}%`,
      });
    }

    const allOrgUnits = await qb.getMany();

    if (!allOrgUnits.length) return [];

    /* ==========================================
      6. Phân loại relevance priority cho từng org unit
      - Priority 1: chính phòng ban của user
      - Priority 2: ancestor (phòng ban cha)
      - Priority 3: descendant (phòng ban con)
      - Priority 4: phòng ban còn lại
    ========================================== */
    const getRelevancePriority = (id: string): number => {
      if (id === userParentId) return 1;
      if (ancestorIds.has(id)) return 2;
      if (descendantIds.has(id)) return 3;
      return 4;
    };

    /* ==========================================
      7. Sort theo relevance, sau đó theo order đã cấu hình
      (order đã được DB sort sẵn, stable sort giữ nguyên thứ tự trong cùng priority)
    ========================================== */
    allOrgUnits.sort((a, b) => {
      const priorityDiff = getRelevancePriority(a.id) - getRelevancePriority(b.id);
      if (priorityDiff !== 0) return priorityDiff;

      // Trong cùng priority: NULL order xuống cuối, rồi sort theo order ASC
      const aOrder = a.order ?? Infinity;
      const bOrder = b.order ?? Infinity;
      return aOrder - bOrder;
    });

    /* ==========================================
      8. Map sang format giữ nguyên như hàm gốc
    ========================================== */
    const mappedRooms = allOrgUnits.map((unit) => ({
      ...unit,
      _id: unit.id,
      id: undefined,
      path: unit.mpath,
      mpath: undefined,
      parent: unit?.parent?.id || null,
    }));

    return mappedRooms.map((ou) => ({
      ...ou,
      types: 'company',
    }));
  }

  /**
   * Lấy phòng ban của user (bao gồm phòng ban cha và phòng ban con)
   * @param userId - ID của user
   * @param name - Tìm kiếm theo tên phòng ban (optional)
   * @returns Danh sách các phòng ban (ancestors + descendants)
   */
  async getOrganizationUnitsForUser(
    userId: string,
    name?: string,
  ): Promise<any[]> {
    if (!userId) return [];

    /* ==========================================
       1. Lấy parent organization unit của user
    ========================================== */
    const user = await this.userRepository.findOne({
      where: { id: userId, status: 1 },
      relations: ['parent'],
    });

    if (!user || !user.parent) return [];

    const userParentId = user.parent.id;

    /* ==========================================
       2. Lấy thông tin phòng ban của user
    ========================================== */
    const userOrg = await this.organizationUnitRepository.findOne({
      where: { id: userParentId, status: 1 },
    });

    if (!userOrg) return [];

    /* ==========================================
       3. Lấy tất cả ancestor IDs từ mpath
    ========================================== */
    const allIds = new Set<string>();

    // Thêm chính phòng ban của user
    allIds.add(userParentId);

    // Thêm tất cả ancestors từ mpath
    if (userOrg.mpath) {
      const mpathStr = Array.isArray(userOrg.mpath)
        ? userOrg.mpath.join('/')
        : (userOrg.mpath ?? '');

      mpathStr
        .split('/')
        .filter((id) => id)
        .forEach((id) => allIds.add(id));
    }

    /* ==========================================
       4. Lấy tất cả descendants (phòng ban con)
    ========================================== */
    const descendants = await this.organizationUnitRepository
      .createQueryBuilder('ou')
      .where('ou.status = 1')
      .andWhere('ou.mpath LIKE :mpathPattern', {
        mpathPattern: `%${userParentId}%`,
      })
      .getMany();

    // Thêm tất cả descendant IDs
    descendants.forEach((org) => allIds.add(org.id));

    if (!allIds.size) return [];

    /* ==========================================
       5. Query full cây phòng ban
    ========================================== */
    const qb = this.organizationUnitRepository
      .createQueryBuilder('ou')
      .leftJoin('ou.parent', 'parent')
      .select([
        'ou.id',
        'ou.name',
        'ou.code',
        'ou.type',
        'ou.mpath',
        'ou.status',
        'ou.parent',
        'ou.order',
        'ou.createdAt',
        'ou.updatedAt',
      ])
      .addSelect(['parent.id', 'parent.name', 'parent.code'])
      .where('ou.id IN (:...ids)', { ids: Array.from(allIds) })
      .andWhere('ou.status = 1')
      .orderBy('CASE WHEN ou.order IS NULL THEN 1 ELSE 0 END', 'ASC') // NULL xuống cuối
      .addOrderBy('ou.order', 'ASC'); // Sắp xếp theo thứ tự đã cấu hình

    // Tìm kiếm theo tên nếu có
    if (name?.trim()) {
      qb.andWhere('ou.name_unsigned LIKE :search', {
        search: `%${removeVietnameseTones(name)}%`,
      });
    }

    const orgUnits = await qb.getMany();

    // Map sang format MongoDB-like
    const mappedRooms = orgUnits.map((unit) => ({
      ...unit,
      _id: unit.id,
      id: undefined,
      path: unit.mpath,
      mpath: undefined,
      parent: unit?.parent?.id || null,
    }));

    return mappedRooms.map((ou) => ({
      ...ou,
      types: 'company',
    }));
  }

  async getUsersByArray(userIds: string[]) {
    // Lọc ra các id hợp lệ
    const validIds = userIds.filter((i) => i !== null);

    if (!validIds.length) return [];

    const cursor = await this.userRepository.find({
      where: {
        id: In(validIds),
        status: 1,
      },
      select: {
        id: true,
        name: true,
        codeND: true,
        emailUser: true,
        position: true,
        role: true,
        avatar: true,
        phoneNumberUser: true,
        organizationName: true,
        organizationCode: true,
        gender: true,
        birthday: true,
        parent: {
          id: true,
          name: true,
        },
      },
    });

    const result = await cursor;

    return result.map((u) => ({
      ...u,
      types: 'user',
    }));
  }

  async getOrganizationUnit(params: {
    filter: any;
    limit: number;
    page: number;
    userDoc?: string[];
    name?: string;
  }) {
    const { filter, limit, page, userDoc, name } = params;

    const qb = this.organizationUnitRepository
      .createQueryBuilder('ou')
      .where('1 = 1');

    // ==== 1. Áp dụng filter (Mongo clone) ====
    if (filter) {
      Object.keys(filter).forEach((key) => {
        qb.andWhere(`ou.${key} = :${key}`, { [key]: filter[key] });
      });
    }

    // ==== 2. Lọc theo list id giống $in ====
    if (userDoc && userDoc.length > 0) {
      qb.andWhere(`ou.id IN (:...userDoc)`, { userDoc });
    }

    // ==== 3. Search LIKE thay cho regex ====
    if (name && name.trim()) {
      const search = `%${name}%`;
      qb.andWhere(
        `(ou.name LIKE :search 
        OR ou.fullName LIKE :search
        OR ou.displayName LIKE :search
        OR ou.code LIKE :search
        OR ou.shortName LIKE :search)`,
        { search },
      );
    }

    // ==== 4. Pagination ====
    const skip = (page - 1) * limit;
    qb.orderBy('ou.id', 'DESC').skip(skip).take(limit);

    // ==== 5. Run query ====
    const [data, total] = await qb.getManyAndCount();

    return { data, total, limit, page };
  }

  async getAllUsersInFlow(
    processKey: string,
    userId: string,
    unit?: string,
  ): Promise<{ parent: string }[]> {
    /* ----------------------------------------------------
     * 1. Lấy role cấu hình trong flow (Mongo: find)
     * ---------------------------------------------------- */
    const docs = await this.roleFeaturesRepository.find({
      where: { processKey },
      select: ['roles'],
    });

    const userIds = new Set<string>();

    for (const doc of docs) {
      for (const role of doc.roles || []) {
        for (const id of role.users || []) {
          if (id) userIds.add(id);
        }
      }
    }

    if (userIds.size === 0) {
      return [];
    }

    const userIdList = [...userIds];

    /* ----------------------------------------------------
     * 2. Build điều kiện parent (nếu cần)
     * ---------------------------------------------------- */
    let parentValue: string | null = null;

    if (unit === 'same') {
      const me = await this.userRepository.findOne({
        where: { id: userId, status: 1 },
        relations: ['parent'],
        select: ['id'],
      });

      parentValue = me?.parent?.id || null;

      if (!parentValue) return [];
    }

    /* ----------------------------------------------------
     * 3. Lấy users theo điều kiện (SQL equivalent of find + project)
     * ---------------------------------------------------- */
    const qb = this.userRepository
      .createQueryBuilder('u')
      .select(['u.id, u.parent'])
      .where('u.id IN (:...userIdList)', { userIdList })
      .andWhere('u.status = 1');

    if (parentValue) {
      qb.andWhere('u.parent = :parent', { parent: parentValue });
    }

    return qb.getRawMany<{ parent: string }>();
  }

  async getVersionById(id: string) {
    const ver = await this.bpmnDesignEntity.findOne({
      where: { id: id },
    });
    if (!ver) throw new NotFoundException(`BPMN version ${id} not found`);
    return ver;
  }

  async getMeInFlow(userId: string, processKey: string) {
    try {
      // 1. Lấy flow theo processKey
      const flow = await this.roleFeaturesRepository.findOne({
        where: { processKey },
        select: ['roles'],
      });

      if (!flow) {
        throw new BadRequestException('Không tìm thấy luồng tương ứng');
      }
      //hihi
      const roles = flow.roles ?? [];
      if (roles.length === 0) {
        throw new BadRequestException('Flow không có role nào');
      }

      let foundRoleCode: string | null = null;

      // 1. Kiểm tra roles_by_process của user (bao gồm cả quyền từ nhóm)
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (user && user.rolesByProcess && Array.isArray(user.rolesByProcess)) {
        const processItem = user.rolesByProcess.find(p => p.processKey === processKey);
        if (processItem && Array.isArray(processItem.roles) && processItem.roles.length > 0) {
          // Lấy vai trò đầu tiên tìm thấy
          foundRoleCode = processItem.roles[0].roleCode;
        }
      }

      // 2. Fallback: Nếu không thấy trong roles_by_process thì tra cứu cấu hình cứng RoleFeatureEntity
      if (!foundRoleCode) {
        const flow = await this.roleFeaturesRepository.findOne({
          where: { processKey },
          select: ['roles'],
        });

        if (flow && flow.roles && Array.isArray(flow.roles)) {
          for (const role of flow.roles) {
            const users = Array.isArray(role.users) ? role.users : [];
            if (users.includes(userId)) {
              foundRoleCode = role.roleCode;
              break;
            }
          }
        }
      }

      if (!foundRoleCode) {
        const user = await this.userRepository.findOne({
          where: { id: userId, status: 1 },
          select: ['id', 'codeND', 'rolesByProcess'],
        });

        const flowRoleCodes = new Set(
          roles
            .map((role: any) => String(role?.roleCode || '').trim())
            .filter(Boolean),
        );

        const codeND = String(user?.codeND || '').trim();
        if (codeND && flowRoleCodes.has(codeND)) {
          foundRoleCode = codeND;
        }

        if (!foundRoleCode && Array.isArray(user?.rolesByProcess)) {
          const processRoles = user.rolesByProcess.find(
            (item: any) => String(item?.processKey || '').trim() === String(processKey).trim(),
          );
          const userRoleCodes = Array.isArray(processRoles?.roles)
            ? processRoles.roles
              .map((role: any) => String(role?.roleCode || '').trim())
              .filter(Boolean)
            : [];

          foundRoleCode = userRoleCodes.find((roleCode) => flowRoleCodes.has(roleCode)) || null;
        }
      }

      if (!foundRoleCode) {
        //  // console.log  ('Không tìm thấy vai trò của người dùng ' + userId + ' trong luồng ' + processKey);
        throw new BadRequestException(
          'Người dùng này không tồn tại trong vai trò của luồng',
        );
      }

      return foundRoleCode;
    } catch (error) {
      console.error(error);
      throw new BadRequestException(error.message || 'Lỗi xử lý getMeInFlow');
    }
  }

  async getFlowByUnit(
    ou: string | null | undefined,
    docType:
      | 'IncommingDocument'
      | 'OutGoingDocument'
      | 'TaskManyUnit'
      | 'TaskProject'
      | 'TaskMetting'
      | 'TaskDocument'
      | 'News'
      | 'ScheduleProcess'
      | 'TaskGeneral'
      | 'TaskUser'
      | 'TaskManyLevelUnit'
      | 'TaskMultiPersional'
      | 'TaskManyLevelAssigneUser'
      | 'TaskMettingWorkflow'
      | 'MiningProcess'
      | 'DestructionProcess'
      | 'FeedbackSuggestion'
      | 'PassportRequest'
      | 'PassportVoucher'
      | 'VehicleRegistration'
      | 'ArchiveRecord'
      | 'TravelWorkSchedule'
      | 'quan_ly_tin_tuc'
  ) {
    // Kiểm tra input hợp lệ
    if (!ou || typeof ou !== 'string' || ou.trim() === '') {
      return null;
    }
    const ouString = String(ou).trim();
    const data = await this.bpmnDesignEntity.findOne({
      where: {
        unit: Raw((alias) => `${alias} LIKE '%"${ouString}"%'`),
        relatedProcesses: Raw((alias) => `${alias} LIKE '%"${docType}"%'`),
        status: 1,
      },
      select: ['id', 'unit', 'relatedProcesses'],
    });
    // Dùng TypeORM để query từ SQL Server
    // unit và relatedProcesses đều là JSON array trong DB, dùng LIKE để tìm kiếm
    return data
  }

  /**
   * Tìm Flow config cho Unit, nếu không có thì tìm lên Unit cha.
   * Tối đa đi lên maxDepth cấp để tránh vòng lặp vô hạn.
   * 
   * Giải quyết vấn đề: Unit con chưa được cấu hình quy trình BPMN riêng
   * → Guard trả 403 ngay lập tức thay vì kế thừa từ unit cha.
   */
  async getFlowByUnitWithInheritance(
    unitId: string,
    docType: string,
    maxDepth = 5,
  ): Promise<any> {
    let currentUnitId = unitId;
    let depth = 0;

    while (currentUnitId && depth < maxDepth) {
      const flow = await this.getFlowByUnit(currentUnitId, docType as any);
      if (flow) return flow;

      // Tìm Unit cha từ bảng organizationunit
      try {
        const parentUnit = await this.organizationUnitRepository
          .createQueryBuilder('ou')
          .select(['ou.parentId'])
          .where('ou.id = :id', { id: currentUnitId })
          .getOne();

        const parentId = parentUnit?.parentId;
        if (!parentId || parentId === currentUnitId) {
          // Không có cha hoặc tự trỏ về chính mình → dừng
          break;
        }
        currentUnitId = String(parentId);
      } catch {
        break;
      }

      depth++;
    }

    return null; // Không tìm thấy ở bất kỳ cấp nào
  }

  async getFlowByProcess(processId: string) {
    if (!processId) return null;

    return this.bpmnDesignEntity.findOne({
      where: {
        processKey: processId, // ⚠️ check lại column DB: có thể là process_id hoặc key
        status: 1,
      },
      select: ['id', 'processKey'],
    });
  }

  async getFlowByDocType(docType: string) {
    if (!docType || typeof docType !== 'string' || docType.trim() === '') {
      return null;
    }
    const docTypeFinal = String(docType).trim();

    return this.bpmnDesignEntity.findOne({
      where: {
        relatedProcesses: Raw((alias) => `${alias} LIKE '%"${docTypeFinal}"%'`),
        status: 1,
      },
      select: ['id', 'unit', 'relatedProcesses'],
    });
  }

  /**
   * Lấy TẤT CẢ các luồng BPMN theo loại văn bản (OutGoingDocument, IncommingDocument, etc.)
   * Không lọc theo đơn vị (unit)
   */
  async getAllFlowsByDocType(docType: string) {
    if (!docType || typeof docType !== 'string' || docType.trim() === '') {
      return [];
    }
    const docTypeFinal = String(docType).trim();

    return this.bpmnDesignEntity.find({
      where: {
        relatedProcesses: Raw((alias) => `${alias} LIKE '%"${docTypeFinal}"%'`),
        status: 1,
      },
      select: ['id', 'unit', 'relatedProcesses'],
    });
  }
  async getFlowByUnitLatest(
    ou: string | null | undefined,
    docType:
      | 'IncommingDocument'
      | 'OutGoingDocument'
      | 'TaskManyUnit'
      | 'TaskMetting'
      | 'TaskDocument'
      | 'News'
      | 'ScheduleProcess'
      | 'TaskGeneral'
      | 'TaskUser'
      | 'TaskManyLevelUnit'
      | 'TaskMultiPersional'
      | 'TaskManyLevelAssigneUser'
      | 'PassportRequest',
  ) {
    if (!ou || typeof ou !== 'string' || ou.trim() === '') {
      return null;
    }

    const ouString = ou.trim();

    return (
      this.bpmnDesignEntity
        .createQueryBuilder('design')
        .where('design.status = :status', { status: 1 })
        .andWhere(`design.unit LIKE :ou`, { ou: `%"${ouString}"%` })
        .andWhere(`design.relatedProcesses LIKE :docType`, {
          docType: `%"${docType}"%`,
        })
        // 🔥 QUAN TRỌNG: sort giống API list
        .orderBy('design.createdAt', 'DESC')
        .addOrderBy('design.id', 'DESC')
        .select(['design.id', 'design.unit', 'design.relatedProcesses'])
        .getOne()
    );
  }

  async getUserAllRolesByUnitFlows(userId: string, parentUnitId: string) {
    if (!userId || !parentUnitId) {
      return { roles: [], byProcess: {} };
    }

    const flows = await this.bpmnDesignEntity
      .createQueryBuilder('design')
      .where('design.status = :status', { status: 1 })
      .andWhere(`design.unit LIKE :ou`, { ou: `%"${parentUnitId}"%` })
      .select(['design.id'])
      .getMany();

    if (!flows.length) {
      return { roles: [], byProcess: {} };
    }

    const processKeys = flows.map((f) => String(f.id));
    const roleDocs = await this.roleFeaturesRepository.find({
      where: { processKey: In(processKeys) },
      select: { processKey: true, roles: true },
    });

    const allRoles = new Set<string>();
    const byProcess: Record<string, string[]> = {};

    for (const doc of roleDocs) {
      if (!Array.isArray(doc.roles)) continue;

      const matchedRoles = doc.roles
        .filter(
          (r) =>
            Array.isArray(r?.users) &&
            r.users.some((u) => String(u) === String(userId)),
        )
        .map((r) => r.roleCode)
        .filter(Boolean);

      if (matchedRoles.length) {
        byProcess[doc.processKey] = matchedRoles;
        matchedRoles.forEach((role) => allRoles.add(role));
      }
    }

    return {
      roles: [...allRoles],
      byProcess,
    };
  }

  async getIncomingFlowsByUnits(units: (string | null | undefined)[]) {
    // 1️⃣ Chuẩn hoá input
    const validUnits = units
      .filter((u): u is string => typeof u === 'string' && u.trim() !== '')
      .map((u) => u.trim());

    if (validUnits.length === 0) return [];

    // 2️⃣ Build OR LIKE conditions
    const unitConditions = validUnits
      .map((u) => `unit LIKE '%"${u}"%'`)
      .join(' OR ');

    // 3️⃣ Query 1 lần
    return this.bpmnDesignEntity.find({
      where: {
        status: 1,
        relatedProcesses: Raw(
          (alias) => `${alias} LIKE '%"IncommingDocument"%'`,
        ),
        unit: Raw((alias) => `(${unitConditions})`),
      },
      select: ['id', 'unit', 'relatedProcesses'],
    });
  }
  async getOrganizationUnitsForUsers(
    userIds: string[] | string,
    name?: string,
  ): Promise<any[]> {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    if (!ids.length) return [];

    /* ==========================================
       1. Lấy parent organization unit của users
    ========================================== */
    const users = await this.userRepository.find({
      where: {
        id: In(ids),
        status: 1,
      },
      relations: ['parent'],
    });

    if (!users.length) return [];

    const parentIds = new Set<string>();
    users.forEach((u) => {
      if (u.parent?.id) parentIds.add(u.parent.id);
    });

    if (!parentIds.size) return [];

    /* ==========================================
       2. Lấy thông tin phòng ban của các parent
    ========================================== */
    const parentOrgUnits = await this.organizationUnitRepository.find({
      where: {
        id: In([...parentIds]),
        status: 1,
      },
    });

    if (!parentOrgUnits.length) return [];

    /* ==========================================
       3. Thu thập ancestors từ mpath
    ========================================== */
    const allOuIds = new Set<string>();

    parentOrgUnits.forEach((org) => {
      // chính phòng ban
      allOuIds.add(org.id);

      if (org.mpath) {
        const mpathStr = Array.isArray(org.mpath)
          ? org.mpath.join('/')
          : org.mpath;

        mpathStr
          .split('/')
          .filter(Boolean)
          .forEach((id) => allOuIds.add(id));
      }
    });

    /* ==========================================
       4. Lấy descendants cho TẤT CẢ parent
    ========================================== */
    const descendantQb = this.organizationUnitRepository
      .createQueryBuilder('ou')
      .where('ou.status = 1');

    parentOrgUnits.forEach((org, index) => {
      descendantQb.orWhere(`ou.mpath LIKE :mpath${index}`, {
        [`mpath${index}`]: `%${org.id}%`,
      });
    });

    const descendants = await descendantQb.getMany();
    descendants.forEach((ou) => allOuIds.add(ou.id));

    if (!allOuIds.size) return [];

    /* ==========================================
       5. Query full cây phòng ban (1 lần)
    ========================================== */
    const qb = this.organizationUnitRepository
      .createQueryBuilder('ou')
      .leftJoin('ou.parent', 'parent')
      .select([
        'ou.id',
        'ou.name',
        'ou.code',
        'ou.type',
        'ou.mpath',
        'ou.status',
        'ou.createdAt',
        'ou.updatedAt',
      ])
      .addSelect(['parent.id', 'parent.name', 'parent.code'])
      .where('ou.id IN (:...ids)', { ids: [...allOuIds] })
      .andWhere('ou.status = 1');

    if (name?.trim()) {
      qb.andWhere('ou.name_unsigned LIKE :search', {
        search: `%${removeVietnameseTones(name)}%`,
      });
    }

    const orgUnits = await qb.getMany();

    /* ==========================================
       6. Map + loại trùng lần cuối (phòng thủ)
    ========================================== */
    const uniqueMap = new Map<string, any>();

    orgUnits.forEach((unit) => {
      if (!uniqueMap.has(unit.id)) {
        uniqueMap.set(unit.id, {
          ...unit,
          _id: unit.id,
          id: undefined,
          path: unit.mpath,
          mpath: undefined,
          parent: unit.parent?.id || null,
          types: 'company',
        });
      }
    });

    return Array.from(uniqueMap.values());
  }

  async getDynamicRolesByUserId(userId: string): Promise<any[]> {
    return this.groupUserRepo
      .createQueryBuilder('gu')
      .innerJoin('user_group_users', 'ugu', 'gu.id = ugu.group_user_id')
      .where('ugu.user_id = :userId', { userId })
      .andWhere('gu.status = 1')
      .select(['gu.roles_dynamic'])
      .getMany();
  }

  async getIncomingDocumentsByIds(incomingDocIds: string[]): Promise<any[]> {
    if (!Array.isArray(incomingDocIds) || incomingDocIds.length === 0) {
      return [];
    }

    try {
      const uniqueIncomingDocIds = [
        ...new Set(incomingDocIds.map((id) => String(id).trim()).filter(Boolean)),
      ];

      if (uniqueIncomingDocIds.length === 0) {
        return [];
      }

      // Sử dụng QueryBuilder với connection từ userRepository
      const query = this.userRepository.createQueryBuilder()
        .distinct(true)
        .select([
          'id.document_id',
          'id.receiver_unit',
          'id.bpmn_version',
          'id.copy_to_internal',
        ])
        .from('incomming_documents', 'id')
        .where('id.document_id IN (:...incomingDocIds)', { incomingDocIds: uniqueIncomingDocIds });

      const result = await query.getRawMany();
      const uniqueDocs = Array.from(
        new Map((result || []).map((doc) => [String(doc.document_id), doc])).values(),
      );

      //  // console.log  ('[getIncomingDocumentsByIds] Result count:', uniqueDocs.length);

      return uniqueDocs;
    } catch (error) {
      console.error('getIncomingDocumentsByIds error:', error);
      return [];
    }
  }

  async isUserInGroup(userId: string, groupCode: string): Promise<boolean> {
    if (!userId) return false;
    const count = await this.groupUserRepo
      .createQueryBuilder('g')
      .innerJoin('g.users', 'u')
      .where('g.code = :groupCode', { groupCode })
      .andWhere('u.id = :userId', { userId })
      .andWhere('g.status = :status', { status: STATUS.ACTIVED })
      .getCount();
    return count > 0;
  }

}

// Export type để dùng trong @Inject()
export type sqlsvRepoInstance = InstanceType<typeof SQLSVRepository>;
