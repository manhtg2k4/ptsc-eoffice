// src/users/users.service.ts
import { Injectable, Inject, BadRequestException, forwardRef, NotFoundException, HttpException, HttpStatus, Logger, ForbiddenException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, MoreThanOrEqual, LessThanOrEqual, Brackets } from 'typeorm';
import { GetRolesDto } from './dto/get-roles.dto';
import { filterOrgUnitsByName, filterUsersByName, getAllNodeExtensionProperties, getUserFlowConfig } from 'src/utils/util';
import { clampLimit, clampPage } from '../utils/pagination.validator';
// import { GroupUser } from 'src/group-users/group-users.schema';
import { v4 as uuidv4 } from 'uuid';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { SQLSVRepository, UserInfo } from 'src/database/sqlsvRepo';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { POSITION_LEVEL, STATUS, ORG_UNIT_TYPES } from 'src/variables/CONST_STATUS';
// import { EntityRoleGroupService } from 'src/entity-rolegroup/entity-rolegroup.service'; // ✅ Commented - module deleted
// import { RoleGroup, RoleGroupDocument } from 'src/role-group/role-group.shema';
import { ListRoleEntity } from 'src/list-role/entities/list-role.entity';
import { WorkItemsService } from 'src/work-items/work-items.service';
// import { User } from 'src/user/user.schema'; // Keep for MongoDB compatibility
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
} from 'src/users/dto/user.dto';
import * as bcrypt from 'bcryptjs';
import * as https from 'https';
import axios from 'axios';
import { RoleItem, RolesByProcess, UserEntity } from './entities/user.entity';
import { SUPER_ADMIN } from 'src/utils/super-admin.util';
import { checkAdminPermission } from 'src/common/guards/admin-check.helper';
import { NotificationType } from 'src/notifycation/notification.enum';
import { FeatureManagementEntity, StatusFeature } from 'src/feature-management/feature-management.entity';
import { FeedbackSuggestionsService } from 'src/feedback-suggestions/feedback-suggestions.service';
import { GroupUserService } from 'src/group-users/group-users.service';
import { GroupUserInDocumentService } from 'src/group-users/group-users-in-document.service';
// import { EntityRoleGroupController } from 'src/entity-rolegroup/entity-rolegroup.controller'; // ✅ Commented - module deleted
import { getExtensionProperty } from 'src/utils/util';
import { SignRoles, GROUP_CODES, USER_PERMISSION_ASSIGNMENT } from 'src/variable/CONST_STATUS';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { RolesProcessEntity } from 'src/role-feature/role-feature-sql/roles-process.entity';
import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';
import { TaskUserRole } from 'src/task/entity/task.constants';
import { AuthorityDocumentEntity } from 'src/authority-process/authority-process.entity';
import { AuthConfigEntity } from 'src/auth-config/entities/auth-config.entity';
import BpmnEngineService from 'src/bpmn/bpmn-engine.service';
import { RuntimeDbService } from 'src/bpmn/runtime-dbmssql.service';
import { initAdminCheckHelper } from 'src/common/guards/admin-check.helper';
import { OrganizationUnitsByFlowDto } from './dto/organization.dto';
import { OutgoingDocumentsService } from 'src/outgoing-documents/outgoing-documents.service';
import { IncomingService } from 'src/documents/incomming-document/incoming.service';
import { ConfigService } from '@nestjs/config';
import { TaskDelegationService } from 'src/task/task-delegation.service';
import { UserSyncService } from 'src/user-sync/user-sync.service';
import { RoleFeatureSqlService } from 'src/role-feature/role-feature-sql/role-feature-sql.service';
import { validateAndParseSortParam, getDtoKeys, getEntityKeys } from 'src/utils/sort-validator.util';

export class SimpleUserParams {
  q?: string;
  page: number;
  limit: number;
  excludeSelf?: string;
}

@Injectable()
export class UsersService {
  private dbname: string;
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @Inject('BPMN_RUNTIME') private readonly runtime,
    private readonly sqlsvRepo: SQLSVRepository,
    @Inject('MSSQL_REPO') private readonly sqlRepo: MSSQLRepository,
    @InjectRepository(UserEntity, 'mssqlConnection')
    public readonly userRepository: Repository<UserEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly organizationUnitRepository: Repository<OrganizationUnitEntity>,
    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserRepository: Repository<GroupUserEntity>,
    @InjectRepository(ListRoleEntity, 'mssqlConnection')
    private readonly listRoleEntity: Repository<ListRoleEntity>,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
    // @InjectModel(AuthorityDocument.name)
    // private readonly authorityDocumentModel: Model<AuthorityDocument>,
    @InjectRepository(AuthorityDocumentEntity, 'mssqlConnection')
    private readonly authorityDocumentRepository: Repository<AuthorityDocumentEntity>,
    @InjectRepository(RoleFeatureEntity, 'mssqlConnection')
    private readonly roleFeatureRepository: Repository<RoleFeatureEntity>,
    @InjectRepository(BpmnDesignEntity, 'mssqlConnection')
    private readonly bpmnDesignRepository: Repository<BpmnDesignEntity>,
    // @InjectModel(RoleGroup.name)
    // private readonly roleGroupModel: Model<RoleGroupDocument>,
    // private readonly entityRoleGroupService: EntityRoleGroupService, // ✅ Commented - module deleted
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
    private readonly incomingService: IncomingService,
    @Inject(forwardRef(() => OutgoingDocumentsService))
    private readonly outgoingService: OutgoingDocumentsService,
    @InjectRepository(AuthConfigEntity, 'mssqlConnection')
    private readonly authConfigRepo: Repository<AuthConfigEntity>,
    @Inject(forwardRef(() => WorkItemsService))
    private readonly workItemService: WorkItemsService,
    private readonly bpmnEngineService: BpmnEngineService,
    @Inject(forwardRef(() => RuntimeDbService))
    private readonly runtimeDbService: RuntimeDbService,
    private readonly groupUserService: GroupUserService,
    private readonly groupUserInDocumentService: GroupUserInDocumentService,
    private readonly configService: ConfigService,
    private readonly delegationService: TaskDelegationService,
    private readonly roleFeatureSqlService: RoleFeatureSqlService,
    @Inject(forwardRef(() => UserSyncService)) private readonly userSyncService: UserSyncService,
    @Inject(forwardRef(() => FeedbackSuggestionsService))
    private readonly feedbackSuggestionsService: FeedbackSuggestionsService,
  ) {
    initAdminCheckHelper(this.userRepository);
  }

  async getPositionName(positionValue: string): Promise<string | null> {
    if (!positionValue) return null;
    const positionMaping = await this.sqlRepo.getPositionMapping();

    return positionMaping.get(positionValue) || null;
  }

  // Lấy id đơn vị cha cho các trường hợp đặc biệt 
  private getTargetOrgUnitIdForGrandParent(parent: OrganizationUnitEntity | null): string | null {
    if (!parent || !parent.mpath) return null;
    const parts = parent.mpath.split('/').filter(Boolean);
    if (parts.length === 0) return null;

    const typeClean = (parent.type || '').trim();
    if (typeClean === ORG_UNIT_TYPES.BAN || typeClean === ORG_UNIT_TYPES.TO) {
      return parts[3] || parts[parts.length - 1] || null;
    }
    if (typeClean === ORG_UNIT_TYPES.PHONG || typeClean === ORG_UNIT_TYPES.BANLD) {
      return parts[0] || null;
    }
    return parts[0] || null;
  }

  // Lấy danh sách tên đơn vị cha cho các trường hợp đặc biệt 
  private async getGrandParentNameMap(users: UserEntity[]): Promise<Map<string, string>> {
    const targetOrgUnitIds = new Set<string>();

    for (const user of users) {
      if (user.parent) {
        const targetId = this.getTargetOrgUnitIdForGrandParent(user.parent);
        if (targetId) {
          targetOrgUnitIds.add(targetId);
        }
      }
    }

    if (targetOrgUnitIds.size > 0) {
      try {
        const orgUnits = await this.organizationUnitRepository.find({
          where: { id: In(Array.from(targetOrgUnitIds)) },
          select: ['id', 'name'],
        });
        return new Map(orgUnits.map(ou => [ou.id, ou.name]));
      } catch (err) {
        this.logger.warn(`Lấy thông tin tên đơn vị cấp cha thất bại: ${err.message}`);
      }
    }
    return new Map<string, string>();
  }

  private mapToConciseUser(u: any, isDelegated = false) {
    return {
      id: u.id || u._id,
      _id: u.id || u._id,
      name: u.name,
      avatar: Array.isArray(u.avatar) ? u.avatar : [],
      codeND: u.codeND,
      username: u.username,
      emailUser: u.emailUser,
      phoneNumberUser: u.phoneNumberUser,
      position: u.position,
      role: u.role,
      organizationName: u.organizationName,
      organizationCode: u.organizationCode,
      birthday: u.birthday,
      gender: u.gender,
      parent: u.parent ? {
        id: u.parent.id,
        name: u.parent.name
      } : (u.organization_unit_id ? { id: u.organization_unit_id, name: u.organization_unit_name } : null),
      types: u.types || 'user',
      isDelegated: isDelegated || u.isDelegated || false,
      delegatedByNote: u.delegatedByNote || null,
      profileImage: u.profileImage || null,
    };
  }

  /**
   * Map số lượng phản ánh đang xử lý (processStatus = 3) vào thuộc tính taskCount và totalTask của mỗi user
   */
  private async mapDataFeedbackCounts(users: any[]): Promise<any[]> {
    if (!users || users.length === 0) return users;

    try {
      const userIds = users.map(u => u.id || u._id).filter(Boolean);
      if (userIds.length === 0) return users;

      const countMap = await this.feedbackSuggestionsService.countProcessingFeedbacksByUserIds(userIds);

      return users.map(u => {
        const uId = String(u.id || u._id || '').toLowerCase();
        const taskCount = countMap[uId] || 0;
        return {
          ...u,
          taskCount,
        };
      });
    } catch (error) {
      console.error('Error mapping feedback counts in UsersService:', error);
      return users;
    }
  }

  private parseExcludeIds(excludeId?: string | string[]): string[] {
    if (!excludeId) return [];
    const rawValues = Array.isArray(excludeId) ? excludeId : [excludeId];
    return rawValues
      .flatMap((value) => String(value).split(','))
      .map((value) => value.trim())
      .filter(Boolean);
  }

  private filterExcludedUsers<T extends { id?: any; processId?: any }>(users: T[], excludeIds: string[]): T[] {
    if (!excludeIds.length) return users;
    return users.filter((u) => !excludeIds.includes(String(u.id || u.processId)));
  }

  private normalizeRoleCodes(value?: string): string[] {
    if (!value) return [];
    return String(value)
      .split(',')
      .map((role) => role.trim().toLowerCase())
      .filter(Boolean);
  }

  private parseCodeList(value: any): string[] {
    if (value === undefined || value === null) return [];
    return String(value)
      .split(/[;,|]/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  private evaluateScopeExtensionByActor(
    value: any,
    actorGroupCodes: string[],
  ): { enabled: boolean; matchedBy: 'none' | 'global' | 'actor' } {
    const raw = String(value ?? '').trim();
    if (!raw) return { enabled: false, matchedBy: 'none' };

    const lower = raw.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return { enabled: true, matchedBy: 'global' };
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return { enabled: false, matchedBy: 'none' };
    }

    const allowedCodes = this.parseCodeList(raw);
    if (!allowedCodes.length) {
      return { enabled: false, matchedBy: 'none' };
    }

    const actorSet = new Set((actorGroupCodes || []).map((c) => String(c).toLowerCase()));
    const matched = allowedCodes.some((code) => actorSet.has(code));
    return {
      enabled: matched,
      matchedBy: matched ? 'actor' : 'none',
    };
  }

  private async getUserGroupCodes(userId?: string): Promise<string[]> {
    if (!userId) return [];

    const groups = await this.groupUserRepository
      .createQueryBuilder('g')
      .innerJoin('g.users', 'u', 'u.id = :userId AND u.status = :userStatus', {
        userId,
        userStatus: STATUS.ACTIVED,
      })
      .where('g.status = :groupStatus', { groupStatus: STATUS.ACTIVED })
      .select(['g.code'])
      .getMany();

    return groups
      .map((g) => String(g?.code || '').trim().toLowerCase())
      .filter(Boolean);
  }

  private extractParentOrgId(value: any): string | null {
    if (!value) return null;

    if (typeof value === 'string' || typeof value === 'number') {
      const normalized = String(value).trim();
      return normalized || null;
    }

    const normalized = String(value?.id || value?._id || '').trim();
    return normalized || null;
  }

  private mapGroupUsersToOpinionUsers(users: any[]): any[] {
    return (users || []).map((u: any) => ({
      _id: u?.id,
      name: u?.name,
      username: u?.username || null,
      codeND: u?.codeND,
      parent: this.extractParentOrgId(u?.parent),
      parentType: u?.parent?.type || null,
      orgType: u?.parent?.type || null,
      position: u?.position,
      role: u?.role,
      types: 'user',
    }));
  }

  private mergeOpinionUsers(users: any[]): any[] {
    const userMap = new Map<string, any>();

    for (const user of users || []) {
      const id = String(user?._id || user?.id || '').trim();
      if (!id || userMap.has(id)) continue;
      userMap.set(id, user);
    }

    return Array.from(userMap.values());
  }

  private filterOrgUnitsToCurrentBranch(orgUnits: any[], currentOrgId: string): any[] {
    if (!Array.isArray(orgUnits) || !currentOrgId) return orgUnits || [];

    const currentOrg = orgUnits.find(
      (ou) => String(ou?._id ?? ou?.id ?? '').trim() === currentOrgId,
    );

    if (!currentOrg) {
      return orgUnits.filter(
        (ou) => String(ou?._id ?? ou?.id ?? '').trim() === currentOrgId,
      );
    }

    const branchIds = new Set<string>([currentOrgId]);
    const path = String(currentOrg?.path ?? currentOrg?.mpath ?? '').trim();

    if (path) {
      path
        .split('/')
        .map((id) => id.trim())
        .filter(Boolean)
        .forEach((id) => branchIds.add(id));
    }

    // Nếu phòng hiện tại là "ban" (không phân biệt hoa thường), lấy thêm các ban ngang hàng (cùng parentId)
    if (String(currentOrg?.type || '').toLowerCase() === 'ban') {
      const parentId = this.extractParentOrgId(currentOrg?.parent);
      if (parentId) {
        orgUnits
          .filter((ou) => {
            const ouParentId = this.extractParentOrgId(ou?.parent);
            return ouParentId === parentId && String(ou?.type || '').toLowerCase() === 'ban';
          })
          .forEach((ou) => {
            const ouId = String(ou?._id ?? ou?.id ?? '').trim();
            if (ouId) branchIds.add(ouId);
          });
      }
    }

    // Lấy thêm toàn bộ danh sách cấp con, cháu, chắt... (descendants) của currentOrgId
    const descendantUnits = orgUnits.filter((ou) => {
      const ouId = String(ou?._id ?? ou?.id ?? '').trim();
      if (ouId === currentOrgId) return false;

      const parentId = this.extractParentOrgId(ou?.parent);
      if (parentId === currentOrgId) return true;

      const mpath = String(ou?.mpath || ou?.path || '').trim();
      if (mpath) {
        const parts = mpath.split('/').map((id) => id.trim()).filter(Boolean);
        return parts.includes(currentOrgId);
      }
      return false;
    });

    descendantUnits.forEach((ou) => {
      const ouId = String(ou?._id ?? ou?.id ?? '').trim();
      if (ouId) branchIds.add(ouId);
    });



    const branch = orgUnits.filter((ou) =>
      branchIds.has(String(ou?._id ?? ou?.id ?? '').trim()),
    );

    const hasRoot = branch.some((ou) => this.extractParentOrgId(ou?.parent) === null);
    if (hasRoot) {
      return branch;
    }

    const pathParts = path
      .split('/')
      .map((id) => id.trim())
      .filter(Boolean);
    const topOrgId = pathParts[0];

    if (!topOrgId) {
      return branch;
    }

    return branch.map((ou) => {
      const orgId = String(ou?._id ?? ou?.id ?? '').trim();
      if (orgId !== topOrgId) return ou;
      return { ...ou, parent: null };
    });
  }

  private includeParentOrgUnits(filteredOrgUnits: any[], allOrgUnits: any[]): any[] {
    if (!Array.isArray(filteredOrgUnits) || !filteredOrgUnits.length) return [];

    const allOrgMap = new Map<string, any>();
    for (const ou of allOrgUnits) {
      const id = String(ou?._id ?? ou?.id ?? '').trim();
      if (id) allOrgMap.set(id, ou);
    }

    const finalOrgIds = new Set<string>();

    for (const ou of filteredOrgUnits) {
      const ouId = String(ou?._id ?? ou?.id ?? '').trim();
      if (!ouId) continue;
      finalOrgIds.add(ouId);

      const pathStr = String(ou?.path ?? ou?.mpath ?? '').trim();
      if (pathStr) {
        pathStr
          .split('/')
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((pid) => {
            if (allOrgMap.has(pid)) finalOrgIds.add(pid);
          });
      }

      let current = ou;
      while (current) {
        const parentId = this.extractParentOrgId(current?.parent);
        if (parentId && allOrgMap.has(parentId) && !finalOrgIds.has(parentId)) {
          finalOrgIds.add(parentId);
          current = allOrgMap.get(parentId);
        } else {
          break;
        }
      }
    }

    return allOrgUnits.filter((ou) =>
      finalOrgIds.has(String(ou?._id ?? ou?.id ?? '').trim()),
    );
  }

  private async resolveOpinionScopeByLane(params: {
    processId?: string;
    documentId?: string;
    userId?: string;
    workitem?: string;
    actionCode?: string;
    roles?: string;
  }): Promise<{
    mode: 'none' | 'same_room' | 'other_room';
    enabled: boolean;
    currentOrgId?: string;
    currentRole?: string;
    laneKeys: string[];
    askInRoomRaw?: any;
    seekOtherRaw?: any;
  }> {
    const { processId, documentId, userId, workitem, actionCode, roles } = params;



    if (!processId || !userId) {
      return { mode: 'none', enabled: false, laneKeys: [] };
    }

    const currentUser = await this.sqlsvRepo.getUserById(userId).catch(() => null);
    const currentOrgId = this.extractParentOrgId(currentUser?.parent) || undefined;

    const [actorGroupCodes, roleInfo] = await Promise.all([
      this.getUserGroupCodes(userId).catch(() => [] as string[]),
      this.findProcessRoleInfoByIdActionStart(userId, processId).catch(
        () => ({ roleCodes: [] }),
      ),
    ]);

    const roleInfoFallback = roleInfo || { roleCodes: [] };
    const currentRoles = Array.isArray(roleInfoFallback?.roleCodes)
      ? roleInfoFallback.roleCodes.map((r: any) => String(r || '').trim()).filter(Boolean)
      : [];

    if (!currentRoles.length) {
      return { mode: 'none', enabled: false, currentOrgId, laneKeys: [] };
    }

    const bpmnXML = await this.sqlRepo.getBpmnFile(processId);
    if (!bpmnXML) {
      return { mode: 'none', enabled: false, currentOrgId, laneKeys: [] };
    }

    const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);
    const lanes = (indexes?.lanes || []) as any;

    if (roles) {
      const targetRolesList = roles.split(',').map((r) => r.trim()).filter(Boolean);
      for (const targetRole of targetRolesList) {
        const targetProps = this.bpmnEngineService.getLanePropertiesByRole(lanes, targetRole);
        if (targetProps) {
          const seekOtherRaw = targetProps.SeekingOpinionsFromOther;
          if (seekOtherRaw !== undefined) {
            const seekOtherEval = this.evaluateScopeExtensionByActor(seekOtherRaw, actorGroupCodes);
            if (seekOtherEval.enabled) {
              return {
                mode: 'none',
                enabled: false,
                currentOrgId,
                laneKeys: Object.keys(targetProps),
              };
            }
          }
          if (targetProps.AllowDifferentRoom === 'true') {
            return {
              mode: 'none',
              enabled: false,
              currentOrgId,
              laneKeys: Object.keys(targetProps),
            };
          }
        }
      }
    }

    let laneExt: Record<string, string> | null = null;
    let currentRole: string | undefined;

    const actorGroupSet = new Set(actorGroupCodes);
    const laneCandidates = currentRoles
      .map((role) => {
        const props = this.bpmnEngineService.getLanePropertiesByRole(lanes, role);
        if (!props) return null;
        const laneGroups = this.parseCodeList(props?.candidateGroupsCode || props?.candidateGroups);
        const hasActorGroupMatch = laneGroups.some((code) => actorGroupSet.has(code));
        const hasScopeExt = (
          props.AskForOpinionsInTheRoom !== undefined
          || props.SeekingOpinionsFromOther !== undefined
        );
        return {
          role,
          props,
          hasActorGroupMatch,
          hasScopeExt,
        };
      })
      .filter(Boolean) as Array<{
        role: string;
        props: Record<string, string>;
        hasActorGroupMatch: boolean;
        hasScopeExt: boolean;
      }>;

    const preferredLane =
      laneCandidates.find((item) => item.hasActorGroupMatch && item.hasScopeExt)
      || laneCandidates.find((item) => item.hasActorGroupMatch)
      || laneCandidates.find((item) => item.hasScopeExt)
      || laneCandidates[0];

    if (preferredLane) {
      laneExt = preferredLane.props;
      currentRole = preferredLane.role;
    }

    const askInRoomRaw = laneExt?.AskForOpinionsInTheRoom;
    const seekOtherRaw = laneExt?.SeekingOpinionsFromOther;
    const askInRoomEval = this.evaluateScopeExtensionByActor(askInRoomRaw, actorGroupCodes);
    const seekOtherEval = this.evaluateScopeExtensionByActor(seekOtherRaw, actorGroupCodes);
    const laneKeys = Object.keys(laneExt || {});

    if (laneExt?.AllowDifferentRoom === 'true') {
      return {
        mode: 'none',
        enabled: false,
        currentOrgId,
        currentRole,
        laneKeys,
      };
    }

    const askInRoom = askInRoomEval.enabled;
    const seekOther = seekOtherEval.enabled;



    let mode: 'none' | 'same_room' | 'other_room' = 'none';

    if (askInRoom && seekOther) {
      if (askInRoomEval.matchedBy !== seekOtherEval.matchedBy) {
        mode = askInRoomEval.matchedBy === 'actor' ? 'same_room' : 'other_room';
      } else {
        mode = 'same_room';
      }
    } else if (askInRoom) {
      mode = 'same_room';
    } else if (seekOther) {
      mode = 'other_room';
    }

    if (mode === 'none') {
      mode = 'same_room';
    }

    const enabled = !!currentOrgId;

    return {
      mode,
      enabled,
      currentOrgId,
      currentRole,
      laneKeys,
      askInRoomRaw,
      seekOtherRaw,
    };
  }

  private getDatabaseName(): string {
    const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
    if (!dbName) throw new Error('SQLSERVER_DATABASE not defined in .env');
    return dbName;
  }

  onModuleInit() {
    this.dbname = this.getDatabaseName();
  }

  async findProcessRoleInfoByIdActionStart(
    userId: string,
    flowId: string,
    indexes?: any,
  ): Promise<{ roleCodes: string[] }> {
    // 1️⃣ Fetch BPMN and RoleFeature in parallel
    const getIndexes = async () => {
      if (indexes) return indexes;
      const bpmnXML = await this.sqlRepo.getBpmnFile(flowId);
      if (!bpmnXML) return null;
      const model = await this.runtimeDbService.getModelFromXml(bpmnXML);
      return model.indexes;
    };

    const [resolvedIndexes, doc] = await Promise.all([
      getIndexes(),
      this.roleFeatureRepository.findOne({
        where: { processKey: flowId },
        select: ['roles'],
      }),
    ]);

    if (!resolvedIndexes) return { roleCodes: [] };

    // 2️⃣ Parse BPMN to get lane roles
    const laneRoleCodes: string[] = Object.values(resolvedIndexes.lanes || {})
      .map((l: any) => l.role)
      .filter((r): r is string => typeof r === 'string' && r.length > 0);

    if (!laneRoleCodes.length) return { roleCodes: [] };

    const roleCodeSet = new Set<string>();

    // 3️⃣ Check direct roles from roleFeature
    let roles: any[] = [];
    if (doc?.roles) {
      try {
        roles = typeof doc.roles === 'string' ? JSON.parse(doc.roles) : doc.roles;
      } catch { }
    }

    for (const r of roles) {
      if (r?.roleCode && laneRoleCodes.includes(r.roleCode) && Array.isArray(r.users) && r.users.includes(userId)) {
        roleCodeSet.add(r.roleCode);
      }
    }

    // 4️⃣ Check group roles (optimized with userId)
    const users = await this.findUsersByRoleCodes(laneRoleCodes, flowId, userId);
    for (const u of users) {
      roleCodeSet.add(u.roleCode);
    }

    return { roleCodes: Array.from(roleCodeSet) };
  }
  async getUserFlowInfo(userId: string, flowId: string) {
    const bpmnXML = await this.sqlRepo.getBpmnFile(flowId);
    if (!bpmnXML) return false;

    const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);

    const lanes = Object.values(indexes.lanes || {});
    const laneRoleCodes: string[] = lanes
      .map((l: any) => l.role)
      .filter((r): r is string => typeof r === 'string' && r.length > 0);

    if (!laneRoleCodes.length) return false;

    // 1. Check roleFeature trực tiếp
    const doc = await this.roleFeatureRepository.findOne({
      where: { processKey: flowId },
      select: ['roles'],
    });

    let roles: any[] = [];
    if (doc?.roles) {
      try {
        roles =
          typeof doc.roles === 'string'
            ? JSON.parse(doc.roles)
            : doc.roles;
      } catch {
        roles = [];
      }
    }

    const hasDirectPermission = roles.some(
      (r: any) =>
        laneRoleCodes.includes(r.roleCode) &&
        Array.isArray(r.users) &&
        r.users.includes(userId)
    );

    if (hasDirectPermission) return true;

    const users = await this.findUsersByRoleCodes(laneRoleCodes, flowId, userId);

    return users.length > 0;
  }

  /**
   * Kiểm tra nhanh người dùng có trong luồng không (Tối ưu cho check 1 người dùng - Kiểu phân quyền mới)
   */
  async isUserInFlowQuick(userId: string, flowId: string): Promise<boolean> {
    if (!userId || !flowId) return false;

    const row = await this.groupUserRepository.manager.createQueryBuilder()
      .select('1')
      .from('roles_process', 'rp')
      .innerJoin('roles_process_groups', 'rpg', 'rpg.role_id = rp.id')
      .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = rpg.group_id')
      .innerJoin('users', 'u', 'u.id = ugu.user_id AND u.status = 1')
      .where('rp.is_active = 1')
      .andWhere('rp.process_key = :flowId', { flowId })
      .andWhere('ugu.user_id = :userId', { userId })
      .getRawOne();

    return !!row;
  }

  async checkUserInFlow(userId: string, processKey: string, roleCodes: string[]) {
    if (!userId || !roleCodes.length) return false;

    const row = await this.groupUserRepository.manager.createQueryBuilder()
      .select('1')
      .from('roles_process', 'rp')
      .innerJoin('roles_process_groups', 'rpg', 'rpg.role_id = rp.id')
      .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = rpg.group_id')
      .innerJoin('users', 'u', 'u.id = ugu.user_id AND u.status = 1')
      .where('rp.is_active = 1')
      .andWhere('rp.process_key = :processKey', { processKey })
      .andWhere('rp.role_code IN (:...roleCodes)', { roleCodes })
      .andWhere('ugu.user_id = :userId', { userId })
      .getRawOne();

    return !!row;
  }

  /**
   * Kiểm tra trực tiếp user có role cụ thể trong role_feature không (Hỗ trợ tương thích kiểu phân quyền mới)
   */
  async checkDirectRoleInFlow(userId: string, processKey: string, roleCodes: string[]): Promise<boolean> {
    return this.checkUserInFlow(userId, processKey, roleCodes);
  }

  // Tìm người dùng theo roleCode để gửi notification
  // ✅ MỚI: Dùng bảng roles_process thay vì parse JSON roles_dynamic
  async findUsersByRoleCodes(
    roleCodes: string[],
    processKey?: string,
    userId?: string,
  ): Promise<{ userId: string; roleCode: string }[]> {
    if (!roleCodes?.length) return [];

    this.logger.log(`[findUsersByRoleCodes] Called with roleCodes=${JSON.stringify(roleCodes)}, processKey=${processKey}, userId=${userId}`);

    const qb = this.groupUserRepository.manager.createQueryBuilder()
      .select('ugu.user_id', 'userId')
      .addSelect('rp.role_code', 'roleCode')
      .from('roles_process', 'rp')
      .innerJoin('roles_process_groups', 'rpg', 'rpg.role_id = rp.id')
      .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = rpg.group_id')
      .innerJoin('users', 'u', 'u.id = ugu.user_id AND u.status = 1')
      .where('rp.is_active = 1')
      .andWhere('rp.role_code IN (:...roleCodes)', { roleCodes });

    if (processKey) {
      qb.andWhere('rp.process_key = :processKey', { processKey });
    }

    if (userId) {
      qb.andWhere('ugu.user_id = :userId', { userId });
    }

    const rawResults = await qb.getRawMany();
    this.logger.log(`[findUsersByRoleCodes] Found ${rawResults.length} users matching roleCodes`);
    return rawResults.map(r => ({
      userId: r.userId,
      roleCode: r.roleCode,
    }));
  }

  async getUserRole(
    userId: string,
    processKey: string = 'PHOIHOP_NHANDEBIET',
  ): Promise<{ roles: string[]; userRoles: string[] }> {

    if (!userId) {
      return { roles: [''], userRoles: [] };
    }

    this.logger.log(`[getUserRole] Fetching from DB: userId=${userId}, processKey=${processKey}`);

    const userRolesSet = new Set<string>();

    // 3️⃣ Lấy roleFeature từ DB
    const roleFeature = await this.roleFeatureRepository.findOne({
      where: { processKey },
    });

    if (roleFeature?.roles && Array.isArray(roleFeature.roles)) {
      roleFeature.roles.forEach(r => {
        if (Array.isArray(r?.users) && r.users.includes(userId) && r.roleCode) {
          userRolesSet.add(r.roleCode);
        }
      });
    }

    // 4️⃣ Check group roles
    const groupRoles = await this.groupUserRepository
      .createQueryBuilder('g')
      .innerJoin('g.users', 'u', 'u.id = :userId AND u.status = :status', {
        userId,
        status: STATUS.ACTIVED,
      })
      .where('g.status = :status', { status: STATUS.ACTIVED })
      .select('g.roles_dynamic')
      .getMany();

    groupRoles.forEach(g => {
      let rolesDynamic: any[] = [];
      try {
        rolesDynamic = typeof g.roles_dynamic === 'string' ? JSON.parse(g.roles_dynamic) : (g.roles_dynamic || []);
      } catch (e) { }

      rolesDynamic.forEach(r => {
        if (r.processKey === processKey && r.roleCode) {
          userRolesSet.add(r.roleCode);
        }
      });
    });

    const userRoles = Array.from(userRolesSet);
    const result = {
      roles: userRoles.length ? userRoles : [''],
      userRoles,
    };

    this.logger.log(`[getUserRole] DB Resolved - userId=${userId}, processKey=${processKey}, resolvedRoles=${JSON.stringify(userRoles)}`);

    return result;
  }

  async getUsersByRoleSQL(roleCode: string): Promise<UserInfo[]> {
    try {
      const users = await this.userRepository.find({
        where: [
          {
            role: roleCode,
            status: 1
          },
          {
            codeND: roleCode,
            status: 1
          }
        ],
        select: {
          id: true,
          name: true
        }
      });

      const res = users.map(u => ({
        _id: u.id,
        name: u.name ?? 'Không rõ tên'
      }));
      return res;
    } catch (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }
  }


  async checkVanThuTct(userId: string): Promise<boolean> {
    if (!userId) return false;
    const count = await this.groupUserRepository
      .createQueryBuilder('g')
      .innerJoin('g.users', 'u')
      .where('g.code = :code', { code: GROUP_CODES.VAN_THU })
      .andWhere('u.id = :userId', { userId })
      .andWhere('g.status = :status', { status: STATUS.ACTIVED })
      .getCount();
    return count > 0;
  }

  async getUsersByTaskRole(
    typeTaskUser: TaskUserRole,
    userId: string,
    queryParams: any,
  ) {
    const { page = 1, limit = 25, isAuthority, excludeId, ...safeQuery } = queryParams;
    const excludeIds = this.parseExcludeIds(excludeId);

    const processKey = queryParams.process_key || 'QUY_TRINH_CV_PHONG_BAN';
    const bpmnDesign = await this.bpmnDesignRepository.createQueryBuilder('bpmn')
      .select(['bpmn.id', 'bpmn.unit'])
      .where('bpmn.processKey = :processKey', { processKey })
      .getOne();

    const unitIds = bpmnDesign?.unit || [];

    if (!unitIds || unitIds.length === 0) {
      return {
        role: typeTaskUser,
        total: 0,
        data: [],
      };
    }

    const qb = await this.buildUserQueryBuilder(safeQuery);
    qb.andWhere('"user"."parent" IN (:...unitIds)', { unitIds });

    /** ===== FAKE ROLE LOGIC ===== */
    switch (typeTaskUser) {
      case TaskUserRole.ASSIGNER: {
        const users = await this.getUsersAssigners(userId, safeQuery.name);
        const filtered = this.filterExcludedUsers(users, excludeIds);
        const filteredByUnit = filtered.filter((u: any) => {
          const uParentId = u.parent?.id || u.parentId || u.parent;
          return uParentId && unitIds.includes(String(uParentId));
        });
        return {
          role: typeTaskUser,
          total: filteredByUnit.length,
          data: filteredByUnit.slice((page - 1) * limit, page * limit).map((u: any) => ({
            ...u,
            name: u.parent?.name ? `${u.name} - ${u.parent.name}` : u.name,
          })),
        };
      }

      case TaskUserRole.DIRECTOR: {
        const targetUserId = safeQuery.leaderId || safeQuery.assignerId || userId;
        // const users = await this.getUsersDirectors(targetUserId, safeQuery.name);
        const users = 'USE_VIEWER_QUERY';
        // Nếu là Director cấp cao → dùng logic VIEWER
        if (users === 'USE_VIEWER_QUERY') {
          // qb.andWhere('user.position IS NULL');
          if (excludeIds.length) qb.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds });
          break;
        }
        const filtered = this.filterExcludedUsers(users, excludeIds);
        const filteredByUnit = filtered.filter((u: any) => {
          const uParentId = u.parent?.id || u.parentId || u.parent;
          return uParentId && unitIds.includes(String(uParentId));
        });
        return {
          role: typeTaskUser,
          total: filteredByUnit.length,
          data: filteredByUnit.slice((page - 1) * limit, page * limit).map((u: any) => ({
            ...u,
            name: u.parent?.name ? `${u.name} - ${u.parent.name}` : u.name,
          })),
        };
      }

      case TaskUserRole.SUPPORTER: {
        const targetUserId = safeQuery.leaderId || safeQuery.assignerId || userId;
        // const users = await this.getUsersSupportersV1(targetUserId, undefined, safeQuery.name);
        const users = 'USE_VIEWER_QUERY';
        if (users === 'USE_VIEWER_QUERY') {
          // qb.andWhere('user.position IS NULL');
          if (excludeIds.length) qb.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds });
          break;
        }
        const filtered = this.filterExcludedUsers(users as any[], excludeIds);
        const filteredByUnit = filtered.filter((u: any) => {
          const uParentId = u.parent?.id || u.parentId || u.parent;
          return uParentId && unitIds.includes(String(uParentId));
        });
        return {
          role: typeTaskUser,
          total: filteredByUnit.length,
          data: filteredByUnit.slice((page - 1) * limit, page * limit).map((u: any) => ({
            ...u,
            name: u.parent?.name ? `${u.name} - ${u.parent.name}` : u.name,
          })),
        };
      }
      case TaskUserRole.VIEWER:
        // qb.andWhere('user.position IS NULL');
        if (excludeIds.length) qb.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds });
        break;
    }

    const pageNum = clampPage(page);
    const limitNum = clampLimit(limit);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await qb
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    return {
      role: typeTaskUser,
      total,
      data: data.map((u: any) => ({
        ...u,
        name: u.parent?.name ? `${u.name} - ${u.parent.name}` : u.name,
      })),
    };
  }
  async getUsersByTaskRoleFormMeeting(
    typeTaskUser: TaskUserRole,
    userId: string,
    queryParams: any,
  ) {
    const { page = 1, limit = 25, isAuthority, excludeId, ...safeQuery } = queryParams;
    const excludeIds = this.parseExcludeIds(excludeId);

    const processKey = queryParams.process_key || 'QTCVTCH';
    const bpmnDesign = await this.bpmnDesignRepository.createQueryBuilder('bpmn')
      .select(['bpmn.id', 'bpmn.unit'])
      .where('bpmn.processKey = :processKey', { processKey })
      .getOne();

    const unitIds = bpmnDesign?.unit || [];

    if (!unitIds || unitIds.length === 0) {
      return {
        role: typeTaskUser,
        total: 0,
        data: [],
      };
    }

    const qb = await this.buildUserQueryBuilder(safeQuery);
    qb.andWhere('"user"."parent" IN (:...unitIds)', { unitIds });

    /** ===== FAKE ROLE LOGIC ===== */
    switch (typeTaskUser) {
      case TaskUserRole.ASSIGNER: {
        const users = await this.getUsersAssigners(userId, safeQuery.name);
        const filtered = this.filterExcludedUsers(users, excludeIds);
        const filteredByUnit = filtered.filter((u: any) => {
          const uParentId = u.parent?.id || u.parentId || u.parent;
          return uParentId && unitIds.includes(String(uParentId));
        });
        return {
          role: typeTaskUser,
          total: filteredByUnit.length,
          data: filteredByUnit.slice((page - 1) * limit, page * limit).map((u: any) => ({
            ...u,
            name: u.parent?.name ? `${u.name} - ${u.parent.name}` : u.name,
          })),
        };
      }

      case TaskUserRole.DIRECTOR:
        if (excludeIds.length) qb.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds });
        break;

      case TaskUserRole.SUPPORTER:
        if (excludeIds.length) qb.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds });
        break;
      case TaskUserRole.VIEWER:
        if (excludeIds.length) qb.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds });
        break;
    }

    const pageNum = clampPage(page);
    const limitNum = clampLimit(limit);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await qb
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    return {
      role: typeTaskUser,
      total,
      data: data.map((u: any) => ({
        ...u,
        name: u.parent?.name ? `${u.name} - ${u.parent.name}` : u.name,
      })),
    };
  }
  async getUsersByTaskRoleFormDoc(
    typeTaskUser: TaskUserRole,
    userId: string,
    queryParams: any,
  ) {
    const { page = 1, limit = 25, isAuthority, excludeId, ...safeQuery } = queryParams;
    const excludeIds = this.parseExcludeIds(excludeId);

    const processKey = queryParams.process_key || 'QUY_TRINH_CV_VAN_BAN';
    const bpmnDesign = await this.bpmnDesignRepository.createQueryBuilder('bpmn')
      .select(['bpmn.id', 'bpmn.unit'])
      .where('bpmn.processKey = :processKey', { processKey })
      .getOne();

    const unitIds = bpmnDesign?.unit || [];

    if (!unitIds || unitIds.length === 0) {
      return {
        role: typeTaskUser,
        total: 0,
        data: [],
      };
    }

    const qb = await this.buildUserQueryBuilder(safeQuery);
    qb.andWhere('"user"."parent" IN (:...unitIds)', { unitIds });

    /** ===== FAKE ROLE LOGIC ===== */
    switch (typeTaskUser) {
      case TaskUserRole.ASSIGNER: {
        const users = await this.getUsersAssigners(userId, safeQuery.name);
        const filtered = this.filterExcludedUsers(users, excludeIds);
        const filteredByUnit = filtered.filter((u: any) => {
          const uParentId = u.parent?.id || u.parentId || u.parent;
          return uParentId && unitIds.includes(String(uParentId));
        });
        return {
          role: typeTaskUser,
          total: filteredByUnit.length,
          data: filteredByUnit.slice((page - 1) * limit, page * limit).map((u: any) => ({
            ...u,
            name: u.parent?.name ? `${u.name} - ${u.parent.name}` : u.name,
          })),
        };
      }

      case TaskUserRole.DIRECTOR: {
        const targetUserId = safeQuery.leaderId || safeQuery.assignerId || userId;
        // const users = await this.getUsersDirectors(targetUserId, safeQuery.name);
        const users = 'USE_VIEWER_QUERY'
        if (users === 'USE_VIEWER_QUERY') {
          // qb.andWhere('user.position IS NULL');
          if (excludeIds.length) qb.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds });
          break;
        }
        const filtered = this.filterExcludedUsers(users as any[], excludeIds);
        const filteredByUnit = filtered.filter((u: any) => {
          const uParentId = u.parent?.id || u.parentId || u.parent;
          return uParentId && unitIds.includes(String(uParentId));
        });
        return {
          role: typeTaskUser,
          total: filteredByUnit.length,
          data: (filteredByUnit as any[]).slice((page - 1) * limit, page * limit).map((u: any) => ({
            ...u,
            name: u.parent?.name ? `${u.name} - ${u.parent.name}` : u.name,
          })),
        };
      }

      case TaskUserRole.SUPPORTER: {
        const targetUserId = safeQuery.leaderId || safeQuery.assignerId || userId;
        //const users = await this.getUsersSupporters(targetUserId, undefined, safeQuery.name);
        const users = 'USE_VIEWER_QUERY'
        if (users === 'USE_VIEWER_QUERY') {
          // qb.andWhere('user.position IS NULL');
          if (excludeIds.length) qb.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds });
          break;
        }
        const filtered = this.filterExcludedUsers(users as any[], excludeIds);
        const filteredByUnit = filtered.filter((u: any) => {
          const uParentId = u.parent?.id || u.parentId || u.parent;
          return uParentId && unitIds.includes(String(uParentId));
        });
        return {
          role: typeTaskUser,
          total: filteredByUnit.length,
          data: (filteredByUnit as any[]).slice((page - 1) * limit, page * limit).map((u: any) => ({
            ...u,
            name: u.parent?.name ? `${u.name} - ${u.parent.name}` : u.name,
          })),
        };
      }
      case TaskUserRole.VIEWER:
        // qb.andWhere('user.position IS NULL');
        if (excludeIds.length) qb.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds });
        break;
    }

    const pageNum = clampPage(page);
    const limitNum = clampLimit(limit);
    const skip = (pageNum - 1) * limitNum;

    // These joins are many-to-one, so OFFSET/LIMIT does not duplicate users.
    // getManyAndCount() with joins makes TypeORM run an extra DISTINCT-id query
    // before loading the page, followed by COUNT. Run the two required queries
    // independently and in parallel instead.
    const dataQuery = qb.clone().offset(skip).limit(limitNum);
    const countQuery = qb.clone().orderBy();

    const [data, total] = await Promise.all([
      dataQuery.getMany(),
      countQuery.getCount(),
    ]);

    return {
      role: typeTaskUser,
      total,
      data: data.map((u: any) => ({
        ...u,
        name: u.parent?.name ? `${u.name} - ${u.parent.name}` : u.name,
      })),
    };
  }

  //   async getUsersByTaskRole(
  //     typeTaskUser: TaskUserRole,
  //     userId: string,
  //     queryParams: any,
  //   ) {


  //     const { page = 1, limit = 25 } = queryParams;
  //     const pageNum = Math.max(Number(page), 1);
  //     const limitNum = Math.max(Number(limit), 1);
  //     const skip = (pageNum - 1) * limitNum;

  //     let users: any[] = [];
  //     let total = 0;

  //     switch (typeTaskUser) {
  //       case TaskUserRole.ASSIGNER:

  //         users = await this.getUsersAssigners(userId);

  //         total = users.length;
  //         break;

  //       case TaskUserRole.DIRECTOR:

  //         users = await this.getUsersDirectors(userId);

  //         total = users.length;
  //         break;

  //       case TaskUserRole.SUPPORTER:

  //         users = await this.getUsersSupporters(userId);

  //         total = users.length;
  //         break;

  //       case TaskUserRole.VIEWER: {

  //         const qb = await this.buildUserQueryBuilder(queryParams);
  //         qb.andWhere('user.position IS NULL');

  //         const [data, count] = await qb
  //           .skip(skip)
  //           .take(limitNum)
  //           .getManyAndCount();
  //           const mappedData = data.map(user => ({
  //           processId: user.id,          // hoặc field FE cần
  //           name: user.name,
  //           type: 1,                     // viewer = type 1 (giống backend đang dùng)
  // }));

  //         const result = {
  //           role: typeTaskUser,
  //           total: count,
  //           data :mappedData,
  //         };
  //          // //console.log ('Returning for VIEWER:', result);
  //         return result;
  //       }
  //     }

  //     // áp dụng pagination cho 3 case đầu (nếu cần)
  //     const pagedData = users.slice(skip, skip + limitNum);

  //     const finalResult = {
  //       role: typeTaskUser,
  //       total,
  //       data: pagedData,
  //     };
  //      // //console.log ('--- Final Result for getUsersByTaskRole ---', finalResult);
  //     return finalResult
  //   }

  //  async getUsersByTaskRole(typeTaskUser: TaskUserRole) {
  //   const qb = this.userRepository
  //     .createQueryBuilder('user')
  //     .select([
  //       'user.id',
  //       'user.name',
  //       'user.username',
  //       'user.emailUser',
  //       'user.avatar',
  //       'user.position',
  //     ])
  //     .where('user.status = :status', {
  //       status: STATUS.ACTIVED,
  //     });
  //   switch (typeTaskUser) {
  //     case TaskUserRole.ASSIGNER:
  //       break;

  //     case TaskUserRole.DIRECTOR:
  //       break;

  //     case TaskUserRole.SUPPORTER:
  //       break;
  //     case TaskUserRole.VIEWER:

  //       break;

  //     default:
  //       break;
  //   }

  //   const users = await qb.getMany();

  //   return {
  //     success: true,
  //     role: typeTaskUser,
  //     data: users.map((u) => ({
  //       id: u.id,
  //       name: u.name,
  //       username: u.username,
  //       email: u.emailUser,
  //       avatar: u.avatar,
  //       position: u.position,
  //     })),
  //   };
  // }


  private formatRoleDetails(role: any) {
    if (
      Array.isArray(role.roles) &&
      role.roles.length > 0 &&
      role.roles[0].functionName &&
      role.roles[0].permissions
    ) {
      return role.roles.map((r: any) => {
        let functionNameValue = role.name; // fallback
        if (
          r.functionName &&
          typeof r.functionName === 'object' &&
          'name' in r.functionName
        ) {
          functionNameValue = String(
            (r.functionName as { name: unknown }).name,
          );
        } else if (r.functionName && typeof r.functionName === 'string') {
          functionNameValue = r.functionName;
        }
        return {
          _id: role._id,
          name: functionNameValue,
          permissions: Array.isArray(r.permissions) ? r.permissions : [],
        };
      });
    } else {
      // Fallback for old structure
      return {
        _id: role._id,
        name: role.name,
        permissions: Array.isArray(role.roles)
          ? role.roles.map((p: any) => p.functionName || p)
          : [],
      };
    }
  }
  async getPendingItems(
    userId: string,
    includeUnassigned: boolean,
    roles: string[],
    nodeIdFilter?: string,
  ) {
    // Logic từ server.js/app.get('/users/:userId/pending', ...)
    const repo = this.runtime.repo;
    if (repo && repo.listUserOpenWorkItems) {
      const assigned = await repo.listUserOpenWorkItems(userId);
      let claimable = [];
      if (includeUnassigned && roles.length) {
        for (const r of roles) {
          const items = await repo.listRoleOpenWorkItems(r);
          claimable = claimable.concat(items);
        }
      }
      const applyNodeFilter = (list) => {
        if (!nodeIdFilter) return list;
        return list.filter((x) => x.workItem.nodeId === nodeIdFilter);
      };
      return {
        assigned: applyNodeFilter(assigned),
        claimable: applyNodeFilter(claimable),
      };
    }
    return { assigned: [], claimable: [] };
  }
  async findProcessRoleInfoById(userId: string) {
    // Tìm user theo DB internal ID trước, fallback sang keycloakUserId
    let user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'username', 'emailUser', 'keycloakUserId'],
    });

    // Nếu không tìm thấy theo internal ID, thử tìm theo keycloakUserId (Keycloak sub/UUID)
    if (!user) {
      user = await this.userRepository.findOne({
        where: { keycloakUserId: userId },
        select: ['id', 'username', 'emailUser', 'keycloakUserId'],
      });
    }

    if (!user) throw new BadRequestException('User không tồn tại');

    const permSet = new Set<string>();
    const roleCodeSet = new Set<string>();

    // ================= LẤY ROLES TỪ roles_process (USER + GROUPS) =================
    const rolesProcessRepo = this.userRepository.manager.getRepository(RolesProcessEntity);
    const safeUserId = user.id;

    // 1. Role gán trực tiếp cho user (roles_process_users)
    const directRoles = await rolesProcessRepo.manager.query(`
      SELECT rp.process_key AS processKey, rp.role_code AS roleCode
      FROM roles_process_users rpu
      INNER JOIN roles_process rp ON rp.id = rpu.role_id AND rp.is_active = 1
      WHERE rpu.user_id = '${safeUserId}'
    `);

    // 2. Role gán qua nhóm (roles_process_groups)
    const groupRoles = await rolesProcessRepo.manager.query(`
      SELECT DISTINCT rp.process_key AS processKey, rp.role_code AS roleCode
      FROM roles_process_groups rpg
      INNER JOIN roles_process rp ON rp.id = rpg.role_id AND rp.is_active = 1
      INNER JOIN user_group_users ugu ON ugu.group_user_id = rpg.group_id
      WHERE ugu.user_id = '${safeUserId}'
    `);

    const allUserRoles = [...directRoles, ...groupRoles];
    //console.log(`[ROLE DEBUG] findProcessRoleInfoById userId=${userId}, directRoles=`, JSON.stringify(directRoles));
    //console.log(`[ROLE DEBUG] findProcessRoleInfoById userId=${userId}, groupRoles=`, JSON.stringify(groupRoles));

    if (allUserRoles.length > 0) {
      const processKeys = [...new Set(allUserRoles.map((r: any) => r.processKey).filter(Boolean))];

      const roleFeatures = await this.roleFeatureRepository.find({
        where: { processKey: In(processKeys) },
        select: ['processKey', 'roles'],
      });

      const roleFeatureMap = new Map(roleFeatures.map((rf: any) => [rf.processKey, rf]));

      for (const r of allUserRoles) {
        const rf = roleFeatureMap.get(r.processKey);
        if (!rf) {
          //console.log(`[ROLE DEBUG] No roleFeature for processKey=${r.processKey}`);
          continue;
        }
        const role = rf.roles?.find((ro: any) => ro.roleCode === r.roleCode);
        if (!role) {
          //console.log(`[ROLE DEBUG] No role match for roleCode=${r.roleCode} in processKey=${r.processKey}`);
          continue;
        }
        roleCodeSet.add(r.roleCode);
        for (const perm of role.permissions || []) {
          permSet.add(perm);
        }
      }
    }

    const userGroups = await this.groupUserRepository
      .createQueryBuilder('g')
      .select(['g.id', 'g.roles'])
      .innerJoin('user_group_users', 'ugu', 'CAST(ugu.group_user_id AS NVARCHAR(36)) = g.id')
      .where('ugu.user_id = :userId', { userId: user.id })
      .getMany();

    const userGroupIds = userGroups.map((g) => g.id);

    const roleIdsFromGroups = userGroups.flatMap((g) => (g as any).roles || []);
    const staticPermissions: any[] = [];

    const isSuperAdmin = Boolean(
      SUPER_ADMIN &&
      (userId === SUPER_ADMIN || user?.keycloakUserId === SUPER_ADMIN)
    );

    if (isSuperAdmin || roleIdsFromGroups.length > 0) {
      const whereCondition = isSuperAdmin
        ? { status: STATUS.ACTIVED }
        : { id: In(roleIdsFromGroups), status: STATUS.ACTIVED };

      const listRoles = await this.listRoleEntity.find({
        where: whereCondition,
        // relations: ['functionName'],
      });

      // Build static permissions map
      // Logic: Mỗi role có name và roles[] chứa functionName + permissions
      // => Tạo object với _id = functionName, name = role.name, permissions = permission.permissions
      const staticPermMap = new Map();
      for (const role of listRoles) {
        if (role.roles && Array.isArray(role.roles)) {
          for (const permission of role.roles) {
            if (permission.functionName) {
              const funcId = permission.functionName;

              if (!staticPermMap.has(funcId)) {
                staticPermMap.set(funcId, {
                  _id: funcId,
                  name: role.name, // Lấy name từ role, không phải từ feature
                  code: role.code,
                  permissions: permission.permissions || [],
                });
              }
            }
          }
        }
      }

      staticPermissions.push(...staticPermMap.values());
    }

    // Get report permissions
    const groups = await this.groupUserRepository.find({
      where: { id: In(userGroupIds), status: STATUS.ACTIVED },
      select: ['id'],
      // relations: ['roles', 'organizationUnits', 'organizationUnits.parent'],
    });

    const allOrgUnitIds = groups.flatMap(
      (g) => (g as any).organizationUnits?.map((o: any) => o.id) || [],
    );
    const orgUnitDetails = allOrgUnitIds.length
      ? await this.organizationUnitRepository.find({
        where: { id: In(allOrgUnitIds), status: STATUS.ACTIVED },
        relations: ['parent'],
      })
      : [];

    // ✅ Commented - EntityRoleGroupService module deleted
    const orgUnitDetailsWithRoleGroup = await Promise.all(
      orgUnitDetails.map(async (unit) => {
        // const unitId = `RG_${unit.code}`;
        // const mapping = await this.entityRoleGroupService.findByUnitId(
        //   unitId,
        //   'TTHC',
        // );
        // if (!mapping) return { ...unit, roleGroup: null };
        // const roleGroup = await this.roleGroupModel.findById(
        //   mapping.roleGroupId.toString(),
        // );
        // return { ...unit, roleGroup: roleGroup ? roleGroup.toObject() : null };
        return { ...unit, roleGroup: null }; // Return default value
      }),
    );

    const reportPermission = orgUnitDetailsWithRoleGroup
      .flatMap((unit: any) => unit.roleGroup?.roles || [])
      .filter(
        (role: any) =>
          Array.isArray(role.methods) && role.methods.some((m: any) => m.allow),
      )
      .map((role: any) => role.codeModuleFunction);

    return {
      roles: Array.from(permSet),
      roleCodes: Array.from(roleCodeSet),
      staticPermissions,
      reportPermission,
      isSuperAdmin,
    };
  }

  async getProcessedItems(
    userId: string,
    options: { since?: string; limit?: number },
  ) {
    // Logic từ server.js/app.get('/users/:userId/processed', ...)
    const repo = this.runtime.repo;
    const items = await repo.listUserProcessedDocuments(userId, options);
    return { items };
  }

  async getUsersInFlow(
    userId: string,
    payload: any,
    limit = 100,
    page = 1,
    name?: string,
  ) {
    const { documentId, documentType, workitem, actionCode, roles, processKey, organizationUnit } = payload;
    let doc;
    if (!processKey && documentType?.toLowerCase() === 'incomingdocument') {
      doc = await this.incomingService.getDocumentByFields({ documentId, select: ['bpmnVersion'] });
    } else if (!processKey && documentType?.toLowerCase() === 'outgoingdocument') {
      doc = await this.outgoingService.getOutgoingDocumentByFields({ documentId, select: ['bpmnVersion'] });
    }
    if (!processKey && !doc) throw new BadRequestException('Không tìm thấy văn bản');
    const processKeyFinal = processKey || doc.bpmnVersion;
    if (!processKeyFinal) {
      throw new BadRequestException('Văn bản không có luồng xử lý');
    }
    // 3. Lấy users trong flow theo processKey và roles
    const roleList = roles?.split(',').filter(Boolean) || [];
    const searchKey = (name || payload?.keySearch || payload?.username || payload?.name || '')?.trim();
    const dbLimit = searchKey ? 1000000 : (limit * page + 100);

    const { usersWithType } = await this.sqlsvRepo.getUsersInFlow(
      processKeyFinal,
      roleList,
      dbLimit,
      1,
      userId,
    );
    let allUsers = usersWithType;


    if (payload?.type == 'feedback') {
      const groupCodes = roleList.length ? roleList : this.normalizeRoleCodes(roles);
      const allGroupUsers: any[] = [];

      for (const groupCode of groupCodes) {
        try {
          const groupUser = await this.groupUserService.findByCode(groupCode);
          const usersInGroup = groupUser?.data?.users || [];
          const activeUsersInGroup = usersInGroup.filter(
            (user: any) => user?.status === STATUS.ACTIVED,
          );
          allGroupUsers.push(...activeUsersInGroup);
        } catch (error) {
          this.logger.warn(
            `[getUsersInFlow][FEEDBACK_GROUP_NOT_FOUND] role: ${groupCode}, message: ${error?.message}`,
          );
        }
      }

      if (!allGroupUsers.length) {
        throw new NotFoundException('Nhóm người dùng không tồn tại');
      }

      const mappedGroupUsers = this.mapGroupUsersToOpinionUsers(allGroupUsers);
      allUsers = this.mergeOpinionUsers([...allUsers, ...mappedGroupUsers]);
    }

    // Loại bỏ chính mình ra khỏi danh sách
    allUsers = allUsers.filter(u => String(u._id) !== String(userId));

    // Filter theo organizationUnit nếu có
    if (organizationUnit) {
      allUsers = allUsers.filter(u => {
        const userOrgId = this.extractParentOrgId(u?.parent);
        return userOrgId === organizationUnit;
      });
    } else {
      // Check if we need to limit users to same org and children based on BPMN configuration
      let limitToSameOrg = false;
      let limitToDirectorsSecretary = false;
      try {
        const bpmnXML = await this.sqlRepo.getBpmnFile(processKeyFinal);
        if (bpmnXML) {
          const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);
          const lanes = (indexes?.lanes || []) as any;
          const targetRolesList = roleList.map((r: any) => String(r || '').trim().toLowerCase());
          for (const targetRole of targetRolesList) {
            const lane = lanes.find((l: any) => {
              const lRole = String(l.role || '').trim().toLowerCase();
              const lCode = String(l.properties?.candidateGroupsCode || '').trim().toLowerCase();
              const lGroups = String(l.properties?.candidateGroups || '').trim().toLowerCase();
              return lRole === targetRole || lCode === targetRole || lGroups === targetRole;
            });
            const targetProps = lane ? lane.properties : null;
            if (targetProps) {
              if (targetProps.getPeopleScope === 'same_org' || targetProps.getPeopleScope === 'same_org_and_children') {
                limitToSameOrg = true;
              }
              if (targetProps.getPeopleScope === 'directors_secretary') {
                limitToDirectorsSecretary = true;
              }
            }
          }
        }
      } catch (e) {
        console.error('[getUsersInFlow] Error parsing BPMN for lane properties:', e);
      }

      const targetLeaderId = payload?.userId || userId;
      const isSecretaryRole =
        limitToDirectorsSecretary ||
        roleList.some((r: any) => {
          const code = String(r || '').trim().toUpperCase();
          return code === 'THU_KY_LANH_DAO' || code === 'THU_KY' || code === 'THUKY';
        });

      if (isSecretaryRole && targetLeaderId) {
        const leaderUser = await this.sqlsvRepo.getUserById(targetLeaderId).catch(() => null);
        let secUserIds: string[] = [];
        if (leaderUser?.personalSecretary && leaderUser.personalSecretary !== 'NULL' && leaderUser.personalSecretary !== 'null') {
          const ps = String(leaderUser.personalSecretary).trim();
          if (ps.startsWith('[') && ps.endsWith(']')) {
            try {
              const parsed = JSON.parse(ps);
              if (Array.isArray(parsed)) {
                secUserIds = parsed.map((x: any) => String(x).trim()).filter(Boolean);
              }
            } catch {
              secUserIds = ps.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          } else {
            secUserIds = ps.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }

        if (secUserIds.length > 0) {
          const existingUserIds = new Set(allUsers.map((u: any) => String(u._id || u.id)));
          const missingSecIds = secUserIds.filter(id => !existingUserIds.has(id));

          for (const missingId of missingSecIds) {
            try {
              const secUser = await this.sqlsvRepo.getUserById(missingId);
              if (secUser) {
                allUsers.push({
                  _id: secUser.id,
                  name: secUser.name ?? 'Không rõ tên',
                  codeND: secUser.codeND || null,
                  position: secUser.position || null,
                  role: secUser.role || null,
                  username: secUser.username || null,
                  leader: secUser.leader || null,
                  personalSecretary: secUser.personalSecretary || null,
                  parent: secUser.parent?.id || null,
                  parentType: secUser.parent?.type || null,
                  orgType: secUser.parent?.type || null,
                  organizationName: secUser.organizationName || secUser.parent?.name || null,
                  organizationCode: secUser.organizationCode || secUser.parent?.code || null,
                  rootOrganizationName: secUser.rootOrganizationName || null,
                  rootOrganizationCode: secUser.rootOrganizationCode || null,
                  types: 'user',
                });
              }
            } catch (e) {
              console.error(`[getUsersInFlow] Error fetching secretary user ${missingId}:`, e);
            }
          }
        }

        const filteredSecUsers = allUsers.filter((u: any) => {
          const uId = String(u._id || u.id);
          const isMatchSecId = secUserIds.includes(uId);
          const isMatchLeaderField = u.leader && String(u.leader) === String(targetLeaderId);
          return isMatchSecId || isMatchLeaderField;
        });

        if (filteredSecUsers.length > 0) {
          allUsers = filteredSecUsers;
        }
      }

      if (limitToSameOrg) {
        const currentUser = await this.sqlsvRepo.getUserById(userId).catch(() => null);
        const currentOrgId = this.extractParentOrgId(currentUser?.parent) || undefined;
        if (currentOrgId) {
          const currentOrg = await this.organizationUnitRepository.findOne({
            where: { id: currentOrgId, status: 1 },
            select: ['id', 'mpath', 'parentId', 'type'],
          });
          const ancestorIds = currentOrg?.mpath
            ? currentOrg.mpath.split('/').map(id => id.trim()).filter(Boolean)
            : [];

          const uniqueUserOrgIds = [...new Set(allUsers.map(u => this.extractParentOrgId(u?.parent)).filter(Boolean))];
          const orgUnits = uniqueUserOrgIds.length > 0
            ? await this.organizationUnitRepository.createQueryBuilder('ou')
              .select(['ou.id', 'ou.mpath', 'ou.parentId', 'ou.type'])
              .where('ou.id IN (:...uniqueUserOrgIds)', { uniqueUserOrgIds })
              .getMany()
            : [];
          const orgMap = new Map(orgUnits.map(ou => [ou.id, ou]));

          allUsers = allUsers.filter((u) => {
            const userOrgId = this.extractParentOrgId(u?.parent);
            if (!userOrgId) return false;
            if (userOrgId === currentOrgId) return true;
            if (ancestorIds.includes(userOrgId)) return true;

            const uOrg = orgMap.get(userOrgId);
            if (!uOrg) return false;

            // Kiểm tra con cháu: mpath của đơn vị đích chứa ID đơn vị hiện tại
            if (uOrg.mpath) {
              const uOrgAncestors = uOrg.mpath.split('/').map(id => id.trim()).filter(Boolean);
              if (uOrgAncestors.includes(currentOrgId)) return true;
            }

            // Kiểm tra ban ngang hàng dưới cùng phòng/cha
            if (
              currentOrg?.type?.toLowerCase() === 'ban' &&
              currentOrg?.parentId &&
              uOrg.type?.toLowerCase() === 'ban' &&
              uOrg.parentId === currentOrg.parentId
            ) {
              return true;
            }

            return false;
          });
        }
      }
    }

    // 4. Filter theo tên hoặc username nếu có
    if (searchKey) {
      allUsers = filterUsersByName(allUsers, searchKey);
    }

    // 5. Phân trang
    const total = allUsers.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedUsers = allUsers.slice(start, end);

    // 6. Map tên author sử dụng gộp truy vấn qua this.runtime.repo (Tối ưu tuyệt đối: chỉ tốn 1 query DB duy nhất)
    if (paginatedUsers && paginatedUsers.length > 0) {
      const userIds = paginatedUsers.map((u) => u._id);
      const authorNameMap = await this.runtime.repo.getAuthorizedNameMap(userIds);
      for (const u of paginatedUsers) {
        const authorizedName = authorNameMap.get(u._id);
        if (authorizedName) {
          u.name = `${authorizedName} (Được ${u.name} ủy quyền)`;
        }
      }
    }

    return {
      data: paginatedUsers,
      total,
      limit,
      page,
    };
  }

  async getUsersRoleFeature(
    userId: string,
    payload: any,
    limit = 100,
    page = 1,
    name?: string,
  ) {
    const totalStart = Date.now();
    try {
      const { documentId, documentType, roles, processKey } = payload;

      if (documentId) {
        const tAccessStart = Date.now();
        const hasAccess = await this.checkDocumentPermission(documentId, userId);
        // this.logger.log(`[getUsersRoleFeature] checkDocumentPermission took ${Date.now() - tAccessStart}ms`);
        if (!hasAccess) {
          throw new ForbiddenException('Bạn không có quyền truy cập văn bản này.');
        }
      }

      const tDocStart = Date.now();
      let doc;
      if (!processKey && documentType?.toLowerCase() === 'incomingdocument') {
        doc = await this.incomingService.getDocumentByFields({ documentId, select: ['bpmnVersion'] });
      } else if (!processKey && documentType?.toLowerCase() === 'outgoingdocument') {
        doc = await this.outgoingService.getOutgoingDocumentByFields({ documentId, select: ['bpmnVersion'] });
      }
      if (!processKey && !doc) throw new BadRequestException('Không tìm thấy văn bản');

      const processKeyFinal = processKey || doc.bpmnVersion;
      if (!processKeyFinal) {
        throw new BadRequestException('Văn bản không có luồng xử lý');
      }
      // this.logger.log(`[getUsersRoleFeature] getDocument/BPMN took ${Date.now() - tDocStart}ms`);

      const roleList = this.normalizeRoleCodes(roles);

      let allUsers: any[] = [];
      if (payload?.type == 'feedback') {
        const tFeedbackStart = Date.now();
        const groupCodes = roleList.length ? roleList : this.normalizeRoleCodes(roles);
        const allGroupUsers: any[] = [];

        for (const groupCode of groupCodes) {
          try {
            const groupUser = await this.groupUserService.findByCode(groupCode);
            const usersInGroup = groupUser?.data?.users || [];

            const activeUsersInGroup = usersInGroup.filter(
              (user: any) => user?.status === STATUS.ACTIVED
            );
            allGroupUsers.push(...activeUsersInGroup);
          } catch (error) {
            this.logger.warn(`[XIN_Y_KIEN_DEBUG][INFLOW][GROUP_NOT_FOUND] role: ${groupCode}, message: ${error?.message}`);
          }
        }

        if (!allGroupUsers.length) {
          throw new NotFoundException('Nhóm người dùng không tồn tại');
        }

        allUsers = this.mergeOpinionUsers(this.mapGroupUsersToOpinionUsers(allGroupUsers));
        this.logger.log(`[getUsersRoleFeature] type=feedback took ${Date.now() - tFeedbackStart}ms`);
      } else {
        const normalizedUserIds: string[] = [];
        const dynamicUserIds: string[] = [];
        const rbacUserIds: string[] = [];

        const permissionAssignmentType = USER_PERMISSION_ASSIGNMENT.USING;

        let jsonDuration = 0;
        let rbacDuration = 0;

        // 1. LUỒNG TRUY VẤN JSON (Nếu cấu hình là 1 hoặc 3)
        if (permissionAssignmentType === USER_PERMISSION_ASSIGNMENT.JSON || permissionAssignmentType === USER_PERMISSION_ASSIGNMENT.JSON_RBAC) {
          const tJsonStart = Date.now();
          try {
            const roleFeature = await this.roleFeatureSqlService.findByProcessKeyAndRoleCode({
              processKey: processKeyFinal,
              roleCode: roleList,
              exact: 'true',
            }) as RoleFeatureEntity[];

            const ids = roleFeature
              .flatMap((rf) => (Array.isArray(rf?.roles) ? rf.roles : []))
              .filter((r) => roleList.includes(String(r?.roleCode || '').trim().toLowerCase()))
              .flatMap((r) => (Array.isArray(r?.users) ? r.users : []))
              .map((uid) => String(uid || '').trim())
              .filter(Boolean);
            normalizedUserIds.push(...ids);

            // Lấy thêm user từ Nhóm người dùng có gán Vai trò động
            const originalRoles = Array.isArray(roles) ? roles : typeof roles === 'string' ? roles.split(',').map(r => r.trim()).filter(Boolean) : [];

            for (const roleCode of originalRoles) {
              try {
                const uids = await this.groupUserService.getUserIdsByRoleDynamic(processKeyFinal, roleCode);
                if (uids?.length) {
                  dynamicUserIds.push(...uids);
                }
              } catch (error) {
                this.logger.warn(`[UsersService][getUsersRoleFeature] Failed to fetch dynamic roles: ${error instanceof Error ? error.message : String(error)}`);
              }
            }
          } catch (error) {
            this.logger.error(`[DEBUG_PERF] JSON query failed: ${error?.message}`, error?.stack);
          }
          jsonDuration = Date.now() - tJsonStart;
          this.logger.log(`[getUsersRoleFeature] JSON_query took ${jsonDuration}ms`);
        }

        // 2. LUỒNG TRUY VẤN RBAC (Nếu cấu hình là 2 hoặc 3)
        if (permissionAssignmentType === USER_PERMISSION_ASSIGNMENT.RBAC || permissionAssignmentType === USER_PERMISSION_ASSIGNMENT.JSON_RBAC) {
          const tRbacStart = Date.now();
          try {
            const ids = await this.getUserIdsByProcessAndRoles(processKeyFinal, roleList);
            rbacUserIds.push(...ids);
          } catch (error) {
            this.logger.error(`[DEBUG_PERF] RBAC query failed: ${error?.message}`, error?.stack);
          }
          rbacDuration = Date.now() - tRbacStart;
          this.logger.log(`[getUsersRoleFeature] RBAC_query took ${rbacDuration}ms`);
        }

        // 3. In kết quả so sánh trực tiếp khi chạy cả 2 luồng (mode = 3)
        if (permissionAssignmentType === USER_PERMISSION_ASSIGNMENT.JSON_RBAC) {
          this.logger.log(
            `[getUsersRoleFeature] BENCHMARK RESULT:\n` +
            `  - JSON mode: ${jsonDuration}ms (Found ${normalizedUserIds.length + dynamicUserIds.length} user IDs)\n` +
            `  - RBAC mode: ${rbacDuration}ms (Found ${rbacUserIds.length} user IDs)\n` +
            `  -> Winner: ${rbacDuration < jsonDuration ? 'RBAC' : 'JSON'} (Diff: ${Math.abs(jsonDuration - rbacDuration)}ms)`
          );
        }

        // 3. Gán kết quả thực tế dựa trên cấu hình USER_PERMISSION_ASSIGNMENT
        let finalUserIds: string[] = [];
        if (permissionAssignmentType === USER_PERMISSION_ASSIGNMENT.JSON) {
          finalUserIds = [...normalizedUserIds, ...dynamicUserIds];
        } else if (permissionAssignmentType === USER_PERMISSION_ASSIGNMENT.RBAC) {
          finalUserIds = rbacUserIds;
        } else {
          finalUserIds = [...normalizedUserIds, ...dynamicUserIds, ...rbacUserIds];
        }

        const userFeatureSet = new Set<string>(finalUserIds);

        if (userFeatureSet.size > 0) {
          const allIds = Array.from(userFeatureSet);
          // Lọc bản thân ra khỏi danh sách IDs trước
          const filteredIds = allIds.filter(id => String(id) !== String(userId));

          // Phân trang trên mảng IDs trước
          const startIdx = (page - 1) * limit;
          const targetIds = filteredIds.slice(startIdx, startIdx + limit);

          const users: any[] = [];
          if (targetIds.length > 0) {
            const tGetUsersStart = Date.now();
            const batchResult = await this.sqlsvRepo.getUsersByIds(targetIds);
            users.push(...batchResult);
            this.logger.log(`[getUsersRoleFeature] sqlsvRepo.getUsersByIds PAGE ONLY took ${Date.now() - tGetUsersStart}ms`);
          }

          allUsers = users.map((userInfo: any) => ({
            _id: userInfo?.id,
            name: userInfo?.name,
            username: userInfo?.username,
            codeND: userInfo?.codeND,
            position: userInfo?.position,
            parent: this.extractParentOrgId(userInfo?.parent),
            parentType: userInfo?.parent?.type || null,
            orgType: userInfo?.parent?.type || null,
            role: userInfo?.role,
            types: 'user',
          }));
        }
      }
      // Lấy nhóm ưu tiên chanhvanphong để sắp xếp
      const tPrefStart = Date.now();
      const preferredUserIdSet = new Set<string>();
      try {
        const chanhVpGroup = await this.groupUserService.findByCode('chanhvanphong');
        if (chanhVpGroup && chanhVpGroup.data && Array.isArray(chanhVpGroup.data.users)) {
          chanhVpGroup.data.users.forEach(u => {
            if (u.id) preferredUserIdSet.add(String(u.id));
          });
        }
      } catch (error) {
        this.logger.warn(`[getUsersRoleFeature] Failed to fetch preferred group: ${error.message}`);
      }
      this.logger.log(`[getUsersRoleFeature] preferredGroup chanhvanphong took ${Date.now() - tPrefStart}ms`);

      const tSortFilterStart = Date.now();
      // Sắp xếp theo nhóm ưu tiên và tiếng Việt
      allUsers.sort((a, b) => {
        const aPriority = preferredUserIdSet.has(String(a._id)) ? 1 : 0;
        const bPriority = preferredUserIdSet.has(String(b._id)) ? 1 : 0;

        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        return String(a.name || '').localeCompare(String(b.name || ''), 'vi');
      });

      // Loại bỏ chính mình ra khỏi danh sách
      allUsers = allUsers.filter((u) => String(u._id) !== String(userId));

      // Check if we need to limit users to same org and children based on BPMN configuration
      let limitToSameOrg = false;
      let limitToDirectorsSecretary = false;
      try {
        const bpmnXML = await this.sqlRepo.getBpmnFile(processKeyFinal);
        if (bpmnXML) {
          const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);
          const lanes = (indexes?.lanes || []) as any;
          const targetRolesList = roleList.map((r: any) => String(r || '').trim().toLowerCase());
          for (const targetRole of targetRolesList) {
            const lane = lanes.find((l: any) => {
              const lRole = String(l.role || '').trim().toLowerCase();
              const lCode = String(l.properties?.candidateGroupsCode || '').trim().toLowerCase();
              const lGroups = String(l.properties?.candidateGroups || '').trim().toLowerCase();
              return lRole === targetRole || lCode === targetRole || lGroups === targetRole;
            });
            const targetProps = lane ? lane.properties : null;
            if (targetProps) {
              if (targetProps.getPeopleScope === 'same_org' || targetProps.getPeopleScope === 'same_org_and_children') {
                limitToSameOrg = true;
              }
              if (targetProps.getPeopleScope === 'directors_secretary') {
                limitToDirectorsSecretary = true;
              }
            }
          }
        }
      } catch (e) {
        console.error('[getUsersRoleFeature] Error parsing BPMN for lane properties:', e);
      }

      const targetLeaderId = payload?.userId || userId;
      const isSecretaryRole =
        limitToDirectorsSecretary ||
        roleList.some((r: any) => {
          const code = String(r || '').trim().toUpperCase();
          return code === 'THU_KY_LANH_DAO' || code === 'THU_KY' || code === 'THUKY';
        });

      if (isSecretaryRole && targetLeaderId) {
        const leaderUser = await this.sqlsvRepo.getUserById(targetLeaderId).catch(() => null);
        let secUserIds: string[] = [];
        if (leaderUser?.personalSecretary && leaderUser.personalSecretary !== 'NULL' && leaderUser.personalSecretary !== 'null') {
          const ps = String(leaderUser.personalSecretary).trim();
          if (ps.startsWith('[') && ps.endsWith(']')) {
            try {
              const parsed = JSON.parse(ps);
              if (Array.isArray(parsed)) {
                secUserIds = parsed.map((x: any) => String(x).trim()).filter(Boolean);
              }
            } catch {
              secUserIds = ps.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          } else {
            secUserIds = ps.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }

        if (secUserIds.length > 0) {
          const existingUserIds = new Set(allUsers.map((u: any) => String(u._id || u.id)));
          const missingSecIds = secUserIds.filter(id => !existingUserIds.has(id));

          for (const missingId of missingSecIds) {
            try {
              const secUser = await this.sqlsvRepo.getUserById(missingId);
              if (secUser) {
                allUsers.push({
                  _id: secUser.id,
                  name: secUser.name ?? 'Không rõ tên',
                  codeND: secUser.codeND || null,
                  position: secUser.position || null,
                  role: secUser.role || null,
                  username: secUser.username || null,
                  leader: secUser.leader || null,
                  personalSecretary: secUser.personalSecretary || null,
                  parent: secUser.parent?.id || null,
                  parentType: secUser.parent?.type || null,
                  orgType: secUser.parent?.type || null,
                  organizationName: secUser.organizationName || secUser.parent?.name || null,
                  organizationCode: secUser.organizationCode || secUser.parent?.code || null,
                  rootOrganizationName: secUser.rootOrganizationName || null,
                  rootOrganizationCode: secUser.rootOrganizationCode || null,
                  types: 'user',
                });
              }
            } catch (e) {
              console.error(`[getUsersRoleFeature] Error fetching secretary user ${missingId}:`, e);
            }
          }
        }

        allUsers = allUsers.filter((u: any) => {
          const uId = String(u._id || u.id);
          const isMatchSecId = secUserIds.includes(uId);
          const isMatchLeaderField = u.leader && String(u.leader) === String(targetLeaderId);
          return isMatchSecId || isMatchLeaderField;
        });
      }

      if (limitToSameOrg) {
        const currentUser = await this.sqlsvRepo.getUserById(userId).catch(() => null);
        const currentOrgId = this.extractParentOrgId(currentUser?.parent) || undefined;
        if (currentOrgId) {
          const allowedOrgIds = new Set<string>([currentOrgId]);
          try {
            const descendants = await this.organizationUnitRepository
              .createQueryBuilder('ou')
              .where('ou.status = 1')
              .andWhere('ou.mpath LIKE :mpathPattern', {
                mpathPattern: `%${currentOrgId}%`,
              })
              .getMany();
            descendants.forEach((org) => allowedOrgIds.add(org.id));
          } catch (e) {
            console.error('[getUsersRoleFeature] Error fetching descendants:', e);
          }
          allUsers = allUsers.filter((u) => {
            const userOrgId = u.parent;
            return userOrgId && allowedOrgIds.has(userOrgId);
          });
        }
      }

      //Điều kiện không xác định, tạm thêm payload?.type === 'feedback' để chạy chức năng
      // if (payload?.type === 'feedback' && opinionScope.enabled && opinionScope.currentOrgId) {
      //   const beforeCount = allUsers.length;

      //   if (opinionScope.mode === 'same_room') {
      //     allUsers = allUsers.filter(
      //       (u) => this.extractParentOrgId(u?.parent) === opinionScope.currentOrgId,
      //     );
      //     console.log('[XIN_Y_KIEN_DEBUG][INFLOW][FILTERED_BY_CURRENT_ROOM]', {
      //       currentOrgId: opinionScope.currentOrgId,
      //       beforeCount,
      //       afterCount: allUsers.length,
      //     });
      //   } else if (opinionScope.mode === 'other_room') {
      //     allUsers = allUsers.filter((u) => {
      //       const parentOrgId = this.extractParentOrgId(u?.parent);
      //       return !!parentOrgId && parentOrgId !== opinionScope.currentOrgId;
      //     });
      //     console.log('[XIN_Y_KIEN_DEBUG][INFLOW][FILTERED_BY_OTHER_ROOM]', {
      //       currentOrgId: opinionScope.currentOrgId,
      //       beforeCount,
      //       afterCount: allUsers.length,
      //     });
      //   }
      // }

      // 4. Filter theo tên nếu có
      if (name && name.trim()) {
        allUsers = filterUsersByName(allUsers, name);
      }

      // 5. Phân trang
      const total = allUsers.length;
      const start = (page - 1) * limit;
      const end = start + limit;

      const pagedUsers = allUsers.slice(start, end);
      this.logger.log(`[getUsersRoleFeature] Sort/Filter/Page (ID Only) took ${Date.now() - tSortFilterStart}ms`);

      // 6. Map tên author - Dùng batch query song song & tối ưu hóa uỷ quyền giống get-users-suggestion
      const tMapAuthorStart = Date.now();
      const activeAuthorities = await this.runtime.repo.getActiveAuthorities();
      if (activeAuthorities?.length > 0 && pagedUsers.length > 0) {
        const authorityMap = new Map(activeAuthorities.map(a => [a.author, a.authorized]));
        const relevantAuthorizedIds = [...new Set(
          pagedUsers.map(u => authorityMap.get(u._id)).filter(Boolean) as string[]
        )];

        if (relevantAuthorizedIds.length > 0) {
          const authorizedNames = await this.runtime.repo.getNamesOfUsers(relevantAuthorizedIds);
          const nameMap = new Map(authorizedNames.map(n => [n.id, n.name]));

          pagedUsers.forEach(u => {
            const authorizedId = authorityMap.get(u._id);
            if (!authorizedId) return;
            const authorizedName = nameMap.get(authorizedId);
            if (!authorizedName) return;
            u.name = `${authorizedName} (Được ${u.name} ủy quyền)`;
          });
        }
      }
      this.logger.log(`[getUsersRoleFeature] Map author (Active authorities) took ${Date.now() - tMapAuthorStart}ms`);

      this.logger.log(`[getUsersRoleFeature] Total time taken: ${Date.now() - totalStart}ms`);

      return {
        data: pagedUsers,
        total,
        limit,
        page,
      };
    } catch (error) {
      this.logger.error(
        `[getUsersRoleFeature] Error occurred. userId: ${userId}, limit: ${limit}, page: ${page}, name: ${name}, payload: ${JSON.stringify(payload)}. Message: ${error?.message}`,
        error?.stack,
      );
      throw error;
    }
  }

  private async getUserIdsByProcessAndRoles(processKey: string, roleCodes: string[]): Promise<string[]> {
    if (!roleCodes || roleCodes.length === 0) {
      return [];
    }
    const roleList = roleCodes.map(r => r.toLowerCase());

    // 1. Lấy user_id gán trực tiếp (Chỉ lấy active users)
    const directUserRows = roleList.length > 0
      ? await this.userRepository.manager.createQueryBuilder()
        .select('rpu.user_id', 'userId')
        .from('roles_process_users', 'rpu')
        .innerJoin('roles_process', 'rp', 'rp.id = rpu.role_id')
        .innerJoin('users', 'u', 'u.id = rpu.user_id AND u.status = 1')
        .where('rp.process_key = :processKey AND rp.is_active = 1', { processKey })
        .andWhere('LOWER(rp.role_code) IN (:...roleList)', { roleList })
        .getRawMany<{ userId: string }>()
      : [];

    // 2. Lấy user_id gán qua nhóm (Chỉ lấy active users và active groups)
    const groupUserRows = roleList.length > 0
      ? await this.userRepository.manager.createQueryBuilder()
        .select('ugu.user_id', 'userId')
        .from('roles_process_groups', 'rpg')
        .innerJoin('roles_process', 'rp', 'rp.id = rpg.role_id')
        .innerJoin('group_users', 'g', 'g.id = rpg.group_id AND g.status = 1')
        .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = rpg.group_id')
        .innerJoin('users', 'u', 'u.id = ugu.user_id AND u.status = 1')
        .where('rp.process_key = :processKey AND rp.is_active = 1', { processKey })
        .andWhere('LOWER(rp.role_code) IN (:...roleList)', { roleList })
        .getRawMany<{ userId: string }>()
      : [];

    const directUserIds = directUserRows.map(row => String(row.userId).trim());
    const groupUserIds = groupUserRows.map(row => String(row.userId).trim());

    return [...directUserIds, ...groupUserIds];
  }

  // Service
  async getReturnUser(
    payload: {
      userId: string;
      documentId: string;
      roles?: string;
      documentType?: string;
      priority?: boolean;
    },
    limit: number,
    page: number,
    name?: string,
  ) {
    const { documentId, userId, roles, documentType, priority } = payload;

    if (!documentId || !userId) {
      throw new BadRequestException('documentId and userId are required');
    }

    if (priority) {
      return this.getUsersInFlow(userId, payload, limit, page, name);
    }

    let doc;
    if (documentType?.toLowerCase() === 'incomingdocument') {
      doc = await this.incomingService.getDocumentByFields({ documentId, select: ['bpmnVersion'] });
    } else if (documentType?.toLowerCase() === 'outgoingdocument') {
      doc = await this.outgoingService.getOutgoingDocumentByFields({ documentId, select: ['bpmnVersion'] });
    }
    if (!doc) {
      throw new BadRequestException('Không tìm thấy văn bản');
    }
    // const wi = await this.workItemService.getWorkItemByDocId({ docId: documentId, userId });
    // const userRole = await this.getUserRole(userId, doc.bpmnVersion);
    const work = await this.workItemService.getWorkItemByDocId({ docId: documentId, userId });
    if (!work) throw new BadRequestException("Không tìm thấy công việc hiện tại của người dùng");

    const nodeFlow = work?.nodeId || '';
    // 4. Get audit history

    let audits: any[] = [];
    audits = await this.sqlRepo.getAuditByReturn(documentId, nodeFlow);

    if (!audits?.length) {
      throw new BadRequestException('Không tìm thấy lịch sử xử lý');
    }

    // 4. ✅ ƯU TIÊN VT
    let prevUserId: string | null = null;

    // Tìm VT gần nhất

    // fallback: người xử lý trước đó
    const lastAudit = audits[audits.length - 1];
    if (lastAudit?.role !== roles) {
      const auditByRole = await this.sqlRepo.getAuditByRole(documentId, roles || '');
      const lastAuditByRole = auditByRole[auditByRole.length - 1];
      if (lastAuditByRole?.createdBy) {
        prevUserId = lastAuditByRole.createdBy;
      }
      // return {
      //   data: [],
      //   total: 0,
      //   limit,
      //   page,
      // };
    } else {
      prevUserId = lastAudit?.createdBy;
    }

    if (!prevUserId) {
      throw new BadRequestException('Không tìm thấy người xử lý trước đó');
    }

    // 5. Query Mongo (giữ nguyên code cũ)
    const { usersWithType, total } = await this.sqlsvRepo.returnUser(
      prevUserId,
      limit,
      page,
      name,
    );

    return {
      data: usersWithType,
      total,
      limit,
      page,
    };
  }

  async getOrganizationUnit(
    payload: GetRolesDto,
    filter: any,
    limit: number,
    page: number,
    byRoles: boolean,
    name?: string,
  ) {
    let result;

    if (byRoles) {
      const { documentId, userId, roles, documentType } = payload;
      let doc;
      if (documentType?.toLowerCase() === 'incomingdocument') {
        doc = await this.incomingService.getDocumentByFields({ documentId, select: ['bpmnVersion'] });
      } else if (documentType?.toLowerCase() === 'outgoingdocument') {
        doc = await this.outgoingService.getOutgoingDocumentByFields({ documentId, select: ['bpmnVersion'] });
      }
      if (!doc) throw new BadRequestException('Không tìm thấy văn bản');
      if (!userId) throw new BadRequestException('Vui lòng nhập userId');

      const processKey = doc.bpmnVersion || 'PHOIHOP_NHANDEBIET';
      const roleList = (roles || '').split(',').filter(Boolean);

      const { usersWithType } = await this.sqlsvRepo.getUsersInFlow(
        processKey,
        roleList,
        1000, // Lấy nhiều hơn để filter
        1,
        userId,
      );

      if (!usersWithType.length) {
        return { data: [], total: 0, limit, page };
      }

      const userDoc = [
        ...new Set(
          usersWithType
            .map((u) => u.parent)
            .filter((parent): parent is string => Boolean(parent)),
        ),
      ];

      result = await this.sqlsvRepo.getOrganizationUnit({
        filter,
        limit: 1000, // Lấy nhiều hơn để filter
        page: 1,
        userDoc,
        name,
      });
    } else {
      result = await this.sqlsvRepo.getOrganizationUnit({
        filter,
        limit: 1000, // Lấy nhiều hơn để filter
        page: 1,
        userDoc: undefined,
        name,
      });
    }

    // Filter theo name nếu có
    let filteredData = result.data;
    if (name && name.trim()) {
      filteredData = filterOrgUnitsByName(result.data, name);
    }

    // Phân trang sau khi filter
    const total = filteredData.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const pagedData = filteredData.slice(start, end);

    return { data: pagedData, total, limit, page };
  }

  async getOrganizationUnitsByFlow(
    payload: OrganizationUnitsByFlowDto,
    userId: string,
    limit: number,
    page: number,
    name?: string,
  ) {
    if (!payload) throw new Error("Vui lòng truyền payload");

    const { documentId, documentType, unit, processKey } = payload;

    if (documentId) {
      const hasAccess = await this.checkDocumentPermission(documentId, userId);
      if (!hasAccess) {
        throw new ForbiddenException('Bạn không có quyền truy cập văn bản này.');
      }
    }

    if (!processKey && (!documentId || !userId)) {
      throw new BadRequestException('Thiếu documentId hoặc userId');
    }

    /* =========================
       1. Lấy document
    ========================== */
    let doc;
    if (documentType?.toLowerCase() === 'incomingdocument' && !processKey && documentId) {
      doc = await this.incomingService.getDocumentByFields({ documentId, select: ['bpmnVersion'] });
    } else if (documentType?.toLowerCase() === 'outgoingdocument' && !processKey && documentId) {
      doc = await this.outgoingService.getOutgoingDocumentByFields({ documentId, select: ['bpmnVersion'] });
    }

    if (!doc && !processKey) {
      throw new BadRequestException('Không tìm thấy văn bản');
    }

    /* =========================
       2. Lấy BPMN version
    ========================== */
    const bpmnXML = await this.sqlsvRepo.getVersionById(doc?.bpmnVersion || processKey);
    if (!bpmnXML) {
      throw new BadRequestException('Không tìm thấy luồng xử lý');
    }

    const processKeyFinal = processKey || bpmnXML.processKey;
    if (!processKeyFinal) {
      return { data: [], total: 0, limit, page };
    }

    /* =========================
       3. Lấy phòng ban của user hiện tại (bao gồm cha + con)
    ========================== */
    const orgUnitsAll = await this.sqlsvRepo.getAllOrganizationUnitsSortedByRelevance(
      userId,
      name,
    );


    if (!orgUnitsAll.length) {
      return { data: [], total: 0, limit, page };
    }

    const processIdForScope = doc?.bpmnVersion || processKeyFinal;
    const opinionScope = await this.resolveOpinionScopeByLane({
      processId: processIdForScope,
      documentId,
      userId,
      workitem: payload?.workitem,
      actionCode: payload?.actionCode,
      roles: payload?.roles,
    });



    let orgUnits = orgUnitsAll;

    // Check if we need to limit organization units to same org or directors secretary based on BPMN configuration
    let limitToSameOrg = false;
    let limitToDirectorsSecretary = false;
    const roleList = payload?.roles ? String(payload.roles).split(',').map((r) => r.trim()).filter(Boolean) : [];
    try {
      const bpmnXMLObj = await this.sqlRepo.getBpmnFile(processIdForScope);
      if (bpmnXMLObj) {
        const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXMLObj);
        const lanes = (indexes?.lanes || []) as any;
        const targetRoles = roleList.map((r) => r.toLowerCase());
        for (const targetRole of targetRoles) {
          const lane = lanes.find((l: any) => {
            const lRole = String(l.role || '').trim().toLowerCase();
            const lCode = String(l.properties?.candidateGroupsCode || '').trim().toLowerCase();
            const lGroups = String(l.properties?.candidateGroups || '').trim().toLowerCase();
            return lRole === targetRole || lCode === targetRole || lGroups === targetRole;
          });
          const targetProps = lane ? lane.properties : null;
          if (targetProps) {
            if (targetProps.getPeopleScope === 'same_org' || targetProps.getPeopleScope === 'same_org_and_children') {
              limitToSameOrg = true;
            }
            if (targetProps.getPeopleScope === 'directors_secretary') {
              limitToDirectorsSecretary = true;
            }
          }
        }
      }
    } catch (e) {
      console.error('[getOrganizationUnitsByFlow] Error parsing BPMN for lane properties:', e);
    }

    const targetLeaderId = payload?.userId || userId;
    const isSecretaryRole =
      limitToDirectorsSecretary ||
      roleList.some((r: any) => {
        const code = String(r || '').trim().toUpperCase();
        return code === 'THU_KY_LANH_DAO' || code === 'THU_KY' || code === 'THUKY';
      });

    if (isSecretaryRole && targetLeaderId) {
      const leaderUser = await this.sqlsvRepo.getUserById(targetLeaderId).catch(() => null);
      let secUserIds: string[] = [];
      if (leaderUser?.personalSecretary && leaderUser.personalSecretary !== 'NULL' && leaderUser.personalSecretary !== 'null') {
        const ps = String(leaderUser.personalSecretary).trim();
        if (ps.startsWith('[') && ps.endsWith(']')) {
          try {
            const parsed = JSON.parse(ps);
            if (Array.isArray(parsed)) {
              secUserIds = parsed.map((x: any) => String(x).trim()).filter(Boolean);
            }
          } catch {
            secUserIds = ps.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        } else {
          secUserIds = ps.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      const secUsers: any[] = [];
      if (secUserIds.length > 0) {
        for (const secId of secUserIds) {
          const u = await this.sqlsvRepo.getUserById(secId).catch(() => null);
          if (u) secUsers.push(u);
        }
      }
      const flowSecUsers = await this.sqlsvRepo.getUsersInFlow(processKeyFinal, roleList, 1000, 1, userId).catch(() => ({ usersWithType: [] }));
      const matchedUsers = (flowSecUsers?.usersWithType || []).filter((u: any) => {
        const uId = String(u._id || u.id);
        return secUserIds.includes(uId) || (u.leader && String(u.leader) === String(targetLeaderId));
      });

      const allSecretaryUsers = [...secUsers, ...matchedUsers];
      const secOrgIds = new Set<string>();
      for (const u of allSecretaryUsers) {
        const orgId = this.extractParentOrgId(u?.parent);
        if (orgId) secOrgIds.add(String(orgId));
      }

      if (secOrgIds.size > 0) {
        const allowedOrgIds = new Set<string>();
        for (const ou of orgUnitsAll) {
          const ouId = String(ou?._id ?? ou?.id ?? '');
          if (secOrgIds.has(ouId)) {
            allowedOrgIds.add(ouId);
            const mpath = ou?.mpath || '';
            const mpathUnits = mpath ? mpath.split('/').filter(Boolean) : [];
            for (const pid of mpathUnits) {
              allowedOrgIds.add(String(pid));
            }
          }
        }
        orgUnits = orgUnitsAll.filter((ou) => {
          const ouId = String(ou?._id ?? ou?.id ?? '');
          return allowedOrgIds.has(ouId);
        });
      }
    } else if (limitToSameOrg) {
      const currentUser = await this.sqlsvRepo.getUserById(userId).catch(() => null);
      const currentOrgId = this.extractParentOrgId(currentUser?.parent) || undefined;
      if (currentOrgId) {
        orgUnits = this.filterOrgUnitsToCurrentBranch(orgUnitsAll, currentOrgId);
      }
    } else if (documentType?.toLowerCase() === 'incomingdocument') {
      // Bỏ qua lọc scope nếu đang tìm theo Role (thường là để Trình ký)
      const isTransition = !!payload?.roles || payload?.actionCode === 'TRINH_KY';

      if (opinionScope.enabled && opinionScope.currentOrgId && !isTransition) {
        if (opinionScope.mode === 'same_room') {
          orgUnits = this.filterOrgUnitsToCurrentBranch(orgUnitsAll, opinionScope.currentOrgId);

        } else if (opinionScope.mode === 'other_room') {
          orgUnits = orgUnitsAll.filter((ou) => {
            const orgId = String(ou?._id ?? ou?.id ?? '').trim();
            return !!orgId && orgId !== opinionScope.currentOrgId;
          });
        }
      }
    }

    // Lọc theo phòng ban áp dụng (unit) cấu hình trong quy trình (BPMN Design) nếu có cấu hình và là outgoingdocument
    if (documentType?.toLowerCase() !== 'incomingdocument') {
      if (opinionScope.currentOrgId) {
        if (opinionScope.mode === 'same_room') {
          orgUnits = this.filterOrgUnitsToCurrentBranch(orgUnitsAll, opinionScope.currentOrgId);
        } else if (opinionScope.mode === 'other_room' || opinionScope.mode === 'none') {
          const bpmnDesignRepo = this.organizationUnitRepository.manager.getRepository(BpmnDesignEntity);
          const bpmnDesign = await bpmnDesignRepo.findOne({
            where: [
              { id: processIdForScope },
              { processKey: processIdForScope }
            ],
            select: ['id', 'unit']
          });

          if (bpmnDesign && Array.isArray(bpmnDesign.unit) && bpmnDesign.unit.length > 0) {
            const appliedUnitIds = new Set(bpmnDesign.unit.map(id => String(id)));
            const allowedUnitIds = new Set<string>();

            for (const ou of orgUnitsAll) {
              const ouId = String(ou?._id ?? ou?.id ?? '');
              if (appliedUnitIds.has(ouId)) {
                allowedUnitIds.add(ouId);
                const mpath = ou?.mpath || '';
                const mpathUnits = mpath ? mpath.split('/').filter(Boolean) : [];
                for (const pid of mpathUnits) {
                  allowedUnitIds.add(String(pid));
                }
              }
            }

            orgUnits = orgUnitsAll.filter(ou => {
              const ouId = String(ou?._id ?? ou?.id ?? '');
              return allowedUnitIds.has(ouId);
            });
          }
        }
      }
    }
    orgUnits = this.includeParentOrgUnits(orgUnits, orgUnitsAll);

    const rootCount = orgUnits.filter((ou) => !this.extractParentOrgId(ou?.parent)).length;

    /* =========================
       4. Phân trang
    ========================== */
    const total = orgUnits.length;

    return {
      data: orgUnits,
      total,
      limit,
      page,
    };
  }

  async getUsersInSameOrgV1(
    userId: string,
    limit: number,
    page: number,
    name?: string,
  ) {
    if (!userId) {
      return { data: [], count: 0, page, limit, skip: 0 };
    }

    // 1. Lấy parent (organization_unit) của user hiện tại
    const currentUser = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['parent'],
      select: {
        id: true,
        position: true,
        parent: {
          id: true,
          name: true,
        },
      },
    });
    if (!currentUser?.position) {
      throw new HttpException(
        {
          code: 'USER_NO_POSITION',
          message: 'Bạn chưa được gán chức danh, không thể thực hiện uỷ quyền.',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const currentLevel = POSITION_LEVEL[currentUser.position] ?? -1;
    if (currentLevel < 0) {
      throw new HttpException(
        {
          code: 'INVALID_POSITION',
          message: 'Chức danh người dùng không hợp lệ.',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    if (!currentUser?.parent) {
      return { data: [], count: 0, page, limit, skip: 0 };
    }

    const skip = (page - 1) * limit;

    // 2. Query users cùng phòng
    const qb = this.userRepository
      .createQueryBuilder('u')
      .where('u.parent = :parent', { parent: currentUser.parent.id })
      .andWhere('u.status = :status', { status: 1 })
      .andWhere('u.id != :userId', { userId });

    // 3. Search
    if (name) {
      qb.andWhere(
        `(u.username LIKE :name
          OR u.name LIKE :name
          OR u.emailUser LIKE :name)`,
        { name: `%${name}%` },
      );
    }

    const users = await qb
      .select([
        'u.id',
        'u.name',
        'u.username',
        'u.codeND',
        'u.position',
      ])
      .getMany();

    // 4. Lọc user ngang cấp hoặc cấp dưới
    const filteredUsers = users.filter(u => {
      // Không có position thì không cho
      if (!u.position) return false;
      // Người hiện tại không có position thì không lọc được
      if (currentLevel < 0) return false;
      const level = POSITION_LEVEL[u.position];
      if (level == null) return false;
      // <= : ngang cấp hoặc cấp dưới
      // return level >= currentLevel;
      return level === currentLevel + 1; // Dưới 1 cấp
    });
    // Sort theo level
    filteredUsers.sort((a, b) => {
      const la = POSITION_LEVEL[a.position!] ?? 999;
      const lb = POSITION_LEVEL[b.position!] ?? 999;
      return la - lb;
    });
    const total = filteredUsers.length;
    const pagedUsers = filteredUsers.slice(skip, skip + limit);

    // 5. Map kết quả
    const org = currentUser.parent;

    const data = pagedUsers.map(u => ({
      organizationUnit: {
        organizationUnitId: org?.id ?? null,
        name: org?.name ?? null,
      },
      _id: u.id,
      name: u.name || '',
      code: u.codeND || u.username,
      roleCached: { AuthorityDocument: {} },
    }));

    return {
      data,
      count: total,
      page,
      limit,
      skip,
    };
  }

  async getUsersInSameOrg(
    userId: string,
    limit: number,
    page: number,
    name?: string,
  ) {
    const skip = (page - 1) * limit;
    if (!userId) {
      return { data: [], count: 0, page, limit, skip };
    }
    const currentUser = await this.userRepository.findOne({
      where: { id: userId, status: STATUS.ACTIVED },
      relations: ['parent'],
      select: {
        id: true,
        parent: {
          id: true,
          name: true,
        },
      },
    });

    if (!currentUser?.parent?.id) {
      return { data: [], count: 0, page, limit, skip };
    }
    const result = await this.userRepository.manager.query(
      `
      SELECT MIN(g.[order]) AS minOrder
      FROM ${this.dbname}.dbo.user_group_users ugu
      JOIN ${this.dbname}.dbo.group_users g
        ON g.id = ugu.group_user_id
      WHERE ugu.user_id = @0
        AND g.status = 1
        AND g.[order] IS NOT NULL
      `,
      [userId],
    );
    const minOrder = result?.[0]?.minOrder;
    if (minOrder === null || minOrder === undefined) {
      return { data: [], count: 0, page, limit, skip };
    }
    // Tìm order nhỏ nhất lớn hơn minOrder trong cùng phòng ban
    const nextOrderResult = await this.userRepository.manager.query(
      `
      SELECT MIN(g.[order]) AS nextOrder
      FROM ${this.dbname}.dbo.user_group_users ugu
      JOIN ${this.dbname}.dbo.group_users g
        ON g.id = ugu.group_user_id
      JOIN ${this.dbname}.dbo.users u
        ON u.id = ugu.user_id
      WHERE u.parent = @0
        AND u.status = 1
        AND g.status = 1
        AND g.[order] IS NOT NULL
        AND g.[order] > @1
      `,
      [currentUser.parent.id, minOrder],
    );

    const nextOrder = nextOrderResult?.[0]?.nextOrder;

    if (nextOrder === null || nextOrder === undefined) {
      return { data: [], count: 0, page, limit, skip };
    }
    const qb = this.userRepository
      .createQueryBuilder('u')
      .where('u.status = :status', { status: STATUS.ACTIVED })
      .andWhere('u.parent = :parent', { parent: currentUser.parent.id })
      .andWhere('u.id <> :userId', { userId })
      .andWhere(
        `
        EXISTS (
          SELECT 1
          FROM ${this.dbname}.dbo.user_group_users ugu2
          JOIN ${this.dbname}.dbo.group_users g2
            ON g2.id = ugu2.group_user_id
          WHERE
            ugu2.user_id = u.id
            AND g2.status = 1
            AND g2.[order] = :nextOrder
        )
        `,
        { nextOrder },
      );

    if (name) {
      qb.andWhere(
        `(u.username LIKE :name OR u.name LIKE :name OR u.email_user LIKE :name)`,
        { name: `%${name}%` },
      );
    }
    const [users, total] = await qb
      .select([
        'u.id',
        'u.name',
        'u.username',
        'u.codeND',
        'u.position',
        'u.emailUser',
      ])
      .orderBy('u.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: users.map(u => ({
        _id: u.id,
        name: u.name,
        code: u.codeND || u.username,
        organizationUnit: {
          organizationUnitId: currentUser?.parent?.id,
          organizationUnitName: currentUser?.parent?.name,
        },
        roleCached: { AuthorityDocument: {} },
      })),
      count: total,
      page,
      limit,
      skip,
    };
  }

  async getUsersByOrganizationUnit(organizationUnitId: string, name?: string) {
    if (!organizationUnitId) {
      return { data: [], count: 0 };
    }

    // Query user trực tiếp theo parent (OrganizationUnit)
    const qb = this.userRepository
      .createQueryBuilder('u')
      .where('u.status = :status', { status: 1 })
      .andWhere('u.parent = :id', { id: organizationUnitId });

    // Search
    if (name) {
      qb.andWhere(
        `(u.username LIKE :name OR u.name LIKE :name OR u.emailUser LIKE :name)`,
        { name: `%${name}%` },
      );
    }

    const [users, total] = await qb
      .select(['u.id', 'u.name', 'u.username', 'u.codeND'])
      .leftJoinAndSelect('u.parent', 'parent')
      .getManyAndCount();

    // Map response
    const data = users.map((u) => ({
      _id: u.id,
      name: u.name || '',
      code: u.codeND || u.username,
      organizationUnit: {
        organizationUnitId: u.parent?.id,
      },
      roleCached: { AuthorityDocument: {} },
    }));

    return {
      data,
      count: total,
    };
  }
  async getUsersByOrganizationUnitPending(organizationUnitId: string, name?: string, countFeedback?: boolean) {
    if (!organizationUnitId) {
      return { data: [], count: 0 };
    }

    // Query user trực tiếp theo parent (OrganizationUnit)
    // Kết hợp điều kiện "Vai trò động đơn vị xử lý": lọc user có roleCode là 'DON_VI_XU_LY'
    const qb = this.userRepository
      .createQueryBuilder('u')
      .where('u.status = :status', { status: 1 })
      .andWhere('u.parent = :id', { id: organizationUnitId })
      .andWhere(`EXISTS (
        SELECT 1 FROM OPENJSON(CASE WHEN ISJSON(u.roles_by_process) > 0 THEN u.roles_by_process ELSE '[]' END) AS p
        CROSS APPLY OPENJSON(JSON_QUERY(p.value, '$.roles')) AS r
        WHERE JSON_VALUE(r.value, '$.roleCode') = 'DON_VI_XU_LY'
      )`);

    // Search
    if (name) {
      qb.andWhere(
        `(u.username LIKE :name OR u.name LIKE :name OR u.emailUser LIKE :name)`,
        { name: `%${name}%` },
      );
    }

    const [users, total] = await qb
      .select(['u.id', 'u.name', 'u.username', 'u.codeND'])
      .leftJoinAndSelect('u.parent', 'parent')
      .getManyAndCount();

    // Map response
    const data = users.map((u) => ({
      _id: u.id,
      name: u.name || '',
      code: u.codeND || u.username,
      organizationUnit: {
        organizationUnitId: u.parent?.id,
      },
      roleCached: { AuthorityDocument: {} },
    }));

    const finalData = countFeedback ? await this.mapDataFeedbackCounts(data) : data;

    return {
      data: finalData,
      count: total,
    };
  }
  async getUsersByOrganizationUnitV1(
    organizationUnitIds: string[],
    name?: string,
  ) {
    if (!organizationUnitIds || organizationUnitIds.length === 0) {
      return { data: [], count: 0 };
    }

    const qb = this.userRepository
      .createQueryBuilder('u')
      .where('u.status = :status', { status: 1 })
      .andWhere('u.parent IN (:...ids)', {
        ids: organizationUnitIds,
      });

    // Search
    if (name) {
      qb.andWhere(
        `(u.username LIKE :name 
        OR u.name LIKE :name 
        OR u.emailUser LIKE :name)`,
        { name: `%${name}%` },
      );
    }

    const [users, total] = await qb
      .select([
        'u.id',
        'u.name',
        'u.username',
        'u.codeND',
        'parent.id',
        'parent.name',
      ])
      .leftJoin('u.parent', 'parent')
      .getManyAndCount();

    const data = users.map((u) => ({
      _id: u.id,
      name: u.name || '',
      code: u.codeND || u.username,
      organizationUnit: {
        organizationUnitId: u.parent?.id,
        name: u.parent?.name || '',
      },
      roleCached: { AuthorityDocument: {} },
    }));

    return {
      data,
      count: total,
    };
  }

  async getProjectUsersByProcessKey(queryParams: {
    processKey?: string;
    process_key?: string;
    name?: string;
    q?: string;
    page?: number | string;
    limit?: number | string;
    excludeId?: string | string[];
    excludeIds?: string | string[];
  }) {
    const processKey = String(queryParams.processKey || queryParams.process_key || 'CVDAN').trim();
    if (!processKey) {
      throw new BadRequestException('processKey is required');
    }

    const bpmnDesign = await this.bpmnDesignRepository
      .createQueryBuilder('bpmn')
      .select(['bpmn.id', 'bpmn.processKey', 'bpmn.unit'])
      .where('bpmn.processKey = :processKey', { processKey })
      .getOne();

    const unitIds = Array.from(new Set(
      (Array.isArray(bpmnDesign?.unit) ? bpmnDesign.unit : [])
        .map((unit: any) => {
          if (typeof unit === 'string') return unit;
          return unit?.id || unit?.value || unit?.organizationUnitId || null;
        })
        .filter(Boolean)
        .map(String),
    ));

    const page = clampPage(queryParams.page || 1);
    const limit = clampLimit(queryParams.limit || 25);

    if (!unitIds.length) {
      return {
        total: 0,
        page,
        limit,
        totalPages: 0,
        data: [],
      };
    }

    const skip = (page - 1) * limit;
    const search = String(queryParams.name || queryParams.q || '').trim();
    const excludeIds = this.parseExcludeIds(queryParams.excludeId || queryParams.excludeIds);

    const qb = this.userRepository
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.parent', 'parent')
      .leftJoinAndSelect('parent.parent', 'grandParent')
      .where('u.status = :status', { status: STATUS.ACTIVED })
      .andWhere('parent.id IN (:...unitIds)', { unitIds })
      .select([
        'u.id',
        'u.name',
        'u.fullName',
        'u.username',
        'u.emailUser',
        'u.phoneNumberUser',
        'u.position',
        'u.status',
        'u.organizationName',
        'u.createdAt',
        'u.updatedAt',
        'parent.id',
        'parent.name',
        'parent.mpath',
        'parent.type',
        'grandParent.id',
        'grandParent.name',
      ])
      .orderBy('u.name', 'ASC');

    if (search) {
      qb.andWhere(
        `(
          u.name COLLATE Latin1_General_CI_AI LIKE :search COLLATE Latin1_General_CI_AI
          OR u.username COLLATE Latin1_General_CI_AI LIKE :search COLLATE Latin1_General_CI_AI
          OR u.email_user COLLATE Latin1_General_CI_AI LIKE :search COLLATE Latin1_General_CI_AI
        )`,
        { search: `%${search}%` },
      );
    }

    if (excludeIds.length) {
      qb.andWhere('u.id NOT IN (:...excludeIds)', { excludeIds });
    }

    const [users, total] = await qb.skip(skip).take(limit).getManyAndCount();
    const grandParentNameMap = await this.getGrandParentNameMap(users);

    return {
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        fullName: u.fullName,
        username: u.username,
        emailUser: u.emailUser,
        phoneNumberUser: u.phoneNumberUser,
        position: u.position,
        status: u.status,
        organizationName: u.organizationName,
        parent: u.parent?.id || null,
        parentName: u.parent?.name || null,
        grandParentName: (() => {
          const targetGrandParentId = this.getTargetOrgUnitIdForGrandParent(u.parent);
          return targetGrandParentId ? (grandParentNameMap.get(targetGrandParentId) || null) : null;
        })(),
        canUblock: u.status === STATUS.LOCKED,
        canBlock: u.status === STATUS.ACTIVED || u.status === STATUS.NOT_ACTIVED,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserPermissions(userId: string) {
    // 1️⃣ Lấy user và group liên quan
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'username', 'emailUser'],
      relations: ['groupUsers'],
    });

    if (!user) throw new BadRequestException('User không tồn tại');

    const userGroupIds = user.groupUsers?.map((g) => g.id) || [];
    if (userGroupIds.length === 0) {
      return {
        id: user.id,
        username: user.username,
        email: user.emailUser,
        groups: [],
        reportPermission: [],
      };
    }

    // 2️⃣ Lấy chi tiết group và các role, organizationUnits
    const groups = await this.groupUserRepository.find({
      where: { id: In(userGroupIds), status: STATUS.ACTIVED },
      relations: ['organizationUnits'],
    });

    const allRoleIds = groups.flatMap((g) => g.roles || []);
    const allOrgUnitIds = groups.flatMap(
      (g) => g.organizationUnits?.map((o) => o.id) || [],
    );

    // 3️⃣ Lấy chi tiết role và organizationUnit
    const roleDetails =
      allRoleIds.length > 0
        ? await this.listRoleEntity.find({
          where: { id: In(allRoleIds), status: STATUS.ACTIVED },
        })
        : [];

    const orgUnitDetails =
      allOrgUnitIds.length > 0
        ? await this.organizationUnitRepository.find({
          where: { id: In(allOrgUnitIds), status: STATUS.ACTIVED },
          relations: ['parent'],
        })
        : [];

    // 4️⃣ Lấy roleGroup mapping cho mỗi organizationUnit
    // ✅ Commented - EntityRoleGroupService module deleted
    const orgUnitDetailsWithRoleGroup = await Promise.all(
      orgUnitDetails.map(async (unit) => {
        // const unitId = `RG_${unit.code}`;
        // const mapping = await this.entityRoleGroupService.findByUnitId(
        //   unitId,
        //   'TTHC',
        // );
        // if (!mapping) return { ...unit, roleGroup: null };
        // const roleGroup = await this.userRepository.findOne({
        //   where: { id: mapping.roleGroupId.toString() },
        //   relations: ['roles'],
        // });
        // return {
        //   ...unit,
        //   roleGroup: roleGroup ? roleGroup : null,
        // };
        return { ...unit, roleGroup: null }; // Return default value
      }),
    );

    // 5️⃣ Map role & orgUnit để populate group
    const roleDetailsMap = new Map(roleDetails.map((r) => [r.id, r]));
    const orgUnitDetailsMap = new Map(
      orgUnitDetailsWithRoleGroup.map((o) => [o.id, o]),
    );

    const populatedGroups = groups.map((group) => {
      const groupRoleDetails = (group.roles || [])
        .map((roleId) => roleDetailsMap.get(roleId as any)) // chỉ lấy roleId
        .filter(Boolean)
        .flatMap((role) => this.formatRoleDetails(role));

      const groupOrgUnitDetails = (group.organizationUnits || [])
        .map((unit) => orgUnitDetailsMap.get(unit.id))
        .filter(Boolean);

      return {
        ...group,
        roleDetails: groupRoleDetails,
        organizationUnitDetails: groupOrgUnitDetails,
      };
    });

    // 6️⃣ Lấy reportPermission
    const reportPermission = orgUnitDetailsWithRoleGroup
      .flatMap((unit: any) => unit.roleGroup?.roles || [])
      .filter(
        (role: any) =>
          Array.isArray(role.methods) && role.methods.some((m) => m.allow),
      )
      .map((role: any) => role.codeModuleFunction);

    return {
      id: user.id,
      username: user.username,
      email: user.emailUser,
      groups: populatedGroups,
      reportPermission,
    };
  }
  async findOneByUsername(username: string): Promise<UserEntity | null> {
    try {
      return await this.userRepository.findOne({
        where: {
          username,
          status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED, STATUS.LOCKED]),
        },
      });
    } catch (error) {
      console.error('Error in UsersService.findOneByUsername:', error);
      return null;
    }
  }
  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    // 1️⃣ Kiểm tra username
    const existingUsername = await this.userRepository.findOne({
      where: {
        username: createUserDto.username,
        status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED, STATUS.LOCKED]),
      },
    });
    if (existingUsername) {
      throw new BadRequestException(
        `Username ${createUserDto.username} đã tồn tại`,
      );
    }

    // 2️⃣ Kiểm tra email
    const existingEmail = await this.userRepository.findOne({
      where: {
        emailUser: createUserDto.emailUser,
        status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED, STATUS.LOCKED]),
      },
    });
    if (existingEmail) {
      throw new BadRequestException(
        `Email ${createUserDto.emailUser} đã tồn tại`,
      );
    }

    // 3️⃣ Kiểm tra parent (OrganizationUnit)
    if (createUserDto.parent) {
      const parentOrg = await this.organizationUnitRepository.findOne({
        where: { id: createUserDto.parent, status: STATUS.ACTIVED },
      });
      if (!parentOrg) {
        throw new BadRequestException(
          `Đơn vị tổ chức với ID ${createUserDto.parent} không tồn tại hoặc không hoạt động`,
        );
      }
    }

    // 4️⃣ Kiểm tra các group hợp lệ
    const groupIds = createUserDto.GroupUser ?? []; // nếu undefined/null → []
    let validGroups: GroupUserEntity[] = [];

    if (groupIds.length > 0) {
      // Validate MongoDB ObjectId format (24 hex characters)
      // ObjectId format: 24 hexadecimal characters
      const objectIdPattern = /^[0-9a-f]{24}$/i;

      const validObjectIds = groupIds.filter((id: string) => {
        if (!id || typeof id !== 'string') return false;
        // Check if it's a valid MongoDB ObjectId format
        return id;
      });

      // if (validObjectIds.length === 0 && groupIds.length > 0) {
      //   throw new BadRequestException(
      //     `Tất cả các ID nhóm người dùng đều không hợp lệ (phải là MongoDB ObjectId 24 ký tự hex). Nhận được: ${groupIds.join(', ')}`,
      //   );
      // }

      if (validObjectIds.length > 0) {
        validGroups = await this.groupUserRepository.find({
          where: { id: In(validObjectIds), status: STATUS.ACTIVED },
        });

        const invalidGroups = validObjectIds.filter(
          (id) => !validGroups.some((g) => g.id === id),
        );

        if (invalidGroups.length > 0) {
          throw new BadRequestException(
            `Nhóm người dùng với ID ${invalidGroups.join(', ')} không tồn tại hoặc không hoạt động`,
          );
        }
      }

      // Nếu có IDs không hợp lệ, báo cảnh báo
      const invalidFormatIds = groupIds.filter((id: string) => {
        if (!id || typeof id !== 'string') return true;
        return !objectIdPattern.test(id);
      });

      if (invalidFormatIds.length > 0) {
        console.warn(
          `⚠️ Warning: Các ID nhóm không đúng định dạng MongoDB ObjectId đã bị bỏ qua: ${invalidFormatIds.join(', ')}`,
        );
      }
    }
    // THÊM Ở ĐÂY – KHÔNG SỬA PHẦN TRÊN
    let rolesByProcess: RolesByProcess[] = [];

    for (const group of validGroups) {
      if (group.roleType === 'dynamic' && group.roles_dynamic?.length) {
        const mapped = this.mapRolesDynamicToRolesByProcess(
          group.roles_dynamic,
          group.id,
        );

        rolesByProcess = this.mergeRolesByProcess(rolesByProcess, mapped);
      }
    }

    // 5️⃣ Hash password
    let hashedPassword: string | null = null;
    if (createUserDto.password) {
      hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    }

    // 6️⃣ Tạo user trên WSO2
    // === LẤY CONFIG TỪ DB ===
    const authConfig = await this.authConfigRepo.findOne({
      where: { isActive: true },
      order: { id: 'DESC' },
    });

    let wso2UserId: string | undefined;
    if (authConfig?.config?.authUrl && process.env.WSO2_ADMIN && process.env.WSO2_PASS && process.env.WSO2_ROLE_ID_2) {
      try {
        const agent = new https.Agent({ rejectUnauthorized: false });

        const wso2User = {
          userName: createUserDto.username,
          password: createUserDto.password || 'Default@123',
          emails: [{ primary: true, value: createUserDto.emailUser }],
          name: {
            givenName: createUserDto.name || createUserDto.username,
            familyName: '',
          },
          groups: [
            { display: 'Internal/login' },
            { display: 'Internal/everyone' },
          ],
        };

        const urlObj = new URL(authConfig.config.authUrl);
        const baseUrl = urlObj.origin; // https://lifesso.lifetex.vn:9445
        const scimBaseUrl = `${baseUrl}/t/carbon.super/scim2`;

        const scim2Url = `${scimBaseUrl}/Users`;
        const createRes = await axios.post(scim2Url, wso2User, {
          httpsAgent: agent,
          headers: {
            'Content-Type': 'application/scim+json',
            Authorization: `Basic ${Buffer.from(
              `${process.env.WSO2_ADMIN}:${process.env.WSO2_PASS}`,
            ).toString('base64')}`,
          },
        });

        wso2UserId = createRes.data.id;

        // Gán role trên WSO2
        const patchRoleBody = {
          Operations: [
            {
              op: 'add',
              value: {
                users: [{ display: createUserDto.username, value: wso2UserId }],
              },
            },
          ],
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        };
        const roleUrl = `${scimBaseUrl}/v2/Roles/${process.env.WSO2_ROLE_ID_2}`;
        await axios.patch(roleUrl, patchRoleBody, {
          httpsAgent: agent,
          headers: {
            'Content-Type': 'application/scim+json',
            Authorization: `Basic ${Buffer.from(
              `${process.env.WSO2_ADMIN}:${process.env.WSO2_PASS}`,
            ).toString('base64')}`,
          },
        });
      } catch (err) {
        const errorMsg =
          err.response?.data?.detail ||
          err.response?.data?.Errors?.[0]?.description ||
          err.response?.data ||
          err.message ||
          'Lỗi không xác định từ WSO2';
        console.error('❌ Lỗi khi tạo user/assign role trên WSO2:', errorMsg);
        throw new BadRequestException({
          success: false,
          message: errorMsg,
          error: errorMsg,
        });
      }
    }

    // 7️⃣ Lưu user vào DB
    const parentOrg = createUserDto.parent
      ? ({ id: createUserDto.parent } as OrganizationUnitEntity)
      : null;

    // Generate UUID for user id (required for SQL Server)
    const userId = uuidv4();
    const newUser = this.userRepository.create({
      id: userId, // Explicitly set the ID
      username: createUserDto.username,
      emailUser: createUserDto.emailUser,
      phoneNumberUser: createUserDto.phoneNumberUser,
      name: createUserDto.name,
      password: hashedPassword ?? null, // đảm bảo có kiểu string | null
      parent: parentOrg,
      wso2UserId,
      groupUsers: validGroups, // validGroups phải là GroupUserEntity[]
      rolesByProcess,
      profileImage: createUserDto.profileImage,
      addressUser: createUserDto.addressUser ?? null,
      personalSecretary: createUserDto.personalSecretary ?? null,
      status: createUserDto.status ?? STATUS.ACTIVED,
      codeND: createUserDto.codeND ?? null,
      identificationCard: createUserDto.identificationCard ?? null,
      birthday: createUserDto.birthday ?? null,
      contactTime: createUserDto.contactTime ?? null,
      position: createUserDto.position ?? null,
      gender: createUserDto.gender ?? null,
    });

    const savedUser = await this.userRepository.save(newUser);
    // 🔥 ADD USER ID VÀO FIXED GROUP
    const fixedGroups = validGroups.filter(
      (g) => g.roleType === 'fixed',
    );

    for (const group of fixedGroups) {
      const userIds = new Set(group.userId || []);
      userIds.add(savedUser.id);

      group.userId = Array.from(userIds);
      await this.groupUserRepository.save(group);
    }

    // --- SYNC TO KEYCLOAK ---
    try {
      await this.userSyncService.syncSingleUserToKeycloak(savedUser.id, createUserDto.password || '12345678');
    } catch (err) {
      console.error('Error syncing individual user to Keycloak on creation', err);
    }

    return savedUser;
  }
  /**
   * Đồng bộ dữ liệu từ collection 'organizationunits' (MongoDB)
   * sang bảng 'organization_units' (MySQL).
   */
  // async syncFromMongo(): Promise<{
  //   total: number;
  //   found: number;
  //   updated: number;
  //   inserted: number;
  //   failedIds: string[];
  // }> {
  //   // 1. Lấy tất cả bản ghi từ MongoDB
  //   let mongoUnits = await this.mongoRepo.usersCollection.find({}).toArray();
  //   if (!mongoUnits || mongoUnits.length === 0) {
  //     return { total: 0, found: 0, updated: 0, inserted: 0, failedIds: [] };
  //   }

  //   // 2. Lọc trùng theo name + code (chỉ giữ 1 bản ghi)
  //   const uniqueMap = new Map<string, any>();
  //   for (const item of mongoUnits) {
  //     const key = `${item.name}::${item.username}`;
  //     if (!uniqueMap.has(key)) {
  //       uniqueMap.set(key, item);
  //     } else {
  //       const existing = uniqueMap.get(key);
  //       const existingTime = existing.updatedAt
  //         ? new Date(existing.updatedAt).getTime()
  //         : 0;
  //       const currentTime = item.updatedAt
  //         ? new Date(item.updatedAt).getTime()
  //         : 0;
  //       if (currentTime > existingTime) uniqueMap.set(key, item);
  //     }
  //   }
  //   mongoUnits = Array.from(uniqueMap.values());
  //   const total = mongoUnits.length;

  //   const failedIds: string[] = [];
  //   let updated = 0;
  //   let inserted = 0;

  //   for (const mongoUnit of mongoUnits) {
  //     try {
  //       const existingEntity = await this.userRepository.findOneBy({
  //         id: mongoUnit._id.toString(),
  //       });
  //       const entityData: Partial<UserEntity> = {
  //         id: mongoUnit._id.toString(),
  //         password: mongoUnit.password || undefined,
  //         name: mongoUnit.name,
  //         avatar: mongoUnit.avatar || [],
  //         codeND: mongoUnit.codeND || undefined,
  //         username: mongoUnit.username,
  //         emailUser: mongoUnit.emailUser || undefined,
  //         phoneNumberUser: mongoUnit.phoneNumberUser || undefined,
  //         position: mongoUnit.position || undefined,
  //         leader: mongoUnit.leader || undefined,
  //         addressUser: mongoUnit.addressUser || undefined,
  //         description: mongoUnit.description || undefined,
  //         role: mongoUnit.role || undefined,
  //         rolesByProcess: mongoUnit.rolesByProcess || [],
  //         organizationName: mongoUnit.organizationName || undefined,
  //         organizationCode: mongoUnit.organizationCode || undefined,
  //         organizationType: mongoUnit.organizationType || undefined,
  //         orders: mongoUnit.order || undefined,
  //         birthday: mongoUnit.birthday
  //           ? new Date(mongoUnit.birthday)
  //           : undefined,
  //         gender: mongoUnit.gender || undefined,
  //         identificationCard: mongoUnit.identificationCard || undefined,
  //         contactTime: mongoUnit.contactTime
  //           ? new Date(mongoUnit.contactTime)
  //           : undefined,
  //         parent: mongoUnit.parent
  //           ? ({ id: mongoUnit.parent.toString() } as OrganizationUnitEntity)
  //           : undefined,
  //         status: mongoUnit.status ?? STATUS.ACTIVED,
  //         nameAuthorized: mongoUnit.nameAuthorized || '',
  //         roleGroupSourceAuthorized: mongoUnit.roleGroupSourceAuthorized || '',
  //         wso2UserId: mongoUnit.wso2UserId || undefined,
  //         keycloakUserId: mongoUnit.keycloakUserId || undefined,
  //       };

  //       if (existingEntity) {
  //         this.userRepository.merge(existingEntity, entityData);
  //         await this.userRepository.save(existingEntity);
  //         updated++;
  //       } else {
  //         const newEntity = this.userRepository.create(entityData);
  //         await this.userRepository.save(newEntity);
  //         inserted++;
  //       }
  //     } catch (e) {
  //       failedIds.push(mongoUnit._id.toString());
  //     }
  //   }

  //   return {
  //     total,
  //     found: updated + inserted,
  //     updated,
  //     inserted,
  //     failedIds,
  //   };
  // }

  // ========== Methods migrated from user.service.ts ==========

  async findById(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED, STATUS.LOCKED]),
      },
      relations: ['parent', 'groupUsers'],
    });

    if (!user) {
      console.error(`[UsersService] findById: User NOT FOUND for ID: ${userId}. Status filters: [ACTIVED, NOT_ACTIVED, LOCKED]`);
      throw new BadRequestException(
        `Người dùng với ID ${userId} không tồn tại hoặc không hoạt động`,
      );
    }

    // ❌ remove sensitive field
    delete (user as any).password;

    let personalSecretaryData: any = user.personalSecretary;
    if (user.personalSecretary && typeof user.personalSecretary === "string") {
      const secUser = await this.userRepository.findOne({
        where: { id: user.personalSecretary },
        select: ['id', 'name', 'username', 'codeND'],
      });
      if (secUser) {
        personalSecretaryData = {
          id: secUser.id,
          _id: secUser.id,
          name: secUser.name || secUser.username,
          username: secUser.username,
          codeND: secUser.codeND,
        };
      }
    }

    return {
      ...user,

      // ✅ map parent → string | null
      parent: user.parent ? user.parent.id : null,
      organizationCode: user.parent?.code || '',
      organizationName: user.parent?.name || '',

      // ✅ map groupUsers → string[]
      groupUsers: (user.groupUsers || []).map((g) => g.id),

      personalSecretary: personalSecretaryData,

      // giữ compatibility FE
      _id: user.id,
    };
  }


  // ✅ THÊM METHOD MỚI NÀY VÀO ĐÂY
  async findById2(
    userId: string,
  ): Promise<{ id: string; name: string; avatar: any[] } | null> {
    try {
      // Validate userId format (UUID for SQL Server)
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        console.warn(`Invalid userId format: ${userId}`);
        return null;
      }

      const user = await this.userRepository.findOne({
        where: {
          id: userId,
          status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED, STATUS.LOCKED]),
        },
        select: ['id', 'name', 'avatar'], // Chỉ lấy các field cần thiết
      });

      if (!user) {
        // console.warn(`User not found: ${userId}`);
        return null;
      }

      return {
        id: user.id,
        name: user.name || '',
        avatar: user.avatar || [],
      };
    } catch (error) {
      console.error(`Error finding user ${userId}:`, error.message);
      return null;
    }
  }


  private removeVietnameseTones(str: string): string {
    if (!str) return '';

    str = str.toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
    str = str.replace(/đ/g, 'd');

    return str;
  }

  // ========================================
  // PHẦN 3: SỬA METHOD getSimpleUsersSQL
  // ========================================
  async getSimpleUsersSQL(params: SimpleUserParams) {
    const { q, page, limit, excludeSelf } = params;
    const skip = (page - 1) * limit;

    const qb = this.userRepo
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.name',
        'u.username',
        'u.emailUser',
        'u.avatar',
        'u.organizationName',
      ])
      .where('u.status = :status', { status: 1 });

    // ✅ Tìm kiếm CẢ CÓ DẤU VÀ KHÔNG DẤU
    if (q && q.trim()) {
      const searchTerm = `%${q.trim()}%`;

      qb.andWhere(
        `(
          u.name COLLATE Vietnamese_100_CI_AI_SC LIKE :search 
          OR u.username COLLATE Vietnamese_100_CI_AI_SC LIKE :search 
          OR u.emailUser COLLATE Vietnamese_100_CI_AI_SC LIKE :search
        )`,
        { search: searchTerm }
      );
    }

    // Loại chính mình
    if (excludeSelf) {
      qb.andWhere('u.id != :excludeSelf', { excludeSelf });
    }

    const [data, count] = await qb
      .orderBy('u.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(count / limit);

    return {
      status: 1,
      message: 'Danh sách người đang làm việc',
      page,
      limit,
      count,
      totalPages,
      data,
    };
  }

  async findRoleInformationById(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['parent', 'parent.parent', 'groupUsers'],
      select: [
        'id',
        'username',
        'position',
        'leader',
        'role',
        'organizationName',
        'organizationCode',
        'organizationType',
        'status',
        'rolesByProcess',
      ],
    });

    if (!user) {
      throw new BadRequestException(
        `Người dùng với ID ${userId} không tồn tại hoặc không hoạt động`,
      );
    }

    let grandParentName: string | null = null;
    const targetGrandParentId = this.getTargetOrgUnitIdForGrandParent(user.parent);
    if (targetGrandParentId) {
      const grandParentUnit = await this.organizationUnitRepository.findOne({
        where: { id: targetGrandParentId },
        select: ['name'],
      });
      grandParentName = grandParentUnit?.name || null;
    }

    return {
      ...user,
      parentName: user.parent?.name || null,
      grandParentName,
    };
  }

  async findByLogin(loginCredential: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: [
        {
          username: loginCredential,
          status: Not(In([STATUS.DELETED, STATUS.LOCKED])),
        },
        {
          emailUser: loginCredential,
          status: Not(In([STATUS.DELETED, STATUS.LOCKED])),
        },
      ],
    });

    if (!user) {
      throw new BadRequestException(
        `Người dùng với login ${loginCredential} không tồn tại hoặc không hoạt động`,
      );
    }

    return user;
  }

  async Update(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED, STATUS.LOCKED]),
      },
      relations: ['groupUsers'],
    });

    if (!user) {
      throw new BadRequestException(
        `Người dùng với ID ${userId} không tồn tại hoặc không hoạt động`,
      );
    }

    // Check username uniqueness
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUsername = await this.userRepository.findOne({
        where: {
          username: updateUserDto.username,
          status: STATUS.ACTIVED,
          id: Not(userId),
        },
      });
      if (existingUsername) {
        throw new BadRequestException(
          `Username ${updateUserDto.username} đã tồn tại`,
        );
      }
    }

    // Check email uniqueness
    if (updateUserDto.emailUser && updateUserDto.emailUser !== user.emailUser) {
      const existingEmail = await this.userRepository.findOne({
        where: {
          emailUser: updateUserDto.emailUser,
          status: STATUS.ACTIVED,
          id: Not(userId),
        },
      });
      if (existingEmail) {
        throw new BadRequestException(
          `Email ${updateUserDto.emailUser} đã tồn tại`,
        );
      }
    }

    // Check parent
    if (updateUserDto.parent && updateUserDto.parent !== user.parent?.id) {
      const parentOrg = await this.organizationUnitRepository.findOne({
        where: { id: updateUserDto.parent, status: STATUS.ACTIVED },
      });
      if (!parentOrg) {
        throw new BadRequestException(
          `Đơn vị tổ chức với ID ${updateUserDto.parent} không tồn tại hoặc không hoạt động`,
        );
      }
    }

    // Update groupUsers relationships
    if (updateUserDto.GroupUser) {
      const payloadGroupIds = (updateUserDto.GroupUser || []).filter(
        (id) => typeof id === 'string' && id,
      );

      // 1️⃣ LẤY GROUP ID THẬT TỪ DB
      const dbGroups = await this.userRepository.manager
        .createQueryBuilder()
        .select('ugu.group_user_id', 'groupId')
        .from('user_group_users', 'ugu')
        .where('ugu.user_id = :userId', { userId: user.id })
        .getRawMany();

      const dbGroupIds = dbGroups.map((r) => r.groupId);

      // 2️⃣ SO SÁNH
      const removedGroupIds = dbGroupIds.filter(
        (id) => !payloadGroupIds.includes(id),
      );

      const addedGroupIds = payloadGroupIds.filter(
        (id) => !dbGroupIds.includes(id),
      );

      // 3️⃣ XOÁ ROLE DYNAMIC THEO GROUP BỊ XOÁ
      if (removedGroupIds.length > 0) {
        const removedGroups = await this.groupUserRepository.find({
          where: { id: In(removedGroupIds) },
        });

        for (const group of removedGroups) {
          if (group.roleType === 'dynamic') {
            user.rolesByProcess = this.removeRolesByGroup(
              user.rolesByProcess || [],
              group.id,
            );
          }
          // 🔹 FIXED → xoá userId khỏi group.userId[]
          if (group.roleType === 'fixed') {
            group.userId = (group.userId || []).filter(
              (uid) => uid !== user.id,
            );
            await this.groupUserRepository.save(group);
          }
        }
      }

      // 4️⃣ XOÁ QUAN HỆ TRONG user_group_users
      if (removedGroupIds.length > 0) {
        await this.userRepository.manager
          .createQueryBuilder()
          .delete()
          .from('user_group_users')
          .where('user_id = :userId', { userId: user.id })
          .andWhere('group_user_id IN (:...groupIds)', {
            groupIds: removedGroupIds,
          })
          .execute();
      }

      // 5️⃣ ADD GROUP + ROLE DYNAMIC
      if (addedGroupIds.length > 0) {
        const groupsToAdd = await this.groupUserRepository.find({
          where: { id: In(addedGroupIds), status: STATUS.ACTIVED },
        });

        for (const group of groupsToAdd) {
          if (group.roleType === 'dynamic' && group.roles_dynamic?.length) {
            const mapped = this.mapRolesDynamicToRolesByProcess(
              group.roles_dynamic,
              group.id,
            );

            user.rolesByProcess = this.mergeRolesByProcess(
              user.rolesByProcess || [],
              mapped,
            );
          }
          // 🔹 FIXED → add userId vào group.userId[]
          if (group.roleType === 'fixed') {
            const userIds = new Set(group.userId || []);
            userIds.add(user.id);
            group.userId = Array.from(userIds);

            await this.groupUserRepository.save(group);
          }
        }

        // insert relation
        await this.userRepository.manager
          .createQueryBuilder()
          .insert()
          .into('user_group_users')
          .values(
            addedGroupIds.map((groupId) => ({
              user_id: user.id,
              group_user_id: groupId,
            })),
          )
          .execute();
      }

      // 6️⃣ SYNC LẠI ENTITY (để trả response đúng)
      user.groupUsers = await this.groupUserRepository.find({
        where: { id: In(payloadGroupIds) },
      });

      // 7️⃣ SYNC DTO
      updateUserDto.rolesByProcess = user.rolesByProcess;
    }

    // Update WSO2 if needed
    if (user.wso2UserId) {
      const wso2Operations: any[] = [];
      if (updateUserDto.name && updateUserDto.name !== user.name) {
        wso2Operations.push({
          op: 'replace',
          value: { name: { givenName: updateUserDto.name } },
        });
      }
      if (
        updateUserDto.emailUser &&
        updateUserDto.emailUser !== user.emailUser
      ) {
        wso2Operations.push({
          op: 'replace',
          value: {
            emails: [{ primary: true, value: updateUserDto.emailUser }],
          },
        });
      }

      if (wso2Operations.length > 0) {
        await this.updateWSO2User(user.wso2UserId, wso2Operations);
      }
    }

    // Reset Google Sync if email changes
    if (updateUserDto.emailUser && updateUserDto.emailUser !== user.emailUser) {
      user.isGoogleCalendarVerified = false;
      user.googleAccessToken = null;
      user.googleRefreshToken = null;
      user.googleEmail = null;
    }

    // Update user fields
    Object.assign(user, {
      username: updateUserDto.username ?? user.username,
      name: updateUserDto.name ?? user.name,
      emailUser: updateUserDto.emailUser ?? user.emailUser,
      phoneNumberUser: updateUserDto.phoneNumberUser ?? user.phoneNumberUser,
      identificationCard:
        updateUserDto.identificationCard ?? user.identificationCard,
      parent: updateUserDto.parent
        ? ({ id: updateUserDto.parent } as OrganizationUnitEntity)
        : user.parent,
      status:
        updateUserDto.status !== undefined ? updateUserDto.status : user.status,
      codeND: updateUserDto.codeND ?? user.codeND,
      birthday: updateUserDto.birthday ?? user.birthday,
      gender: updateUserDto.gender ?? user.gender,
      position: updateUserDto.position ?? user.position,
      avatar: updateUserDto.avatar ?? user.avatar,
      addressUser: updateUserDto.addressUser ?? user.addressUser,
      personalSecretary: updateUserDto.personalSecretary !== undefined ? updateUserDto.personalSecretary : user.personalSecretary,
      contactTime: updateUserDto.contactTime ?? user.contactTime,
      rolesByProcess: updateUserDto.rolesByProcess ?? user.rolesByProcess,
      paraphSignImage: updateUserDto.paraphSignImage ?? user.paraphSignImage,
      contentSignImage: updateUserDto.contentSignImage ?? user.contentSignImage,
      contentSignTransparentImage: updateUserDto.contentSignTransparentImage ?? user.contentSignTransparentImage,
      paraphSignTransparentImage: updateUserDto.paraphSignTransparentImage ?? user.paraphSignTransparentImage,
      stampSignImage: updateUserDto.stampSignImage ?? user.stampSignImage,
      profileImage: updateUserDto.profileImage ?? user.profileImage,
    });

    const updatedUser = await this.userRepository.save(user);

    // --- SYNC TO KEYCLOAK ---
    try {
      await this.userSyncService.syncSingleUserToKeycloak(updatedUser.id);
    } catch (err) {
      console.error('Error syncing individual user to Keycloak on update', err);
    }

    delete (updatedUser as any).password;
    return updatedUser;
  }

  async updateWSO2User(wso2UserId: string, operations: any[]) {
    if (!wso2UserId || operations.length === 0) {
      return { success: true };
    }

    // === LẤY CONFIG TỪ DB ===
    const authConfig = await this.authConfigRepo.findOne({
      where: { isActive: true },
      order: { id: 'DESC' },
    });

    if (!authConfig?.config?.authUrl) {
      return { success: false, message: 'Không tìm thấy cấu hình SSO active' };
    }

    try {
      const agent = new https.Agent({ rejectUnauthorized: false });
      const urlObj = new URL(authConfig.config.authUrl);
      const baseUrl = urlObj.origin; // https://lifesso.lifetex.vn:9445
      const scim2Url = `${baseUrl}/t/carbon.super/scim2/Users/${wso2UserId}`;

      const patchBody = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: operations,
      };

      await axios.patch(scim2Url, patchBody, {
        httpsAgent: agent,
        headers: {
          'Content-Type': 'application/scim+json',
          Authorization: `Basic ${Buffer.from(
            `${process.env.WSO2_ADMIN}:${process.env.WSO2_PASS}`,
          ).toString('base64')}`,
        },
      });

      return { success: true };
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.Errors?.[0]?.description ||
        err.response?.data ||
        err.message ||
        'Lỗi không xác định từ WSO2';

      console.error(
        `❌ Lỗi khi cập nhật user ${wso2UserId} trên WSO2:`,
        errorMsg,
      );
      return {
        success: false,
        message: `Đồng bộ người dùng sang WSO2 thất bại: ${errorMsg}`,
      };
    }
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
    skipOldPassword = false,
  ): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED, STATUS.LOCKED]),
      },
      select: ['id', 'password', 'wso2UserId', 'keycloakUserId', 'username'],
    });

    if (!user) {
      throw new BadRequestException(
        `Người dùng với ID ${userId} không tồn tại hoặc không hoạt động`,
      );
    }

    if (!skipOldPassword) {
      if (!changePasswordDto.oldPassword) {
        throw new BadRequestException('Mật khẩu cũ là bắt buộc');
      }
      const isOldPasswordValid = await bcrypt.compare(
        changePasswordDto.oldPassword,
        user.password || '',
      );
      if (!isOldPasswordValid) {
        throw new BadRequestException('Mật khẩu cũ không đúng');
      }
    }

    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.password || '',
    );
    if (isSamePassword) {
      throw new BadRequestException(
        'Mật khẩu mới không được trùng với mật khẩu cũ',
      );
    }

    // Sync to WSO2
    if (user.wso2UserId) {
      await this.updateWSO2User(user.wso2UserId, [
        {
          op: 'replace',
          value: { password: changePasswordDto.newPassword },
        },
      ]);
    }

    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      10,
    );
    user.password = hashedNewPassword;
    await this.userRepository.save(user);

    // Sync to Keycloak (bất đồng bộ - không block luồng chính nếu lỗi)
    this.userSyncService.resetKeycloakPassword(userId, changePasswordDto.newPassword)
      .catch((err) => {
        console.error(`[KC PASS SYNC] Lỗi không mong muốn khi đồng bộ mật khẩu lên Keycloak cho userId=${userId}: ${err.message}`);
      });

    return { success: true };
  }

  async blockUser(userId: string): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({
      where: { id: userId, status: STATUS.ACTIVED },
    });

    if (!user) {
      throw new BadRequestException(
        `Người dùng với ID ${userId} không tồn tại hoặc không hoạt động`,
      );
    }

    user.status = STATUS.LOCKED;
    await this.userRepository.save(user);

    return { success: true };
  }

  async unBlockUser(userId: string): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({
      where: { id: userId, status: STATUS.LOCKED },
    });

    if (!user) {
      throw new BadRequestException(
        `Người dùng với ID ${userId} không tồn tại hoặc không hoạt động`,
      );
    }

    user.status = STATUS.ACTIVED;
    await this.userRepository.save(user);

    return { success: true };
  }

  async removeFromUnit(userId: string, unitId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED, STATUS.LOCKED]),
      },
      relations: ['parent'],
    });

    if (!user) {
      throw new BadRequestException(
        `Người dùng với ID ${userId} không tồn tại hoặc không hoạt động`,
      );
    }

    if (user.parent && user.parent.id === unitId) {
      user.parent = null;
      await this.userRepository.save(user);
    }
  }

  async delete(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId, status: STATUS.ACTIVED },
      relations: ['groupUsers'],
    });

    if (!user) {
      throw new BadRequestException(
        `Người dùng với ID ${userId} không tồn tại hoặc không hoạt động`,
      );
    }

    // Remove user from groups
    if (user.groupUsers && user.groupUsers.length > 0) {
      // Note: In TypeORM, we need to manually handle the many-to-many relationship
      // The join table will be updated when we save the user with empty groupUsers
      user.groupUsers = [];
      await this.userRepository.save(user);
    }

    // Set status to DELETED
    user.status = STATUS.DELETED;
    await this.userRepository.save(user);
  }

  async getDocumentUsers(
    userId: string,
    documentId: string,
    limit: number,
    page: number,
    name?: string,
  ) {
    return this.sqlRepo.getDocumentUsers({
      userId,
      documentId,
      limit,
      page,
      name,
    });
  }

  async getUsersForTask(
    userId: string,
    taskId: string,
    limit: number,
    page: number,
    name?: string,
  ) {
    return this.sqlRepo.getUsersForTask({
      userId,
      taskId,
      limit,
      page,
      name,
    });
  }

  // ========== Additional methods from user.service.ts ==========
  // Note: Some methods still use MongoDB for AuthorityDocument, RoleFeature, etc.
  // These will be migrated when those entities are converted to MSSQL
  private async buildUserQueryBuilder(queryParams: any) {
    const {
      sort = '-createdAt',
      ...filters
    } = queryParams;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.parent', 'parent')
      .leftJoinAndSelect('parent.parent', 'grandParent')
      .where('user.status IN (:...statuses)', {
        statuses: [STATUS.ACTIVED, STATUS.NOT_ACTIVED, STATUS.LOCKED],
      })
      // This builder feeds user pickers. Selecting the whole entity used to pull
      // several nvarchar(MAX) columns (sign images, avatars metadata, roles, ...)
      // plus every column from two organization levels for only a few display
      // fields. Keep the picker payload small, especially on paginated queries.
      .select([
        'user.id',
        'user.name',
        'user.fullName',
        'user.avatar',
        'user.profileImage',
        'user.codeND',
        'user.username',
        'user.emailUser',
        'user.phoneNumberUser',
        'user.position',
        'user.status',
        'user.organizationName',
        'user.createdAt',
        'user.updatedAt',
        'parent.id',
        'parent.name',
        'parent.type',
        'grandParent.id',
        'grandParent.name',
      ]);

    /** ===== FILTER THEO PHÒNG BAN ===== */
    if (filters.parent) {
      const orgUnitIds = [filters.parent];

      const childOrgs = await this.organizationUnitRepository
        .createQueryBuilder('org')
        .where('org.status = :status', { status: STATUS.ACTIVED })
        .andWhere(
          '(org.mpath LIKE :mpath OR org.mpath = :parentId)',
          {
            mpath: `${filters.parent}/%`,
            parentId: filters.parent,
          },
        )
        .andWhere('org.id != :parentId', { parentId: filters.parent })
        .getMany();

      childOrgs.forEach((org) => {
        if (!orgUnitIds.includes(org.id)) {
          orgUnitIds.push(org.id);
        }
      });

      queryBuilder.andWhere('"user"."parent" IN (:...orgUnitIds)', {
        orgUnitIds,
      });
    }

    /** ===== TEXT SEARCH (ACCENT-INSENSITIVE) ===== */
    const textFilters: string[] = [];
    const params: any = {};

    if (filters.name) {
      textFilters.push('user.name COLLATE Latin1_General_CI_AI LIKE :name COLLATE Latin1_General_CI_AI');
      params.name = `%${filters.name}%`;
    }
    if (filters.username) {
      textFilters.push('user.username COLLATE Latin1_General_CI_AI LIKE :username COLLATE Latin1_General_CI_AI');
      params.username = `%${filters.username}%`;
    }
    if (filters.codeND) {
      textFilters.push('user.codeND COLLATE Latin1_General_CI_AI LIKE :codeND COLLATE Latin1_General_CI_AI');
      params.codeND = `%${filters.codeND}%`;
    }
    if (filters.email) {
      textFilters.push('user.email_user COLLATE Latin1_General_CI_AI LIKE :email COLLATE Latin1_General_CI_AI');
      params.email = `%${filters.email}%`;
    }

    if (textFilters.length) {
      queryBuilder.andWhere(`(${textFilters.join(' OR ')})`, params);
    }

    /** ===== SORT ===== */
    const requestedSortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortField = ['createdAt', 'updatedAt', 'name', 'fullName', 'username'].includes(requestedSortField)
      ? requestedSortField
      : 'createdAt';
    const sortOrder = sort.startsWith('-') ? 'DESC' : 'ASC';
    queryBuilder.orderBy(`user.${sortField}`, sortOrder);

    return queryBuilder;
  }

  async findUsersByUserId(userId: string, queryParams: any) {
    const { page = 1, limit = 25 } = queryParams;
    const skip = (page - 1) * limit;

    // 1. Lấy order cao nhất của group mà user thuộc
    const groupOrder = await this.userRepo
      .createQueryBuilder('u')
      .leftJoin('u.groupUsers', 'g')
      .where('u.id = :userId', { userId })
      .select('MAX(g.order)', 'maxOrder')
      .getRawOne();

    const maxOrder = groupOrder?.maxOrder;

    if (!maxOrder) {
      return { total: 0, page: 1, limit: 25, totalPages: 0, data: [] };
    }

    // 2. Lấy user có order <= maxOrder
    const qb = this.userRepo
      .createQueryBuilder('user')
      .distinct(true)
      .leftJoin('user.groupUsers', 'g')
      .leftJoinAndSelect('user.parent', 'parent')
      .where('g.order <= :order', { order: maxOrder })
      .andWhere('user.status IN (:...statuses)', {
        statuses: [STATUS.ACTIVED, STATUS.NOT_ACTIVED],
      });

    const [data, total] = await qb
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      data,
    };
  }
  async findAll(queryParams: any): Promise<any> {
    // This method needs complex filtering - for now, return a simplified version
    // Full implementation would require converting buildMongoQuery to TypeORM QueryBuilder
    const {
      page = 1,
      limit = 25,
      sort = '-createdAt',
      ...filters
    } = queryParams;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.parent', 'parent')
      .where('user.status IN (:...statuses)', {
        statuses: [STATUS.ACTIVED, STATUS.NOT_ACTIVED, STATUS.LOCKED],
      });

    // Handle parent filter - get users from parent and all child departments
    if (filters.parent) {
      queryBuilder.andWhere(
        `user.parent IN (
          SELECT child.id
          FROM organization_units child
          WHERE child.status =:status AND child.mpath LIKE (
            SELECT root.mpath
            FROM organization_units root
            WHERE root.id = :parentId
          ) + '%'
        )`,
        {
          parentId: filters.parent,
          status: STATUS.ACTIVED,
        },
      );
    }

    // Apply filters - use OR logic for text search fields (name, username, codeND)
    // If multiple text filters are provided, match if ANY of them matches
    const textFilters: string[] = [];
    const textFilterParams: any = {};

    if (filters.name) {
      // Search in both name and username fields
      textFilters.push(
        `(user.name COLLATE Latin1_General_CI_AI LIKE :name OR user.username COLLATE Latin1_General_CI_AI LIKE :name)`
      );
      textFilterParams.name = `%${filters.name}%`;
    }
    if (filters.username) {
      textFilters.push('user.username COLLATE Latin1_General_CI_AI LIKE :username');
      textFilterParams.username = `%${filters.username}%`;
    }
    if (filters.codeND) {
      textFilters.push('user.codeND COLLATE Latin1_General_CI_AI LIKE :codeND');
      textFilterParams.codeND = `%${filters.codeND}%`;
    }

    // If any text filters are provided, use OR logic
    if (textFilters.length > 0) {
      queryBuilder.andWhere(`(${textFilters.join(' OR ')})`, textFilterParams);
    }

    // Apply sorting
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? 'DESC' : 'ASC';
    queryBuilder.orderBy(`user.${sortField}`, sortOrder);

    const pageNum = clampPage(page);
    const limitNum = clampLimit(limit);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    const grandParentNameMap = await this.getGrandParentNameMap(data);

    const formattedData = data.map((user) => {
      const canUblock = user.status === STATUS.LOCKED;
      const canBlock = user.status === STATUS.ACTIVED;
      const targetGrandParentId = this.getTargetOrgUnitIdForGrandParent(user.parent);
      return {
        _id: user.id,
        id: user.id,
        name: user.name,
        fullName: user.fullName,
        username: user.username,
        emailUser: user.emailUser,
        phoneNumberUser: user.phoneNumberUser,
        position: user.position,
        status: user.status,
        organizationName: user.organizationName,
        parent: user.parent?.id || null,
        parentName: user.parent?.name || null,
        grandParentName: targetGrandParentId ? (grandParentNameMap.get(targetGrandParentId) || null) : null,
        canUblock,
        canBlock,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    });

    return {
      total,
      data: formattedData,
    };
  }

  async findAllPrincipals(queryParams: any): Promise<any> {
    // This method needs complex filtering - for now, return a simplified version
    // Full implementation would require converting buildMongoQuery to TypeORM QueryBuilder
    const {
      page = 1,
      limit = 25,
      sort = '-createdAt',
      ...filters
    } = queryParams;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.parent', 'parent')
      .where('user.status IN (:...statuses)', {
        statuses: [STATUS.ACTIVED, STATUS.NOT_ACTIVED, STATUS.LOCKED],
      });

    // Handle parent filter - get users from parent and all child departments
    if (filters.parent) {
      queryBuilder.andWhere(
        `user.parent IN (
          SELECT child.id
          FROM organization_units child
          WHERE child.status = :status AND child.mpath LIKE (
            SELECT root.mpath
            FROM organization_units root
            WHERE root.id = :parentId
          ) + '%'
        )`,
        {
          parentId: filters.parent,
          status: STATUS.ACTIVED,
        },
      );
    }

    // Apply filters - use OR logic for text search fields (name, username, codeND)
    // If multiple text filters are provided, match if ANY of them matches
    const textFilters: string[] = [];
    const textFilterParams: any = {};

    if (filters.name) {
      // Search in both name and username fields
      textFilters.push(
        `(user.name COLLATE Latin1_General_CI_AI LIKE :name OR user.username COLLATE Latin1_General_CI_AI LIKE :name)`
      );
      textFilterParams.name = `%${filters.name}%`;
    }
    if (filters.username) {
      textFilters.push('user.username COLLATE Latin1_General_CI_AI LIKE :username');
      textFilterParams.username = `%${filters.username}%`;
    }
    if (filters.codeND) {
      textFilters.push('user.codeND COLLATE Latin1_General_CI_AI LIKE :codeND');
      textFilterParams.codeND = `%${filters.codeND}%`;
    }

    // If any text filters are provided, use OR logic
    if (textFilters.length > 0) {
      queryBuilder.andWhere(`(${textFilters.join(' OR ')})`, textFilterParams);
    }

    // Apply sorting
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? 'DESC' : 'ASC';
    queryBuilder.orderBy(`user.${sortField}`, sortOrder);

    const pageNum = clampPage(page);
    const limitNum = clampLimit(limit);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    // Load groupUsers separately to avoid uniqueidentifier conversion issues
    const userIds = data.map((u) => u.id);
    const groupUsersMap = new Map<string, any[]>();

    if (userIds.length > 0) {
      try {
        // Use raw query with proper SQL Server parameter syntax (@0, @1, etc.)
        const placeholders = userIds.map((_, idx) => `@${idx}`).join(', ');
        const query = `
          SELECT 
            ug.user_id AS user_id,
            gu.id,
            gu.name,
            gu.code,
            gu.type,
            gu.status,
            gu.description,
            gu.roleType,
            gu.roles,
            gu.createdAt,
            gu.updatedAt,
            gu.permissionsId
          FROM user_group_users ug
          INNER JOIN group_users gu ON 
            (TRY_CAST(ug.group_user_id AS UNIQUEIDENTIFIER) = gu.id 
             OR CAST(gu.id AS NVARCHAR(36)) = CAST(ug.group_user_id AS NVARCHAR(36)))
          WHERE ug.user_id IN (${placeholders})
        `;

        // Execute with parameters as array (TypeORM will map @0, @1, etc. to array indices)
        const groupUsersQuery = await this.userRepository.manager.query(
          query,
          userIds,
        );

        // Group by user_id
        for (const row of groupUsersQuery) {
          const userId = row.user_id;
          if (!groupUsersMap.has(userId)) {
            groupUsersMap.set(userId, []);
          }
          groupUsersMap.get(userId)!.push({
            id: row.id,
            name: row.name,
            code: row.code,
            type: row.type,
            status: row.status,
            description: row.description,
            roleType: row.roleType,
            roles:
              typeof row.roles === 'string'
                ? JSON.parse(row.roles || '[]')
                : row.roles,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            permissionsId: row.permissionsId,
          });
        }
      } catch (error) {
        // If loading groupUsers fails, just skip them
        console.warn('Failed to load groupUsers:', error.message);
      }
    }

    const grandParentNameMap = await this.getGrandParentNameMap(data);

    const formattedData = data.map((user) => {
      const canUblock = user.status === STATUS.LOCKED;
      const canBlock = user.status === STATUS.ACTIVED;
      const targetGrandParentId = this.getTargetOrgUnitIdForGrandParent(user.parent);
      return {
        _id: user.id,
        ...user,
        parent: user.parent?.id || null,
        parentName: user.parent?.name || null,
        grandParentName: targetGrandParentId ? (grandParentNameMap.get(targetGrandParentId) || null) : null,
        groupUsers: groupUsersMap.get(user.id) || [],
        canUblock,
        canBlock,
      };
    });

    let groupDataBody: any[] = [];
    let groupTotal = 0;
    try {
      const groupQueryParams = { ...queryParams };
      let filterObj: any = {};

      if (groupQueryParams.filter) {
        if (typeof groupQueryParams.filter === 'string') {
          try { filterObj = JSON.parse(groupQueryParams.filter); } catch (e) { }
        } else if (typeof groupQueryParams.filter === 'object') {
          filterObj = { ...groupQueryParams.filter };
        }
      }

      // Chuyển từ khoá tìm kiếm chung sang tìm tên nhóm
      if (filters.name) filterObj.name = filters.name;
      else if (filters.username) filterObj.name = filters.username;
      else if (filters.codeND) filterObj.code = filters.codeND;

      groupQueryParams.filter = filterObj;

      const groupDataResponse = await this.groupUserInDocumentService.findAll(groupQueryParams);
      if (groupDataResponse) {
        groupDataBody = groupDataResponse.items || [];
        groupTotal = groupDataResponse.total || Math.max(0, groupDataBody.length);
      }
    } catch (e) {
      console.warn('Failed to fetch group user data in findAllPrincipals', e.message);
    }

    return {
      total: total + groupTotal,
      data: [...formattedData, ...groupDataBody],
    };
  }

  async findAllUser(queryParams: any): Promise<any> {
    // Similar to findAll but with pagination
    const {
      page = 1,
      limit = 25,
      sort = '-createdAt',
      filter,
      processFn,
      userId,
      ...directFilters
    } = queryParams;

    let parentFilter: string | undefined;
    let includeDescendantsFilter: string | undefined;

    const leaderUserIds = await this.getUsersByGroupCode('BANLANHDAO');
    const isLeaderUser = leaderUserIds.includes(userId);
    if (!isLeaderUser) {
      try {
        const feature = await this.featureManagementRepo.findOne({
          where: {
            code: processFn,
            status: 1,
            statusFeature: StatusFeature.ACTIVE,
          },
        });

        const criteria = feature?.criteria ?? [];
        const hasMyDepartment = Array.isArray(criteria) && criteria.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => c?.name === 'myDepartment' && String(c?.value) === 'true'
        );

        if (hasMyDepartment && userId) {
          const { unitId } = await this.getUserUnitAndRoleCodes(userId);
          if (unitId) {
            parentFilter = unitId;
            includeDescendantsFilter = 'true';
          } else {
            //Nếu user không có phòng ban thì không lấy dữ liệu.
            parentFilter = '00000000-0000-0000-0000-000000000000';
          }
        }
      } catch (err) {
        console.error('feature load error:', err?.message);
      }
    }

    // Merge filters from 'filter' (JSON string or object) and direct fields
    let parsedFilter = {};
    if (filter) {
      if (typeof filter === 'string') {
        try {
          parsedFilter = JSON.parse(filter);
        } catch (e) {
          // Fallback if not valid JSON
          parsedFilter = {};
        }
      } else if (typeof filter === 'object') {
        parsedFilter = filter;
      }
    }

    const filters = {
      ...parsedFilter,
      ...directFilters,
      ...(parentFilter !== undefined ? { parent: parentFilter } : {}),
      ...(includeDescendantsFilter !== undefined ? { includeDescendants: includeDescendantsFilter } : {}),
    };

    const pageNum = clampPage(page);
    const limitNum = clampLimit(limit);
    const skip = (pageNum - 1) * limitNum;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.parent', 'parent')
      .leftJoinAndSelect('parent.parent', 'grandParent')
      // .leftJoinAndSelect('user.groupUsers', 'groupUsers')
      .where('user.status IN (:...statuses)', {
        statuses: [STATUS.ACTIVED, STATUS.NOT_ACTIVED, STATUS.LOCKED],
      })
      .select([
        'user.id',
        'user.name',
        'user.fullName',
        'user.username',
        'user.emailUser',
        'user.phoneNumberUser',
        'user.position',
        'user.status',
        'user.organizationName',
        'parent.id',
        'parent.name',
        'parent.mpath',
        'parent.type',
        'grandParent.id',
        'grandParent.name',
        'user.createdAt',
        'user.updatedAt',
      ]);

    // Apply filters - use OR logic for text search fields (name, username, codeND)
    // If multiple text filters are provided, match if ANY of them matches
    const textFilters: string[] = [];
    const textFilterParams: any = {};

    // Sử dụng Collation SQL_Latin1_General_CP1_CI_AI để tìm kiếm không phân biệt dấu và hoa thường
    const collation = 'COLLATE SQL_Latin1_General_CP1_CI_AI';

    if (filters.name) {
      textFilters.push(`user.name ${collation} LIKE :searchName ${collation}`);
      textFilterParams.searchName = `%${filters.name}%`;

      textFilters.push(`user.username ${collation} LIKE :searchUsername ${collation}`);
      textFilterParams.searchUsername = `%${filters.name}%`;
    }
    if (filters.username) {
      textFilters.push(`user.username ${collation} LIKE :searchUsername ${collation}`);
      textFilterParams.searchUsername = `%${filters.username}%`;
    }
    if (filters.codeND) {
      textFilters.push(`user.codeND ${collation} LIKE :searchCodeND ${collation}`);
      textFilterParams.searchCodeND = `%${filters.codeND}%`;
    }
    if (filters.excludeId || queryParams.excludeId) {
      const excludeIds = Array.isArray(filters.excludeId || queryParams.excludeId)
        ? filters.excludeId || queryParams.excludeId
        : typeof (filters.excludeId || queryParams.excludeId) === 'string'
          ? (filters.excludeId || queryParams.excludeId).split(',').map((id: string) => id.trim()).filter((id: string) => id)
          : [filters.excludeId || queryParams.excludeId];

      if (excludeIds.length > 0) {
        queryBuilder.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds });
      }
    }

    // If any text filters are provided, use OR logic
    if (textFilters.length > 0) {
      queryBuilder.andWhere(`(${textFilters.join(' OR ')})`, textFilterParams);
    }
    if (filters.email) {
      queryBuilder.orWhere(`user.email_user COLLATE SQL_Latin1_General_CP1_CI_AI LIKE :email COLLATE SQL_Latin1_General_CP1_CI_AI`, { email: `%${filters.email}%` });
    }

    // Additional exact match filters (AND logic)
    if (filters.status !== undefined && filters.status !== '') {
      queryBuilder.andWhere('user.status = :customStatus', { customStatus: Number(filters.status) });
    }
    if (filters.parent) {
      if (filters.includeDescendants === 'true' || filters.includeDescendants === true) {
        const parentUnit = await this.organizationUnitRepository.findOne({
          where: { id: filters.parent },
          select: ['mpath'],
        });
        const parentMpath = parentUnit?.mpath || '';
        if (parentMpath) {
          queryBuilder.andWhere(
            '(parent.id = :parentUnitId OR parent.mpath LIKE :mpathPattern)',
            {
              parentUnitId: filters.parent,
              mpathPattern: `${parentMpath}/%`,
            }
          );
        } else {
          queryBuilder.andWhere('user.parent = :parentUnitId', { parentUnitId: filters.parent });
        }
      } else {
        queryBuilder.andWhere('user.parent = :parentUnitId', { parentUnitId: filters.parent });
      }
    }
    if (filters.emailUser) {
      queryBuilder.andWhere('LOWER(user.emailUser) LIKE LOWER(:emailUser)', { emailUser: `%${filters.emailUser}%` });
    }
    if (filters.phoneNumberUser) {
      queryBuilder.andWhere('user.phoneNumberUser LIKE :phoneNumber', { phoneNumber: `%${filters.phoneNumberUser}%` });
    }
    if (filters.position) {
      const posVal = typeof filters.position === 'object' ? filters.position.value : filters.position;
      if (posVal) {
        queryBuilder.andWhere('LOWER(user.position) LIKE LOWER(:position)', { position: `%${posVal}%` });
      }
    }
    if (filters.gender) {
      const genVal = typeof filters.gender === 'object' ? filters.gender.value : filters.gender;
      if (genVal) {
        queryBuilder.andWhere('user.gender = :gender', { gender: genVal });
      }
    }
    if (filters.birthday) {
      if (typeof filters.birthday === 'object') {
        const { startDate, endDate } = filters.birthday;
        if (startDate) {
          queryBuilder.andWhere('user.birthday >= :birthdayStart', { birthdayStart: startDate });
        }
        if (endDate) {
          queryBuilder.andWhere('user.birthday <= :birthdayEnd', { birthdayEnd: endDate });
        }
      } else {
        queryBuilder.andWhere('user.birthday = :birthday', { birthday: filters.birthday });
      }
    }
    if (filters.role) {
      queryBuilder.andWhere('user.role = :role', { role: filters.role });
    }
    if (filters.organizationCode) {
      queryBuilder.andWhere('user.organizationCode = :orgCode', { orgCode: filters.organizationCode });
    }


    // Sort (dùng shared utility)
    const orderField = sort || 'createdAt';
    const allowedSortFields = [
      ...getDtoKeys(CreateUserDto),
      'createdAt', 'updatedAt'
    ];
    validateAndParseSortParam(orderField, allowedSortFields);
    // Apply sorting
    let sortObj: any = {};
    if (sort) {
      if (typeof sort === 'string') {
        try {
          if (sort.startsWith('{')) {
            sortObj = JSON.parse(sort);
          } else {
            const field = sort.startsWith('-') ? sort.substring(1) : sort;
            const order = sort.startsWith('-') ? 'DESC' : 'ASC';
            sortObj[field] = order;
          }
        } catch (e) {
          const field = sort.startsWith('-') ? sort.substring(1) : sort;
          const order = sort.startsWith('-') ? 'DESC' : 'ASC';
          sortObj[field] = order;
        }
      } else if (typeof sort === 'object') {
        sortObj = sort;
      }
    } else {
      sortObj['createdAt'] = 'DESC';
    }

    let isFirstSort = true;
    for (const [field, order] of Object.entries(sortObj)) {
      const dir = (order === '1' || order === 1 || String(order).toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
      if (isFirstSort) {
        queryBuilder.orderBy(`user.${field}`, dir as any);
        isFirstSort = false;
      } else {
        queryBuilder.addOrderBy(`user.${field}`, dir as any);
      }
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    // Load groupUsers separately to avoid uniqueidentifier conversion issues
    const userIds = data.map((u) => u.id);
    const groupUsersMap = new Map<string, any[]>();

    if (userIds.length > 0) {
      try {
        // Use raw query with proper SQL Server parameter syntax (@0, @1, etc.)
        const placeholders = userIds.map((_, idx) => `@${idx}`).join(', ');
        const query = `
          SELECT 
            ug.user_id AS user_id,
            gu.id,
            gu.name,
            gu.code,
            gu.type,
            gu.status,
            gu.description,
            gu.roleType,
            gu.roles,
            gu.createdAt,
            gu.updatedAt,
            gu.permissionsId
          FROM user_group_users ug
          INNER JOIN group_users gu ON 
            (TRY_CAST(ug.group_user_id AS UNIQUEIDENTIFIER) = gu.id 
             OR CAST(gu.id AS NVARCHAR(36)) = CAST(ug.group_user_id AS NVARCHAR(36)))
          WHERE ug.user_id IN (${placeholders})
        `;

        // Execute with parameters as array (TypeORM will map @0, @1, etc. to array indices)
        const groupUsersQuery = await this.userRepository.manager.query(
          query,
          userIds,
        );

        // Group by user_id
        for (const row of groupUsersQuery) {
          const userId = row.user_id;
          if (!groupUsersMap.has(userId)) {
            groupUsersMap.set(userId, []);
          }
          groupUsersMap.get(userId)!.push({
            id: row.id,
            name: row.name,
            code: row.code,
            type: row.type,
            status: row.status,
            description: row.description,
            roleType: row.roleType,
            roles:
              typeof row.roles === 'string'
                ? JSON.parse(row.roles || '[]')
                : row.roles,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            permissionsId: row.permissionsId,
          });
        }
      } catch (error) {
        // If loading groupUsers fails, just skip them
        console.warn('Failed to load groupUsers:', error.message);
      }
    }

    const grandParentNameMap = await this.getGrandParentNameMap(data);

    const formattedData = data.map((user) => {
      const canUblock = user.status === STATUS.LOCKED;
      const canBlock =
        user.status === STATUS.ACTIVED || user.status === STATUS.NOT_ACTIVED;
      const targetGrandParentId = this.getTargetOrgUnitIdForGrandParent(user.parent);

      // Strict whitelist mapping to prevent any sensitive data leakage
      return {
        id: user.id,
        name: user.name,
        fullName: user.fullName,
        username: user.username,
        emailUser: user.emailUser,
        phoneNumberUser: user.phoneNumberUser,
        position: user.position,
        // role: user.role,
        status: user.status,
        organizationName: user.organizationName,
        // organizationCode: user.organizationCode,
        parent: user.parent?.id || null,
        parentName: user.parent?.name || null,
        grandParentName: targetGrandParentId ? (grandParentNameMap.get(targetGrandParentId) || null) : null,
        canUblock,
        canBlock,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    });

    const countFeedback = String(queryParams.countProcessingFeedback) === 'true' || String(queryParams.countFeedback) === 'true';
    const finalData = countFeedback ? await this.mapDataFeedbackCounts(formattedData) : formattedData;

    return {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      data: finalData,
    };
  }

  /**
   * API Lọc danh sách người dùng phân quyền theo vai trò:
  async findAllUserByRoleScope(queryParams: any, userId?: string): Promise<any> {
    return this.findAllUserScoped({
      ...queryParams,
      userId: userId || queryParams?.userId,
    });
  }

  /**
   * API Lọc danh sách người dùng phân quyền theo vai trò:
   * - Lãnh đạo công ty: Hiển thị bản thân và toàn bộ nhân viên trong công ty.
   * - Lãnh đạo phòng: Hiển thị bản thân và toàn bộ nhân viên trong phòng/ban mình quản lý.
   * - Cán bộ/nhân viên: Chỉ hiển thị bản thân.
   * Phạm vi dữ liệu được kiểm soát chặt chẽ tại Backend.
   */
  async findAllUserScoped(queryParams: any): Promise<any> {
    const {
      page = 1,
      limit = 25,
      sort = '-createdAt',
      filter,
      userId: callerUserId,
      ...directFilters
    } = queryParams;

    if (!callerUserId) {
      return {
        total: 0,
        page: Number(page) || 1,
        limit: Number(limit) || 25,
        totalPages: 0,
        data: [],
      };
    }

    // ⚡ Tối ưu 1: Chạy song song Promise.all lấy Nhóm vai trò + Thông tin User caller (Tiết kiệm round-trip DB)
    const [groupCodes, callerUser] = await Promise.all([
      this.getUserGroupCodes(callerUserId),
      this.userRepository.findOne({
        where: { id: callerUserId },
        relations: ['parent'],
      }),
    ]);

    const lowerGroupCodes = (groupCodes || []).map((c) => String(c).toLowerCase().trim());

    const COMPANY_LEADER_CODES = [
      GROUP_CODES.TONG_GIAM_DOC.toLowerCase(), // 'tonggd'
      GROUP_CODES.PHO_GIAM_DOC.toLowerCase(),  // 'phogdtongcty'
      'banlanhdao',
      'lanhdao',
      'admin',
      'superadmin',
    ];

    const DEPT_LEADER_CODES = [
      GROUP_CODES.TRUONG_PHONG.toLowerCase(),     // 'truongphong'
      GROUP_CODES.PHO_TRUONG_PHONG.toLowerCase(), // 'photruongphong'
      GROUP_CODES.TRUONG_BAN.toLowerCase(),       // 'truongban'
      // 'vtphong',
    ];

    const isCompanyLeader = lowerGroupCodes.some((code) =>
      COMPANY_LEADER_CODES.includes(code),
    );

    const isDeptLeader = lowerGroupCodes.some((code) =>
      DEPT_LEADER_CODES.includes(code),
    );

    const callerUnitId = callerUser?.parent?.id || null;
    const callerUnitMpath = callerUser?.parent?.mpath || '';

    // Merge filters từ filter (JSON string hoặc object) và directFilters
    let parsedFilter = {};
    if (filter) {
      if (typeof filter === 'string') {
        try {
          parsedFilter = JSON.parse(filter);
        } catch {
          parsedFilter = {};
        }
      } else if (typeof filter === 'object') {
        parsedFilter = filter;
      }
    }

    const filters: any = {
      ...parsedFilter,
      ...directFilters,
    };

    const pageNum = clampPage(page);
    const limitNum = clampLimit(limit);
    const skip = (pageNum - 1) * limitNum;

    // ⚡ Tối ưu 2: Loại bỏ JOIN thừa grandParent ở query chính để giảm tải cho DB với 100,000+ dòng
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.parent', 'parent')
      .where('user.status IN (:...statuses)', {
        statuses: [STATUS.ACTIVED, STATUS.NOT_ACTIVED, STATUS.LOCKED],
      })
      .select([
        'user.id',
        'user.name',
        'user.fullName',
        'user.username',
        'user.emailUser',
        'user.phoneNumberUser',
        'user.position',
        'user.status',
        'user.organizationName',
        'parent.id',
        'parent.name',
        'parent.mpath',
        'parent.type',
        'user.createdAt',
        'user.updatedAt',
      ]);

    // ⚡ Tối ưu 3: Tận dụng callerUnitMpath đã load sẵn từ callerUser (không query lại DB)
    if (isCompanyLeader) {
      // Lãnh đạo công ty: Hiển thị bản thân và toàn bộ nhân viên trong công ty
      if (filters.parent) {
        if (filters.includeDescendants === 'true' || filters.includeDescendants === true) {
          const parentUnit = await this.organizationUnitRepository.findOne({
            where: { id: filters.parent },
            select: ['mpath'],
          });
          const parentMpath = parentUnit?.mpath || '';
          if (parentMpath) {
            queryBuilder.andWhere(
              '(parent.id = :parentUnitId OR parent.mpath LIKE :mpathPattern)',
              {
                parentUnitId: filters.parent,
                mpathPattern: `${parentMpath}/%`,
              },
            );
          } else {
            queryBuilder.andWhere('user.parent = :parentUnitId', { parentUnitId: filters.parent });
          }
        } else {
          queryBuilder.andWhere('user.parent = :parentUnitId', { parentUnitId: filters.parent });
        }
      }
    } else if (isDeptLeader && callerUnitId) {
      // Lãnh đạo phòng: Hiển thị bản thân và toàn bộ nhân viên trong phòng/ban mình quản lý
      if (callerUnitMpath) {
        queryBuilder.andWhere(
          '(parent.id = :deptUnitId OR parent.mpath LIKE :deptMpathPattern OR user.id = :callerUserId)',
          {
            deptUnitId: callerUnitId,
            deptMpathPattern: `${callerUnitMpath}/%`,
            callerUserId,
          },
        );
      } else {
        queryBuilder.andWhere(
          '(user.parent = :deptUnitId OR user.id = :callerUserId)',
          {
            deptUnitId: callerUnitId,
            callerUserId,
          },
        );
      }
    } else {
      // Cán bộ/nhân viên: Chỉ hiển thị bản thân
      queryBuilder.andWhere('user.id = :callerUserId', { callerUserId });
    }

    // ⚡ Tối ưu 4: Xử lý bộ lọc tìm kiếm và sắp xếp
    const collation = 'COLLATE SQL_Latin1_General_CP1_CI_AI';
    const textFilters: string[] = [];
    const textFilterParams: any = {};

    const searchKeyword = filters.name || filters.username || filters.search || filters.keyword;
    if (searchKeyword) {
      textFilters.push(`user.name ${collation} LIKE :searchName ${collation}`);
      textFilterParams.searchName = `%${searchKeyword}%`;

      textFilters.push(`user.username ${collation} LIKE :searchUsername ${collation}`);
      textFilterParams.searchUsername = `%${searchKeyword}%`;
    }

    if (filters.codeND) {
      textFilters.push(`user.codeND ${collation} LIKE :searchCodeND ${collation}`);
      textFilterParams.searchCodeND = `%${filters.codeND}%`;
    }

    if (textFilters.length > 0) {
      queryBuilder.andWhere(`(${textFilters.join(' OR ')})`, textFilterParams);
    }

    if (filters.email) {
      queryBuilder.andWhere(
        `user.email_user ${collation} LIKE :email ${collation}`,
        { email: `%${filters.email}%` },
      );
    }

    if (filters.status !== undefined && filters.status !== '') {
      queryBuilder.andWhere('user.status = :customStatus', {
        customStatus: Number(filters.status),
      });
    }

    if (filters.excludeId || queryParams.excludeId) {
      const excludeIds = Array.isArray(filters.excludeId || queryParams.excludeId)
        ? filters.excludeId || queryParams.excludeId
        : typeof (filters.excludeId || queryParams.excludeId) === 'string'
          ? (filters.excludeId || queryParams.excludeId)
            .split(',')
            .map((id: string) => id.trim())
            .filter(Boolean)
          : [filters.excludeId || queryParams.excludeId];

      if (excludeIds.length > 0) {
        queryBuilder.andWhere('user.id NOT IN (:...excludeIds)', { excludeIds });
      }
    }

    // Sắp xếp (Sorting - tương tự user/all)
    const orderField = sort || '-createdAt';
    let sortObj: any = {};
    if (typeof orderField === 'string') {
      if (orderField.startsWith('{')) {
        try { sortObj = JSON.parse(orderField); } catch { sortObj['createdAt'] = 'DESC'; }
      } else {
        const field = orderField.startsWith('-') ? orderField.substring(1) : orderField;
        const order = orderField.startsWith('-') ? 'DESC' : 'ASC';
        sortObj[field] = order;
      }
    } else if (typeof orderField === 'object') {
      sortObj = orderField;
    }

    let isFirstSort = true;
    for (const [field, order] of Object.entries(sortObj)) {
      const dir =
        order === '1' || order === 1 || String(order).toUpperCase() === 'ASC'
          ? 'ASC'
          : 'DESC';
      const safeField = ['createdAt', 'updatedAt', 'name', 'username', 'fullName'].includes(field)
        ? field
        : 'createdAt';
      if (isFirstSort) {
        queryBuilder.orderBy(`user.${safeField}`, dir as any);
        isFirstSort = false;
      } else {
        queryBuilder.addOrderBy(`user.${safeField}`, dir as any);
      }
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    // ⚡ Tối ưu 5: Chỉ map đơn vị cấp ông (grandParentName) cho 25 dòng kết quả phân trang
    const grandParentNameMap = await this.getGrandParentNameMap(data);

    const formattedData = data.map((user) => {
      const canUblock = user.status === STATUS.LOCKED;
      const canBlock =
        user.status === STATUS.ACTIVED || user.status === STATUS.NOT_ACTIVED;
      const targetGrandParentId = this.getTargetOrgUnitIdForGrandParent(user.parent);

      return {
        id: user.id,
        name: user.name,
        fullName: user.fullName,
        username: user.username,
        emailUser: user.emailUser,
        phoneNumberUser: user.phoneNumberUser,
        position: user.position,
        status: user.status,
        organizationName: user.organizationName,
        parent: user.parent?.id || null,
        parentName: user.parent?.name || null,
        grandParentName: targetGrandParentId
          ? grandParentNameMap.get(targetGrandParentId) || null
          : null,
        canUblock,
        canBlock,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    });

    return {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      data: formattedData,
    };
  }

  async findAllUserNoLimit(): Promise<any> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.name',
        'user.username',
        'user.status',
      ])
      // .leftJoinAndSelect('user.parent', 'parent')
      // .leftJoinAndSelect('parent.parent', 'grandParent')
      .where('user.status IN (:...statuses)', {
        statuses: [STATUS.ACTIVED, STATUS.NOT_ACTIVED, STATUS.LOCKED],
      });

    const data = await queryBuilder.getMany();
    return data;
  }

  async getUsersByGroupCode(code: string): Promise<string[]> {
    const group = await this.groupUserRepository.findOne({
      where: { code, status: 1 },
    });

    if (!group) return [];

    return group.userId ?? [];
  }

  async findAllLeader(queryParams: any): Promise<any> {
    const {
      page = 1,
      limit = 25,
      sort = '-createdAt',
      processFn,
      name,
    } = queryParams;

    const pageNum = clampPage(page);
    const limitNum = clampLimit(limit);
    const skip = (pageNum - 1) * limitNum;

    // ── lấy groupCode từ feature ─────────────────────────
    let groupCode = 'BANLANHDAO';

    try {
      const feature = await this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      });

      const criteria = feature?.criteria ?? [];
      const code = criteria.find((c) => c.name === 'code' && c.value)?.value;

      if (code) groupCode = code;
    } catch (err) {
      console.error('feature load error:', err?.message);
    }

    // ── lấy userIds của leader ─────────────────────────
    let leaderUserIds: string[] = [];

    try {
      leaderUserIds = await this.getUsersByGroupCode(groupCode);
    } catch (err) {
      console.error('getUsersByGroupCode error:', err?.message);
    }

    if (!leaderUserIds?.length) {
      return {
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
        data: [],
      };
    }

    // ── query users ─────────────────────────
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.name', 'user.username', 'user.fullName', 'user.createdAt'])
      .where('user.id IN (:...leaderUserIds)', { leaderUserIds })
      .andWhere('user.status IN (:...statuses)', {
        statuses: [STATUS.ACTIVED, STATUS.NOT_ACTIVED, STATUS.LOCKED],
      });

    if (name) {
      const collation = 'COLLATE SQL_Latin1_General_CP1_CI_AI';
      queryBuilder.andWhere(
        `(user.name ${collation} LIKE :name ${collation} OR user.username ${collation} LIKE :name ${collation})`,
        {
          name: `%${name}%`,
        },
      );
    }

    // ── sorting ─────────────────────────
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? 'DESC' : 'ASC';

    const safeSort = ['createdAt', 'name'];
    const finalSort = safeSort.includes(sortField) ? sortField : 'createdAt';

    queryBuilder.orderBy(`user.${finalSort}`, sortOrder as any);

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    const formatted = data.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      fullName: u.fullName,
    }));

    return {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      data: formatted,
    };
  }


  async findUsersByProcessRole(
    processKey: string = 'PHOIHOP_NHANDEBIET',
    roleCode: string,
    queryParams: {
      page?: number | string;
      limit?: number | string;
      name?: string;
    },
  ): Promise<any> {
    if (!roleCode) {
      throw new BadRequestException('roleCode is required');
    }
    if (!processKey) {
      throw new BadRequestException('processKey is required');
    }

    const pageNum = clampPage(queryParams.page ?? 1);
    const limitNum = clampLimit(queryParams.limit ?? 25);
    const skip = (pageNum - 1) * limitNum;
    const { name } = queryParams;

    // Query users with rolesByProcess containing the specified processKey and roleCode
    // Note: This requires JSON query in MSSQL using OPENJSON
    // Structure: [{"processKey": "...", "roles": [{"roleCode": "...", "name": "..."}]}]
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.status IN (:...statuses)', {
        statuses: [STATUS.ACTIVED, STATUS.NOT_ACTIVED, STATUS.LOCKED],
      })
      .andWhere(
        `
        EXISTS (
          SELECT 1 
          FROM OPENJSON(CASE WHEN ISJSON(user.roles_by_process) > 0 THEN user.roles_by_process ELSE '[]' END) AS rp
          CROSS APPLY OPENJSON(JSON_QUERY(rp.value, '$.roles')) AS r
          WHERE JSON_VALUE(rp.value, '$.processKey') = :processKey
            AND JSON_VALUE(r.value, '$.roleCode') = :roleCode
        )
      `,
        { processKey, roleCode },
      );

    if (name) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('user.name LIKE :name', { name: `%${name}%` })
            .orWhere('user.username LIKE :name', { name: `%${name}%` })
            .orWhere('user.fullName LIKE :name', { name: `%${name}%` });
        }),
      );
    }

    const [users, totalRecords] = await queryBuilder
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();
    const mappedUsers = users.map((user) => ({
      ...user,
      _id: user.id,
    }));
    return {
      data: mappedUsers,
      total: totalRecords,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalRecords / limitNum),
    };
  }

  async findUsersByRole(
    roleCode: string | string[],
    queryParams: {
      page?: number | string;
      limit?: number | string;
      processKey?: string;
      name?: string;
    },
  ): Promise<any> {
    if (!queryParams.processKey) {
      throw new BadRequestException('processKey is required');
    }

    const pageNum = clampPage(queryParams.page ?? 1);
    const limitNum = clampLimit(queryParams.limit ?? 25);
    const skip = (pageNum - 1) * limitNum;

    const roleCodes = Array.isArray(roleCode)
      ? roleCode
      : roleCode ? [roleCode] : [];

    // ================= LẤY USER IDs TỪ roles_process =================
    const manager = this.userRepository.manager;
    const safeProcessKey = queryParams.processKey.replace(/'/g, "''");
    let allUserIds: string[] = [];

    if (roleCodes.length > 0) {
      // Có filter roleCode
      const safeRoleCodes = roleCodes.map(rc => `'${rc.replace(/'/g, "''")}'`).join(',');

      // 1. User gán trực tiếp
      const directSql = `
        SELECT DISTINCT rpu.user_id AS userId
        FROM roles_process_users rpu
        INNER JOIN roles_process rp ON rp.id = rpu.role_id
        WHERE rp.process_key = '${safeProcessKey}' AND rp.is_active = 1 AND rp.role_code IN (${safeRoleCodes})
      `;

      // 2. User gán qua nhóm
      const groupSql = `
        SELECT DISTINCT ugu.user_id AS userId
        FROM roles_process_groups rpg
        INNER JOIN roles_process rp ON rp.id = rpg.role_id
        INNER JOIN user_group_users ugu ON ugu.group_user_id = rpg.group_id
        WHERE rp.process_key = '${safeProcessKey}' AND rp.is_active = 1 AND rp.role_code IN (${safeRoleCodes})
      `;

      const [directUsers, groupUsers] = await Promise.all([
        manager.query(directSql),
        manager.query(groupSql),
      ]);

      allUserIds = [...(directUsers || []), ...(groupUsers || [])].map((u: any) => u.userId);
    } else {
      // Không filter roleCode — lấy tất cả user thuộc processKey
      const allSql = `
        SELECT DISTINCT rpu.user_id AS userId
        FROM roles_process_users rpu
        INNER JOIN roles_process rp ON rp.id = rpu.role_id
        WHERE rp.process_key = '${safeProcessKey}' AND rp.is_active = 1
        UNION
        SELECT DISTINCT ugu.user_id AS userId
        FROM roles_process_groups rpg
        INNER JOIN roles_process rp ON rp.id = rpg.role_id
        INNER JOIN user_group_users ugu ON ugu.group_user_id = rpg.group_id
        WHERE rp.process_key = '${safeProcessKey}' AND rp.is_active = 1
      `;

      const result: any[] = await manager.query(allSql);
      allUserIds = (result || []).map((u: any) => u.userId);
    }

    if (allUserIds.length === 0) {
      return { data: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
    }

    console.log(`[USER DEBUG] findUsersByRole processKey=${queryParams.processKey}, roleCodes=${JSON.stringify(roleCodes)}, totalUsers=${allUserIds.length}`);

    // ================= BUILD QUERY =================
    // Dùng raw SQL IN (...) thay vì (:...userIds) để tránh lỗi 2100 parameters
    const userIdListSql = allUserIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',');

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.status IN (:...statuses)', {
        statuses: [STATUS.ACTIVED, STATUS.NOT_ACTIVED, STATUS.LOCKED],
      })
      .andWhere(`user.id IN (${userIdListSql})`);

    // Filter by name (có dấu và không dấu)
    if (queryParams.name) {
      const nameVi = `%${queryParams.name}%`;
      const nameEn = `%${this.removeVietnameseTones(queryParams.name)}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('user.name LIKE :nameVi', { nameVi })
            .orWhere('user.username LIKE :nameVi', { nameVi })
            .orWhere('user.name LIKE :nameEn', { nameEn })
            .orWhere('user.username LIKE :nameEn', { nameEn });
        }),
      );
    }

    const allUsers = await queryBuilder.getMany();
    const total = allUsers.length;
    const paginatedUsers = allUsers.slice(skip, skip + limitNum);

    const usersWithoutRolesByProcess = paginatedUsers.map(
      ({ rolesByProcess, ...user }) => user,
    );

    return {
      data: usersWithoutRolesByProcess,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async findReportSigners(queryParams: {
    page?: number;
    limit?: number;
    roleCode?: string;
    processKey?: string;
    name?: string;
  }, userInfo: any): Promise<any> {
    const bpmnVersion = queryParams.processKey ||
      (await getUserFlowConfig(this.sqlsvRepo, userInfo, 'OutGoingDocument'))?.flowConfig?.id;
    if (!bpmnVersion) {
      throw new BadRequestException('Khong tim thay luong van ban di');
    }

    const bpmnXML = await this.sqlRepo.getBpmnFile(bpmnVersion);
    const { indexes } = await this.runtime.getModelFromXml(bpmnXML);

    const reportSignNodes: any[] = [];
    for (const [, node] of indexes.nodes) {
      const props = getAllNodeExtensionProperties(node);
      const signRole = props.signerRequired || props.processRequired || props.signRole;
      // //console.log (signRole)
      // Lấy toàn bộ các values của SignRoles ngoại trừ PROPOSAL ('proposal')
      // Thêm các giá trị dự phòng
      if (signRole === SignRoles.DRAFT
        || signRole === 'reportSigner'
        || signRole === 'officialSigner1'
        || signRole === 'officialSigner2'
        || signRole === 'officialSigner3') {
        reportSignNodes.push(node);
      }
    }


    if (!reportSignNodes.length) {
      throw new BadRequestException('Flow chưa cấu hình node ký dự thảo');
    }

    const reportLanes = reportSignNodes
      .map((node) => {
        const lane =
          indexes.laneMap.get(node.id) ??
          (node.laneId ? indexes.laneMap.get(node.laneId) : undefined);
        return lane ? { nodeId: node.id, nodeName: node.name, lane } : null;
      })
      .filter(Boolean);

    if (!reportLanes.length) {
      throw new BadRequestException('Không tìm thấy lane cho node ký dự thảo');
    }

    const roleCodes = new Set<string>();
    for (const { lane } of reportLanes as any[]) {
      roleCodes.add(lane);
    }

    if (!roleCodes.size) {
      throw new BadRequestException('Lane ký dự thảo chưa cấu hình roleCode');
    }

    const finalQueryParams = {
      ...queryParams,
      processKey: bpmnVersion,
    };
    return this.findUsersByRole([...roleCodes], finalQueryParams);
  }

  async findDraftSigners(queryParams: {
    page?: number;
    limit?: number;
    roleCode?: string;
    processKey?: string;
  }, userInfo: any): Promise<any> {
    const bpmnVersion = (await getUserFlowConfig(this.sqlsvRepo, userInfo, 'OutGoingDocument'))?.flowConfig?.id;
    const bpmnXML = await this.sqlRepo.getBpmnFile(bpmnVersion);
    const { indexes } = await this.runtime.getModelFromXml(bpmnXML);

    // const draftSignNodes: any[] = [];
    // for (const [, node] of indexes.nodes) {
    //   const props = getAllNodeExtensionProperties(node);
    //   const signRole = props.signerRequired || props.processRequired;
    //   if (SignRoles["officerSigner1"]) {
    //     draftSignNodes.push(node);
    //   }
    // }

    const draftSignNodes: any[] = [];
    for (const [, node] of indexes.nodes) {
      const props = getAllNodeExtensionProperties(node);
      const signRole = props.signerRequired || props.processRequired || props.signRole;
      // Lấy toàn bộ các values của SignRoles ngoại trừ PROPOSAL ('proposal')
      const validDraftValues = Object.entries(SignRoles)
        .filter(([key]) => key !== 'PROPOSAL')
        .map(([, val]) => val);
      // Thêm các giá trị dự phòng
      if (validDraftValues.includes(signRole) || signRole === 'draft' || signRole === 'signContentDraft') {
        draftSignNodes.push(node);
      }
    }

    if (!draftSignNodes.length) {
      throw new BadRequestException('Flow chưa cấu hình node ký dự thảo');
    }

    const draftLanes = draftSignNodes
      .map((node) => {
        const lane =
          indexes.laneMap.get(node.id) ??
          (node.laneId ? indexes.laneMap.get(node.laneId) : undefined);
        return lane ? { nodeId: node.id, nodeName: node.name, lane } : null;
      })
      .filter(Boolean);

    if (!draftLanes.length) {
      throw new BadRequestException('Không tìm thấy lane cho node ký dự thảo');
    }

    const roleCodes = new Set<string>();
    for (const { lane } of draftLanes as any[]) {
      roleCodes.add(lane);
    }

    if (!roleCodes.size) {
      throw new BadRequestException('Lane ký dự thảo chưa cấu hình roleCode');
    }

    const finalQueryParams = {
      ...queryParams,
      processKey: bpmnVersion || 'VAN_BAN_DI',
    };
    return this.findUsersByRole([...roleCodes], finalQueryParams);
  }

  async findincomingRecipient(queryParams: {
    page?: number;
    limit?: number;
    roleCode?: string;
  }): Promise<any> {
    // Nếu có roleCode cụ thể từ query param thì filter, ngược lại trả về
    // tất cả user thuộc processKey VAN_BAN_DI (không filter theo nhóm)
    const role = queryParams.roleCode ? [queryParams.roleCode] : [];
    const finalQueryParams = {
      ...queryParams,
      processKey: 'VAN_BAN_DI',
    };
    return this.findUsersByRole(role, finalQueryParams);
  }

  async findassignedReceiver(queryParams: {
    page?: number;
    limit?: number;
    roleCode?: string;
    name?: string;
    processKey?: string;
  }): Promise<any> {
    const defaultRoles: string[] = [
      GROUP_CODES.TONG_GIAM_DOC,
      GROUP_CODES.PHO_GIAM_DOC,
      GROUP_CODES.PHO_TRUONG_PHONG,
      GROUP_CODES.TRUONG_PHONG,
      GROUP_CODES.CANBO,
    ];
    const roleCodes: string[] = defaultRoles;

    const pageNum = clampPage(queryParams.page ?? 1);
    const limitNum = clampLimit(queryParams.limit ?? 25);
    const skip = (pageNum - 1) * limitNum;

    const groups = await this.groupUserRepository.find({
      where: {
        code: In(roleCodes),
        status: STATUS.ACTIVED,
      },
      relations: {
        users: {
          parent: true,
        },
      },
      select: {
        id: true,
        code: true,
        users: {
          id: true,
          username: true,
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

    const normalizedKeyword = queryParams.name
      ? this.removeVietnameseTones(queryParams.name.trim().toLowerCase())
      : '';

    const uniqueUsers = new Map<string, any>();

    for (const group of groups) {
      for (const groupUser of group.users || []) {
        if (!groupUser?.id || uniqueUsers.has(groupUser.id)) {
          continue;
        }

        const normalizedName = this.removeVietnameseTones(
          `${groupUser.name || ''} ${groupUser.codeND || ''} ${groupUser.username || ''}`
            .trim()
            .toLowerCase(),
        );

        if (normalizedKeyword && !normalizedName.includes(normalizedKeyword)) {
          continue;
        }

        uniqueUsers.set(groupUser.id, {
          _id: groupUser.id,
          id: groupUser.id,
          username: groupUser.username,
          code: groupUser.codeND || groupUser.username,
          codeND: groupUser.codeND,
          name: groupUser.name,
          position: groupUser.position,
          role: groupUser.role,
          organizationUnit: groupUser.parent
            ? {
              organizationUnitId: groupUser.parent.id,
              name: groupUser.parent.name,
            }
            : null,
        });
      }
    }

    const users = Array.from(uniqueUsers.values()).sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base' }),
    );

    return {
      data: users.slice(skip, skip + limitNum),
      total: users.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(users.length / limitNum),
      roleCodes,
    };
  }

  async getAuthorizedPermissions(authorizedUserId: string) {
    const now = new Date();

    // 1. Tìm tài liệu ủy quyền (Đã chuyển từ MongoDB sang TypeORM)
    const authorityDoc = await this.authorityDocumentRepository.findOne({
      where: {
        authorized: authorizedUserId, // Giả định field name trong SQL là authorizedUserId
        status: STATUS.ACTIVED,
        stage: 1,
        startDate: LessThanOrEqual(now),
        endDate: MoreThanOrEqual(now),
      },
      relations: ['author'], // Thay cho .populate('author')
      order: { createdAt: 'DESC' },
    });

    if (!authorityDoc) {
      return {
        isAuthorized: false,
        author: null,
        permissions: [],
      };
    }

    const author = authorityDoc.author;
    const authorId = typeof author === 'object' ? (author as any).id : author;

    // 2. Lấy thông tin người ủy quyền (Author)
    const user = await this.userRepository.findOne({
      where: { id: authorId },
      relations: ['groupUsers'],
      select: ['id', 'username', 'emailUser', 'rolesByProcess'],
    });

    if (!user) throw new BadRequestException('User không tồn tại');

    // 3. Lấy thông tin người ĐƯỢC ủy quyền (Authorized User)
    const userauthored = await this.userRepository.findOne({
      where: { id: authorizedUserId },
      select: ['id', 'username', 'emailUser'],
    });

    if (!userauthored) {
      throw new NotFoundException('Không tìm thấy thông tin người được ủy quyền.');
    }

    const userGroupIds = user.groupUsers?.map((g) => g.id) || [];
    const rolesByProcess = Array.isArray(user.rolesByProcess) ? user.rolesByProcess : [];

    const permSet = new Set<string>();
    const roleCodeSet = new Set<string>();

    // 4. Xử lý Dynamic Permissions (Process Roles)
    if (rolesByProcess.length > 0) {
      const processKeys = [
        ...new Set(rolesByProcess.map((p) => p.processKey).filter(Boolean)),
      ];

      const roleFeatures = await this.roleFeatureRepository.find({
        where: { processKey: In(processKeys) },
        select: ['processKey', 'roles'],
      });

      for (const proc of rolesByProcess) {
        const rf = roleFeatures.find((r) => r.processKey === proc.processKey);
        if (!rf) continue;

        // TypeORM tự động parse JSON nếu định nghĩa type là 'json' hoặc 'simple-json'
        const roles = Array.isArray(rf.roles) ? rf.roles : [];
        for (const roleObject of proc.roles || []) {
          const roleCode = roleObject.roleCode;
          const role = roles.find((r: any) => r.roleCode === roleCode);

          roleCodeSet.add(roleCode);
          if (!role) continue;

          for (const perm of role.permissions || []) {
            permSet.add(perm);
          }
        }
      }
    }

    // 5. Lấy Static Permissions từ groupUsers (Đã chuyển sang TypeORM)
    const userGroups = await this.groupUserRepository.find({
      where: {
        userId: authorId, // TypeORM sử dụng ID trực tiếp hoặc object
        status: STATUS.ACTIVED,
      },
      relations: ['roles', 'roles.functionName'],
    });

    const roleIdsFromGroups = userGroups.flatMap((g) =>
      (g.roles as any[])?.map((r) => (typeof r === 'object' ? r.id : r)) || []
    );
    const staticPermissions: any[] = [];

    if (roleIdsFromGroups.length > 0) {
      const listRoles = await this.listRoleEntity.find({
        where: { id: In(roleIdsFromGroups), status: STATUS.ACTIVED },
      });

      const staticPermMap = new Map();
      for (const role of listRoles) {
        // Trong TypeORM, roles thường là một mảng quan hệ hoặc JSON field
        const permissionsArray = (role as any).roles;
        if (Array.isArray(permissionsArray)) {
          for (const permission of permissionsArray) {
            const func = permission.functionName;
            if (func && typeof func === 'object') {
              if (!staticPermMap.has(func.id)) {
                staticPermMap.set(func.id, {
                  id: func.id,
                  name: func.name,
                  permissions: permission.permissions || [],
                });
              }
            }
          }
        }
      }
      staticPermissions.push(...staticPermMap.values());
    }

    // 6. Xử lý Report Permissions
    const groups = await this.groupUserRepository.find({
      where: { id: In(userGroupIds), status: STATUS.ACTIVED },
      relations: ['organizationUnits', 'organizationUnits.parent'],
    });

    const allOrgUnitIds = groups.flatMap(
      (g) => g.organizationUnits?.map((o: any) => o.id) || [],
    );

    const orgUnitDetails = allOrgUnitIds.length
      ? await this.organizationUnitRepository.find({
        where: { id: In(allOrgUnitIds), status: STATUS.ACTIVED },
        relations: ['parent'],
      })
      : [];

    // Logic RoleGroup (Phần này bạn đã comment, tôi giữ nguyên cấu trúc TypeORM)
    const orgUnitDetailsWithRoleGroup = orgUnitDetails.map((unit) => {
      return { ...unit, roleGroup: null };
    });

    const reportPermission = orgUnitDetailsWithRoleGroup
      .flatMap((unit: any) => unit.roleGroup?.roles || [])
      .filter(
        (role: any) =>
          Array.isArray(role.methods) && role.methods.some((m: any) => m.allow),
      )
      .map((role: any) => role.codeModuleFunction);

    // 7. Lấy danh sách Feature được ủy quyền
    const authorizedFeatureList = await this.featureManagementRepo.find({
      where: {
        authorizedFunction: In(Array.from(permSet)),
        isAuthorized: true,
        status: STATUS.ACTIVED,
      },
      select: ['code'],
    });

    const filteredRoles = authorizedFeatureList.map((f) => f.code);

    return {
      authorized: {
        id: userauthored.id,
        authorized: userauthored.username,
        email: userauthored.emailUser,
      },
      author: {
        id: user.id,
        username: user.username,
        email: user.emailUser,
      },
      roles: filteredRoles,
      roleCodes: Array.from(roleCodeSet),
      staticPermissions,
      reportPermission,
    };
  }

  async getAuthorizedPermissionsV1(authorizedUserId: string) {
    return this.runtime.repo.getAuthorizedPermissionsV1(authorizedUserId);
  }

  async getAuthorIdIfAuthorized(userId: string) {
    return this.runtime.repo.getAuthorIdIfAuthorized(userId);
  }

  private removeRolesByGroup(
    rolesByProcess: RolesByProcess[],
    groupId: string,
  ): RolesByProcess[] {
    return rolesByProcess
      .map((rbp) => ({
        ...rbp,
        roles: rbp.roles.filter((r: any) => r.__groupId !== groupId),
      }))
      .filter((rbp) => rbp.roles.length > 0);
  }
  private mergeRolesByProcess(
    current: RolesByProcess[],
    incoming: RolesByProcess[],
  ): RolesByProcess[] {
    const resultMap = new Map<string, { name: string; roles: RoleItem[] }>();

    // 1️⃣ Seed từ current (giữ name cũ)
    for (const item of current) {
      resultMap.set(item.processKey, {
        name: item.name ?? item.processKey,
        roles: [...item.roles],
      });
    }

    // 2️⃣ Merge incoming
    for (const item of incoming) {
      const existed = resultMap.get(item.processKey);

      if (existed) {
        existed.roles.push(...item.roles);
      } else {
        resultMap.set(item.processKey, {
          name: item.name ?? item.processKey,
          roles: [...item.roles],
        });
      }
    }

    // 3️⃣ Build output
    return Array.from(resultMap.entries()).map(([processKey, value]) => ({
      processKey,
      name: value.name, // ✅ FIX TS2322
      roles: value.roles,
    }));
  }

  private mapRolesDynamicToRolesByProcess(
    rolesDynamic: {
      processKey: string;
      roleCode: string;
      name: string;
    }[],
    groupId: string,
  ): RolesByProcess[] {
    const map = new Map<string, RoleItem[]>();

    for (const r of rolesDynamic) {
      if (!map.has(r.processKey)) {
        map.set(r.processKey, []);
      }

      map.get(r.processKey)!.push({
        roleCode: r.roleCode,
        name: r.name,
        __groupId: groupId, // metadata trace group
      } as any);
    }

    return Array.from(map.entries()).map(([processKey, roles]) => ({
      processKey,
      name: processKey, // ✅ FIX LỖI TS2322
      roles,
    }));
  }

  async getUsersAssigners(userId: string, name?: string): Promise<any[]> {

    const user: any = await this.sqlsvRepo.getUserById(userId);

    if (!user) {
      console.error('[getUsersAssigners] USER NOT FOUND');
      throw new BadRequestException('Không tìm thấy người dùng');
    }

    if (!user?.parent?.id) {
      // Nếu không có phòng ban, fallback về chính mình
      return [{
        ...user,
        id: user.id || user._id,
        _id: user.id || user._id,
      }];
    }

    const unitId = String(user.parent.id);

    // Check group "vanthutc" using correct ManyToMany relation
    const userGroups = await this.groupUserRepository
      .createQueryBuilder('g')
      .innerJoin('g.users', 'u')
      .where('u.id = :userId', { userId })
      .getMany();

    const isVanThu = userGroups.some((g: any) => g.code === GROUP_CODES.VAN_THU);

    const assignersAny: any[] = [];

    // if (!isVanThu) {
    //   // Nếu không phải văn thư -> Chỉ trả về chính mình
    assignersAny.push({
      ...user,
      id: user.id || user._id,
      _id: user.id || user._id,
    });
    // } 
    // else {
    //   // Nếu là Văn thư: Lấy danh sách Trưởng/Phó phòng của đơn vị (parent.id)
    //   const assigners = await this.userRepository
    //     .createQueryBuilder('u')
    //     .leftJoinAndSelect('u.parent', 'parent')
    //     .innerJoin('u.groupUsers', 'g')
    //     .where('u.parent = :unitId', { unitId })
    //     .andWhere('g.code IN (:...codes)', { codes: [GROUP_CODES.TRUONG_PHONG, GROUP_CODES.PHO_TRUONG_PHONG] })
    //     .andWhere('u.status = :status', { status: 1 })
    //     .select(['u.id', 'u.name', 'u.emailUser', 'u.username', 'parent.id', 'parent.name'])
    //     .getMany();

    //   assigners.forEach(ua => assignersAny.push(ua));

    //   // Thêm chính văn thư vào danh sách nếu chưa có
    //   const exists = assignersAny.some((a: any) => String(a.id) === String(userId));
    //   if (!exists) {
    //     assignersAny.push({
    //       ...user,
    //       id: user.id || user._id,
    //       _id: user.id || user._id,
    //     });
    //   }
    // }


    // 3. THÊM LOGIC UỶ QUYỀN (DELEGATION): Áp dụng cho TẤT CẢ mọi người
    const activeDelegations = await this.delegationService.findActiveEntitiesByToUser(userId);

    for (const delegation of activeDelegations) {
      if (delegation.fromUser) {
        const fromUser = delegation.fromUser;
        const existsDelegated = assignersAny.some((a: any) => String(a.id) === String(fromUser.id));
        if (!existsDelegated) {
          assignersAny.push({
            ...fromUser,
            isDelegated: true,
            delegatedByNote: `Lưu ý: Bạn được uỷ quyền bởi ${fromUser.name}`,
          });
        }
      }
    }

    // Apply Name Filter
    const filteredAssigners = name ? filterUsersByName(assignersAny, name) : assignersAny;

    return filteredAssigners.map(u => ({
      ...this.mapToConciseUser(u),
      isNguoiGiao: true,
    }));
  }

  async getUsersDirectors(userId: string, name?: string): Promise<any[] | 'USE_VIEWER_QUERY'> {

    const user: any = await this.sqlsvRepo.getUserById(userId);
    if (!user) throw new BadRequestException('Không tìm thấy người dùng');
    if (!user?.parent?.id) throw new BadRequestException('Người dùng không có parent');

    const unitId = String(user.parent.id);

    // 1. Check User Role
    const userGroupsQuery = await this.groupUserRepository
      .createQueryBuilder('g')
      .innerJoin('g.users', 'u')
      .where('u.id = :userId', { userId })
      .getMany();

    const userGroupCodes = userGroupsQuery.map(g => g.code);
    const isTruongPhong = userGroupCodes.includes(GROUP_CODES.TRUONG_PHONG);
    const isPhoTruongPhong = userGroupCodes.includes(GROUP_CODES.PHO_TRUONG_PHONG);
    const isVanThu = userGroupCodes.includes(GROUP_CODES.VAN_THU);
    const isCanBo = userGroupCodes.includes(GROUP_CODES.CANBO);

    const isTongGiamDoc = userGroupCodes.includes(GROUP_CODES.TONG_GIAM_DOC);
    const isPhoGiamDoc = userGroupCodes.includes(GROUP_CODES.PHO_GIAM_DOC);
    const isThuKy = userGroupCodes.includes(GROUP_CODES.THU_KY);

    if (isTongGiamDoc || isPhoGiamDoc || isThuKy) {
      // Đánh dấu để dùng VIEWER logic
      return 'USE_VIEWER_QUERY';
    }

    // 2. Get all users in Unit with their groups to filter
    const usersInUnit = await this.userRepository
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.parent', 'parent')
      .leftJoinAndSelect('u.groupUsers', 'g')
      .where('parent.id = :unitId', { unitId })
      .andWhere('u.status = :status', { status: 1 })
      .select(['u.id', 'u.name', 'u.emailUser', 'u.username', 'parent.id', 'parent.name', 'g.code'])
      .getMany();

    const result = usersInUnit;

    let finalResult = result;

    if (isTruongPhong) {
      finalResult = result;
    } else if (isPhoTruongPhong) {
      finalResult = result.filter(u => !u.groupUsers?.some(g => g.code === GROUP_CODES.TRUONG_PHONG));
    } else if (isVanThu) {
      finalResult = result.filter(u => u.groupUsers?.some(g =>
        g.code === GROUP_CODES.CANBO
      ));
    } else if (isCanBo) {
      finalResult = result.filter(u => String(u.id) === String(userId));
    }

    if (name) {
      finalResult = filterUsersByName(finalResult, name);
    }

    return finalResult.map(u => this.mapToConciseUser(u));

    // Fallback Code (Old Logic) - COMMENTED OUT
    /*
     // //console.log ('[getUsersDirectors] Fallback to Flow Config');
    const flowConfig = await this.sqlsvRepo.getFlowByUnit(
      unitId,
      'TaskManyUnit',
    );
 
    if (!flowConfig) {
      throw new BadRequestException('Không tìm thấy luồng cho người dùng');
    }
 
    // await this.sqlRepo.getBpmnFile('QUY_TRINH_CV_PHONG_BAN');
    const candidates = await this.sqlRepo.getUsersByRoleInFlow(
      flowConfig.id,
      'NGUOI_CHU_TRI',
    );
    const directors = await this.sqlRepo.getUsersByIds(candidates);
    return directors;
    */
  }

  async getUsersDirectorsFormMeeting(userId: string, name?: string): Promise<any[] | 'USE_VIEWER_QUERY'> {

    const user: any = await this.sqlsvRepo.getUserById(userId);
    if (!user) throw new BadRequestException('Không tìm thấy người dùng');
    if (!user?.parent?.id) throw new BadRequestException('Người dùng không có parent');

    const unitId = String(user.parent.id);

    // 1. Check User Role
    const userGroupsQuery = await this.groupUserRepository
      .createQueryBuilder('g')
      .innerJoin('g.users', 'u')
      .where('u.id = :userId', { userId })
      .getMany();

    const userGroupCodes = userGroupsQuery.map(g => g.code);
    const isTruongPhong = userGroupCodes.includes(GROUP_CODES.TRUONG_PHONG);
    const isPhoTruongPhong = userGroupCodes.includes(GROUP_CODES.PHO_TRUONG_PHONG);
    const isVanThu = userGroupCodes.includes(GROUP_CODES.VAN_THU);
    const isCanBo = userGroupCodes.includes(GROUP_CODES.CANBO);

    const usersInUnit = await this.userRepository
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.parent', 'parent')
      .leftJoinAndSelect('u.groupUsers', 'g')
      .where('parent.id = :unitId', { unitId })
      .andWhere('u.status = :status', { status: 1 })
      .select([
        'u.id',
        'u.name',
        'u.avatar',
        'u.codeND',
        'u.username',
        'u.emailUser',
        'u.phoneNumberUser',
        'u.position',
        'parent.id',
        'parent.name',
        'g.code',
      ])
      .getMany();

    let result = usersInUnit;

    if (isTruongPhong) {
      result = usersInUnit;
    } else if (isPhoTruongPhong) {
      result = usersInUnit.filter(
        u => !u.groupUsers?.some(g => g.code === GROUP_CODES.TRUONG_PHONG),
      );
    } else if (isVanThu || isCanBo) {
      result = usersInUnit.filter(u =>
        u.groupUsers?.some(g => g.code === GROUP_CODES.CANBO),
      );
    }

    if (name) {
      result = filterUsersByName(result, name);
    }

    return result.map(u => this.mapToConciseUser(u));
  }


  async getUsersSupportersV1(userId: string, directorIds?: string, name?: string): Promise<any[] | 'USE_VIEWER_QUERY'> {

    const user: any = await this.sqlsvRepo.getUserById(userId);

    if (!user) {
      console.error('[getUsersSupporters] USER NOT FOUND');
      throw new BadRequestException('Không tìm thấy người dùng');
    }

    if (!user?.parent?.id) {
      throw new BadRequestException('Người dùng không có parent');
    }

    const unitId = String(user.parent.id);

    // 1. Check User Role
    const userGroupsQuery = await this.groupUserRepository
      .createQueryBuilder('g')
      .innerJoin('g.users', 'u')
      .where('u.id = :userId', { userId })
      .getMany();

    const userGroupCodes = userGroupsQuery.map(g => g.code);
    const isTruongPhong = userGroupCodes.includes(GROUP_CODES.TRUONG_PHONG);
    const isPhoTruongPhong = userGroupCodes.includes(GROUP_CODES.PHO_TRUONG_PHONG);
    const isVanThu = userGroupCodes.includes(GROUP_CODES.VAN_THU);
    const isCanBo = userGroupCodes.includes(GROUP_CODES.CANBO);

    const isTongGiamDoc = userGroupCodes.includes(GROUP_CODES.TONG_GIAM_DOC);
    const isPhoGiamDoc = userGroupCodes.includes(GROUP_CODES.PHO_GIAM_DOC);
    const isThuKy = userGroupCodes.includes(GROUP_CODES.THU_KY);

    // 2. Parse excluded IDs
    const excludeIds = directorIds ? directorIds.split(',').map(id => id.trim()) : [];

    let result: any[] = [];

    if (isTongGiamDoc || isPhoGiamDoc || isThuKy) {
      // Lấy tất cả user đang active trong hệ thống
      // Logic: Đối với Lãnh đạo tổng công ty, thư ký: hiển thị toàn bộ cây phòng ban và nhân viên
      // Frontend sẽ group theo parent để hiển thị dạng cây (Department -> Users)
      return 'USE_VIEWER_QUERY';
    } else {
      // 3. Get all users in Unit with their groups
      const usersInUnit = await this.userRepository
        .createQueryBuilder('u')
        .leftJoinAndSelect('u.parent', 'parent')
        .leftJoinAndSelect('u.groupUsers', 'g')
        .where('parent.id = :unitId', { unitId })
        .andWhere('u.status = :status', { status: 1 })
        .select(['u.id', 'u.name', 'u.emailUser', 'u.username', 'parent.id', 'parent.name', 'g.code'])
        .getMany();

      result = usersInUnit;

      if (isTruongPhong) {
        // Tất cả cán bộ + văn thư + các phó trưởng phòng
        result = usersInUnit;
      } else if (isPhoTruongPhong) {
        // Chọn được văn thư + tất cả cán bộ
        result = usersInUnit.filter(u =>
          u.groupUsers?.some(g =>
            g.code === GROUP_CODES.VAN_THU ||
            g.code === GROUP_CODES.CANBO
          )
        );
      } else if (isVanThu) {
        // Chọn được tất cả cán bộ
        result = usersInUnit.filter(u =>
          u.groupUsers?.some(g => g.code === GROUP_CODES.CANBO)
        );
      } else if (isCanBo) {
        // Ẩn phần chọn người người phối hợp
        return [];
      }
    }

    // 4. Exclude directors
    if (excludeIds.length > 0) {
      result = result.filter(u => !excludeIds.includes(String(u.id)));
    }

    if (name) {
      result = filterUsersByName(result, name);
    }

    return result.map(u => this.mapToConciseUser(u));
  }
  async getUsersSupporters(userId: string, directorIds?: string, name?: string): Promise<any[] | 'USE_VIEWER_QUERY'> {

    const user: any = await this.sqlsvRepo.getUserById(userId);

    if (!user) {
      console.error('[getUsersSupporters] USER NOT FOUND');
      throw new BadRequestException('Không tìm thấy người dùng');
    }

    if (!user?.parent?.id) {
      throw new BadRequestException('Người dùng không có parent');
    }

    const unitId = String(user.parent.id);

    // 1. Check User Role
    const userGroupsQuery = await this.groupUserRepository
      .createQueryBuilder('g')
      .innerJoin('g.users', 'u')
      .where('u.id = :userId', { userId })
      .getMany();

    const userGroupCodes = userGroupsQuery.map(g => g.code);
    const isTruongPhong = userGroupCodes.includes(GROUP_CODES.TRUONG_PHONG);
    const isPhoTruongPhong = userGroupCodes.includes(GROUP_CODES.PHO_TRUONG_PHONG);
    const isVanThu = userGroupCodes.includes(GROUP_CODES.VAN_THU);
    const isCanBo = userGroupCodes.includes(GROUP_CODES.CANBO);

    const isTongGiamDoc = userGroupCodes.includes(GROUP_CODES.TONG_GIAM_DOC);
    const isPhoGiamDoc = userGroupCodes.includes(GROUP_CODES.PHO_GIAM_DOC);
    const isThuKy = userGroupCodes.includes(GROUP_CODES.THU_KY);

    // 2. Parse excluded IDs
    const excludeIds = directorIds ? directorIds.split(',').map(id => id.trim()) : [];

    const result: any[] = [];

    // if (isTongGiamDoc || isPhoGiamDoc || isThuKy) {
    // Lấy tất cả user đang active trong hệ thống
    // Logic: Đối với Lãnh đạo tổng công ty, thư ký: hiển thị toàn bộ cây phòng ban và nhân viên
    // Frontend sẽ group theo parent để hiển thị dạng cây (Department -> Users)
    return 'USE_VIEWER_QUERY';
    // } else {
    //   // 3. Get all users in Unit with their groups
    //   const usersInUnit = await this.userRepository
    //     .createQueryBuilder('u')
    //     .leftJoinAndSelect('u.parent', 'parent')
    //     .leftJoinAndSelect('u.groupUsers', 'g')
    //     .where('parent.id = :unitId', { unitId })
    //     .andWhere('u.status = :status', { status: 1 })
    //     .select(['u.id', 'u.name', 'u.emailUser', 'u.username', 'parent.id', 'parent.name', 'g.code'])
    //     .getMany();

    //   result = usersInUnit;

    //   if (isTruongPhong) {
    //     // Tất cả cán bộ + văn thư + các phó trưởng phòng
    //     result = usersInUnit;
    //   } else if (isPhoTruongPhong) {
    //     // Chọn được văn thư + tất cả cán bộ
    //     result = usersInUnit.filter(u =>
    //       u.groupUsers?.some(g =>
    //         g.code === GROUP_CODES.VAN_THU ||
    //         g.code === GROUP_CODES.CANBO
    //       )
    //     );
    //   } else if (isVanThu) {
    //     // Chọn được tất cả cán bộ
    //     result = usersInUnit.filter(u =>
    //       u.groupUsers?.some(g => g.code === GROUP_CODES.CANBO)
    //     );
    //   } else if (isCanBo) {
    //     // Ẩn phần chọn người người phối hợp
    //     return [];
    //   }
    // }

    // // 4. Exclude directors
    // if (excludeIds.length > 0) {
    //   result = result.filter(u => !excludeIds.includes(String(u.id)));
    // }

    // if (name) {
    //   result = filterUsersByName(result, name);
    // }

    // return result.map(u => this.mapToConciseUser(u));
  }

  async getUsersDirectorsFormDoc(userId: string): Promise<any[]> {

    const user: any = await this.sqlsvRepo.getUserById(userId);

    if (!user) {
      console.error('[getUsersAssigners] USER NOT FOUND');
      throw new BadRequestException('Không tìm thấy người dùng');
    }

    //  // //console.log ('[getUsersAssigners] user.parent:', user.parent);

    if (!user?.parent?.id) {
      console.error(
        '[getUsersAssigners] USER HAS NO PARENT',
        {
          userId: user.id,
          parent: user.parent,
        },
      );
      throw new BadRequestException('Người dùng không có parent');
    }

    const unitId = String(user.parent.id);

    const flowConfig = await this.sqlsvRepo.getFlowByUnit(
      unitId,
      'TaskDocument',
    );

    //  // //console.log ('[getUsersAssigners] flowConfig:', flowConfig);

    if (!flowConfig) {
      console.error(
        '[getUsersAssigners] FLOW NOT FOUND FOR UNIT',
        { unitId },
      );
      throw new BadRequestException('Không tìm thấy luồng cho người dùng');
    }

    await this.sqlRepo.getBpmnFile('QUY_TRINH_CV_VAN_BAN');
    //  // //console.log ('[getUsersAssigners] BPMN loaded');

    const candidates = await this.sqlRepo.getUsersByRoleInFlow(
      flowConfig.id,
      'NGUOI_CHU_TRI',
    );
    const directors = await this.sqlRepo.getUsersByIds(candidates);

    //  // //console.log (
    //   '[getUsersAssigners] candidates count:',
    //   candidates?.length,
    // );

    return directors;
  }


  async getUsersSupportersFormDoc(userId: string): Promise<any[]> {

    const user: any = await this.sqlsvRepo.getUserById(userId);

    if (!user) {
      console.error('[getUsersAssigners] USER NOT FOUND');
      throw new BadRequestException('Không tìm thấy người dùng');
    }

    //  // //console.log ('[getUsersAssigners] user.parent:', user.parent);

    if (!user?.parent?.id) {
      console.error(
        '[getUsersAssigners] USER HAS NO PARENT',
        {
          userId: user.id,
          parent: user.parent,
        },
      );
      throw new BadRequestException('Người dùng không có parent');
    }

    const unitId = String(user.parent.id);

    const flowConfig = await this.sqlsvRepo.getFlowByUnit(
      unitId,
      'TaskDocument',
    );


    if (!flowConfig) {
      console.error(
        '[getUsersAssigners] FLOW NOT FOUND FOR UNIT',
        { unitId },
      );
      throw new BadRequestException('Không tìm thấy luồng cho người dùng');
    }

    await this.sqlRepo.getBpmnFile('QUY_TRINH_CV_PHONG_BAN');
    //  // //console.log ('[getUsersAssigners] BPMN loaded');

    const candidates = await this.sqlRepo.getUsersByRoleInFlow(
      flowConfig.id,
      'NGUOI_PHOI_HOP',
    );
    const suporters = await this.sqlRepo.getUsersByIds(candidates);

    //  // //console.log (
    //   '[getUsersAssigners] candidates count:',
    //   candidates?.length,
    // );

    return suporters;
  }
  async getUserSuggestion(
    userId: string,
    payload: any,
    limit = 100,
    page = 1,
    name?: string,
  ) {
    const _t0 = Date.now();
    const { documentId, documentType, workitem, actionCode, roles, processKey } = payload;
    // //console.log (`[getUserSuggestion] START userId=${userId} processKey=${processKey} documentType=${documentType} documentId=${documentId}`);

    let doc;
    if (!processKey && documentType?.toLowerCase() === 'incomingdocument') {
      doc = await this.incomingService.getDocumentByFields({ documentId, select: ['bpmnVersion'] });
    } else if (!processKey && documentType?.toLowerCase() === 'outgoingdocument') {
      doc = await this.outgoingService.getOutgoingDocumentByFields({ documentId, select: ['bpmnVersion'] });
    }
    // //console.log (`[getUserSuggestion] Step1 getDoc | ${Date.now() - _t0}ms`);

    if (!processKey && !doc) throw new BadRequestException('Không tìm thấy văn bản');
    const processKeyFinal = processKey || doc.bpmnVersion;
    if (!processKeyFinal) {
      throw new BadRequestException('Văn bản không có luồng xử lý');
    }
    const _t1 = Date.now();
    const bpmnXML = await this.runtime.repo.getBpmnFile(processKeyFinal);
    const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);
    // //console.log (`[getUserSuggestion] Step2 getBpmnFile+parseXml | ${Date.now() - _t1}ms`);

    const outs = indexes.outgoingBySource.get(workitem)
    const flow = outs.find(
      (f: any) =>
        (f.name && f.name.toUpperCase() === actionCode) || f.id === actionCode,
    );
    const { node: nextNode } = this.bpmnEngineService.nextInteractiveFromFlow(flow, indexes);
    const outsNext = indexes.outgoingBySource.get(nextNode?.id) || [];

    // Get roles from next nodes
    const rolePromises = outsNext.map(async (f) => {
      let targetNode;
      if (f.targetRef.$type === "bpmn:InclusiveGateway" || f.targetRef.$type === "bpmn:ExclusiveGateway") {
        const gatewayFlows = indexes.outgoingBySource.get(f.targetRef.id) || [];
        const gatewayFlow = gatewayFlows[0];
        const { node: gatewayNode } = this.bpmnEngineService.nextInteractiveFromFlow(gatewayFlow, indexes);
        targetNode = gatewayNode
      } else {
        const { node: nextNodeFromFlow } = this.bpmnEngineService.nextInteractiveFromFlow(f, indexes);
        targetNode = nextNodeFromFlow;
      }

      if (targetNode) {
        const lane = indexes.laneMap.get(targetNode.id) ??
          (targetNode.laneId ? indexes.laneMap.get(targetNode.laneId) : undefined);
        return lane;
      }
      return null;
    });

    const rolesArray = await Promise.all(rolePromises);
    const rolesInNextNode = rolesArray.filter(Boolean).join(',');

    // 3. Lấy users cho next node roles
    const rolesInNextNodeList =
      rolesInNextNode?.split(',').filter(Boolean) || [];
    const roleList =
      roles?.split(',').filter(Boolean) || [];

    // //console.log (`[getUserSuggestion] Step3 BPMN parse done rolesInNextNodeList=${JSON.stringify(rolesInNextNodeList)} roleList=${JSON.stringify(roleList)}`);

    const _t2 = Date.now();
    const [
      { usersWithType: usersWithType2, total: total2 },
      { usersWithType, total: total1 },
    ] = await Promise.all([
      this.sqlsvRepo.getUsersInFlow(
        processKeyFinal,
        rolesInNextNodeList,
        limit * page + 100,
        1,
        userId,
      ),
      this.sqlsvRepo.getUsersInFlow(
        processKeyFinal,
        roleList,
        limit * page + 100,
        1,
        userId,
      ),
    ]);
    // //console.log (`[getUserSuggestion] Step4 getUsersInFlow x2 (parallel) usersWithType=${usersWithType.length} usersWithType2=${usersWithType2.length} | ${Date.now() - _t2}ms`);

    // 5. Filter theo tên nếu có cho cả 2 danh sách
    let allUsers = usersWithType;
    let allUsers2 = usersWithType2;

    if (name && name.trim()) {
      allUsers = filterUsersByName(allUsers, name);
      allUsers2 = filterUsersByName(allUsers2, name);
    }

    // 6. Phân trang
    const total = allUsers.length;
    const total2Filtered = allUsers2.length;
    const start = (page - 1) * limit;
    const end = start + limit;

    // Slice trước khi xử lý authorized để tránh duyệt toàn bộ danh sách lớn
    const pagedUsers = allUsers.slice(start, end);
    const pagedUsers2 = allUsers2.slice(start, end);

    // 7. Map tên author - lấy TẤT CẢ ủy quyền hiệu lực hôm nay (1 query nhẹ, không cần IN clause)
    // rồi dùng JS Map để filter với danh sách users hiện tại
    const _t3 = Date.now();
    const [activeAuthorities, allActiveUsers] = await Promise.all([
      this.runtime.repo.getActiveAuthorities(),
      Promise.resolve([...pagedUsers, ...pagedUsers2]),
    ]);
    // //console.log (`[getUserSuggestion] Step5 getActiveAuthorities count=${activeAuthorities.length} | ${Date.now() - _t3}ms`);

    if (activeAuthorities.length > 0) {
      // Build Map author → authorized từ tập ủy quyền nhỏ
      const authorityMap = new Map(activeAuthorities.map(a => [a.author, a.authorized]));

      // Lấy tên của những người ủy quyền (chỉ những ai xuất hiện trong page hiện tại)
      const relevantAuthorizedIds = [...new Set(
        allActiveUsers
          .map(u => authorityMap.get(u._id))
          .filter(Boolean) as string[]
      )];

      if (relevantAuthorizedIds.length > 0) {
        const _t4 = Date.now();
        const authorizedNames = await this.runtime.repo.getNamesOfUsers(relevantAuthorizedIds);
        // //console.log (`[getUserSuggestion] Step6 getNamesOfUsers count=${authorizedNames.length} | ${Date.now() - _t4}ms`);
        const nameMap = new Map(authorizedNames.map(n => [n.id, n.name]));

        // So sánh trong JS - O(1) Map lookup
        const applyAuthorized = (users: typeof pagedUsers) => {
          users.forEach(u => {
            const authorizedId = authorityMap.get(u._id);
            if (!authorizedId) return;
            const authorizedName = nameMap.get(authorizedId);
            if (!authorizedName) return;
            u.name = `${authorizedName} (Được ${u.name} ủy quyền)`;
          });
        };

        applyAuthorized(pagedUsers);
        applyAuthorized(pagedUsers2);
      }
    }
    // //console.log (`[getUserSuggestion] END total=${total} paged=${pagedUsers.length} | TOTAL=${Date.now() - _t0}ms`);

    return {
      data: [
        {
          transfer: true,
          user: pagedUsers,
          total,
          limit,
          page,
        },
        {
          transfer: false,
          user: pagedUsers2,
          total: total2Filtered,
          limit,
          page,
        },
      ],
    };
  }

  /* async findSignersByType(queryParams: {
    page?: number;
    limit?: number;
    roleCode?: string;
    processKey?: string;
    typeSign: string;
    unit?: string;
    name?: string; // Khai báo rõ ràng tham số name nhận từ query
  }, userInfo: any): Promise<any> {
    const totalStart = Date.now();
    console.log('[DEBUG_LAG][findSignersByType] Start with typeSign:', queryParams?.typeSign, 'processKey:', queryParams?.processKey);

    let bpmnVersion = queryParams?.processKey;
    if (!bpmnVersion) {
      console.time('[DEBUG_LAG][findSignersByType] getUserFlowConfig');
      const flowConfigWrapper = await getUserFlowConfig(this.sqlsvRepo, userInfo, 'OutGoingDocument');
      bpmnVersion = flowConfigWrapper?.flowConfig?.id;
      console.timeEnd('[DEBUG_LAG][findSignersByType] getUserFlowConfig');
    }

    console.time('[DEBUG_LAG][findSignersByType] getBpmnFile and XML parse');
    const bpmnXML = await this.sqlRepo.getBpmnFile(bpmnVersion);
    const { indexes } = await this.runtime.getModelFromXml(bpmnXML);
    console.timeEnd('[DEBUG_LAG][findSignersByType] getBpmnFile and XML parse');

    const draftSignNodes: any[] = [];
    for (const [, node] of indexes.nodes) {
      const props = getAllNodeExtensionProperties(node);
      const signRole = props.signerRequired || props.processRequired || props.signRole;
      const targetTypeSign = queryParams?.typeSign;
      const draftRoles = [
        'draft',
        'signContentDraft',
        SignRoles.DRAFT,
        SignRoles.DRAFT_2,
        SignRoles.DRAFT_3,
        SignRoles.DRAFT_4,
      ];
      const isMatch =
        (draftRoles.includes(targetTypeSign) && draftRoles.includes(signRole)) ||
        (targetTypeSign === 'proposal' && (signRole === 'proposal' || signRole === 'proposalSigner')) ||
        (signRole === targetTypeSign);

      if (isMatch) {
        draftSignNodes.push(node);
      }
    }

    if (!draftSignNodes.length) {
      throw new BadRequestException('Flow chưa cấu hình node ký dự thảo');
    }

    const roleCodes = new Set<string>();
    let hasLanes = false;
    for (const node of draftSignNodes) {
      const lane =
        indexes.laneMap.get(node.id) ??
        (node.laneId ? indexes.laneMap.get(node.laneId) : undefined);
      if (lane !== undefined) hasLanes = true;
      if (lane) roleCodes.add(lane);
    }

    if (!hasLanes) {
      throw new BadRequestException('Không tìm thấy lane cho node ký dự thảo');
    }

    if (!roleCodes.size) {
      throw new BadRequestException('Lane ký dự thảo chưa cấu hình roleCode');
    }

    const currentProcessKey = bpmnVersion || 'VAN_BAN_DI';

    // Helper function để chuẩn hóa chuỗi (bỏ dấu tiếng Việt, đưa về chữ thường, bỏ khoảng trắng thừa)
    const normalizeString = (str: any) => {
      if (!str) return '';
      return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ') // Gộp nhiều khoảng trắng thành 1
        .trim() // Xóa khoảng trắng ở 2 đầu
        .toLowerCase();
    };

    // 1. Chuẩn hóa và ép kiểu dữ liệu an toàn
    const hasLimit = queryParams?.limit !== undefined;
    const limit = hasLimit ? Number(queryParams.limit) : 500;
    const page = queryParams?.page ? Number(queryParams.page) : 1;
    const isUnitFilter = false; // queryParams?.unit === 'same';
    const searchKeyword = queryParams?.name ? normalizeString(queryParams.name).trim() : '';

    // Nếu có lọc đơn vị hoặc tìm kiếm từ khóa hoặc không có limit (backend gọi), ta cần lấy số lượng lớn (1000) từ DB
    const dbLimit = (isUnitFilter || searchKeyword || !hasLimit) ? 1000 : limit;
    const dbPage = (isUnitFilter || searchKeyword || !hasLimit) ? 1 : page;


    console.time('[DEBUG_LAG][findSignersByType] sqlsvRepo.getUsersInFlowv2 + getUserById');
    const [usersFlowResult, currentUser] = await Promise.all([
      this.sqlsvRepo.getUsersInFlowv2(
        currentProcessKey,
        [...roleCodes],
        dbLimit,
        dbPage,
        userInfo,
        false, // Bỏ kiểm tra phòng ban (checkAllowedUnits = false)
        true,  // Lọc trực tiếp trong query: Chỉ lấy user có parent khác null (parentNotNull = true)
      ),
      isUnitFilter
        ? this.sqlsvRepo.getUserById(userInfo)
        : Promise.resolve(null)
    ]);
    console.timeEnd('[DEBUG_LAG][findSignersByType] sqlsvRepo.getUsersInFlowv2 + getUserById');

    let mappedUsers = usersFlowResult.usersWithType || [];

    // Lọc theo phòng ban áp dụng (unit) cấu hình trong quy trình (BPMN Design) nếu có cấu hình
    const bpmnDesignRepo = this.organizationUnitRepository.manager.getRepository(BpmnDesignEntity);
    const bpmnDesign = await bpmnDesignRepo.findOne({
      where: [
        { id: currentProcessKey },
        { processKey: currentProcessKey }
      ],
      select: ['id', 'unit']
    });

    if (bpmnDesign && Array.isArray(bpmnDesign.unit) && bpmnDesign.unit.length > 0) {
      const appliedUnitIds = bpmnDesign.unit.map(id => String(id));
      mappedUsers = mappedUsers.filter(u => u.parent && appliedUnitIds.includes(String(u.parent)));
    }

    // 2. Bước lọc 1: Lọc theo đơn vị (nếu có yêu cầu lọc cùng đơn vị ngang cấp và cấp cao hơn)
    if (isUnitFilter && currentUser) {
      const unitId = this.extractParentOrgId(currentUser?.parent);
      const parentParentId = currentUser?.parent?.parentId;

      let siblingUnitIds: string[] = [];
      if (parentParentId) {
        const siblingUnits = await this.organizationUnitRepository.find({
          where: { parentId: parentParentId, status: 1 },
          select: ['id'],
        });
        siblingUnitIds = siblingUnits.map(u => u.id);
      }

      const mpath = currentUser?.parent?.mpath || '';
      const mpathUnits = mpath ? mpath.split('/').filter(Boolean) : [];
      const allowedUnitIds = [...new Set([unitId, parentParentId, ...siblingUnitIds, ...mpathUnits])].filter(Boolean);

      if (allowedUnitIds.length > 0) {
        mappedUsers = mappedUsers.filter(u => allowedUnitIds.includes(String(u.parent)));
      }
    }

    // 3. Bước lọc 2: Tìm kiếm từ khóa theo Tên / Mã cán bộ / Chức vụ / Username (nếu có keyword)
    if (searchKeyword) {
      mappedUsers = mappedUsers.filter((u: any) => { // Ép kiểu u sang any để bypass check TypeScript
        const name = normalizeString(u.name);
        const codeND = normalizeString(u.codeND);
        const position = normalizeString(u.position);
        const username = normalizeString(u.username);

        const isMatched = name.includes(searchKeyword) ||
          codeND.includes(searchKeyword) ||
          position.includes(searchKeyword) ||
          username.includes(searchKeyword);

        return isMatched;
      });
    }

    // 4. Bước 3: Phân trang (Slice) sau khi đã áp dụng tất cả các bộ lọc
    const startIndex = (page - 1) * limit;
    const paginatedUsers = hasLimit
      ? mappedUsers.slice(startIndex, startIndex + limit)
      : mappedUsers;

    // 5. Bước 4: Xử lý thông tin ủy quyền (chỉ chạy trên danh sách đã phân trang cuối cùng)
    console.time('[DEBUG_LAG][findSignersByType] authority check');
    if (paginatedUsers.length > 0) {
      const userIdsInPage = paginatedUsers.map((u) => u._id).filter(Boolean);
      const authorityList = await this.sqlRepo.getAuthoritiesForUsers(userIdsInPage);

      if (authorityList && authorityList.length > 0) {
        const authorizedIds = authorityList.map((a) => a.authorized).filter(Boolean);
        const namesList = await this.sqlRepo.getNamesOfUsers(authorizedIds);

        const nameMap = new Map<string, string>(namesList.map((n) => [n.id, n.name]));
        const authMap = new Map<string, string>(authorityList.map((a) => [a.author, a.authorized]));

        paginatedUsers.forEach((u) => {
          const authorizedId = authMap.get(u._id);
          if (authorizedId) {
            const authorizedName = nameMap.get(authorizedId);
            if (authorizedName) {
              u.name = `${authorizedName} (Được ${u.name} ủy quyền)`;
            }
          }
        });
      }
    }
    console.timeEnd('[DEBUG_LAG][findSignersByType] authority check');

    console.log('[DEBUG_LAG][findSignersByType] Total time taken:', Date.now() - totalStart, 'ms');
    return {
      data: paginatedUsers,
    };
  } */

  async findSignersByType(queryParams: {
    page?: number;
    limit?: number;
    roleCode?: string;
    roles?: string;
    processKey?: string;
    typeSign: string;
    unit?: string;
    name?: string;
  }, userInfo: any): Promise<any> {
    try {
      const totalStart = Date.now();

      const processKey = queryParams?.processKey;
      if (!processKey) {
        throw new BadRequestException('Thiếu tham số processKey');
      }
      // Helper function để chuẩn hóa chuỗi (bỏ dấu tiếng Việt)
      const normalizeString = (str: any) => {
        if (!str) return '';
        return String(str)
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
      };
      // Phân trang
      const limit = queryParams?.limit ? Number(queryParams.limit) : 500;
      const page = queryParams?.page ? Number(queryParams.page) : 1;
      const searchKeyword = queryParams?.name ? normalizeString(queryParams.name).trim() : '';
      console.time('filter org')
      // Xác định phạm vi tìm kiếm người ký theo AllowDifferentRoom được lưu ở bảng roles_process
      const currentUser = await this.sqlsvRepo.getUserById(userInfo).catch(() => null);
      const currentOrgId = this.extractParentOrgId(currentUser?.parent) || undefined;

      let mode: 'same_room' | 'other_room' = 'same_room';
      const targetRolesList = queryParams?.roles
        ? queryParams.roles.split(',').map((r) => r.trim()).filter(Boolean)
        : [];

      if (targetRolesList.length > 0) {
        const rolesProcessRepo = this.organizationUnitRepository.manager.getRepository(RolesProcessEntity);
        const matchedRole = await rolesProcessRepo.findOne({
          where: {
            processKey,
            roleCode: In(targetRolesList),
            description: 'AllowDifferentRoom',
            isActive: true
          },
          select: ['id']
        });
        if (matchedRole) {
          mode = 'other_room';
        }
      }
      let sqlRoomFilter = '';
      let allowedUnitCount: number | null = null;
      if (currentOrgId) {
        if (mode === 'same_room') {
          // 1. Lấy nhanh mpath, type và parentId của phòng ban hiện tại
          const currentOrg = await this.organizationUnitRepository.findOne({
            where: { id: currentOrgId, status: 1 },
            select: ['mpath', 'type', 'parentId'],
          });
          const ancestorIds = currentOrg?.mpath
            ? currentOrg.mpath.split('/').map(id => id.trim()).filter(Boolean)
            : [];

          // 2. Lấy danh sách chính nó và các phòng ban con/cháu
          const descendants = await this.organizationUnitRepository
            .createQueryBuilder('ou')
            .select(['ou.id'])
            .where('ou.status = 1')
            .andWhere('(ou.id = :orgId OR ou.mpath LIKE :mpathPattern)', {
              orgId: currentOrgId,
              mpathPattern: `%${currentOrgId}%`,
            })
            .getMany();
          const descendantIds = descendants.map(d => d.id);

          // 3. Nếu phòng hiện tại có type là 'ban', lấy thêm các ban ngang hàng
          let siblingBanIds: string[] = [];
          if (currentOrg?.type?.toLowerCase() === 'ban' && currentOrg?.parentId) {
            const siblings = await this.organizationUnitRepository
              .createQueryBuilder('ou')
              .select(['ou.id'])
              .where('ou.parentId = :parentId AND ou.status = 1 AND LOWER(ou.type) = :type', {
                parentId: currentOrg.parentId,
                type: 'ban'
              })
              .getMany();
            siblingBanIds = siblings.map(s => s.id);
          }

          // 4. Gộp cả cha, con lẫn các ban ngang hàng
          const allowedUnitIds = [...new Set([...ancestorIds, ...descendantIds, ...siblingBanIds])];
          allowedUnitCount = allowedUnitIds.length;

          if (allowedUnitIds.length > 0) {
            const idsString = allowedUnitIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
            sqlRoomFilter = `AND u.parent IN (${idsString})`;
          } else {
            sqlRoomFilter = `AND 1=0`;
          }
        } else if (mode === 'other_room') {
          const bpmnDesignRepo = this.organizationUnitRepository.manager.getRepository(BpmnDesignEntity);
          const bpmnDesign = await bpmnDesignRepo.findOne({
            where: [
              { id: processKey },
              { processKey: processKey }
            ],
            select: ['id', 'unit']
          });

          if (bpmnDesign && Array.isArray(bpmnDesign.unit) && bpmnDesign.unit.length > 0) {
            const appliedUnitIds = bpmnDesign.unit.map(id => String(id));
            // Tối ưu hóa: Lấy trực tiếp các phòng ban hoạt động trong danh sách cấu hình
            const activeUnits = await this.organizationUnitRepository
              .createQueryBuilder('ou')
              .select(['ou.id'])
              .where('ou.id IN (:...appliedUnitIds) AND ou.status = 1', {
                appliedUnitIds
              })
              .getMany();
            const allowedUnitIds = activeUnits.map(u => u.id);
            allowedUnitCount = allowedUnitIds.length;
            if (allowedUnitCount > 0) {
              const idsString = allowedUnitIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
              sqlRoomFilter = `AND u.parent IN (${idsString})`;
            } else {
              sqlRoomFilter = `AND 1=0`;
            }
          } else {
            sqlRoomFilter = `AND u.parent <> '${currentOrgId.replace(/'/g, "''")}'`;
          }
        }
      }
      console.timeEnd('filter org');
      console.time('[DEBUG_LAG][findSignersByType] get users from roles_process_groups');
      const manager = this.organizationUnitRepository.manager;
      const safeProcessKey = processKey.replace(/'/g, "''");
      const safeRoleCode = queryParams?.roles?.replace(/'/g, "''") || null;

      // CTE base để tái sử dụng
      const cteBase = `
        ;WITH ProcessRoles AS (
          SELECT id
          FROM roles_process WITH(NOLOCK)
          WHERE process_key = '${safeProcessKey}'
            AND is_active = 1
            ${safeRoleCode ? `AND role_code = '${safeRoleCode}'` : ''}
        ),
        GroupIds AS (
          SELECT DISTINCT rpg.group_id
          FROM roles_process_groups rpg WITH(NOLOCK)
          INNER JOIN ProcessRoles pr ON rpg.role_id = pr.id
        ),
        CandidateUsers AS (
          SELECT DISTINCT u.id, u.name, u.code_nd AS codeND, u.position, u.username, u.parent,
                 ou.name AS organizationName, ou.code AS organizationCode
          FROM users u WITH(NOLOCK)
          INNER JOIN user_group_users ugu WITH(NOLOCK) ON u.id = ugu.user_id
          LEFT JOIN organization_units ou WITH(NOLOCK) ON ou.id = u.parent
          WHERE ugu.group_user_id IN (SELECT group_id FROM GroupIds)
            AND u.status IN (1, 2)
            AND u.parent IS NOT NULL
            ${sqlRoomFilter}
        )`;

      let mappedUsers: any[] = [];
      let totalCount = 0;

      if (!searchKeyword) {
        // ✅ KHÔNG CÓ SEARCH: Paginate ở DB level - TỐI ƯU NHẤT
        const offset = (page - 1) * limit;
        const result = await manager.query(`
          ${cteBase}
          SELECT id, name, codeND, position, username, parent,
                 organizationName, organizationCode,
                 COUNT(*) OVER() AS total_count
          FROM CandidateUsers
          ORDER BY name
          OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
        `);
        mappedUsers = result || [];
        totalCount = mappedUsers.length > 0 ? Number(mappedUsers[0].total_count) : 0;
      } else {
        // ⚠️ CÓ SEARCH: Query tất cả + filter ở app (vì cần normalize tiếng Việt)
        const allUsers = await manager.query(`
          ${cteBase}
          SELECT id, name, codeND, position, username, parent,
                 organizationName, organizationCode
          FROM CandidateUsers
          ORDER BY name
        `);
        const all = allUsers || [];

        // Filter với normalize tiếng Việt ở app level
        const filtered = all.filter((u: any) => {
          return normalizeString(u.name).includes(searchKeyword) ||
            normalizeString(u.codeND).includes(searchKeyword) ||
            normalizeString(u.position).includes(searchKeyword) ||
            normalizeString(u.username).includes(searchKeyword);
        });
        totalCount = filtered.length;

        // Paginate sau filter
        const startIndex = (page - 1) * limit;
        mappedUsers = filtered.slice(startIndex, startIndex + limit);
      }
      console.timeEnd('[DEBUG_LAG][findSignersByType] get users from roles_process_groups');


      // Lấy root organization cho tất cả users trong 1 query
      const rootOrgMap = new Map<string, any>();
      if (mappedUsers.length > 0) {
        const parentIds = [...new Set(mappedUsers.map(u => u.parent).filter(Boolean))];
        if (parentIds.length > 0) {
          const rootOrgs = await manager.query(`
            WITH OrgHierarchy AS (
              SELECT id, name, code, parentId, mpath, 0 AS level
              FROM organization_units WITH(NOLOCK)
              WHERE id IN (${parentIds.map(id => `'${id}'`).join(',')})

              UNION ALL

              SELECT o.id, o.name, o.code, o.parentId, o.mpath, oh.level + 1
              FROM organization_units o WITH(NOLOCK)
              INNER JOIN OrgHierarchy oh ON o.id = oh.parentId
            )
            SELECT id, name, code, parentId, mpath, level
            FROM OrgHierarchy
            WHERE level = (SELECT MAX(level) FROM OrgHierarchy)
          `);

          rootOrgs.forEach((org: any) => {
            rootOrgMap.set(org.id, {
              rootOrganizationName: org.name,
              rootOrganizationCode: org.code,
            });
          });
        }
      }

      // Định dạng dữ liệu với organization info
      const formattedUsers = mappedUsers.map((u: any) => {
        const rootOrg = rootOrgMap.get(u.parent) || {};
        return {
          _id: u.id,
          id: u.id,
          name: u.name,
          codeND: u.codeND,
          position: u.position,
          username: u.username,
          parent: u.parent,
          organizationName: u.organizationName || null,
          organizationCode: u.organizationCode || null,
          rootOrganizationName: rootOrg.rootOrganizationName || null,
          rootOrganizationCode: rootOrg.rootOrganizationCode || null,
        };
      });

      console.log('[DEBUG_LAG][findSignersByType] Total time:', Date.now() - totalStart, 'ms, users:', formattedUsers.length);

      return {
        data: formattedUsers,
        total: totalCount,
        page: page,
        limit: limit,
        allowedUnitCount: allowedUnitCount,
      };
    } catch (error) {
      this.logger.error(
        `Lỗi trong findSignersByType: ${error?.message || error}. QueryParams: ${JSON.stringify(queryParams)}`,
        error?.stack
      );
      throw error;
    }
  }

  async getOrganizationUnitsForUser(ids: string[], processKey?: string, name?: string): Promise<any> {
    const orgUnits = await this.sqlsvRepo.getOrganizationUnitsForUsers(
      ids,
      name,
    );
    return orgUnits;
  }

  async getUserSuggestionHandling(
    userId: string,
    payload: any,
    limit = 100,
    page = 1,
    name?: string,
  ) {
    const { documentId, documentType, workitem, actionCode, roles, processKey } = payload;
    let doc;
    if (!processKey && documentType?.toLowerCase() === 'incomingdocument') {
      doc = await this.incomingService.getDocumentByFields({ documentId, select: ['bpmnVersion'] });
    }
    if (!processKey && !doc) throw new BadRequestException('Không tìm thấy văn bản');
    const processKeyFinal = processKey || doc.bpmnVersion;
    if (!processKeyFinal) {
      throw new BadRequestException('Văn bản không có luồng xử lý');
    }
    const bpmnXML = await this.runtime.repo.getBpmnFile(processKeyFinal);
    const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);
    const outs = indexes.outgoingBySource.get(workitem)
    const flow = outs.find(
      (f: any) =>
        (f.name && f.name.toUpperCase() === actionCode) || f.id === actionCode,
    );
    const { node: nextNode } = this.bpmnEngineService.nextInteractiveFromFlow(flow, indexes);
    const outsNext = indexes.outgoingBySource.get(nextNode.id) || [];

    const targetRoles: any = [];
    // Get roles from next nodes
    const outNext = outsNext.find((f: any) => f.targetRef.$type === "bpmn:InclusiveGateway" || f.targetRef.$type === "bpmn:ExclusiveGateway")
    const subActions: any[] = [];
    if (outNext) {
      const gatewayNode = outNext.targetRef;
      if (gatewayNode) {
        const outNodes = indexes.outgoingBySource.get(gatewayNode.id) || [];
        outNodes.forEach(outNode => {
          const flowExtProps = this.bpmnEngineService.getFlowExtensionProperties(outNode);
          if (outNode.name && !subActions.some(sa => sa.actionCode === outNode.name)) {
            subActions.push({
              label: flowExtProps?.groupLabel || flowExtProps?.actionLabel,
              actionCode: flowExtProps?.actionCode || outNode.name
            });
          }
          const nextInteractive = this.bpmnEngineService.nextInteractiveFromFlow(outNode, indexes);
          if (nextInteractive?.node) {
            const lane = indexes.laneMap.get(nextInteractive.node.id) ??
              (nextInteractive.node.laneId ? indexes.laneMap.get(nextInteractive.node.laneId) : undefined);
            if (lane) {
              targetRoles.push(lane);
            }
          }
        });
      }
    }

    const unique = targetRoles.reduce((acc, item) => {
      return acc.includes(item) ? acc : [...acc, item];
    }, []);

    const rolesInNextNode = unique.filter(Boolean).join(',');

    // 3. Lấy users cho next node roles
    const rolesInNextNodeList =
      rolesInNextNode?.split(',').filter(Boolean) || [];
    const roleList =
      roles?.split(',').filter(Boolean) || [];

    const [
      { usersWithType: usersWithType2, total: total2 },
      { usersWithType, total: total1 },
    ] = await Promise.all([
      this.sqlsvRepo.getUsersInFlow(
        processKeyFinal,
        rolesInNextNodeList,
        limit * page + 100,
        1,
        userId,
      ),
      this.sqlsvRepo.getUsersInFlow(
        processKeyFinal,
        roleList,
        limit * page + 100,
        1,
        userId,
      ),
    ]);


    // 5. Filter theo tên nếu có cho cả 2 danh sách
    let allUsers = usersWithType;
    let allUsers2 = usersWithType2;

    if (name && name.trim()) {
      allUsers = filterUsersByName(allUsers, name);
      allUsers2 = filterUsersByName(allUsers2, name);
    }

    // 6. Phân trang trước khi xử lý nhãn ủy quyền
    const total = allUsers.length;
    const total2Filtered = allUsers2.length;
    const start = (page - 1) * limit;
    const end = start + limit;

    const pagedUsers = allUsers.slice(start, end);
    const pagedUsers2 = allUsers2.slice(start, end);

    // 7. Map tên author cho cả 2 danh sách đã phân trang (Xử lý batch query chống N+1)
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const userIdsToMap = [
      ...pagedUsers.map((u: any) => u._id),
      ...pagedUsers2.map((u: any) => u._id)
    ].filter(Boolean);

    if (userIdsToMap.length > 0) {
      // 7.1 Lấy thông tin ủy quyền 1 lần duy nhất từ DB (dùng OPENJSON để tránh giới hạn 2100 tham số)
      const authorityQuery = `
        SELECT author, authorized
        FROM ${this.dbname}.dbo.authority_documents
        WHERE stage = '1'
          AND author IN (
            SELECT [value]
            FROM OPENJSON(@0)
            WITH (value NVARCHAR(100) '$')
          )
          AND start_date <= GETDATE()
          AND end_date >= GETDATE()
        ORDER BY start_date DESC
      `;

      const authorities = await this.userRepository.query(authorityQuery, [JSON.stringify(userIdsToMap)]).catch((e: any) => {
        this.logger.error('Error batch fetching authority documents:', e);
        return [];
      });

      const authorityMap = new Map<string, string>(); // author -> authorized
      authorities.forEach((row: any) => {
        if (!authorityMap.has(row.author)) {
          authorityMap.set(row.author, row.authorized);
        }
      });

      // 7.2 Lấy tên của những người được ủy quyền 1 lần duy nhất
      const authorizedIds = Array.from(new Set(authorityMap.values())).filter(Boolean);
      const userNameMap = new Map<string, string>(); // userId -> name

      if (authorizedIds.length > 0) {
        const users = await this.userRepository
          .createQueryBuilder('user')
          .select(['user.id', 'user.name'])
          .where(
            `user.id IN (
              SELECT [value]
              FROM OPENJSON(:authorizedIdsJson)
              WITH (value NVARCHAR(100) '$')
            )`,
            { authorizedIdsJson: JSON.stringify(authorizedIds) }
          )
          .andWhere('user.status = :status', { status: 1 })
          .getMany()
          .catch((e: any) => {
            this.logger.error('Error batch fetching user names for authority:', e);
            return [];
          });

        users.forEach((u: any) => {
          if (u.id && u.name) {
            userNameMap.set(u.id, u.name);
          }
        });
      }

      // 7.3 Map lại tên cho cả 2 danh sách
      const mapAuthorName = (u: any) => {
        const authorizedId = authorityMap.get(u._id);
        if (authorizedId) {
          const authorizedName = userNameMap.get(authorizedId);
          if (authorizedName) {
            u.name = `${authorizedName} (Được ${u.name} ủy quyền)`;
          }
        }
      };

      pagedUsers.forEach(mapAuthorName);
      pagedUsers2.forEach(mapAuthorName);
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return {
      data: [
        {
          transfer: true,
          user: pagedUsers,
          total,
          limit,
          page,
        },
        {
          transfer: false,
          subActions,
          user: pagedUsers2,
          total: total2Filtered,
          limit,
          page,
        },
      ],
    };
  }

  async findSingerInOutGOingUser({ docId, typeSign }: { docId: string, typeSign: string }) {
    try {
      const query = `
        SELECT TOP 1 1
        FROM ${this.dbname}.dbo.outgoing_document_users
        WHERE document_id = @0 AND signer_type = @1
      `;
      const result = await this.userRepository.query(query, [docId, typeSign]);
      return result?.length > 0;
    } catch (error) {
      return false;
    }
  }

  async findOneByKeycloakId(keycloakUserId: string) {
    if (!keycloakUserId) return null;
    return this.userRepository.findOne({
      where: { keycloakUserId },
      select: ['id', 'username', 'name'],
    });
  }

  async getUserUnitAndRoleCodes(userId: string): Promise<{ unitId: string | null; roleCodes: string[] }> {
    const userQuery = `
      SELECT TOP 1 parent, roles_by_process 
      FROM (
        SELECT parent, roles_by_process FROM ${this.dbname}.dbo.users WHERE id = @0
        UNION ALL
        SELECT parent, roles_by_process FROM ${this.dbname}.dbo.users WHERE keycloak_user_id = @0
      ) u
    `;
    const userResult = await this.userRepository.query(userQuery, [userId]);
    const userData = userResult?.[0];
    if (!userData) {
      return { unitId: null, roleCodes: [] };
    }

    const unitId = userData.parent || null;
    const rolesByProcessStr = userData.roles_by_process;

    if (!rolesByProcessStr) {
      return { unitId, roleCodes: [] };
    }

    let rolesByProcess: any[] = [];
    try {
      rolesByProcess = typeof rolesByProcessStr === 'string'
        ? JSON.parse(rolesByProcessStr)
        : rolesByProcessStr;
    } catch {
      return { unitId, roleCodes: [] };
    }

    if (!Array.isArray(rolesByProcess) || rolesByProcess.length === 0) {
      return { unitId, roleCodes: [] };
    }

    const processKeys = [
      ...new Set(rolesByProcess.map((p) => p.processKey).filter(Boolean)),
    ];

    if (processKeys.length === 0) {
      return { unitId, roleCodes: [] };
    }

    const params = processKeys;
    const paramPlaceholders = processKeys.map((_, index) => `@${index}`).join(', ');
    const rfQuery = `
      SELECT process_key AS processKey 
      FROM ${this.dbname}.dbo.role_feature 
      WHERE process_key IN (${paramPlaceholders})
    `;

    const rfResult = await this.userRepository.query(rfQuery, params);
    const activeProcessKeys = new Set<string>(rfResult?.map((rf) => rf.processKey) || []);
    const roleCodeSet = new Set<string>();

    for (const proc of rolesByProcess) {
      if (!activeProcessKeys.has(proc.processKey)) continue;

      for (const roleObject of proc.roles || []) {
        if (roleObject.roleCode) {
          roleCodeSet.add(roleObject.roleCode);
        }
      }
    }

    return { unitId, roleCodes: Array.from(roleCodeSet) };
  }

  async getUserRoleCodes(userId: string): Promise<string[]> {
    const data = await this.getUserUnitAndRoleCodes(userId).catch(() => null);
    return data?.roleCodes || [];
  }

  async getUserUnitId(userId: string): Promise<string | null> {
    const data = await this.getUserUnitAndRoleCodes(userId).catch(() => null);
    return data?.unitId || null;
  }

  async checkIfDocumentIsDeleted(documentId: string): Promise<boolean> {
    if (!documentId) return false;
    const sql = `
      SELECT TOP 1 status 
      FROM (
        SELECT status FROM ${this.dbname}.dbo.incomming_documents WITH (NOLOCK) WHERE document_id = @0
        UNION ALL
        SELECT status FROM ${this.dbname}.dbo.outgoing_documents WITH (NOLOCK) WHERE document_id = @0
      ) t
      WHERE status = 3
    `;
    const res = await this.userRepository.query(sql, [documentId]).catch(() => []);
    return Array.isArray(res) && res.length > 0;
  }

  async checkDocumentPermission(
    documentId: string,
    userId: string,
    preFetchedUserUnit?: string | null,
    preFetchedRoleCodes?: string[],
  ): Promise<boolean> {
    if (!documentId || !userId) return false;

    const isAdmin = await checkAdminPermission(userId).catch(() => false);
    if (!isAdmin) {
      const isDeleted = await this.checkIfDocumentIsDeleted(documentId);
      if (isDeleted) {
        return false;
      }
    }

    const startTime = Date.now();

    // Check if the user is in the recalledUserIds of the latest audit record
    const latestAuditRecalled = await this.userRepository.query(
      `SELECT TOP 1 details
       FROM ${this.dbname}.dbo.audit WITH (NOLOCK)
       WHERE document_id = @0
       ORDER BY id DESC`,
      [documentId],
    ).catch(() => []);

    if (Array.isArray(latestAuditRecalled) && latestAuditRecalled.length > 0) {
      const detailsStr = latestAuditRecalled[0]?.details;
      if (detailsStr) {
        try {
          const detailsObj = typeof detailsStr === 'string' ? JSON.parse(detailsStr) : detailsStr;
          if (detailsObj && Array.isArray(detailsObj.recalledUserIds) && detailsObj.recalledUserIds.includes(userId)) {
            return false;
          }
        } catch (e) {
        }
      }
    }

    try {
      // Lấy song song các dữ liệu tiền đề
      const needFetchUser = preFetchedUserUnit === undefined || preFetchedRoleCodes === undefined;
      const [outgoingDocDetails, userUnitAndRoles] = await Promise.all([
        this.sqlRepo.getOutgoingDocDetails(documentId).catch(() => ({ documentId: null, drafter: null })),
        needFetchUser
          ? this.getUserUnitAndRoleCodes(userId).catch(() => ({ unitId: null, roleCodes: [] }))
          : Promise.resolve({ unitId: preFetchedUserUnit ?? null, roleCodes: preFetchedRoleCodes ?? [] }),
      ]);

      const resolvedDocId = outgoingDocDetails?.documentId;
      const drafter = outgoingDocDetails?.drafter;

      const userUnit = userUnitAndRoles.unitId;
      const userRoleCodes = userUnitAndRoles.roleCodes;

      const promises: Promise<boolean>[] = [];

      // 1. Kiểm tra nếu là người soạn thảo văn bản đi (drafter === currentUserId)
      // Không cần query DB nữa vì drafter đã được lấy cùng documentId ở trên
      promises.push(Promise.resolve(drafter === userId));

      // 2. Kiểm tra quyền qua lịch sử xử lý (audit) kết hợp vai trò và đơn vị
      promises.push(
        this.sqlRepo.checkUserDocumentAuditAccess(documentId, userId, userUnit, userRoleCodes)
          .catch(() => false),
      );

      // Nếu id là outgoing thì lấy document id từ đó ra để kiểm tra quyền
      promises.push(
        this.userRepository.query(
          `
            SELECT TOP 1 1 AS ok
            FROM ${this.dbname}.dbo.incomming_documents d
            CROSS APPLY STRING_SPLIT(d.view_group, ',') s
            INNER JOIN ${this.dbname}.dbo.group_users gu_target
              ON gu_target.code = LTRIM(RTRIM(s.value))
            WHERE d.document_id = @0
              AND d.status = 1
              AND d.view_group IS NOT NULL
              AND d.view_group <> ''
              AND (
                EXISTS (
                  SELECT 1
                  FROM ${this.dbname}.dbo.user_group_users ugu
                  WHERE ugu.group_user_id = gu_target.id
                    AND ugu.user_id = @1
                )
                OR EXISTS (
                  SELECT 1
                  FROM ${this.dbname}.dbo.user_group_users ugu_mgr
                  INNER JOIN ${this.dbname}.dbo.group_users gu_mgr
                    ON gu_mgr.id = ugu_mgr.group_user_id
                  WHERE ugu_mgr.user_id = @1
                    AND gu_mgr.status = 5
                    AND gu_mgr.[order] IS NOT NULL
                    AND gu_target.status = 5
                    AND gu_target.[order] IS NOT NULL
                    AND gu_mgr.[order] <= gu_target.[order]
                )
              )
          `,
          [documentId, userId],
        )
          .then((rows) => Array.isArray(rows) && rows.length > 0)
          .catch(() => false),
      );

      if (resolvedDocId && resolvedDocId !== documentId) {
        promises.push(
          this.sqlRepo.checkUserDocumentAuditAccess(resolvedDocId!, userId, userUnit, userRoleCodes)
            .catch(() => false),
        );
      }

      promises.push(
        this.userRepository.query(
          `
            SELECT TOP 1 1 AS ok
            FROM ${this.dbname}.dbo.notifications n WITH (NOLOCK)
            WHERE n.recordId = @0
              AND n.recipientId = @1
              AND n.[key] = 'VIEW_OUTCOMING_DOC'
              AND n.[type] = @2
              AND n.status = 1
          `,
          [documentId, userId, NotificationType.CONCURENT_STEP_OUTGOING.value],
        )
          .then((rows) => Array.isArray(rows) && rows.length > 0)
          .catch(() => false),
      );

      // Gọi song song các hàm kiểm tra quyền, trả về true ngay khi có bất kỳ hàm nào xong trước và đúng (Short-circuit)
      const hasAccess = await new Promise<boolean>((resolve) => {
        let completedCount = 0;
        let resolved = false;

        if (promises.length === 0) {
          resolve(false);
          return;
        }

        promises.forEach((promise) => {
          promise
            .then((res) => {
              if (resolved) return;
              if (res) {
                resolved = true;
                resolve(true);
              } else {
                completedCount++;
                if (completedCount === promises.length) {
                  resolve(false);
                }
              }
            })
            .catch(() => {
              if (resolved) return;
              completedCount++;
              if (completedCount === promises.length) {
                resolve(false);
              }
            });
        });
      });

      const totalDuration = Date.now() - startTime;
      // this.logger.log(
      //   `[checkDocumentPermission] User: ${userId}, Document: ${documentId}. Result: ${hasAccess} (took ${totalDuration}ms)`
      // );

      return hasAccess;
    } catch (error) {
      this.logger.error(`Error in checkDocumentPermission for user ${userId} and doc ${documentId} (took ${Date.now() - startTime}ms):`, error);
      return false;
    }
  }

  async hasOutgoingNextStageNotificationAccess(
    documentId: string,
    userId: string,
  ): Promise<boolean> {
    if (!documentId || !userId) return false;
    try {
      const rows = await this.userRepository.query(
        `
          SELECT TOP 1 1 AS ok
          FROM ${this.dbname}.dbo.notifications n WITH (NOLOCK)
          WHERE n.recordId = @0
            AND n.recipientId = @1
            AND n.[key] = 'VIEW_OUTCOMING_DOC'
            AND n.[type] = @2
            AND n.status = 1
        `,
        [documentId, userId, NotificationType.CONCURENT_STEP_OUTGOING.value],
      );
      return Array.isArray(rows) && rows.length > 0;
    } catch (error) {
      return false;
    }
  }
}
