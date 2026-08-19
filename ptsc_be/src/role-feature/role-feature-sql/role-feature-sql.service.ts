import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validateAndParseSortParam } from 'src/utils/sort-validator.util';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, Brackets } from 'typeorm';
import { RoleFeatureEntity } from './role-feature.entity';
import {
  CreateRoleFeatureSqlDto,
  GetRoleFeatureActionsQueryDto,
  UpdateRoleFeatureSqlDto,
} from './role-feature-sql.dto';
// import { RoleFeature, RoleFeatureDocument } from './role-feature.schema';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from 'src/users/entities/user.entity';
import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';
import { RolesProcessEntity } from './roles-process.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { FeatureManagementEntity, StatusFeature } from 'src/feature-management/feature-management.entity';
import actionCatalog from 'src/variable/action-catalog';
import { parseFlagsButton } from 'src/utils/util';

const BpmnModdle = require('bpmn-moddle');

interface ParsedBpmnLane {
  id: string;
  name: string;
  roles: string[];
  properties: Record<string, string>;
  nodeIds: string[];
}

interface ParsedBpmnActionIndexes {
  nodes: Map<string, any>;
  outgoingBySource: Map<string, any[]>;
  laneByNode: Map<string, ParsedBpmnLane>;
  lanes: ParsedBpmnLane[];
  sequenceFlows: any[];
}
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunked: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
}

@Injectable()
export class RoleFeatureSqlService {
  private readonly logger = new Logger(RoleFeatureSqlService.name);
  constructor(
    @InjectRepository(RoleFeatureEntity, 'mssqlConnection')
    private readonly roleFeatureRepository: Repository<RoleFeatureEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(BpmnDesignEntity, 'mssqlConnection')
    private readonly bpmnDesignRepository: Repository<BpmnDesignEntity>,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepository: Repository<FeatureManagementEntity>,
    @InjectRepository(RolesProcessEntity, 'mssqlConnection')
    private readonly rolesProcessRepository: Repository<RolesProcessEntity>,
    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserRepository: Repository<GroupUserEntity>,
  ) {}

  async create(createDto: CreateRoleFeatureSqlDto): Promise<RoleFeatureEntity> {
    const existing = await this.roleFeatureRepository.findOneBy({
      processKey: createDto.processKey,
    });
    if (existing) {
      throw new BadRequestException(
        `RoleFeature with processKey "${createDto.processKey}" already exists.`,
      );
    }

    const newRoleFeature = this.roleFeatureRepository.create({
      id: uuidv4(),
      processKey: createDto.processKey,
      roles: createDto.roles.map((roleDto) => ({
        id: uuidv4(),
        name: roleDto.name,
        roleCode: roleDto.roleCode,
        permissions: roleDto.permissions || [],
        users: (roleDto.users || []).filter((u) => u), // Lọc bỏ các giá trị null/undefined
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await this.roleFeatureRepository.save(newRoleFeature);

    // 🔄 ĐỒNG BỘ SONG SONG VÀO BẢNG QUAN HỆ CHUẨN roles_process
    try {
      if (createDto.processKey && createDto.roles && createDto.roles.length > 0) {
        const allowDiffMap = await this.getAllowDifferentRoomMap(createDto.processKey);
        for (const roleDto of createDto.roles) {
          const userIds = (roleDto.users || []).filter((u) => u);
          const users = userIds.length > 0
            ? await this.userRepository.find({ where: { id: In(userIds) } })
            : [];

          const isAllowDiff = allowDiffMap.get(roleDto.roleCode.trim()) || false;
          const description = isAllowDiff ? 'AllowDifferentRoom' : null;

          const newRoleProcess = this.rolesProcessRepository.create({
            id: uuidv4(),
            roleCode: roleDto.roleCode,
            roleName: roleDto.name,
            processKey: createDto.processKey,
            description,
            isActive: true,
            users,
            groups: [], // khởi tạo rỗng cho create
          });
          await this.rolesProcessRepository.save(newRoleProcess);
        }
      }
    } catch (err) {
      this.logger.error('Failed to sync to roles_process during create', err);
    }

    return saved;
  }

  async findAll(queryParams: any): Promise<any> {
    const {
      processKey,
      processKeyName,
      code,
      name,
      status,
      sort,
      page,
      limit,
    } = queryParams;

    const qb = this.roleFeatureRepository
      .createQueryBuilder('rf')
      .innerJoin(BpmnDesignEntity, 'bd', 'rf.processKey = bd.id')
      .andWhere('bd.status <> 3');

    // ===== processKey OR processKeyName (OR logic) =====
    if (processKey || processKeyName) {
      // Tìm danh sách processKey khớp với tên quy trình từ bpmn_designs
      let matchedIds: string[] = [];
      if (processKeyName) {
        const matchedBpmns = await this.bpmnDesignRepository
          .createQueryBuilder('bd')
          .where('bd.name LIKE :bpmnName', { bpmnName: `%${processKeyName}%` })
          .andWhere('bd.status <> 3')
          .select(['bd.id'])
          .getMany();
        matchedIds = matchedBpmns.map(b => b.id);
      }

      // Gộp điều kiện OR
      const conditions: string[] = [];
      const params: any = {};

      if (processKey) {
        if (queryParams.exact === 'true') {
          conditions.push('rf.processKey = :processKey');
          params.processKey = processKey;
        } else {
          conditions.push('rf.processKey LIKE :processKey');
          params.processKey = `%${processKey}%`;
        }
      }

      if (matchedIds.length > 0) {
        conditions.push('rf.processKey IN (:...matchedIds)');
        params.matchedIds = matchedIds;
      }

      if (conditions.length > 0) {
        qb.andWhere(`(${conditions.join(' OR ')})`, params);
      } else if (processKeyName && matchedIds.length === 0) {
        // Chỉ tìm theo processKeyName mà không khớp bpmn nào → trả rỗng
        return [];
      }
    }

    // ===== code (LIKE) =====
    if (code) {
      qb.andWhere('rf.code LIKE :code', { code: `%${code}%` });
    }

    // ===== name (LIKE) =====
    if (name) {
      qb.andWhere('rf.name LIKE :name', { name: `%${name}%` });
    }

    // ===== status =====
    if (status !== undefined) {
      qb.andWhere('rf.status = :status', { status: Number(status) });
    }

    // ===== sort (dùng shared utility) =====
    const sortResult = validateAndParseSortParam(sort);

    if (Object.keys(sortResult).length > 0) {
      (Object.entries(sortResult) as [string, 'ASC' | 'DESC'][]).forEach(([key, order]) => {
        qb.addOrderBy(`rf.${key}`, order);
      });
    } else {
      qb.orderBy('rf.createdAt', 'DESC');
    }

    const roles = await qb.getMany();
    
    // Fetch bpmn designs to map name
    const processKeys = roles.map(r => r.processKey).filter(pk => pk);
    const bpmnMap = new Map<string, string>();
    
    if (processKeys.length > 0) {
      const uniqueKeys = Array.from(new Set(processKeys));
      const keyChunks = chunkArray(uniqueKeys, 1000);
      const bpmns: BpmnDesignEntity[] = [];
      for (const chunk of keyChunks) {
        const chunkBpmns = await this.bpmnDesignRepository.find({
          where: { id: In(chunk) },
          select: ['id', 'name'],
        });
        bpmns.push(...chunkBpmns);
      }
      bpmns.forEach(bpmn => {
        if (bpmn.id && bpmn.name) {
          bpmnMap.set(bpmn.id, bpmn.name);
        }
      });
    }

    const filteredRoles = roles
      .filter((role: any) => Array.isArray(role.roles) && role.roles.length > 0)
      .map((role: any) => ({
        ...role,
        _id: role.id,
        processKeyName: bpmnMap.get(role.processKey) || role.name || role.processKey,
      }));

    if (page !== undefined || limit !== undefined) {
      const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit as string, 10) || 25, 1);
      const totalRecords = filteredRoles.length;
      const totalPages = Math.ceil(totalRecords / limitNum);
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedData = filteredRoles.slice(startIndex, startIndex + limitNum);

      return {
        total: totalRecords,
        page: pageNum,
        limit: limitNum,
        totalPages,
        data: paginatedData,
      };
    }

    return filteredRoles;
  }

  async findByRelatedProcesses(queryParams: any): Promise<any> {
    const {
      relatedProcesses,
      processKey,
      processKeyName,
      code,
      name,
      status,
      sort,
      page,
      limit,
      groupId,
      userId,
      orgUnitId,
      showInPermissionDetail,
    } = queryParams;

    // const qb = this.roleFeatureRepository
    //   .createQueryBuilder('rf')
    //   .innerJoin(BpmnDesignEntity, 'bd', '(rf.processKey = bd.processKey OR rf.processKey = bd.id OR rf.id = bd.id)')
    //   .andWhere('bd.status <> 3')
    //   .andWhere((qbSub) => {
    //     const subQuery = qbSub
    //       .subQuery()
    //       .select('1')
    //       .from('feature_management', 'fm')
    //       .where('(fm.process_id = rf.processKey OR fm.process_id = rf.id)')
    //       .andWhere('fm.status = 1')
    //       .getQuery();
    //     return `EXISTS (${subQuery})`;
    //   });

		const qb = this.roleFeatureRepository
      .createQueryBuilder('rf')
      .innerJoin(BpmnDesignEntity, 'bd', '(rf.processKey = bd.processKey OR rf.processKey = bd.id OR rf.id = bd.id)')
      .andWhere('bd.status <> 3');


    if (showInPermissionDetail !== undefined) {
      const isShow = showInPermissionDetail === 'true' || showInPermissionDetail === true;
      qb.andWhere('bd.showInPermissionDetail = :showInPermissionDetail', { showInPermissionDetail: isShow });
    }

    const rpList = this.normalizeRelatedProcesses(relatedProcesses);
    if (rpList.length > 0) {
      qb.andWhere(
        new Brackets((xq) => {
          rpList.forEach((rp, idx) => {
            xq.orWhere(`bd.relatedProcesses LIKE :rp_${idx}`, {
              [`rp_${idx}`]: `%"${rp}"%`,
            });
          });
        }),
      );
    }

    // ===== processKey OR processKeyName (OR logic) =====
    if (processKey || processKeyName) {
      // Tìm danh sách processKey khớp với tên quy trình từ bpmn_designs
      let matchedIds: string[] = [];
      if (processKeyName) {
        const matchedBpmns = await this.bpmnDesignRepository
          .createQueryBuilder('bd')
          .where('bd.name LIKE :bpmnName', { bpmnName: `%${processKeyName}%` })
          .andWhere('bd.status <> 3')
          .select(['bd.id'])
          .getMany();
        matchedIds = matchedBpmns.map(b => b.id);
      }

      // Gộp điều kiện OR
      const conditions: string[] = [];
      const params: any = {};

      if (processKey) {
        if (queryParams.exact === 'true') {
          conditions.push('rf.processKey = :processKey');
          params.processKey = processKey;
        } else {
          conditions.push('rf.processKey LIKE :processKey');
          params.processKey = `%${processKey}%`;
        }
      }

      if (matchedIds.length > 0) {
        conditions.push('rf.processKey IN (:...matchedIds)');
        params.matchedIds = matchedIds;
      }

      if (conditions.length > 0) {
        qb.andWhere(`(${conditions.join(' OR ')})`, params);
      } else if (processKeyName && matchedIds.length === 0) {
        // Chỉ tìm theo processKeyName mà không khớp bpmn nào → trả rỗng
        return [];
      }
    }

    // ===== code (LIKE) =====
    if (code) {
      qb.andWhere('rf.code LIKE :code', { code: `%${code}%` });
    }

    // ===== name (LIKE) =====
    if (name) {
      qb.andWhere('rf.name LIKE :name', { name: `%${name}%` });
    }

    // ===== status =====
    if (status !== undefined) {
      qb.andWhere('rf.status = :status', { status: Number(status) });
    }

    // ===== sort (dùng shared utility) =====
    const sortResult = validateAndParseSortParam(sort);

    if (Object.keys(sortResult).length > 0) {
      (Object.entries(sortResult) as [string, 'ASC' | 'DESC'][]).forEach(([key, order]) => {
        qb.addOrderBy(`rf.${key}`, order);
      });
    } else {
      qb.orderBy('rf.createdAt', 'DESC');
    }

    // Tính toán phân trang trước
    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit as string, 10) || 25, 1);
    const offset = (pageNum - 1) * limitNum;
    const shouldFilterByActor = Boolean(userId || groupId);

    let roleFeatures: RoleFeatureEntity[] = [];
    let total = 0;
    let roleRefs: Array<{ processKey?: string; roleCode?: string; name?: string }> = [];

    if (userId) {
      // 1. Kiểm tra tồn tại người dùng bằng truy vấn select tối giản
      const userExists = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id'],
      });
      if (!userExists) {
        throw new NotFoundException(`Không tìm thấy người dùng với ID: ${userId}`);
      }

      // 2. Tìm các group của user này, lọc theo đơn vị (orgUnitId) nếu có
      const userGroupsQb = this.groupUserRepository
        .createQueryBuilder('gu')
        .innerJoin('user_group_users', 'ugu', 'gu.id = ugu.group_user_id')
        .where('ugu.user_id = :userId', { userId })
        .andWhere('gu.status = 1');

      if (orgUnitId) {
        // Nhóm phải liên kết với orgUnitId này HOẶC nhóm toàn cục (không liên kết đơn vị nào)
        userGroupsQb.andWhere(new Brackets(qbSub => {
          qbSub.where(qbSub1 => {
            const subQuery = qbSub1.subQuery()
              .select('1')
              .from('group_user_organization_units', 'gu_ou')
              .where('gu_ou.group_user_id = gu.id')
              .andWhere('gu_ou.organization_unit_id = :orgUnitId', { orgUnitId })
              .getQuery();
            return `EXISTS (${subQuery})`;
          }).orWhere(qbSub2 => {
            const subQuery = qbSub2.subQuery()
              .select('1')
              .from('group_user_organization_units', 'gu_ou')
              .where('gu_ou.group_user_id = gu.id')
              .getQuery();
            return `NOT EXISTS (${subQuery})`;
          });
        }));
      }

      const userGroups = await userGroupsQb
        .select(['gu.id', 'gu.name', 'gu.code', 'gu.roles_dynamic'])
        .getMany();
      const userGroupIds = userGroups.map(g => g.id);

      // 3. Tìm tất cả các roles_process của user này (hoặc trực tiếp, hoặc qua các nhóm đã lọc)
      const roleQuery = this.rolesProcessRepository
        .createQueryBuilder('rp')
        .andWhere('rp.isActive = :isActive', { isActive: true })
        .select(['rp.id', 'rp.processKey', 'rp.roleCode']);

      roleQuery.andWhere(new Brackets(qbBrackets => {
        if (userGroupIds.length > 0) {
          qbBrackets.where(qbSub => {
            const subQuery = qbSub.subQuery()
              .select('1')
              .from('roles_process_groups', 'rpg')
              .where('rpg.role_id = rp.id')
              .andWhere('rpg.group_id IN (:...userGroupIds)', { userGroupIds })
              .getQuery();
            return `EXISTS (${subQuery})`;
          });
        }
        
        // Nhóm quyền trực tiếp qua User
        qbBrackets.orWhere(qbSub => {
          const subQuery = qbSub.subQuery()
            .select('1')
            .from('roles_process_users', 'rpu')
            .where('rpu.role_id = rp.id')
            .andWhere('rpu.user_id = :userId', { userId })
            .getQuery();
          return `EXISTS (${subQuery})`;
        });
      }));

      const processRoleRefs = await roleQuery.getMany();
      roleRefs = [
        ...this.toSimpleRoleRefs(processRoleRefs),
        ...this.collectRoleRefsFromGroups(userGroups),
      ];
      roleFeatures = await qb.getMany();
    } else if (groupId) {
      const group = await this.groupUserRepository.findOne({
        where: { id: groupId, status: 1 },
        select: ['id', 'name', 'code', 'roles_dynamic'],
      });
      if (!group) {
        throw new NotFoundException(`Khong tim thay nhom nguoi dung voi ID: ${groupId}`);
      }

      const processRoleRefs = await this.rolesProcessRepository
        .createQueryBuilder('rp')
        .innerJoin('roles_process_groups', 'rpg', 'rp.id = rpg.role_id')
        .where('rpg.group_id = :groupId', { groupId })
        .andWhere('rp.isActive = :isActive', { isActive: true })
        .select(['rp.processKey', 'rp.roleCode'])
        .getMany();

      roleRefs = [
        ...this.toSimpleRoleRefs(processRoleRefs),
        ...this.collectRoleRefsFromGroups([group]),
      ];
      roleFeatures = await qb.getMany();
    } else {
      total = await qb.getCount();
      if (page !== undefined || limit !== undefined) {
        qb.skip(offset).take(limitNum);
      }
      roleFeatures = await qb.getMany();
    }

    const laneSourceRoleFeatures = shouldFilterByActor
      ? await this.findRelatedRoleFeaturesForLaneMerge(rpList, roleFeatures)
      : roleFeatures;
    const resultData = await this.buildRelatedProcessesPermissionRows(
      roleFeatures,
      roleRefs,
      shouldFilterByActor,
      laneSourceRoleFeatures,
    );

    if (shouldFilterByActor) {
      total = resultData.length;
    }

    if (page !== undefined || limit !== undefined) {
      const responseData = shouldFilterByActor
        ? resultData.slice(offset, offset + limitNum)
        : resultData;
      const responseTotal = shouldFilterByActor ? resultData.length : total;
      const totalPages = Math.ceil(responseTotal / limitNum);
      return {
        total: responseTotal,
        page: pageNum,
        limit: limitNum,
        totalPages,
        data: responseData,
      };
    }

    return resultData;
  }

  private async findRelatedRoleFeaturesForLaneMerge(
    relatedProcesses: string[],
    fallbackRoleFeatures: RoleFeatureEntity[],
  ): Promise<RoleFeatureEntity[]> {
    const rpList = this.normalizeRelatedProcesses(relatedProcesses);
    if (rpList.length === 0) return fallbackRoleFeatures || [];

    const roleFeatures = await this.roleFeatureRepository
      .createQueryBuilder('rf')
      .innerJoin(BpmnDesignEntity, 'bd', '(rf.processKey = bd.processKey OR rf.processKey = bd.id OR rf.id = bd.id)')
      .andWhere('bd.status <> 3')
      .andWhere(
        new Brackets((xq) => {
          rpList.forEach((rp, idx) => {
            xq.orWhere(`bd.relatedProcesses LIKE :lane_rp_${idx}`, {
              [`lane_rp_${idx}`]: `%"${rp}"%`,
            });
          });
        }),
      )
      .getMany();

    const resultMap = new Map<string, RoleFeatureEntity>();
    for (const roleFeature of [...(fallbackRoleFeatures || []), ...(roleFeatures || [])]) {
      const key = this.normalizeRoleCode(roleFeature.processKey || roleFeature.id);
      if (!key || resultMap.has(key)) continue;
      resultMap.set(key, roleFeature);
    }

    return Array.from(resultMap.values());
  }
  private async buildRelatedProcessesPermissionRows(
    roleFeatures: RoleFeatureEntity[],
    roleRefs: Array<{ processKey?: string; roleCode?: string; name?: string }>,
    shouldFilterByActor: boolean,
    laneSourceRoleFeatures: RoleFeatureEntity[] = roleFeatures,
  ): Promise<any[]> {
    const bpmnInfoMap = await this.getBpmnInfoMapForRoleFeatures([
      ...(roleFeatures || []),
      ...(laneSourceRoleFeatures || []),
    ]);
    const familyProcessKeySet = new Set<string>();

    for (const roleFeature of laneSourceRoleFeatures || []) {
      [roleFeature.id, roleFeature.processKey]
        .map((value) => this.normalizeRoleCode(value))
        .filter(Boolean)
        .forEach((value) => familyProcessKeySet.add(value));
    }

    const exactRoleKeySet = new Set<string>();
    const familyRoleCodeSet = new Set<string>();
    for (const roleRef of roleRefs || []) {
      const normalizedProcessKey = this.normalizeRoleCode(roleRef?.processKey);
      const normalizedRoleCode = this.normalizeRoleCode(roleRef?.roleCode || roleRef?.name);
      if (!normalizedProcessKey || !normalizedRoleCode) continue;
      if (!familyProcessKeySet.has(normalizedProcessKey)) continue;

      exactRoleKeySet.add(`${normalizedProcessKey}_${normalizedRoleCode}`);
      familyRoleCodeSet.add(normalizedRoleCode);
    }

    const familyLaneRoleByKey = new Map<string, any>();
    if (shouldFilterByActor && familyRoleCodeSet.size > 0) {
      const familyLaneFilterRoles = Array.from(familyRoleCodeSet).map((roleCode) => ({
        roleCode,
        name: roleCode,
      }));

      for (const laneSourceRoleFeature of laneSourceRoleFeatures || []) {
        const sourceBpmnInfo = bpmnInfoMap.get(laneSourceRoleFeature.processKey) || bpmnInfoMap.get(laneSourceRoleFeature.id);
        const sourceProcessKey = sourceBpmnInfo?.processKey || laneSourceRoleFeature.processKey || laneSourceRoleFeature.id;
        const sourceProcessName = sourceBpmnInfo?.name || (laneSourceRoleFeature as any).name || sourceProcessKey;
        const matchedLanes = this.filterBpmnLanesByRoles(sourceBpmnInfo?.lanes || [], familyLaneFilterRoles);

        for (const lane of matchedLanes) {
          for (const matchedRole of lane.matchedRoles || []) {
            const roleKey = this.normalizeRoleCode(matchedRole);
            if (!roleKey || familyLaneRoleByKey.has(roleKey)) continue;

            familyLaneRoleByKey.set(roleKey, {
              id: matchedRole,
              _id: matchedRole,
              name: matchedRole,
              roleCode: matchedRole,
              permissions: [],
              inheritedFromBpmnLane: true,
              inheritedFromProcessKey: sourceProcessKey,
              inheritedFromProcessName: sourceProcessName,
            });
          }
        }
      }
    }

    const result = (roleFeatures || []).map((roleFeature: any) => {
      const bpmnInfo = bpmnInfoMap.get(roleFeature.processKey) || bpmnInfoMap.get(roleFeature.id);
      const processAliases = [roleFeature.id, roleFeature.processKey]
        .map((value) => this.normalizeRoleCode(value))
        .filter(Boolean);

      const configuredRoles = Array.isArray(roleFeature.roles) ? roleFeature.roles : [];
      const matchedConfiguredRoles = shouldFilterByActor
        ? configuredRoles.filter((role: any) => {
            const roleCode = this.normalizeRoleCode(role?.roleCode || role?.name);
            if (!roleCode) return false;

            const hasExactRole = processAliases.some((processKey) => exactRoleKeySet.has(`${processKey}_${roleCode}`));
            return hasExactRole || familyRoleCodeSet.has(roleCode);
          })
        : configuredRoles;


      const roleByKey = new Map<string, any>();
      for (const role of matchedConfiguredRoles) {
        const roleKey = this.normalizeRoleCode(role?.roleCode || role?.name);
        if (!roleKey || roleByKey.has(roleKey)) continue;
        const { users, ...roleWithoutUsers } = role || {};
        roleByKey.set(roleKey, roleWithoutUsers);
      }

      if (shouldFilterByActor) {
        for (const [roleKey, laneRole] of familyLaneRoleByKey) {
          if (roleByKey.has(roleKey)) continue;
          roleByKey.set(roleKey, laneRole);
        }
      }

      return {
        ...roleFeature,
        _id: roleFeature.id,
        roles: Array.from(roleByKey.values()),
        processKeyName: bpmnInfo?.name || roleFeature.name || roleFeature.processKey,
      };
    });

    return result.filter((item: any) => Array.isArray(item.roles) && item.roles.length > 0);
  }

  private async getBpmnInfoMapForRoleFeatures(roleFeatures: RoleFeatureEntity[]): Promise<Map<string, any>> {
    const processKeys = Array.from(new Set(
      (roleFeatures || [])
        .flatMap((roleFeature: any) => [roleFeature.id, roleFeature.processKey])
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ));
    const bpmnInfoMap = new Map<string, any>();
    if (processKeys.length === 0) return bpmnInfoMap;

    for (const chunk of chunkArray(processKeys, 1000)) {
      const bpmns = await this.bpmnDesignRepository
        .createQueryBuilder('bd')
        .select(['bd.id', 'bd.name', 'bd.processKey'])
        .addSelect('bd.base64File')
        .where('(bd.id IN (:...processKeys) OR bd.processKey IN (:...processKeys))', { processKeys: chunk })
        .andWhere('bd.status <> 3')
        .getMany();

      for (const bpmn of bpmns) {
        let lanes: any[] = [];
        if (bpmn.base64File) {
          try {
            lanes = await this.extractBpmnLanes(this.decodeBpmnXml(bpmn.base64File));
          } catch (err: any) {
            this.logger.warn(`Cannot parse BPMN lanes for processKey=${bpmn.processKey || bpmn.id}: ${err?.message || err}`);
          }
        }

        const info = {
          id: bpmn.id,
          name: bpmn.name,
          processKey: bpmn.processKey,
          lanes,
        };
        [bpmn.id, bpmn.processKey]
          .map((value) => String(value || '').trim())
          .filter(Boolean)
          .forEach((key) => {
            if (!bpmnInfoMap.has(key)) bpmnInfoMap.set(key, info);
          });
      }
    }

    return bpmnInfoMap;
  }

  private async extractBpmnLanes(bpmnXml: string): Promise<any[]> {
    const moddle = new BpmnModdle();
    const { rootElement } = await moddle.fromXML(bpmnXml);
    const process = this.getMainBpmnProcess(rootElement);
    if (!process) return [];

    const indexes = this.buildBpmnActionIndexes(process);
    return indexes.lanes.map((lane) => ({
      id: lane.id,
      name: lane.name,
      roles: lane.roles,
      properties: lane.properties,
      nodeIds: lane.nodeIds,
    }));
  }

  private filterBpmnLanesByRoles(lanes: any[], roles: any[]): any[] {
    const roleMatchSet = new Set(
      (roles || [])
        .flatMap((role: any) => [role?.roleCode, role?.name])
        .map((value) => this.normalizeRoleCode(value))
        .filter(Boolean),
    );

    if (roleMatchSet.size === 0) return [];

    return (lanes || [])
      .map((lane) => {
        const matchedRoles = (lane.roles || [])
          .filter((roleCode: any) => roleMatchSet.has(this.normalizeRoleCode(roleCode)));
        if (matchedRoles.length === 0) return null;

        return {
          ...lane,
          matchedRoles,
        };
      })
      .filter(Boolean);
  }

  private toSimpleRoleRefs(roleRefs: any[]): Array<{ processKey?: string; roleCode?: string; name?: string }> {
    return (roleRefs || [])
      .map((roleRef: any) => ({
        processKey: roleRef?.processKey,
        roleCode: roleRef?.roleCode,
        name: roleRef?.name || roleRef?.roleName,
      }))
      .filter((roleRef) => roleRef.processKey && roleRef.roleCode);
  }

  private collectRoleRefsFromGroups(groups: GroupUserEntity[]): Array<{ processKey?: string; roleCode?: string; name?: string }> {
    const result: Array<{ processKey?: string; roleCode?: string; name?: string }> = [];
    for (const group of groups || []) {
      for (const role of this.parseRolesDynamic(group.roles_dynamic)) {
        if (!role?.processKey || !role?.roleCode) continue;
        result.push({
          processKey: role.processKey,
          roleCode: role.roleCode,
          name: role.name,
        });
      }
    }
    return result;
  }

  private normalizeRelatedProcesses(value: any): string[] {
    if (!value) return [];

    let rawValues: any[] = [];
    if (Array.isArray(value)) {
      rawValues = value;
    } else if (typeof value === 'string') {
      const raw = value.trim();
      if (!raw) return [];

      try {
        const parsed = JSON.parse(raw);
        rawValues = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        rawValues = raw.split(',');
      }
    } else {
      rawValues = [value];
    }

    return Array.from(new Set(
      rawValues
        .map((item) => String(item || '').trim())
        .filter(Boolean),
    ));
  }

  async getActionsByFeature(query: GetRoleFeatureActionsQueryDto): Promise<any> {
    const featureId = query.featureId?.trim();
    const processKeyParam = query.processKey?.trim();
    const userId = query.userId?.trim();
    const groupId = query.groupId?.trim();

    if (!featureId && !processKeyParam) {
      throw new BadRequestException('featureId or processKey is required');
    }
    if (!userId && !groupId) {
      throw new BadRequestException('userId or groupId is required');
    }
    if (userId && groupId) {
      throw new BadRequestException('Only one of userId or groupId is allowed');
    }

    let feature: FeatureManagementEntity | null = null;
    let processKey = processKeyParam;

    if (featureId) {
      feature = await this.featureManagementRepository.findOne({
        where: {
          id: featureId,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
        select: ['id', 'code', 'name', 'processID', 'featureType', 'status', 'statusFeature'],
      });

      if (!feature) {
        throw new NotFoundException(`Feature with id "${featureId}" not found`);
      }

      const featureProcessKey = feature.processID?.trim();
      if (processKey && featureProcessKey && this.normalizeRoleCode(processKey) !== this.normalizeRoleCode(featureProcessKey)) {
        throw new BadRequestException(`processKey "${processKey}" does not match feature processID "${featureProcessKey}"`);
      }
      processKey = processKey || featureProcessKey;
    }

    if (!processKey) {
      throw new BadRequestException(featureId
        ? `Feature "${featureId}" has no processID. Please send processKey`
        : 'processKey is required');
    }

    const [roleFeature, bpmnDesign] = await Promise.all([
      this.findRoleFeatureConfig(processKey),
      this.findBpmnDesignForProcess(processKey),
    ]);

    if (!roleFeature || !Array.isArray(roleFeature.roles)) {
      throw new NotFoundException(`RoleFeature with processKey "${processKey}" not found`);
    }

    const rpList = this.normalizeRelatedProcesses(bpmnDesign?.relatedProcesses);
    const laneSourceRoleFeatures = await this.findRelatedRoleFeaturesForLaneMerge(rpList, [roleFeature]);
    const familyProcessKeySet = this.buildProcessKeySetForRoleFeatures(laneSourceRoleFeatures);
    const roleRefs = await this.findActorRoleRefsForProcessFamily(familyProcessKeySet, userId, groupId);
    const assignedRoleCodeSet = new Set(
      (roleRefs || [])
        .flatMap((roleRef) => [roleRef.roleCode, roleRef.name])
        .map((roleCode) => this.normalizeRoleCode(roleCode))
        .filter(Boolean),
    );

    const matchedConfiguredRoles = (roleFeature.roles || [])
      .filter((role: any) => assignedRoleCodeSet.has(this.normalizeRoleCode(role.roleCode || role.name)));

    const assignedRoles = matchedConfiguredRoles.map((role: any) => {
      const hasFeaturePermission = feature
        ? (
            this.permissionIncludes(role.permissions, feature.code) ||
            this.permissionIncludes(role.permissions, feature.id)
          )
        : true;
      return {
        id: role.id,
        _id: role.id,
        name: role.name,
        roleCode: role.roleCode,
        permissions: Array.isArray(role.permissions) ? role.permissions : [],
        hasFeaturePermission,
      };
    });

    const featureMatchedRoles = assignedRoles.filter((role: any) => role.hasFeaturePermission);
    const laneRoleSet = new Set<string>();
    const roleByKey = new Map<string, any>();

    for (const role of featureMatchedRoles) {
      const roleCode = this.normalizeRoleCode(role.roleCode);
      const roleName = this.normalizeRoleCode(role.name);
      if (roleCode) laneRoleSet.add(roleCode);
      if (roleName) laneRoleSet.add(roleName);
      if (roleCode && !roleByKey.has(roleCode)) {
        roleByKey.set(roleCode, role);
      }
    }

    if (!feature) {
      for (const roleCode of assignedRoleCodeSet) {
        laneRoleSet.add(roleCode);
      }
    }

    let laneActions: any[] = [];
    if (laneRoleSet.size > 0) {
      const bpmnDesigns = await this.findBpmnDesignsForRoleFeatures(laneSourceRoleFeatures, bpmnDesign || undefined);
      for (const sourceBpmn of bpmnDesigns) {
        if (!sourceBpmn?.base64File) continue;
        try {
          const bpmnXml = this.decodeBpmnXml(sourceBpmn.base64File);
          const sourceLaneActions = await this.extractBpmnLaneActionsForRoles(bpmnXml, laneRoleSet);
          laneActions.push(...this.attachBpmnSourceToLaneActions(sourceLaneActions, sourceBpmn));
        } catch (err: any) {
          const sourceProcessKey = sourceBpmn.processKey || sourceBpmn.id || processKey;
          this.logger.error(`Cannot parse BPMN actions for processKey=${sourceProcessKey}: ${err?.message || err}`, err?.stack);
          throw new BadRequestException(`Cannot parse BPMN design for processKey "${sourceProcessKey}"`);
        }
      }
    }

    if (!feature) {
      for (const lane of laneActions || []) {
        for (const matchedRole of lane.matchedRoles || []) {
          const roleKey = this.normalizeRoleCode(matchedRole);
          if (!roleKey || !assignedRoleCodeSet.has(roleKey) || roleByKey.has(roleKey)) continue;

          roleByKey.set(roleKey, {
            id: matchedRole,
            _id: matchedRole,
            name: matchedRole,
            roleCode: matchedRole,
            permissions: [],
            hasFeaturePermission: true,
            inheritedFromBpmnLane: true,
            inheritedFromProcessKey: lane.sourceProcess?.processKey || lane.processKey,
            inheritedFromProcessName: lane.sourceProcess?.name || lane.processKeyName,
          });
        }
      }
    }

    return {
      roles: this.buildRoleBpmnActions(Array.from(roleByKey.values()), laneActions),
    };
  }

  private buildProcessKeySetForRoleFeatures(roleFeatures: RoleFeatureEntity[]): Set<string> {
    const processKeySet = new Set<string>();
    for (const roleFeature of roleFeatures || []) {
      [roleFeature.id, roleFeature.processKey]
        .map((value) => this.normalizeRoleCode(value))
        .filter(Boolean)
        .forEach((value) => processKeySet.add(value));
    }
    return processKeySet;
  }

  private async findActorRoleRefsForProcessFamily(
    familyProcessKeySet: Set<string>,
    userId?: string,
    groupId?: string,
  ): Promise<Array<{ processKey?: string; roleCode?: string; name?: string }>> {
    if (!familyProcessKeySet || familyProcessKeySet.size === 0) return [];

    const groups = await this.findGroupsForRoleLookup(userId, groupId);
    const roleRefs: Array<{ processKey?: string; roleCode?: string; name?: string }> = [
      ...this.collectRoleRefsFromGroups(groups),
    ];

    let processRoleRefs: any[] = [];
    if (userId) {
      const resolvedUserId = await this.resolveUserIdForRoleLookup(userId);
      const userGroupIds = groups.map((group) => group.id).filter(Boolean);
      const roleQuery = this.rolesProcessRepository
        .createQueryBuilder('rp')
        .andWhere('rp.isActive = :isActive', { isActive: true })
        .select(['rp.id', 'rp.processKey', 'rp.roleCode']);

      roleQuery.andWhere(new Brackets((qbBrackets) => {
        if (userGroupIds.length > 0) {
          qbBrackets.where((qbSub) => {
            const subQuery = qbSub.subQuery()
              .select('1')
              .from('roles_process_groups', 'rpg')
              .where('rpg.role_id = rp.id')
              .andWhere('rpg.group_id IN (:...userGroupIds)', { userGroupIds })
              .getQuery();
            return `EXISTS (${subQuery})`;
          });

          qbBrackets.orWhere((qbSub) => {
            const subQuery = qbSub.subQuery()
              .select('1')
              .from('roles_process_users', 'rpu')
              .where('rpu.role_id = rp.id')
              .andWhere('rpu.user_id = :resolvedUserId', { resolvedUserId })
              .getQuery();
            return `EXISTS (${subQuery})`;
          });
          return;
        }

        qbBrackets.where((qbSub) => {
          const subQuery = qbSub.subQuery()
            .select('1')
            .from('roles_process_users', 'rpu')
            .where('rpu.role_id = rp.id')
            .andWhere('rpu.user_id = :resolvedUserId', { resolvedUserId })
            .getQuery();
          return `EXISTS (${subQuery})`;
        });
      }));

      processRoleRefs = await roleQuery.getMany();
    } else if (groupId) {
      processRoleRefs = await this.rolesProcessRepository
        .createQueryBuilder('rp')
        .innerJoin('roles_process_groups', 'rpg', 'rp.id = rpg.role_id')
        .where('rpg.group_id = :groupId', { groupId })
        .andWhere('rp.isActive = :isActive', { isActive: true })
        .select(['rp.processKey', 'rp.roleCode'])
        .getMany();
    }

    roleRefs.push(...this.toSimpleRoleRefs(processRoleRefs));

    const resultByKey = new Map<string, { processKey?: string; roleCode?: string; name?: string }>();
    for (const roleRef of roleRefs) {
      const processKey = this.normalizeRoleCode(roleRef?.processKey);
      const roleCode = this.normalizeRoleCode(roleRef?.roleCode || roleRef?.name);
      if (!processKey || !roleCode || !familyProcessKeySet.has(processKey)) continue;

      const key = `${processKey}_${roleCode}`;
      if (!resultByKey.has(key)) {
        resultByKey.set(key, roleRef);
      }
    }

    return Array.from(resultByKey.values());
  }

  private async findBpmnDesignsForRoleFeatures(
    roleFeatures: RoleFeatureEntity[],
    fallbackBpmn?: BpmnDesignEntity,
  ): Promise<BpmnDesignEntity[]> {
    const processKeys = Array.from(new Set(
      (roleFeatures || [])
        .flatMap((roleFeature: any) => [roleFeature.id, roleFeature.processKey])
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ));

    const resultByKey = new Map<string, BpmnDesignEntity>();
    const addBpmn = (bpmn?: BpmnDesignEntity | null) => {
      if (!bpmn) return;
      const key = this.normalizeRoleCode(bpmn.processKey || bpmn.id);
      if (!key || resultByKey.has(key)) return;
      resultByKey.set(key, bpmn);
    };

    if (processKeys.length > 0) {
      for (const chunk of chunkArray(processKeys, 1000)) {
        const bpmns = await this.bpmnDesignRepository
          .createQueryBuilder('bd')
          .select(['bd.id', 'bd.name', 'bd.processKey', 'bd.relatedProcesses'])
          .addSelect('bd.base64File')
          .where('(bd.id IN (:...processKeys) OR bd.processKey IN (:...processKeys))', { processKeys: chunk })
          .andWhere('bd.status <> 3')
          .getMany();

        for (const bpmn of bpmns) {
          addBpmn(bpmn);
        }
      }
    }

    addBpmn(fallbackBpmn);
    return Array.from(resultByKey.values());
  }

  private attachBpmnSourceToLaneActions(laneActions: any[], bpmn: BpmnDesignEntity): any[] {
    const sourceProcess = {
      id: bpmn.id,
      key: bpmn.processKey || bpmn.id,
      name: bpmn.name || bpmn.processKey || bpmn.id,
      processKey: bpmn.processKey || bpmn.id,
    };

    return (laneActions || []).map((lane) => ({
      ...lane,
      processKey: sourceProcess.processKey,
      processKeyName: sourceProcess.name,
      sourceProcess,
      actions: (lane.actions || []).map((action: any) => ({
        ...action,
        processKey: sourceProcess.processKey,
        processKeyName: sourceProcess.name,
        sourceProcess,
        sourceLane: {
          ...(action.sourceLane || {}),
          processKey: sourceProcess.processKey,
          processKeyName: sourceProcess.name,
          sourceProcess,
        },
      })),
    }));
  }
  private buildRoleBpmnActions(featureMatchedRoles: any[], laneActions: any[]): any[] {
    return (featureMatchedRoles || []).map((role: any) => {
      const roleMatchSet = new Set(
        [role.roleCode, role.name]
          .map((value) => this.normalizeRoleCode(value))
          .filter(Boolean),
      );
      const actions: any[] = [];
      const seenActionKeys = new Set<string>();
      const seenActionNameKeys = new Set<string>();

      for (const lane of laneActions || []) {
        const hasRoleInLane = (lane.matchedRoles || [])
          .some((roleCode: any) => roleMatchSet.has(this.normalizeRoleCode(roleCode)));
        if (!hasRoleInLane) continue;

        for (const action of lane.actions || []) {
          const sourceProcessKey = lane.sourceProcess?.processKey || lane.processKey || '';
          const actionNameKey = this.normalizeBpmnActionDedupeKey(action?.label || action?.name || action?.groupLabel || action?.code || action?.taskId || action?.id);
          const actionKey = String(action?.flowId || `${sourceProcessKey}-${lane.id}-${action?.taskId || action?.code || actions.length}`);
          if (actionNameKey && seenActionNameKeys.has(actionNameKey)) continue;
          if (seenActionKeys.has(actionKey)) continue;
          if (actionNameKey) seenActionNameKeys.add(actionNameKey);
          seenActionKeys.add(actionKey);
          actions.push(action);
        }
      }

      return {
        id: role.id,
        _id: role._id || role.id,
        name: role.name,
        roleCode: role.roleCode,
        actions,
      };
    });
  }


  private async findRoleFeatureConfig(processKey: string): Promise<RoleFeatureEntity | null> {
    return this.roleFeatureRepository
      .createQueryBuilder('rf')
      .where('(rf.processKey = :processKey OR rf.id = :processKey)', { processKey })
      .getOne();
  }

  private async findBpmnDesignForProcess(processKey: string): Promise<BpmnDesignEntity | null> {
    return this.bpmnDesignRepository
      .createQueryBuilder('bd')
      .addSelect('bd.base64File')
      .where('(bd.id = :processKey OR bd.processKey = :processKey)', { processKey })
      .andWhere('bd.status <> 3')
      .orderBy('bd.updatedAt', 'DESC')
      .getOne();
  }

  private async findGroupUserRoleCodesInRoleFeature(
    processKey: string,
    roleFeature: RoleFeatureEntity,
    userId?: string,
    groupId?: string,
  ): Promise<{ roleCodes: string[]; roleSources: any[]; groupIds: string[] }> {
    const configuredRoleCodeSet = new Set(
      (roleFeature.roles || [])
        .map((role: any) => this.normalizeRoleCode(role?.roleCode))
        .filter(Boolean),
    );

    if (configuredRoleCodeSet.size === 0) {
      return { roleCodes: [], roleSources: [], groupIds: [] };
    }

    const groups = await this.findGroupsForRoleLookup(userId, groupId);
    const normalizedProcessKey = this.normalizeRoleCode(processKey);
    const roleCodeMap = new Map<string, string>();
    const roleSources: any[] = [];

    for (const group of groups) {
      const rolesDynamic = this.parseRolesDynamic(group.roles_dynamic);
      for (const role of rolesDynamic) {
        const roleProcessKey = this.normalizeRoleCode(role?.processKey);
        const normalizedRoleCode = this.normalizeRoleCode(role?.roleCode);

        if (!roleProcessKey || roleProcessKey !== normalizedProcessKey) continue;
        if (!normalizedRoleCode || !configuredRoleCodeSet.has(normalizedRoleCode)) continue;

        const roleCode = String(role.roleCode).trim();
        if (!roleCodeMap.has(normalizedRoleCode)) {
          roleCodeMap.set(normalizedRoleCode, roleCode);
        }

        roleSources.push({
          source: 'group_users.roles_dynamic',
          groupId: group.id,
          groupName: group.name,
          groupCode: group.code,
          processKey: role.processKey,
          roleCode,
          roleName: role.name || null,
        });
      }
    }

    return {
      roleCodes: Array.from(roleCodeMap.values()),
      roleSources,
      groupIds: Array.from(new Set(groups.map((group) => group.id).filter(Boolean))),
    };
  }

  private async findGroupsForRoleLookup(userId?: string, groupId?: string): Promise<GroupUserEntity[]> {
    if (userId) {
      const resolvedUserId = await this.resolveUserIdForRoleLookup(userId);
      const qb = this.groupUserRepository
        .createQueryBuilder('gu')
        .innerJoin('user_group_users', 'ugu', 'gu.id = ugu.group_user_id')
        .where('ugu.user_id = :userId', { userId: resolvedUserId })
        .andWhere('gu.status = :status', { status: 1 });

      return qb
        .select(['gu.id', 'gu.name', 'gu.code', 'gu.roles_dynamic'])
        .getMany();
    }

    if (!groupId) return [];

    const group = await this.groupUserRepository.findOne({
      where: { id: groupId, status: 1 },
      select: ['id', 'name', 'code', 'roles_dynamic'],
    });

    if (!group) {
      throw new NotFoundException(`Group with id "${groupId}" not found`);
    }

    return [group];
  }


  private async resolveUserIdForRoleLookup(userId: string): Promise<string> {
    const user = await this.userRepository.findOne({
      where: [{ id: userId }, { keycloakUserId: userId }],
      select: ['id'],
    });

    if (!user) {
      throw new NotFoundException(`User with id "${userId}" not found`);
    }

    return user.id;
  }

  private async extractBpmnLaneActionsForRoles(
    bpmnXml: string,
    roleCodeSet: Set<string>,
  ): Promise<any[]> {
    const moddle = new BpmnModdle();
    const { rootElement } = await moddle.fromXML(bpmnXml);
    const process = this.getMainBpmnProcess(rootElement);
    if (!process) return [];

    const indexes = this.buildBpmnActionIndexes(process);
    const laneGroups: any[] = [];

    for (const lane of indexes.lanes) {
      const matchedRoles = lane.roles.filter((roleCode) => roleCodeSet.has(this.normalizeRoleCode(roleCode)));
      if (matchedRoles.length === 0) continue;

      const laneGroup: any = {
        id: lane.id,
        name: lane.name,
        roles: lane.roles,
        matchedRoles,
        actions: [],
      };
      const seenTaskIds = new Set<string>();
      const seenTaskNameKeys = new Set<string>();
      const seenSequenceFlowIds = new Set<string>();

      for (const nodeId of lane.nodeIds || []) {
        const node = indexes.nodes.get(nodeId);
        if (!this.isBpmnUserTask(node)) continue;

        const action = this.buildBpmnUserTaskAction(node, lane, matchedRoles, laneGroup.actions.length);
        if (!action || seenTaskIds.has(action.taskId)) continue;

        const taskNameKey = this.normalizeBpmnActionDedupeKey(action.label || action.name || action.code || action.taskId || action.id);
        if (taskNameKey && seenTaskNameKeys.has(taskNameKey)) continue;

        seenTaskIds.add(action.taskId);
        if (taskNameKey) seenTaskNameKeys.add(taskNameKey);
        laneGroup.actions.push(action);
      }

      for (const flow of this.getBpmnSequenceFlowsForLane(lane, indexes)) {
        const action = this.buildBpmnSequenceFlowAction(flow, lane, matchedRoles, laneGroup.actions.length, indexes);
        if (!action || seenSequenceFlowIds.has(action.flowId || action.id)) continue;

        seenSequenceFlowIds.add(action.flowId || action.id);
        laneGroup.actions.push(action);
      }

      laneGroup.actions.sort((a: any, b: any) => {
        const orderDiff = (a.order ?? 999) - (b.order ?? 999);
        if (orderDiff !== 0) return orderDiff;
        return String(a.label || a.name || a.code).localeCompare(String(b.label || b.name || b.code));
      });
      laneGroups.push(laneGroup);
    }

    return laneGroups;
  }

  private getBpmnSequenceFlowsForLane(lane: ParsedBpmnLane, indexes: ParsedBpmnActionIndexes): any[] {
    const nodeIdSet = new Set(lane.nodeIds || []);
    const result: any[] = [];
    const seenFlowIds = new Set<string>();

    for (const flow of indexes.sequenceFlows || []) {
      if (!flow?.id || seenFlowIds.has(flow.id)) continue;

      const sourceId = flow.sourceRef?.id;
      const targetId = flow.targetRef?.id;
      if (!nodeIdSet.has(sourceId) && !nodeIdSet.has(targetId)) continue;

      const extProps = this.getBpmnElementProperties(flow);
      if (this.normalizeRoleCode(extProps.groupLabel) !== this.normalizeRoleCode('CHUY\u1EC2N X\u1EEC L\u00DD')) continue;

      seenFlowIds.add(flow.id);
      result.push(flow);
    }

    return result;
  }

  private buildBpmnSequenceFlowAction(
    flow: any,
    sourceLane: ParsedBpmnLane,
    matchedSourceRoles: string[],
    index: number,
    indexes: ParsedBpmnActionIndexes,
  ): any | null {
    if (!flow?.id || flow.$type !== 'bpmn:SequenceFlow') return null;

    const extProps = this.getBpmnElementProperties(flow);
    if (this.normalizeRoleCode(extProps.groupLabel) !== this.normalizeRoleCode('CHUY\u1EC2N X\u1EEC L\u00DD')) return null;

    const flowLabel = String(extProps.actionLabel || flow.name || extProps.label || extProps.groupLabel || '').trim();
    if (!flowLabel) return null;

    const order = extProps.order !== undefined && !Number.isNaN(Number(extProps.order))
      ? Number(extProps.order)
      : index;
    const sourceNode = flow.sourceRef?.id
      ? indexes.nodes.get(flow.sourceRef.id) || flow.sourceRef
      : null;
    const targetNode = this.getFlowTargetNode(flow, indexes);

    return {
      id: flow.id,
      taskId: flow.id,
      flowId: flow.id,
      code: extProps.actionCode || extProps.code || flow.id,
      label: flowLabel,
      name: flow.name || flowLabel,
      type: flow.$type || 'bpmn:SequenceFlow',
      groupLabel: extProps.groupLabel,
      order,
      sourceNode: this.toBpmnNodeInfo(sourceNode),
      targetNode: this.toBpmnNodeInfo(targetNode),
      sourceLane: {
        id: sourceLane.id,
        name: sourceLane.name,
        roles: sourceLane.roles,
        matchedRoles: matchedSourceRoles,
      },
      properties: extProps,
    };
  }
  private buildBpmnUserTaskAction(
    node: any,
    sourceLane: ParsedBpmnLane,
    matchedSourceRoles: string[],
    index: number,
  ): any | null {
    if (!node?.id || !this.isBpmnUserTask(node)) return null;

    const extProps = this.getBpmnElementProperties(node);
    // const attrs = node?.$attrs || {};
    const taskLabel = String(extProps.actionLabel || extProps.label || node.name || '').trim();
    if (!taskLabel) return null;

    const order = extProps.order !== undefined && !Number.isNaN(Number(extProps.order))
      ? Number(extProps.order)
      : index;

    return {
      id: node.id,
      taskId: node.id,
      code: extProps.actionCode || extProps.code || node.id,
      label: taskLabel,
      name: node.name || taskLabel,
      type: node.$type || null,
      order,
      sourceLane: {
        id: sourceLane.id,
        name: sourceLane.name,
        roles: sourceLane.roles,
        matchedRoles: matchedSourceRoles,
      },
      // assignee: extProps.assignee || node.assignee || attrs['camunda:assignee'] || null,
      // candidateUsers: extProps.candidateUsers || node.candidateUsers || attrs['camunda:candidateUsers'] || null,
      // candidateGroups: extProps.candidateGroups || extProps.candidateGroupsCode || node.candidateGroups || attrs['camunda:candidateGroups'] || null,
      // formKey: extProps.formKey || node.formKey || attrs['camunda:formKey'] || null,
      // flags: parseFlagsButton(extProps.flags),
      // flagsButton: parseFlagsButton(extProps.flagsButton),
      // properties: extProps,
    };
  }


  private isBpmnUserTask(node: any): boolean {
    return node?.$type === 'bpmn:UserTask';
  }

  private buildBpmnActionIndexes(process: any): ParsedBpmnActionIndexes {
    const nodes = new Map<string, any>();
    const outgoingBySource = new Map<string, any[]>();
    const laneByNode = new Map<string, ParsedBpmnLane>();
    const lanes: ParsedBpmnLane[] = [];
    const sequenceFlows: any[] = [];

    for (const el of process.flowElements || []) {
      if (el.$type === 'bpmn:SequenceFlow' && el.sourceRef?.id) {
        sequenceFlows.push(el);
        if (!outgoingBySource.has(el.sourceRef.id)) {
          outgoingBySource.set(el.sourceRef.id, []);
        }
        outgoingBySource.get(el.sourceRef.id)!.push(el);
      } else if (el.id) {
        nodes.set(el.id, el);
      }
    }

    for (const laneSet of process.laneSets || []) {
      for (const lane of laneSet.lanes || []) {
        const properties = this.getBpmnElementProperties(lane);
        const roles = this.getLaneRoleCodes(lane, properties);
        if (roles.length === 0) continue;

        const nodeIds = (lane.flowNodeRef || [])
          .map((ref: any) => ref?.id)
          .filter((nodeId: string | undefined): nodeId is string => Boolean(nodeId));

        const parsedLane: ParsedBpmnLane = {
          id: lane.id,
          name: lane.name || '',
          roles,
          properties,
          nodeIds,
        };
        lanes.push(parsedLane);

        for (const nodeId of nodeIds) {
          laneByNode.set(nodeId, parsedLane);
        }
      }
    }

    return { nodes, outgoingBySource, laneByNode, lanes, sequenceFlows };
  }

  private getMainBpmnProcess(rootElement: any): any | null {
    const rootElements = rootElement?.rootElements || [];
    const process = rootElements.find((el: any) => el.$type === 'bpmn:Process');
    if (process) return process;

    const collaboration = rootElements.find((el: any) => el.$type === 'bpmn:Collaboration');
    const participant = collaboration?.participants?.find((item: any) => item.processRef);
    return participant?.processRef || null;
  }

  private getBpmnElementProperties(element: any): Record<string, string> {
    const bo = element?.businessObject || element;
    const result: Record<string, string> = {};
    if (!bo?.extensionElements?.values) return result;

    for (const ext of bo.extensionElements.values) {
      if (ext.$type !== 'camunda:properties') continue;
      const values = ext.values || ext.$children || [];
      for (const property of values) {
        if (property?.name && property.value !== undefined) {
          result[property.name] = String(property.value);
        }
      }
    }

    return result;
  }

  private getLaneRoleCodes(lane: any, properties: Record<string, string>): string[] {
    const rawValues = [properties.candidateGroupsCode, properties.candidateGroups].filter(Boolean) as string[];
    if (rawValues.length === 0 && lane?.name) {
      rawValues.push(lane.name);
    }

    const roles = rawValues.flatMap((value) => this.splitRoleCodes(value));
    return Array.from(new Set(roles));
  }

  private getFlowTargetNode(flow: any, indexes: ParsedBpmnActionIndexes): any | null {
    const targetId = flow?.targetRef?.id;
    return targetId ? indexes.nodes.get(targetId) || flow.targetRef : null;
  }

  private isBpmnGateway(node: any): boolean {
    return Boolean(node && (
      node.$type === 'bpmn:ExclusiveGateway' ||
      node.$type === 'bpmn:InclusiveGateway' ||
      node.$type === 'bpmn:ParallelGateway'
    ));
  }

  private hasBpmnActionMetadata(flow: any, extProps: Record<string, string>): boolean {
    return Boolean(
      extProps.actionCode ||
      extProps.actionType ||
      extProps.actionLabel ||
      extProps.actionGroup ||
      extProps.flagsButton ||
      flow?.name
    );
  }

  private toBpmnNodeInfo(node: any): any | null {
    if (!node) return null;
    return {
      id: node.id,
      name: node.name || null,
      type: node.$type || null,
    };
  }

  private decodeBpmnXml(value: string): string {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.includes('<') && raw.toLowerCase().includes('definitions')) {
      return raw;
    }

    const base64Part = raw.startsWith('data:') && raw.includes(',')
      ? raw.slice(raw.indexOf(',') + 1)
      : raw;
    const decoded = Buffer.from(base64Part, 'base64').toString('utf8');
    if (decoded.includes('<') && decoded.toLowerCase().includes('definitions')) {
      return decoded;
    }

    return raw;
  }

  private permissionIncludes(permissions: any, value?: string): boolean {
    if (!value || !Array.isArray(permissions)) return false;
    const normalizedValue = this.normalizeRoleCode(value);
    return permissions.some((permission: any) => this.normalizeRoleCode(permission) === normalizedValue);
  }

  private splitRoleCodes(value?: string): string[] {
    if (!value) return [];
    return String(value)
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private parseRolesDynamic(value: any): any[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private normalizeBpmnActionDedupeKey(value?: any): string {
    return String(value || '')
      .normalize('NFC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLocaleLowerCase('vi-VN');
  }

  private normalizeRoleCode(value?: any): string {
    return String(value || '').trim().toLowerCase();
  }

  async findByProcessKeyAndRoleCode(queryParams: {
    processKey?: string;
    roleCode?: string | string[];
    exact?: string;
  }): Promise<any> {
    const { processKey, roleCode, exact } = queryParams;

    const qb = this.roleFeatureRepository.createQueryBuilder('rf');

    // ===== processKey =====
    if (processKey) {
      if (exact === 'true') {
        qb.andWhere('rf.processKey = :processKey', { processKey });
      } else {
        qb.andWhere('rf.processKey LIKE :processKey', {
          processKey: `%${processKey}%`,
        });
      }
    }

    const records = await qb.getMany();

    // ===== roleCode: filter ở tầng JS vì roles là JSON column =====
    let result = records.filter(
      (record) => Array.isArray(record.roles) && record.roles.length > 0,
    );

    if (roleCode) {
      const targetCodes = Array.isArray(roleCode)
        ? roleCode.map((c) => c.toLowerCase())
        : [roleCode.toLowerCase()];

      result = result.filter((record) => {
        // Chỉ giữ các record có ít nhất 1 role khớp roleCode (so sánh chính xác, không phải contains)
        const matchedRoles = (record.roles as any[]).filter((role) =>
          targetCodes.some((rc) => role.roleCode?.toLowerCase() === rc),
        );
        return matchedRoles.length > 0;
      });
    }

    return result.map((record) => ({
      ...record,
      _id: record.id,
    }));
  }

  async findOneByProcessKey(processKey: string): Promise<any> {
    try {
      const roleFeature = await this.roleFeatureRepository.findOne({
        where: { processKey },
      });

      if (!roleFeature) {
        throw new NotFoundException(
          `RoleFeature with processKey "${processKey}" not found`,
        );
      }

      // Lấy tất cả user IDs từ các roles
      const allUserIds = new Set<string>();
      if (Array.isArray(roleFeature.roles)) {
        roleFeature.roles.forEach((role: any) => {
          if (Array.isArray(role.users)) {
            role.users.forEach((u: any) => {
              if (!u) return;
              if (typeof u === 'string') {
                allUserIds.add(u);
              } else if (typeof u === 'object') {
                const uId = u.id || u._id || u.userId;
                if (uId && typeof uId === 'string') {
                  allUserIds.add(uId);
                }
              }
            });
          }
        });
      }

      // Fetch thông tin users từ database
      const usersMap = new Map<string, { id: string; name: string }>();
      if (allUserIds.size > 0) {
        const userIdArray = Array.from(allUserIds);
        const userChunks = chunkArray(userIdArray, 1000);
        const users: UserEntity[] = [];
        for (const chunk of userChunks) {
          const chunkUsers = await this.userRepository.find({
            where: { id: In(chunk) },
            select: ['id', 'name'], // Chỉ lấy id và name
          });
          users.push(...chunkUsers);
        }

        users.forEach(user => {
          usersMap.set(user.id, {
            id: user.id,
            name: user.name || 'Unknown', // Fallback nếu name null
          });
        });
      }

      return {
        _id: roleFeature.id,
        ...roleFeature,
        roles: Array.isArray(roleFeature.roles)
          ? roleFeature.roles.map((role: any) => ({
            ...role,
            _id: role.id,
            users: Array.isArray(role.users)
              ? role.users
                .map((u: any) => {
                  const uId = typeof u === 'string' ? u : (u?.id || u?._id || u?.userId);
                  if (!uId) return u;
                  return usersMap.get(uId);
                })
                .filter(user => user) // Loại bỏ các user không tìm thấy
              : [],
          }))
          : [],
      };
    } catch (err: any) {
      this.logger.error(`Error in findOneByProcessKey for processKey=${processKey}: ${err?.message || err}`, err?.stack);
      throw err;
    }
  }

  async update(
    processKey: string,
    updateDto: UpdateRoleFeatureSqlDto,
  ): Promise<RoleFeatureEntity> {
    const totalStart = Date.now();

    const tStartFindOne = Date.now();
    let roleFeature: any;
    try {
      roleFeature = await this.findOneByProcessKey(processKey);
      console.log(`[update] 1. findOneByProcessKey (Found): ${Date.now() - tStartFindOne}ms`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        console.log(`[update] 1. findOneByProcessKey (Not Found) - Creating new instance: ${Date.now() - tStartFindOne}ms`);
        // Tạo mới nếu chưa tồn tại
        const newEntity = this.roleFeatureRepository.create({
          id: uuidv4(),
          processKey: processKey,
          roles: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        roleFeature = await this.roleFeatureRepository.save(newEntity);
      } else {
        throw error;
      }
    }

    // Thu thập userId cũ đang có processKey này trước khi ghi đè (in-memory, không cần query DB)
    const tStartOldUsers = Date.now();
    const oldUserIds = new Set<string>();
    if (Array.isArray(roleFeature.roles)) {
      for (const role of roleFeature.roles as any[]) {
        if (Array.isArray(role.users)) {
          for (const u of role.users) {
            const uid = typeof u === 'string' ? u : u?.id;
            if (uid) oldUserIds.add(uid);
          }
        }
      }
    }
    console.log(`[update] 2. Collect oldUserIds: ${Date.now() - tStartOldUsers}ms (Count: ${oldUserIds.size})`);

    // Cập nhật processKey nếu có thay đổi
    roleFeature.processKey = updateDto.processKey;

    roleFeature.roles = updateDto.roles.map((roleDto) => ({
      id: uuidv4(), // Tạo id mới cho mỗi role khi cập nhật
      name: roleDto.name,
      roleCode: roleDto.roleCode,
      permissions: roleDto.permissions,
      users: (roleDto.users || []).filter((u) => u), // Lọc bỏ các giá trị null/undefined
    }));

    const tStartSaveRole = Date.now();
    const update = await this.roleFeatureRepository.save(roleFeature);
    console.log(`[update] 3. Save roleFeature: ${Date.now() - tStartSaveRole}ms`);

    // 4. Cập nhật rolesByProcess cho các users trong MSSQL
    if (updateDto.roles && Array.isArray(updateDto.roles) && updateDto.roles.length > 0) {
      const tStartParseNewRoles = Date.now();
      // Map userId -> Set of roles từ DTO mới
      const byUser = new Map<string, Set<{ name: string; roleCode: string }>>();

      for (const r of updateDto.roles) {
        const roleCode = r.roleCode?.trim();
        const name = r.name?.trim();
        if (!roleCode) continue;

        const users = Array.isArray(r.users) ? r.users : [];
        for (const uid of users) {
          if (!uid) continue;
          const userRoles = byUser.get(uid) || new Set();
          userRoles.add({ name, roleCode });
          byUser.set(uid, userRoles);
        }
      }

      // Hợp nhất: userId mới (từ DTO) + userId cũ (cần xóa/cập nhật processKey)
      // ❌ Không còn CAST + LIKE full table scan nữa
      const allUserIdsToUpdate = new Set<string>(oldUserIds);
      for (const uid of byUser.keys()) {
        if (uid) allUserIdsToUpdate.add(uid);
      }
      console.log(`[update] 4. Parse DTO roles & build Map: ${Date.now() - tStartParseNewRoles}ms (Total users to update: ${allUserIdsToUpdate.size})`);

      if (allUserIdsToUpdate.size > 0) {
        const tStartQueryUsers = Date.now();
        // ✅ Query bằng Primary Key (clustered index) - cực nhanh
        const userIdArray = Array.from(allUserIdsToUpdate);
        const userChunks = chunkArray(userIdArray, 1000);
        const usersToUpdate: UserEntity[] = [];
        let modifiedUsers: UserEntity[] = [];
        for (const chunk of userChunks) {
          const chunkUsers = await this.userRepository.find({
            where: { id: In(chunk) },
            select: ['id', 'rolesByProcess'],
          });
          usersToUpdate.push(...chunkUsers);
        }
        console.log(`[update] 5. Query users by Primary Key chunks: ${Date.now() - tStartQueryUsers}ms (Fetched: ${usersToUpdate.length} users)`);

        const tStartProcessAndSaveUsers = Date.now();
        let totalSaveTime = 0;
        let saveBatchCount = 0;

        for (const user of usersToUpdate) {
          if (!Array.isArray(user.rolesByProcess)) {
            user.rolesByProcess = [];
          }

          const existingIndex = user.rolesByProcess.findIndex(
            (rp: any) => rp.processKey === processKey
          );

          const currentRoles = byUser.get(user.id);
          const roleObject = currentRoles ? Array.from(currentRoles) : [];

          const existingRoles = existingIndex >= 0 ? (user.rolesByProcess[existingIndex].roles || []) : [];
          const groupRolesToKeep = existingRoles.filter((r: any) => r.__groupId);

          const mergedRoles = [
            ...roleObject.map(r => ({ roleCode: r.roleCode, name: r.name })),
            ...groupRolesToKeep,
          ];

          // Deduplicate
          const uniqueMergedRoles: any[] = [];
          const seen = new Set<string>();
          for (const r of mergedRoles) {
            const key = r.roleCode + ((r as any).__groupId || '');
            if (!seen.has(key)) {
              seen.add(key);
              uniqueMergedRoles.push(r);
            }
          }

          if (uniqueMergedRoles.length > 0) {
            if (existingIndex >= 0) {
              user.rolesByProcess[existingIndex].roles = uniqueMergedRoles;
            } else {
              // User mới được thêm vào processKey này
              (user.rolesByProcess as any[]).push({ processKey, roles: uniqueMergedRoles });
            }
          } else {
            // User không còn trong role nào → xóa entry processKey
            if (existingIndex >= 0) {
              user.rolesByProcess.splice(existingIndex, 1);
            }
          }

          modifiedUsers.push(user);
          // ✅ Flush mỗi 100 user: giảm peak memory, không đợi hết vòng lặp
          if (modifiedUsers.length >= 100) {
            const tStartSaveBatch = Date.now();
            await this.userRepository.save(modifiedUsers);
            totalSaveTime += Date.now() - tStartSaveBatch;
            saveBatchCount++;
            modifiedUsers = [];
          }
        }
        // Save phần còn lại chưa đủ 100
        if (modifiedUsers.length > 0) {
          const tStartSaveBatch = Date.now();
          await this.userRepository.save(modifiedUsers);
          totalSaveTime += Date.now() - tStartSaveBatch;
          saveBatchCount++;
        }
        console.log(`[update] 6. Process + Save Users in batches: ${Date.now() - tStartProcessAndSaveUsers}ms (User save duration: ${totalSaveTime}ms across ${saveBatchCount} batches)`);
      }
    }

    // 🔄 ĐỒNG BỘ SONG SONG VÀO BẢNG QUAN HỆ CHUẨN roles_process VÀ roles_process_users
    try {
      console.log(`[update] Syncing to roles_process for processKey: ${processKey}`);

      // 1. Lấy tất cả các roles_process hiện tại của processKey này kèm quan hệ
      const existingRoles = await this.rolesProcessRepository.find({
        where: { processKey },
        relations: ['users', 'groups']
      });
      const existingMap = new Map(existingRoles.map(r => [r.roleCode.trim(), r]));

      const incomingRoleCodes = new Set((updateDto.roles || []).map(r => r.roleCode.trim()));

      // 2. Xóa các roles_process không còn xuất hiện trong thiết kế mới
      const rolesToRemove = existingRoles.filter(r => !incomingRoleCodes.has(r.roleCode.trim()));
      if (rolesToRemove.length > 0) {
        await this.rolesProcessRepository.remove(rolesToRemove);
      }

      // 3. Tạo mới hoặc cập nhật các roles_process từ updateDto
      if (updateDto.roles && updateDto.roles.length > 0) {
        const allowDiffMap = await this.getAllowDifferentRoomMap(processKey);
        for (const roleDto of updateDto.roles) {
          const userIds = (roleDto.users || []).filter((u) => u);

          // Load full user entities cho cascade insert
          const users = userIds.length > 0
            ? await this.userRepository.find({ where: { id: In(userIds) } })
            : [];

          const isAllowDiff = allowDiffMap.get(roleDto.roleCode.trim()) || false;
          const description = isAllowDiff ? 'AllowDifferentRoom' : null;

          const existingRole = existingMap.get(roleDto.roleCode.trim());
          if (existingRole) {
            // Cập nhật bản ghi cũ để giữ nguyên ID và các liên kết nhóm (groups)
            existingRole.roleName = roleDto.name;
            existingRole.description = description;
            existingRole.users = users;
            existingRole.processKey = updateDto.processKey || processKey;
            await this.rolesProcessRepository.save(existingRole);
          } else {
            // Tạo mới nếu chưa có
            const newRoleProcess = this.rolesProcessRepository.create({
              id: uuidv4(),
              roleCode: roleDto.roleCode,
              roleName: roleDto.name,
              processKey: updateDto.processKey || processKey,
              description,
              isActive: true,
              users,
              groups: [],
            });
            await this.rolesProcessRepository.save(newRoleProcess);
          }
        }
      }
      console.log(`[update] Successfully synced to roles_process and roles_process_users!`);
    } catch (err) {
      this.logger.error(`Failed to sync roles_process during update: ${err?.message}`, err);
    }

    console.log(`[update] TOTAL TIME: ${Date.now() - totalStart}ms`);
    return update;
  }


  async updateOld(
    processKey: string,
    updateDto: UpdateRoleFeatureSqlDto,
  ): Promise<RoleFeatureEntity> {
    const totalStart = Date.now();

    const tStartFindOne = Date.now();
    const roleFeature = await this.findOneByProcessKey(processKey);
    console.log(`[updateOld] 1. findOneByProcessKey: ${Date.now() - tStartFindOne}ms`);

    // Cập nhật processKey nếu có thay đổi
    roleFeature.processKey = updateDto.processKey;

    roleFeature.roles = updateDto.roles.map((roleDto) => ({
      id: uuidv4(), // Tạo id mới cho mỗi role khi cập nhật
      name: roleDto.name,
      roleCode: roleDto.roleCode,
      permissions: roleDto.permissions,
      users: (roleDto.users || []).filter((u) => u), // Lọc bỏ các giá trị null/undefined
    }));

    const tStartSaveRole = Date.now();
    const update = await this.roleFeatureRepository.save(roleFeature);
    console.log(`[updateOld] 2. Save roleFeature: ${Date.now() - tStartSaveRole}ms`);

    // 4. Cập nhật rolesByProcess cho các users trong MSSQL
    if (updateDto.roles && Array.isArray(updateDto.roles) && updateDto.roles.length > 0) {
      const tStartParseNewRoles = Date.now();
      // Map userId -> Set of roles từ DTO mới
      const byUser = new Map<string, Set<{ name: string; roleCode: string }>>();

      for (const r of updateDto.roles) {
        const roleCode = r.roleCode?.trim();
        const name = r.name?.trim();
        if (!roleCode) continue;

        const users = Array.isArray(r.users) ? r.users : [];
        for (const uid of users) {
          if (!uid) continue;
          const userRoles = byUser.get(uid) || new Set();
          userRoles.add({ name, roleCode });
          byUser.set(uid, userRoles);
        }
      }
      console.log(`[updateOld] 3. Parse DTO roles & build Map: ${Date.now() - tStartParseNewRoles}ms`);

      // Lấy tất cả users có processKey này trong rolesByProcess (dùng raw query cho MSSQL)
      const tStartQueryUsersWithProcess = Date.now();
      const usersWithThisProcess: any[] = await this.userRepository
        .createQueryBuilder('u')
        .where(`CAST(u.roles_by_process AS NVARCHAR(MAX)) LIKE '%' + :processKey + '%'`, { processKey })
        .getMany();
      console.log(`[updateOld] 4. Query users with LIKE scan: ${Date.now() - tStartQueryUsersWithProcess}ms (Found: ${usersWithThisProcess.length} users)`);

      const tStartProcessUsers = Date.now();
      const userIdsToUpdate = new Set<string>();

      // Update từng user
      for (const user of usersWithThisProcess) {
        if (!user.rolesByProcess || !Array.isArray(user.rolesByProcess)) continue;

        const existingIndex = user.rolesByProcess.findIndex(
          (rp: any) => rp.processKey === processKey
        );

        if (existingIndex < 0) continue;

        const currentRoles = byUser.get(user.id);
        const roleObject = currentRoles
          ? Array.from(currentRoles)
          : []; // Nếu user không còn trong DTO mới → xóa hết roles

        const existingRoles = user.rolesByProcess[existingIndex].roles || [];
        const groupRolesToKeep = existingRoles.filter((r: any) => r.__groupId);

        const mergedRoles = [...roleObject.map(r => ({
          roleCode: r.roleCode,
          name: r.name,
        })), ...groupRolesToKeep];

        // Deduplicate
        const uniqueMergedRoles: any[] = [];
        const seen = new Set();
        for (const r of mergedRoles) {
          const key = r.roleCode + (r.__groupId || '');
          if (!seen.has(key)) {
            seen.add(key);
            uniqueMergedRoles.push(r);
          }
        }

        // Cập nhật roles cho processKey
        if (uniqueMergedRoles.length > 0) {
          user.rolesByProcess[existingIndex].roles = uniqueMergedRoles;
        } else {
          // User không còn trong role nào của processKey này → xóa entry
          user.rolesByProcess.splice(existingIndex, 1);
        }

        userIdsToUpdate.add(user.id);
      }
      console.log(`[updateOld] 5. Process roles in-memory: ${Date.now() - tStartProcessUsers}ms`);

      // Lưu tất cả users có thay đổi
      if (userIdsToUpdate.size > 0) {
        const tStartQueryUsersToSave = Date.now();
        const userIdArray = Array.from(userIdsToUpdate);
        const userChunks = chunkArray(userIdArray, 1000);
        const usersToSave: UserEntity[] = [];
        for (const chunk of userChunks) {
          const chunkUsers = await this.userRepository.find({
            where: { id: In(chunk) },
          });
          usersToSave.push(...chunkUsers);
        }
        console.log(`[updateOld] 6. Query full UserEntities to save: ${Date.now() - tStartQueryUsersToSave}ms (Fetched: ${usersToSave.length} users)`);

        const tStartSaveUsersOneByOne = Date.now();
        for (const user of usersToSave) {
          await this.userRepository.save(user);
        }
        console.log(`[updateOld] 7. Save users one-by-one: ${Date.now() - tStartSaveUsersOneByOne}ms`);
      }
    }
    console.log(`[updateOld] TOTAL TIME: ${Date.now() - totalStart}ms`);
    return update;
  }



  async remove(processKey: string): Promise<void> {
    const roleFeature = await this.findOneByProcessKey(processKey);
    await this.roleFeatureRepository.remove(roleFeature);
  }

  // async syncFromMongo(): Promise<{
  //   total: number;
  //   synced: number;
  //   errors: any[];
  // }> {
  //   const mongoRoleFeatures: RoleFeatureDocument[] = await this.roleFeatureModel
  //     .find()
  //     .populate('roles.users')
  //     .exec();

  //   if (!mongoRoleFeatures || mongoRoleFeatures.length === 0) {
  //     return { total: 0, synced: 0, errors: [] };
  //   }

  //   const total = mongoRoleFeatures.length;
  //   const errors: any[] = [];
  //   let syncedCount = 0;

  //   const mongoProcessKeys = mongoRoleFeatures.map((rf) => rf.processKey);
  //   const existingSqlRoleFeatures = await this.roleFeatureRepository.find({
  //     where: { processKey: In(mongoProcessKeys) },
  //   });
  //   const sqlRoleFeatureMap = new Map(
  //     existingSqlRoleFeatures.map((rf) => [rf.processKey, rf]),
  //   );

  //   for (const mongoDoc of mongoRoleFeatures) {
  //     try {
  //       const rolesData = mongoDoc.roles.map((role) => ({
  //         name: role.name,
  //         roleCode: role.roleCode,
  //         permissions: role.permissions,
  //         users: (role.users || []).map((user: any) => user._id.toString()),
  //       }));

  //       const dto: UpdateRoleFeatureSqlDto = {
  //         processKey: mongoDoc.processKey,
  //         roles: rolesData,
  //       };

  //       const existingEntity = sqlRoleFeatureMap.get(mongoDoc.processKey);

  //       if (existingEntity) {
  //         // Update: Merge DTO vào entity đã tồn tại
  //         // Điều này giữ lại `createdAt` và tự động cập nhật `updatedAt`
  //         existingEntity.processKey = dto.processKey;
  //         existingEntity.roles = dto.roles.map((roleDto) => ({
  //           id: uuidv4(),
  //           ...roleDto,
  //         }));
  //         await this.roleFeatureRepository.save(existingEntity);
  //       } else {
  //         // Create: Tạo entity mới và gán ngày tháng từ document của Mongo
  //         const newEntity = this.roleFeatureRepository.create({
  //           ...dto,
  //           id: uuidv4(),
  //           createdAt: mongoDoc.createdAt || new Date(),
  //           updatedAt: mongoDoc.updatedAt || new Date(),
  //         });
  //         await this.roleFeatureRepository.save(newEntity);
  //       }
  //       syncedCount++;
  //     } catch (e) {
  //       errors.push({
  //         id: (mongoDoc as any)._id,
  //         processKey: mongoDoc.processKey,
  //         error: e.message,
  //       });
  //     }
  //   }

  //   return {
  //     total,
  //     synced: syncedCount,
  //     errors,
  //   };
  // }
  async reloadRoleInfo(processKey: string, data: UpdateRoleFeatureSqlDto): Promise<RoleFeatureEntity> {
    // 1. Lấy entity từ DB
    const oldRoleFeature = await this.roleFeatureRepository.findOne({ where: { processKey } });

    if (!oldRoleFeature) {
      throw new NotFoundException(`RoleFeature with processKey "${processKey}" not found`);
    }

    // 2. Đồng bộ roles
    data.roles?.forEach(role => {
      const oldRole = oldRoleFeature.roles.find(r => r.roleCode === role.roleCode);
      if (!oldRole) return;

      // Giữ nguyên permissions và users từ DB cũ
      role.permissions = oldRole.permissions;
      role.users = oldRole.users;
    });

    // 3. Cập nhật entity
    oldRoleFeature.roles = data.roles || [];

    // 4. Lưu lại
    const updated = await this.roleFeatureRepository.save(oldRoleFeature);

    // 🔄 ĐỒNG BỘ SONG SONG VÀO BẢNG roles_process
    try {
      // 1. Lấy tất cả các roles_process hiện tại của processKey này kèm quan hệ
      const existingRoles = await this.rolesProcessRepository.find({
        where: { processKey },
        relations: ['users', 'groups']
      });
      const existingMap = new Map(existingRoles.map(r => [r.roleCode.trim(), r]));

      const incomingRoleCodes = new Set((data.roles || []).map(r => r.roleCode.trim()));

      // 2. Xóa các roles_process không còn xuất hiện trong thiết kế mới
      const rolesToRemove = existingRoles.filter(r => !incomingRoleCodes.has(r.roleCode.trim()));
      if (rolesToRemove.length > 0) {
        await this.rolesProcessRepository.remove(rolesToRemove);
      }

      // 3. Tạo mới hoặc cập nhật các roles_process từ data
      if (data.roles && data.roles.length > 0) {
        const allowDiffMap = await this.getAllowDifferentRoomMap(processKey);
        for (const roleDto of data.roles) {
          const userIds = (roleDto.users || []).filter((u) => u);
          const users = userIds.length > 0
            ? await this.userRepository.find({ where: { id: In(userIds) } })
            : [];

          const isAllowDiff = allowDiffMap.get(roleDto.roleCode.trim()) || false;
          const description = isAllowDiff ? 'AllowDifferentRoom' : null;

          const existingRole = existingMap.get(roleDto.roleCode.trim());
          if (existingRole) {
            // Cập nhật bản ghi cũ để giữ nguyên ID và các liên kết nhóm (groups)
            existingRole.roleName = roleDto.name;
            existingRole.description = description;
            existingRole.users = users;
            await this.rolesProcessRepository.save(existingRole);
          } else {
            // Tạo mới nếu chưa có
            const newRoleProcess = this.rolesProcessRepository.create({
              id: uuidv4(),
              roleCode: roleDto.roleCode,
              roleName: roleDto.name,
              processKey: processKey,
              description,
              isActive: true,
              users,
              groups: [],
            });
            await this.rolesProcessRepository.save(newRoleProcess);
          }
        }
      }
      this.logger.log(`[reloadRoleInfo] Successfully synced to roles_process for processKey: ${processKey}`);
    } catch (err) {
      this.logger.error(`[reloadRoleInfo] Failed to sync roles_process: ${err?.message}`, err);
    }

    return updated;
  }

  private async getAllowDifferentRoomMap(processKey: string): Promise<Map<string, boolean>> {
    const allowDifferentRoomMap = new Map<string, boolean>();
    try {
      const bpmnDesign = await this.bpmnDesignRepository.findOne({
        where: [
          { id: processKey },
          { processKey: processKey }
        ],
        select: ['base64File']
      });

      if (bpmnDesign && bpmnDesign.base64File) {
        const xmlContent = Buffer.from(bpmnDesign.base64File, 'base64').toString('utf8');
        const BpmnModdle = require('bpmn-moddle');
        const moddle = new BpmnModdle();
        const { rootElement } = await moddle.fromXML(xmlContent);

        const processes = (rootElement?.rootElements || []).filter((e: any) => e.$type === 'bpmn:Process');
        for (const process of processes) {
          for (const laneSet of process.laneSets || []) {
            for (const lane of laneSet.lanes || []) {
              const properties: Record<string, string> = {};
              const bo = lane?.businessObject || lane;
              if (bo?.extensionElements?.values) {
                for (const ext of bo.extensionElements.values) {
                  if (ext.$type === 'camunda:properties') {
                    const values = ext.values || ext.$children || [];
                    for (const p of values) {
                      if (p?.name && p?.value !== undefined) {
                        properties[p.name] = p.value;
                      }
                    }
                  }
                }
              }
              const roleCode = properties.candidateGroupsCode || properties.candidateGroups;
              if (roleCode) {
                const allowDiff = properties.AllowDifferentRoom === 'true';
                allowDifferentRoomMap.set(roleCode.trim(), allowDiff);
              }
            }
          }
        }
      }
    } catch (err) {
      this.logger.error(`Error in getAllowDifferentRoomMap for processKey=${processKey}: ${err.message}`, err.stack);
    }
    return allowDifferentRoomMap;
  }

  /**
   * Chỉ update processKey trong role_feature mà KHÔNG thay đổi roles hay description.
   * Dùng khi đổi tên processKey trong BPMN design.
   */
  async updateProcessKeyOnly(
    oldProcessKey: string,
    newProcessKey: string,
  ): Promise<RoleFeatureEntity> {
    const roleFeature = await this.roleFeatureRepository.findOne({
      where: { processKey: oldProcessKey },
    });

    if (!roleFeature) {
      throw new NotFoundException(
        `RoleFeature with processKey ${oldProcessKey} not found`,
      );
    }

    roleFeature.processKey = newProcessKey;
    return this.roleFeatureRepository.save(roleFeature);
  }
}
