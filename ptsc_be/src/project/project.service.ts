import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { safeQuery } from '../app.module';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, In, IsNull } from 'typeorm';
import { ProjectEntity } from './entities/project.entity';
import { ProjectMemberEntity } from './entities/project-member.entity';
import { ProjectRolePermissionEntity } from './entities/project-permission.entity';
import { ProjectDisbursementEntity } from './entities/project-disbursement.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { TaskEntity } from 'src/task/entity/task.entity';
import { TaskUserEntity } from 'src/task/entity/task-user.entity';
import { NotificationService } from 'src/notifycation/notification.service';
import { NotificationType, NotificationKey } from 'src/notifycation/notification.enum';
import { ProcessTemplateEntity } from 'src/process-template/entities/process-template.entity';
import { ProcessTemplateTaskEntity } from 'src/process-template/entities/process-template-task.entity';
import { CreateTaskDto, TASK_TYPE } from 'src/task/dto/create-task.dto';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { TaskService } from 'src/task/task.service';
import { buildProgressView } from './projectProgress.util';
import { SystemLogTaskServiceSql } from 'src/task/dto/system-log-service-sql';
import { SystemLogDto } from 'src/task/dto/system-log';
import { CrmSourceEntity } from 'src/crmsource/entities/crmsource.entity';
import { CrmSourceDataEntity } from 'src/crmsource/entities/crmsource-data.entity';
import { RuntimeDbService } from '../bpmn/runtime-dbmssql.service';
import { BpmnEngineService, BpmnIndexes } from 'src/bpmn/bpmn-engine.service';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { MSSQLRepository } from '../database/sqlRepo.mssql';
import { MSSQL_REPO } from 'src/database/database.provider';
import { getAllNodeExtensionProperties } from 'src/utils/util';
import { Like } from 'typeorm';
import * as dayjs from 'dayjs';
import * as moment from 'moment';
import { validateAndParseSortParam, getDtoKeys } from 'src/utils/sort-validator.util';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { CreateProjectDisbursementDto } from './dto/create-project-disbursement.dto';
import { UpdateProjectDisbursementDto } from './dto/update-project-disbursement.dto';

@Injectable()
export class ProjectService implements OnModuleInit {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    @Inject(MSSQL_REPO) private readonly sqlRepo: MSSQLRepository,
    private readonly sqlsvRepo: SQLSVRepository,
    @InjectRepository(ProjectEntity, 'mssqlConnection')
    private readonly projectRepo: Repository<ProjectEntity>,
    @InjectRepository(ProjectMemberEntity, 'mssqlConnection')
    private readonly memberRepo: Repository<ProjectMemberEntity>,
    @InjectRepository(ProjectRolePermissionEntity, 'mssqlConnection')
    private readonly permissionRepo: Repository<ProjectRolePermissionEntity>,
    @InjectRepository(ProjectDisbursementEntity, 'mssqlConnection')
    private readonly disbursementRepo: Repository<ProjectDisbursementEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(CrmSourceEntity, 'mssqlConnection')
    private readonly crmSourceRepo: Repository<CrmSourceEntity>,
    @InjectRepository(CrmSourceDataEntity, 'mssqlConnection')
    private readonly crmSourceDataRepo: Repository<CrmSourceDataEntity>,
    @InjectRepository(TaskEntity, 'mssqlConnection')
    private readonly taskRepo: Repository<TaskEntity>,
    @InjectRepository(TaskUserEntity, 'mssqlConnection')
    private readonly taskUserRepo: Repository<TaskUserEntity>,
    @InjectRepository(ProcessTemplateTaskEntity, 'mssqlConnection')
    private readonly processTemplateTaskRepo: Repository<ProcessTemplateTaskEntity>,
    @InjectDataSource('mssqlConnection')
    private readonly dataSource: DataSource,
    private readonly systemLogTaskServiceSql: SystemLogTaskServiceSql,
    private readonly runtimeService: RuntimeDbService,
    private readonly bpmnEngine: BpmnEngineService,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => TaskService))
    private readonly taskService: TaskService,
  ) { }

  /**
   * Tự động tạo bảng project_disbursements nếu chưa tồn tại (vì synchronize: false)
   */
  async onModuleInit() {
    try {
      await safeQuery(this.dataSource, `
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='project_disbursements' AND xtype='U')
        BEGIN
            CREATE TABLE project_disbursements (
                id           INT IDENTITY(1,1) NOT NULL,
                projectId    INT NOT NULL,
                disbursementAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
                moneyUnit    DECIMAL(18,2) NULL,
                disbursementDate   DATETIME NULL,
                disbursedByUserId  NVARCHAR(100) NULL,
                notes        NVARCHAR(MAX) NULL,
                status       INT NOT NULL DEFAULT 1,
                createdAt    DATETIME NOT NULL DEFAULT GETDATE(),
                updatedAt    DATETIME NOT NULL DEFAULT GETDATE(),
                createdBy    NVARCHAR(100) NULL,
                CONSTRAINT PK_project_disbursements PRIMARY KEY CLUSTERED (id ASC),
                CONSTRAINT FK_project_disbursements_project
                    FOREIGN KEY (projectId) REFERENCES projects(id)
            );
            CREATE INDEX IDX_project_disbursements_projectId
                ON project_disbursements (projectId);
            CREATE INDEX IDX_project_disbursements_disbursedByUserId
                ON project_disbursements (disbursedByUserId);
        END
      `, []);

      await safeQuery(this.dataSource, `
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('projects') AND name = 'moneyUnit')
        BEGIN
            ALTER TABLE projects ADD moneyUnit DECIMAL(18,2) NULL DEFAULT 1;
        END
      `, []);

      await safeQuery(this.dataSource, `
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('project_disbursements') AND name = 'moneyUnit')
        BEGIN
            ALTER TABLE project_disbursements ADD moneyUnit DECIMAL(18,2) NULL;
        END
      `, []);

      // Tự sửa các bản ghi cũ bị lưu sai đơn vị tiền tệ giải ngân
      // (Vì giao diện luôn nhập VND nên tiền tệ giải ngân lưu đúng phải là 1)
      await safeQuery(this.dataSource, `
        UPDATE project_disbursements
        SET moneyUnit = 1
        WHERE moneyUnit IS NULL OR TRY_CAST(moneyUnit AS DECIMAL(18,2)) > 1.0
      `, []);
    } catch (error) {
      this.logger.error('Lỗi khi kiểm tra/tạo bảng project_disbursements & moneyUnit: ' + error.message);
    }
  }

  private mapProcessStatus(status?: number | string): string | null {
    const s = status !== undefined ? String(status) : undefined;
    const map: Record<string, string> = {
      1: 'Chuẩn bị',
      2: 'Đang thực hiện',
      3: 'Hoàn thành',
      4: 'Hủy',
      5: 'Tạm dừng'
    };
    return s ? (map[s] ?? s) : null;
  }

  private mapPriority(priority?: string): string {
    const p = String(priority);
    if (p === '1' || p === 'Gấp' || p === 'gap') return 'Gấp';
    if (p === '2' || p === 'Bình thường' || p === 'binhthuong') return 'Bình thường';
    return priority || '';
  }

  private getPriorityFlag(priority?: string): string {
    const p = String(priority ?? '').toLowerCase().trim();
    let flagColor = 'white'; // Mặc định

    if (p === '1' || p === 'gap' || p === 'gấp') {
      flagColor = '#EF4444'; // Đỏ cho Gấp
    } else if (p === '2' || p === 'binhthuong' || p === 'bình thường') {
      flagColor = '#ffffffff'; // Xanh cho Bình thường
    }

    return `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M6.5 1.75C6.5 1.55109 6.42098 1.36032 6.28033 1.21967C6.13968 1.07902 5.94891 1 5.75 1C5.55109 1 5.36032 1.07902 5.21967 1.21967C5.07902 1.36032 5 1.55109 5 1.75V21.75C5 21.9489 5.07902 22.1397 5.21967 22.2803C5.36032 22.421 5.55109 22.5 5.75 22.5C5.94891 22.5 6.13968 22.421 6.28033 22.2803C6.42098 22.1397 6.5 21.9489 6.5 21.75V1.75Z" fill="#4B5563"/>
<g filter="url(#filter0_d_9313_10393)">
<path d="M13.349 3.79048L13.145 3.70848C11.5819 3.08474 9.8715 2.92773 8.221 3.25648L6.5 3.60048V13.6005L8.22 13.2565C9.87082 12.9275 11.5816 13.0845 13.145 13.7085C14.8386 14.3855 16.7025 14.5118 18.472 14.0695L18.686 14.0165C18.9898 13.9406 19.2596 13.7654 19.4524 13.5186C19.6452 13.2718 19.75 12.9677 19.75 12.6545V5.28748C19.7499 5.10525 19.7084 4.92542 19.6284 4.76165C19.5485 4.59787 19.4324 4.45445 19.2887 4.34226C19.1451 4.23008 18.9779 4.15207 18.7996 4.11416C18.6214 4.07625 18.4368 4.07944 18.26 4.12348C16.6286 4.53105 14.9102 4.41518 13.349 3.79048Z" fill="${flagColor}"/>
<path d="M8.26953 3.50195C9.8724 3.18269 11.5338 3.3348 13.0518 3.94043L13.2559 4.02246C14.8659 4.66668 16.6381 4.7864 18.3203 4.36621C18.4603 4.33135 18.6069 4.32839 18.748 4.3584C18.889 4.38842 19.0212 4.45038 19.1348 4.53906C19.2484 4.6278 19.3401 4.74158 19.4033 4.87109C19.4665 5.00061 19.4999 5.143 19.5 5.28711V12.6543C19.5 12.9115 19.4141 13.1615 19.2559 13.3643C19.0974 13.5671 18.8747 13.7111 18.625 13.7734L18.4121 13.8271H18.4111C16.6929 14.2566 14.8829 14.1339 13.2383 13.4766H13.2373C11.6291 12.8348 9.86908 12.6733 8.1709 13.0117L6.75 13.2949V3.80469L8.26953 3.50195Z" stroke="black" stroke-opacity="0.3" stroke-width="0.5"/>
</g>
<defs>
<filter id="filter0_d_9313_10393" x="2.5" y="3.08887" width="21.25" height="19.2393" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="4"/>
<feGaussianBlur stdDeviation="2"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_9313_10393"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_9313_10393" result="shape"/>
</filter>
</defs>
</svg>`.trim();
  }

  private isUuid(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  private async generateTaskCode(
    typeCode?: string,
    unitCode?: string,
  ): Promise<string> {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const yearMonth = `${y}${m}`;

    const type = typeCode || 'CN';
    const unit = unitCode || 'UNIT';

    const prefix = `${type}-${unit}-${yearMonth}-`;
    const prefixLen = prefix.length;

    try {
      const result = await safeQuery(this.dataSource,
        `SELECT MAX(TRY_CAST(RIGHT(code, 5) AS INT)) as maxSeq
         FROM task WITH (NOLOCK)
         WHERE code LIKE @0
           AND LEN(code) = @1`,
        [`${prefix}%`, prefixLen + 5],
      );

      const maxSeq = result?.[0]?.maxSeq || 0;
      const nextSeq = String(maxSeq + 1).padStart(5, '0');

      return `${prefix}${nextSeq}`;
    } catch (error) {
      console.error('Error generating task code:', error);
      const rand = Math.floor(10000 + Math.random() * 89999);
      return `${prefix}${rand}`;
    }
  }

  private async createTasksFromTemplate(
    queryRunner: QueryRunner,
    templateId: string,
    projectId: number,
    userId: string
  ): Promise<void> {
    try {
      const templateTasks = await queryRunner.manager.find(ProcessTemplateTaskEntity, {
        where: { processTemplateId: templateId },
        order: { displayOrder: 'ASC' }
      });

      if (!templateTasks || templateTasks.length === 0) return;

      const project = await queryRunner.manager.findOne(ProjectEntity, { where: { id: projectId } });
      const projectStart = project?.startDate || new Date();

      const timeMap = new Map<string, { start: Date, end: Date }>();

      const addDuration = (date: Date, durationStr: string, unit: string): Date => {
        const d = dayjs(date);
        const amount = parseInt(durationStr) || 0;
        const u = (unit || '').toLowerCase();

        if (u.includes('ngày') || u.includes('day') || u.includes('ngay')) return d.add(amount, 'day').toDate();
        if (u.includes('giờ') || u.includes('hour') || u.includes('gio')) return d.add(amount, 'hour').toDate();
        if (u.includes('phút') || u.includes('minute') || u.includes('phut')) return d.add(amount, 'minute').toDate();

        return d.add(amount, 'day').toDate();
      };

      const calculateTime = (t: ProcessTemplateTaskEntity, visited = new Set<string>()) => {
        if (timeMap.has(t.id)) return timeMap.get(t.id);
        if (visited.has(t.id)) return { start: projectStart, end: addDuration(projectStart, t.executionTime, t.unit) };
        visited.add(t.id);
        let start: Date;
        if (t.dependency && this.isUuid(t.dependency)) {
          const depTask = templateTasks.find(dt => dt.id === t.dependency);
          const depTime = depTask ? calculateTime(depTask, visited) : null;
          if (depTime) {
            start = depTime.end;
          } else {
            start = projectStart;
          }
        } else {
          start = projectStart;
        }
        const end = addDuration(start, t.executionTime, t.unit);
        const times = { start, end };
        timeMap.set(t.id, times);
        return times;
      };

      templateTasks.forEach(t => calculateTime(t));

      const createRecursive = async (parentTemplateId: string | null, parentRealId: number | null) => {
        const children = templateTasks.filter(t => (t.parentId || null) === parentTemplateId);

        for (const t of children) {
          const times = timeMap.get(t.id);
          if (!times) continue;

          const dto: CreateTaskDto = {
            name: t.name,
            note: t.note,
            projectId: projectId,
            typeTask: TASK_TYPE.PROJECT,
            startDate: times.start,
            endDate: times.end,
            parent: parentRealId || 0,
            status: 1,
            processStatus: '1',
            progress: '0',
            assigners: [{ processId: userId, role: 'assigner', type: 1 }],
            // directors: [{ processId: userId, role: 'director', type: 1 }],
          };

          // Sử dụng taskService.createTaskforProject để tạo công việc có luồng đi (BPMN)
          const savedTask = await this.taskService.createTaskforProject(dto, userId, queryRunner, true, true);

          await createRecursive(t.id, savedTask.id);
        }
      };

      await createRecursive(null, null);

    } catch (error) {
      this.logger.error(`Error creating tasks from template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map project type code to display name from crm_source_data
   * Bước 1: Tìm source 'LOAIDUAN' trong crm_sources
   * Bước 2: Tìm data tương ứng trong crm_source_data với source_id và value
   * @param typeCode - Mã loại dự án (ví dụ: 'LOAIDUAN_001')
   * @returns Tên loại dự án hoặc mã gốc nếu không tìm thấy
   */
  private async mapProjectType(typeCode?: string): Promise<string> {
    if (!typeCode) return '';

    try {
      // Nếu typeCode là UUID → tìm trực tiếp theo id của crm_source_data
      if (this.isUuid(typeCode)) {
        const sourceDataById = await this.crmSourceDataRepo.findOne({
          where: { id: typeCode }
        });
        return sourceDataById?.title || typeCode;
      }

      // Nếu không phải UUID → tìm theo source LOAIDUAN + value (fallback cũ)
      const source = await this.crmSourceRepo.findOne({
        where: { code: 'LOAIDUAN' }
      });

      if (!source?.id) {
        this.logger.warn(`Source LOAIDUAN not found in crm_sources`);
        return typeCode;
      }

      const sourceData = await this.crmSourceDataRepo.findOne({
        where: {
          source_id: source.id,
          value: typeCode,
        }
      });

      return sourceData?.title || typeCode;
    } catch (error) {
      this.logger.warn(`Cannot map project type ${typeCode}: ${error.message}`);
      return typeCode;
    }
  }

  /**
   * Map giá trị moneyUnit với crm-source mã TIENTEDUAN
   */
  private async mapMoneyUnitDetail(moneyUnitValue?: number | string): Promise<{ id: string | null; title: string; value: string } | null> {
    if (moneyUnitValue == null) return null;

    try {
      const valStr = String(moneyUnitValue).trim();

      // 1. Nếu là UUID -> tìm trực tiếp theo id của crm_source_data
      if (this.isUuid(valStr)) {
        const sourceDataById = await this.crmSourceDataRepo.findOne({
          where: { id: valStr }
        });
        if (sourceDataById) {
          return {
            id: sourceDataById.id,
            title: sourceDataById.title || valStr,
            value: sourceDataById.value || valStr,
          };
        }
      }

      // 2. Tìm crm_sources với code = 'TIENTEDUAN'
      const source = await this.crmSourceRepo.findOne({
        where: { code: 'TIENTEDUAN' }
      });

      if (!source?.id) {
        return {
          id: null,
          title: valStr,
          value: valStr,
        };
      }

      // 3. Tìm crm_source_data thuộc crm_sources 'TIENTEDUAN'
      const sourceDataList = await this.crmSourceDataRepo.find({
        where: { source_id: source.id }
      });

      const matched = sourceDataList.find(d =>
        String(d.value).trim() === valStr ||
        String(d.id).trim() === valStr ||
        String(d.title).trim() === valStr
      );

      if (matched) {
        return {
          id: matched.id,
          title: matched.title || valStr,
          value: matched.value || valStr,
        };
      }

      return {
        id: null,
        title: valStr,
        value: valStr,
      };
    } catch (error) {
      this.logger.warn(`Cannot map moneyUnit ${moneyUnitValue}: ${error.message}`);
      return null;
    }
  }

  private mapProcessStatusToHtml(status?: number | string): string | null {
    const label = this.mapProcessStatus(status);
    if (!label) return null;
    return this.mapProcessStatusCodeToHtml(label);
  }

  private mapProcessStatusCodeToHtml(status: string): string {
    const s =
      typeof status === 'string' ? status.trim() : String(status ?? '').trim();

    switch (s) {
      case 'Chuẩn bị':
        return `<div style="
        display:flex;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        align-items:center;
        justify-content:center;
        width:100%;
        height:30px;
        padding:16px 26px;
        background: #E0E0E0;
        color:#555555;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        border: 1px solid #AEB5BE;
      ">Chuẩn bị</div>`.trim();

      case 'Đang thực hiện':
        return `<div style="
        display:flex;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        align-items:center;
        justify-content:center;
        width:100%;
        height:30px;
        padding:16px 26px;
        background: #DBEAFE;
        color:#0062AD;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        border: 1px solid #ACD0FF
      ">Đang thực hiện</div>`.trim();

      case 'Hoàn thành':
        return `<div style="
        display:flex;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        align-items:center;
        justify-content:center;
        width:100%;
        height:30px;
        padding:16px 26px;
        background: #D0FFDE;
        color:#007222;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        border: 1px solid #ADECC0;
      ">Hoàn thành</div>`.trim();

      case 'Hủy':
      case 'Huỷ':
        return `<div style="
        display:flex;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        align-items:center;
        justify-content:center;
        width:100%;
        height:30px;
        padding:16px 26px;
        background: #FEE2E2;
        color: #B91C1C;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        border: 1px solid #FCA5A5
      ">Huỷ</div>`.trim();

      case 'Tạm dừng':
        return `<div style="
        display:flex;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        align-items:center;
        justify-content:center;
        width:100%;
        height:30px;
        padding:16px 26px;
        background: #FEF9C2;
        color: #FFA600;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        border: 1px solid #FFD88F
      ">Tạm dừng</div>`.trim();

      default:
        return `<div style="
        display:flex;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        align-items:center;
        justify-content:center;
        width:100%;
        height:30px;
        padding:16px 26px;
        background:#fef9c2;
        color:#666;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
      ">${s || ''}</div>`.trim();
    }
  }

  private async createTaskSystemLogs(
    taskId: number,
    parentId: string | undefined,
    userId: string,
  ): Promise<void> {
    const timestamp = new Date().toISOString();

    // Log cho task hiện tại
    await this.createLogFromSystem({
      actions: 'POST',
      details: 'Tạo dự án',
      userInfo: userId,
      timestamps: timestamp,
      taskId: taskId.toString(),
    });

    // Nếu có parent, tạo thêm log cho task cha
    if (parentId) {
      await this.createLogFromSystem({
        actions: 'POST',
        details: 'Tạo công việc con',
        userInfo: userId,
        timestamps: timestamp,
        taskId: parentId.toString(),
      });
    }
  }

  async createLogFromSystem(systemLogDto: SystemLogDto): Promise<void> {

    const logData = {
      ...systemLogDto,
      timestamp: systemLogDto.timestamps || new Date().toISOString(),
      note: systemLogDto.note ?? systemLogDto.note,
    };

    try {
      await this.systemLogTaskServiceSql.create(logData);
    } catch (err) {
      console.error('[SYSTEM LOG] SQL create FAILED', err);
    }
  }

  /**
   * Tạo dự án mới với mã code tự sinh (DA-YYYYMMDD-XXXX)
   */
  async create(createProjectDto: CreateProjectDto, userId: string) {
    // Validate tên dự án
    if (!createProjectDto?.name || typeof createProjectDto.name !== 'string' || createProjectDto.name.trim() === '') {
      throw new BadRequestException('Tên dự án là bắt buộc và không được để trống.');
    }

    // VALIDATE BPMN + QUYỀN
    const docType = 'TaskProject';
    const { bpmnXML, flowId } = await this.validateBpmnAndPermission(userId, docType);

    // Validate ngày
    if (createProjectDto.startDate && createProjectDto.endDate) {
      if (new Date(createProjectDto.startDate) > new Date(createProjectDto.endDate)) {
        throw new BadRequestException('Ngày bắt đầu không được lớn hơn ngày kết thúc');
      }
    }

    // LẤY THÔNG TIN BPMN DESIGN theo docType trong related_processes
    const bpmnDesign = await safeQuery(this.dataSource,
      `SELECT id, name, document_type, related_processes
       FROM bpmn_design
       WHERE related_processes LIKE @0 AND status = 1`,
      [`%"${docType}"%`],
    );
    const bpmnCode = bpmnDesign && bpmnDesign.length > 0 ? bpmnDesign[0].id : docType;

    // BẮT ĐẦU TRANSACTION
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const code = await this.generateProjectCode();

      // 0. Chuẩn hóa dữ liệu numeric/date từ DTO (Frontend có thể gửi string)
      const projectData = {
        ...createProjectDto,
        priority: createProjectDto.priority ? createProjectDto.priority : '',
        projectStatus: createProjectDto.projectStatus ? createProjectDto.projectStatus : '1',
        budget: createProjectDto.budget ? Number(createProjectDto.budget) : 0,
        moneyUnit: createProjectDto.moneyUnit ? Number(createProjectDto.moneyUnit) : 1,
        progress: createProjectDto.progress ? Number(createProjectDto.progress) : 0,
        reminderDays: createProjectDto.reminderDays ? String(createProjectDto.reminderDays) : '3',
        startDate: createProjectDto.startDate ? new Date(createProjectDto.startDate) : null,
        endDate: createProjectDto.endDate ? new Date(createProjectDto.endDate) : null,
        managerId: createProjectDto.managerId ? createProjectDto.managerId : userId,
        organizationUnitId: Array.isArray(createProjectDto.organizationUnitId)
          ? createProjectDto.organizationUnitId.join(',')
          : (createProjectDto.organizationUnitId || null),
      };

      // 1. Tạo Project chính
      const newProject = queryRunner.manager.create(ProjectEntity, {
        ...projectData,
        code,
        createdBy: userId,
        status: 1,
      } as any);
      const savedProject = await queryRunner.manager.save(newProject);

      // 2. Tạo quyền mặc định cho 3 vai trò
      const roles = ['manager', 'member', 'viewer'];
      const defaultPermissions = roles.map(role => {
        const perm = queryRunner.manager.create(ProjectRolePermissionEntity, {
          projectId: savedProject.id,
          role,
          updateStatus: role === 'manager',
          updateGeneralInfo: role === 'manager',
          updateParticipants: role === 'manager',
          uploadFiles: ['manager', 'member'].includes(role),
          comment: true,
          inputDelayReason: role === 'manager',
          viewAnalysis: true,
          setPermissions: role === 'manager',
        });
        return perm;
      });
      await queryRunner.manager.save(defaultPermissions);

      // 3. Gán Manager (người tạo hoặc người được chọn làm manager)
      const managerIdStr = (createProjectDto as any).managerId || userId;
      const managerIds = managerIdStr.split(',').map((id: string) => id.trim()).filter(Boolean);
      for (const mId of managerIds) {
        // Kiểm tra user có tồn tại không
        const userExists = await queryRunner.manager.findOne(UserEntity, { where: { id: mId } });

        if (userExists) {
          const manager = queryRunner.manager.create(ProjectMemberEntity, {
            projectId: savedProject.id,
            userId: mId,
            role: 'manager',
          });
          await queryRunner.manager.save(manager);
        } else {
          this.logger.warn(`User ${mId} không tồn tại, bỏ qua việc gán manager cho dự án ${savedProject.code}`);
        }
      }

      // 4. Gán members và viewers vào dự án
      type ProjectUserInput = {
        projectId: number;
        userId: string;
        role: 'member' | 'viewer';
      };
      const arr: ProjectUserInput[] = [];
      if (createProjectDto.members) {
        const membersIds = createProjectDto.members.split(',');
        for (const memberId of membersIds) {
          arr.push({
            projectId: savedProject.id,
            userId: memberId,
            role: 'member'
          })
        }
      }
      if (createProjectDto.viewers) {
        const viewwerIds = createProjectDto.viewers.split(',');
        for (const viewwerId of viewwerIds) {
          arr.push({
            projectId: savedProject.id,
            userId: viewwerId,
            role: 'viewer'
          })
        }
      };
      for (const user of arr) {
        const userExists = await queryRunner.manager.findOne(UserEntity, { where: { id: user.userId } });
        if (userExists) {
          const member = queryRunner.manager.create(ProjectMemberEntity, {
            projectId: savedProject.id,
            userId: user.userId,
            role: user.role,
          });
          await queryRunner.manager.save(member);
        } else {
          this.logger.warn(`User ${user.userId} không tồn tại`);
        }
      }

      // 5. TẠO BPMN WORKITEMS + AUDIT (NEW)
      const supporters = arr.map(u => ({ processId: u.userId, type: 'USER' }));
      await this.createBpmnWorkItemsAndAudit(
        queryRunner,
        savedProject.id,
        {
          directors: managerIds.map(pmId => ({ processId: pmId, type: 'USER' })),
          supporters: supporters.length > 0 ? supporters : undefined,
        },
        bpmnXML,
        flowId,
        docType,
      );

      // 6. TỰ ĐỘNG TẠO CÔNG VIỆC TỪ QUY TRÌNH MẪU (NẾU CÓ)
      if (savedProject.process && this.isUuid(savedProject.process)) {
        await this.createTasksFromTemplate(queryRunner, savedProject.process, savedProject.id, userId);
      }

      await queryRunner.commitTransaction();

      // TẠO SYSTEM LOG
      await this.createTaskSystemLogs(savedProject.id, '', userId);

      // CẬP NHẬT TRẠNG THÁI DỰ ÁN (1 lần duy nhất sau khi tất cả task được tạo)
      await this.checkAndUpdateProjectStatus(savedProject.id);

      // Gửi thông báo cho manager, thành viên và người xem
      const managerIdsToNotify = managerIdStr.split(',').map((id: string) => id.trim()).filter(Boolean);
      const membersToNotify = [...managerIdsToNotify, ...arr.filter(u => u.role === 'member').map(u => u.userId)].filter(Boolean);
      const uniqueMemberIds = [...new Set(membersToNotify)];

      const viewersToNotify = arr.filter(u => u.role === 'viewer').map(u => u.userId).filter(Boolean);
      const uniqueViewerIds = [...new Set(viewersToNotify)];

      if (uniqueMemberIds.length > 0) {
        await this.notificationService.createForRecipients({
          recipientIds: uniqueMemberIds,
          senderId: userId,
          content: `Bạn được gán làm thành viên dự án: ${savedProject.name} (${savedProject.code})`,
          key: NotificationKey.VIEW_PROJECT,
          type: NotificationType.ADDED_TO_NEW_PROJECT_MEMBER.value,
          recordId: savedProject.id.toString(),
        });
      }

      if (uniqueViewerIds.length > 0) {
        await this.notificationService.createForRecipients({
          recipientIds: uniqueViewerIds,
          senderId: userId,
          content: `Bạn được thêm làm người xem dự án: ${savedProject.name} (${savedProject.code})`,
          key: NotificationKey.VIEW_PROJECT,
          type: NotificationType.ADDED_TO_NEW_PROJECT_VIEWER.value,
          recordId: savedProject.id.toString(),
        });
      }

      return savedProject;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Lỗi khi tạo dự án: ${error.message || error}`, error.stack);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      const message = error.message || '';
      if (
        message.includes('NULL') ||
        message.includes('does not allow nulls') ||
        message.includes('column') ||
        message.includes('table') ||
        message.includes('constraint') ||
        message.includes('truncated') ||
        message.includes('foreign key') ||
        message.includes('unique')
      ) {
        if (message.includes("column 'name'")) {
          throw new BadRequestException('Vui lòng nhập tên dự án.');
        }
        throw new BadRequestException('Vui lòng nhập đầy đủ các trường thông tin bắt buộc và kiểm tra lại định dạng dữ liệu.');
      }

      throw new InternalServerErrorException(`Lỗi khi tạo dự án: ${error.message || error}`);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(query: any, currentUserId?: string) {
    try {
      // Hỗ trợ cả filter[key] và key trực tiếp
      const filter = query.filter || {};
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const search = query.search;
      // Lấy giá trị từ filter hoặc query trực tiếp
      const q = filter.q || query.q;
      const name = filter.name || query.name;
      const code = filter.code || query.code;
      const description = filter.description || query.description;
      const typeProject = filter.typeProject || query.typeProject;
      const managerName = filter.managerName || query.managerName;
      const myProjects = filter.myProject || query.myProjects;
      const overdue = filter.overdue || query.overdue;
      const managerId = filter.managerId || query.managerId;
      const projectStatus = filter.projectStatus || query.projectStatus;
      const organizationUnitId = filter.organizationUnitId || query.organizationUnitId;
      const orderField = query?.sort || { createdAt: -1 };

      // Hỗ trợ cả 2 format: filter[startDateFrom] và filter[startDate][startDate]
      const startDateFrom = filter.startDateFrom || query.startDateFrom || filter.startDate?.startDate;
      const startDateTo = filter.startDateTo || query.startDateTo || filter.startDate?.endDate;
      const endDateFrom = filter.endDateFrom || query.endDateFrom || filter.endDate?.startDate;
      const endDateTo = filter.endDateTo || query.endDateTo || filter.endDate?.endDate;

      const priority = filter.priority || query.priority;

      // Helper function để parse date từ nhiều format dùng dayjs cho đồng nhất local time
      const parseDate = (dateStr: string): dayjs.Dayjs | null => {
        if (!dateStr) return null;
        let d: dayjs.Dayjs;

        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          d = dayjs(dateStr);
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
          const [day, month, year] = dateStr.split('/');
          d = dayjs(`${year}-${month}-${day}`);
        } else {
          d = dayjs(dateStr);
        }

        return d.isValid() ? d : null;
      };

      const qb = this.projectRepo.createQueryBuilder('p')
        .where('p.status = :status', { status: 1 });

      // === TỰ ĐỘNG LỌC THEO NGƯỜI DÙNG THAM GIA ===
      if (currentUserId) {
        qb.andWhere(`EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = :currentUserId
        )`, { currentUserId });
      }

      // === TÌM KIẾM TỔNG QUÁT: filter[q] ===
      // Tìm trong TẤT CẢ các trường với cùng giá trị (OR logic)
      if (q) {
        qb.andWhere(
          `(
            p.name COLLATE Latin1_General_CI_AI LIKE :q OR
            p.code COLLATE Latin1_General_CI_AI LIKE :q OR
            p.description COLLATE Latin1_General_CI_AI LIKE :q OR
            p.typeProject COLLATE Latin1_General_CI_AI LIKE :q OR
            EXISTS (
              SELECT 1 FROM crm_source_data csd
              LEFT JOIN crm_sources cs ON cs.id = csd.source_id
              WHERE (csd.id = p.typeProject OR (csd.value = p.typeProject AND cs.code = 'LOAIDUAN') OR csd.title = p.typeProject)
              AND (csd.title COLLATE Latin1_General_CI_AI LIKE :q OR csd.id LIKE :q OR csd.value LIKE :q)
            )
          )`,
          { q: `%${q}%` }
        );
      }

      // === TÌM KIẾM OR: filter[orFields] hoặc nhiều filter text fields ===
      // Nếu có filter[orFields], sử dụng nó
      // Nếu không, tự động tạo OR từ các text fields (name, code, description, typeProject, managerName)
      const orFields = filter.orFields;
      const hasOrFields = orFields && typeof orFields === 'object' && Object.keys(orFields).length > 0;

      // Collect text filters
      const textFilters: { field: string; value: string }[] = [];
      if (name) textFilters.push({ field: 'name', value: name });
      if (code) textFilters.push({ field: 'code', value: code });
      if (description) textFilters.push({ field: 'description', value: description });
      if (typeProject) textFilters.push({ field: 'typeProject', value: typeProject });
      if (managerName) textFilters.push({ field: 'managerId', value: managerName });

      // Nếu có orFields, ưu tiên sử dụng
      if (hasOrFields) {
        const orConditions: string[] = [];
        const orParams: any = {};

        Object.entries(orFields).forEach(([field, value], index) => {
          if (value && String(value).trim()) {
            const paramName = `orField${index}`;
            if (field === 'managerName' || field === 'managerId') {
              // Special handling for managerId - tìm theo userId trong project_members
              orConditions.push(`EXISTS (
                SELECT 1 FROM project_members pm
                WHERE pm.project_id = p.id
                AND pm.role = 'manager'
                AND pm.user_id LIKE :${paramName}
              )`);
            } else if (field === 'typeProject') {
              // Special handling for typeProject - tìm theo id, value hoặc title trong crm_source_data
              orConditions.push(`(
                p.typeProject COLLATE Latin1_General_CI_AI LIKE :${paramName} OR
                EXISTS (
                  SELECT 1 FROM crm_source_data csd
                  LEFT JOIN crm_sources cs ON cs.id = csd.source_id
                  WHERE (csd.id = p.typeProject OR (csd.value = p.typeProject AND cs.code = 'LOAIDUAN') OR csd.title = p.typeProject)
                  AND (csd.title COLLATE Latin1_General_CI_AI LIKE :${paramName} OR csd.id LIKE :${paramName} OR csd.value LIKE :${paramName})
                )
              )`);
            } else {
              orConditions.push(`p.${field} COLLATE Latin1_General_CI_AI LIKE :${paramName}`);
            }
            orParams[paramName] = `%${String(value).trim()}%`;
          }
        });

        if (orConditions.length > 0) {
          qb.andWhere(`(${orConditions.join(' OR ')})`, orParams);
        }
      }
      // Nếu có nhiều text filters (>= 2), tự động dùng OR logic
      else if (textFilters.length >= 2) {
        const orConditions: string[] = [];
        const orParams: any = {};

        textFilters.forEach((item, index) => {
          const paramName = `textFilter${index}`;
          if (item.field === 'managerId') {
            // Special handling for managerId - tìm theo userId trong project_members
            orConditions.push(`EXISTS (
              SELECT 1 FROM project_members pm
              WHERE pm.project_id = p.id
              AND pm.role = 'manager'
              AND pm.user_id LIKE :${paramName}
            )`);
          } else if (item.field === 'typeProject') {
            // Special handling for typeProject
            orConditions.push(`(
              p.typeProject COLLATE Latin1_General_CI_AI LIKE :${paramName} OR
              EXISTS (
                SELECT 1 FROM crm_source_data csd
                LEFT JOIN crm_sources cs ON cs.id = csd.source_id
                WHERE (csd.id = p.typeProject OR (csd.value = p.typeProject AND cs.code = 'LOAIDUAN') OR csd.title = p.typeProject)
                AND (csd.title COLLATE Latin1_General_CI_AI LIKE :${paramName} OR csd.id LIKE :${paramName} OR csd.value LIKE :${paramName})
              )
            )`);
          } else {
            orConditions.push(`p.${item.field} COLLATE Latin1_General_CI_AI LIKE :${paramName}`);
          }
          orParams[paramName] = `%${item.value}%`;
        });

        qb.andWhere(`(${orConditions.join(' OR ')})`, orParams);
      }
      // Nếu chỉ có 1 text filter, dùng AND logic (legacy behavior)
      else if (textFilters.length === 1) {
        const item = textFilters[0];
        if (item.field === 'managerId') {
          // Tìm theo userId trong project_members
          qb.andWhere(`EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = p.id
            AND pm.role = 'manager'
            AND pm.user_id LIKE :managerIdFilter
          )`, { managerIdFilter: `%${item.value}%` });
        } else if (item.field === 'typeProject') {
          // Tìm theo typeProject (ID, Value hoặc Title)
          qb.andWhere(`(
            p.typeProject COLLATE Latin1_General_CI_AI LIKE :typeProjectFilter OR
            EXISTS (
              SELECT 1 FROM crm_source_data csd
              LEFT JOIN crm_sources cs ON cs.id = csd.source_id
              WHERE (csd.id = p.typeProject OR (csd.value = p.typeProject AND cs.code = 'LOAIDUAN') OR csd.title = p.typeProject)
              AND (csd.title COLLATE Latin1_General_CI_AI LIKE :typeProjectFilter OR csd.id LIKE :typeProjectFilter OR csd.value LIKE :typeProjectFilter)
            )
          )`, { typeProjectFilter: `%${item.value}%` });
        } else {
          qb.andWhere(`p.${item.field} COLLATE Latin1_General_CI_AI LIKE :${item.field}Filter`, {
            [`${item.field}Filter`]: `%${item.value}%`
          });
        }
      }

      // Tìm kiếm theo tên hoặc mã dự án (legacy)
      if (search) {
        qb.andWhere('(p.name LIKE :search OR p.code LIKE :search)', {
          search: `%${search}%`,
        });
      }

      // if (code) {
      //   qb.andWhere('p.code COLLATE Latin1_General_CI_AI LIKE :code', {
      //     code: `%${code}%`,
      //   });
      // }
      // if (name) {
      //   qb.andWhere('p.name COLLATE Latin1_General_CI_AI LIKE :name', {
      //     name: `%${name}%`,
      //   });
      // }

      // Lọc: Dự án tôi quản lý
      if (myProjects === 'true' && currentUserId) {
        const myProjectIds = await this.memberRepo
          .createQueryBuilder('m')
          .select('m.projectId')
          .where('m.userId = :userId', { userId: currentUserId })
          .andWhere('m.role = :role', { role: 'manager' })
          .getRawMany();

        const projectIds = myProjectIds.map(p => p.m_project_id);
        if (projectIds.length > 0) {
          qb.andWhere('p.id IN (:...projectIds)', { projectIds });
        } else {
          // Không có dự án nào → trả về rỗng
          qb.andWhere('1 = 0');
        }
      }

      // Lọc: Dự án quá hạn
      if (overdue === 'true') {
        qb.andWhere('p.endDate < :now', { now: new Date() });
      }

      // Lọc: Quản lý dự án (theo managerId)
      if (managerId) {
        const projectsByManager = await this.memberRepo
          .createQueryBuilder('m')
          .select('m.projectId')
          .where('m.userId = :managerId', { managerId })
          .andWhere('m.role = :role', { role: 'manager' })
          .getRawMany();

        const projectIds = projectsByManager.map(p => p.projectId);
        if (projectIds.length > 0) {
          qb.andWhere('p.id IN (:...projectIds)', { projectIds });
        } else {
          qb.andWhere('1 = 0');
        }
      }

      // Lọc: Trạng thái dự án (INT: 1-5)
      if (projectStatus) {
        const statusNum = parseInt(projectStatus, 10);
        if (!isNaN(statusNum)) {
          qb.andWhere('p.projectStatus = :projectStatus', { projectStatus: statusNum });
        }
      }

      // Lọc: Phòng ban
      if (organizationUnitId) {
        // Nếu là mảng IDs hoặc string (comma-separated), dùng LIKE hoặc In
        if (Array.isArray(organizationUnitId)) {
          const conditions = organizationUnitId.map((id, index) => {
            const param = `ouId${index}`;
            return `p.organizationUnitId LIKE :${param}`;
          });
          const params = organizationUnitId.reduce((acc, id, index) => {
            acc[`ouId${index}`] = `%${id}%`;
            return acc;
          }, {});
          qb.andWhere(`(${conditions.join(' OR ')})`, params);
        } else {
          qb.andWhere('p.organizationUnitId LIKE :organizationUnitId', { organizationUnitId: `%${organizationUnitId}%` });
        }
      }

      // Lọc: Ngày bắt đầu (từ - đến)
      if (startDateFrom) {
        const dFrom = parseDate(startDateFrom);
        if (dFrom) {
          qb.andWhere('p.startDate >= :startDateFrom', { startDateFrom: dFrom.startOf('day').toISOString() });
        }
      }
      if (startDateTo) {
        const dTo = parseDate(startDateTo);
        if (dTo) {
          // Dùng < ngày kế tiếp để tránh lỗi làm tròn .999 của SQL Server datetime
          qb.andWhere('p.startDate < :startDateNextDay', { startDateNextDay: dTo.add(1, 'day').startOf('day').toISOString() });
        }
      }

      // Lọc: Ngày kết thúc (từ - đến)
      if (endDateFrom) {
        const dFrom = parseDate(endDateFrom);
        if (dFrom) {
          qb.andWhere('p.endDate >= :endDateFrom', { endDateFrom: dFrom.startOf('day').toISOString() });
        }
      }
      if (endDateTo) {
        const dTo = parseDate(endDateTo);
        if (dTo) {
          // Dùng < ngày kế tiếp để tránh lỗi làm tròn .999 của SQL Server datetime
          qb.andWhere('p.endDate < :endDateNextDay', { endDateNextDay: dTo.add(1, 'day').startOf('day').toISOString() });
        }
      }

      // Lọc: Loại dự án
      if (typeProject) {
        qb.andWhere(`(
          p.typeProject = :typeProject OR 
          EXISTS (
            SELECT 1 FROM crm_source_data csd
            LEFT JOIN crm_sources cs ON cs.id = csd.source_id
            WHERE (csd.id = p.typeProject OR (csd.value = p.typeProject AND cs.code = 'LOAIDUAN') OR csd.title = p.typeProject)
            AND (csd.title COLLATE Latin1_General_CI_AI LIKE :typeProjectLike OR csd.id = :typeProject OR csd.value = :typeProject)
          )
        )`, { typeProject, typeProjectLike: `%${typeProject}%` });
      }

      // Lọc: Độ ưu tiên
      if (priority) {
        if (priority === '1' || priority === 'Gấp' || priority === 'gap') {
          qb.andWhere('(p.priority = :p1 OR p.priority = :pLabel1 OR p.priority = :pNoAccent1)', { p1: '1', pLabel1: 'Gấp', pNoAccent1: 'gap' });
        } else if (priority === '2' || priority === 'Bình thường' || priority === 'binhthuong') {
          qb.andWhere('(p.priority = :p2 OR p.priority = :pLabel2 OR p.priority = :pNoAccent2)', { p2: '2', pLabel2: 'Bình thường', pNoAccent2: 'binhthuong' });
        } else {
          qb.andWhere('p.priority = :priority', { priority });
        }
      }



      // Sort (dùng shared utility)
      const allowedSortFields = [
        ...getDtoKeys(CreateProjectDto),
        'createdAt', 'updatedAt'
      ];

      const sortResult = validateAndParseSortParam(orderField, allowedSortFields);
      if (Object.keys(sortResult).length > 0) {
        (Object.entries(sortResult) as [string, 'ASC' | 'DESC'][]).forEach(([key, order]) => {
          qb.addOrderBy(`p.${key}`, order);
        });
      } else {
        qb.orderBy('p.createdAt', 'DESC');
      }

      qb.skip((page - 1) * limit)
        .take(limit);;

      const [data, total] = await qb.getManyAndCount();

      // [New] Fetch slowReason from comments
      const slowReasonMap: Record<string, string> = {};
      if (data.length > 0) {
        try {
          const ids = data.map((p) => p.id);
          const queryRaw = `
            SELECT document_id, content
            FROM (
               SELECT document_id, content, ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY created_at DESC) as rn
               FROM document_comments
               WHERE type = 'slowReason' AND document_id IN (${ids.map(id => `'${id}'`).join(',')})
            ) t
            WHERE rn = 1
          `;
          const reasons = await this.dataSource.query(queryRaw);
          reasons.forEach((r: any) => {
            slowReasonMap[r.document_id] = r.content;
          });
        } catch (e) {
          this.logger.error('Error fetching slow reasons for projects', e);
        }
      }

      // Load manager name và format date cho từng dự án
      const dataWithManager = await Promise.all(data.map(async (project) => {
        const managerMember = await this.memberRepo.findOne({
          where: { projectId: project.id, role: 'manager' },
          relations: ['user']
        });

        // Format dates to DD/MM/YYYY
        const formatDate = (date: Date | null) => {
          if (!date) return null;
          const d = new Date(date);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        };


        // Map projectStatus to Vietnamese label
        const getStatusName = (s: number) => {
          const statuses: Record<number, string> = {
            1: 'Chuẩn bị',
            2: 'Đang thực hiện',
            3: 'Hoàn thành',
            4: 'Hủy',
            5: 'Tạm dừng'
          };
          return statuses[s] || '';
        };
        const progressView = await buildProgressView(project, slowReasonMap[project.id]);

        // Kiểm tra nếu là export thì trả về plain text thay vì HTML
        const isExport = query.isExport === 'true';

        return {
          ...project,
          name: project.name,
          startDate: formatDate(project.startDate),
          endDate: formatDate(project.endDate),
          createdAt: formatDate(project.createdAt),
          updatedAt: formatDate(project.updatedAt),
          managerName: managerMember?.user?.name || managerMember?.user?.username || '',
          managerId: managerMember?.userId,
          priority: this.mapPriority(project.priority),
          typeProject: await this.mapProjectType(project.typeProject),
          // Nếu export: trả về text, nếu không: trả về HTML
          progressView: isExport ? progressView.rawText : progressView.html,
          projectStatus: isExport
            ? (this.mapProcessStatus(project.projectStatus) ?? '')
            : (this.mapProcessStatusToHtml(
              this.mapProcessStatus(project.projectStatus) ?? undefined
            ) ?? ''),
          slowReason: slowReasonMap[project.id] ?? null,
          moneyUnit: await this.mapMoneyUnitDetail(project.moneyUnit),
          totalBudget: Number(project.budget || 0) * (project.moneyUnit ? Number(project.moneyUnit) : 1),
          totalBudgetFormat: (Number(project.budget || 0) * (project.moneyUnit ? Number(project.moneyUnit) : 1)).toLocaleString('vi-VN'),
          budgetFormat: project.budget != null
            ? Number(project.budget).toLocaleString('vi-VN')
            : null,
        };
      }));

      return {
        data: dataWithManager,
        total,
        page: +page,
        limit: +limit,
        totalPages: Math.ceil(total / +limit),
      };
    } catch (error) {
      throw new InternalServerErrorException(`Lỗi khi lấy danh sách dự án: ${error.message}`);
    }
  }

  async getProjectMembers(id: number, searchName?: string) {
    try {
      const qb = this.memberRepo.createQueryBuilder('m')
        .leftJoinAndSelect('m.user', 'user')
        .leftJoinAndSelect('user.parent', 'parent')
        .where('m.projectId = :id', { id });

      if (searchName) {
        qb.andWhere('user.name COLLATE Latin1_General_CI_AI LIKE :searchName', { searchName: `%${searchName}%` });
      }

      const members = await qb.getMany();
      return members.map(m => ({
        userId: m.userId,
        name: m.user?.name || m.user?.username || '',
        email: m.user?.emailUser || null,
        role: m.role,
        joinedAt: m.joinedAt,
        parentName: m.user?.parent?.name || null
      }));
    } catch (error) {
      throw new InternalServerErrorException(`Lỗi khi lấy danh sách thành viên dự án: ${error.message}`);
    }
  }

  async getProjectOptions(search?: string, currentUserId?: string) {
    const qb = this.projectRepo.createQueryBuilder('p')
      .select([
        'p.id AS id',
        'p.name AS name',
        'p.code AS code'
      ])
      .where('p.status = 1');

    if (currentUserId) {
      const subordinateIds = await this.sqlsvRepo.getSubordinateUserIds(currentUserId);
      if (subordinateIds.length > 0) {
        qb.andWhere(`EXISTS (
          SELECT 1 FROM project_members pm 
          WHERE pm.project_id = p.id AND pm.user_id IN (SELECT value FROM OPENJSON(:subordinateIdsJson))
        )`, { subordinateIdsJson: JSON.stringify(subordinateIds) });
      } else {
        qb.andWhere('1 = 0');
      }
    }

    if (search) {
      qb.andWhere('(p.name LIKE :search OR p.code LIKE :search)', { search: `%${search}%` });
    }

    return await qb.orderBy('p.createdAt', 'DESC').getRawMany();
  }

  async findOne(id: number, userId: string) {
    try {
      const project = await this.projectRepo.findOne({
        where: { id, status: 1 },
      });
      if (!project) {
        throw new NotFoundException(`Không tìm thấy dự án với ID ${id}`);
      }
      // Load thành viên và quyền hạn
      const members = await this.memberRepo.find({
        where: { projectId: id },
        relations: ['user', 'user.parent']
      });
      const permissions = await this.permissionRepo.find({
        where: { projectId: id }
      });

      const myMember = members.find(m => m.userId === userId);
      const myRole = myMember?.role || null;
      let canPayment = myRole === 'manager'

      const managerMembers = members.filter(m => m.role === 'manager');
      // Check quyền chỉnh sửa
      const flags = {
        isProcess: false,
        isStatus: false,
        isGeneralInfo: false,
        isParticipants: false,
        isFiles: false,
        isdeleteComment: false,
        isSlowReason: false,
        canPayment,
        canCreateTask: (myRole === 'manager' || myRole === 'member') && project.projectStatus !== 3 && project.projectStatus !== 4 && project.projectStatus !== 5,
      };
      const isProjectManager = managerMembers.some(m => m.userId === userId);
      if (isProjectManager || userId === project.createdBy) {
        flags.isProcess = true;
        flags.isStatus = true;
        flags.isGeneralInfo = true;
        flags.isParticipants = true;
        flags.isFiles = true;
      }
      const myPermission = permissions.find(p => p.role === myRole);
      if (myPermission?.uploadFiles) {
        flags.isFiles = true;
      }
      if (project.endDate && new Date(project.endDate) < new Date()) {
        flags.isSlowReason = true;
      }

      if (project.projectStatus === 3 || project.projectStatus === 4) {
        flags.isProcess = false;
        flags.isStatus = false;
        flags.isGeneralInfo = false;
        flags.isParticipants = false;
        flags.isFiles = false;
        flags.isSlowReason = false;
        canPayment = false;
        flags.canPayment = false;
        flags.canCreateTask = false;
        permissions.forEach(p => {
          p.updateStatus = false;
          p.updateGeneralInfo = false;
          p.updateParticipants = false;
          p.uploadFiles = false;
          p.comment = false;
          p.inputDelayReason = false;
          p.setPermissions = false;
        });
      }
      // map màu
      const statusHtml =
        this.mapProcessStatusToHtml(
          this.mapProcessStatus(project.projectStatus) ?? undefined
        ) ?? '';

      let processName = '';
      if (project.process && this.isUuid(project.process)) {
        const template = await this.dataSource.getRepository(ProcessTemplateEntity).findOne({
          where: { id: project.process }
        });
        processName = template?.name || '';
      }
      const progressNum = Number(project.progress ?? 0);
      const isOverdue = project.endDate && new Date(project.endDate) < new Date() && progressNum < 100;
      const progressColor = progressNum >= 100
        ? '#4CAF50'       // Xanh lá: hoàn thành
        : isOverdue
          ? '#FF6B6B'     // Đỏ: quá hạn chưa xong
          : '#4DA3FF';    // Xanh dương: đang thực hiện

      let organizationUnitName = '';
      if (project.organizationUnitId && typeof project.organizationUnitId === 'string') {
        try {
          const unitIds = project.organizationUnitId
            .split(',')
            .map(id => id.trim())
            .filter(id => id);

          if (unitIds.length > 0) {
            const units = await this.dataSource.getRepository(OrganizationUnitEntity).find({
              where: { id: In(unitIds) },
              select: ['id', 'name']
            });
            organizationUnitName = units.map(u => u.name).join(', ');
          }
        } catch (e) {
          this.logger.error('Error fetching unit names', e);
        }
      }

      // Lấy toàn bộ file đính kèm từ dự án và các công việc con của dự án
      const taskFiles = await this.dataSource.query(`
        SELECT 
          f.id,
          f.file_name AS fileName,
          f.file_size AS fileSize,
          f.file_path AS filePath,
          f.mime_type AS mimeType,
          f.created_at AS createdAt,
          f.created_by AS createdBy,
          u.name AS uploaderName,
          t.id AS taskId,
          t.name AS taskName,
          t.code AS taskCode
        FROM file_relations fr
        JOIN files f ON fr.file_id = f.id
        LEFT JOIN task t ON fr.object_id = CAST(t.id AS NVARCHAR(50)) AND fr.object_type = 'taskdocuments'
        LEFT JOIN users u ON f.created_by = u.id
        WHERE (
          (fr.object_type = 'project' AND fr.object_id = '${id}')
          OR
          (fr.object_type = 'taskdocuments' AND t.project_id = ${id} AND t.status = 1)
        )
        AND f.status = 1
        AND fr.status = 1
        ORDER BY f.created_at DESC
      `);

      const rawMoneyUnit = project.moneyUnit ? Number(project.moneyUnit) : 1;
      const moneyUnitObj = await this.mapMoneyUnitDetail(project.moneyUnit);
      const moneyUnitVal = Number(moneyUnitObj?.value) || rawMoneyUnit || 1;
      const rawBudget = project.budget ? Number(project.budget) : 0;
      const totalBudget = rawBudget * moneyUnitVal;

      return {
        ...project,
        moneyUnit: moneyUnitObj,
        totalBudget,
        budgetFormat: rawBudget ? rawBudget.toLocaleString('vi-VN') : '0',
        totalBudgetFormat: totalBudget ? totalBudget.toLocaleString('vi-VN') : '0',
        projectStatus: statusHtml as any,
        organizationUnitName,
        processName,
        priority: this.mapPriority(project.priority),
        typeProject: await this.mapProjectType(project.typeProject),
        managerName: managerMembers.map(m => m.user?.name || m.user?.username || '').filter(Boolean).join(', '),
        managerId: managerMembers.map(m => ({
          userId: m.userId,
          name: m.user?.name || m.user?.username || '',
          role: m.role,
          parentName: m.user?.parent?.name || null
        })),
        members: members.filter(m => m.role === 'member').map(m => ({
          userId: m.userId,
          name: m.user?.name,
          role: m.role,
          parentName: m.user?.parent?.name || null
        })),
        viewers: members.filter(m => m.role === 'viewer').map(m => ({
          userId: m.userId,
          name: m.user?.name,
          role: m.role,
          parentName: m.user?.parent?.name || null
        })),
        rolePermissions: permissions,
        myRole,
        canPayment,
        flags,
        progressColor,
        taskFiles,
        files: taskFiles,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`Lỗi khi lấy chi tiết dự án: ${error.message}`);
    }
  }

  async update(id: number, updateProjectDto: UpdateProjectDto, userId: string) {
    // BẮT ĐẦU TRANSACTION ĐỂ ĐẢM BẢO TẠO TASK TỪ QUY TRÌNH MẪU ĐỒNG BỘ
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(ProjectEntity, { where: { id, status: 1 } });
      if (!project) throw new NotFoundException(`Không tìm thấy dự án`);

      const currentManagerIds = project.managerId ? project.managerId.split(',').map(id => id.trim()).filter(Boolean) : [];
      if (updateProjectDto.priority !== undefined && String(updateProjectDto.priority) !== String(project.priority) && !currentManagerIds.includes(userId)) {
        throw new BadRequestException('Chỉ quản lý dự án mới có quyền cập nhật độ ưu tiên dự án');
      }

      // Lấy danh sách thành viên cũ để so sánh và gửi thông báo cho nhân viên mới
      const oldMembers = await queryRunner.manager.find(ProjectMemberEntity, {
        where: { projectId: id }
      });
      const oldMemberUserIds = new Set(oldMembers.map(m => m.userId).filter(Boolean));

      // KIỂM TRA LOGIC TRẠNG THÁI
      const currentStatus = String(project.projectStatus);
      const newStatus = updateProjectDto.projectStatus !== undefined ? String(updateProjectDto.projectStatus) : undefined;

      // 1. Dự án đã Hoàn thành (3) hoặc Hủy (4) thì không cho phép cập nhật gì nữa
      if (currentStatus === '3' || currentStatus === '4') {
        throw new BadRequestException(`Dự án đã ở trạng thái ${currentStatus === '3' ? 'Hoàn thành' : 'Hủy'}, không thể cập nhật thêm thông tin.`);
      }

      // 2. Chuyển đổi từ Đang thực hiện (2)
      if (currentStatus === '2' && newStatus && !['2', '3', '4', '5'].includes(newStatus)) {
        throw new BadRequestException(`Từ trạng thái Đang thực hiện, chỉ có thể chuyển sang Hoàn thành, Hủy hoặc Tạm dừng.`);
      }

      // 3. Chuyển đổi từ Tạm dừng (5)
      if (currentStatus === '5' && newStatus && !['2', '3', '4', '5'].includes(newStatus)) {
        throw new BadRequestException(`Từ trạng thái Tạm dừng, chỉ có thể chuyển sang Đang thực hiện, Hoàn thành hoặc Hủy.`);
      }

      // Validate ngày
      const finalStartDate = updateProjectDto.startDate ? new Date(updateProjectDto.startDate) : project.startDate;
      const finalEndDate = updateProjectDto.endDate ? new Date(updateProjectDto.endDate) : project.endDate;

      if (finalStartDate && finalEndDate && finalStartDate > finalEndDate) {
        throw new BadRequestException('Ngày bắt đầu không được lớn hơn ngày kết thúc');
      }

      // 1. Tách các trường không thuộc ProjectEntity để tránh lỗi TypeORM
      const { members, viewers, managerId, permissions, rolePermissions, isUpdateStatus, isUpdateGeneralInfo, isUpdateParticipants, isUpdateProcess, ...basicInfo } = updateProjectDto as any;

      // 2. Chuẩn hóa dữ liệu numeric/date cho các trường của ProjectEntity
      const normalizedInfo: any = { ...basicInfo };
      if (normalizedInfo.priority !== undefined) normalizedInfo.priority = String(normalizedInfo.priority);
      if (normalizedInfo.budget !== undefined) normalizedInfo.budget = Number(normalizedInfo.budget);
      if (normalizedInfo.moneyUnit !== undefined) normalizedInfo.moneyUnit = Number(normalizedInfo.moneyUnit);
      if (normalizedInfo.progress !== undefined) normalizedInfo.progress = Number(normalizedInfo.progress);
      if (normalizedInfo.reminderDays !== undefined) normalizedInfo.reminderDays = String(normalizedInfo.reminderDays);
      if (normalizedInfo.startDate) normalizedInfo.startDate = new Date(normalizedInfo.startDate);
      if (normalizedInfo.endDate) normalizedInfo.endDate = new Date(normalizedInfo.endDate);

      // projectStatus
      if (normalizedInfo.projectStatus !== undefined) {
        normalizedInfo.projectStatus = String(normalizedInfo.projectStatus);
        if (normalizedInfo.projectStatus === '3') {
          normalizedInfo.progress = 100;
        }
      }

      if (normalizedInfo.organizationUnitId !== undefined) {
        normalizedInfo.organizationUnitId = Array.isArray(normalizedInfo.organizationUnitId)
          ? normalizedInfo.organizationUnitId.join(',')
          : (normalizedInfo.organizationUnitId || null);
      }

      if (managerId !== undefined) {
        normalizedInfo.managerId = managerId;
      }

      // 3. LOGIC QUAN TRỌNG: TỰ ĐỘNG TẠO CÔNG VIỆC THEO QUY TRÌNH MẪU (NẾU CHỌN LẦN ĐẦU)
      // Nếu dự án cũ chưa có process và DTO mới có process hợp lệ
      let shouldCreateTasksFromTemplate = false;
      const newProcessId = updateProjectDto.process;
      if (!project.process && newProcessId && this.isUuid(newProcessId)) {
        shouldCreateTasksFromTemplate = true;
      }

      // Chỉ thực hiện update nếu có dữ liệu cơ bản
      if (Object.keys(normalizedInfo).length > 0) {
        await queryRunner.manager.update(ProjectEntity, id, normalizedInfo);
      }

      // Nếu cần tạo task từ mẫu
      if (shouldCreateTasksFromTemplate) {
        await this.createTasksFromTemplate(queryRunner, newProcessId as string, id, userId);
      }

      // 4. Cập nhật Manager
      if (managerId !== undefined) {
        await queryRunner.manager.delete(ProjectMemberEntity, { projectId: id, role: 'manager' });
        if (managerId && typeof managerId === 'string' && managerId.trim() !== '') {
          const managerIds = managerId.split(',').map(m => m.trim()).filter(m => m !== '');
          for (const mId of managerIds) {
            const uExists = await queryRunner.manager.findOne(UserEntity, { where: { id: mId } });
            if (uExists) {
              await queryRunner.manager.save(ProjectMemberEntity, {
                projectId: id,
                userId: mId,
                role: 'manager'
              });
            }
          }
        }
      }

      // 5. Cập nhật Members
      if (members !== undefined) {
        await queryRunner.manager.delete(ProjectMemberEntity, { projectId: id, role: 'member' });
        if (members && typeof members === 'string' && members.trim() !== '') {
          const memberIds = members.split(',').map(m => m.trim()).filter(m => m !== '');
          for (const mId of memberIds) {
            const uExists = await queryRunner.manager.findOne(UserEntity, { where: { id: mId } });
            if (uExists) {
              await queryRunner.manager.save(ProjectMemberEntity, {
                projectId: id,
                userId: mId,
                role: 'member'
              });
            }
          }
        }
      }

      // 6. Cập nhật Viewers
      if (viewers !== undefined) {
        await queryRunner.manager.delete(ProjectMemberEntity, { projectId: id, role: 'viewer' });
        if (viewers && typeof viewers === 'string' && viewers.trim() !== '') {
          const viewerIds = viewers.split(',').map(v => v.trim()).filter(v => v !== '');
          for (const vId of viewerIds) {
            const uExists = await queryRunner.manager.findOne(UserEntity, { where: { id: vId } });
            if (uExists) {
              await queryRunner.manager.save(ProjectMemberEntity, {
                projectId: id,
                userId: vId,
                role: 'viewer'
              });
            }
          }
        }
      }

      // TỰ ĐỘNG CẬP NHẬT CÔNG VIỆC CON KHI DỰ ÁN HOÀN THÀNH
      if (newStatus === '3') {
        await queryRunner.manager.update(
          TaskEntity,
          { projectId: id, status: 1 },
          {
            progress: '100',
            processStatus: 'Hoàn thành'
          }
        );
      }

      await queryRunner.commitTransaction();

      // SAU KHI COMMIT MỚI LÀM CÁC VIỆC PHỤ TRỢ (LOG, NOTIFICATION)
      if (isUpdateStatus) {
        await this.createLogFromSystem({
          actions: 'PATCH',
          details: 'Cập nhật trạng thái công việc',
          userInfo: userId,
          timestamps: new Date().toISOString(),
          taskId: id.toString(),
        });
      }
      if (isUpdateGeneralInfo) {
        await this.createLogFromSystem({
          actions: 'PATCH',
          details: 'Cập nhật thông tin chung',
          userInfo: userId,
          timestamps: new Date().toISOString(),
          taskId: id.toString(),
        });
      }
      if (isUpdateParticipants) {
        await this.createLogFromSystem({
          actions: 'PATCH',
          details: 'Cập nhật thông tin người tham gia',
          userInfo: userId,
          timestamps: new Date().toISOString(),
          taskId: id.toString(),
        });
      }
      if (isUpdateProcess) {
        await this.createLogFromSystem({
          actions: 'PATCH',
          details: 'Cập nhật tiến độ công việc',
          userInfo: userId,
          timestamps: new Date().toISOString(),
          taskId: id.toString(),
        });
      }

      // GỬI THÔNG BÁO CHO CÁC NHÂN VIÊN MỚI ĐƯỢC THÊM VÀO DỰ ÁN
      try {
        // Lấy Managers mới hoặc cũ
        const oldManagers = oldMembers.filter(m => m.role === 'manager').map(m => m.userId).filter(Boolean);
        const currentManagerIds = new Set<string>();
        if (managerId !== undefined) {
          if (managerId && typeof managerId === 'string') {
            managerId.split(',').map(m => m.trim()).filter(Boolean).forEach(id => currentManagerIds.add(id));
          }
        } else {
          oldManagers.forEach(id => currentManagerIds.add(id));
        }

        // Lấy Members mới hoặc cũ
        const currentMemberIds = new Set<string>();
        if (members !== undefined) {
          if (members && typeof members === 'string') {
            members.split(',').map(m => m.trim()).filter(Boolean).forEach(id => currentMemberIds.add(id));
          }
        } else {
          oldMembers.filter(m => m.role === 'member').forEach(m => { if (m.userId) currentMemberIds.add(m.userId); });
        }

        // Lấy Viewers mới hoặc cũ
        const currentViewerIds = new Set<string>();
        if (viewers !== undefined) {
          if (viewers && typeof viewers === 'string') {
            viewers.split(',').map(v => v.trim()).filter(Boolean).forEach(id => currentViewerIds.add(id));
          }
        } else {
          oldMembers.filter(m => m.role === 'viewer').forEach(m => { if (m.userId) currentViewerIds.add(m.userId); });
        }

        // Tìm những user thực sự được thêm mới
        const newlyAddedMembers: string[] = [];
        const newlyAddedViewers: string[] = [];

        for (const pmId of currentManagerIds) {
          if (pmId && !oldMemberUserIds.has(pmId)) {
            newlyAddedMembers.push(pmId);
          }
        }

        for (const mId of currentMemberIds) {
          if (mId && !oldMemberUserIds.has(mId)) {
            newlyAddedMembers.push(mId);
          }
        }

        for (const vId of currentViewerIds) {
          if (vId && !oldMemberUserIds.has(vId)) {
            newlyAddedViewers.push(vId);
          }
        }

        const latestProject = await this.projectRepo.findOne({ where: { id, status: 1 } });
        const projectName = latestProject?.name || project.name;
        const projectCode = latestProject?.code || project.code;

        if (newlyAddedMembers.length > 0) {
          await this.notificationService.createForRecipients({
            recipientIds: [...new Set(newlyAddedMembers)],
            senderId: userId,
            content: `Bạn được gán làm thành viên dự án: ${projectName} (${projectCode})`,
            key: NotificationKey.VIEW_PROJECT,
            type: NotificationType.ADDED_TO_NEW_PROJECT_MEMBER.value,
            recordId: id.toString(),
          });
        }

        if (newlyAddedViewers.length > 0) {
          await this.notificationService.createForRecipients({
            recipientIds: [...new Set(newlyAddedViewers)],
            senderId: userId,
            content: `Bạn được thêm làm người xem dự án: ${projectName} (${projectCode})`,
            key: NotificationKey.VIEW_PROJECT,
            type: NotificationType.ADDED_TO_NEW_PROJECT_VIEWER.value,
            recordId: id.toString(),
          });
        }
      } catch (err) {
        this.logger.error(`Lỗi khi gửi thông báo cho thành viên mới của dự án ${id}: ${err.message}`);
      }

      return this.findOne(id, userId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      console.error('Update Project Error:', error);
      throw new InternalServerErrorException(`Lỗi khi cập nhật dự án: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Xóa mềm dự án theo mảng ID (status = 3)
   * Chỉ quản lý dự án mới có quyền xóa và chỉ được xóa khi ở trạng thái 'Chuẩn bị'
   */
  async remove(ids: number[], userId: string) {
    try {
      if (!ids || ids.length === 0) {
        throw new BadRequestException('Danh sách ID xóa không được để trống');
      }

      // 1. Tìm thông tin các dự án cần xóa
      const projects = await this.projectRepo.find({
        where: { id: In(ids), status: 1 },
      });

      if (projects.length === 0) {
        throw new NotFoundException('Không tìm thấy dự án nào hợp lệ để xóa');
      }

      // 2. Kiểm tra từng dự án
      for (const project of projects) {
        // Kiểm tra trạng thái: chỉ được xóa ở trạng thái 'Chuẩn bị' (projectStatus = '1')
        if (String(project.projectStatus) !== '1') {
          throw new BadRequestException({
            message: `Không thể xóa dự án này, vui lòng kiểm tra lại trạng thái dự án trước khi thực hiện thao tác`,
            isWarning: true,
          });
        }

        // Kiểm tra quyền: chỉ quản lý dự án mới có quyền xóa
        const isManager = await this.memberRepo.findOne({
          where: { projectId: project.id, userId: userId, role: 'manager' }
        });

        if (!isManager) {
          throw new BadRequestException(`Bạn không phải là quản lý của dự án "${project.name}", không có quyền xóa.`);
        }
      }

      // 3. Thực hiện xóa mềm
      await this.projectRepo.update(ids, { status: 3 });
      return { success: true, message: `Xóa dự án thành công` };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`Lỗi khi xóa dự án: ${error.message}`);
    }
  }

  /**
   * Sinh mã dự án tự động: DA-YYYYMMDD-XXXX
   */
  private async generateProjectCode(): Promise<string> {
    try {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
      const prefix = `DA-${dateStr}-`;

      // Tìm mã lớn nhất trong ngày
      const lastProject = await this.projectRepo.createQueryBuilder('p')
        .where('p.code LIKE :prefix', { prefix: `${prefix}%` })
        .orderBy('p.code', 'DESC')
        .getOne();

      let nextNumber = 1;
      if (lastProject && lastProject.code) {
        const lastNumberStr = lastProject.code.replace(prefix, '');
        const lastNumber = parseInt(lastNumberStr, 10);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }

      const suffix = nextNumber.toString().padStart(4, '0');
      return `${prefix}${suffix}`;
    } catch (error) {
      throw new InternalServerErrorException(`Lỗi khi sinh mã dự án: ${error.message}`);
    }
  }

  /**
   * Thêm thành viên vào dự án
   */
  async addMember(projectId: number, userId: string, role: string, performingUserId?: string) {
    try {
      // Kiểm tra dự án tồn tại
      const project = await this.projectRepo.findOne({ where: { id: projectId, status: 1 } });
      if (!project) {
        throw new NotFoundException(`Không tìm thấy dự án với ID ${projectId}`);
      }

      if (project.projectStatus === 3 || project.projectStatus === 4) {
        throw new BadRequestException(
          `Dự án đã ở trạng thái ${project.projectStatus === 3 ? 'Hoàn thành' : 'Hủy'}, không thể thêm thành viên.`,
        );
      }

      // Kiểm tra user tồn tại
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new BadRequestException(`User ${userId} không tồn tại`);
      }

      // Kiểm tra user đã là thành viên chưa
      const existingMember = await this.memberRepo.findOne({
        where: { projectId, userId }
      });
      if (existingMember) {
        throw new BadRequestException(`User ${userId} đã là thành viên của dự án này với vai trò ${existingMember.role}`);
      }

      // Thêm thành viên mới
      const newMember = this.memberRepo.create({
        projectId,
        userId,
        role,
      });
      await this.memberRepo.save(newMember);

      // Gửi thông báo cho thành viên mới
      const isViewer = role === 'viewer';
      await this.notificationService.create({
        recipientId: userId,
        senderId: performingUserId || '',
        content: isViewer
          ? `Bạn được thêm làm người xem dự án: ${project.name} (${project.code})`
          : `Bạn được thêm làm thành viên dự án: ${project.name} (${project.code})`,
        key: NotificationKey.VIEW_PROJECT,
        type: isViewer
          ? NotificationType.ADDED_TO_NEW_PROJECT_VIEWER.value
          : NotificationType.ADDED_TO_NEW_PROJECT_MEMBER.value,
        recordId: project.id.toString(),
      });


      return {
        success: true,
        message: `Đã thêm thành viên thành công`,
        member: {
          userId,
          role,
          joinedAt: newMember.joinedAt,
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`Lỗi khi thêm thành viên: ${error.message}`);
    }
  }

  /**
   * Xóa thành viên khỏi dự án
   */
  async removeMember(projectId: number, userId: string, performingUserId?: string) {
    try {
      // Kiểm tra dự án tồn tại
      const project = await this.projectRepo.findOne({ where: { id: projectId, status: 1 } });
      if (!project) {
        throw new NotFoundException(`Không tìm thấy dự án với ID ${projectId}`);
      }

      if (project.projectStatus === 3 || project.projectStatus === 4) {
        throw new BadRequestException(
          `Dự án đã ở trạng thái ${project.projectStatus === 3 ? 'Hoàn thành' : 'Hủy'}, không thể xóa thành viên.`,
        );
      }

      // Tìm thành viên
      const member = await this.memberRepo.findOne({
        where: { projectId, userId }
      });
      if (!member) {
        throw new NotFoundException(`User ${userId} không phải là thành viên của dự án này`);
      }

      // Không cho phép xóa manager cuối cùng
      if (member.role === 'manager') {
        const managerCount = await this.memberRepo.count({
          where: { projectId, role: 'manager' }
        });
        if (managerCount <= 1) {
          throw new BadRequestException('Không thể xóa manager cuối cùng của dự án');
        }
      }

      await this.memberRepo.remove(member);

      // Gửi thông báo cho người bị xóa
      await this.notificationService.create({
        recipientId: userId,
        senderId: performingUserId || '',
        content: `Bạn đã bị xóa khỏi dự án: ${project.name} (${project.code})`,
        key: NotificationKey.VIEW_PROJECT,
        type: NotificationType.REMOVED_FROM_PROJECT.value,
        recordId: project.id.toString(),
      });


      return {
        success: true,
        message: 'Đã xóa thành viên thành công'
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`Lỗi khi xóa thành viên: ${error.message}`);
    }
  }

  /**
   * Cập nhật vai trò thành viên
   */
  async updateMemberRole(projectId: number, userId: string, newRole: string, performingUserId?: string) {
    try {
      // Kiểm tra dự án tồn tại
      const project = await this.projectRepo.findOne({ where: { id: projectId, status: 1 } });
      if (!project) {
        throw new NotFoundException(`Không tìm thấy dự án với ID ${projectId}`);
      }

      if (project.projectStatus === 3 || project.projectStatus === 4) {
        throw new BadRequestException(
          `Dự án đã ở trạng thái ${project.projectStatus === 3 ? 'Hoàn thành' : 'Hủy'}, không thể cập nhật vai trò thành viên.`,
        );
      }

      // Tìm thành viên
      const member = await this.memberRepo.findOne({
        where: { projectId, userId }
      });
      if (!member) {
        throw new NotFoundException(`User ${userId} không phải là thành viên của dự án này`);
      }

      const oldRole = member.role;

      // Nếu đang hạ cấp manager, kiểm tra còn manager khác không
      if (oldRole === 'manager' && newRole !== 'manager') {
        const managerCount = await this.memberRepo.count({
          where: { projectId, role: 'manager' }
        });
        if (managerCount <= 1) {
          throw new BadRequestException('Không thể hạ cấp manager cuối cùng của dự án');
        }
      }

      // Cập nhật vai trò
      member.role = newRole;
      await this.memberRepo.save(member);

      // Gửi thông báo cho người được cập nhật
      const isNewViewer = newRole === 'viewer';
      await this.notificationService.create({
        recipientId: userId,
        senderId: performingUserId || '',
        content: isNewViewer
          ? `Vai trò của bạn trong dự án ${project.name} đã được cập nhật thành người xem (từ ${oldRole})`
          : `Vai trò của bạn trong dự án ${project.name} đã được cập nhật thành thành viên (từ ${oldRole} sang ${newRole})`,
        key: NotificationKey.VIEW_PROJECT,
        type: isNewViewer
          ? NotificationType.ADDED_TO_NEW_PROJECT_VIEWER.value
          : NotificationType.ADDED_TO_NEW_PROJECT_MEMBER.value,
        recordId: project.id.toString(),
      });


      return {
        success: true,
        message: 'Đã cập nhật vai trò thành công',
        member: {
          userId,
          oldRole,
          newRole,
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`Lỗi khi cập nhật vai trò: ${error.message}`);
    }
  }


  /**
   * Kiểm tra quyền của người dùng trong dự án
   * @param userId - ID người dùng
   * @param projectId - ID dự án
   * @param permissionKey - Tên quyền cần kiểm tra (ví dụ: 'createTask', 'updateStatus', ...)
   * @returns true nếu có quyền, ngược lại false
   */
  async hasPermission(userId: string, projectId: number, permissionKey: keyof ProjectRolePermissionEntity): Promise<boolean> {
    try {
      // 0. Kiểm tra trạng thái dự án
      const project = await this.projectRepo.findOne({
        where: { id: projectId, status: 1 },
        select: ['projectStatus']
      });

      if (project && (project.projectStatus === 3 || project.projectStatus === 4)) {
        const writePermissions: Array<keyof ProjectRolePermissionEntity> = [
          'updateStatus',
          'updateGeneralInfo',
          'updateParticipants',
          'uploadFiles',
          'comment',
          'inputDelayReason',
          'setPermissions',
        ];
        if (writePermissions.includes(permissionKey)) {
          return false;
        }
      }

      // 1. Tìm vai trò của user trong dự án
      const member = await this.memberRepo.findOne({
        where: { projectId, userId }
      });

      if (!member) return false;

      // 2. Tìm cấu hình quyền cho vai trò đó trong dự án này
      const permissions = await this.permissionRepo.findOne({
        where: { projectId, role: member.role }
      });

      if (!permissions) return false;

      // 3. Kiểm tra giá trị quyền
      return !!permissions[permissionKey];
    } catch (error) {
      this.logger.error(`Lỗi khi kiểm tra quyền dự án: ${error.message}`);
      return false;
    }
  }

  /**
   * Kiểm tra xem user có phải là quản lý (manager) của dự án hay không
   */
  async isProjectManager(projectId: number, userId: string): Promise<boolean> {
    try {
      const member = await this.memberRepo.findOne({
        where: { projectId, userId, role: 'manager' }
      });
      return !!member;
    } catch (error) {
      this.logger.error(`Lỗi khi kiểm tra quản lý dự án: ${error.message}`);
      return false;
    }
  }

  /**
   * Lấy quyền hạn của một vai trò trong dự án
   */
  async getRolePermissions(projectId: number, role: string) {
    try {
      // Kiểm tra dự án tồn tại
      const project = await this.projectRepo.findOne({ where: { id: projectId, status: 1 } });
      if (!project) {
        throw new NotFoundException(`Không tìm thấy dự án với ID ${projectId}`);
      }

      // Kiểm tra vai trò hợp lệ
      if (!['manager', 'member', 'viewer'].includes(role)) {
        throw new BadRequestException('Vai trò phải là manager, member hoặc viewer');
      }

      // Lấy quyền của vai trò
      const permissions = await this.permissionRepo.findOne({
        where: { projectId, role }
      });

      if (!permissions) {
        throw new NotFoundException(`Không tìm thấy cấu hình quyền cho vai trò ${role} trong dự án này`);
      }

      return {
        projectId,
        role,
        permissions: {
          updateStatus: permissions.updateStatus,
          updateGeneralInfo: permissions.updateGeneralInfo,
          updateParticipants: permissions.updateParticipants,
          uploadFiles: permissions.uploadFiles,
          comment: permissions.comment,
          inputDelayReason: permissions.inputDelayReason,
          viewAnalysis: permissions.viewAnalysis,
          setPermissions: permissions.setPermissions,
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`Lỗi khi lấy quyền hạn: ${error.message}`);
    }
  }

  /**
   * Cập nhật quyền hạn cho một vai trò trong dự án
   */
  async updateRolePermissions(projectId: number, role: string, updateData: UpdateRolePermissionsDto, performingUserId?: string) {
    try {
      // Kiểm tra dự án tồn tại
      const project = await this.projectRepo.findOne({ where: { id: projectId, status: 1 } });
      if (!project) {
        throw new NotFoundException(`Không tìm thấy dự án với ID ${projectId}`);
      }

      // Kiểm tra trạng thái dự án
      if (project.projectStatus === 3 || project.projectStatus === 4) {
        throw new BadRequestException('Dự án đã Hoàn thành hoặc Hủy, không thể thay đổi quyền hạn.');
      }

      // Kiểm tra vai trò hợp lệ
      if (!['manager', 'member', 'viewer'].includes(role)) {
        throw new BadRequestException('Vai trò phải là manager, member hoặc viewer');
      }

      // Tìm cấu hình quyền hiện tại
      const permissions = await this.permissionRepo.findOne({
        where: { projectId, role }
      });

      if (!permissions) {
        throw new NotFoundException(`Không tìm thấy cấu hình quyền cho vai trò ${role} trong dự án này`);
      }

      // Cập nhật các quyền (chỉ cập nhật những trường được gửi lên)
      const updatedFields: string[] = [];

      if (updateData.updateStatus !== undefined) {
        permissions.updateStatus = updateData.updateStatus;
        updatedFields.push('updateStatus');
      }
      if (updateData.updateGeneralInfo !== undefined) {
        permissions.updateGeneralInfo = updateData.updateGeneralInfo;
        updatedFields.push('updateGeneralInfo');
      }
      if (updateData.updateParticipants !== undefined) {
        permissions.updateParticipants = updateData.updateParticipants;
        updatedFields.push('updateParticipants');
      }
      if (updateData.uploadFiles !== undefined) {
        permissions.uploadFiles = updateData.uploadFiles;
        updatedFields.push('uploadFiles');
      }
      if (updateData.comment !== undefined) {
        permissions.comment = updateData.comment;
        updatedFields.push('comment');
      }
      if (updateData.inputDelayReason !== undefined) {
        permissions.inputDelayReason = updateData.inputDelayReason;
        updatedFields.push('inputDelayReason');
      }
      if (updateData.viewAnalysis !== undefined) {
        permissions.viewAnalysis = updateData.viewAnalysis;
        updatedFields.push('viewAnalysis');
      }
      if (updateData.setPermissions !== undefined) {
        // Nếu là role manager, luôn giữ setPermissions là true (không cho phép tắt)
        permissions.setPermissions = role === 'manager' ? true : updateData.setPermissions;
        updatedFields.push('setPermissions');
      }

      await this.permissionRepo.save(permissions);

      // Gửi thông báo cho tất cả thành viên thuộc vai trò này
      const membersOfRole = await this.memberRepo.find({
        where: { projectId, role }
      });

      if (membersOfRole.length > 0) {
        const recipientIds = membersOfRole.map(m => m.userId);
        const isViewer = role === 'viewer';
        await this.notificationService.createForRecipients({
          recipientIds,
          senderId: performingUserId || '',
          content: `Quyền hạn của vai trò ${role} trong dự án ${project.name} (${project.code}) đã được cập nhật.`,
          key: NotificationKey.VIEW_PROJECT,
          type: isViewer
            ? NotificationType.ADDED_TO_NEW_PROJECT_VIEWER.value
            : NotificationType.ADDED_TO_NEW_PROJECT_MEMBER.value,
          recordId: project.id.toString(),
        });
      }


      return {
        success: true,
        message: 'Đã cập nhật quyền hạn thành công',
        updatedFields,
        permissions: {
          updateStatus: permissions.updateStatus,
          updateGeneralInfo: permissions.updateGeneralInfo,
          updateParticipants: permissions.updateParticipants,
          uploadFiles: permissions.uploadFiles,
          comment: permissions.comment,
          inputDelayReason: permissions.inputDelayReason,
          viewAnalysis: permissions.viewAnalysis,
          setPermissions: permissions.setPermissions,
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(`Lỗi khi cập nhật quyền hạn: ${error.message}`);
    }
  }

  // =====================================================
  // BPMN WORKFLOW HELPER METHODS
  // =====================================================

  /**
   * Validate BPMN configuration and permissions
   */
  private async validateBpmnAndPermission(
    userId: string,
    docType: 'TaskProject',
  ): Promise<{
    bpmnXML: string;
    role: string;
    flowId: string;
  }> {
    const user: any = await this.sqlsvRepo.getUserById(userId);
    if (!user?.parent?.id) {
      throw new BadRequestException('Không xác định được đơn vị người dùng');
    }

    const flowConfig = await this.sqlsvRepo.getFlowByDocType(docType);

    if (!flowConfig) {
      throw new BadRequestException('Chưa được cấu hình BPMN cho dự án');
    }

    const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig.id);
    const { indexes } = await this.getModelFromXml(bpmnXML);

    // START → NODE ĐẦU
    const startEvent = Array.from(indexes.nodes.values()).find(
      (n: any) => n.$type === 'bpmn:StartEvent',
    ) as any;

    if (!startEvent?.outgoing?.length) {
      throw new BadRequestException('BPMN không có luồng bắt đầu hợp lệ');
    }

    const { node: firstNode } = this.bpmnEngine.nextInteractiveFromFlow(
      startEvent.outgoing[0],
      indexes,
    );

    if (!firstNode) {
      throw new BadRequestException('Không xác định được node xử lý đầu tiên');
    }
    const role = indexes.laneMap.get(firstNode.id);
    if (!role) {
      throw new BadRequestException(`Node ${firstNode.id} chưa được gán role`);
    }

    return { bpmnXML, role, flowId: flowConfig.id };
  }

  /**
   * Parse BPMN XML to get model and indexes
   */
  private async getModelFromXml(bpmnXML: string): Promise<{
    process: any;
    indexes: BpmnIndexes;
    path: string;
  }> {
    const { process } = await this.bpmnEngine.loadBpmnFromString(bpmnXML);
    const indexes = this.bpmnEngine.buildIndexes(process);
    return { process, indexes, path: 'inline-xml' };
  }

  /**
   * Create BPMN work items and audit for project
   */
  private async createBpmnWorkItemsAndAudit(
    queryRunner: QueryRunner,
    projectId: number,
    dto: { directors?: any[]; supporters?: any[] },
    bpmnXML: string,
    flowId: string,
    bpmnCode: string,
  ): Promise<void> {
    // Tạo BPMN WORKITEM + AUDIT với manager (director)
    const firstDirectorId = dto.directors?.length ? dto.directors[0].processId : null;

    if (firstDirectorId) {
      await this.createDocumentAtNode({
        bpmnXML,
        data: {
          documentId: String(projectId),
          ...dto,
        },
        assigneeUserId: firstDirectorId,
        flowId,
        queryRunner,
        bpmnCode,
      });
    }

    // Tạo BPMN WORKITEM + AUDIT với members/viewers (supporters)
    if (dto.supporters && dto.supporters.length > 0) {
      await Promise.all(
        dto.supporters
          .filter((supporter) => supporter.processId)
          .map(async (supporter) => {
            return this.assignSupporter({
              bpmnXML,
              supporterId: supporter.processId,
              data: {
                documentId: String(projectId),
                ...dto,
              },
              bpmnCode,
            });
          }),
      );
    }
  }

  /**
   * Create document at first node of workflow
   */
  async createDocumentAtNode({
    bpmnXML,
    data,
    queryRunner,
    assigneeUserId = null,
    flowId = null,
    bpmnCode,
  }: {
    bpmnXML: string;
    data: any;
    queryRunner?: QueryRunner;
    assigneeUserId?: string | null;
    flowId?: string | null;
    bpmnCode?: string;
  }): Promise<any> {
    const { indexes } = await this.getModelFromXml(bpmnXML);

    const startEvent = Array.from(indexes.nodes.values()).find(
      (node: any) => node.$type === 'bpmn:StartEvent',
    ) as any;

    if (!startEvent?.outgoing?.length) {
      throw new BadRequestException('BPMN không có StartEvent hợp lệ');
    }

    // Tìm node đầu tiên sau StartEvent (Tạo dự án)
    const { node: firstNode } = this.bpmnEngine.nextInteractiveFromFlow(
      startEvent.outgoing[0],
      indexes,
    );

    if (!firstNode) {
      throw new BadRequestException('Không xác định được node xử lý đầu tiên');
    }

    const role = indexes.laneMap.get(firstNode.id);
    if (!role) {
      throw new BadRequestException(`Node ${firstNode.id} chưa được gán role`);
    }

    const documentId = data?.documentId;
    if (!documentId) {
      throw new BadRequestException('documentId is required in data');
    }

    // Tạo work item tại node đầu tiên (Tạo dự án)
    // Logic navigate qua gateway sẽ được xử lý trong createTaskForProject
    const workItem: any = {
      id: `wi_${Date.now()}`,
      nodeId: firstNode.id,
      role,
      assigneeUserId: assigneeUserId || null,
      nodeType: firstNode.$type,
      meta: data,
    };

    await this.sqlRepo.addWorkItem(documentId, workItem, undefined, bpmnCode);

    // Tạo audit
    const auditRecord: any = {
      id: `audit_${Date.now()}`,
      nodeId: firstNode.id,
      action: 'CREATE',
      userId: assigneeUserId,
      timestamp: new Date().toISOString(),
      data,
    };

    await this.sqlRepo.addAudit(documentId, auditRecord, undefined);

    return { node: firstNode, role };
  }

  /**
   * Assign supporter to workflow
   */
  private async assignSupporter(params: {
    bpmnXML: string;
    data: any;
    supporterId: string;
    bpmnCode?: string;
  }): Promise<void> {
    const { bpmnXML, data, supporterId, bpmnCode } = params;

    const { indexes } = await this.getModelFromXml(bpmnXML);

    const startEvent = Array.from(indexes.nodes.values()).find(
      (node: any) => node.$type === 'bpmn:StartEvent',
    ) as any;

    if (!startEvent?.outgoing?.length) {
      throw new BadRequestException('BPMN không có StartEvent hợp lệ');
    }

    const { node: firstNode } = this.bpmnEngine.nextInteractiveFromFlow(
      startEvent.outgoing[0],
      indexes,
    );
    let targetNode: any = null;
    const outgoingFlows = firstNode?.outgoing || [];
    const targetFlow = outgoingFlows.find((f: any) => f.name === 'GIAO_PHOI_HOP');

    if (targetFlow) {
      const res = this.bpmnEngine.nextInteractiveFromFlow(
        targetFlow,
        indexes,
      );
      targetNode = res.node;
    }

    if (!targetNode) {
      // Nếu không có flow GIAO_PHOI_HOP, bỏ qua việc gán supporter
      this.logger.warn('Không tìm thấy flow GIAO_PHOI_HOP, bỏ qua việc gán supporter');
      return;
    }

    const role = indexes.laneMap.get(targetNode.id);

    if (!role) {
      throw new BadRequestException(
        `Không xác định được role cho node ${targetNode.id}`,
      );
    }

    const documentId = data?.documentId;
    if (!documentId) {
      throw new BadRequestException('documentId is required in data');
    }

    // Tạo work item cho supporter
    const workItem: any = {
      id: `wi_${Date.now()}`,
      nodeId: targetNode.id,
      role,
      assigneeUserId: supporterId,
      nodeType: targetNode.$type,
      meta: data,
    };

    await this.sqlRepo.addWorkItem(documentId, workItem, undefined, bpmnCode);
  }

  /**
   * Thống kê tổng quan dự án
   */
  async getProjectOverviewStatistics(projectId: number) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Dự án không tồn tại');

    const tasks = await this.taskRepo.find({
      where: { projectId, status: 1, typeTask: TASK_TYPE.PROJECT }
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.processStatus === 'Hoàn thành').length;

    const now = new Date();
    let onTimeTasks = 0;
    let overdueTasks = 0;

    tasks.forEach(task => {
      const isCompleted = task.processStatus === 'Hoàn thành';
      const finishDate = isCompleted ? task.updatedAt : now;

      if (task.endDate && finishDate > task.endDate) {
        overdueTasks++;
      } else {
        onTimeTasks++;
      }
    });

    // Tính tiến độ trung bình nếu dự án chưa có progress set thủ công
    const avgProgress = totalTasks > 0
      ? Math.round(tasks.reduce((acc, t) => acc + (Number(t.progress) || 0), 0) / totalTasks)
      : 0;

    return {
      totalTasks,
      completedTasks,
      onTimeTasks,
      overdueTasks,
      progressPercentage: project.progress || avgProgress
    };
  }

  /**
   * Thống kê phân bố trạng thái công việc
   */
  async getProjectTaskStatusDistribution(projectId: number) {
    const stats = await this.taskRepo
      .createQueryBuilder('t')
      .select('t.processStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .where("t.projectId = :projectId AND t.status = 1 AND t.typeTask = :type", {
        projectId,
        type: TASK_TYPE.PROJECT
      })
      .groupBy('t.processStatus')
      .getRawMany();

    const total = stats.reduce((acc, s) => acc + Number(s.count), 0);

    const statusMap: Record<string, { label: string, color: string }> = {
      '1': { label: 'Công việc mới', color: '#E0E0E0' },
      '2': { label: 'Đang thực hiện', color: '#DBEAFE' },
      '3': { label: 'Chờ phê duyệt', color: '#FEF9C2' },
      '4': { label: 'Hoàn thành', color: '#D0FFDE' },
      '5': { label: 'Từ chối phê duyệt', color: '#FFDCD9' },
      '6': { label: 'Chờ điều chỉnh', color: '#FEF9C2' },
      '7': { label: 'Từ chối điều chỉnh', color: '#FFDCD9' },
      '8': { label: 'Đã hủy', color: '#FFDCD9' },
      // Fallback for string-based statuses
      'Công việc mới': { label: 'Công việc mới', color: '#E0E0E0' },
      'Đang thực hiện': { label: 'Đang thực hiện', color: '#DBEAFE' },
      'Hoàn thành': { label: 'Hoàn thành', color: '#D0FFDE' },
      'Chờ phê duyệt': { label: 'Chờ phê duyệt', color: '#FEF9C2' },
      'Điều chỉnh': { label: 'Điều chỉnh', color: '#FEF9C2' },
      'Huỷ': { label: 'Đã huỷ', color: '#FFDCD9' },
    };

    return stats.map(s => {
      const statusValue = String(s.status || '').trim();
      const map = statusMap[statusValue] || { label: statusValue || 'Chưa xác định', color: '#E5E7EB' };

      return {
        status: statusValue,
        label: map.label,
        count: Number(s.count),
        percentage: total > 0 ? Math.round((Number(s.count) / total) * 1000) / 10 : 0,
        color: map.color
      };
    });
  }

  /**
   * Thống kê hiệu suất công việc (Đúng hạn / Trễ hạn)
   */
  async getProjectTaskPerformance(projectId: number) {
    const tasks = await this.taskRepo.find({
      where: { projectId, status: 1, typeTask: TASK_TYPE.PROJECT }
    });

    const now = new Date();
    let onTime = 0;
    let overdue = 0;

    tasks.forEach(task => {
      const isCompleted = task.processStatus === 'Hoàn thành';
      const finishDate = isCompleted ? task.updatedAt : now;

      if (task.endDate && finishDate > task.endDate) {
        overdue++;
      } else {
        onTime++;
      }
    });

    const total = onTime + overdue;

    return {
      onTime,
      overdue,
      total,
      onTimePercentage: total > 0 ? Math.round((onTime / total) * 100) : 0,
      overduePercentage: total > 0 ? Math.round((overdue / total) * 100) : 0
    };
  }

  /**
   * Thống kê thành viên dự án
   */
  async getProjectMemberStatistics(projectId: number, search?: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const qb = this.memberRepo
      .createQueryBuilder('m')
      .leftJoin('m.user', 'u')
      .where('m.projectId = :projectId', { projectId });

    if (search) {
      qb.andWhere(
        '(u.name LIKE :search OR u.username LIKE :search OR u.codeND LIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [members, total] = await qb
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const data: any[] = [];

    for (const member of members) {
      // Lấy thông tin user chi tiết qua getUserByIds
      const user = await this.sqlsvRepo.getUserById(member.userId);

      const userTasks = await this.taskUserRepo
        .createQueryBuilder('tu')
        .leftJoinAndSelect('tu.task', 't')
        .where("tu.processId = :userId AND t.projectId = :projectId AND t.status = 1 AND t.typeTask = :type AND (t.createdById IS NULL OR t.createdById != :userId) AND tu.role IN ('director', 'supporter')", {
          userId: member.userId,
          projectId,
          type: TASK_TYPE.PROJECT
        })
        .getMany();

      const mainProcessCount = userTasks.filter(ut => ut.role === 'director').length;
      const coordinateCount = userTasks.filter(ut => ut.role === 'supporter').length;

      const stats = {
        userId: member.userId,
        userName: user?.name || 'Unknown',
        userCode: user?.codeND || member.userId,
        position: user?.position || '',
        avatar: user?.avatar || [],
        email: user?.emailUser || '',
        phone: user?.phoneNumberUser || '',
        organizationName: user?.organizationName || '',
        organizationCode: user?.organizationCode || '',
        gender: user?.gender || '',
        birthday: user?.birthday || null,
        totalAssigned: mainProcessCount + coordinateCount,
        mainProcess: mainProcessCount,
        coordinate: coordinateCount,
        completed: userTasks.filter(ut => ut.task?.processStatus === 'Hoàn thành').length,
        overdue: 0
      };

      const now = new Date();
      userTasks.forEach(ut => {
        const task = ut.task;
        if (!task) return;
        const isCompleted = task.processStatus === 'Hoàn thành';
        const finishDate = isCompleted ? task.updatedAt : now;
        if (task.endDate && finishDate > task.endDate) {
          stats.overdue++;
        }
      });

      data.push(stats);
    }

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Kiểm tra và cập nhật trạng thái dự án sang "Đang thực hiện"
   * Điều kiện: Trạng thái hiện tại là "Chuẩn bị" (1), đã đến ngày bắt đầu và có ít nhất 1 công việc.
   */
  async checkAndUpdateProjectStatus(projectId: number) {
    try {
      const project = await this.projectRepo.findOne({
        where: { id: projectId, projectStatus: 1, status: 1 }
      });

      if (!project) return;

      // Kiểm tra xem có công việc nào chưa
      const taskCount = await this.taskRepo.count({
        where: { projectId: projectId, status: 1 }
      });

      if (taskCount > 0) {
        project.projectStatus = 2; // Đang thực hiện
        await this.projectRepo.save(project);
      }
    } catch (error) {
      this.logger.error(`Lỗi khi kiểm tra trạng thái dự án ${projectId}: ${error.message}`);
    }
  }

  /**
   * Quét tất cả các dự án đang ở trạng thái "Chuẩn bị" để cập nhật nếu đủ điều kiện
   */
  async scanAndUpdateProjectStatuses() {
    try {
      const projects = await this.projectRepo.find({
        where: { projectStatus: 1, status: 1 }
      });

      for (const project of projects) {
        await this.checkAndUpdateProjectStatus(project.id);
      }
    } catch (error) {
      this.logger.error(`Lỗi khi quét trạng thái dự án: ${error.message}`);
    }
  }

  /**
   * Tự động tính toán và cập nhật tiến độ của dự án dựa trên các công việc con.
   * Công thức:
   * a : Thời gian thực hiện công việc (ngày)
   * b : Tổng thời gian thực hiện của tất cả công việc trong dự án (ngày)
   * c : Tiến độ thực hiện của công việc (%)
   * d = (a/b * 100) * c / 100 = (a/b) * c
   * Tiến độ dự án = Σ d
   */
  async calculateAndUpdateProjectProgress(projectId: number) {
    try {
      const tasks = await this.taskRepo.find({
        where: [
          { projectId, status: 1, parent: 0 },
          { projectId, status: 1, parent: IsNull() }
        ],
      });

      if (!tasks || tasks.length === 0) {
        await this.projectRepo.update(projectId, { progress: 0 });
        return;
      }

      // Tự động chuyển trạng thái sang "Đang thực hiện" nếu đang ở "Chuẩn bị"
      const project = await this.projectRepo.findOne({
        where: { id: projectId, status: 1 },
        select: ['id', 'projectStatus', 'code']
      });
      if (project && project.projectStatus === 1) {
        await this.projectRepo.update(projectId, { projectStatus: 2 });
      }

      // 1. Tính thời gian (a) cho từng task và tổng thời gian (b)
      let totalDuration = 0;
      const taskData = tasks.map(task => {
        if (!task.startDate || !task.endDate) return { duration: 0, progress: 0 };

        const start = dayjs(task.startDate);
        const end = dayjs(task.endDate);
        // Tính số ngày chênh lệch (dùng float để chính xác hơn)
        // Nếu cùng ngày thì coi như 1 đơn vị thời gian tối thiểu hoặc 0 tùy nghiệp vụ, 
        // ở đây dùng chênh lệch thực tế, nếu < 0 thì lấy 0.
        const duration = Math.max(end.diff(start, 'day', true), 0);

        // Parse progress string (TaskEntity.progress là string)
        const progressValue = parseFloat(task.progress) || 0;

        totalDuration += duration;
        return { duration, progress: progressValue };
      });

      // 2. Tính tổng tiến độ dự án theo trọng số thời gian
      let projectProgress = 0;
      if (totalDuration > 0) {
        for (const item of taskData) {
          if (item.duration > 0) {
            const weight = item.duration / totalDuration;
            projectProgress += weight * item.progress;
          }
        }
      } else {
        // Nếu tổng thời gian là 0 (các task đều không có khoảng thời gian), 
        // tính trung bình cộng tiến độ của các task có progress.
        const tasksWithProgress = taskData.filter(t => t.progress > 0);
        if (tasksWithProgress.length > 0) {
          const sumProgress = taskData.reduce((acc, curr) => acc + curr.progress, 0);
          projectProgress = sumProgress / taskData.length;
        }
      }

      // Làm tròn 2 chữ số thập phân và giới hạn trong khoảng 0-100
      projectProgress = Math.min(Math.max(Math.round(projectProgress * 100) / 100, 0), 100);

      await this.projectRepo.update(projectId, { progress: projectProgress });
    } catch (error) {
      this.logger.error(`Lỗi khi tính toán tiến độ dự án ${projectId}: ${error.message}`);
    }
  }

  /**
   * Tạo mới một đợt giải ngân cho dự án
   */
  async createDisbursement(
    projectId: number,
    createDto: CreateProjectDisbursementDto,
    userId: string
  ) {
    try {
      // Kiểm tra dự án tồn tại
      const project = await this.projectRepo.findOne({
        where: { id: projectId, status: 1 }
      });

      if (!project) {
        throw new NotFoundException(`Dự án ID ${projectId} không tồn tại`);
      }

      if (project.projectStatus === 3 || project.projectStatus === 4) {
        throw new BadRequestException('Dự án đã Hoàn thành hoặc Hủy, không thể thêm đợt giải ngân.');
      }

      // Kiểm tra người giải ngân nếu có truyền vào
      if (createDto.disbursedByUserId) {
        const userExists = await this.userRepo.findOne({
          where: { id: createDto.disbursedByUserId }
        });
        if (!userExists) {
          throw new BadRequestException(`Người giải ngân không tồn tại trong hệ thống`);
        }
      }

      // Kiểm tra ngày giải ngân không trước ngày bắt đầu dự án
      let disbursementDate = new Date();
      if (createDto.disbursementDate) {
        disbursementDate = new Date(createDto.disbursementDate);
      }

      if (project.startDate && disbursementDate < project.startDate) {
        throw new BadRequestException(
          `Thời gian giải ngân không được trước ngày bắt đầu dự án (${project.startDate.toLocaleDateString('vi-VN')})`
        );
      }

      // Tạo bản ghi giải ngân (Giao diện nhập số tiền bằng VND nên mặc định đơn vị tiền tệ giải ngân là 1)
      const unit = createDto.moneyUnit ? Number(createDto.moneyUnit) : 1;
      const disbursement = this.disbursementRepo.create({
        projectId,
        disbursementAmount: createDto.disbursementAmount,
        moneyUnit: unit,
        disbursementDate,
        disbursedByUserId: createDto.disbursedByUserId,
        notes: createDto.notes || null,
        status: 1,
        createdBy: userId
      } as any);

      const saved = await this.disbursementRepo.save(disbursement) as any;
      const effectiveMoneyUnit = Number(saved.moneyUnit) || (project.moneyUnit ? Number(project.moneyUnit) : 1);
      const moneyUnitObj = await this.mapMoneyUnitDetail(effectiveMoneyUnit);
      const moneyUnitVal = Number(moneyUnitObj?.value) || effectiveMoneyUnit;
      const calculatedAmount = Number(saved.disbursementAmount || 0) * moneyUnitVal;

      return {
        id: saved.id,
        projectId: saved.projectId,
        disbursementAmount: saved.disbursementAmount,
        moneyUnit: moneyUnitObj,
        calculatedAmount,
        disbursementDate: saved.disbursementDate,
        disbursedByUserId: saved.disbursedByUserId,
        notes: saved.notes,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
        createdBy: saved.createdBy
      };
    } catch (error) {
      this.logger.error(`Lỗi tạo giải ngân cho dự án ${projectId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cập nhật một đợt giải ngân
   */
  async updateDisbursement(
    disbursementId: number,
    projectId: number,
    updateDto: UpdateProjectDisbursementDto,
    userId: string
  ) {
    try {
      const disbursement = await this.disbursementRepo.findOne({
        where: { id: disbursementId, projectId, status: 1 }
      });

      if (!disbursement) {
        throw new NotFoundException(`Giải ngân ID ${disbursementId} không tồn tại hoặc thuộc dự án khác`);
      }

      // Kiểm tra người giải ngân nếu cập nhật
      if (updateDto.disbursedByUserId && updateDto.disbursedByUserId !== disbursement.disbursedByUserId) {
        const userExists = await this.userRepo.findOne({
          where: { id: updateDto.disbursedByUserId }
        });

        if (!userExists) {
          throw new BadRequestException(`Người giải ngân không tồn tại trong hệ thống`);
        }
      }

      // Kiểm tra trạng thái dự án trước khi cập nhật giải ngân
      const project = await this.projectRepo.findOne({
        where: { id: projectId, status: 1 }
      });

      if (!project) {
        throw new NotFoundException(`Dự án ID ${projectId} không tồn tại`);
      }

      if (project.projectStatus === 3 || project.projectStatus === 4) {
        throw new BadRequestException('Dự án đã Hoàn thành hoặc Hủy, không thể cập nhật đợt giải ngân.');
      }

      // Kiểm tra ngày giải ngân
      if (updateDto.disbursementDate) {
        const disbursementDate = new Date(updateDto.disbursementDate);
        if (project.startDate && disbursementDate < project.startDate) {
          throw new BadRequestException(
            `Thời gian giải ngân không được trước ngày bắt đầu dự án`
          );
        }
      }

      // Cập nhật các trường được gửi
      if (updateDto.disbursementAmount !== undefined) {
        disbursement.disbursementAmount = updateDto.disbursementAmount;
      }
      if (updateDto.disbursementDate !== undefined) {
        disbursement.disbursementDate = new Date(updateDto.disbursementDate);
      }
      if (updateDto.disbursedByUserId !== undefined) {
        disbursement.disbursedByUserId = updateDto.disbursedByUserId;
      }
      if (updateDto.moneyUnit !== undefined) {
        disbursement.moneyUnit = Number(updateDto.moneyUnit);
      }
      if (updateDto.notes !== undefined) {
        disbursement.notes = updateDto.notes;
      }

      disbursement.updatedAt = new Date();

      const saved = await this.disbursementRepo.save(disbursement);
      const effectiveMoneyUnit = Number(saved.moneyUnit) || (project.moneyUnit ? Number(project.moneyUnit) : 1);
      const moneyUnitObj = await this.mapMoneyUnitDetail(effectiveMoneyUnit);
      const moneyUnitVal = Number(moneyUnitObj?.value) || effectiveMoneyUnit;
      const calculatedAmount = Number(saved.disbursementAmount || 0) * moneyUnitVal;

      return {
        id: saved.id,
        projectId: saved.projectId,
        disbursementAmount: saved.disbursementAmount,
        moneyUnit: moneyUnitObj,
        calculatedAmount,
        disbursementDate: saved.disbursementDate,
        disbursedByUserId: saved.disbursedByUserId,
        notes: saved.notes,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
        createdBy: saved.createdBy
      };
    } catch (error) {
      this.logger.error(`Lỗi cập nhật giải ngân ${disbursementId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Xóa mềm một đợt giải ngân
   */
  async deleteDisbursement(disbursementId: number, projectId: number) {
    try {
      const project = await this.projectRepo.findOne({
        where: { id: projectId, status: 1 }
      });

      if (!project) {
        throw new NotFoundException(`Dự án ID ${projectId} không tồn tại`);
      }

      if (project.projectStatus === 3 || project.projectStatus === 4) {
        throw new BadRequestException('Dự án đã Hoàn thành hoặc Hủy, không thể xóa đợt giải ngân.');
      }

      const disbursement = await this.disbursementRepo.findOne({
        where: { id: disbursementId, projectId, status: 1 }
      });

      if (!disbursement) {
        throw new NotFoundException(`Giải ngân ID ${disbursementId} không tồn tại`);
      }

      disbursement.status = 3; // Đánh dấu xóa
      await this.disbursementRepo.save(disbursement);

      return { success: true, message: 'Xóa giải ngân thành công' };
    } catch (error) {
      this.logger.error(`Lỗi xóa giải ngân ${disbursementId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lấy danh sách giải ngân của dự án (có hỗ trợ phân trang)
   */
  async getDisbursementList(projectId: number, page: number = 1, limit: number = 25) {
    try {
      const project = await this.projectRepo.findOne({
        where: { id: projectId, status: 1 }
      });

      if (!project) {
        throw new NotFoundException(`Dự án ID ${projectId} không tồn tại`);
      }

      const skip = Math.max((page - 1) * limit, 0);

      // Lấy danh sách giải ngân với phân trang
      const [disbursements, total] = await this.disbursementRepo
        .createQueryBuilder('d')
        .where('d.projectId = :projectId', { projectId })
        .andWhere('d.status = :status', { status: 1 })
        .leftJoinAndSelect('d.disbursedByUser', 'user')
        .orderBy('d.createdAt', 'ASC')
        .skip(skip)
        .take(Math.max(limit, 1))
        .getManyAndCount();

      // Chuẩn bị dữ liệu danh sách
      const projectMoneyUnit = project.moneyUnit ? Number(project.moneyUnit) : 1;
      const moneyUnitMap = new Map<string, any>();
      const data = await Promise.all(disbursements.map(async d => {
        const amount = d.disbursementAmount != null ? Number(d.disbursementAmount) : 0;
        const unit = d.moneyUnit ? Number(d.moneyUnit) : projectMoneyUnit;
        const unitKey = String(unit);
        if (!moneyUnitMap.has(unitKey)) {
          moneyUnitMap.set(unitKey, await this.mapMoneyUnitDetail(unit));
        }
        const moneyUnitObj = moneyUnitMap.get(unitKey);
        const multiplier = Number(moneyUnitObj?.value) || Number(unit) || 1;
        const calculated = amount * multiplier;

        return {
          id: d.id,
          projectId: d.projectId,
          disbursementAmountRaw: amount,
          moneyUnit: moneyUnitObj,
          disbursementAmount: amount.toLocaleString('vi-VN'),
          calculatedAmount: calculated,
          calculatedAmountFormat: calculated.toLocaleString('vi-VN'),
          disbursementDate: d.disbursementDate ? moment(d.disbursementDate).format('DD/MM/YYYY HH:mm') : null,
          disbursedByUserId: d.disbursedByUserId || '',
          disbursedByUserName: d.disbursedByUser?.name || 'Unknown',
          notes: d.notes || '',
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          createdBy: d.createdBy || ''
        };
      }));

      return {
        data,
        total,
        page: Math.max(page, 1),
        limit: Math.max(limit, 1),
        totalPages: Math.ceil(total / Math.max(limit, 1))
      };
    } catch (error) {
      this.logger.error(`Lỗi lấy danh sách giải ngân dự án ${projectId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Lấy thông tin tóm tắt giải ngân của dự án
   */
  async getDisbursementSummary(projectId: number) {
    try {
      const project = await this.projectRepo.findOne({
        where: { id: projectId, status: 1 }
      });

      if (!project) {
        throw new NotFoundException(`Dự án ID ${projectId} không tồn tại`);
      }

      // Lấy danh sách giải ngân để tính tổng
      const disbursements = await this.disbursementRepo.find({
        where: {
          projectId,
          status: 1
        }
      });

      // Tính toán thông tin tóm tắt
      const projectMoneyUnit = project.moneyUnit ? Number(project.moneyUnit) : 1;
      const moneyUnitObj = await this.mapMoneyUnitDetail(projectMoneyUnit);
      const moneyUnitVal = Number(moneyUnitObj?.value) || Number(projectMoneyUnit) || 1;

      const totalInvestmentRaw = project.budget ? Number(project.budget) : 0;
      const totalInvestment = totalInvestmentRaw * moneyUnitVal;

      const totalDisbursementRaw = disbursements.reduce(
        (sum, d) => sum + (d.disbursementAmount ? Number(d.disbursementAmount) : 0),
        0
      );

      const totalDisbursement = disbursements.reduce(
        (sum, d) => {
          const amount = d.disbursementAmount ? Number(d.disbursementAmount) : 0;
          const unit = d.moneyUnit ? Number(d.moneyUnit) : projectMoneyUnit;
          return sum + (amount * (Number(unit) || 1));
        },
        0
      );

      const disbursementCount = disbursements.length;
      const percentage = totalInvestment > 0 ? Number(((totalDisbursement / totalInvestment) * 100).toFixed(2)) : 0;

      return {
        moneyUnit: moneyUnitObj,
        totalInvestmentRaw,
        totalInvestment,
        totalDisbursementRaw,
        totalDisbursement,
        disbursementCount,
        disbursementPercentage: percentage
      };
    } catch (error) {
      this.logger.error(`Lỗi lấy thông tin tóm tắt giải ngân dự án ${projectId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Lấy chi tiết một đợt giải ngân
   */
  async getDisbursementById(disbursementId: number, projectId: number) {
    try {
      const project = await this.projectRepo.findOne({ where: { id: projectId, status: 1 }, select: ['moneyUnit'] });
      const disbursement = await this.disbursementRepo
        .createQueryBuilder('d')
        .where('d.id = :disbursementId', { disbursementId })
        .andWhere('d.projectId = :projectId', { projectId })
        .andWhere('d.status = :status', { status: 1 })
        .leftJoinAndSelect('d.disbursedByUser', 'user')
        .getOne();

      if (!disbursement) {
        throw new NotFoundException(`Giải ngân ID ${disbursementId} không tồn tại hoặc không thuộc dự án ID ${projectId}`);
      }

      const unit = disbursement.moneyUnit ? Number(disbursement.moneyUnit) : (project?.moneyUnit ? Number(project.moneyUnit) : 1);
      const moneyUnitObj = await this.mapMoneyUnitDetail(unit);
      const multiplier = Number(moneyUnitObj?.value) || Number(unit) || 1;
      const amountRaw = disbursement.disbursementAmount ? Number(disbursement.disbursementAmount) : 0;
      const calculatedAmount = amountRaw * multiplier;

      return {
        id: disbursement.id,
        projectId: disbursement.projectId,
        disbursementAmount: amountRaw,
        moneyUnit: moneyUnitObj,
        calculatedAmount,
        disbursementDate: disbursement.disbursementDate,
        disbursedByUserId: disbursement.disbursedByUserId || '',
        disbursedByUserName: disbursement.disbursedByUser?.name || 'Unknown',
        notes: disbursement.notes || '',
        createdAt: disbursement.createdAt,
        updatedAt: disbursement.updatedAt,
        createdBy: disbursement.createdBy || ''
      };
    } catch (error) {
      this.logger.error(`Lỗi lấy chi tiết giải ngân ID ${disbursementId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Lấy trạng thái của dự án theo ID
   */
  async getProjectStatus(id: number): Promise<number | null> {
    try {
      const project = await this.projectRepo.findOne({
        where: { id, status: 1 },
        select: ['projectStatus']
      });
      return project ? project.projectStatus : null;
    } catch {
      return null;
    }
  }
}

