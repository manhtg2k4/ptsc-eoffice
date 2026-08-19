import { Injectable, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import {
  CreateGroupUserDto,
  RolesDynamicDto,
  UpdateGroupUserDto,
} from './group-users.dto';
import { STATUS } from '../variables/CONST_STATUS';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Not, Repository, FindOptionsWhere } from 'typeorm';
import { GroupUserEntity } from './entities/group-users.entity';
import { RolesByProcess, UserEntity } from 'src/users/entities/user.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import * as moment from 'moment';
import { v4 as uuidv4 } from 'uuid';

import {
  areFiltersValid,
  parseSortParam,
  removeVietnameseTones,
} from '../utils/util';
import { QueryParams } from 'src/interfaces';
import { HrmSyncService } from 'src/user-sync/hrm-sync.service';
import { RolesProcessEntity } from 'src/role-feature/role-feature-sql/roles-process.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';

@Injectable()
export class GroupUserService {
  private readonly logger = new Logger(GroupUserService.name);
  private readonly lookupCacheTtl = 3 * 60 * 1000;
  private readonly groupByIdCache = new Map<string, { value: { data: any }; expiry: number }>();
  private readonly groupByIdSafeCache = new Map<string, { value: { data: any } | null; expiry: number }>();
  private readonly groupsByIdsCache = new Map<string, { value: Array<{ id: string; name: string }>; expiry: number }>();

  constructor(
    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserSqlRepo: Repository<GroupUserEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userSqlRepo: Repository<UserEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly orgUnitSqlRepo: Repository<OrganizationUnitEntity>,
    @InjectRepository(RolesProcessEntity, 'mssqlConnection')
    private readonly rolesProcessRepo: Repository<RolesProcessEntity>,
    @Inject(forwardRef(() => HrmSyncService))
    private readonly hrmSyncService: HrmSyncService,
  ) { }

  private getLocalCache<T>(cache: Map<string, { value: T; expiry: number }>, key: string): T | null {
    const cached = cache.get(key);
    if (!cached) return null;
    if (cached.expiry <= Date.now()) {
      cache.delete(key);
      return null;
    }
    return cached.value;
  }

  private setLocalCache<T>(cache: Map<string, { value: T; expiry: number }>, key: string, value: T): void {
    cache.set(key, {
      value,
      expiry: Date.now() + this.lookupCacheTtl,
    });
  }

  private buildIdsCacheKey(prefix: string, ids: string[]): string {
    const normalizedIds = Array.from(new Set((ids || []).map((id) => String(id || '').trim()).filter(Boolean))).sort();
    return `${prefix}:${normalizedIds.join(',')}`;
  }

  private knownProcessKeysCache: { data: string[]; expiresAt: number } | null = null;

  private async extractDynamicRoles(roles: string[]): Promise<{ processKey: string; roleCode: string; name: string }[]> {
    const dynamicRoles: { processKey: string; roleCode: string; name: string }[] = [];
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

    let knownProcessKeys: string[] = [];
    const now = Date.now();
    if (this.knownProcessKeysCache && this.knownProcessKeysCache.expiresAt > now) {
      knownProcessKeys = [...this.knownProcessKeysCache.data];
    } else {
      try {
        const rpKeys = await this.rolesProcessRepo
          .createQueryBuilder('rp')
          .select('DISTINCT rp.processKey', 'processKey')
          .getRawMany();
        knownProcessKeys = rpKeys.map(item => String(item.processKey || '').trim()).filter(Boolean);
        this.knownProcessKeysCache = {
          data: knownProcessKeys,
          expiresAt: now + 60000,
        };
      } catch (e) {
        console.warn('Error fetching known process keys:', e.message);
      }
    }

    if (!knownProcessKeys.includes('quan_ly_tin_tuc')) {
      knownProcessKeys.push('quan_ly_tin_tuc');
    }

    knownProcessKeys.sort((a, b) => b.length - a.length);

    for (const roleStr of roles || []) {
      if (typeof roleStr !== 'string') continue;

      if (roleStr.length > 37 && roleStr.charAt(36) === '_') {
        const potentialUuid = roleStr.substring(0, 36);
        if (uuidRegex.test(potentialUuid)) {
          const roleCode = roleStr.substring(37);
          dynamicRoles.push({
            processKey: potentialUuid,
            roleCode,
            name: roleCode,
          });
          continue;
        }
      }

      let matched = false;
      for (const pk of knownProcessKeys) {
        if (roleStr.startsWith(pk + '_')) {
          const roleCode = roleStr.substring(pk.length + 1);
          dynamicRoles.push({
            processKey: pk,
            roleCode,
            name: roleCode,
          });
          matched = true;
          break;
        }
      }

      if (!matched) {
        const lastUnderscoreIndex = roleStr.lastIndexOf('_');
        if (lastUnderscoreIndex > 0) {
          const processKey = roleStr.substring(0, lastUnderscoreIndex);
          const roleCode = roleStr.substring(lastUnderscoreIndex + 1);

          if (/^[a-zA-Z0-9_-]{3,100}$/.test(processKey)) {
            dynamicRoles.push({
              processKey,
              roleCode,
              name: roleCode,
            });
          }
        }
      }
    }
    return dynamicRoles;
  }

  private transformRolesDynamicForEntity(
    roles: RolesDynamicDto[] | undefined,
  ): { processKey: string; roleCode: string; name: string }[] {
    if (!roles || roles.length === 0) {
      return [];
    }

    return roles.map((role) => ({
      processKey: role.processKey,
      roleCode: role.roleCode,
      name: role.name,
    }));
  }

  // Thêm nhóm người dùng
  async create(
    createGroupUserDto: CreateGroupUserDto,
  ): Promise<GroupUserEntity> {
    const existingGroup = await this.groupUserSqlRepo.findOne({
      where: [
        { code: createGroupUserDto.code, status: STATUS.ACTIVED },
        { name: createGroupUserDto.name, status: STATUS.ACTIVED },
      ],
      select: ['id', 'code', 'name'],
    });

    if (existingGroup) {
      const isCodeDuplicate = existingGroup.code === createGroupUserDto.code;
      const message = isCodeDuplicate
        ? `Mã nhóm ${createGroupUserDto.code} đã tồn tại`
        : `Tên nhóm ${createGroupUserDto.name} đã tồn tại`;
      throw new BadRequestException({
        success: false,
        message: message,
      });
    }

    const extractedDynamic = await this.extractDynamicRoles(createGroupUserDto.roles || []);
    const inputDynamic = this.transformRolesDynamicForEntity(createGroupUserDto.roles_dynamic);

    const mergedDynamicMap = new Map<string, { processKey: string; roleCode: string; name: string }>();
    [...extractedDynamic, ...inputDynamic].forEach(item => {
      mergedDynamicMap.set(`${item.processKey}_${item.roleCode}`, item);
    });
    const transformedRolesDynamic = Array.from(mergedDynamicMap.values());

    const roleIds = (createGroupUserDto.roles || [])
      .map((role: any) => (typeof role === 'string' ? role : role?._id))
      .filter(Boolean);

    let verifiedUserIds: string[] = [];
    // Verify users (chỉ select ID để giảm tải)
    if (createGroupUserDto.UserId && createGroupUserDto.UserId.length > 0) {
      const userIds = createGroupUserDto.UserId;
      const userPromises: Promise<{ id: string }[]>[] = [];
      for (let i = 0; i < userIds.length; i += 2000) {
        const chunk = userIds.slice(i, i + 2000);
        userPromises.push(
          this.userSqlRepo.find({
            where: {
              id: In(chunk),
              status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED]),
            },
            select: ['id'],
          })
        );
      }
      const users = (await Promise.all(userPromises)).flat();
      if (users.length !== createGroupUserDto.UserId.length) {
        throw new BadRequestException({
          success: false,
          message: `Một số người dùng không tồn tại hoặc không hoạt động`,
        });
      }
      verifiedUserIds = users.map((u) => u.id);
    }

    let verifiedOrgIds: string[] = [];
    // Verify organization units (chỉ select ID)
    if (
      createGroupUserDto.organizationUnits &&
      createGroupUserDto.organizationUnits.length > 0
    ) {
      const uniqueOrgIds = Array.from(new Set(createGroupUserDto.organizationUnits));
      const orgPromises: Promise<{ id: string }[]>[] = [];
      for (let i = 0; i < uniqueOrgIds.length; i += 2000) {
        const chunk = uniqueOrgIds.slice(i, i + 2000);
        orgPromises.push(
          this.orgUnitSqlRepo.find({
            where: {
              id: In(chunk),
              status: STATUS.ACTIVED,
            },
            select: ['id'],
          })
        );
      }
      const orgUnits = (await Promise.all(orgPromises)).flat();
      if (orgUnits.length !== uniqueOrgIds.length) {
        throw new BadRequestException({
          success: false,
          message: `Một số đơn vị không tồn tại hoặc không hoạt động`,
        });
      }
      verifiedOrgIds = orgUnits.map((ou) => ou.id);
    }

    const newGroupId = uuidv4();
    // Tạo entity với thông tin cơ bản
    const groupEntity = this.groupUserSqlRepo.create({
      id: newGroupId,
      name: createGroupUserDto.name,
      code: createGroupUserDto.code,
      description: createGroupUserDto.description,
      roleType: createGroupUserDto.roleType || 'fixed',
      roles: roleIds,
      roles_dynamic: transformedRolesDynamic,
      order: createGroupUserDto.order,
      userId: verifiedUserIds,
    });

    // 1️⃣ Ghi thông tin group xuống DB trước
    await this.groupUserSqlRepo.save(groupEntity);

    // 2️⃣ Dùng QueryBuilder Relation API để thêm các liên kết vào bảng trung gian (tránh RAW SQL)
    if (verifiedUserIds.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < verifiedUserIds.length; i += BATCH_SIZE) {
        const chunk = verifiedUserIds.slice(i, i + BATCH_SIZE);
        await this.groupUserSqlRepo.createQueryBuilder()
          .relation(GroupUserEntity, 'users')
          .of(newGroupId)
          .add(chunk);
      }
    }

    if (verifiedOrgIds.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < verifiedOrgIds.length; i += BATCH_SIZE) {
        const chunk = verifiedOrgIds.slice(i, i + BATCH_SIZE);
        await this.groupUserSqlRepo.createQueryBuilder()
          .relation(GroupUserEntity, 'organizationUnits')
          .of(newGroupId)
          .add(chunk);
      }
    }

    // 🔄 ĐỒNG BỘ ROLES_DYNAMIC VÀO roles_process_groups
    if (transformedRolesDynamic.length > 0) {
      await this.syncRolesProcessGroups(
        newGroupId,
        createGroupUserDto.name,
        transformedRolesDynamic,
      );
    }

    return groupEntity;
  }

  async addUsersToGroup(
    groupId: string,
    userIds: string[],
  ): Promise<{ success: boolean; message: string }> {
    const group = await this.groupUserSqlRepo.findOne({
      where: { id: groupId, status: STATUS.ACTIVED },
      relations: ['users'],
    });

    if (!group) {
      throw new BadRequestException({
        success: false,
        message: `Nhóm ${groupId} không tồn tại hoặc không hoạt động.`,
      });
    }

    if (!Array.isArray(userIds)) {
      throw new BadRequestException({
        success: false,
        message: 'Danh sách userIds không hợp lệ',
      });
    }

    // Tách batch 2000 phần tử và dùng Promise.all để chạy song song tối ưu hiệu năng
    const userPromises: Promise<UserEntity[]>[] = [];
    for (let i = 0; i < userIds.length; i += 2000) {
      const chunk = userIds.slice(i, i + 2000);
      userPromises.push(
        this.userSqlRepo.find({
          where: { id: In(chunk) },
        })
      );
    }
    const newUsers = (await Promise.all(userPromises)).flat();

    const foundUserIds = newUsers.map((u) => u.id);
    // Bỏ qua các userId không tồn tại thay vì throw lỗi theo yêu cầu
    // const notFoundUserIds = userIds.filter((id) => !foundUserIds.includes(id));

    const lockedUsers = newUsers.filter((u) => u.status === STATUS.LOCKED);
    if (lockedUsers.length > 0) {
      const lockedUsernames = lockedUsers.map((u) => u.username).join(', ');
      throw new BadRequestException({
        success: false,
        message: `Không thể thêm người dùng đã bị khóa: ${lockedUsernames}`,
      });
    }

    // ✅ MERGE: Giữ lại users cũ, chỉ thêm users mới (tránh trùng lặp)
    const existingUserIds = (group.users || []).map((u) => u.id);
    const usersToAdd = newUsers.filter((u) => !existingUserIds.includes(u.id));

    group.users = [...(group.users || []), ...usersToAdd];
    group.userId = group.users.map((u) => u.id); // Đồng bộ lại userId

    await this.groupUserSqlRepo.save(group);

    // ✅ CẬP NHẬT QUYỀN CHO USERS SAU KHI THÊM VÀO NHÓM
    for (const userId of foundUserIds) {
      await this.hrmSyncService.updateUserPermissions(userId);
    }

    return {
      success: true,
      message: `Đã cập nhật người dùng trong nhóm ${groupId} thành công.`,
    };
  }

  async addOrganizationUnitToGroup(
    groupId: string,
    orgId: string,
  ): Promise<{ success: boolean; message: string }> {
    const group = await this.groupUserSqlRepo.findOne({
      where: { id: groupId, status: STATUS.ACTIVED },
      relations: ['organizationUnits'],
    });
    if (!group) {
      throw new BadRequestException({
        success: false,
        message: `Nhóm với ID ${groupId} không tồn tại hoặc không hoạt động`,
      });
    }

    const org = await this.orgUnitSqlRepo.findOne({
      where: { id: orgId, status: STATUS.ACTIVED },
    });
    if (!org) {
      throw new BadRequestException({
        success: false,
        message: `Đơn vị tổ chức với ID ${orgId} không tồn tại hoặc không hoạt động`,
      });
    }

    const alreadyExists = group.organizationUnits.some(
      (unit) => unit.id === orgId,
    );
    if (alreadyExists) {
      throw new BadRequestException({
        success: false,
        message: `Đơn vị tổ chức đã tồn tại trong nhóm`,
      });
    }

    group.organizationUnits.push(org);
    await this.groupUserSqlRepo.save(group);

    return {
      success: true,
      message: `Đã thêm đơn vị tổ chức ${orgId} vào nhóm ${groupId} thành công`,
    };
  }
  // group-user.service.ts (Thêm vào cùng file)
  async updateOrganizationUnitsInGroup(
    groupId: string,
    organizationUnitIds: string[],
  ): Promise<{ success: boolean; message: string }> {
    const group = await this.groupUserSqlRepo.findOne({
      where: { id: groupId },
      relations: ['organizationUnits'],
    });
    if (!group) {
      throw new BadRequestException({
        success: false,
        message: `Nhóm với ID ${groupId} không tồn tại`,
      });
    }

    if (!Array.isArray(organizationUnitIds)) {
      throw new BadRequestException({
        success: false,
        message: `Danh sách đơn vị tổ chức phải là mảng`,
      });
    }

    const uniqueOrgIds = Array.from(new Set(organizationUnitIds));

    let orgUnits: OrganizationUnitEntity[] = [];
    if (uniqueOrgIds.length > 0) {
      // Tách batch 2000 phần tử và dùng Promise.all để chạy song song tối ưu hiệu năng
      const orgPromises: Promise<OrganizationUnitEntity[]>[] = [];
      for (let i = 0; i < uniqueOrgIds.length; i += 2000) {
        const chunk = uniqueOrgIds.slice(i, i + 2000);
        orgPromises.push(
          this.orgUnitSqlRepo.find({
            where: { id: In(chunk), status: STATUS.ACTIVED },
          })
        );
      }
      orgUnits = (await Promise.all(orgPromises)).flat();
    }

    if (
      uniqueOrgIds.length > 0 &&
      orgUnits.length !== uniqueOrgIds.length
    ) {
      throw new BadRequestException({
        success: false,
        message: `Một số đơn vị tổ chức không tồn tại hoặc không hoạt động`,
      });
    }

    // Ngăn TypeORM tự động lưu đè qua relation save() do lỗi mismatch Casing
    delete (group as any).organizationUnits;
    await this.groupUserSqlRepo.save(group);

    // Xóa thủ công toàn bộ relation cũ
    await this.groupUserSqlRepo.manager.query(
      `DELETE FROM group_user_organization_units WHERE group_user_id = '${groupId.replace(/'/g, "''")}'`
    );

    // Dùng query builder để thêm lại với instance sạch
    if (orgUnits.length > 0) {
      await this.groupUserSqlRepo.createQueryBuilder()
        .relation(GroupUserEntity, 'organizationUnits')
        .of(groupId)
        .add(orgUnits.map(ou => ou.id));
    }

    return {
      success: true,
      message: `Đã cập nhật danh sách đơn vị tổ chức cho nhóm ${groupId} thành công`,
    };
  }

  async removeUserFromGroup(
    groupId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const group = await this.groupUserSqlRepo.findOne({
      where: { id: groupId, status: STATUS.ACTIVED },
      relations: ['users'],
    });

    if (!group) {
      throw new BadRequestException({
        success: false,
        message: `Nhóm không tồn tại hoặc không hoạt động.`,
      });
    }

    const initialUserCount = group.users.length;
    group.users = group.users.filter((user) => user.id !== userId);

    if (group.users.length === initialUserCount) {
      throw new BadRequestException({
        success: false,
        message: `Người dùng ${userId} không thuộc nhóm ${groupId}.`,
      });
    }

    if (group.userId) {
      group.userId = group.userId.filter((id) => id !== userId);
    }

    await this.groupUserSqlRepo.save(group);

    // ✅ CẬP NHẬT LẠI QUYỀN CHO USER SAU KHI RỜI NHÓM
    await this.hrmSyncService.updateUserPermissions(userId);

    return {
      success: true,
      message: `Đã xóa người dùng ${userId} khỏi nhóm ${groupId} thành công.`,
    };
  }

  async removeOrganizationUnitFromGroup(
    groupId: string,
    orgId: string,
  ): Promise<{ success: boolean; message: string }> {
    const group = await this.groupUserSqlRepo.findOne({
      where: { id: groupId },
      relations: ['organizationUnits'],
    });

    if (!group) {
      throw new BadRequestException({
        success: false,
        message: `Nhóm không tồn tại.`,
      });
    }

    const initialCount = group.organizationUnits.length;
    group.organizationUnits = group.organizationUnits.filter(
      (org) => org.id !== orgId,
    );

    if (group.organizationUnits.length === initialCount) {
      throw new BadRequestException({
        success: false,
        message: `Đơn vị ${orgId} không thuộc nhóm ${groupId}.`,
      });
    }

    await this.groupUserSqlRepo.save(group);

    return {
      success: true,
      message: `Đã xóa đơn vị tổ chức ${orgId} khỏi nhóm ${groupId} thành công`,
    };
  }
  async findById(id: string): Promise<{ data: any }> {
    const cacheKey = String(id || '').trim();
    if (cacheKey) {
      const cached = this.getLocalCache(this.groupByIdCache, cacheKey);
      if (cached) return JSON.parse(JSON.stringify(cached));
    }
    const startTotal = Date.now();
    this.logger.log(`[findById] START - id: ${id}`);

    // Chỉ select các trường cần thiết, KHÔNG load relations nặng
    const startQuery = Date.now();
    const unit = await this.groupUserSqlRepo.findOne({
      where: { id },
      select: [
        'id', 'name', 'code', 'type', 'status', 'order',
        'description', 'roleType', 'hrmJobId', 'createdAt', 'updatedAt',
        'userId', 'roles', 'roles_dynamic'
      ],
    });
    const queryTime = Date.now() - startQuery;
    this.logger.log(`[findById] Query group: ${queryTime}ms`);

    if (!unit) {
      throw new BadRequestException('Không tìm thấy nhóm người dùng');
    }

    // Load organizationUnits riêng (chỉ cần id và name)
    const startOrg = Date.now();
    const orgUnits = await this.orgUnitSqlRepo
      .createQueryBuilder('ou')
      .innerJoin('ou.groupUsers', 'gu')
      .where('gu.id = :groupId', { groupId: id })
      .select(['ou.id', 'ou.name'])
      .getMany();
    const orgTime = Date.now() - startOrg;
    this.logger.log(`[findById] Query organizationUnits: ${orgTime}ms, count: ${orgUnits.length}`);

    const totalTime = Date.now() - startTotal;
    this.logger.log(`[findById] COMPLETED in ${totalTime}ms - id: ${id}`);

    // Trả về dữ liệu gọn nhẹ
    const response = {
      data: {
        id: unit.id,
        name: unit.name,
        code: unit.code,
        type: unit.type,
        status: unit.status,
        order: unit.order,
        description: unit.description,
        roleType: unit.roleType,
        hrmJobId: unit.hrmJobId,
        createdAt: unit.createdAt,
        updatedAt: unit.updatedAt,
        userId: unit.userId || [],
        roles: unit.roles || [],
        roles_dynamic: unit.roles_dynamic || [],
        organizationUnits: orgUnits.map((ou) => ({
          _id: ou.id,
          name: ou.name,
        })),
      },
    };
    if (cacheKey) {
      this.setLocalCache(this.groupByIdCache, cacheKey, response);
    }
    return JSON.parse(JSON.stringify(response));
  }

  /**
   * Phiên bản an toàn của findById, trả về null thay vì ném ngoại lệ khi không tìm thấy.
   * Thích hợp cho các quy trình xử lý hàng loạt có lẫn ID người dùng.
   */
  async findByIdSafe(id: string): Promise<{ data: any } | null> {
    try {
      const cacheKey = String(id || '').trim();
      if (cacheKey) {
        const cached = this.getLocalCache(this.groupByIdSafeCache, cacheKey);
        if (cached !== null) {
          return cached ? JSON.parse(JSON.stringify(cached)) : null;
        }
      }
      const unit = await this.groupUserSqlRepo.findOne({
        where: { id },
        relations: ['organizationUnits', 'permissions'],
      });

      if (!unit) {
        if (cacheKey) {
          this.setLocalCache(this.groupByIdSafeCache, cacheKey, null);
        }
        return null;
      }

      const response = {
        data: {
          ...unit,
          // ✅ trả về object { _id, name } để FE hiển thị được label
          organizationUnits: (unit.organizationUnits || []).map((ou) => ({
            _id: ou.id,
            id: ou.id,
            name: ou.name,
          })),
        },
      };
      if (cacheKey) {
        this.setLocalCache(this.groupByIdSafeCache, cacheKey, response);
      }
      return JSON.parse(JSON.stringify(response));
    } catch (error) {
      console.warn(`findByIdSafe error for id ${id}:`, error.message);
      return null;
    }
  }

  async findManyByIds(ids: string[]): Promise<Array<{ id: string; name: string }>> {
    const normalizedIds = Array.from(new Set((ids || []).map((id) => String(id || '').trim()).filter(Boolean)));
    if (!normalizedIds.length) return [];
    const cacheKey = this.buildIdsCacheKey('group-users:many-by-ids', normalizedIds);
    const cached = this.getLocalCache(this.groupsByIdsCache, cacheKey);
    if (cached !== null) return JSON.parse(JSON.stringify(cached));

    const startedAt = Date.now();
    const groups = await this.groupUserSqlRepo.find({
      where: {
        id: In(normalizedIds),
        status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED]),
      },
      select: ['id', 'name', 'status'],
    });

    const mapped = groups
      .map((group) => ({
        id: group.id,
        name: group.name,
      }))
      .filter((group) => group.id && group.name);
    this.setLocalCache(this.groupsByIdsCache, cacheKey, mapped);
    return mapped;
  }

  async findAll(queryParams: QueryParams): Promise<any> {
    const {
      page = 1,
      limit = 25,
      sort = '-createdAt',
      fields = '',
      ...filters
    } = queryParams;

    if (!areFiltersValid(filters)) {
      return {
        success: false,
        message: `tìm kiếm không được chứa ký tự đặc biệt`,
      };
    }

    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.max(Number(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    let where: FindOptionsWhere<GroupUserEntity> | FindOptionsWhere<GroupUserEntity>[] = {
      status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED]),
    };

    if (Object.keys(filters).length > 0) {
      const orConditions: FindOptionsWhere<GroupUserEntity>[] = [];
      for (const key in filters) {
        if (Object.prototype.hasOwnProperty.call(filters, key)) {
          orConditions.push({
            status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED]),
            [key]: Like(`%${filters[key]}%`),
          } as FindOptionsWhere<GroupUserEntity>);
        }
      }
      where = orConditions;
    }

    const sortOptions = parseSortParam(sort);

    const selectOptions: any = fields
      ? (fields as string).split(',').map(f => f.trim()).filter(Boolean)
      : undefined;

    let data: any[], totalRecords: number;

    try {
      [data, totalRecords] = await this.groupUserSqlRepo.findAndCount({
        where,
        select: selectOptions,
        order: sortOptions,
        take: limitNum,
        skip: skip,
      });
    } catch (error) {
      console.warn('findAll select error, falling back to all fields:', error.message);
      [data, totalRecords] = await this.groupUserSqlRepo.findAndCount({
        where,
        order: sortOptions,
        take: limitNum,
        skip: skip,
      });
    }

    const mappedData = data.map((item) => ({
      ...item,
      _id: item.id,
    }));

    const totalPages = Math.ceil(totalRecords / limitNum);

    // ✅ Định dạng phản hồi mà bạn yêu cầu
    const finalResult = {
      total: totalRecords,
      page: pageNum,
      limit: limitNum,
      totalPages: totalPages,
      data: mappedData,
      filter: where,
    };

    return finalResult;
  }

  async findUsersByGroupCode(
    groupCode: string,
    queryParams: QueryParams,
  ): Promise<any> {
    const group = await this.groupUserSqlRepo.findOneBy({
      code: groupCode,
      status: STATUS.ACTIVED,
    });
    if (!group) {
      return { total: 0, page: 1, limit: 25, totalPages: 0, data: [] };
    }
    return this.findUsersByGroupId(group.id, queryParams);
  }

  async findUsersByGroupId(
    groupId: string,
    queryParams: QueryParams,
  ): Promise<any> {
    const group = await this.groupUserSqlRepo.findOneBy({
      id: groupId,
      status: STATUS.ACTIVED,
    });
    if (!group) {
      return { total: 0, page: 1, limit: 25, totalPages: 0, data: [] };
    }

    // Lấy các tham số từ queryParams giống findAll
    const {
      page = 1,
      limit = 25,
      sort = '-createdAt',
      ...filters
    } = queryParams;

    // Kiểm tra bộ lọc giống findAll
    if (!areFiltersValid(filters)) {
      return {
        success: false,
        message: `tìm kiếm không được chứa ký tự đặc biệt`,
      };
    }

    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.max(Number(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    const qb = this.userSqlRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.parent', 'parent')
      .leftJoinAndSelect('parent.parent', 'grandParent')
      .leftJoinAndSelect('user.groupUsers', 'groupUsers')
      .where('groupUsers.id = :groupId', { groupId })
      .andWhere('user.status IN (:...statuses)', {
        statuses: [STATUS.ACTIVED, STATUS.NOT_ACTIVED],
      });

    // Apply filters
    for (const key in filters) {
      if (Object.prototype.hasOwnProperty.call(filters, key)) {
        qb.andWhere(`user.${key} LIKE :${key}`, { [key]: `%${filters[key]}%` });
      }
    }

    // Apply sorting
    const sortOptions = parseSortParam(sort);
    for (const key in sortOptions) {
      qb.addOrderBy(`user.${key}`, sortOptions[key] === 1 ? 'ASC' : 'DESC');
    }

    const [data, totalRecords] = await qb
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    const totalPages = Math.ceil(totalRecords / limitNum);

    const formattedData = data.map((user) => {
      const parent = user?.parent as any;
      return {
        ...user,
        parent: user?.parent?.id?.toString() || user?.parent,
        gender: String(user?.gender).toLowerCase() === 'nam' ? 'Nam' : 'Nữ',
        birthday: user?.birthday
          ? moment(user.birthday).format('DD-MM-YYYY')
          : null,
        status: Number(user?.status) === 1 ? 'Hoạt động' : 'Không hoạt động',
        parentName: parent?.name || null,
        grandParentName: parent?.parent?.name || null,
        GroupUser: user?.groupUsers || null,
      };
    });

    // Trả về kết quả giống findAll
    return {
      total: totalRecords,
      page: pageNum,
      limit: limitNum,
      totalPages,
      data: formattedData,
      filter: filters,
    };
  }
  async findOrganizationUnitByGroupId(
    groupId: string,
    queryParams: QueryParams,
  ): Promise<any> {
    const group = await this.groupUserSqlRepo.findOneBy({
      id: groupId,
      status: STATUS.ACTIVED,
    });
    if (!group) {
      return { total: 0, page: 1, limit: 25, totalPages: 0, data: [] };
    }

    // Lấy các tham số từ queryParams
    const {
      page = 1,
      limit = 25,
      sort = '-createdAt',
      ...filters
    } = queryParams;

    // Kiểm tra bộ lọc
    if (!areFiltersValid(filters)) {
      return {
        success: false,
        message: `Tìm kiếm không được chứa ký tự đặc biệt`,
      };
    }

    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.max(Number(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    const qb = this.orgUnitSqlRepo
      .createQueryBuilder('orgUnit')
      .innerJoin('orgUnit.groupUsers', 'groupUser', 'groupUser.id = :groupId', {
        groupId,
      })
      .leftJoinAndSelect('orgUnit.parent', 'parent')
      .leftJoinAndSelect('parent.parent', 'grandParent')
      .where('orgUnit.status IN (:...statuses)', {
        statuses: [STATUS.ACTIVED, STATUS.NOT_ACTIVED],
      });

    // Apply filters
    for (const key in filters) {
      if (Object.prototype.hasOwnProperty.call(filters, key)) {
        qb.andWhere(`orgUnit.${key} LIKE :${key}`, {
          [key]: `%${filters[key]}%`,
        });
      }
    }

    // Apply sorting
    const sortOptions = parseSortParam(sort);
    for (const key in sortOptions) {
      qb.addOrderBy(`orgUnit.${key}`, sortOptions[key] === 1 ? 'ASC' : 'DESC');
    }

    const [data, totalRecords] = await qb
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    const totalPages = Math.ceil(totalRecords / limitNum);

    // Định dạng dữ liệu trả về
    const formattedData = data.map((unit) => {
      const parent = unit.parent as any;
      return {
        ...unit,
        _id: unit.id,
        name: unit.name,
        parentName: parent?.name || null, // Tên của đơn vị cha
        grandParentName: parent?.parent?.name || null, // Tên của đơn vị ông
      };
    });

    // Trả về kết quả
    return {
      total: totalRecords,
      page: pageNum,
      limit: limitNum,
      totalPages,
      data: formattedData,
      filter: filters,
    };
  }

  async update(
    groupId: string,
    updateGroupUserDto: UpdateGroupUserDto,
  ): Promise<GroupUserEntity | null> {
    const group = await this.groupUserSqlRepo.findOne({
      where: { id: groupId, status: STATUS.ACTIVED },
      select: ['id', 'name', 'code', 'roles_dynamic', 'userId'],
    });

    if (!group) {
      throw new BadRequestException({
        success: false,
        message: `Nhóm người dùng với ID ${groupId} không tồn tại hoặc không hoạt động`,
      });
    }
    const oldRolesDynamic = [...(group.roles_dynamic ?? [])];

    // ===================== CHECK TRÙNG =====================
    const checks: FindOptionsWhere<GroupUserEntity>[] = [];
    if (updateGroupUserDto.name && updateGroupUserDto.name !== group.name) {
      checks.push({
        name: updateGroupUserDto.name,
        status: STATUS.ACTIVED,
        id: Not(groupId),
      });
    }
    if (updateGroupUserDto.code && updateGroupUserDto.code !== group.code) {
      checks.push({
        code: updateGroupUserDto.code,
        status: STATUS.ACTIVED,
        id: Not(groupId),
      });
    }
    if (checks.length > 0) {
      const existingGroup = await this.groupUserSqlRepo.findOne({
        where: checks,
        select: ['id', 'code', 'name'],
      });
      if (existingGroup) {
        throw new BadRequestException({
          success: false,
          message:
            existingGroup.code === updateGroupUserDto.code
              ? `Mã nhóm ${updateGroupUserDto.code} đã tồn tại`
              : `Tên nhóm ${updateGroupUserDto.name} đã tồn tại`,
        });
      }
    }

    // ===================== MERGE FIELD =====================
    const {
      UserId,
      organizationUnits,
      roles_dynamic,
      roles,
      ...scalarUpdates
    } = updateGroupUserDto;

    const updatesToMerge: Partial<GroupUserEntity> = { ...scalarUpdates };

    let mergedOrgIds: string[] | undefined = undefined;

    if ('roles' in updateGroupUserDto) {
      updatesToMerge.roles = (roles || [])
        .map((role: any) => (typeof role === 'string' ? role : role?._id))
        .filter(Boolean);
    }

    if ('roles_dynamic' in updateGroupUserDto || 'roles' in updateGroupUserDto) {
      const sourceRoles = 'roles' in updateGroupUserDto ? (roles || []) : (group.roles || []);
      const sourceRolesDynamic = 'roles_dynamic' in updateGroupUserDto ? (roles_dynamic || []) : (group.roles_dynamic || []);

      const extractedDynamic = await this.extractDynamicRoles(sourceRoles.map((r: any) => typeof r === 'string' ? r : r?._id).filter(Boolean));
      const inputDynamic = this.transformRolesDynamicForEntity(sourceRolesDynamic);

      const mergedDynamicMap = new Map<string, { processKey: string; roleCode: string; name: string }>();
      [...extractedDynamic, ...inputDynamic].forEach(item => {
        mergedDynamicMap.set(`${item.processKey}_${item.roleCode}`, item);
      });
      updatesToMerge.roles_dynamic = Array.from(mergedDynamicMap.values());
    }

    // ===================== UPDATE ORG =====================
    if ('organizationUnits' in updateGroupUserDto) {
      if (organizationUnits && organizationUnits.length > 0) {
        const uniqueOrgIds = Array.from(new Set(organizationUnits));
        // Tách batch 2000 phần tử và dùng Promise.all để chạy song song tối ưu hiệu năng
        const orgPromises: Promise<{ id: string }[]>[] = [];
        for (let i = 0; i < uniqueOrgIds.length; i += 2000) {
          const chunk = uniqueOrgIds.slice(i, i + 2000);
          orgPromises.push(
            this.orgUnitSqlRepo.find({
              where: { id: In(chunk) },
              select: ['id'],
            })
          );
        }
        const orgUnits = (await Promise.all(orgPromises)).flat();

        if (orgUnits.length !== uniqueOrgIds.length) {
          throw new BadRequestException({
            success: false,
            message: `Một số đơn vị không tồn tại hoặc không hoạt động`,
          });
        }

        mergedOrgIds = orgUnits.map((ou) => ou.id);
      } else {
        mergedOrgIds = [];
      }
    }

    // ===================== UPDATE ROLE FOR USER =====================
    // ❌ COMMENT: Chuyển sang sync vào bảng roles_process_groups thay vì update từng user
    // if ('roles_dynamic' in updateGroupUserDto) {
    //   const { rolesToRemove, rolesToAdd } = this.diffRolesDynamic(
    //     oldRolesDynamic,
    //     updatesToMerge.roles_dynamic ?? [],
    //   );

    //   if (rolesToRemove.length || rolesToAdd.length) {
    //     // 1️⃣ Lấy userId từ bảng user_group_users
    //     const userIds = await this.getUserIdsByGroup(groupId);

    //     if (userIds.length > 0) {
    //       // 2️⃣ Load UserEntity (chỉ rolesByProcess)
    //       const userPromises: Promise<UserEntity[]>[] = [];
    //       for (let i = 0; i < userIds.length; i += 2000) {
    //         const chunk = userIds.slice(i, i + 2000);
    //         userPromises.push(
    //           this.userSqlRepo.find({
    //             where: { id: In(chunk) },
    //             select: ['id', 'rolesByProcess'],
    //           })
    //         );
    //       }
    //       const users = (await Promise.all(userPromises)).flat();

    //       // 3️⃣ Update rolesByProcess cho từng user (dùng batch update)
    //       const updateUserPromises: Promise<import('typeorm').UpdateResult>[] = [];
    //       for (const user of users) {
    //         let rolesByProcess = user.rolesByProcess ?? [];

    //         // ❌ XOÁ role_dynamic bị remove (CHỈ của group này)
    //         rolesByProcess = this.removeRolesDynamicFromUser(
    //           rolesByProcess,
    //           rolesToRemove,
    //         );

    //         // ✅ ADD role_dynamic mới (KHÔNG đụng role khác)
    //         rolesByProcess = this.addRolesDynamicToUser(
    //           rolesByProcess,
    //           rolesToAdd,
    //         );

    //         // Chunk update theo batch thay cho save
    //         updateUserPromises.push(
    //           this.userSqlRepo.update(user.id, { rolesByProcess })
    //         );

    //         if (updateUserPromises.length >= 500) {
    //           await Promise.all(updateUserPromises);
    //           updateUserPromises.length = 0;
    //         }
    //       }
    //       if (updateUserPromises.length > 0) {
    //         await Promise.all(updateUserPromises);
    //       }
    //   }

    // ===================== LƯU THÔNG TIN GROUP =====================
    if (Object.keys(updatesToMerge).length > 0) {
      await this.groupUserSqlRepo.update(groupId, updatesToMerge);
    }

    // ===================== UPDATE QUAN HỆ ORGANIZATION UNITS =====================
    if (mergedOrgIds !== undefined) {
      // Lấy danh sách ID hiện tại bằng relation builder thay vì raw SQL
      const currentOrgResult = await this.groupUserSqlRepo.manager.query(`
        SELECT organization_unit_id AS id
        FROM group_user_organization_units WITH (NOLOCK)
        WHERE group_user_id = '${groupId.replace(/'/g, "''")}'
      `).catch(() => []);

      const currentOrgIds = currentOrgResult.map((ou: any) => String(ou.id));

      const orgIdsToRemove = currentOrgIds.filter((id) => !mergedOrgIds!.includes(id));
      const orgIdsToAdd = mergedOrgIds!.filter((id) => !currentOrgIds.includes(id));

      if (orgIdsToRemove.length > 0) {
        // Chunk thao tác xóa relation theo batch
        const BATCH_SIZE = 500;
        for (let i = 0; i < orgIdsToRemove.length; i += BATCH_SIZE) {
          const chunk = orgIdsToRemove.slice(i, i + BATCH_SIZE);
          await this.groupUserSqlRepo.createQueryBuilder()
            .relation(GroupUserEntity, 'organizationUnits')
            .of(groupId)
            .remove(chunk);
        }
      }

      if (orgIdsToAdd.length > 0) {
        // Chunk thao tác thêm relation theo batch
        const BATCH_SIZE = 500;
        for (let i = 0; i < orgIdsToAdd.length; i += BATCH_SIZE) {
          const chunk = orgIdsToAdd.slice(i, i + BATCH_SIZE);
          await this.groupUserSqlRepo.createQueryBuilder()
            .relation(GroupUserEntity, 'organizationUnits')
            .of(groupId)
            .add(chunk);
        }
      }
    }

    const savedGroup = await this.groupUserSqlRepo.findOne({
      where: { id: groupId },
    });

    if (savedGroup && mergedOrgIds !== undefined) {
      (savedGroup as any).organizationUnits = mergedOrgIds.map(id => ({ id }));
    }

    // 🔄 ĐỒNG BỘ ROLES_DYNAMIC VÀ USERS VÀO roles_process_groups / roles_process_users
    if (
      'roles_dynamic' in updateGroupUserDto || 
      'roles' in updateGroupUserDto ||
      'userId' in updateGroupUserDto ||
      'UserId' in updateGroupUserDto
    ) {
      await this.syncRolesProcessGroups(
        groupId,
        savedGroup?.name || groupId,
        savedGroup?.roles_dynamic || [],
      );
    }

    this.findByCodeCache.clear();
    this.findNamesByCodesCache.clear();

    return savedGroup;
  }

  async getUserIdsByGroup(groupId: string): Promise<string[]> {
    const rows = await this.userSqlRepo.manager
      .createQueryBuilder()
      .select('ugu.user_id', 'userId')
      .from('user_group_users', 'ugu')
      .innerJoin('users', 'u', 'ugu.user_id = u.id')
      .where('ugu.group_user_id = :groupId', { groupId })
      .getRawMany();

    return rows.map(r => r.userId);
  }

  async getUserIdsByRoleDynamic(
    processKey: string,
    roleCode: string,
  ): Promise<string[]> {
    // Query user trực tiếp trong role (ko qua group)
    const directUsers = await this.groupUserSqlRepo.manager.query(`
      SELECT DISTINCT u.id AS userId
      FROM roles_process rp
      INNER JOIN roles_process_users rpu ON rp.id = rpu.role_id
      INNER JOIN users u ON u.id = rpu.user_id
      WHERE rp.process_key = '${processKey}'
        AND rp.role_code = '${roleCode}'
        AND rp.is_active = 1
        AND u.status = 1
    `);

    // Query user trong group thuộc role (tránh duplicate bằng cách group by user_id)
    const groupUsers = await this.groupUserSqlRepo.manager.query(`
      SELECT DISTINCT u.id AS userId
      FROM roles_process rp
      INNER JOIN roles_process_groups rpg ON rp.id = rpg.role_id
      INNER JOIN group_users gu ON gu.id = rpg.group_id
      INNER JOIN user_group_users ugu ON ugu.group_user_id = gu.id
      INNER JOIN users u ON u.id = ugu.user_id
      WHERE rp.process_key = '${processKey}'
        AND rp.role_code = '${roleCode}'
        AND rp.is_active = 1
        AND u.status = 1
      GROUP BY u.id
    `);

    // Gộp 2 nguồn và loại bỏ duplicate
    const allUserIds = [
      ...directUsers.map((r: any) => r.userId),
      ...groupUsers.map((r: any) => r.userId),
    ];
    const uniqueUserIds = [...new Set(allUserIds)].filter(Boolean);

    if (!uniqueUserIds.length) {
      throw new BadRequestException(
        `Không tìm thấy người dùng nào thuộc nhóm ${processKey} - ${roleCode}`,
      );
    }
    return uniqueUserIds;
  }

  async getGroupIdsByRoleDynamic(
    processKey: string,
    roleCode: string,
  ): Promise<string[]> {
    const groups = await this.groupUserSqlRepo.find({
      where: { status: STATUS.ACTIVED },
      select: ['id', 'roles_dynamic'],
    });

    const matchingGroupIds = groups
      .filter((g) => {
        const rolesDynamic = g.roles_dynamic || [];
        return rolesDynamic.some(
          (r) => r.processKey === processKey && r.roleCode === roleCode,
        );
      })
      .map((g) => g.id)
      .filter(Boolean);

    if (matchingGroupIds.length === 0) return [];

    const rows = await this.userSqlRepo.manager
      .createQueryBuilder()
      .select('DISTINCT ugu.group_user_id', 'groupId')
      .from('user_group_users', 'ugu')
      .where('ugu.group_user_id IN (:...groupIds)', { groupIds: matchingGroupIds })
      .getRawMany();

    return rows.map((r) => r.groupId).filter(Boolean);
  }

  private removeRolesDynamicFromUser(
    rolesByProcess: RolesByProcess[],
    rolesToRemove: {
      processKey: string;
      roleCode: string;
    }[],
  ): RolesByProcess[] {
    if (!rolesToRemove.length) return rolesByProcess;

    const removeMap = new Map<string, Set<string>>();

    for (const r of rolesToRemove) {
      if (!removeMap.has(r.processKey)) {
        removeMap.set(r.processKey, new Set());
      }
      removeMap.get(r.processKey)!.add(r.roleCode);
    }

    return (
      rolesByProcess
        .map((p) => {
          const removeCodes = removeMap.get(p.processKey);
          if (!removeCodes) return p;

          const filteredRoles = p.roles.filter(
            (r) => !removeCodes.has(r.roleCode),
          );

          return {
            ...p,
            roles: filteredRoles,
          };
        })
        // ❗ nếu process không còn role nào thì xoá luôn process
        .filter((p) => p.roles.length > 0)
    );
  }
  private addRolesDynamicToUser(
    rolesByProcess: RolesByProcess[],
    rolesToAdd: {
      processKey: string;
      roleCode: string;
      name: string;
    }[],
  ): RolesByProcess[] {
    if (!rolesToAdd.length) return rolesByProcess;

    const map = new Map<string, RolesByProcess>();

    // seed role cũ
    for (const p of rolesByProcess) {
      map.set(p.processKey, {
        processKey: p.processKey,
        name: p.name ?? p.processKey,
        roles: [...p.roles],
      });
    }

    // add role mới
    for (const r of rolesToAdd) {
      if (!map.has(r.processKey)) {
        map.set(r.processKey, {
          processKey: r.processKey,
          name: r.processKey,
          roles: [],
        });
      }

      const entry = map.get(r.processKey)!;

      const exists = entry.roles.some((x) => x.roleCode === r.roleCode);

      if (!exists) {
        entry.roles.push({
          roleCode: r.roleCode,
          name: r.name,
        });
      }
    }

    return Array.from(map.values());
  }

  private diffRolesDynamic(
    oldRoles: {
      processKey: string;
      roleCode: string;
      name: string;
    }[] = [],
    newRoles: {
      processKey: string;
      roleCode: string;
      name: string;
    }[] = [],
  ) {
    const key = (r: any) => `${r.processKey}__${r.roleCode}`;

    const oldSet = new Set(oldRoles.map(key));
    const newSet = new Set(newRoles.map(key));

    const rolesToRemove = oldRoles.filter((r) => !newSet.has(key(r)));

    const rolesToAdd = newRoles.filter((r) => !oldSet.has(key(r)));

    return { rolesToRemove, rolesToAdd };
  }

  private mergeRolesByProcess(
    oldRoles: RolesByProcess[] = [],
    newRolesFromGroup: {
      processKey: string;
      roleCode: string;
      name: string;
    }[],
    groupId: string, // ⭐ THÊM
  ): RolesByProcess[] {
    const map = new Map<string, RolesByProcess>();

    // 1️⃣ clone quyền cũ
    for (const item of oldRoles) {
      map.set(item.processKey, {
        processKey: item.processKey,
        name: item.name ?? item.processKey,
        roles: [...(item.roles ?? [])],
      });
    }

    // 2️⃣ gom role mới theo processKey
    const incomingMap = new Map<string, Set<string>>();
    for (const r of newRolesFromGroup) {
      if (!incomingMap.has(r.processKey)) {
        incomingMap.set(r.processKey, new Set());
      }
      incomingMap.get(r.processKey)!.add(r.roleCode);
    }

    // 3️⃣ REMOVE role cũ của group nhưng KHÔNG còn trong payload
    for (const [processKey, entry] of map.entries()) {
      entry.roles = entry.roles.filter((role: any) => {
        if (role.__groupId !== groupId) return true; // ❗ giữ role khác group
        return incomingMap.get(processKey)?.has(role.roleCode);
      });
    }

    // 4️⃣ ADD role mới
    for (const role of newRolesFromGroup) {
      if (!map.has(role.processKey)) {
        map.set(role.processKey, {
          processKey: role.processKey,
          name: role.processKey,
          roles: [],
        });
      }

      const entry = map.get(role.processKey)!;

      const exists = entry.roles.some(
        (r: any) => r.roleCode === role.roleCode && r.__groupId === groupId,
      );

      if (!exists) {
        entry.roles.push({
          roleCode: role.roleCode,
          name: role.name,
          __groupId: groupId, // ⭐ TRACE NGUỒN
        } as any);
      }
    }

    return Array.from(map.values()).filter((p) => p.roles.length > 0);
  }

  private removeGroupRolesFromUser(
    rolesByProcess: RolesByProcess[],
    groupId: string,
  ): RolesByProcess[] {
    if (!rolesByProcess || !rolesByProcess.length) return [];
    return rolesByProcess
      .map((p) => ({
        ...p,
        roles: (p.roles || []).filter((r: any) => r.__groupId !== groupId),
      }))
      .filter((p) => p.roles.length > 0);
  }

  async deleteManyByIds(ids: string[]) {
    if (!ids || ids.length === 0) {
      return false;
    }

    // 1. Tìm tất cả người dùng trong các nhóm bị xóa
    const groupUserRows = await this.groupUserSqlRepo.manager.query(
      `SELECT DISTINCT user_id FROM user_group_users WHERE group_user_id IN (${ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')})`,
    );
    const userIds = groupUserRows.map((r) => r.user_id);

    if (userIds.length > 0) {
      // 2. Cập nhật roles_by_process cho người dùng (loại bỏ quyền từ các nhóm bị xóa)
      const users = await this.userSqlRepo.find({
        where: { id: In(userIds) },
      });

      for (const user of users) {
        let currentRoles = user.rolesByProcess || [];
        for (const groupId of ids) {
          currentRoles = this.removeGroupRolesFromUser(currentRoles, groupId);
        }
        user.rolesByProcess = currentRoles;
      }
      await this.userSqlRepo.save(users);

      // 3. Xóa liên kết người dùng - nhóm trong bảng trung gian
      await this.groupUserSqlRepo.manager.query(
        `DELETE FROM user_group_users WHERE group_user_id IN (${ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')})`,
      );

      // 4. Đồng bộ lại quyền cho từng người dùng
      for (const userId of userIds) {
        try {
          await this.hrmSyncService.updateUserPermissions(userId);
        } catch (error) {
          console.error(`Lỗi cập nhật quyền cho user ${userId} khi xóa nhóm:`, error.message);
        }
      }
    }

    // 5. Xóa liên kết đơn vị tổ chức
    await this.groupUserSqlRepo.manager.query(
      `DELETE FROM group_user_organization_units WHERE group_user_id IN (${ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')})`,
    );

    // 6. Cập nhật trạng thái nhóm thành DELETED
    const result = await this.groupUserSqlRepo.update(
      { id: In(ids) },
      { status: STATUS.DELETED, userId: [] },
    );

    this.findByCodeCache.clear();
    this.findNamesByCodesCache.clear();

    return (result.affected ?? 0) > 0;
  }

  // Xóa nhóm người dùng
  async delete(groupId: string): Promise<void> {
    const group = await this.groupUserSqlRepo.findOneBy({
      id: groupId,
      status: STATUS.ACTIVED,
    });
    if (!group) {
      throw new BadRequestException({
        success: false,
        message: `Nhóm người dùng với ID ${groupId} không tồn tại hoặc không hoạt động`,
      });
    }

    // Thực hiện xóa hàng loạt với mảng 1 phần tử để tái sử dụng logic
    await this.deleteManyByIds([groupId]);
  }
  private findByCodeCache = new Map<string, { expires: number; value: any }>();
  private findNamesByCodesCache = new Map<string, { expires: number; value: any }>();

  async findByCode(code: string): Promise<{ data: any }> {
    const cached = this.findByCodeCache.get(code);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    const unit = await this.groupUserSqlRepo.findOne({
      where: { code, status: STATUS.ACTIVED },
      relations: {
        users: {
          parent: true,
        },
      },
      select: {
        id: true,
        code: true,
        status: true,
        name: true,
        users: {
          id: true,
          codeND: true,
          name: true,
          username: true,
          position: true,
          role: true,
          status: true,
          parent: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });


    if (!unit) {
      throw new BadRequestException('Không tìm thấy nhóm người dùng');
    }
    if (unit.status !== STATUS.ACTIVED) {
      throw new BadRequestException('Nhóm người dùng không hoạt động');
    }

    const res = {
      data: unit
    };
    this.findByCodeCache.set(code, { expires: Date.now() + 180000, value: res }); // Cache 3 mins
    return res;
  }
  async findNameByCode(code: string): Promise<{ data: any }> {
    const unit = await this.groupUserSqlRepo.findOne({
      where: { code, status: STATUS.ACTIVED },
      relations: {
        users: {
          parent: true,
        },
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });


    if (!unit) {
      throw new BadRequestException('Không tìm thấy nhóm người dùng');
    }
    if (unit.status !== STATUS.ACTIVED) {
      throw new BadRequestException('Nhóm người dùng không hoạt động');
    }

    return {
      data: unit
    };
  }

  async findNamesByCodes(codes: string[]): Promise<{ data: any[] }> {
    const uniqueCodes = Array.from(new Set((codes || []).map(c => String(c || '').trim()).filter(Boolean)));
    if (uniqueCodes.length === 0) {
      return { data: [] };
    }

    const cachedResults: any[] = [];
    const missingCodes: string[] = [];

    for (const code of uniqueCodes) {
      const cached = this.findNamesByCodesCache.get(code);
      if (cached && cached.expires > Date.now()) {
        cachedResults.push(cached.value);
      } else {
        missingCodes.push(code);
      }
    }

    if (missingCodes.length === 0) {
      return { data: cachedResults };
    }

    // Tách batch 2000 phần tử và dùng Promise.all để chạy song song tối ưu hiệu năng
    const unitPromises: Promise<any[]>[] = [];
    for (let i = 0; i < missingCodes.length; i += 2000) {
      const chunk = missingCodes.slice(i, i + 2000);
      unitPromises.push(
        this.groupUserSqlRepo.find({
          where: {
            code: In(chunk),
            status: STATUS.ACTIVED,
          },
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
          },
        })
      );
    }
    const units = (await Promise.all(unitPromises)).flat();

    const now = Date.now();
    for (const unit of units) {
      if (unit && unit.code) {
        this.findNamesByCodesCache.set(unit.code, { expires: now + 180000, value: unit });
        cachedResults.push(unit);
      }
    }

    return {
      data: cachedResults || [],
    };
  }

  /**
   * 🔄 ĐỒNG BỘ ROLES_DYNAMIC VÀO BẢNG roles_process_groups
   * Khi group có roles_dynamic thay đổi, cập nhật bảng roles_process_groups
   * Để các service khác có thể query theo group thay vì expand từng user
   *
   * ✅ SỬA: Tên cột trong bảng roles_process_groups:
   *   - role_id (không phải roles_process_id)
   *   - group_id (không phải group_user_id)
   */
  async syncRolesProcessGroups(
    groupId: string,
    groupName: string,
    rolesDynamic: { processKey: string; roleCode: string; name: string }[],
  ): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`[syncRolesProcessGroups] START - group: ${groupId}, roles: ${rolesDynamic?.length || 0}`);

    try {
      const manager = this.groupUserSqlRepo.manager;
      const safeGroupId = groupId.replace(/'/g, "''");

      // A. Lấy danh sách các role_id hiện có của nhóm này trong DB trước khi cập nhật để phục vụ dọn dẹp roles_process_users sau này
      const currentGroupRolesResult = await manager.query(`
        SELECT role_id AS roleId FROM roles_process_groups WHERE group_id = '${safeGroupId}'
      `).catch(() => []);
      const currentRoleIds = currentGroupRolesResult.map(r => String(r.roleId)).filter(Boolean);

      // 1️⃣ Lấy tất cả roles_process entries cần thiết trong 1 query dùng OR
      const rolesToSync = rolesDynamic || [];
      if (rolesToSync.length === 0) {
        // Nếu không có roles_dynamic, xóa hết relations của group này
        await manager.query(`
          DELETE FROM roles_process_groups WHERE group_id = '${safeGroupId}'
        `).catch((err) => {
          this.logger.warn(`[syncRolesProcessGroups] Delete all relations warning: ${err.message}`);
        });

        // Dọn dẹp cả roles_process_users cho các role cũ của group này
        if (currentRoleIds.length > 0) {
          const rolesProcessToClean = await manager.query(`
            SELECT rp.id, rp.process_key AS processKey, rp.role_code AS roleCode
            FROM roles_process rp
            WHERE rp.id IN (${currentRoleIds.map(id => `'${id.replace(/'/g, "''")}'`).join(', ')})
          `).catch(() => []);
          await this.syncRolesProcessUsersForGroup(manager, groupId, rolesProcessToClean, []);
        }

        this.logger.log(`[syncRolesProcessGroups] COMPLETED (empty roles) in ${Date.now() - startTime}ms`);
        return;
      }

      // Xây dựng điều kiện OR cho query
      const orConditions = rolesToSync.map((r) => {
        const pk = r.processKey.replace(/'/g, "''");
        const rc = r.roleCode.replace(/'/g, "''");
        return `(rp.process_key = '${pk}' AND rp.role_code = '${rc}')`;
      }).join(' OR ');

      // Lấy tất cả roles_process phù hợp
      const existingRolesProcess = await manager.query(`
        SELECT rp.id, rp.process_key AS processKey, rp.role_code AS roleCode
        FROM roles_process rp
        WHERE ${orConditions}
      `).catch(() => []);

      this.logger.log(`[syncRolesProcessGroups] Found ${existingRolesProcess.length} existing roles_process`);

      // Tạo map để tra cứu nhanh
      const existingRolesMap = new Map<string, any>();
      for (const rp of existingRolesProcess) {
        existingRolesMap.set(`${rp.processKey}|${rp.roleCode}`, rp);
      }

      // 2️⃣ Tạo mới các roles_process chưa có
      const newRoleInserts: string[] = [];
      for (const roleDyn of rolesToSync) {
        const key = `${roleDyn.processKey}|${roleDyn.roleCode}`;
        if (!existingRolesMap.has(key)) {
          const newId = uuidv4().replace(/'/g, "''");
          const processKey = roleDyn.processKey.replace(/'/g, "''");
          const roleCode = roleDyn.roleCode.replace(/'/g, "''");
          const roleName = (roleDyn.name || roleDyn.roleCode).replace(/'/g, "''");
          newRoleInserts.push(`SELECT '${newId}' AS id, '${processKey}' AS processKey, '${roleCode}' AS roleCode, '${roleName}' AS roleName, 1 AS isActive`);
        }
      }

      // Batch insert các roles_process mới
      if (newRoleInserts.length > 0) {
        await manager.query(`
          INSERT INTO roles_process (id, process_key, role_code, role_name, is_active)
          SELECT * FROM (${newRoleInserts.join(' UNION ALL ')}) AS new_roles
          WHERE NOT EXISTS (
            SELECT 1 FROM roles_process rp
            WHERE rp.process_key = new_roles.processKey
            AND rp.role_code = new_roles.roleCode
          )
        `).catch((err) => {
          this.logger.warn(`[syncRolesProcessGroups] Batch insert warning: ${err.message}`);
        });
        this.logger.log(`[syncRolesProcessGroups] Inserted ${newRoleInserts.length} new roles_process`);
      }

      // 3️⃣ Lấy lại danh sách đầy đủ sau khi insert (bây giờ đã có đủ)
      const allRolesProcess = await manager.query(`
        SELECT rp.id, rp.process_key AS processKey, rp.role_code AS roleCode
        FROM roles_process rp
        WHERE ${orConditions}
      `).catch(() => existingRolesProcess);

      // Thu thập tất cả các role ID để thực hiện đồng bộ hóa
      const roleIdsToLink = allRolesProcess.map((r: any) => String(r.id)).filter(Boolean);

      // 4️⃣ BATCH: Xóa relations cũ của group này TRƯỚC
      await manager.query(`
        DELETE FROM roles_process_groups WHERE group_id = '${safeGroupId}'
      `).catch((err) => {
        this.logger.warn(`[syncRolesProcessGroups] Delete old relations warning: ${err.message}`);
      });

      // 5️⃣ BATCH: Thêm relations mới vào bảng trung gian
      if (roleIdsToLink.length > 0) {
        const insertValues = roleIdsToLink.map((roleId: string) => `('${roleId}', '${safeGroupId}')`).join(',');

        await manager.query(`
          INSERT INTO roles_process_groups (role_id, group_id)
          VALUES ${insertValues}
        `).catch((err) => {
          this.logger.warn(`[syncRolesProcessGroups] Insert relations warning: ${err.message}`);
        });
        this.logger.log(`[syncRolesProcessGroups] Inserted ${roleIdsToLink.length} relations`);
      }

      // 6️⃣ BATCH: Đồng bộ cả sang bảng liên kết roles_process_users
      const allProcessedRoleIds = Array.from(new Set([...currentRoleIds, ...roleIdsToLink]));
      if (allProcessedRoleIds.length > 0) {
        const rolesToProcessDetail = await manager.query(`
          SELECT rp.id, rp.process_key AS processKey, rp.role_code AS roleCode
          FROM roles_process rp
          WHERE rp.id IN (${allProcessedRoleIds.map(id => `'${id.replace(/'/g, "''")}'`).join(', ')})
        `).catch(() => []);
        await this.syncRolesProcessUsersForGroup(manager, groupId, rolesToProcessDetail, roleIdsToLink);
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(`[syncRolesProcessGroups] COMPLETED in ${elapsed}ms - group: ${groupId}, roles: ${rolesDynamic?.length || 0}`);
    } catch (err) {
      this.logger.error(`[syncRolesProcessGroups] ERROR: ${err?.message}`, err?.stack);
    }
  }

  private async syncRolesProcessUsersForGroup(
    manager: any,
    groupId: string,
    rolesToProcess: { id: string; processKey: string; roleCode: string }[],
    newRoleIds: string[],
  ): Promise<void> {
    const safeGroupId = groupId.replace(/'/g, "''");
    
    // 1. Lấy danh sách các user hiện tại của nhóm
    const userIds = await this.getUserIdsByGroup(groupId);
    const roleIdsToProcess = rolesToProcess.map(r => String(r.id)).filter(Boolean);

    if (roleIdsToProcess.length === 0) return;

    // 2. Lấy toàn bộ phân quyền trực tiếp từ bảng role_feature để tránh xóa nhầm gán trực tiếp
    const allFeatures = await manager.find(RoleFeatureEntity, {
      select: ['processKey', 'roles'],
    }).catch(() => []);
    const directAssignments = new Set<string>(); // key: `${processKey}|${roleCode}|${userId}`
    for (const rf of allFeatures) {
      if (!rf.processKey) continue;
      for (const role of rf.roles || []) {
        if (!role.roleCode) continue;
        for (const uId of role.users || []) {
          directAssignments.add(`${rf.processKey.trim()}|${role.roleCode.trim()}|${uId.trim()}`);
        }
      }
    }

    // Map thông tin role_id sang processKey và roleCode
    const roleIdMap = new Map<string, { processKey: string; roleCode: string }>();
    for (const rp of rolesToProcess) {
      roleIdMap.set(String(rp.id), {
        processKey: String(rp.processKey).trim(),
        roleCode: String(rp.roleCode).trim(),
      });
    }

    // 3. Lấy tất cả các liên kết hiện tại trong roles_process_users cho các roleIdsToProcess
    const existingLinksResult = await manager.query(`
      SELECT role_id AS roleId, user_id AS userId
      FROM roles_process_users
      WHERE role_id IN (${roleIdsToProcess.map(id => `'${id.replace(/'/g, "''")}'`).join(', ')})
    `).catch(() => []);

    const existingLinks = new Set<string>(); // key: `${roleId}|${userId}`
    for (const link of existingLinksResult) {
      existingLinks.add(`${String(link.roleId).trim()}|${String(link.userId).trim()}`);
    }

    // 4. Tìm các liên kết cần THÊM MỚI (chỉ thêm cho các role vẫn còn trong nhóm và các user hiện tại của nhóm)
    const linksToInsert: string[] = [];
    for (const roleId of newRoleIds) {
      for (const userId of userIds) {
        const key = `${roleId}|${userId}`;
        if (!existingLinks.has(key)) {
          linksToInsert.push(`('${roleId.replace(/'/g, "''")}', '${userId.replace(/'/g, "''")}')`);
        }
      }
    }

    if (linksToInsert.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < linksToInsert.length; i += BATCH_SIZE) {
        const chunk = linksToInsert.slice(i, i + BATCH_SIZE);
        await manager.query(`
          INSERT INTO roles_process_users (role_id, user_id)
          VALUES ${chunk.join(', ')}
        `).catch((err) => {
          this.logger.warn(`[syncRolesProcessUsersForGroup] Batch insert warning: ${err.message}`);
        });
      }
      this.logger.log(`[syncRolesProcessUsersForGroup] Inserted ${linksToInsert.length} new user-role relations.`);
    }

    // 5. Tìm các liên kết cần XÓA BỎ
    const otherGroupLinksResult = await manager.query(`
      SELECT DISTINCT rpg.role_id AS roleId, ugu.user_id AS userId
      FROM roles_process_groups rpg WITH (NOLOCK)
      INNER JOIN user_group_users ugu WITH (NOLOCK) ON rpg.group_id = ugu.group_user_id
      WHERE rpg.role_id IN (${roleIdsToProcess.map(id => `'${id.replace(/'/g, "''")}'`).join(', ')})
        AND rpg.group_id <> '${safeGroupId}'
    `).catch(() => []);

    const otherGroupLinks = new Set<string>();
    for (const link of otherGroupLinksResult) {
      otherGroupLinks.add(`${String(link.roleId).trim()}|${String(link.userId).trim()}`);
    }

    const linksToRemove: { roleId: string; userId: string }[] = [];
    
    for (const linkStr of existingLinks) {
      const [roleId, userId] = linkStr.split('|');
      const isRoleStillInGroup = newRoleIds.includes(roleId);
      const isUserStillInGroup = userIds.includes(userId);

      if (!isRoleStillInGroup || !isUserStillInGroup) {
        // Kiểm tra gán trực tiếp
        const roleInfo = roleIdMap.get(roleId);
        const isDirect = roleInfo ? directAssignments.has(`${roleInfo.processKey}|${roleInfo.roleCode}|${userId}`) : false;
        
        if (!isDirect) {
          // Kiểm tra xem user có thuộc nhóm khác cũng có role này không
          const hasOtherGroup = otherGroupLinks.has(`${roleId}|${userId}`);

          if (!hasOtherGroup) {
            linksToRemove.push({ roleId, userId });
          }
        }
      }
    }

    if (linksToRemove.length > 0) {
      const BATCH_SIZE = 200;
      for (let i = 0; i < linksToRemove.length; i += BATCH_SIZE) {
        const chunk = linksToRemove.slice(i, i + BATCH_SIZE);
        const conditions = chunk
          .map(l => `(role_id = '${l.roleId.replace(/'/g, "''")}' AND user_id = '${l.userId.replace(/'/g, "''")}')`)
          .join(' OR ');
        await manager.query(`
          DELETE FROM roles_process_users
          WHERE ${conditions}
        `).catch((err: any) => {
          this.logger.warn(`[syncRolesProcessUsersForGroup] Delete link warning: ${err.message}`);
        });
      }
      this.logger.log(`[syncRolesProcessUsersForGroup] Removed ${linksToRemove.length} obsolete user-role relations.`);
    }
  }
}
