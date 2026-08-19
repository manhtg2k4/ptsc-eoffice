import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import {
  CreateGroupUserInDocumentDto,
  RolesDynamicDto,
  UpdateGroupUserInDocumentDto,
} from './group-users.dto';
import { STATUS } from '../variables/CONST_STATUS';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Not, Repository, FindOptionsWhere } from 'typeorm';
import { GroupUserEntity } from './entities/group-users.entity';
import { FeatureManagementEntity, StatusFeature } from 'src/feature-management/feature-management.entity';
import { ConfigurationService } from 'src/view-config/configuration.service';
import { buildDocumentCriteriaHelper, parseSort } from 'src/documents/helpers/build.filter';

const DOCUMENT_STATUS = 5;
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

@Injectable()
export class GroupUserInDocumentService {
  constructor(
    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserSqlRepo: Repository<GroupUserEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userSqlRepo: Repository<UserEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly orgUnitSqlRepo: Repository<OrganizationUnitEntity>,
    private readonly configurationService: ConfigurationService,
    @Inject(forwardRef(() => HrmSyncService))
    private readonly hrmSyncService: HrmSyncService,
  ) { }

  async findDefaultIncomingGroups(): Promise<GroupUserEntity[]> {
    return this.groupUserSqlRepo.find({
      where: {
        isDefaultIncoming: true,
        status: Not(STATUS.DELETED),
      },
    });
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
    createGroupUserDto: CreateGroupUserInDocumentDto,
  ): Promise<GroupUserEntity> {
    const existingGroup = await this.groupUserSqlRepo.findOne({
      where: [
        { code: createGroupUserDto.code, status: DOCUMENT_STATUS },
        { name: createGroupUserDto.name, status: DOCUMENT_STATUS },
      ],
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

    // Tạo một entity mới một cách an toàn, không spread DTO trực tiếp
    const groupEntity = this.groupUserSqlRepo.create({
      id: uuidv4(),
      name: createGroupUserDto.name,
      code: createGroupUserDto.code,
      type: createGroupUserDto.isDefault ? 'default' : null,
      description: null,
      roleType: null,
      roles: [],
      roles_dynamic: [],
      order: createGroupUserDto.order ?? (createGroupUserDto.isDefault ? 10 : 99),
      status: DOCUMENT_STATUS,
      isDefaultIncoming: createGroupUserDto.isDefaultIncoming ?? false,
    });

    if (createGroupUserDto.userId && createGroupUserDto.userId.length > 0) {
      const users = await this.userSqlRepo.find({
        where: {
          id: In(createGroupUserDto.userId),
          status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED]),
        },
      });

      groupEntity.users = users;
      groupEntity.userId = users.map((u) => u.id);
    }

    return this.groupUserSqlRepo.save(groupEntity);
  }

  async addUsersToGroup(
    groupId: string,
    userIds: string[],
  ): Promise<{ success: boolean; message: string }> {
    const group = await this.groupUserSqlRepo.findOne({
      where: { id: groupId, status: DOCUMENT_STATUS },
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

    const newUsers = await this.userSqlRepo.find({
      where: { id: In(userIds) },
    });

    const foundUserIds = newUsers.map((u) => u.id);
    const notFoundUserIds = userIds.filter((id) => !foundUserIds.includes(id));
    if (notFoundUserIds.length > 0) {
      throw new BadRequestException({
        success: false,
        message: `Các userId không tồn tại: ${notFoundUserIds.join(', ')}`,
      });
    }

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
    for (const userId of userIds) {
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
      where: { id: groupId, status: DOCUMENT_STATUS },
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

    const orgUnits =
      uniqueOrgIds.length > 0
        ? await this.orgUnitSqlRepo.find({
          where: { id: In(uniqueOrgIds), status: STATUS.ACTIVED },
        })
        : [];

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
      where: { id: groupId, status: DOCUMENT_STATUS },
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
    try {
      if (!id) {
        throw new BadRequestException('Thiếu id');
      }

      const unit = await this.groupUserSqlRepo.findOne({
        where: [
          { id, status: DOCUMENT_STATUS },
          { code: id, status: DOCUMENT_STATUS },
        ],
        relations: ['organizationUnits', 'permissions'],
      });

      if (!unit) {
        throw new BadRequestException('Không tìm thấy nhóm người dùng');
      }
      if (unit.status !== DOCUMENT_STATUS) {
        throw new BadRequestException('Nhóm người dùng không hoạt động');
      }

      // lấy users từ JSON userId bằng OPENJSON (đồng nhất findAll)
      let users: any[] = [];
      try {
        users = await this.groupUserSqlRepo.manager.query(
          `
          SELECT DISTINCT
            u.id,
            u.name
          FROM group_users gu
          OUTER APPLY OPENJSON(
            CASE 
              WHEN ISJSON(gu.userId) = 1 THEN gu.userId
              ELSE '[]'
            END
          ) j
          LEFT JOIN users u 
            ON u.id = LTRIM(RTRIM(j.value))
          WHERE gu.id = @0
          `,
          [id],
        );
      } catch (e) {
        console.error('query users error:', e?.message || e);
      }

      return {
        data: {
          ...unit,
          isDefault: unit.order === 10,

          // giữ nguyên format cũ
          organizationUnits: (unit.organizationUnits || []).map((ou) => ou.id),

          // override userId → object
          userId: (users || [])
            .filter((u) => u?.id)
            .map((u) => ({
              id: u.id,
              name: u.name,
            })),
        },
      };
    } catch (error) {
      console.error('GroupUserInDocumentService.findById error:', error?.message ?? error);
      throw new BadRequestException({
        success: false,
        message: 'Lỗi khi lấy chi tiết nhóm người dùng',
      });
    }
  }

  async findAll(queryParams: QueryParams): Promise<any> {
    try {
      let {
        page = 1,
        limit = 25,
        sort = '{"order": 1, "updatedAt": -1}',
        processFn,
        filter = {},
        isExport,
        countOnly,
      } = queryParams as any;

      if (typeof filter === 'string') {
        try {
          filter = JSON.parse(filter);
        } catch (e) {
          filter = {};
        }
      }

      if (!areFiltersValid(filter)) {
        return {
          success: false,
          message: `tìm kiếm không được chứa ký tự đặc biệt`,
        };
      }

      const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];
      let userIdFilter: any = null;
      let isDefaultIncomingFilter: boolean | undefined = undefined;

      // build criteria
      if (filter && typeof filter === 'object') {
        Object.entries(filter).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') return;

          if (typeof value === 'object') {
            const v = value as any;
            if (v.startDate && v.endDate) {
              criteria.push({ name: key, operator: 'between', value: [String(v.startDate), String(v.endDate)] });
            } else if (v.startDate) {
              criteria.push({ name: key, operator: 'gte', value: String(v.startDate) });
            } else if (v.endDate) {
              criteria.push({ name: key, operator: 'lte', value: String(v.endDate) });
            } else if (v.value !== undefined) {
              criteria.push({ name: key, operator: 'like', value: String(v.value) });
            }
          } else {
            criteria.push({ name: key, operator: 'like', value: String(value) });
          }
        });
      }

      // Check isDefaultIncoming in queryParams
      if (queryParams.isDefaultIncoming !== undefined) {
        isDefaultIncomingFilter = String(queryParams.isDefaultIncoming) === 'true' || String(queryParams.isDefaultIncoming) === '1';
      }
      // Check in filter
      if (filter && typeof filter === 'object' && filter.isDefaultIncoming !== undefined) {
        isDefaultIncomingFilter = String(filter.isDefaultIncoming) === 'true' || String(filter.isDefaultIncoming) === '1';
      }

      const normalCriteria = criteria.filter((c) => {
        if (c.name === 'userId') {
          userIdFilter = c;
          return false;
        }
        if (c.name === 'isDefaultIncoming' || c.name === 'is_default_incoming') {
          isDefaultIncomingFilter = String(c.value) === 'true' || String(c.value) === '1';
          return false;
        }
        return true;
      });

      // feature config
      const featureManagement = processFn
        ? await this.groupUserSqlRepo.manager
          .getRepository(FeatureManagementEntity)
          .createQueryBuilder('feature')
          .addSelect('feature.valueField')
          .addSelect('feature.fields')
          .where('feature.code = :code', { code: String(processFn).trim() })
          .andWhere('feature.status = :status', { status: 1 })
          .andWhere('feature.statusFeature = :statusFeature', {
            statusFeature: StatusFeature.ACTIVE,
          })
          .getOne()
        : null;

      // detect advancedSearch userId
      let isAdvancedUserId = false;
      try {
        if (featureManagement?.valueField) {
          const parsed =
            typeof featureManagement.valueField === 'string'
              ? JSON.parse(featureManagement.valueField)
              : featureManagement.valueField;

          const userField = parsed?.field?.find(
            (f: any) => f.key === 'userId' || f.name === 'userId',
          );

          if (userField?.advancedSearch === true) {
            isAdvancedUserId = true;
          }
        }
      } catch (err) {
        console.warn('Parse valueField error:', err?.message);
      }

      const { sql: filterFeature = '', joins: filterJoins = '' } = buildDocumentCriteriaHelper(
        [
          ...(featureManagement?.criteria || []),
          ...normalCriteria,
        ],
        'group_users',
        featureManagement,
      );

      const sanitizeValue = (value: string) => String(value).replace(/'/g, "''").trim();

      // normal filter
      const manualFilterParts: string[] = [];
      for (const item of normalCriteria) {
        const field = `group_users.${item.name.replace(/([A-Z])/g, '_$1').toLowerCase()}`;

        if (item.operator === 'between' && Array.isArray(item.value)) {
          manualFilterParts.push(
            `${field} BETWEEN '${sanitizeValue(item.value[0])}' AND '${sanitizeValue(item.value[1])}'`,
          );
        } else if (item.operator === 'gte') {
          manualFilterParts.push(`${field} >= '${sanitizeValue(String(item.value))}'`);
        } else if (item.operator === 'lte') {
          manualFilterParts.push(`${field} <= '${sanitizeValue(String(item.value))}'`);
        } else {
          manualFilterParts.push(
            `${field} LIKE N'%${sanitizeValue(String(item.value))}%'`,
          );
        }
      }

      // userId condition
      let userIdCondition = '';
      if (userIdFilter) {
        const values = Array.isArray(userIdFilter.value)
          ? userIdFilter.value.map((v) => sanitizeValue(String(v)))
          : [sanitizeValue(String(userIdFilter.value))];

        const jsonSource = `
          CASE 
            WHEN ISJSON(group_users.userId) = 1 THEN group_users.userId
            ELSE '[]'
          END
        `;

        if (isAdvancedUserId) {
          // ADVANCED → filter theo ID (IN / =)
          if (values.length === 1) {
            userIdCondition = `
              EXISTS (
                SELECT 1 
                FROM OPENJSON(${jsonSource}) j
                WHERE j.value = '${values[0]}'
              )
            `;
          } else {
            userIdCondition = `
              EXISTS (
                SELECT 1 
                FROM OPENJSON(${jsonSource}) j
                WHERE j.value IN (${values.map(v => `'${v}'`).join(', ')})
              )
            `;
          }
        } else {
          // NORMAL → search theo tên user (JOIN users)
          userIdCondition = `
            EXISTS (
              SELECT 1
              FROM OPENJSON(${jsonSource}) j
              INNER JOIN users u 
                ON u.id = LTRIM(RTRIM(j.value))
              WHERE u.name COLLATE Vietnamese_CI_AI 
                    LIKE N'%${values[0]}%'
            )
          `;
        }
      }

      // WHERE
      let whereClause = `WHERE group_users.status = ${DOCUMENT_STATUS}`;
      if (isDefaultIncomingFilter !== undefined) {
        whereClause += ` AND group_users.is_default_incoming = ${isDefaultIncomingFilter ? 1 : 0}`;
      }
      const baseCondition = filterFeature ? `(${filterFeature})` : '';

      if (userIdCondition) {
        if (isAdvancedUserId) {
          // AND
          if (baseCondition) {
            whereClause += ` AND (${baseCondition} AND ${userIdCondition})`;
          } else {
            whereClause += ` AND (${userIdCondition})`;
          }
        } else {
          // OR
          if (baseCondition) {
            whereClause += ` AND (${baseCondition} OR ${userIdCondition})`;
          } else {
            whereClause += ` AND (${userIdCondition})`;
          }
        }
      } else if (baseCondition) {
        whereClause += ` AND ${baseCondition}`;
      }

      // pagination
      const pageNum = Math.max(Number(page), 1);
      let limitNum = Math.max(Number(limit), 1);
      if (isExport === 'true') limitNum = 9999;
      const offsetNum = (pageNum - 1) * limitNum;

      // joins
      const joinUserNames = `
        OUTER APPLY (
          SELECT 
            STRING_AGG(t.name, ', ') + CASE WHEN MAX(t.total_users) > 5 THEN N' và ' + CAST(MAX(t.total_users) - 5 AS NVARCHAR) + N' người khác' ELSE '' END AS user_names
          FROM (
            SELECT 
              u.name,
              ROW_NUMBER() OVER(ORDER BY u.name) as rn,
              COUNT(*) OVER() as total_users
            FROM OPENJSON(
              CASE 
                WHEN ISJSON(group_users.userId) = 1 THEN group_users.userId
                ELSE '[]'
              END
            ) j
            INNER JOIN users u 
              ON u.id = LTRIM(RTRIM(j.value))
          ) t
          WHERE t.rn <= 5
        ) user_join
      `;

      const joinClause = `${filterJoins || ''} ${joinUserNames}`;

      const orderBy = ' ORDER BY ' + parseSort(sort, {}, 'group_users');

      const totalSql = `
        SELECT COUNT(*) AS total
        FROM group_users
        ${joinClause}
        ${whereClause}
      `;

      const rowsSql = `
        SELECT group_users.*, user_join.user_names
        FROM group_users
        ${joinClause}
        ${whereClause}
        ${orderBy}
        OFFSET ${offsetNum} ROWS
        FETCH NEXT ${limitNum} ROWS ONLY
      `;

      const totalResult = await this.groupUserSqlRepo.query(totalSql);
      const total = Number(totalResult?.[0]?.total ?? 0);

      if (countOnly === 'true') return { total };

      const items = await this.groupUserSqlRepo.query(rowsSql);

      return {
        items: (items || []).map((i: any) => ({
          ...i,
          _id: i.id,
          userId: i.user_names || '',
          isDefault: i.order === 10,
        })),
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (error) {
      console.error('GroupUserInDocumentService.findAll error:', error?.message ?? error);
      throw new BadRequestException({
        success: false,
        message: 'Lỗi khi tìm kiếm nhóm người dùng',
      });
    }
  }

  async findAllSimple(queryParams: any): Promise<any> {
    try {
      let {
        page = 1,
        limit = 25,
        sort = '{"order": 1, "updatedAt": -1}',
        filter = {},
        countOnly,
      } = queryParams;

      if (typeof filter === 'string') {
        try {
          filter = JSON.parse(filter);
        } catch (e) {
          filter = {};
        }
      }

      const sanitizeValue = (value: string) =>
        String(value).replace(/'/g, "''").trim();

      // build where
      let whereClause = `WHERE group_users.status = ${DOCUMENT_STATUS}`;

      let isDefaultIncomingFilter: boolean | undefined = undefined;
      if (queryParams.isDefaultIncoming !== undefined) {
        isDefaultIncomingFilter = String(queryParams.isDefaultIncoming) === 'true' || queryParams.isDefaultIncoming === '1' || queryParams.isDefaultIncoming === true;
      }
      if (filter && typeof filter === 'object' && filter.isDefaultIncoming !== undefined) {
        isDefaultIncomingFilter = String(filter.isDefaultIncoming) === 'true' || filter.isDefaultIncoming === '1' || filter.isDefaultIncoming === true;
      }

      if (isDefaultIncomingFilter !== undefined) {
        whereClause += ` AND group_users.is_default_incoming = ${isDefaultIncomingFilter ? 1 : 0}`;
      }

      if (filter?.name) {
        const name = sanitizeValue(filter.name);
        whereClause += ` AND group_users.name LIKE N'%${name}%'`;
      }

      // pagination
      const pageNum = Math.max(Number(page), 1);
      const limitNum = Math.max(Number(limit), 1);
      const offsetNum = (pageNum - 1) * limitNum;

      // total
      const totalSql = `
        SELECT COUNT(*) AS total
        FROM group_users
        ${whereClause}
      `;

      const totalResult = await this.groupUserSqlRepo.query(totalSql);
      const total = Number(totalResult?.[0]?.total ?? 0);

      if (countOnly === 'true') {
        return { total };
      }

      const parsedSort = parseSort(sort, {}, 'group_users');
      const orderBy = ' ORDER BY CASE WHEN group_users.[order] = 10 THEN 0 ELSE 1 END ASC, ' + parsedSort;

      // data
      const rowsSql = `
        SELECT 
          group_users.id,
          group_users.name,
          group_users.[order],
          group_users.userId
        FROM group_users
        ${whereClause}
        ${orderBy}
        OFFSET ${offsetNum} ROWS
        FETCH NEXT ${limitNum} ROWS ONLY
      `;

      const items = await this.groupUserSqlRepo.query(rowsSql);

      const mappedItems = (items || []).map((item: any) => {
        let userIds = [];
        try {
          if (item.userId) {
            userIds = typeof item.userId === 'string' ? JSON.parse(item.userId) : item.userId;
          }
        } catch (e) {
          userIds = [];
        }

        return {
          id: item.id,
          name: item.name || '',
          isDefault: item.order === 10,
          userIds: Array.isArray(userIds) ? userIds : [],
        };
      });

      return {
        success: true,
        data: mappedItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (error) {
      console.error(
        'GroupUserInDocumentService.findAllSimple error:',
        error?.message ?? error,
      );

      throw new BadRequestException({
        success: false,
        message: 'Lỗi khi lấy danh sách nhóm người dùng (simple)',
      });
    }
  }

  async findUsersByGroupCode(
    groupCode: string,
    queryParams: QueryParams,
  ): Promise<any> {
    const group = await this.groupUserSqlRepo.findOneBy({
      code: groupCode,
      status: DOCUMENT_STATUS,
    });
    if (!group) {
      return { total: 0, page: 1, limit: 25, totalPages: 0, data: [] };
    }
    return this.findUsersByGroupId(group.id, queryParams);
  }

  async findUsersByIds(
    userIds: string[],
    queryParams: QueryParams,
  ): Promise<any> {
    if (!userIds || !userIds.length) {
      return { total: 0, page: 1, limit: 25, totalPages: 0, data: [] };
    }

    const {
      page = 1,
      limit = 25,
      sort = '-createdAt',
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

    const qb = this.userSqlRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.parent', 'parent')
      .leftJoinAndSelect('parent.parent', 'grandParent')
      .leftJoinAndSelect('user.groupUsers', 'groupUsers')
      .where('user.id IN (SELECT value FROM OPENJSON(:userIdsJson))', { userIdsJson: JSON.stringify(userIds) })
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

    return {
      total: totalRecords,
      page: pageNum,
      limit: limitNum,
      totalPages,
      data: formattedData,
      filter: filters,
    };
  }

  async findUsersByGroupId(
    groupId: string,
    queryParams: QueryParams,
  ): Promise<any> {
    const group = await this.groupUserSqlRepo.findOneBy({
      id: groupId,
      status: DOCUMENT_STATUS,
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
      status: DOCUMENT_STATUS,
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
    updateGroupUserDto: UpdateGroupUserInDocumentDto,
  ): Promise<GroupUserEntity | null> {
    const group = await this.groupUserSqlRepo.findOne({
      where: { id: groupId, status: DOCUMENT_STATUS },
      relations: ['users', 'organizationUnits'],
    });

    if (!group) {
      throw new BadRequestException({
        success: false,
        message: `Nhóm người dùng với ID ${groupId} không tồn tại hoặc không hoạt động`,
      });
    }

    const oldRolesDynamic = [...(group.roles_dynamic ?? [])];
    const oldUserIds = [...(group.userId ?? [])];
    const shouldUpdateUsers = 'userId' in updateGroupUserDto;
    const permissionUserIds = new Set<string>();

    // ===================== CHECK TRÙNG =====================
    const checks: FindOptionsWhere<GroupUserEntity>[] = [];
    if (updateGroupUserDto.name && updateGroupUserDto.name !== group.name) {
      checks.push({
        name: updateGroupUserDto.name,
        status: DOCUMENT_STATUS,
        id: Not(groupId),
      });
    }
    if (updateGroupUserDto.code && updateGroupUserDto.code !== group.code) {
      checks.push({
        code: updateGroupUserDto.code,
        status: DOCUMENT_STATUS,
        id: Not(groupId),
      });
    }
    if (checks.length > 0) {
      const existingGroup = await this.groupUserSqlRepo.findOne({
        where: checks,
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
      userId,
      organizationUnits,
      roles_dynamic,
      roles,
      isDefault,
      ...scalarUpdates
    } = updateGroupUserDto;

    const updatesToMerge: Partial<GroupUserEntity> = { ...scalarUpdates };
    if ('isDefault' in updateGroupUserDto) {
      updatesToMerge.type = isDefault ? 'default' : null;
      if (updateGroupUserDto.order === undefined) {
        if (isDefault === true) {
          updatesToMerge.order = 10;
        } else if (isDefault === false) {
          updatesToMerge.order = 99;
        }
      }
    }

    let mergedOrgUnits: OrganizationUnitEntity[] | undefined = undefined;

    if ('roles' in updateGroupUserDto) {
      updatesToMerge.roles = (roles || [])
        .map((role: any) => (typeof role === 'string' ? role : role?._id))
        .filter(Boolean);
    }

    if ('roles_dynamic' in updateGroupUserDto) {
      updatesToMerge.roles_dynamic =
        this.transformRolesDynamicForEntity(roles_dynamic);
    }

    this.groupUserSqlRepo.merge(group, updatesToMerge as any);

    // ===================== UPDATE USERS =====================
    if (shouldUpdateUsers) {
      const newUserIds = Array.isArray(userId)
        ? Array.from(new Set(userId.filter(Boolean).map(String)))
        : [];

      if (newUserIds.length > 0) {
        const users = await this.userSqlRepo.find({
          where: {
            id: In(newUserIds),
            status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED]),
          },
        });



        group.users = users;
        group.userId = users.map((u) => u.id);
      } else {
        group.users = [];
        group.userId = [];
      }

      const removedUserIds = oldUserIds.filter((id) => !(group.userId ?? []).includes(id));
      const addedUserIds = (group.userId ?? []).filter((id) => !oldUserIds.includes(id));
      removedUserIds.forEach((id) => permissionUserIds.add(id));
      addedUserIds.forEach((id) => permissionUserIds.add(id));
    }

    // ===================== UPDATE ORG =====================
    if ('organizationUnits' in updateGroupUserDto) {
      if (organizationUnits && organizationUnits.length > 0) {
        const uniqueOrgIds = Array.from(new Set(organizationUnits));
        const orgUnits = await this.orgUnitSqlRepo.find({
          where: { id: In(uniqueOrgIds) },
        });

        if (orgUnits.length !== uniqueOrgIds.length) {
          throw new BadRequestException({
            success: false,
            message: `Một số đơn vị không tồn tại hoặc không hoạt động`,
          });
        }

        mergedOrgUnits = orgUnits;
      } else {
        mergedOrgUnits = [];
      }

      // Khóa TypeORM tự save bằng cách xóa property
      delete (group as any).organizationUnits;
    }

    // ===================== UPDATE ROLE FOR USER =====================
    let targetUserIdsForRoleUpdate: string[] = [];
    if ('roles_dynamic' in updateGroupUserDto) {
      const { rolesToRemove, rolesToAdd } = this.diffRolesDynamic(
        oldRolesDynamic,
        updatesToMerge.roles_dynamic ?? [],
      );

      if (rolesToRemove.length || rolesToAdd.length) {
        if (shouldUpdateUsers) {
          targetUserIdsForRoleUpdate = group.userId ?? [];
        } else {
          targetUserIdsForRoleUpdate = await this.getUserIdsByGroup(groupId);
        }

        if (targetUserIdsForRoleUpdate.length > 0) {
          const users = await this.userSqlRepo.find({
            where: { id: In(targetUserIdsForRoleUpdate) },
          });

          for (const user of users) {
            let rolesByProcess = user.rolesByProcess ?? [];
            rolesByProcess = this.removeRolesDynamicFromUser(
              rolesByProcess,
              rolesToRemove,
            );
            rolesByProcess = this.addRolesDynamicToUser(
              rolesByProcess,
              rolesToAdd,
            );
            user.rolesByProcess = rolesByProcess;
            permissionUserIds.add(user.id);
          }

          await this.userSqlRepo.save(users);
        }
      }
    }

    const savedGroup = await this.groupUserSqlRepo.save(group);

    if (shouldUpdateUsers) {
      const userIdsToSync = group.userId ?? [];
      await this.groupUserSqlRepo.manager.query(
        `DELETE FROM user_group_users WHERE group_user_id = '${groupId.replace(/'/g, "''")}'`
      );

      if (userIdsToSync.length > 0) {
        const values = userIdsToSync
          .map(
            (userId) =>
              `('${userId.replace(/'/g, "''")}', '${groupId.replace(/'/g, "''")}')`,
          )
          .join(', ');

        await this.groupUserSqlRepo.manager.query(
          `INSERT INTO user_group_users (user_id, group_user_id) VALUES ${values}`,
        );
      }
    }

    if (mergedOrgUnits !== undefined) {
      await this.groupUserSqlRepo.manager.query(
        `DELETE FROM group_user_organization_units WHERE group_user_id = '${groupId.replace(/'/g, "''")}'`
      );

      if (mergedOrgUnits.length > 0) {
        await this.groupUserSqlRepo.createQueryBuilder()
          .relation(GroupUserEntity, 'organizationUnits')
          .of(groupId)
          .add(mergedOrgUnits.map((ou) => ou.id));
      }
      savedGroup.organizationUnits = mergedOrgUnits;
    }

    for (const userId of Array.from(permissionUserIds)) {
      await this.hrmSyncService.updateUserPermissions(userId);
    }

    return savedGroup;
  }

  async getUserIdsByGroup(groupId: string): Promise<string[]> {
    const rows = await this.userSqlRepo.manager
      .createQueryBuilder()
      .select('ugu.user_id', 'userId')
      .from('user_group_users', 'ugu')
      .where('ugu.group_user_id = :groupId', { groupId })
      .getRawMany();

    return rows.map(r => r.userId);
  }

  /**
   * Lấy userIds từ các nhóm người dùng có roles_dynamic khớp với processKey + roleCode
   */
  async getUserIdsByRoleDynamic(
    processKey: string,
    roleCode: string,
  ): Promise<string[]> {
    const rows = await this.groupUserSqlRepo.manager.query(`
      SELECT DISTINCT rpu.user_id AS userId
      FROM roles_process rp
      INNER JOIN roles_process_users rpu ON rp.id = rpu.role_id
      WHERE rp.process_key = '${processKey}' AND rp.role_code = '${roleCode}' AND rp.is_active = 1

      UNION

      SELECT DISTINCT ugu.user_id AS userId
      FROM roles_process rp
      INNER JOIN roles_process_groups rpg ON rp.id = rpg.role_id
      INNER JOIN user_group_users ugu ON ugu.group_user_id = rpg.group_id
      WHERE rp.process_key = '${processKey}' AND rp.role_code = '${roleCode}' AND rp.is_active = 1
    `);
    return rows.map((r) => r.userId).filter(Boolean);
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

  async deleteManyByIds(ids: string[]) {
    if (!ids || ids.length === 0) {
      return false;
    }

    const result = await this.groupUserSqlRepo.update(
      { id: In(ids) },
      { status: STATUS.DELETED },
    );

    return (result.affected ?? 0) > 0;
  }
  // Xóa nhóm người dùng
  async delete(groupId: string): Promise<void> {
    const group = await this.groupUserSqlRepo.findOneBy({
      id: groupId,
      status: DOCUMENT_STATUS,
    });
    if (!group) {
      throw new BadRequestException({
        success: false,
        message: `Nhóm người dùng với ID ${groupId} không tồn tại hoặc không hoạt động`,
      });
    }

    // Soft delete
    await this.groupUserSqlRepo.update(groupId, { status: STATUS.DELETED });
  }
  async findGroupById(groupId: string): Promise<GroupUserEntity | null> {
    return this.groupUserSqlRepo.findOneBy({
      id: groupId,
      status: DOCUMENT_STATUS,
    });
  }
  async findByCode(code: string): Promise<{ data: any }> {
    const unit = await this.groupUserSqlRepo.findOne({
      where: { code, status: DOCUMENT_STATUS },
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
          position: true,
          role: true,
          parent: {
            id: true,
            name: true,
          },
        },
      },
    });


    if (!unit) {
      throw new BadRequestException('Không tìm thấy nhóm người dùng');
    }
    if (unit.status !== DOCUMENT_STATUS) {
      throw new BadRequestException('Nhóm người dùng không hoạt động');
    }

    return {
      data: unit
    };
  }
  async findNameByCode(code: string): Promise<{ data: any }> {
    const unit = await this.groupUserSqlRepo.findOne({
      where: { code, status: DOCUMENT_STATUS },
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
    if (unit.status !== DOCUMENT_STATUS) {
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

    const units = await this.groupUserSqlRepo.find({
      where: {
        code: In(uniqueCodes),
        status: DOCUMENT_STATUS,
      },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
      },
    });

    return {
      data: units || [],
    };
  }
}
