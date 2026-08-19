/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { RoleFeatureEntity } from '../role-feature/role-feature-sql/role-feature.entity';
import { OrganizationUnitEntity } from '../organization-unit/organization-unit_sql/organization-unit.entity';
import { getUserFlowConfig } from 'src/utils/util';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';

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
export class MeetingScheduleService {
  constructor(
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(RoleFeatureEntity, 'mssqlConnection')
    private readonly roleFeatureRepo: Repository<RoleFeatureEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly orgUnitRepo: Repository<OrganizationUnitEntity>,
    @InjectRepository(BpmnDesignEntity, 'mssqlConnection')
    private readonly bpmnRepo: Repository<BpmnDesignEntity>,
    private readonly sqlsvRepo: SQLSVRepository,
  ) { }

  /**
   * Lấy danh sách users trong luồng theo processKey cho SELECT "Trực chỉ huy"
   */
  async getCommandersByFlow(userId: string) {
    try {
      const bpmn = await getUserFlowConfig(this.sqlsvRepo, userId, 'ScheduleProcess');
      const processKey = bpmn?.flowConfig?.id;

      if (!processKey) {
        return {
          success: true,
          message: 'Không tìm thấy cấu hình luồng cho user',
          data: [],
        };
      }

      const docs = await this.roleFeatureRepo.find({
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
        return {
          success: true,
          message: 'Không có người dùng nào trong luồng',
          data: [],
        };
      }

      const users = await this.userRepo.find({
        where: {
          id: In([...userIds]),
          status: 1,
        },
        relations: ['parent'],
        order: { name: 'ASC' },
      });

      const data = users.map((user) => {
        const role = user.position ? (POSITION_MAP[user.position] || user.position) : null;
        const displayTitle = role ? `${user.name} - ${role}` : user.name;

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          codeND: user.codeND || null,
          position: user.position,
          title: displayTitle,
          parent: user.parent?.id || null,
          role,
          types: 'user',
          organizationUnit: user.parent ? {
            id: user.parent.id,
            name: user.parent.name,
            code: user.parent.code,
          } : null,
        };
      });

      return {
        success: true,
        message: 'Lấy danh sách trực chỉ huy theo luồng thành công',
        data,
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: 'Lấy danh sách trực chỉ huy theo luồng thất bại',
        errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
      });
    }
  }

  /**
   * Lấy danh sách đơn vị/phòng ban theo luồng với cấu trúc tree và users bên trong
   */
  async getOrganizationUnitsByFlow(userId: string) {
    try {
      const bpmn = await getUserFlowConfig(this.sqlsvRepo, userId, 'ScheduleProcess');
      const processKey = bpmn?.flowConfig?.id;

      if (!processKey) {
        return {
          success: true,
          message: 'Không tìm thấy cấu hình luồng cho user',
          data: [],
        };
      }

      const docs = await this.roleFeatureRepo.find({
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
        return {
          success: true,
          message: 'Không có dữ liệu trong luồng',
          data: [],
        };
      }

      const users = await this.userRepo.find({
        where: {
          id: In([...userIds]),
          status: 1,
        },
        relations: ['parent'],
        order: { name: 'ASC' },
      });

      const orgUnitIds = new Set<string>();
      for (const user of users) {
        if (user.parent?.id) {
          orgUnitIds.add(user.parent.id);
        }
      }

      const allOrgUnits = await this.orgUnitRepo.find({
        where: { status: 1 },
        order: { name: 'ASC' },
      });

      const orgUnitMap = new Map<string, any>();
      for (const unit of allOrgUnits) {
        orgUnitMap.set(unit.id, unit);
      }

      const relevantOrgUnitIds = new Set<string>(orgUnitIds);
      for (const unitId of orgUnitIds) {
        let currentUnit = orgUnitMap.get(unitId);
        while (currentUnit?.parentId) {
          relevantOrgUnitIds.add(currentUnit.parentId);
          currentUnit = orgUnitMap.get(currentUnit.parentId);
        }
      }

      const usersByOrgUnit = new Map<string, any[]>();
      for (const user of users) {
        const orgUnitId = user.parent?.id;
        if (orgUnitId) {
          if (!usersByOrgUnit.has(orgUnitId)) {
            usersByOrgUnit.set(orgUnitId, []);
          }
          const role = user.position ? (POSITION_MAP[user.position] || user.position) : null;
          const displayTitle = role ? `${user.name} - ${role}` : user.name;

          usersByOrgUnit.get(orgUnitId)!.push({
            id: user.id,
            name: user.name,
            username: user.username,
            codeND: user.codeND || null,
            position: user.position,
            title: displayTitle,
            role,
            types: 'user',
          });
        }
      }

      const buildTree = (parentId: string | null): any[] => {
        const children: any[] = [];

        for (const unit of allOrgUnits) {
          if (!relevantOrgUnitIds.has(unit.id)) continue;

          // Filter out DEFAULT_GROUP
          if (unit.code === 'DEFAULT_GROUP' || unit.name === 'DEFAULT_GROUP') continue;

          const unitParentId = unit.parentId || null;
          if (unitParentId === parentId) {
            const unitUsers = usersByOrgUnit.get(unit.id) || [];
            const unitChildren = buildTree(unit.id);

            children.push({
              id: unit.id,
              name: unit.name,
              code: unit.code,
              title: unit.code ? `${unit.name} (${unit.code})` : unit.name,
              type: unit.type || null,
              parentId: unit.parentId || null,
              types: 'organization_unit',
              users: unitUsers,
              children: unitChildren,
            });
          }
        }

        return children;
      };

      return {
        success: true,
        message: 'Lấy danh sách đơn vị/phòng ban theo luồng thành công',
        data: buildTree(null),
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: 'Lấy danh sách đơn vị/phòng ban theo luồng thất bại',
        errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
      });
    }
  }

  /**
   * Lấy danh sách users theo luồng cho SELECT "Cá nhân tham gia"
   */
  async getUsersByFlow(userId: string) {
    try {
      const bpmn = await getUserFlowConfig(this.sqlsvRepo, userId, 'ScheduleProcess');
      const processKey = bpmn?.flowConfig?.id;

      if (!processKey) {
        return {
          success: true,
          message: 'Không tìm thấy cấu hình luồng cho user',
          data: [],
        };
      }

      const docs = await this.roleFeatureRepo.find({
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
        return {
          success: true,
          message: 'Không có người dùng nào trong luồng',
          data: [],
        };
      }

      const users = await this.userRepo.find({
        where: {
          id: In([...userIds]),
          status: 1,
        },
        select: {
          id: true,
          name: true,
          codeND: true,
          position: true,
          username: true,
          parent: {
            id: true,
            name: true,
            code: true,
          },
        },
        relations: ['parent'],
        order: { name: 'ASC' },
      });

      const data = users.map((user) => {
        const role = user.position ? (POSITION_MAP[user.position] || user.position) : null;
        const displayTitle = role ? `${user.name} - ${role}` : user.name;

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          codeND: user.codeND || null,
          position: user.position,
          title: displayTitle,
          parent: user.parent?.id || null,
          role,
          types: 'user',
          organizationUnit: user.parent ? {
            id: user.parent.id,
            name: user.parent.name,
            code: user.parent.code,
          } : null,
        };
      });

      return {
        success: true,
        message: 'Lấy danh sách người dùng theo luồng thành công',
        data,
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: 'Lấy danh sách người dùng theo luồng thất bại',
        errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
      });
    }
  }

  async getOrganizationUnitsByFlowV2(userId: string) {
    try {
      const bpmn = await getUserFlowConfig(this.sqlsvRepo, userId, 'ScheduleProcess');
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
      const configuredOrgUnits = await this.orgUnitRepo.createQueryBuilder('unit')
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

      // 1. Tránh truy vấn lặp lại: Chỉ tính toán và lấy các ID phòng ban cha trung gian còn thiếu (chưa có trong danh sách configuredUnitIds)
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

        const parentId = normalizeUnitId(unit.parentId);
        if (parentId && !configuredUnitIds.has(parentId)) {
          missingParentIds.add(parentId);
        }
      }

      const allUnitIds = [...configuredUnitIds];

      // 2. Tối ưu Network RTT: Song song hóa việc lấy đơn vị cha còn thiếu và lấy danh sách users qua Promise.all.
      // Dùng OPENJSON để tránh lỗi SQL Server 2100 khi số lượng phần tử trong mảng lớn.
      // Sử dụng getRawMany cho cả phòng ban và users để tránh chi phí Hydration của TypeORM khi số lượng dữ liệu lớn (> 10k).
      const [missingOrgUnits, users] = await Promise.all([
        missingParentIds.size > 0
          ? this.orgUnitRepo.createQueryBuilder('unit')
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
        this.userRepo.createQueryBuilder('user')
          .innerJoin('user.parent', 'parent')
          .select([
            'user.id AS id',
            'user.name AS name',
            'user.username AS username',
            'user.codeND AS codeND',
            'user.position AS position',
            'parent.id AS parentId'
          ])
          .where('user.status = :status', { status: 1 })
          .andWhere('parent.id IN (SELECT value FROM OPENJSON(:allUnitIdsJson))', { allUnitIdsJson: JSON.stringify(allUnitIds) })
          .orderBy('user.name', 'ASC')
          .getRawMany(),
      ]);

      const allOrgUnits = [...configuredOrgUnits, ...missingOrgUnits];

      // Map users theo unit
      const usersByOrgUnit = new Map<string, any[]>();
      for (const user of users) {
        const orgUnitId = user.parentId;
        if (!orgUnitId) continue;

        if (!usersByOrgUnit.has(orgUnitId)) {
          usersByOrgUnit.set(orgUnitId, []);
        }

        const role = user.position ? (POSITION_MAP[user.position] || user.position) : null;
        const displayTitle = role ? `${user.name} - ${role}` : user.name;

        usersByOrgUnit.get(orgUnitId)!.push({
          id: user.id,
          name: user.name,
          username: user.username,
          codeND: user.codeND || null,
          position: user.position,
          title: displayTitle,
          role,
          types: 'user',
        });
      }

      // 3. Tối ưu dựng cây O(N): Nhóm trước các đơn vị theo parentId vào Map (Xử lý các phòng ban mồ côi làm gốc nếu không tìm thấy parentId trong allOrgUnits)
      const unitsByParent = new Map<string | null, OrganizationUnitEntity[]>();
      const allUnitIdsSet = new Set(allOrgUnits.map((u) => u.id));
      for (const unit of allOrgUnits) {
        let pId = normalizeUnitId(unit.parentId);
        if (pId && !allUnitIdsSet.has(pId)) {
          pId = null;
        }
        if (!unitsByParent.has(pId)) {
          unitsByParent.set(pId, []);
        }
        unitsByParent.get(pId)!.push(unit);
      }

      // 4. Thuật toán dựng cây phân cấp đệ quy tuyến tính O(N) (thay thế đệ quy lặp mảng O(N^2))
      const buildTree = (parentId: string | null): any[] => {
        const children: any[] = [];
        const directChildren = unitsByParent.get(parentId) || [];

        for (const unit of directChildren) {
          // Filter DEFAULT_GROUP
          if (unit.code === 'DEFAULT_GROUP' || unit.name === 'DEFAULT_GROUP') continue;

          const unitUsers = usersByOrgUnit.get(unit.id) || [];
          const unitChildren = buildTree(unit.id);

          children.push({
            id: unit.id,
            name: unit.name,
            code: unit.code,
            title: unit.code ? `${unit.name} (${unit.code})` : unit.name,
            type: unit.type || null,
            parentId: unit.parentId || null,
            types: 'organization_unit',
            users: unitUsers,
            children: unitChildren,
          });
        }

        return children;
      };

      return {
        success: true,
        message: 'Lấy danh sách đơn vị/phòng ban theo luồng thành công',
        data: buildTree(null),
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: 'Lấy danh sách đơn vị/phòng ban theo luồng thất bại',
        errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
      });
    }
  }

  async getOrganizationUnitsByFlowLazy(userId: string, parentId?: string, search?: string) {
    try {
      const bpmn = await getUserFlowConfig(this.sqlsvRepo, userId, 'ScheduleProcess');
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
      const configuredOrgUnits = await this.orgUnitRepo.createQueryBuilder('unit')
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

      const allUnitIds = [...configuredUnitIds];

      const [missingOrgUnits, users] = await Promise.all([
        missingParentIds.size > 0
          ? this.orgUnitRepo.createQueryBuilder('unit')
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
        this.userRepo.createQueryBuilder('user')
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

      const allOrgUnits = [...configuredOrgUnits, ...missingOrgUnits];

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

      // Case 2: parentId is provided (Lazy loading children)
      const normalizedParentId = normalizeUnitId(parentId);
      if (normalizedParentId) {
        const directSubUnits = getVisibleChildUnits(normalizedParentId);
        const directUsers = usersByOrgUnit.get(normalizedParentId) || [];

        const childrenNodes = directSubUnits
          .map(unit => ({
            id: unit.id,
            name: unit.name,
            code: unit.code,
            title: unit.name,
            type: unit.type || null,
            parentId: normalizedParentId,
            types: 'organization_unit',
            children: [],
            users: [],
            isLoaded: false,
            hasChildren: computeHasChildren(unit.id),
          }));

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
                children: childrenNodes,
                users: directUsers,
                isLoaded: true,
                hasChildren: childrenNodes.length > 0 || directUsers.length > 0,
              },
            ],
          };
        }

        return {
          success: true,
          message: 'Lấy danh sách đơn vị/phòng ban con thành công',
          data: [...childrenNodes, ...directUsers],
        };
      }

      // Case 3: Initial load (Return Level 1 roots + preloaded Level 2)
      const level1BaseUnits = getLevel1BaseUnits();
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

      const initialTree = level1BaseUnits
        .map(level1Unit => {
          const level2Units = getVisibleChildUnits(level1Unit.id)
            .map(level2Unit => ({
              id: level2Unit.id,
              name: level2Unit.name,
              code: level2Unit.code,
              title: level2Unit.name,
              type: level2Unit.type || null,
              parentId: level1Unit.id,
              types: 'organization_unit',
              children: [],
              users: [],
              isLoaded: false,
              hasChildren: computeHasChildren(level2Unit.id),
            }));

          const level2Users = usersByOrgUnit.get(level1Unit.id) || [];

          return {
            id: level1Unit.id,
            name: level1Unit.name,
            code: level1Unit.code,
            title: level1Unit.name,
            type: level1Unit.type || null,
            parentId: null,
            types: 'organization_unit',
            children: level2Units,
            users: level2Users,
            isLoaded: true,
            hasChildren: level2Units.length > 0 || level2Users.length > 0,
          };
        });

      return {
        success: true,
        message: 'Lấy danh sách đơn vị/phòng ban theo luồng thành công',
        data: [...initialTree, ...rootUsers],
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: 'Lấy danh sách đơn vị/phòng ban theo luồng thất bại',
        errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
      });
    }
  }

  async getUsersInCurrentOrgUnit(userId: string) {
    try {
      // 1. Lấy user hiện tại + phòng ban
      const currentUser = await this.userRepo.findOne({
        where: { id: userId, status: 1 },
        select: {
          id: true,
          parent: {
            id: true,
          },
        },
        relations: ['parent'],
      });

      if (!currentUser?.parent?.id) {
        return {
          success: true,
          message: 'User không thuộc phòng ban',
          data: [],
        };
      }

      const orgUnitId = currentUser.parent.id;

      // 2. Lấy phòng ban
      const orgUnit = await this.orgUnitRepo.findOne({
        where: { id: orgUnitId, status: 1 },
        select: ['id', 'name', 'code'],
      });

      if (!orgUnit) {
        return {
          success: true,
          message: 'Không tìm thấy phòng ban',
          data: [],
        };
      }

      // 3. Lấy users trong phòng ban đó
      const users = await this.userRepo.find({
        where: {
          status: 1,
          parent: { id: orgUnitId },
        },
        select: {
          id: true,
          name: true,
          codeND: true,
          position: true,
          username: true,
        },
        order: { name: 'ASC' },
      });

      // 4. Map dữ liệu trả ra
      return {
        success: true,
        message: 'Lấy danh sách người trong phòng ban thành công',
        data: [
          {
            id: orgUnit.id,
            name: orgUnit.name,
            code: orgUnit.code,
            types: 'organization_unit',
            users: users.map(user => {
              const role = user.position
                ? POSITION_MAP[user.position] || user.position
                : null;

              return {
                id: user.id,
                name: user.name,
                username: user.username,
                codeND: user.codeND || null,
                position: user.position,
                title: role ? `${user.name} - ${role}` : user.name,
                role,
                types: 'user',
              };
            }),
            children: [],
          },
        ],
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: 'Lấy danh sách người trong phòng ban thất bại',
        errors: [{ field: 'general', message: error.message }],
      });
    }
  }

}
