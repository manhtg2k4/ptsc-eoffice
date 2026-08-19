import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  In,
  SelectQueryBuilder,
  QueryRunner,
  Between,
  Brackets,
} from 'typeorm';
import { TaskEntity } from './entity/task.entity';
import { TaskUserEntity } from './entity/task-user.entity';
import { TaskRecurringConfigEntity } from './entity/task-recurring-config.entity';
import { ProjectEntity } from '../project/entities/project.entity';
import { TaskAssignmentConfigEntity } from './entity/task-assignment-config.entity';
import { GroupUserEntity } from '../group-users/entities/group-users.entity';
import { CreateTaskDto, TASK_TYPE } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryParams } from '../interfaces';
import { UserEntity } from '../users/entities/user.entity';
import { OrganizationUnitEntity } from '../organization-unit/organization-unit_sql/organization-unit.entity';
import { SystemLogDto } from './dto/system-log';
import { SystemLogTaskServiceSql } from './dto/system-log-service-sql';
import * as ExcelJS from 'exceljs';
import * as dayjs from 'dayjs';
import * as moment from 'moment';
import { ListTaskDto, TaskTab } from './dto/list-task.dto';
import { buildProgressView, buildTypeRequestView, buildTypeTaskView, buildApprovalStatusView } from './progress.util';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { MSSQLRepository } from '../database/sqlRepo.mssql';
import { RuntimeDbService } from '../bpmn/runtime-dbmssql.service';
import { MSSQL_REPO } from 'src/database/database.provider';
import { BpmnEngineService, BpmnIndexes } from 'src/bpmn/bpmn-engine.service';
import { SendApprovalDto } from './dto/send-approval.dto';
import {
  getAllNodeExtensionProperties,
  getAllNodeExtensionPropertiesV2,
} from 'src/utils/util';
import { GROUP_CODES, stageStatusDoc, DOCTYPE } from 'src/variable/CONST_STATUS';
import actionCatalog from 'src/variable/action-catalog';
import { Workflows, TaskRoutingKey, TaskUserType, TaskUserRole, TaskRecurringStatus } from './entity/task.constants';
// import PdfPrinter from 'pdfmake';
import { FilesRepository } from '../files-managerment/repositories/files.repository';
import { TaskDelegationService } from './task-delegation.service';
import { TaskRepository } from './repositories/task.repository';
import { TaskRecurringConfigRepository } from './repositories/recurring-config.repository';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { NotificationService } from 'src/notifycation/notification.service';
import { NotificationKey, NotificationType } from 'src/notifycation/notification.enum';
import { ConfigurationService } from 'src/view-config/configuration.service';
import { TaskAssignmentConfigService } from './task-assignment-config.service';
import { MailService } from 'src/mail/mail.service';
import { DocumentsService } from 'src/documents/documents.service';
import { ProjectService } from '../project/project.service';
import { ProcessTemplateTaskEntity } from 'src/process-template/entities/process-template-task.entity';
import { ProcessTemplateEntity } from 'src/process-template/entities/process-template.entity';
import { validateProjectTaskImport, ImportRow } from './import/project-task-import.validator';
import { TaskDocumentLinkEntity } from 'src/task-document-link/entities/task-document-link.entity';

const safeQuery = async (dataSource: DataSource, query: string, params: any[] = []) => {
  const result = await dataSource.query(query, params);
  return Array.isArray(result) ? result : [];
};

export const RED_FLAG_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path opacity="0.5" fill-rule="evenodd" clip-rule="evenodd" d="M5.5 1.75C5.5 1.55109 5.42098 1.36032 5.28033 1.21967C5.13968 1.07902 4.94891 1 4.75 1C4.55109 1 4.36032 1.07902 4.21967 1.21967C4.07902 1.36032 4 1.55109 4 1.75V21.75C4 21.9489 4.07902 22.1397 4.21967 22.2803C4.36032 22.421 4.55109 22.5 4.75 22.5C4.94891 22.5 5.13968 22.421 5.28033 22.2803C5.42098 22.1397 5.5 21.9489 5.5 21.75V1.75Z" fill="#B70B13"/>
<path d="M12.349 1.70161L12.145 1.61961C10.5819 0.99587 8.8715 0.838861 7.221 1.16761L5.5 1.51161V11.5116L7.22 11.1676C8.87082 10.8387 10.5816 10.9957 12.145 11.6196C13.8386 12.2966 15.7025 12.423 17.472 11.9806L17.686 11.9276C17.9898 11.8518 18.2596 11.6765 18.4524 11.4297C18.6452 11.1829 18.75 10.8788 18.75 10.5656V3.19861C18.7499 3.01638 18.7084 2.83656 18.6284 2.67278C18.5485 2.50901 18.4324 2.36558 18.2887 2.2534C18.1451 2.14121 17.9779 2.0632 17.7996 2.0253C17.6214 1.98739 17.4368 1.99057 17.26 2.03461C15.6286 2.44218 13.9102 2.32631 12.349 1.70161Z" fill="#FF4A4A"/>
<path d="M7.26953 1.41309C8.8724 1.09382 10.5338 1.24594 12.0518 1.85156L12.2559 1.93359C13.8659 2.57782 15.6381 2.69753 17.3203 2.27734C17.4603 2.24248 17.6069 2.23952 17.748 2.26953C17.889 2.29956 18.0212 2.36152 18.1348 2.4502C18.2484 2.53893 18.3401 2.65271 18.4033 2.78223C18.4665 2.91174 18.4999 3.05413 18.5 3.19824V10.5654C18.5 10.8226 18.4141 11.0726 18.2559 11.2754C18.0974 11.4782 17.8747 11.6222 17.625 11.6846L17.4121 11.7383H17.4111C15.6929 12.1678 13.8829 12.045 12.2383 11.3877H12.2373C10.6291 10.7459 8.86908 10.5845 7.1709 10.9229L5.75 11.2061V1.71582L7.26953 1.41309Z" stroke="black" stroke-opacity="0.2" stroke-width="0.5"/>
</svg>`;

export const WHITE_FLAG_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path opacity="0.5" fill-rule="evenodd" clip-rule="evenodd" d="M6.5 1.75C6.5 1.55109 6.42098 1.36032 6.28033 1.21967C6.13968 1.07902 5.94891 1 5.75 1C5.55109 1 5.36032 1.07902 5.21967 1.21967C5.07902 1.36032 5 1.55109 5 1.75V21.75C5 21.9489 5.07902 22.1397 5.21967 22.2803C5.36032 22.421 5.55109 22.5 5.75 22.5C5.94891 22.5 6.13968 22.421 6.28033 22.2803C6.42098 22.1397 6.5 21.9489 6.5 21.75V1.75Z" fill="#4A5565"/>
<g opacity="0.5" filter="url(#filter0_d_1207_9524)">
<path d="M13.349 3.78999L13.145 3.70799C11.5819 3.08425 9.8715 2.92724 8.221 3.25599L6.5 3.59999V13.6L8.22 13.256C9.87082 12.927 11.5816 13.0841 13.145 13.708C14.8386 14.385 16.7025 14.5113 18.472 14.069L18.686 14.016C18.9898 13.9402 19.2596 13.7649 19.4524 13.5181C19.6452 13.2713 19.75 12.9672 19.75 12.654V5.28699C19.7499 5.10476 19.7084 4.92493 19.6284 4.76116C19.5485 4.59739 19.4324 4.45396 19.2887 4.34178C19.1451 4.22959 18.9779 4.15158 18.7996 4.11367C18.6214 4.07577 18.4368 4.07895 18.26 4.12299C16.6286 4.53056 14.9102 4.41469 13.349 3.78999Z" fill="white"/>
<path d="M8.26953 3.50146C9.8724 3.1822 11.5338 3.33432 13.0518 3.93994L13.2559 4.02197C14.8659 4.66619 16.6381 4.78591 18.3203 4.36572C18.4603 4.33086 18.6069 4.3279 18.748 4.35791C18.889 4.38794 19.0212 4.4499 19.1348 4.53857C19.2484 4.62731 19.3401 4.74109 19.4033 4.87061C19.4665 5.00012 19.4999 5.14251 19.5 5.28662V12.6538C19.5 12.911 19.4141 13.161 19.2559 13.3638C19.0974 13.5666 18.8747 13.7106 18.625 13.7729L18.4121 13.8267H18.4111C16.6929 14.2561 14.8829 14.1334 13.2383 13.4761H13.2373C11.6291 12.8343 9.86908 12.6728 8.1709 13.0112L6.75 13.2944V3.8042L8.26953 3.50146Z" stroke="black" stroke-opacity="0.3" stroke-width="0.5"/>
</g>
<defs>
<filter id="filter0_d_1207_9524" x="2.5" y="3.08838" width="21.25" height="19.2397" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="4"/>
<feGaussianBlur stdDeviation="2"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1207_9524"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1207_9524" result="shape"/>
</filter>
</defs>
</svg>`;

interface WorkItem {
  id: string;
  nodeId: string;
  role: string;
  assigneeUserId?: string | null;
  nodeType: string;
  meta?: any;
}

interface ModelCache {
  process: any;
  indexes: BpmnIndexes;
  path: string;
}
export interface CompletedTaskStatisticItem {
  id: any;
  name: any;
  startDate: any;
  endDate: any;
  completeHours: number;
  completeDays: number;
  directorId: any;
  directorName: any;
}

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  // =====================================================
  // CLASS-LEVEL CONSTANTS (tránh tạo lại mảng mỗi request)
  // =====================================================
  private static readonly LEADER_GROUP_CODES = ['tonggd', 'phodgtongcty'];
  private static readonly MANAGER_GROUP_CODES = ['truongphong', 'photruongphong'];
  private static readonly PHONG_BAN_ALLOWED_ROLES = ['NGUOI_GIAO', 'NGUIO_GIAO', 'NGUOI_CHU_TRI', 'NGUOI_PHOI_HOP'];
  constructor(
    @Inject(MSSQL_REPO) private readonly sqlRepo: MSSQLRepository,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly taskRepository: TaskRepository,
    @InjectRepository(TaskUserEntity, 'mssqlConnection')
    private readonly taskUserRepository: Repository<TaskUserEntity>,
    @InjectDataSource('mssqlConnection')
    private readonly dataSource: DataSource,
    // @InjectModel(SystemLogTask.name)
    // private readonly systemLogModel: Model<SystemLogDocument>,
    // @InjectRepository(SystemLogEntity, 'mssqlConnection')
    private readonly systemLogTaskServiceSql: SystemLogTaskServiceSql,
    private readonly runtimeService: RuntimeDbService,
    private readonly bpmnEngine: BpmnEngineService,
    private readonly filesRepository: FilesRepository,
    private readonly taskRepo: TaskRepository,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
    private readonly mailService: MailService,
    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserRepository: Repository<GroupUserEntity>,
    private readonly configurationService: ConfigurationService,
    @Inject(forwardRef(() => DocumentsService))
    private readonly documentsService: DocumentsService,
    private readonly recurringConfigRepo: TaskRecurringConfigRepository,
    @Inject(forwardRef(() => ProjectService))
    private readonly projectService: ProjectService,
    @InjectRepository(ProcessTemplateEntity, 'mssqlConnection')
    private readonly processTemplateRepo: Repository<ProcessTemplateEntity>,
    private readonly SystemLogServiceSql: SystemLogServiceSql,
    private readonly assignmentConfigService: TaskAssignmentConfigService,
    private readonly delegationService: TaskDelegationService,
    @InjectRepository(TaskDocumentLinkEntity, 'mssqlConnection')
    private readonly taskDocumentLinkRepository: Repository<TaskDocumentLinkEntity>,
  ) { }

  private async ensurePhongBanTaskPermission(userId: string): Promise<void> {
    const user: any = await this.sqlsvRepo.getUserById(userId);
    if (!user?.parent?.id) {
      throw new BadRequestException('Không xác định được đơn vị người dùng');
    }

    const [flowConfig, flowConfigCvdan] = await Promise.all([
      this.sqlsvRepo.getFlowByUnit(String(user.parent.id), 'TaskManyUnit'),
      this.sqlsvRepo.getFlowByUnit(String(user.parent.id), 'TaskProject'),
    ]);

    if (!flowConfig?.id && !flowConfigCvdan?.id) {
      throw new BadRequestException('Không tìm thấy luồng công việc phòng ban hoặc dự án');
    }

    const allowedUserIds = new Set<string>();

    if (flowConfig?.id) {
      await this.sqlRepo.getBpmnFile('QUY_TRINH_CV_PHONG_BAN');
      const candidateLists = await Promise.all(
        TaskService.PHONG_BAN_ALLOWED_ROLES.map((role) =>
          this.sqlRepo.getUsersByRoleInFlow(flowConfig.id, role),
        ),
      );
      candidateLists.flatMap((ids: any[]) => (ids || []).forEach((x: any) => allowedUserIds.add(String(x))));
    }

    if (flowConfigCvdan?.id) {
      const candidateListsCvdan = await Promise.all(
        TaskService.PHONG_BAN_ALLOWED_ROLES.map((role) =>
          this.sqlRepo.getUsersByRoleInFlow(flowConfigCvdan.id, role),
        ),
      );
      candidateListsCvdan.flatMap((ids: any[]) => (ids || []).forEach((x: any) => allowedUserIds.add(String(x))));
    }

    if (!allowedUserIds.has(String(userId))) {
      throw new BadRequestException(
        'Bạn không có quyền thao tác công việc theo quy trình phòng ban hoặc dự án',
      );
    }
  }

  async importProjectTaskExcel(file?: Express.Multer.File, userId?: string, inputRows?: any[]) {
    let rows: ImportRow[] = [];
    if (Array.isArray(inputRows) && inputRows.length > 0) {
      const toText = (v: any): string => (v == null ? '' : String(v).trim());
      rows = inputRows
        .filter((x) => x && typeof x === 'object')
        .map((x: any, idx: number) => ({
          rowNumber: idx + 1,
          stt: toText(x.stt),
          name: toText(x.name),
          startDate: toText(x.startDate),
          endDate: toText(x.endDate),
          remindDays: toText(x.reminderTime),
          priority: toText(x.priority),
          description: toText(x.note),
          projectType: toText(x.typeProject),
          investmentTotal: toText(x.budget),
          projectManager: toText(x.manager),
          projectMembers: toText(x.members),
          projectViewers: toText(x.viewers || x.projectViewers),
          assigner: toText(x.assigners || x.assigner),
          director: toText(x.directors || x.director),
          supporters: toText(x.supporters || x.supporter),
          taskViewers: toText(x.viewers || x.viewer || x.taskViewers),
          approvalRequired: toText(x.isApprovalRequired),
        }))
        .filter((x) => x.stt || x.name);
    } else {
      if (!file?.path) {
        throw new BadRequestException('Thiếu file import.');
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(file.path);
      const sheet = workbook.worksheets?.[0];
      if (!sheet) {
        throw new BadRequestException('File Excel không có worksheet.');
      }
      const cellText = (v: any): string => {
        if (v == null) return '';
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
        if (v instanceof Date) return String(v);
        if (typeof v === 'object') {
          if (typeof v.text === 'string') return v.text;
          if (Array.isArray(v.richText)) return v.richText.map((x: any) => x?.text || '').join('');
          if (v.result != null) return String(v.result);
        }
        return String(v);
      };

      const normalizeHeader = (v: unknown) =>
        cellText(v)
          .toLowerCase()
          .replace(/\*/g, '')
          .replace(/\s+/g, ' ')
          .trim();

      let headerRowNo = 0;
      const maxScan = Math.min(sheet.rowCount, 30);
      for (let i = 1; i <= maxScan; i++) {
        const rowObj = sheet.getRow(i);
        const normalized: string[] = [];
        for (let c = 1; c <= rowObj.cellCount; c++) {
          normalized.push(normalizeHeader(rowObj.getCell(c).value));
        }
        const hasStt = normalized.some((v) => v === 'stt' || v.includes('stt'));
        const hasName = normalized.some(
          (v) =>
            v.includes('tên dự án / công việc') ||
            v.includes('ten du an / cong viec') ||
            (v.includes('tên dự án') && v.includes('công việc')) ||
            (v.includes('ten du an') && v.includes('cong viec')),
        );
        if (hasStt && hasName) {
          headerRowNo = i;
          break;
        }
      }
      if (!headerRowNo) {
        for (let i = 1; i <= maxScan; i++) {
          const rowObj = sheet.getRow(i);
          const normalized: string[] = [];
          for (let c = 1; c <= rowObj.cellCount; c++) {
            normalized.push(normalizeHeader(rowObj.getCell(c).value));
          }
          const hasStt = normalized.some((v) => v === 'stt' || v.includes('stt'));
          const hasStart = normalized.some((v) => v.includes('ngày bắt đầu') || v.includes('ngay bat dau'));
          const hasEnd = normalized.some((v) => v.includes('ngày kết thúc') || v.includes('ngay ket thuc'));
          if (hasStt && hasStart && hasEnd) {
            headerRowNo = i;
            break;
          }
        }
      }
      if (!headerRowNo) {
        const preview: any[] = [];
        for (let i = 1; i <= Math.min(maxScan, 10); i++) {
          const rowObj = sheet.getRow(i);
          const cells: string[] = [];
          for (let c = 1; c <= rowObj.cellCount; c++) {
            const n = normalizeHeader(rowObj.getCell(c).value);
            if (n) cells.push(n);
          }
          preview.push({ row: i, cells });
        }
        this.logger.error(`[import-project-task-excel] header-not-found | preview=${JSON.stringify(preview)}`);
        throw new BadRequestException('Không tìm thấy dòng header hợp lệ.');
      }

      const headerRow = sheet.getRow(headerRowNo);
      const headerMap = new Map<string, number>();
      for (let c = 1; c <= headerRow.cellCount; c++) {
        const raw = normalizeHeader(headerRow.getCell(c).value);
        if (raw) headerMap.set(raw, c);
      }

      const col = (labels: string[]) => {
        for (const lb of labels) {
          const key = normalizeHeader(lb);
          const exact = headerMap.get(key);
          if (exact) return exact;
          for (const [h, idx] of headerMap.entries()) {
            if (h.includes(key) || key.includes(h)) return idx;
          }
        }
        return 0;
      };

      const cols = {
        stt: col(['stt*', 'stt']),
        name: col(['tên dự án / công việc*', 'tên dự án / công việc']),
        startDate: col(['ngày bắt đầu*', 'ngày bắt đầu']),
        endDate: col(['ngày kết thúc*', 'ngày kết thúc']),
        remindDays: col(['thời gian nhắc hạn (ngày)']),
        priority: col(['độ ưu tiên']),
        description: col(['mô tả']),
        projectType: col(['loại dự án']),
        investmentTotal: col(['tổng mức đầu tư']),
        projectManager: col(['quản lý dự án*', 'quản lý dự án']),
        projectMembers: col(['thành viên dự án']),
        projectViewers: col(['người xem dự án']),
        assigner: col(['người giao việc*', 'người giao việc']),
        director: col(['người chủ trì*', 'người chủ trì']),
        supporters: col(['người phối hợp']),
        taskViewers: col(['người xem công việc']),
        approvalRequired: col(['công việc cần phê duyệt']),
      };

      rows = [];
      for (let r = headerRowNo + 1; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const sttVal = cols.stt ? row.getCell(cols.stt).text : '';
        const nameVal = cols.name ? row.getCell(cols.name).text : '';
        if (!String(sttVal).trim() && !String(nameVal).trim()) continue;

        rows.push({
          rowNumber: r,
          stt: cols.stt ? row.getCell(cols.stt).text : '',
          name: cols.name ? row.getCell(cols.name).text : '',
          startDate: cols.startDate ? row.getCell(cols.startDate).text : '',
          endDate: cols.endDate ? row.getCell(cols.endDate).text : '',
          remindDays: cols.remindDays ? row.getCell(cols.remindDays).text : '',
          priority: cols.priority ? row.getCell(cols.priority).text : '',
          description: cols.description ? row.getCell(cols.description).text : '',
          projectType: cols.projectType ? row.getCell(cols.projectType).text : '',
          investmentTotal: cols.investmentTotal ? row.getCell(cols.investmentTotal).text : '',
          projectManager: cols.projectManager ? row.getCell(cols.projectManager).text : '',
          projectMembers: cols.projectMembers ? row.getCell(cols.projectMembers).text : '',
          projectViewers: cols.projectViewers ? row.getCell(cols.projectViewers).text : '',
          assigner: cols.assigner ? row.getCell(cols.assigner).text : '',
          director: cols.director ? row.getCell(cols.director).text : '',
          supporters: cols.supporters ? row.getCell(cols.supporters).text : '',
          taskViewers: cols.taskViewers ? row.getCell(cols.taskViewers).text : '',
          approvalRequired: cols.approvalRequired ? row.getCell(cols.approvalRequired).text : '',
        });
      }
    }

    const users = await safeQuery(this.dataSource, `
      SELECT id, username, name, status
      FROM users
      WHERE (username IS NOT NULL OR name IS NOT NULL)
    `, []);
    const userDirectory: Array<{ username: string; active: boolean }> = [];
    const userIdByAlias = new Map<string, string>();
    const normalizeUserKey = (v: string) =>
      String(v || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    for (const u of users) {
      const active = Number(u.status) === 1;
      if (u.username) {
        const username = String(u.username).trim();
        userDirectory.push({ username, active });
        if (u.id) userIdByAlias.set(normalizeUserKey(username), String(u.id));
      }
      if (u.name) {
        const name = String(u.name).trim();
        userDirectory.push({ username: name, active });
        if (u.id) userIdByAlias.set(normalizeUserKey(name), String(u.id));
      }
    }

    const projectTypes = await safeQuery(this.dataSource, `
      SELECT csd.title
      FROM crm_sources cs
      INNER JOIN crm_source_data csd ON cs.id = csd.source_id
      WHERE cs.code = 'LOAIDUAN'
    `, []);

    const normalizeType = (v: string) =>
      String(v || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '')
        .trim();

    const rawExistingTypes = projectTypes
      .map((x: any) => String(x.title || '').trim())
      .filter(Boolean);
    const existingTypeSet = new Set(rawExistingTypes.map(normalizeType));

    const missingTypeMap = new Map<string, string>(); // normalized -> display title
    for (const r of rows) {
      const stt = String(r.stt || '').trim();
      if (!stt || stt.includes('.')) continue; // chỉ dòng dự án
      const t = String(r.projectType || '').trim();
      if (!t) continue;
      const n = normalizeType(t);
      if (!n || existingTypeSet.has(n) || missingTypeMap.has(n)) continue;

      let display = t;
      missingTypeMap.set(n, display);
    }

    const createdProjectTypes: string[] = [];
    if (missingTypeMap.size > 0) {
      const sourceRow = await safeQuery(this.dataSource, `
        SELECT TOP 1 id
        FROM crm_sources
        WHERE code = 'LOAIDUAN'
      `, []);
      const sourceId = sourceRow?.[0]?.id;
      if (sourceId) {
        for (const [normalized, display] of missingTypeMap.entries()) {
          const exists = await this.dataSource.query(
            `
              SELECT TOP 1 id
              FROM crm_source_data
              WHERE source_id = @0
                AND (
                  LOWER(REPLACE(REPLACE(REPLACE(title, N' ', N''), NCHAR(9), N''), NCHAR(160), N'')) = @1
                  OR LOWER(REPLACE(REPLACE(REPLACE(value, N' ', N''), NCHAR(9), N''), NCHAR(160), N'')) = @1
                )
            `,
            [sourceId, normalized],
          );
          if (exists?.length) continue;

          const insertParams = [sourceId, display, normalized];
          try {
            await this.dataSource.query(
              `
                INSERT INTO crm_source_data (id, source_id, title, value, createdAt, updatedAt)
                VALUES (NEWID(), @0, @1, @2, GETDATE(), GETDATE())
              `,
              insertParams,
            );
          } catch (error: any) {
            this.logger.error(
              `[import-project-task-excel] insert crm_source_data failed | sourceId=${sourceId} | title=${display} | value=${normalized} | sqlCode=${error?.code || 'N/A'} | message=${error?.message}`,
              error?.stack,
            );
            throw error;
          }
          createdProjectTypes.push(display);
          existingTypeSet.add(normalized);
          rawExistingTypes.push(display);
        }
      }
    }

    const result = validateProjectTaskImport({
      rows,
      users: userDirectory,
      projectTypes: rawExistingTypes,
      allowProjectTaskFields: Array.isArray(inputRows) && inputRows.length > 0,
    });

    if (result.valid) {
      const parseUsers = (raw?: string): string[] =>
        String(raw || '')
          .split(';')
          .map((x) => x.trim())
          .filter(Boolean);
      const parseDate = (v: string | Date | undefined): Date | null => {
        if (!v) return null;
        if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
        const raw = String(v).trim();
        const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*-\s*(\d{1,2}):(\d{2}))?$/);
        if (m) {
          const d = Number(m[1]);
          const mo = Number(m[2]);
          const y = Number(m[3]);
          const hh = Number(m[4] ?? 0);
          const mm = Number(m[5] ?? 0);
          const dt = new Date(y, mo - 1, d, hh, mm, 0, 0);
          if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) return dt;
        }
        const t = new Date(raw);
        return Number.isNaN(t.getTime()) ? null : t;
      };
      const normalizePriority = (v?: string) => {
        const n = String(v || '').trim().toLowerCase().replace(/\s+/g, '');
        return n === 'gấp' || n === 'gap' ? 'gap' : 'binhthuong';
      };
      const parseInvestmentTotal = (v: any): number => {
        const raw = String(v ?? '').trim();
        if (!raw) return 0;
        const normalized = raw.replace(/[^\d.,-]/g, '').replace(/\s+/g, '');
        const noDot = normalized.replace(/\./g, '');
        const noDotNoComma = noDot.replace(/,/g, '');
        return Number(noDotNoComma) || 0;
      };
      const parseApprovalRequired = (v: any): boolean => {
        const normalized = String(v ?? '')
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        if (!normalized) return false;
        if (['co', 'c', 'yes', 'y', 'true', '1', 'x'].includes(normalized)) return true;
        if (['khong', 'k', 'ko', 'kh', 'no', 'n', 'false', '0'].includes(normalized)) return false;
        return false;
      };
      const sttDepth = (stt: string) => stt.split('.').length;
      const parentStt = (stt: string) => {
        const parts = stt.split('.');
        return parts.length > 1 ? parts.slice(0, -1).join('.') : null;
      };

      const projectIdByRootStt = new Map<string, number>();
      const projectCreatorByRootStt = new Map<string, string>();
      const taskIdByStt = new Map<string, number>();

      await this.dataSource.transaction(async (manager) => {
        for (const row of rows) {
          const stt = String(row.stt || '').trim();
          if (!stt || stt.includes('.')) continue;

          const projectCode = `PRJ-${Date.now()}-${stt.replace(/\./g, '-')}`;
          const managerAlias = parseUsers(row.projectManager)?.[0] || '';
          const managerUserId = managerAlias
            ? userIdByAlias.get(normalizeUserKey(managerAlias))
            : undefined;
          const effectiveCreatorId = managerUserId || userId || null;
          const insertedProject = await manager.query(
            `
              INSERT INTO projects (code, name, startDate, endDate, reminderDays, priority, typeProject, budget, description, progress, projectStatus, status, createdBy, createdAt, updatedAt)
              OUTPUT INSERTED.id
              VALUES (@0, @1, @2, @3, @4, @5, @6, @7, @8, 0, '1', 1, @9, GETDATE(), GETDATE())
            `,
            [
              projectCode,
              String(row.name || '').trim(),
              parseDate(row.startDate),
              parseDate(row.endDate),
              String(row.remindDays || '3').trim() || '3',
              normalizePriority(row.priority),
              String(row.projectType || '').trim() || null,
              parseInvestmentTotal(row.investmentTotal),
              String(row.description || '').trim() || null,
              effectiveCreatorId,
            ],
          );
          const projectId = insertedProject?.[0]?.id;
          if (projectId) {
            const projectIdNum = Number(projectId);
            projectIdByRootStt.set(stt, projectIdNum);            // STT goc (vd "1") chi tao project, khong tao them task goc.
            if (effectiveCreatorId) {
              projectCreatorByRootStt.set(stt, String(effectiveCreatorId));
            }
            await this.createLogFromSystem({
              actions: 'POST',
              details: 'Tạo dự án',
              userInfo: effectiveCreatorId,
              timestamps: new Date().toISOString(),
              taskId: String(projectIdNum),
            } as any);

            await manager.query(
              `
                INSERT INTO project_role_permissions (project_id, role, updateStatus, updateGeneralInfo, updateParticipants, uploadFiles, comment, inputDelayReason, viewAnalysis, setPermissions)
                VALUES
                  (@0, 'manager', 1, 1, 1, 1, 1, 1, 1, 1),
                  (@0, 'member', 0, 0, 0, 1, 1, 1, 1, 0),
                  (@0, 'viewer', 0, 0, 0, 0, 1, 0, 1, 0)
              `,
              [projectIdNum],
            );

            const rolePriority = new Map<string, number>([
              ['viewer', 1],
              ['member', 2],
              ['manager', 3],
            ]);
            const roleByUser = new Map<string, 'manager' | 'member' | 'viewer'>();
            const setRole = (userIdRaw: string, role: 'manager' | 'member' | 'viewer') => {
              const userAlias = String(userIdRaw || '').trim();
              if (!userAlias) return;
              const resolvedUserId = userIdByAlias.get(normalizeUserKey(userAlias));
              if (!resolvedUserId) return;
              const existing = roleByUser.get(resolvedUserId);
              if (!existing || (rolePriority.get(role) || 0) > (rolePriority.get(existing) || 0)) {
                roleByUser.set(resolvedUserId, role);
              }
            };

            const managers = parseUsers(row.projectManager);
            const members = parseUsers(row.projectMembers);
            const viewers = parseUsers(row.projectViewers);

            for (const u of managers) setRole(u, 'manager');
            for (const u of members) setRole(u, 'member');
            for (const u of viewers) setRole(u, 'viewer');

            for (const [memberUserId, memberRole] of roleByUser.entries()) {
              await manager.query(
                `
                  INSERT INTO project_members (project_id, user_id, role, joinedAt)
                  VALUES (@0, @1, @2, GETDATE())
                `,
                [projectIdNum, memberUserId, memberRole],
              );
            }
          }
        }

        const taskRows = rows
          .filter((r) => String(r.stt || '').trim().includes('.'))
          .sort((a, b) => sttDepth(String(a.stt || '')) - sttDepth(String(b.stt || '')));

        for (const row of taskRows) {
          const stt = String(row.stt || '').trim();
          const rootStt = stt.split('.')[0];
          const projectId = projectIdByRootStt.get(rootStt);
          if (!projectId) continue;
          const taskCreatorId = projectCreatorByRootStt.get(rootStt) || userId || '';
          const pStt = parentStt(stt);
          const parentId = pStt ? Number(taskIdByStt.get(pStt) || 0) : 0;

          const toTaskUsers = (raw?: string, type?: number) =>
            parseUsers(raw)
              .map((alias) => userIdByAlias.get(normalizeUserKey(alias)))
              .filter((id): id is string => !!id)
              .map((processId) => ({ processId, ...(type !== undefined ? { type } : {}) }));

          const assigners = toTaskUsers(row.assigner);
          const directors = toTaskUsers(row.director, 1);
          const supporters = toTaskUsers(row.supporters, 1);
          const viewers = toTaskUsers(row.taskViewers);

          const txQr = manager.queryRunner as QueryRunner | undefined;
          if (!txQr) {
            throw new BadRequestException('Khong lay duoc transaction context khi import cong viec.');
          }

          const createdTask = await this.createTaskforProject(
            {
              name: String(row.name || '').trim(),
              startDate: parseDate(row.startDate) as any,
              endDate: parseDate(row.endDate) as any,
              priority: normalizePriority(row.priority) as any,
              note: String(row.description || '').trim() || '',
              progress: '0',
              parent: parentId || 0,
              projectId,
              processStatus: '1',
              assigners: assigners.length ? assigners : (taskCreatorId ? [{ processId: taskCreatorId }] : []),
              directors,
              supporters,
              viewers,
              reminderTime: String(row.remindDays || '').trim() || null,
              isApprovalRequired: parseApprovalRequired(row.approvalRequired),
            } as any,
            taskCreatorId,
            txQr,
          );
          if (createdTask?.id) {
            await this.createLogFromSystem({
              actions: 'POST',
              details: 'Tạo công việc',
              userInfo: taskCreatorId || null,
              timestamps: new Date().toISOString(),
              taskId: String(createdTask.id),
            } as any);
            if (parentId > 0) {
              await this.createLogFromSystem({
                actions: 'POST',
                details: 'Tạo công việc con',
                userInfo: taskCreatorId || null,
                timestamps: new Date().toISOString(),
                taskId: String(parentId),
              } as any);
            }
            await this.createLogFromSystem({
              actions: 'POST',
              details: 'Tạo công việc',
              userInfo: taskCreatorId || null,
              timestamps: new Date().toISOString(),
              taskId: String(projectId),
            } as any);
          }
          if (createdTask?.id) taskIdByStt.set(stt, Number(createdTask.id));
        }
      });

      // Ensure project status/progress is synchronized after import.
      for (const pid of new Set(Array.from(projectIdByRootStt.values()))) {
        await this.projectService.checkAndUpdateProjectStatus(Number(pid));
        await this.projectService.calculateAndUpdateProjectProgress(Number(pid));
      }
    }

    const sortedErrors = [...result.errors].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      if (a.field !== b.field) return a.field.localeCompare(b.field);
      return a.message.localeCompare(b.message);
    });

    const errorLogs = sortedErrors.reduce((acc, err) => {
      const key = String(err.row);
      if (!acc[key]) {
        const rowData = rows.find((r) => r.rowNumber === err.row);
        acc[key] = {
          row: err.row,
          stt: rowData?.stt || '',
          name: rowData?.name || '',
          errors: [] as Array<{ field: string; code: string; message: string }>,
        };
      }
      acc[key].errors.push({
        field: err.field,
        code: err.code,
        message: err.message,
      });
      return acc;
    }, {} as Record<string, { row: number; stt: string; name: string; errors: Array<{ field: string; code: string; message: string }> }>);

    return {
      valid: result.valid,
      totalRows: rows.length,
      errorCount: sortedErrors.length,
      createdProjectTypes,
      errors: sortedErrors,
      errorLogs: Object.values(errorLogs).sort((a, b) => a.row - b.row),
    };
  }
  public mapProcessStatusCodeToHtml(status: string): string {
    const s =
      typeof status === 'string' ? status.trim() : String(status ?? '').trim();

    switch (s) {
      case 'Công việc mới':
        return `<div style="
        display:flex;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        align-items:center;
        justify-content:center;
        width:100%;
        height:30px;
        padding:0 16px;
        background:#E0E0E0;
        color:#555555;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        border: 1px solid #AEB5BE;
      ">Công việc mới</div>`.trim();

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
        padding:0 16px;
        background:#D0FFDE;
        color:#007222;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        border: 1px solid #ADECC0;
      ">Hoàn thành</div>`.trim();

      case 'Đã huỷ':
        return `<div style="
        display:flex;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        align-items:center;
        justify-content:center;
        width:100%;
        height:30px;
        padding:0 16px;
        background:#FFDCD9;
        color:#F44336;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        border: 1px solid #c73535ff;
      ">Đã huỷ</div>`.trim();
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
        padding:0 16px;
        background:#FFDCD9;
        color:#F44336;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        border: 1px solid #c73535ff;
      ">Huỷ</div>`.trim();
      // case 'Từ chối phê duyệt':
      //   return `<div style="
      //   display:flex;
      //   overflow: hidden;
      //   text-overflow: ellipsis;
      //   white-space: nowrap;
      //   align-items:center;
      //   justify-content:center;
      //   width:100%;
      //   height:30px;
      //   padding:0 16px;
      //   background:#FFDCD9;
      //   color:#F44336;
      //   font-weight:700;
      //   font-size:14px;
      //   border-radius:15px;
      //   border: 1px solid #c73535ff;
      // ">Huỷ</div>`.trim();

      case 'Chờ phê duyệt':
        return `<div style="
        display:flex;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        align-items:center;
        justify-content:center;
        width:100%;
        height:30px;
        padding:0 16px;
        background:#FEF9C2;
        color:#FFA600;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        border: 1px solid #AEB5BE;
      ">Chờ phê duyệt</div>`.trim();

      case 'Điều chỉnh':
        return `<div style="
        display:flex;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        align-items:center;
        justify-content:center;
        width:100%;
        height:30px;
        padding:0 16px;
        background:#FEF9C2;
        color:#FFA600;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        border: 1px solid #AEB5BE;
      ">Điều chỉnh</div>`.trim();

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
        padding:0 16px;
        background:#DBEAFE;
        color:#0062AD;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        border: 1px solid #AEB5BE;
      ">Đang thực hiện</div>`.trim();

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
        padding:0 16px;
        background:#fef9c2;
        color:#666;
        font-weight:700;
        font-size:14px;
        border-radius:15px;
      ">${s || 'Không xác định'}</div>`.trim();
    }
  }

  /**
   * =====================================================
   * CREATE TASK - MAIN METHOD
   * =====================================================
   * Luồng BPMN:
   * 1. Bắt đầu với TaskGeneral
   * 2. Kiểm tra role = "everyone" → lấy typeBpmn từ extension
   * 3. Các trường hợp khác → mặc định TaskManyUnit
   * =====================================================
   */

  async create(dto: CreateTaskDto, userId: string, docType?: string, routingKey?: string): Promise<TaskEntity> {
    // VALIDATE INPUT
    this.validateCreateInput(dto);
    await this.ensurePhongBanTaskPermission(userId);
    if (!docType || !routingKey) {
      // XÁC ĐỊNH DOCTYPE TỪ LUỒNG BPMN
      const result = await this.determineDocTypeFromBpmn(userId, dto.bpmnId, dto);
      docType = result.docType;
      routingKey = result.routingKey;
    }

    // VALIDATE BPMN + QUYỀN
    const { bpmnXML, flowId } = await this.validateBpmnAndPermission(userId, docType);

    // BẮT ĐẦU TRANSACTION
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // TẠO TASK GENERAL
      const task = await this.createGeneralTask(queryRunner, { ...dto }, userId);

      // TẠO CÔNG VIỆC TỪ QUY TRÌNH MẪU (NẾU CÓ)
      if (dto.templateId && this.isUuid(dto.templateId)) {
        // this.logger.log(`Creating tasks from template: ${dto.templateId} for parent task: ${task.id}`);
        await this.createTasksFromTemplate(queryRunner, dto.templateId, task.id, userId, bpmnXML, flowId, docType, routingKey!, dto.bpmnId || '', dto);
      }

      // TẠO BPMN WORKITEM + AUDIT + NOTIFICATION
      await this.createBpmnWorkItemsAndAudit(queryRunner, task.id, dto, bpmnXML, flowId, docType, routingKey, userId);

      // XỬ LÝ PATH VÀ RECURRING TASK
      const recurringConfigId = await this.handlePathAndRecurringTask(queryRunner, task.id, dto, userId, flowId, docType, routingKey);

      await queryRunner.commitTransaction();

      // TỰ ĐỘNG CẬP NHẬT TIẾN ĐỘ DỰ ÁN NẾU CÔNG VIỆC THUỘC DỰ ÁN
      if (dto.projectId) {
        await this.projectService.calculateAndUpdateProjectProgress(Number(dto.projectId));
      }

      // TẠO SYSTEM LOG
      await this.createTaskSystemLogs(task.id, dto.parent?.toString(), userId);

      const result = await this.findOne(task.id);
      if (recurringConfigId) {
        (result as any).recurringConfigId = recurringConfigId;
      }
      return result;
    } catch (e) {
      try {
        if (queryRunner.isTransactionActive) {
          await queryRunner.rollbackTransaction();
        }
      } catch (rollbackError: any) {
        if (rollbackError?.code !== 'EABORT') {
          this.logger.error('Rollback error:', rollbackError);
        }
      }
      this.logger.error('create error:', e);
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async createChild(dto: CreateTaskDto, userId: string): Promise<TaskEntity> {
    // VALIDATE INPUT
    this.validateCreateInput(dto);
    await this.ensurePhongBanTaskPermission(userId);

    // XÁC ĐỊNH DOCTYPE TỪ LUỒNG BPMN
    let docType: any = null;
    let routingKey: string | undefined = undefined;

    if (dto.parent) {
      const parentWorkItems = await this.dataSource.query(
        `SELECT TOP 1 bpmn_version, node_id FROM work_items WHERE document_id = @0 AND bpmn_version = @1 AND assignee_user_id = @2 ORDER BY id DESC`,
        [String(dto.parent), DOCTYPE.TaskManyLevelUnit, userId],
      );
      if (parentWorkItems && parentWorkItems.length > 0) {
        docType = DOCTYPE.TaskManyLevelUnit;
        (dto as any).parentNodeId = parentWorkItems[0].node_id;
      }
    }

    if (!docType) {
      const res = await this.determineDocTypeFromBpmn(userId, dto.bpmnId, dto);
      docType = res.docType;
      routingKey = res.routingKey;
    }

    // VALIDATE BPMN + QUYỀN
    const { bpmnXML, flowId } = await this.validateBpmnAndPermission(userId, docType);

    // BẮT ĐẦU TRANSACTION
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    await queryRunner.startTransaction();
    const isChild = true;
    try {
      // TẠO TASK GENERAL
      const task = await this.createGeneralTask(queryRunner, { ...dto }, userId);

      // TẠO CÔNG VIỆC TỪ QUY TRÌNH MẪU (NẾU CÓ)
      if (dto.templateId && this.isUuid(dto.templateId)) {
        // this.logger.log(`Creating tasks from template: ${dto.templateId} for parent task: ${task.id}`);
        await this.createTasksFromTemplate(queryRunner, dto.templateId, task.id, userId, bpmnXML, flowId, docType, routingKey!, dto.bpmnId || '', dto);
      }

      // TẠO BPMN WORKITEM + AUDIT + NOTIFICATION
      await this.createBpmnWorkItemsAndAudit(queryRunner, task.id, dto, bpmnXML, flowId, docType, routingKey, userId);

      // LƯU THÊM REPORT (Người giao, Người xem) - TaskUser
      // await this.saveAdditionalTaskUsers(queryRunner, task.id, dto);

      // XỬ LÝ PATH VÀ RECURRING TASK
      await this.handlePathAndRecurringTask(queryRunner, task.id, dto, userId, flowId, docType, routingKey, isChild);

      await queryRunner.commitTransaction();

      // TẠO SYSTEM LOG
      await this.createTaskSystemLogs(task.id, dto.parent?.toString(), userId);

      // CẬP NHẬT TRẠNG THÁI DỰ ÁN
      let finalProjectId = dto.projectId;
      if (!finalProjectId && dto.parent) {
        const parentTask = await queryRunner.manager.findOne(TaskEntity, { where: { id: dto.parent }, select: ['projectId'] });
        if (parentTask?.projectId) {
          finalProjectId = parentTask.projectId;
          await queryRunner.manager.update(TaskEntity, { id: task.id }, { projectId: finalProjectId });
        }
      }

      if (finalProjectId) {
        await this.projectService.checkAndUpdateProjectStatus(Number(finalProjectId));
        await this.projectService.calculateAndUpdateProjectProgress(Number(finalProjectId));
      }

      return this.findOne(task.id);
    } catch (e) {
      try {
        if (queryRunner.isTransactionActive) {
          await queryRunner.rollbackTransaction();
        }
      } catch (rollbackError: any) {
        if (rollbackError?.code !== 'EABORT') {
          this.logger.error('Rollback error:', rollbackError);
        }
      }
      this.logger.error('createChild error:', e);
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  private validateTaskMembers(directors: any[], supporters: any[]): void {
    if (directors && supporters) {
      const directorIds = directors.map((d) => d.processId).filter((id) => id);
      const supporterIds = supporters.map((s) => s.processId).filter((id) => id);
      const commonIds = directorIds.filter((id) => supporterIds.includes(id));
      if (commonIds.length > 0) {
        throw new BadRequestException(
          'Người chủ trì và người phối hợp không được chọn cùng một người',
        );
      }
    }
  }

  // =====================================================
  // HELPER METHODS CHO CREATE
  // =====================================================

  /**
   * Validate input cho hàm create
   */
  private validateCreateInput(dto: CreateTaskDto): void {
    if (!dto.name?.trim()) {
      throw new BadRequestException('Tên công việc không được để trống');
    }
    if (dto.name.length > 500) {
      throw new BadRequestException('Tên công việc không được vượt quá 500 ký tự');
    }
    if (!dto.startDate) {
      throw new BadRequestException('Ngày bắt đầu không được để trống');
    }
    if (!dto.endDate) {
      throw new BadRequestException('Hạn xử lý không được để trống');
    }
    if (dto.startDate && dto.endDate) {
      if (new Date(dto.startDate) > new Date(dto.endDate)) {
        throw new BadRequestException('Ngày bắt đầu phải trước hạn xử lý');
      }
    }
    if (dto.note && dto.note.length > 3000) {
      throw new BadRequestException('Mô tả không được vượt quá 3000 ký tự');
    }
    if (!dto.assigners || dto.assigners.length === 0 || dto.assigners.some(a => !a.processId)) {
      throw new BadRequestException('Công việc chưa được chọn người giao');
    }
    // if (!dto.directors || dto.directors.length === 0 || dto.directors.some(d => !d.processId)) {
    //   throw new BadRequestException('Công việc chưa được thêm người chủ trì');
    // }
    this.validateTaskMembers(dto.directors!, dto.supporters!);
  }
  // validateCreateInputV2 đã được gộp vào validateCreateInput (xóa code trùng lặp)

  /**
   * Validate input cho hàm update và updateFormDoc
   */
  private validateUpdateInput(dto: UpdateTaskDto): void {
    if (dto.name !== undefined) {
      if (dto.name === null || (typeof dto.name === 'string' && dto.name.trim() === '')) {
        throw new BadRequestException('Tên công việc không được để trống');
      }
      if (dto.name.length > 500) {
        throw new BadRequestException('Tên công việc không được vượt quá 500 ký tự');
      }
    }

    if (dto.startDate !== undefined && (dto.startDate === null || (typeof (dto.startDate as any) === 'string' && (dto.startDate as any).trim() === ''))) {
      throw new BadRequestException('Ngày bắt đầu không được để trống');
    }

    if (dto.endDate !== undefined && (dto.endDate === null || (typeof (dto.endDate as any) === 'string' && (dto.endDate as any).trim() === ''))) {
      throw new BadRequestException('Hạn xử lý không được để trống');
    }

    if (dto.assigners !== undefined) {
      if (dto.assigners === null || (Array.isArray(dto.assigners) && (dto.assigners.length === 0 || dto.assigners.some(a => !a.processId)))) {
        throw new BadRequestException('Công việc chưa được chọn người giao');
      }
    }

    if (dto.note !== undefined) {
      // if (dto.note === null || (typeof dto.note === 'string' && dto.note.trim() === '')) {
      //   throw new BadRequestException('Mô tả không được để trống');
      // }
      if (dto.note.length > 3000) {
        throw new BadRequestException('Mô tả không được vượt quá 3000 ký tự');
      }
    }

    this.validateTaskMembers(dto.directors!, dto.supporters!);
  }
  private validateCreateInputRecurring(dto: CreateTaskDto): void {
    if (!dto.name?.trim()) {
      throw new BadRequestException('Tên công việc không được để trống');
    }
    if (dto.name.length > 500) {
      throw new BadRequestException('Tên công việc không được vượt quá 500 ký tự');
    }
    // if (!dto.startDate) {
    //   throw new BadRequestException('Ngày bắt đầu không được để trống');
    // }
    if (!dto.startTime?.trim()) {
      throw new BadRequestException('Giờ lặp không được để trống');
    }
    // Bỏ qua validate số ngày thực hiện khi repetitiveTask là 'ngay'
    if (dto.repetitiveTask !== 'ngay') {
      if (dto.durationDays === undefined || dto.durationDays === null) {
        throw new BadRequestException('Số ngày thực hiện không được để trống');
      }
    }
    // if (!dto.endDate) {
    //   throw new BadRequestException('Hạn xử lý không được để trống');
    // }
    if (dto.startDate && dto.endDate) {
      if (new Date(dto.startDate) > new Date(dto.endDate)) {
        throw new BadRequestException('Ngày bắt đầu phải trước hạn xử lý');
      }
    }
    if (dto.note && dto.note.length > 3000) {
      throw new BadRequestException('Mô tả không được vượt quá 3000 ký tự');
    }
    if (!dto.assigners || dto.assigners.length === 0 || dto.assigners.some(a => !a.processId)) {
      throw new BadRequestException('Công việc chưa được chọn người giao');
    }
    // if (!dto.directors || dto.directors.length === 0 || dto.directors.some(d => !d.processId)) {
    //   throw new BadRequestException('Công việc chưa được thêm người chủ trì');
    // }
    this.validateTaskMembers(dto.directors!, dto.supporters!);
  }

  /**
   * Validate input cho hàm update và updateFormDoc
   */
  private validateUpdateInputRecurring(dto: UpdateTaskDto): void {
    if (dto.name !== undefined) {
      if (dto.name === null || (typeof dto.name === 'string' && dto.name.trim() === '')) {
        throw new BadRequestException('Tên công việc không được để trống');
      }
      if (dto.name.length > 500) {
        throw new BadRequestException('Tên công việc không được vượt quá 500 ký tự');
      }
    }

    if (dto.startDate !== undefined && (dto.startDate === null || (typeof (dto.startDate as any) === 'string' && (dto.startDate as any).trim() === ''))) {
      throw new BadRequestException('Ngày bắt đầu không được để trống');
    }

    if (dto.endDate !== undefined && (dto.endDate === null || (typeof (dto.endDate as any) === 'string' && (dto.endDate as any).trim() === ''))) {
      throw new BadRequestException('Hạn xử lý không được để trống');
    }

    if (dto.assigners !== undefined) {
      if (dto.assigners === null || (Array.isArray(dto.assigners) && (dto.assigners.length === 0 || dto.assigners.some(a => !a.processId)))) {
        throw new BadRequestException('Công việc chưa được chọn người giao');
      }
    }

    if (dto.note !== undefined) {
      // if (dto.note === null || (typeof dto.note === 'string' && dto.note.trim() === '')) {
      //   throw new BadRequestException('Mô tả không được để trống');
      // }
      if (dto.note.length > 3000) {
        throw new BadRequestException('Mô tả không được vượt quá 3000 ký tự');
      }
    }

    if (dto.startTime !== undefined) {
      if (dto.startTime === null || (typeof dto.startTime === 'string' && dto.startTime.trim() === '')) {
        throw new BadRequestException('Giờ lặp không được để trống');
      }
    }

    // Bỏ qua validate số ngày thực hiện khi repetitiveTask là 'ngay'
    if (dto.repetitiveTask !== 'ngay') {
      if (dto.durationDays !== undefined) {
        if (dto.durationDays === null) {
          throw new BadRequestException('Số ngày thực hiện không được để trống');
        }
      }
    }

    this.validateTaskMembers(dto.directors!, dto.supporters!);
  }

  /**
   * Xác định docType từ luồng BPMN
   * - Bắt đầu với TaskGeneral
   * - Lấy role của người dùng và so sánh với rolePermission (lane) trong BPMN
   * - Nếu lane role = "everyone" → lấy typeBpmn từ extension
   * - Các trường hợp khác → mặc định TaskManyUnit
   */
  private async determineDocTypeFromBpmn(
    userId: string,
    bpmnIdFromDto?: string,
    dto?: Partial<CreateTaskDto>,
    docTypeWorkflow?: string,
  ): Promise<{
    docType: 'TaskGeneral' | 'TaskUser' | 'TaskManyUnit' | 'TaskMetting' | 'TaskDocument' | 'IncommingDocument' | 'OutGoingDocument';
    routingKey?: string;
  }> {
    // Nếu dto có bpmnId, sử dụng giá trị đó
    if (bpmnIdFromDto) {
      return { docType: bpmnIdFromDto as any };
    }

    try {
      // 1️⃣ Lấy thông tin user (Tối ưu: Parallelize)
      const [user, userGroups] = await Promise.all([
        this.sqlsvRepo.getUserById(userId) as Promise<any>,
        this.sqlsvRepo.getUserGroups(userId)
      ]);

      if (!user?.parent?.id) {
        this.logger.warn('Không xác định được đơn vị người dùng, sử dụng TaskManyUnit');
        return { docType: 'TaskManyUnit' };
      }

      // 2️⃣ Lấy cấu hình luồng TaskGeneral
      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(user.parent.id),
        (docTypeWorkflow || 'TaskGeneral') as any,
      );

      if (!flowConfig) {
        this.logger.warn('Đơn vị chưa được cấu hình BPMN TaskGeneral, sử dụng TaskManyUnit');
        return { docType: 'TaskManyUnit' };
      }

      // 3️⃣ Lấy BPMN XML và parse
      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig.id);
      const { indexes } = await this.getModelFromXml(bpmnXML);

      // 4️⃣ Tìm StartEvent và duyệt đến node sau Gateway
      const startEvent = Array.from(indexes.nodes.values()).find(
        (n: any) => n.$type === 'bpmn:StartEvent',
      ) as any;

      if (!startEvent?.outgoing?.length) {
        return { docType: 'TaskManyUnit' };
      }

      // Tìm node đầu tiên sau StartEvent (Tạo công việc)
      const { node: createTaskNode } = this.bpmnEngine.nextInteractiveFromFlow(
        startEvent.outgoing[0],
        indexes,
      );

      if (!createTaskNode?.outgoing?.length) {
        return { docType: 'TaskManyUnit' };
      }

      // Tìm node tiếp theo - có thể là Kiểm tra công việc hoặc Gateway
      const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
        createTaskNode.outgoing[0],
        indexes,
      );

      if (!nextNode?.outgoing?.length) {
        return { docType: 'TaskManyUnit' };
      }

      // 5️⃣ Tìm Gateway từ nextNode
      // nextNode có thể là "Kiểm tra công việc" hoặc trực tiếp là Gateway
      let gatewayNode: any = null;

      if (nextNode.$type === 'bpmn:InclusiveGateway' || nextNode.$type === 'bpmn:ExclusiveGateway') {
        // nextNode đã là Gateway
        gatewayNode = nextNode;
      } else if (nextNode.outgoing?.length) {
        // nextNode là Kiểm tra công việc, tìm Gateway từ outgoing của nó
        const { node: possibleGateway } = this.bpmnEngine.nextInteractiveFromFlow(
          nextNode.outgoing[0],
          indexes,
        );
        if (possibleGateway && (possibleGateway.$type === 'bpmn:InclusiveGateway' || possibleGateway.$type === 'bpmn:ExclusiveGateway')) {
          gatewayNode = possibleGateway;
        }
      }
      // 6️⃣ Nếu tìm thấy Gateway, duyệt qua 4 nhánh để tìm node có rolePermission = user role hoặc scenarios
      if (gatewayNode && gatewayNode.outgoing?.length) {
        // this.logger.log(`Tìm thấy Gateway: ${gatewayNode.id} với ${gatewayNode.outgoing.length} nhánh`);

        // A. Tính toán RoutingKey dựa trên ngữ cảnh User + Data
        let currentRoutingKey: string | undefined = undefined;
        if (dto) {
          const groupCodes = userGroups?.map(g => g.code) || [];
          const LEADERS = ['tonggd', 'phodgtongcty'];
          const MANAGERS = ['truongphong', 'photruongphong'];

          // Logic xác định ngữ cảnh
          const directors = dto.directors || [];
          const assigners = dto.assigners || [];
          const isSelf = directors.some((d) =>
            assigners.some((a) => a.processId === d.processId),
          );
          const isUnit = directors.some(d => d.type === TaskUserType.DEPARTMENT); // TaskUserType.DEPARTMENT: Phòng ban
          if (isSelf) {
            currentRoutingKey = TaskRoutingKey.TU_GIAO_VIEC;
          } else if (groupCodes.some(c => LEADERS.includes(c))) {
            if (isUnit) {
              currentRoutingKey = TaskRoutingKey.LANH_DAO_GIAO_PHONG_BAN;
            } else {
              currentRoutingKey = TaskRoutingKey.LANH_DAO_GIAO_CA_NHAN;
            }
          } else if (groupCodes.some(c => MANAGERS.includes(c))) {
            currentRoutingKey = TaskRoutingKey.TRUONG_PHONG_GIAO_VIEC;
          }

          // this.logger.log(`User Context Routing Key: ${currentRoutingKey}`);
        }

        for (const outgoingFlow of gatewayNode.outgoing) {
          // Lấy node đích của flow (Activity)
          const targetNode = outgoingFlow.targetRef;

          if (!targetNode) continue;

          // 7️⃣ Lấy extension properties của node để kiểm tra rolePermission (camunda:field)
          const extensionProps = getAllNodeExtensionProperties(targetNode);
          const rolePermission = extensionProps?.rolePermission || indexes.laneMap.get(targetNode.id);
          // this.logger.log(`Node: ${targetNode.name || targetNode.id}, rolePermission: ${rolePermission}, extensionProps: ${JSON.stringify(extensionProps)}`);

          // 8️⃣ Check Role Matching
          let isMatch = false;

          // Kiểm tra quyền theo Group ID
          // if (userGroups?.some(group => group.id === rolePermission)) {
          //   isMatch = true;
          // }

          // Check Custom Scenarios (Lãnh đạo, Trưởng phòng, Cá nhân...) dựa trên RoutingKey đã tính
          if (currentRoutingKey && rolePermission === currentRoutingKey) {
            isMatch = true;
            // this.logger.log(`✅ Match Scenario: ${currentRoutingKey}`);
          }

          if (isMatch) {
            const typeBpmn = extensionProps?.typeBpmn;

            if (typeBpmn) {
              // this.logger.log(`✅ Tìm thấy typeBpmn: ${typeBpmn} từ node ${targetNode.name || targetNode.id}`);
              return { docType: typeBpmn as any, routingKey: currentRoutingKey };
            }
          }
        }
      }

      // Nếu không tìm thấy node nào có rolePermission match
      // this.logger.log('Không tìm thấy node có rolePermission phù hợp, sử dụng TaskManyUnit');

    } catch (error) {
      // Nếu có lỗi, tiếp tục với mặc định
      this.logger.warn(`Lỗi khi xác định docType từ BPMN: ${error.message}`);
    }

    // Mặc định cho các trường hợp còn lại (Phòng ban, Nhiều cấp...)
    return { docType: 'TaskManyUnit' };
  }

  private async determineDocTypeFromBpmnFormMetting(
    userId: string,
    bpmnIdFromDto?: string,
    dto?: CreateTaskDto,
  ): Promise<{
    docType: 'TaskGeneral' | 'TaskUser' | 'TaskManyUnit' | 'TaskMetting' | 'TaskDocument' | 'IncommingDocument' | 'OutGoingDocument';
    routingKey?: string;
  }> {
    // Nếu dto có bpmnId, sử dụng giá trị đó
    if (bpmnIdFromDto) {
      return { docType: bpmnIdFromDto as any };
    }

    try {
      // 1️⃣ Lấy thông tin user
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const userGroups = await this.sqlsvRepo.getUserGroups(userId);
      if (!user?.parent?.id) {
        this.logger.warn('Không xác định được đơn vị người dùng, sử dụng TaskManyUnit');
        return { docType: 'TaskManyUnit' };
      }

      // 2️⃣ Lấy cấu hình luồng TaskGeneral
      const flowConfig = await this.sqlsvRepo.getFlowByUnit(
        String(user.parent.id),
        'TaskMettingWorkflow',
      );

      if (!flowConfig) {
        this.logger.warn('Đơn vị chưa được cấu hình BPMN TaskGeneral, sử dụng TaskManyUnit');
        return { docType: 'TaskManyUnit' };
      }

      // 3️⃣ Lấy BPMN XML và parse
      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig.id);
      const { indexes } = await this.getModelFromXml(bpmnXML);

      // 4️⃣ Tìm StartEvent và duyệt đến node sau Gateway
      const startEvent = Array.from(indexes.nodes.values()).find(
        (n: any) => n.$type === 'bpmn:StartEvent',
      ) as any;

      if (!startEvent?.outgoing?.length) {
        return { docType: 'TaskManyUnit' };
      }

      // Tìm node đầu tiên sau StartEvent (Tạo công việc)
      const { node: createTaskNode } = this.bpmnEngine.nextInteractiveFromFlow(
        startEvent.outgoing[0],
        indexes,
      );

      if (!createTaskNode?.outgoing?.length) {
        return { docType: 'TaskManyUnit' };
      }

      // Tìm node tiếp theo - có thể là Kiểm tra công việc hoặc Gateway
      const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
        createTaskNode.outgoing[0],
        indexes,
      );

      if (!nextNode?.outgoing?.length) {
        return { docType: 'TaskManyUnit' };
      }

      // 5️⃣ Tìm Gateway từ nextNode
      // nextNode có thể là "Kiểm tra công việc" hoặc trực tiếp là Gateway
      let gatewayNode: any = null;

      if (nextNode.$type === 'bpmn:InclusiveGateway' || nextNode.$type === 'bpmn:ExclusiveGateway') {
        // nextNode đã là Gateway
        gatewayNode = nextNode;
      } else if (nextNode.outgoing?.length) {
        // nextNode là Kiểm tra công việc, tìm Gateway từ outgoing của nó
        const { node: possibleGateway } = this.bpmnEngine.nextInteractiveFromFlow(
          nextNode.outgoing[0],
          indexes,
        );
        if (possibleGateway && (possibleGateway.$type === 'bpmn:InclusiveGateway' || possibleGateway.$type === 'bpmn:ExclusiveGateway')) {
          gatewayNode = possibleGateway;
        }
      }
      // 6️⃣ Nếu tìm thấy Gateway, duyệt qua 4 nhánh để tìm node có rolePermission = user role hoặc scenarios
      if (gatewayNode && gatewayNode.outgoing?.length) {
        // this.logger.log(`Tìm thấy Gateway: ${gatewayNode.id} với ${gatewayNode.outgoing.length} nhánh`);

        // A. Tính toán RoutingKey dựa trên ngữ cảnh User + Data
        let currentRoutingKey: string | undefined = undefined;
        if (dto) {
          const groupCodes = userGroups?.map(g => g.code) || [];
          const LEADERS = ['tonggd', 'phodgtongcty'];
          const MANAGERS = ['truongphong', 'photruongphong'];

          // Logic xác định ngữ cảnh
          const directors = dto.directors || [];
          const assigners = dto.assigners || [];
          const isSelf = directors.some((d) =>
            assigners.some((a) => a.processId === d.processId),
          );
          const isUnit = directors.some(d => d.type === TaskUserType.DEPARTMENT); // TaskUserType.DEPARTMENT: Phòng ban

          if (isSelf) {
            currentRoutingKey = TaskRoutingKey.TU_GIAO_VIEC;
          } else if (groupCodes.some(c => LEADERS.includes(c))) {
            if (isUnit) {
              currentRoutingKey = TaskRoutingKey.LANH_DAO_GIAO_PHONG_BAN;
            } else {
              currentRoutingKey = TaskRoutingKey.LANH_DAO_GIAO_CA_NHAN;
            }
          } else if (groupCodes.some(c => MANAGERS.includes(c))) {
            currentRoutingKey = TaskRoutingKey.TRUONG_PHONG_GIAO_VIEC;
          }

          // this.logger.log(`User Context Routing Key: ${currentRoutingKey}`);
        }

        for (const outgoingFlow of gatewayNode.outgoing) {
          // Lấy node đích của flow (Activity)
          const targetNode = outgoingFlow.targetRef;

          if (!targetNode) continue;

          // 7️⃣ Lấy extension properties của node để kiểm tra rolePermission (camunda:field)
          const extensionProps = getAllNodeExtensionProperties(targetNode);
          const rolePermission = extensionProps?.rolePermission || indexes.laneMap.get(targetNode.id);
          // this.logger.log(`Node: ${targetNode.name || targetNode.id}, rolePermission: ${rolePermission}, extensionProps: ${JSON.stringify(extensionProps)}`);

          // 8️⃣ Check Role Matching
          let isMatch = false;

          // Kiểm tra quyền theo Group ID
          // if (userGroups?.some(group => group.id === rolePermission)) {
          //   isMatch = true;
          // }

          // Check Custom Scenarios (Lãnh đạo, Trưởng phòng, Cá nhân...) dựa trên RoutingKey đã tính
          if (currentRoutingKey && rolePermission === currentRoutingKey) {
            isMatch = true;
            // this.logger.log(`✅ Match Scenario: ${currentRoutingKey}`);
          }

          if (isMatch) {
            const typeBpmn = extensionProps?.typeBpmn;

            if (typeBpmn) {
              // this.logger.log(`✅ Tìm thấy typeBpmn: ${typeBpmn} từ node ${targetNode.name || targetNode.id}`);
              return { docType: typeBpmn as any, routingKey: currentRoutingKey };
            }
          }
        }
      }

      // Nếu không tìm thấy node nào có rolePermission match
      // this.logger.log('Không tìm thấy node có rolePermission phù hợp, sử dụng TaskManyUnit');

    } catch (error) {
      // Nếu có lỗi, tiếp tục với mặc định
      this.logger.warn(`Lỗi khi xác định docType từ BPMN: ${error.message}`);
    }

    // Mặc định cho các trường hợp còn lại (Phòng ban, Nhiều cấp...)
    return { docType: 'TaskManyUnit' };
  }

  /**
   * Tìm người xử lý cho phòng ban (Văn thư hoặc Trưởng phòng)
   */
  private async getDepartmentAssignee(unitId: string): Promise<string | null> {
    try {
      // 1. Kiểm tra cấu hình nhận việc cho phòng ban
      const configs = await this.assignmentConfigService.findByUnitId(unitId);
      if (configs.length > 0 && configs[0].userId) {
        return configs[0].userId;
      }

      // 2. Mặc định lấy văn thư trong phòng ban
      const vanThuCodes = [GROUP_CODES.VAN_THU, GROUP_CODES.VAN_THU_PHONG, 'VAN_THU', 'VAN_THU_PHONG', 'vtphong', 'vanthutct'];
      const targetUser = await this.dataSource.getRepository(UserEntity)
        .createQueryBuilder('u')
        .innerJoin('u.groupUsers', 'g')
        .where('u.parent = :unitId', { unitId })
        .andWhere('u.status = 1')
        .andWhere('g.code IN (:...vanThuCodes)', { vanThuCodes })
        .getOne();

      return targetUser?.id || null;
    } catch (error) {
      this.logger.error(`Lỗi khi tìm assignee cho phòng ban ${unitId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Lấy danh sách tất cả văn thư trong phòng ban
   */
  private async getDepartmentClerks(unitId: string): Promise<string[]> {
    try {
      // 1. Kiểm tra cấu hình nhận việc cho phòng ban
      const configs = await this.assignmentConfigService.findByUnitId(unitId);
      if (configs.length > 0) {
        return configs.map(c => c.userId);
      }

      // 2. Mặc định lấy văn thư trong phòng ban
      const vanThuCodes = [GROUP_CODES.VAN_THU, GROUP_CODES.VAN_THU_PHONG, 'VAN_THU', 'VAN_THU_PHONG', 'vtphong', 'vanthutct'];
      const clerks = await this.dataSource.getRepository(UserEntity)
        .createQueryBuilder('u')
        .innerJoin('u.groupUsers', 'g')
        .where('u.parent = :unitId', { unitId })
        .andWhere('u.status = 1')
        .andWhere('g.code IN (:...vanThuCodes)', { vanThuCodes })
        .select('u.id')
        .getMany();
      return clerks.map(c => c.id);
    } catch (error) {
      this.logger.error(`Lỗi khi lấy danh sách văn thư cho phòng ban ${unitId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Lấy typeBpmn từ extension properties của BPMN node
   */
  private async getTypeBpmnFromExtension(bpmnXML: string): Promise<string | null> {
    try {
      const { indexes } = await this.getModelFromXml(bpmnXML);

      // Tìm StartEvent
      const startEvent = Array.from(indexes.nodes.values()).find(
        (n: any) => n.$type === 'bpmn:StartEvent',
      ) as any;

      if (!startEvent?.outgoing?.length) {
        return null;
      }

      // Tìm node đầu tiên sau StartEvent
      const { node: firstNode } = this.bpmnEngine.nextInteractiveFromFlow(
        startEvent.outgoing[0],
        indexes,
      );

      if (!firstNode) {
        return null;
      }

      // Lấy extension properties từ node
      const extensionProps = getAllNodeExtensionPropertiesV2(firstNode);

      // Trả về typeBpmn nếu có
      return extensionProps?.typeBpmn || null;
    } catch (error) {
      this.logger.warn(`Không thể lấy typeBpmn từ extension: ${error.message}`);
      return null;
    }
  }

  /**
   * Lưu thêm người giao và người xem vào bảng TaskUser
   */
  private async saveAdditionalTaskUsers(
    queryRunner: QueryRunner,
    taskId: number,
    dto: CreateTaskDto,
  ): Promise<void> {
    const taskUsers: any[] = [];

    // 1. Assigners (Người giao việc)
    if (dto.assigners && dto.assigners.length > 0) {
      dto.assigners.forEach((assigner) => {
        if (assigner.processId) {
          taskUsers.push({
            taskId,
            processId: assigner.processId,
            role: TaskUserRole.ASSIGNER,
            type: assigner.type || TaskUserType.INDIVIDUAL,
            processName: assigner.processName,
          });
        }
      });
    }

    // 2. Viewers (Người xem)
    if (dto.viewers && dto.viewers.length > 0) {
      dto.viewers.forEach((viewer) => {
        if (viewer.processId) {
          taskUsers.push({
            taskId,
            processId: viewer.processId,
            role: TaskUserRole.VIEWER,
            type: viewer.type || TaskUserType.INDIVIDUAL,
            processName: viewer.processName,
          });
        }
      });
    }

    if (taskUsers.length > 0) {
      await queryRunner.manager.save(TaskUserEntity, taskUsers);
    }
  }

  /**
   * Tạo BPMN WorkItems và Audit cho directors và supporters
   */
  private async createBpmnWorkItemsAndAudit(
    queryRunner: QueryRunner,
    taskId: number,
    dto: CreateTaskDto,
    bpmnXML: string,
    flowId: string,
    docType: string,
    routingKey?: string,
    userId?: string,
    isMeeting?: boolean,
  ): Promise<void> {
    // Tạo BPMN WORKITEM + AUDIT với người chủ trì
    let directorIds: string[] = dto.directors?.length ? dto.directors.filter(d => d.processId).map(d => d.processId) : [];
    const isDirectorUnit = dto.directors?.length ? dto.directors[0].type === TaskUserType.DEPARTMENT : false;

    // Xử lý riêng cho LANH_DAO_GIAO_PHONG_BAN
    if (dto.directors?.find(d => d.type === TaskUserType.DEPARTMENT)) {
      const unitId = directorIds[0];
      const clerks = await this.getDepartmentClerks(unitId);
      if (clerks.length > 0) {
        // this.logger.log(`LANH_DAO_GIAO_PHONG_BAN: Chuyển assignee chủ trì từ phòng ban ${unitId} sang danh sách ${clerks.length} văn thư`);
        directorIds = clerks;
      } else {
        // Fallback: Nếu không có văn thư, thử lấy 1 assignee như cũ (có thể là trưởng phòng nếu config cho phép)
        const fallbackId = await this.getDepartmentAssignee(unitId);
        if (fallbackId) directorIds = [fallbackId];
      }
    }
    if (directorIds.length > 0) {
      await Promise.all(directorIds.map(assigneeId =>
        this.createDocumentAtNode({
          bpmnXML,
          data: {
            documentId: String(taskId),
            ...dto,
          },
          assigneeUserId: assigneeId,
          flowId,
          queryRunner,
          docType,
        })
      ));

      // 🔔 Thông báo cho người chủ trì
      await this.notificationService.createForRecipients({
        recipientIds: directorIds,
        senderId: userId || '',
        key: isMeeting ? 'VIEW_JOB_TO_MEETING' : 'VIEW_TASK',
        type: NotificationType.ADDED_TO_NEW_TASK_MEMBER.value,
        content: `Bạn có công việc mới: ${dto.name}`,
        recordId: String(taskId),
      });
    }

    // Tạo BPMN WORKITEM + AUDIT với người phối hợp
    if (dto.supporters && dto.supporters.length > 0) {
      const allSupporterIds: string[] = [];

      await Promise.all(
        dto.supporters
          .filter((supporter) => supporter.processId)
          .map(async (supporter) => {
            let supporterIds: string[] = [supporter.processId];
            const isSupporterUnit = supporter.type === TaskUserType.DEPARTMENT;

            if (isSupporterUnit) {

              const unitId = supporter.processId;
              const clerks = await this.getDepartmentClerks(unitId);
              if (clerks.length > 0) {
                // this.logger.log(`LANH_DAO_GIAO_PHONG_BAN: Chuyển assignee phối hợp từ phòng ban ${unitId} sang danh sách ${clerks.length} văn thư`);
                supporterIds = clerks;
              } else {
                const fallbackId = await this.getDepartmentAssignee(unitId);
                if (fallbackId) supporterIds = [fallbackId];
              }
            }

            allSupporterIds.push(...supporterIds);

            return Promise.all(supporterIds.map(assigneeId =>
              this.assignSupporter({
                bpmnXML,
                supporterId: assigneeId,
                data: {
                  documentId: String(taskId),
                  ...dto,
                },
                docType,
              })
            ));
          }),
      );

      // 🔔 Thông báo cho người phối hợp
      if (allSupporterIds.length > 0) {
        await this.notificationService.createForRecipients({
          recipientIds: [...new Set(allSupporterIds)],
          senderId: userId || '',
          key: 'VIEW_TASK',
          type: NotificationType.ADDED_TO_NEW_TASK_MEMBER.value,
          content: `Bạn có công việc phối hợp mới: ${dto.name}`,
          recordId: String(taskId),
        });
      }
    }

    // 🔔 Thông báo cho người theo dõi (Viewers)
    if (dto.viewers && dto.viewers.length > 0) {
      const viewerIds = dto.viewers.filter(v => v.processId).map(v => v.processId);
      if (viewerIds.length > 0) {
        await this.notificationService.createForRecipients({
          recipientIds: [...new Set(viewerIds)],
          senderId: userId || '',
          key: 'VIEW_TASK',
          type: NotificationType.ADDED_TO_NEW_TASK_VIEWER.value,
          content: `Bạn được chỉ định theo dõi công việc mới: ${dto.name}`,
          recordId: String(taskId),
        });
      }
    }

    // 🔔 Nếu người tạo khác người giao, gửi thông báo cho người giao
    const assignerIds = [...new Set((dto.assigners || [])
      .filter((a) => a.processId)
      .map((a) => a.processId))];
    const creatorId = userId || '';
    const notifyAssignerIds = assignerIds.filter((id) => id && id !== creatorId);

    if (notifyAssignerIds.length > 0) {
      await this.notificationService.createForRecipients({
        recipientIds: notifyAssignerIds,
        senderId: creatorId,
        key: 'VIEW_TASK',
        type: NotificationType.ADDED_TO_NEW_TASK_MEMBER.value,
        content: `Bạn được giao vai trò người giao cho công việc mới: ${dto.name}`,
        recordId: String(taskId),
      });
    }
  }

  /**
   * Xử lý path và tạo recurring task nếu cần
   */
  private async handlePathAndRecurringTask(
    queryRunner: QueryRunner,
    taskId: number,
    dto: CreateTaskDto,
    userId: string,
    flowId?: string,
    docType?: string,
    routingKey?: string,
    isChild?: boolean,
  ): Promise<number | null> {
    // Cập nhật path
    const path = dto.parent ? `${dto.parent}/${taskId}` : `${taskId}`;
    await queryRunner.manager.update(TaskEntity, { id: taskId }, { path });

    // Tạo recurring task nếu cần
    const repetitive = (dto.repetitiveTask || '').toString().trim().toLowerCase();
    dto.taskId = taskId;
    if (
      repetitive &&
      !['khong', 'none', '0', 'false'].includes(repetitive) &&
      !dto.parent && !isChild
    ) {
      `1`
      const config = await this.createRecurringTask(queryRunner, dto, userId, flowId, docType, routingKey);
      return config.id;
    }
    return null;
  }

  /**
   * Tạo system logs cho task
   */
  private async createTaskSystemLogs(
    taskId: number,
    parentId: string | undefined,
    userId: string,
  ): Promise<void> {
    const timestamp = new Date().toISOString();

    // Log cho task hiện tại
    await this.createLogFromSystem({
      actions: 'POST',
      details: 'Tạo công việc',
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

  private async assignSupporterFromDoc(params: {
    bpmnXML: string;
    data: any;
    supporterId: string;
    docType?: string,
  }): Promise<void> {
    const { bpmnXML, data, supporterId, docType } = params;

    const { indexes } = await this.getModelFromXml(bpmnXML);

    // =========================
    // BPMN: START → NODE ĐẦU
    // =========================
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
      throw new BadRequestException('Không xác định được node xử lý supporter');
    }

    const role = indexes.laneMap.get(targetNode.id);

    if (!role) {
      throw new BadRequestException(
        `Không xác định được role cho node ${targetNode.id}`,
      );
    }

    // 🎯 ÉP ĐÚNG supporter
    // if (role !== 'supporter') {
    //   throw new BadRequestException(
    //     `Node ${targetNode.id} không phải role supporter`,
    //   );
    // }

    const documentId = data?.documentId;
    if (!documentId) {
      throw new BadRequestException('documentId is required in data');
    }

    // =========================
    // TẠO WORK ITEM SUPPORTER
    // =========================
    await this.createSupporterWorkItem({
      documentId,
      role,
      node: targetNode,
      supporterId,
      docType,
    });

    // =========================
    // (OPTIONAL) TẠO AUDIT
    // =========================
    // await this.createSupporterAudit({
    //   documentId,
    //   node: targetNode,
    //   supporterId,
    //   data,
    // });
  }
  private async assignSupporter(params: {
    bpmnXML: string;
    data: any;
    supporterId: string;
    docType?: string;
  }): Promise<void> {
    const { bpmnXML, data, supporterId, docType } = params;

    const { indexes } = await this.getModelFromXml(bpmnXML);

    // =========================
    // BPMN: START → NODE ĐẦU
    // =========================
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
      throw new BadRequestException('Không xác định được node xử lý supporter');
    }

    const role = indexes.laneMap.get(targetNode.id);

    if (!role) {
      throw new BadRequestException(
        `Không xác định được role cho node ${targetNode.id}`,
      );
    }

    // 🎯 ÉP ĐÚNG supporter
    // if (role !== 'supporter') {
    //   throw new BadRequestException(
    //     `Node ${targetNode.id} không phải role supporter`,
    //   );
    // }

    const documentId = data?.documentId;
    if (!documentId) {
      throw new BadRequestException('documentId is required in data');
    }

    // =========================
    // TẠO WORK ITEM SUPPORTER
    // =========================
    await this.createSupporterWorkItem({
      documentId,
      role,
      node: targetNode,
      supporterId,
      docType,
    });

    // =========================
    // (OPTIONAL) TẠO AUDIT
    // =========================
    // await this.createSupporterAudit({
    //   documentId,
    //   node: targetNode,
    //   supporterId,
    //   data,
    // });
  }

  private async createSupporterAudit(params: {
    documentId: string;
    node: any;
    supporterId: string;
    data: any;
  }) {
    const { documentId, node, supporterId, data } = params;

    await this.sqlRepo.addAudit(documentId, {
      userId: supporterId,
      role: 'supporter',
      actionCode: 'ASSIGN_SUPPORTER',
      fromNodeId: node.id,
      toNodeId: node.id,
      action: 'Giao phối hợp',
      stage_status: 'PHOI_HOP',
      details: data,
    });
  }
  private async createSupporterWorkItem(params: {
    documentId: string;
    role: string;
    node: any;
    supporterId: string;
    docType?: string;
  }) {
    const { documentId, node, supporterId, role, docType } = params;

    const workItem: WorkItem = {
      id: `wi_sup_${Date.now()}`,
      nodeId: node.id,
      role,
      assigneeUserId: supporterId,
      nodeType: node.$type,
    };

    await this.sqlRepo.addWorkItem(documentId, workItem, undefined, docType);
  }

  private async validateBpmnAndPermission(
    userId: string,
    docType?: string,
    skipXmlParsing = false,
  ): Promise<{
    bpmnXML: string;
    role: string;
    flowId: string;
  }> {
    const user: any = await this.sqlsvRepo.getUserById(userId);
    if (!user?.parent?.id) {
      throw new BadRequestException('Không xác định được đơn vị người dùng');
    }
    const docTypeFinal = docType || 'TaskManyUnit';
    // const flowConfig = await this.sqlsvRepo.getFlowByUnit(
    //   String(user.parent.id),
    //   docTypeFinal,
    // );
    const flowConfig = await this.sqlsvRepo.getFlowByDocType(docTypeFinal);

    if (!flowConfig) {
      throw new BadRequestException('Chưa được cấu hình BPMN');
    }

    if (skipXmlParsing) {
      return { bpmnXML: '', role: '', flowId: flowConfig.id };
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
    // const role = indexes.laneMap.get(firstNode.id);
    // if (!role) {
    //   throw new BadRequestException(`Node ${firstNode.id} chưa được gán role`);
    // }
    return { bpmnXML, role: '', flowId: flowConfig.id };
  }

  private async validateBpmnAndPermissionApprove(userId: string, docType?: string): Promise<{
    bpmnXML: string;
    role: string;
    flowId: string;
  }> {
    const docTypeFinal = (docType || 'TaskManyUnit') as any;
    const user: any = await this.sqlsvRepo.getUserById(userId);
    if (!user?.parent?.id) {
      throw new BadRequestException('Không xác định được đơn vị người dùng');
    }

    const flowConfig = await this.sqlsvRepo.getFlowByUnit(
      String(user.parent.id),
      docTypeFinal,
    );

    if (!flowConfig) {
      throw new BadRequestException('Đơn vị chưa được cấu hình BPMN');
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

    // const { node: firstNode } = this.bpmnEngine.nextInteractiveFromFlow(
    //   startEvent.outgoing[0],
    //   indexes,
    // );

    // if (!firstNode) {
    //   throw new BadRequestException('Không xác định được node xử lý đầu tiên');
    // }
    const role = '';
    // if (!role) {
    //   throw new BadRequestException(`Node ${firstNode.id} chưa được gán role`);
    // }
    return { bpmnXML, role, flowId: flowConfig.id };
  }
  private async validateBpmnAndPermissionApproveFormDoc(
    userId: string,
    docType?: string,
  ): Promise<{
    bpmnXML: string;
    role: string;
    flowId: string;
  }> {
    const user: any = await this.sqlsvRepo.getUserById(userId);
    if (!user?.parent?.id) {
      throw new BadRequestException('Không xác định được đơn vị người dùng');
    }

    const flowConfig = await this.sqlsvRepo.getFlowByUnit(
      String(user.parent.id),
      docType as any || 'TaskDocument',
    );

    if (!flowConfig) {
      throw new BadRequestException('Đơn vị chưa được cấu hình BPMN');
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

    // const { node: firstNode } = this.bpmnEngine.nextInteractiveFromFlow(
    //   startEvent.outgoing[0],
    //   indexes,
    // );

    // if (!firstNode) {
    //   throw new BadRequestException('Không xác định được node xử lý đầu tiên');
    // }
    const role = '';
    // if (!role) {
    //   throw new BadRequestException(`Node ${firstNode.id} chưa được gán role`);
    // }
    return { bpmnXML, role, flowId: flowConfig.id };
  }


  async createDocumentAtNode({
    bpmnXML,
    data,
    queryRunner,
    assigneeUserId = null,
    flowId = null,
    docType,
  }: {
    bpmnXML: string;
    data: any;
    queryRunner?: QueryRunner;
    assigneeUserId?: string | null;
    flowId?: string | null;
    docType?: string;
  }): Promise<any> {
    const { indexes } = await this.getModelFromXml(bpmnXML);

    let targetNode: any = null;
    let flow: any = null;

    if (data.parentNodeId) {
      // Tìm flow từ parent node
      // Với TaskProject: GIAO_VIEC → GIAO_CHU_TRI
      // Với task khác: TAO_CONG_VIEC → GIAO_VIEC → GIAO_CHU_TRI
      let initialFlow: any = null;
      const flowName = docType === 'TaskProject' ? 'GIAO_VIEC' : 'TAO_CONG_VIEC';

      const parentNodeId = data.parentNodeId;
      if (parentNodeId) {
        const parentNode = (indexes.nodes as Map<string, any>).get(parentNodeId);
        if (parentNode && parentNode.outgoing) {
          initialFlow = parentNode.outgoing.find(
            (fl: any) => fl.name === flowName,
          );
        }
      }

      if (!initialFlow) {
        // Fallback: tìm trong toàn bộ BPMN
        for (const node of (indexes.nodes as Map<string, any>).values()) {
          if (node.outgoing) {
            const f = node.outgoing.find((fl: any) => fl.name === flowName);
            if (f) {
              initialFlow = f;
              break;
            }
          }
        }
      }

      if (initialFlow) {
        flow = initialFlow;
        const res = this.bpmnEngine.nextInteractiveFromFlow(
          initialFlow,
          indexes,
        );
        let currentNode = res.node;

        // Nếu là TaskProject, tìm GIAO_CHU_TRI trực tiếp
        // Nếu là task khác, tìm GIAO_VIEC trước, rồi mới GIAO_CHU_TRI
        if (docType !== 'TaskProject') {
          // Tìm thêm flow 'GIAO_VIEC'
          if (currentNode && currentNode.outgoing) {
            const gvFlow = currentNode.outgoing.find(
              (fl: any) => fl.name === 'GIAO_VIEC',
            );
            if (gvFlow) {
              flow = gvFlow;
              const resGv = this.bpmnEngine.nextInteractiveFromFlow(
                gvFlow,
                indexes,
              );
              currentNode = resGv.node;
            }
          }
        }

        // Tìm thêm flow 'GIAO_CHU_TRI'
        if (currentNode && currentNode.outgoing) {
          const gctFlow = currentNode.outgoing.find(
            (fl: any) => fl.name === 'GIAO_CHU_TRI',
          );
          if (gctFlow) {
            flow = gctFlow;
            const resGct = this.bpmnEngine.nextInteractiveFromFlow(
              gctFlow,
              indexes,
            );
            currentNode = resGct.node;
          }
        }

        targetNode = currentNode;

        // Tìm giao việc
        const isUnit =
          data.directors?.[0]?.type === TaskUserType.DEPARTMENT ||
          data.directors?.[0]?.type === String(TaskUserType.DEPARTMENT);
        if (isUnit && assigneeUserId) {
          const targetId = await this.getDepartmentAssignee(assigneeUserId);
          if (targetId) {
            assigneeUserId = targetId;
          }
        }
      }
    }

    if (!targetNode) {
      // =========================
      // BPMN: START → NODE ĐẦU
      // =========================
      const startEvent = Array.from(indexes.nodes.values()).find(
        (node: any) => node.$type === 'bpmn:StartEvent',
      ) as any;

      if (!startEvent) {
        throw new BadRequestException('BPMN không có StartEvent');
      }

      flow = startEvent.outgoing[0];
      if (flow) {
        let { node: firstNode } = this.bpmnEngine.nextInteractiveFromFlow(
          flow,
          indexes,
        );
        if (docType === 'TaskProject' && firstNode.outgoing) {
          const gvFlow = firstNode.outgoing.find(
            (fl: any) => fl.name === 'TAO_VIEC',
          );
          if (gvFlow) {
            flow = gvFlow;
            const resGv = this.bpmnEngine.nextInteractiveFromFlow(
              gvFlow,
              indexes,
            );
            firstNode = resGv.node;
          }
        }

        const outgoingFlows = firstNode?.outgoing || [];
        const targetFlow = outgoingFlows.find(
          (f: any) => f.name === 'GIAO_CHU_TRI',
        );

        if (targetFlow) {
          const res = this.bpmnEngine.nextInteractiveFromFlow(
            targetFlow,
            indexes,
          );
          targetNode = res.node;
        }
      }
    }

    if (targetNode) {
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

      const initialStatus = data?.statusCode ?? '1';
      // TẠO AUDIT + WORKITEM
      await this.createInitialAuditAndWorkItem({
        documentId,
        node: targetNode,
        role,
        assigneeUserId,
        data,
        statusCode: initialStatus,
        docType,
      });

      // 3️⃣ Update Task Status from BPMN Extension
      const props = this.bpmnEngine.getCamundaProperties(targetNode);
      if (props.statusCode) {
        if (queryRunner) {
          await queryRunner.manager.update(
            TaskEntity,
            { id: Number(documentId) },
            { processStatus: props.statusCode },
          );
        } else {
          await this.taskRepository.update(
            { id: Number(documentId) },
            { processStatus: props.statusCode },
          );
        }
      }
    }

    if (flow) {
      const nodeExt = flow.targetRef
        ? getAllNodeExtensionProperties(flow.targetRef)
        : undefined;
      // const processStatus = nodeExt?.statusCode ? nodeExt.statusCode : undefined;
      const processStatus = '1';

      if (processStatus) {
        if (queryRunner) {
          await queryRunner.manager.update(
            TaskEntity,
            { id: Number(data.documentId) },
            {
              processStatus,
              updatedAt: new Date(),
            },
          );
        } else {
          await this.taskRepository.update(
            { id: Number(data.documentId) },
            {
              processStatus,
              updatedAt: new Date(),
            },
          );
        }
      }
    }

    return;
  }

  private async getModelFromXml(
    xmlContent: string,
    cacheKey?: string,
  ): Promise<ModelCache> {
    const { process } = await this.bpmnEngine.loadBpmnFromString(xmlContent);
    const indexes = this.bpmnEngine.buildIndexes(process);
    return { process, indexes, path: cacheKey || 'inline-xml' };
  }

  private async createInitialAuditAndWorkItem(params: {
    documentId: string;
    node: any;
    role: string;
    assigneeUserId?: string | null;
    data: any;
    statusCode: string;
    docType?: string;
  }) {
    const { documentId, node, role, assigneeUserId, data, statusCode, docType } = params;

    // =========================
    // 1️⃣ Tạo WORK ITEM
    // =========================
    const workItem: WorkItem = {
      id: `wi_${Date.now()}`,
      nodeId: node.id,
      role,
      assigneeUserId: assigneeUserId || null,
      nodeType: node.$type,
    };

    await this.sqlRepo.addWorkItem(documentId, workItem, undefined, docType);

    // =========================
    // 2️⃣ Tạo AUDIT
    // =========================
    await this.sqlRepo.addAudit(documentId, {
      userId: assigneeUserId || null,
      role,
      actionCode: 'CREATE',
      fromNodeId: null,
      toNodeId: node.id,
      created_by: assigneeUserId || null,
      receiver: assigneeUserId || null,
      receiver_unit: data.receiverUnit || null,
      roleProcess: role,
      action: 'Tạo văn bản',
      deadline: null,
      stage_status: 'GIAO_CHU_TRI',
      details: data,
      curStatusCode: statusCode,
      typeDocument: docType,
    });
  }

  private async createRecurringTask(
    qr: QueryRunner,
    dto: CreateTaskDto,
    userId: string,
    flowId?: string,
    docType?: string,
    routingKey?: string,
  ): Promise<TaskRecurringConfigEntity> {
    const { id, isApprovalRequired, ...taskData } = dto as any;
    taskData.isApprovalRequired = isApprovalRequired;


    let startTime = dto.startTime;
    let durationDays = dto.durationDays;

    // 1. Xử lý Start Time (Chuyển đổi UTC -> Local +7)
    if (startTime) {
      // Nếu gửi lên chuỗi ISO (có t hoặc z hoặc chiều dài > 5), parse bằng dayjs và cộng 7h
      if (startTime.includes('T') || startTime.includes('Z') || startTime.length > 5) {
        startTime = dayjs(startTime).format('HH:mm');
      } else if (startTime.match(/^\d{1,2}:\d{1,2}$/)) {
        // Nếu đã là định dạng HH:mm, giữ nguyên hoặc chuẩn hóa
        const [h, m] = startTime.split(':');
        startTime = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
      }
    } else if (!startTime && dto.startDate) {
      // Nếu không có startTime, lấy từ startDate (khi tạo từ công việc chung)
      startTime = dayjs(dto.startDate).format('HH:00');
    } else if (!startTime) {
      startTime = '09:00';
    }
    // 2. Xử lý Duration Days (Làm tròn)
    if (durationDays) {
      // Nếu có input trực tiếp (từ form lặp): validate số nguyên dương
      durationDays = Number(durationDays);
      if (!Number.isInteger(durationDays) || durationDays <= 0) {
        throw new BadRequestException('Thời gian thực hiện (ngày) phải là số nguyên dương');
      }
    } else if (dto.startDate && dto.endDate) {
      // Nếu chưa có (từ form chung): tính toán và làm tròn
      const start = new Date(dto.startDate).getTime();
      const end = new Date(dto.endDate).getTime();
      const diffHours = (end - start) / (1000 * 60 * 60);

      // Logic làm tròn:
      // - Lấy phần nguyên ngày (ví dụ 26h -> 1 ngày)
      // - Phần dư: nếu >= 12h -> +1 ngày, ngược lại giữ nguyên
      // - Tối thiểu 1 ngày
      const days = Math.floor(diffHours / 24);
      const remainder = diffHours % 24;

      durationDays = remainder >= 12 ? days + 1 : days;
      if (durationDays < 1) durationDays = 1;
    } else {
      durationDays = 1;
    }

    // Chuẩn bị dữ liệu lặp
    const user: any = await this.sqlsvRepo.getUserById(userId);
    const unitCode = user?.codeND || 'UNIT';
    const taskCode = await this.generateTaskCode('LAPLAI', unitCode);
    const config = qr.manager.create(TaskRecurringConfigEntity, {
      name: dto.name,
      repetitiveTask: this.normalizeRecurringType(dto.repetitiveTask || 'tuan'),
      code: taskCode,
      daysOfWeek: dto.daysOfWeek || dto.weekDays,
      monthInQuarter: dto.monthInQuarter ? dto.monthInQuarter : undefined, // Tạm lấy tháng đầu trong quý
      executionType: dto.executionType || 'specific_day',
      dayOfMonth: dto.dayOfMonth ? dto.dayOfMonth : 1,
      relativeWeek: dto.relativeWeek,
      relativeDay: dto.relativeDay,
      startTime: startTime,
      durationDays: durationDays,
      startDate: new Date(),
      endDate: new Date(dayjs().add(30, 'year').toDate()),
      taskData: JSON.stringify(taskData),
      bpmnId: dto.bpmnId,
      flowId: flowId,
      docType: docType,
      routingKey: routingKey,
      isApprovalRequired: dto.isApprovalRequired ?? false,
      templateId: dto.templateId || undefined,

      // Map missing fields
      priority: dto.priority,
      topic: dto.topic,
      note: dto.note,
      reminderTime: dto.reminderTime,

      createdById: userId,
      updatedById: userId,
      status: 1,
    });

    // Explicitly assign code to ensure it is saved
    if (taskCode) {
      config.code = taskCode;
    } else {
      console.warn('Warning: taskCode is undefined when creating recurring config');
    }

    // Default values for Monthly/Quarterly if creating from General Task (or missing specific config)
    if (!dto.executionType && dto.startDate) {
      const start = dayjs(dto.startDate);
      if (config.repetitiveTask === 'thang') {
        config.executionType = 'specific_day';
        config.dayOfMonth = start.date();
      } else if (config.repetitiveTask === 'quy') {
        config.executionType = 'specific_day';
        config.dayOfMonth = start.date();
        // if (!config.monthInQuarter) {
        //   // Calculate month index in quarter (1, 2, or 3) based on start date
        //   config.monthInQuarter = dto.monthInQuarter;
        // }
      }
    }

    const savedConfig = await qr.manager.save(config);

    // Clone external links (task_document_links) from source task to recurring config
    // so recurring instances can inherit links similarly to attached files.
    if (dto.taskId) {
      try {
        await this.dataSource.query(
          `
          INSERT INTO task_document_links
            (taskId, documentName, documentUrl, description, createdById, createdByName, createdAt, updatedAt, objectType)
          SELECT
            @0,
            tdl.documentName,
            tdl.documentUrl,
            tdl.description,
            @1,
            tdl.createdByName,
            GETDATE(),
            GETDATE(),
            'taskdocrecurring'
          FROM task_document_links tdl
          WHERE CAST(tdl.taskId AS NVARCHAR(64)) = @2
            AND LOWER(ISNULL(tdl.objectType, '')) = 'taskdocuments'
          `,
          [String(savedConfig.id), userId, String(dto.taskId)],
        );
      } catch (error) {
        this.logger.error(
          `Failed to clone task_document_links from task ${dto.taskId} to recurring config ${savedConfig.id}`,
          error,
        );
      }
    }

    // Copy documents from General Task if taskId is provided
    // if (dto.taskId) {

    //   try {
    //     // Use getFilesByObjectAndStatus to get array of files attached to the task
    //     const files = await this.filesRepository.getFilesByObjectAndStatus('taskdocuments', dto.taskId.toString());
    //     this.logger.debug(`Copying documents: Found ${files?.length} files for task ${dto.taskId}`);

    //     if (files && files.length > 0) {
    //       for (const file of files) {
    //         // file object comes from "SELECT f.* ...", so file.id is the file's primary key
    //         await this.filesRepository.createFileRelation({
    //           object_type: 'taskdocrecurring', // As requested by user
    //           object_id: savedConfig.id,
    //           file_id: file.fileId // Based on files.repository.ts line 225: f.id AS fileId
    //         });
    //       }
    //     }
    //   } catch (error) {
    //     this.logger.error(`Failed to copy documents for recurring config ${savedConfig.id}`, error);
    //   }
    // }

    return savedConfig;
  }

  async createRecurring(dto: CreateTaskDto, userId: string) {
    // XÁC ĐỊNH DOCTYPE TỪ LUỒNG BPMN
    this.validateCreateInputRecurring(dto);
    const { docType, routingKey } = await this.determineDocTypeFromBpmn(userId, dto.bpmnId, dto);

    // VALIDATE BPMN + QUYỀN
    const { bpmnXML, flowId } = await this.validateBpmnAndPermission(userId, docType);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const data = await this.createRecurringTask(queryRunner, dto, userId, flowId, docType, routingKey);
      const responseData: any = { ...data };
      delete responseData.startDate;
      delete responseData.endDate;

      // TẠO CÔNG VIỆC TỪ QUY TRÌNH MẪU (NẾU CÓ) - Lưu vào taskData của recurring config
      // if (dto.templateId && this.isUuid(dto.templateId)) {
      //   // this.logger.log(`Creating tasks from template: ${dto.templateId} for parent task: ${task.id}`);
      //   await this.createTasksFromTemplateTaskConfig(queryRunner, dto.templateId, data.id, userId, bpmnXML, flowId, docType, routingKey!, dto.bpmnId || '', dto);
      // }
      await queryRunner.commitTransaction();
      return { success: true, message: 'Đã lưu cấu hình công việc lặp lại', data: responseData };
    } catch (e) {
      console.error('Error in createRecurring:', e);
      try {
        if (queryRunner.isTransactionActive) {
          await queryRunner.rollbackTransaction();
        }
      } catch (rollbackError) {
        // Transaction might be already aborted, ignore rollback error to show the original error
        console.error('Rollback error in createRecurring:', rollbackError);
      }
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 🔄 Quét và tạo các công việc lặp lại đến hạn
   */
  async scanAndCreateRecurringTasks(): Promise<void> {
    const now = dayjs();
    const today = now.startOf('day');

    // Chỉ lấy các config active có khả năng đến hạn trong ngày hiện tại.
    const configs = await this.recurringConfigRepo.findActiveDueCandidates(now);
    this.logger.log(`[RecurringJob] Tìm thấy ${configs.length} cấu hình lặp active có khả năng đến hạn.`);

    for (const config of configs) {
      try {
        const isDue = this.isRecurringConfigDue(config, today);
        this.logger.log(`[RecurringJob] Config ID: ${config.id}, Tên: "${config.name}", Đến hạn: ${isDue}`);

        if (isDue) {
          const claimed = await this.recurringConfigRepo.claimDueConfigForToday(
            config.id,
            today.toDate(),
            now.toDate(),
          );
          this.logger.log(`[RecurringJob] Config ID: ${config.id}, Trạng thái claim: ${claimed}`);

          if (!claimed) {
            continue;
          }
          this.logger.log(`[RecurringJob] Đang sinh công việc (task instance) cho Config ID: ${config.id}`);
          await this.createTaskInstanceFromRecurring(config, today.toDate());
        }
      } catch (error) {
        this.logger.error(`❌ Lỗi khi xử lý recurring config #${config.id}:`, error);
      }
    }
  }

  private isRecurringConfigTimeDue(
    config: TaskRecurringConfigEntity,
    checkMoment: dayjs.Dayjs,
  ): boolean {
    if (!config.startTime) {
      return true;
    }

    const [hourRaw, minuteRaw] = config.startTime.split(':');
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      this.logger.warn(
        `[RecurringConfig] Invalid startTime "${config.startTime}" for config #${config.id}`,
      );
      return false;
    }

    const scheduledMoment = checkMoment
      .hour(hour)
      .minute(minute)
      .second(0)
      .millisecond(0);

    return checkMoment.isSame(scheduledMoment) || checkMoment.isAfter(scheduledMoment);
  }

  /**
   * 🎯 Kiểm tra xem task có đến hạn không
   */
  // private isRecurringConfigDue(config: TaskRecurringConfigEntity, checkDate: dayjs.Dayjs): boolean {
  //   const { repetitiveTask, startDate, endDate, daysOfWeek, monthInQuarter, executionType, dayOfMonth, relativeWeek, relativeDay } = config;

  //   // 1. Kiểm tra khoảng thời gian hiệu lực
  //   const start = dayjs(startDate).startOf('day');
  //   const end = dayjs(endDate).endOf('day');

  //   if (checkDate.isBefore(start) || checkDate.isAfter(end)) return false;

  //   // 2. Kiểm tra tần suất
  //   switch (repetitiveTask.toLowerCase()) {
  //     case 'daily':
  //       return true;

  //     case 'tuan':
  //       if (!daysOfWeek) return false;
  //       const selectedDays = daysOfWeek.split(',').map((d) => parseInt(d.trim()));
  //       // dayjs: 0 (Sun) - 6 (Sat). Mapping: T2=1, T3=2, T4=3, T5=4, T6=5, T7=6, CN=0.
  //       return selectedDays.includes(checkDate.day());

  //     case 'thang':
  //       return this.isDayOfMonthMatch(config, checkDate);

  //     case 'quy':
  //       if (!monthInQuarter) return false;
  //       const currentMonthInQuarter = (checkDate.month() % 3) + 1; // 1, 2, 3
  //       if (currentMonthInQuarter !== monthInQuarter) return false;
  //       return this.isDayOfMonthMatch(config, checkDate);

  //     default:
  //       return false;
  //   }
  // }

  // private isDayOfMonthMatch(config: TaskRecurringConfigEntity, date: dayjs.Dayjs): boolean {
  //   const { executionType, dayOfMonth, relativeWeek, relativeDay } = config;

  //   if (executionType === 'specific_day') {
  //     return date.date() === (dayOfMonth || 1);
  //   }

  //   if (executionType === 'last_day') {
  //     return date.date() === date.daysInMonth();
  //   }

  //   if (executionType === 'relative_day') {
  //     if (relativeDay === undefined || !relativeWeek) return false;

  //     // Tìm ngày thứ n trong tháng
  //     const startOfMonth = date.startOf('month');
  //     let targetDate: dayjs.Dayjs;

  //     if (relativeWeek === 'last') {
  //       const endOfMonth = date.endOf('month');
  //       targetDate = endOfMonth.subtract((endOfMonth.day() - relativeDay + 7) % 7, 'day');
  //     } else {
  //       const firstOccurrence = startOfMonth.add((relativeDay - startOfMonth.day() + 7) % 7, 'day');
  //       const weeksToAdd = { first: 0, second: 1, third: 2, fourth: 3 }[relativeWeek] || 0;
  //       targetDate = firstOccurrence.add(weeksToAdd, 'week');
  //     }

  //     return date.isSame(targetDate, 'day');
  //   }

  //   return false;
  // }

  /**
   * 📝 Tạo task instance từ recurring task
   */
  private async createTaskInstanceFromRecurring(
    config: TaskRecurringConfigEntity,
    instanceDate: Date,
  ): Promise<void> {
    const dto: CreateTaskDto = JSON.parse(config.taskData);
    const sourceTaskId = JSON.parse(config.taskData)?.taskId || config?.id;

    // Cập nhật ngày cho instance mới
    let start = dayjs(instanceDate);
    if (config.startTime) {
      const [hour, minute] = config.startTime.split(':').map(Number);
      if (!isNaN(hour) && !isNaN(minute)) {
        start = start.hour(hour).minute(minute);
      }
    }

    dto.startDate = start.toDate();
    dto.startTime = config.startTime;
    dto.endDate = start.add(config.durationDays || 1, 'day').toDate();
    dto.repetitiveTask = undefined; // Tránh lặp lại vô tận hoặc tạo nhầm config mới
    dto.isApprovalRequired = config.isApprovalRequired;
    dto.bypassTemplateTimeValidation = true;

    // Gán lại metadata BPMN
    dto.bpmnId = config.bpmnId as any;

    try {
      // if (config.docType === DOCTYPE.TaskDocument) {
      //   await this.createFormDocTask(dto, config.createdById);
      // } else if (config.docType === DOCTYPE.TaskMetting) {
      //   await this.createFormMettingTask(dto, config.createdById);
      // } else {
      const savedTask = await this.create(dto, config.createdById);

      // Copy files from recurring config to the new task instance
      const configFiles = await this.filesRepository.getFilesByObjectAndStatus('taskdocuments', String(config.id));
      if (configFiles && configFiles.length > 0) {
        const oldToNewFileId = new Map<number, number>();
        const pendingFiles = [...configFiles];
        let guard = 0;

        while (pendingFiles.length > 0 && guard < configFiles.length * 3) {
          guard++;
          let progressed = false;

          for (let i = 0; i < pendingFiles.length; i++) {
            const f = pendingFiles[i];
            const oldParentId = f.parent_id ? Number(f.parent_id) : null;
            const mappedParentId = oldParentId ? oldToNewFileId.get(oldParentId) : null;

            // Chỉ copy khi đã có parent mới tương ứng (hoặc file gốc không có parent).
            if (oldParentId && !mappedParentId) {
              continue;
            }

            pendingFiles.splice(i, 1);
            i--;
            progressed = true;

            try {
              const newFileId = await this.filesRepository.createFile({
                file_name: f.file_name,
                storage_type: f.storage_type,
                storage_path: f.storage_path,
                file_path: f.file_path,
                mime_type: f.mime_type,
                file_size: f.file_size,
                parent_id: mappedParentId || null,
                description: f.description || 'Copied from recurring config',
                created_by: config.createdById,
                type_file: f.type_file,
                is_directory: f.is_directory,
              });

              oldToNewFileId.set(Number(f.id), Number(newFileId));

              await this.filesRepository.createFileRelation({
                object_type: 'taskdocuments',
                object_id: String(savedTask.id),
                file_id: newFileId,
              });
            } catch (err) {
              this.logger.error(`Error copying file from recurring config ${config.id} to task ${savedTask.id}:`, err);
            }
          }

          if (!progressed) {
            break;
          }
        }

        if (pendingFiles.length > 0) {
          this.logger.warn(
            `[RecurringCopy] ${pendingFiles.length} files were not copied due to unresolved parent mapping | configId=${config.id} | taskId=${savedTask.id}`,
          );
        }
      }

      // Clone external links (task_document_links) from source recurring task to new task instance
      // Clone links from recurring source (supports legacy 'taskdocuments'
      // and current 'taskdocrecurring')
      if (sourceTaskId) {
        try {
          const sourceLinks = await this.taskDocumentLinkRepository.find({
            where: {
              taskId: String(sourceTaskId),
            },
          });

          if (sourceLinks.length > 0) {
            const newLinks = sourceLinks.map((link) => {
              const newLink = new TaskDocumentLinkEntity();
              newLink.taskId = String(savedTask.id);
              newLink.documentName = link.documentName;
              newLink.documentUrl = link.documentUrl;
              newLink.description = link.description;
              newLink.createdById = config.createdById;
              newLink.createdByName = link.createdByName;
              newLink.objectType = 'taskdocuments';
              return newLink;
            });
            await this.taskDocumentLinkRepository.save(newLinks);
          }
        } catch (err) {
          this.logger.error(
            `Error cloning task_document_links from task ${sourceTaskId} to task ${savedTask.id}:`,
            err,
          );
        }
      }

      // }

      // Cập nhật lastExecutedAt
      await this.recurringConfigRepo.update(config.id, {
        lastExecutedAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`❌ Lỗi khi tạo instance từ config #${config.id}:`, error);
      throw error;
    }
  }

  async createFormDocTask(
    dto: CreateTaskDto,
    userId: string,
  ): Promise<TaskEntity> {
    this.validateCreateInput(dto);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // const docType = (dto.bpmnId || 'TaskDocument') as any;
      const { docType, routingKey } = await this.determineDocTypeFromBpmn(
        userId,
        dto.bpmnId,
        dto,
        'TaskDocumentWorkflow',
      );

      const { bpmnXML, flowId } = await this.validateBpmnAndPermission(
        userId,
        docType,
      );

      // Lấy mã đơn vị từ user
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const unitCode = user?.codeND || 'UNIT';
      const taskCode = await this.generateTaskCode('VB', unitCode);

      const task = queryRunner.manager.create(TaskEntity, {
        ...this.transformDtoForEntity(dto),
        typeTask: TASK_TYPE.FORM_DOC,
        code: taskCode,
        status: 1,
        createdById: userId,
        updatedById: userId,
        isConfidential: dto.isConfidential ?? false,
      });

      const savedTask = await queryRunner.manager.save(task);
      dto.typeTask = TASK_TYPE.FORM_DOC;
      // TẠO CÔNG VIỆC TỪ QUY TRÌNH MẪU (NẾU CÓ)
      if (dto.templateId && this.isUuid(dto.templateId)) {
        // this.logger.log(`Creating tasks from template: ${dto.templateId} for parent task: ${savedTask.id}`);
        await this.createTasksFromTemplate(queryRunner, dto.templateId, savedTask.id, userId, bpmnXML, flowId, docType, '', dto.bpmnId || '', dto);
      }

      // tạo task_users
      await this.createTaskUsers(queryRunner, savedTask.id, dto);

      // GẮN QUYỀN BPMN (QUAN TRỌNG)
      const assigneeIds = [
        ...(dto.directors ?? []).map((d) => d.processId),
        ...(dto.supporters ?? []).map((s) => s.processId),
      ];

      //  TẠO BPMN WORKITEM + AUDIT với người chủ trì
      const directors = dto.directors ?? [];
      const clerksForNotification: string[] = [];

      if (directors.length > 0) {
        const firstDirector = directors[0];
        const directorId = firstDirector.processId;
        const type = Number(firstDirector?.type) || 1;

        if (type === 2 && directorId) {
          const clerkIds = await this.getDepartmentClerks(directorId);
          if (clerkIds && clerkIds.length > 0) {
            for (const clerkId of clerkIds) {
              clerksForNotification.push(clerkId);
              await this.createDocumentAtNode({
                bpmnXML,
                data: {
                  documentId: String(savedTask.id),
                  ...dto,
                },
                docType,
                assigneeUserId: clerkId,
                flowId,
                queryRunner,
              });
            }
          }
        } else if (directorId) {
          await this.createDocumentAtNode({
            bpmnXML,
            data: {
              documentId: String(savedTask.id),
              ...dto,
            },
            docType,
            assigneeUserId: directorId,
            flowId,
            queryRunner,
          });
        }
      }

      //  TẠO BPMN WORKITEM  AUDIT với người phối hợp
      const allSupporterIds: string[] = [];
      if (dto.supporters && dto.supporters.length > 0) {
        await Promise.all(
          dto.supporters.map(async (supporter) => {
            if (supporter.processId) {
              allSupporterIds.push(supporter.processId);
              return this.assignSupporterFromDoc({
                bpmnXML,
                supporterId: supporter.processId,
                data: {
                  documentId: String(savedTask.id),
                  ...dto,
                },
                docType,
              });
            }
          }),
        );
      }

      // 🔔 Thông báo cho người chủ trì, người phối hợp và người theo dõi
      const membersToNotify = [
        ...(dto.directors ?? []).map((d) => d.processId),
        ...clerksForNotification,
        ...allSupporterIds,
      ].filter(id => id);
      const uniqueMemberIds = [...new Set(membersToNotify)];

      const viewersToNotify = (dto.viewers ?? []).map((v) => v.processId).filter(id => id);
      const uniqueViewerIds = [...new Set(viewersToNotify)];

      if (uniqueMemberIds.length > 0) {
        await this.notificationService.createForRecipients({
          recipientIds: uniqueMemberIds,
          senderId: userId || '',
          key: 'VIEW_JOB_TO_DOCUMENT',
          type: NotificationType.ADDED_TO_NEW_TASK_MEMBER.value,
          content: `Bạn có công việc mới: ${dto.name}`,
          recordId: String(savedTask.id),
        });
      }

      if (uniqueViewerIds.length > 0) {
        await this.notificationService.createForRecipients({
          recipientIds: uniqueViewerIds,
          senderId: userId || '',
          key: 'VIEW_JOB_TO_DOCUMENT',
          type: NotificationType.ADDED_TO_NEW_TASK_VIEWER.value,
          content: `Bạn được chỉ định theo dõi công việc mới: ${dto.name}`,
          recordId: String(savedTask.id),
        });
      }

      //Xử lý file đính kèm (nếu có)
      const fileIds = (dto as any).fileIds;

      if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
        for (const fileId of fileIds) {
          try {
            const originalFile = await this.filesRepository.getFileById(fileId);
            if (originalFile) {
              const newFileId = await this.filesRepository.createFile({
                file_name: originalFile.file_name,
                storage_type: originalFile.storage_type,
                storage_path: originalFile.storage_path,
                file_path: originalFile.file_path,
                mime_type: originalFile.mime_type,
                file_size: originalFile.file_size,
                parent_id: originalFile.parent_id,
                description: originalFile.description,
                created_by: userId,
                // version: '1.0',
              });

              await this.filesRepository.createFileRelation({
                object_type: 'taskdocuments',
                object_id: String(savedTask.id),
                file_id: newFileId,
              });
            }
          } catch (err) {
            this.logger.error(
              `Lỗi khi copy file ${fileId} cho công việc ${savedTask.id}`,
              err,
            );
          }
        }
      }

      await queryRunner.commitTransaction();
      if (!dto.parent) {
        // tạo task cha (root)
        await this.createLogFromSystem({
          actions: 'POST',
          details: 'Tạo công việc',
          userInfo: userId,
          timestamps: new Date().toISOString(),
          taskId: task.id.toString(),
        });
      } else {
        // tạo task con
        // 1) log cho task con => "Tạo công việc"
        await this.createLogFromSystem({
          actions: 'POST',
          details: 'Tạo công việc',
          userInfo: userId,
          timestamps: new Date().toISOString(),
          taskId: task.id.toString(),
        });

        // 2) log cho task cha => "Tạo công việc con"
        await this.createLogFromSystem({
          actions: 'POST',
          details: 'Tạo công việc con',
          userInfo: userId,
          timestamps: new Date().toISOString(),
          taskId: dto.parent.toString(),
        });
      }

      // TỰ ĐỘNG CẬP NHẬT TIẾN ĐỘ DỰ ÁN NẾU CÔNG VIỆC THUỘC DỰ ÁN
      if (dto.projectId) {
        await this.projectService.calculateAndUpdateProjectProgress(Number(dto.projectId));
      }

      return savedTask;
    } catch (e) {
      try {
        if (queryRunner.isTransactionActive) {
          await queryRunner.rollbackTransaction();
        }
      } catch (rollbackError: any) {
        if (rollbackError?.code !== 'EABORT') {
          this.logger.error('Rollback error:', rollbackError);
        }
      }
      this.logger.error('createFormDocTask error:', e);
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async createFormMettingTask(dto: CreateTaskDto, userId: string): Promise<TaskEntity> {
    // VALIDATE INPUT
    this.validateCreateInput(dto);
    // XÁC ĐỊNH DOCTYPE TỪ LUỒNG BPMN
    let docType: any = null;
    let routingKey: string | undefined = undefined;

    if (dto.parent) {
      const parentWorkItems = await this.dataSource.query(
        `SELECT TOP 1 bpmn_version, node_id FROM work_items WHERE document_id = @0 AND bpmn_version = @1 AND assignee_user_id = @2 ORDER BY id DESC`,
        [String(dto.parent), DOCTYPE.TaskManyLevelUnit, userId],
      );
      if (parentWorkItems && parentWorkItems.length > 0) {
        docType = DOCTYPE.TaskManyLevelUnit;
        (dto as any).parentNodeId = parentWorkItems[0].node_id;
      }
    }

    if (!docType) {
      const res = await this.determineDocTypeFromBpmn(userId, dto.bpmnId, dto);
      docType = res.docType;
      routingKey = res.routingKey;
    }

    // XÁC ĐỊNH DOCTYPE TỪ LUỒNG BPMN
    // const { docType, routingKey } = await this.determineDocTypeFromBpmnFormMetting(userId, dto.bpmnId, dto);

    // VALIDATE BPMN + QUYỀN
    const { bpmnXML, flowId } = await this.validateBpmnAndPermission(userId, docType);

    // BẮT ĐẦU TRANSACTION
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // TẠO TASK GENERAL
      const task = await this.createGeneralTaskFormMetting(queryRunner, { ...dto }, userId);
      dto.typeTask = TASK_TYPE.FORM_MEETING;
      if (dto.templateId && this.isUuid(dto.templateId)) {
        // this.logger.log(`Creating tasks from template: ${dto.templateId} for parent task: ${task.id}`);
        await this.createTasksFromTemplate(queryRunner, dto.templateId, task.id, userId, bpmnXML, flowId, docType, routingKey!, dto.bpmnId || '', dto);
      }
      const isMeeting = true;
      // TẠO BPMN WORKITEM + AUDIT
      await this.createBpmnWorkItemsAndAudit(queryRunner, task.id, dto, bpmnXML, flowId, docType, routingKey, undefined, isMeeting);

      // XỬ LÝ PATH VÀ RECURRING TASK
      await this.handlePathAndRecurringTask(queryRunner, task.id, dto, userId);

      await queryRunner.commitTransaction();

      // TẠO SYSTEM LOG
      await this.createTaskSystemLogs(task.id, dto.parent?.toString(), userId);

      // CẬP NHẬT TRẠNG THÁI DỰ ÁN
      if (dto.projectId) {
        await this.projectService.checkAndUpdateProjectStatus(Number(dto.projectId));
        await this.projectService.calculateAndUpdateProjectProgress(Number(dto.projectId));
      }

      return this.findOne(task.id);
    } catch (e) {
      // Xử lý rollback an toàn - transaction có thể đã bị abort bởi SQL Server
      try {
        if (queryRunner.isTransactionActive) {
          await queryRunner.rollbackTransaction();
        }
      } catch (rollbackError: any) {
        // Bỏ qua lỗi EABORT vì transaction đã bị hủy
        if (rollbackError?.code !== 'EABORT') {
          this.logger.error('Rollback error:', rollbackError);
        }
      }
      this.logger.error('createFormMettingTask error:', e);
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  // async createFormMettingTask(
  //   dto: CreateTaskDto,
  //   userId: string,
  // ): Promise<TaskEntity> {
  //   const queryRunner = this.dataSource.createQueryRunner();
  //   await queryRunner.connect();
  //   await queryRunner.startTransaction();

  //   try {
  //     const docType = (dto.bpmnId || 'TaskMetting') as any;
  //     const { bpmnXML, flowId } = await this.validateBpmnAndPermission(
  //       userId,
  //       docType,
  //     );

  //     const task = queryRunner.manager.create(TaskEntity, {
  //       ...this.transformDtoForEntity(dto),
  //       typeTask: TASK_TYPE.FORM_MEETING,
  //       code: this.generateTaskCode(),
  //       status: 1,
  //       createdById: userId,
  //       updatedById: userId,
  //     });

  //     const savedTask = await queryRunner.manager.save(task);

  //     // tạo task_users
  //     await this.createTaskUsers(queryRunner, savedTask.id, dto);

  //     // GẮN QUYỀN BPMN (QUAN TRỌNG)
  //     const assigneeIds = [
  //       ...(dto.directors ?? []).map((d) => d.processId),
  //       ...(dto.supporters ?? []).map((s) => s.processId),
  //     ];

  //     //  TẠO BPMN WORKITEM + AUDIT với người chủ trì
  //     const firstDirectorId = dto.directors?.length
  //       ? dto.directors[0].processId
  //       : null;
  //     if (firstDirectorId) {
  //       await this.createDocumentAtNode({
  //         bpmnXML,
  //         data: {
  //           documentId: String(savedTask.id),
  //           ...dto,
  //         },
  //         assigneeUserId: firstDirectorId,
  //         flowId,
  //         queryRunner,
  //         docType,
  //       });
  //     }

  //     //  TẠO BPMN WORKITEM  AUDIT với người phối hợp
  //     if (dto.supporters && dto.supporters.length > 0) {
  //       await Promise.all(
  //         dto.supporters.map((supporter) => {
  //           if (supporter.processId) {
  //             return this.assignSupporterFromDoc({
  //               bpmnXML,
  //               supporterId: supporter.processId,
  //               data: {
  //                 docType,
  //                 documentId: String(savedTask.id),
  //                 ...dto,
  //               },
  //             });
  //           }
  //         }),
  //       );
  //     }

  //     await queryRunner.commitTransaction();
  //     return savedTask;
  //   } catch (e) {
  //     await queryRunner.rollbackTransaction();
  //     throw e;
  //   } finally {
  //     await queryRunner.release();
  //   }
  // }

  private async createTaskUsers(
    qr: QueryRunner,
    taskId: number,
    dto: CreateTaskDto,
  ): Promise<void> {
    const roleMap = [
      { key: 'assigners', role: 'assigner' },
      { key: 'directors', role: 'director' },
      { key: 'supporters', role: 'supporter' },
      { key: 'viewers', role: 'viewer' },
    ];

    const taskUsers: TaskUserEntity[] = [];

    for (const { key, role } of roleMap) {
      const users = (dto as any)[key] || [];

      for (const u of users) {
        let type = u.type ?? 1;

        // Hỗ trợ map string type sang integer nếu cần
        if (typeof type === 'string') {
          if (type === 'individual') type = TaskUserType.INDIVIDUAL;
          else if (type === 'department') type = TaskUserType.DEPARTMENT;
          else type = 1; // Default
        }

        const processId =
          typeof u.processId === 'string' ? u.processId : u.processId?.id;

        if (!processId) continue;

        let processName = '';

        if (type === 1) {
          const user = await qr.manager.findOne(UserEntity, {
            where: { id: processId },
            select: ['name'],
          });
          processName = user?.name ?? '';
        }

        if (type === 2) {
          const org = await qr.manager.findOne(OrganizationUnitEntity, {
            where: { id: processId },
            select: ['name'],
          });
          processName = org?.name ?? '';
        }

        taskUsers.push(
          qr.manager.create(TaskUserEntity, {
            taskId,
            processId,
            processName,
            role,
            type,
          }),
        );
      }
    }

    if (taskUsers.length > 0) {
      await qr.manager.save(taskUsers);
    }
  }

  private async createGeneralTask(
    qr: QueryRunner,
    dto: CreateTaskDto,
    userId: string,
    recurringFromId: number | null = null,
  ): Promise<TaskEntity> {
    const { id, ...taskData } = dto as any;

    // Lấy mã đơn vị từ user
    const user: any = await this.sqlsvRepo.getUserById(userId);
    const unitCode = user?.codeND || 'UNIT';
    const typeCode = this.getTaskTypeCode(dto.typeTask || TASK_TYPE.GENERAL);
    const code = taskData.code || await this.generateTaskCode(typeCode, unitCode);

    const task = qr.manager.create(TaskEntity, {
      ...taskData,
      typeTask: dto.typeTask || TASK_TYPE.GENERAL,
      recurringFromId,
      templateId: dto.templateId || null,
      code,
      isApprovalRequired: dto.isApprovalRequired ?? false,
      // priority đã là string (database định nghĩa là varchar)
      priority: taskData.priority ?? null,
      createdById: userId,
      updatedById: userId,
      status: 1,
      isConfidential: dto.isConfidential ?? false,
    });

    const saved = await qr.manager.save(task);
    await this.createTaskUsers(qr, saved.id, dto);

    return saved;
  }
  private async createGeneralTaskFormMetting(
    qr: QueryRunner,
    dto: CreateTaskDto,
    userId: string,
    recurringFromId: number | null = null,
  ): Promise<TaskEntity> {
    const { id, ...taskData } = dto as any;

    // Lấy mã đơn vị từ user
    const user: any = await this.sqlsvRepo.getUserById(userId);
    const unitCode = user?.codeND || 'UNIT';
    // Phân biệt LH (cuộc họp) hoặc KL (kết luận)
    const typeCode = this.getTaskTypeCode(TASK_TYPE.FORM_MEETING, dto.typeTaskMeeting);
    const code = taskData.code || await this.generateTaskCode(typeCode, unitCode);

    const task = qr.manager.create(TaskEntity, {
      ...taskData,
      typeTask: TASK_TYPE.FORM_MEETING,
      recurringFromId,
      code,
      // priority đã là string (database định nghĩa là varchar)
      priority: taskData.priority ?? null,
      createdById: userId,
      updatedById: userId,
      status: 1,
      typeTaskMeeting: dto.typeTaskMeeting || null,
      meetingConclusionId: dto.meetingConclusionId || null,
      isConfidential: dto.isConfidential ?? false,
    });

    const saved = await qr.manager.save(task);
    await this.createTaskUsers(qr, saved.id, dto);

    return saved;
  }

  /**
   * Sinh mã công việc theo quy tắc mới:
   * Cấu trúc: Loại-MãĐơnVị-NămTháng-STT
   * - Loại: CN (chung), VB (văn bản), LH (cuộc họp), KL (kết luận), DA (dự án)
   * - Mã đơn vị: Theo danh mục phòng ban (TCSG, VPCT, PKKD...)
   * - Năm tháng: YYYYMM
   * - STT: Tăng dần, 5 ký tự (00001-99999)
   * Ví dụ: VB-TCSG-202501-00045
   */
  private async generateTaskCode(
    typeCode?: string,
    unitCode?: string,
  ): Promise<string> {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const yearMonth = `${y}${m}`;

    // Mặc định typeCode là CN (công việc chung)
    const type = typeCode || 'CN';
    // Mặc định unitCode là UNIT nếu không có
    const unit = unitCode || 'UNIT';

    // Lấy số thứ tự tiếp theo trong tháng
    const prefix = `${type}-${unit}-${yearMonth}-`;
    const prefixLen = prefix.length;

    try {
      // Query tối ưu: chỉ lấy các task có code đúng format và độ dài phù hợp
      const result = await this.dataSource.query(
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
      // Fallback: tạo mã ngẫu nhiên nếu query thất bại
      console.error('Error generating task code:', error);
      const rand = Math.floor(10000 + Math.random() * 89999);
      return `${prefix}${rand}`;
    }
  }

  /**
   * Xác định loại công việc dựa trên typeTask
   * - general -> CN (Công việc chung)
   * - form_doc -> VB (Văn bản)
   * - form_meeting -> LH (Cuộc họp) hoặc KL (Kết luận)
   * - form_project -> DA (Dự án)
   */
  private getTaskTypeCode(typeTask: string, typeTaskMeeting?: string): string {
    switch (typeTask) {
      case 'general':
      case 'recurring':
      case 'template':
        return 'CN';
      case 'form_doc':
        return 'VB';
      case 'form_meeting':
        // Phân biệt cuộc họp hoặc kết luận
        return typeTaskMeeting === 'conclusion' ? 'KL' : 'LH';
      case 'form_project':
      case 'project':
        return 'DA';
      default:
        return 'CN';
    }
  }

  private isUuid(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  private async createTasksFromTemplate(
    queryRunner: QueryRunner,
    templateId: string,
    parentTaskId: number,
    userId: string,
    bpmnXML: string,
    flowId: string,
    docType: string,
    routingKey: string,
    bpmnId?: string,
    parentDto?: CreateTaskDto
  ): Promise<void> {
    try {
      // LẤY QUY TRÌNH MẪU
      const template = await queryRunner.manager.findOne(ProcessTemplateEntity, {
        where: { id: templateId },
      });

      if (!template) {
        throw new BadRequestException('Không tìm thấy quy trình mẫu');
      }

      const templateTasks = await queryRunner.manager.find(ProcessTemplateTaskEntity, {
        where: { processTemplateId: templateId },
        order: { displayOrder: 'DESC' }
      });

      if (!templateTasks || templateTasks.length === 0) return;

      const parentTask = await queryRunner.manager.findOne(TaskEntity, { where: { id: parentTaskId } });
      const baseStart = parentDto?.startDate || new Date();

      // VALIDATE THỜI GIAN THỰC HIỆN QUY TRÌNH MẪU
      if (template.totalExecutionTime && parentDto?.endDate && !parentDto?.bypassTemplateTimeValidation) {
        // Parse totalExecutionTime (ví dụ: "66 ngày")
        const match = template.totalExecutionTime.match(/(\d+)\s*(ngày|day)/i);
        if (match) {
          const days = parseInt(match[1]);
          const templateEndDate = dayjs(baseStart).add(days, 'day').toDate();
          const configEndDate = dayjs(parentDto.endDate).toDate();

          if (templateEndDate > configEndDate) {
            const message = `Quy trình mẫu "${template.name}" cần ${days} ngày để hoàn thành, nhưng hạn xử lý của công việc chỉ còn ${dayjs(parentDto.endDate).diff(baseStart, 'day')} ngày. Bạn có muốn tiếp tục không?`;
            throw new BadRequestException({
              message,
              code: 'TEMPLATE_TIME_EXCEEDED',
              templateName: template.name,
              requiredDays: days,
              availableDays: dayjs(parentDto.endDate).diff(baseStart, 'day'),
            });
          }
        }
      }

      const user: any = await this.sqlsvRepo.getUserById(userId);
      const unitCode = user?.codeND || 'UNIT';

      const timeMap = new Map<string, { start: Date, end: Date }>();
      const templateToRealMap = new Map<string, number>();
      // check đơn vị ngày
      const addDuration = (date: Date, durationStr: string, unit: string): Date => {
        const d = dayjs(date);
        const amount = parseInt(durationStr) || 0;
        const u = (unit || '').toLowerCase();
        if (u.includes('ngày') || u.includes('day')) return d.add(amount, 'day').toDate();
        if (u.includes('giờ') || u.includes('hour')) return d.add(amount, 'hour').toDate();
        if (u.includes('phút') || u.includes('minute')) return d.add(amount, 'minute').toDate();
        return d.add(amount, 'day').toDate();
      };

      // [Tối ưu] Dùng Map để tra cứu O(1) thay vì array.find() O(n) trong vòng lặp
      const templateTaskMap = new Map<string, ProcessTemplateTaskEntity>(
        templateTasks.map(t => [t.id, t])
      );

      const calculateTime = (t: ProcessTemplateTaskEntity, visited = new Set<string>()) => {
        if (timeMap.has(t.id)) return timeMap.get(t.id);
        if (visited.has(t.id)) return { start: baseStart, end: addDuration(baseStart, t.executionTime, t.unit) };
        visited.add(t.id);
        let start: Date;
        if (t.dependency && this.isUuid(t.dependency)) {
          // [Tối ưu] Dùng Map O(1) thay vì .find() O(n)
          const depTask = templateTaskMap.get(t.dependency);
          const depTime = depTask ? calculateTime(depTask, visited) : null;
          if (depTime) {
            start = depTime.end;
          } else {
            start = baseStart;
          }
        } else {
          start = baseStart;
        }
        const end = addDuration(start, t.executionTime, t.unit);
        const times = { start, end };
        timeMap.set(t.id, times);
        return times;
      };

      templateTasks.forEach(t => calculateTime(t));

      const createRecursive = async (parentTemplateId: string | null, parentRealId: number, parentPath: string) => {
        const children = templateTasks.filter(t => (t.parentId || null) === parentTemplateId);
        if (children.length === 0) return;

        // TẠO TẤT CẢ TASKS CÙNG LEVEL SONG SONG
        const createdTasks = await Promise.all(
          children.map(async (t) => {
            const times = timeMap.get(t.id);
            if (!times) return null;

            // Tạo DTO cho task con từ template - KẾ THỪA NGƯỜI THAM GIA TỪ CHA
            const taskDto: any = {
              name: t.name,
              note: t.note,
              typeTask: parentDto?.typeTask || TASK_TYPE.GENERAL,
              priority: t.priority,
              startDate: times.start,
              endDate: times.end,
              parent: parentRealId,
              processStatus: '1',
              progress: '0',
              projectId: parentTask?.projectId,
              bpmnId: bpmnId,
              reminderTime: t.reminderTime,
              topic: parentDto?.topic,
              isApprovalRequired: t.isApprovalRequired ?? false,
              // Kế thừa người tham gia từ task cha
              // supporters: parentDto?.supporters,
              assigners: parentDto?.assigners || [],
              // directors: parentDto?.directors || [],
              // viewers: parentDto?.viewers || [],
            };

            // Gọi createGeneralTask để tạo task đầy đủ
            const savedTask = await this.createGeneralTask(queryRunner, taskDto, userId);

            // Copy files from template task to the new task
            if (t.files && Array.isArray(t.files) && t.files.length > 0) {
              await this.copyFilesFromTemplateData(queryRunner, t.files, 'taskdocuments', savedTask.id, userId);
            }

            const currentPath = `${parentPath}/${savedTask.id}`;
            templateToRealMap.set(t.id, savedTask.id);

            // Cập nhật path
            await queryRunner.manager.update(TaskEntity, { id: savedTask.id }, { path: currentPath });

            // TẠO BPMN WORKITEM + AUDIT cho task con
            // await this.createBpmnWorkItemsAndAudit(queryRunner, savedTask.id, taskDto, bpmnXML, flowId, docType, routingKey);

            return { templateId: t.id, realId: savedTask.id, path: currentPath };
          })
        );

        // Lọc bỏ null và tạo đệ quy cho children
        const validTasks = createdTasks.filter(t => t !== null);

        // TẠO CHILDREN CHO TẤT CẢ TASKS VỪA TẠO (SONG SONG)
        await Promise.all(
          validTasks.map(task => createRecursive(task.templateId, task.realId, task.path))
        );
      };

      await createRecursive(null, parentTaskId, parentTask?.path || String(parentTaskId));

      // CẬP NHẬT PHỤ THUỘC (dependentTaskId) DỰA TRÊN TEMPLATE
      // [Tối ưu] Dùng Promise.all thay vì await tuần tự trong vòng for
      const depUpdates = templateTasks
        .filter(t =>
          t.dependency &&
          templateToRealMap.has(t.dependency) &&
          templateToRealMap.has(t.id)
        )
        .map(t =>
          queryRunner.manager.update(
            TaskEntity,
            { id: templateToRealMap.get(t.id) },
            { dependentTaskId: templateToRealMap.get(t.dependency) },
          )
        );
      if (depUpdates.length > 0) {
        await Promise.all(depUpdates);
      }

    } catch (error) {
      this.logger.error(`Error creating tasks from template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Tạo recurring config từ template cho Recurring Task Config
   * Tạo các recurring config con từ template (lưu vào bảng task_recurring_config)
   * Khi cronjob chạy, sẽ tạo toàn bộ cây task từ các config này
   */
  private async createTasksFromTemplateTaskConfig(
    queryRunner: QueryRunner,
    templateId: string,
    parentConfigId: number,
    userId: string,
    bpmnXML: string,
    flowId: string,
    docType: string,
    routingKey: string,
    bpmnId?: string,
    parentDto?: CreateTaskDto
  ): Promise<void> {
    try {
      // LẤY QUY TRÌNH MẪU
      const template = await queryRunner.manager.findOne(ProcessTemplateEntity, {
        where: { id: templateId },
      });

      if (!template) {
        throw new BadRequestException('Không tìm thấy quy trình mẫu');
      }

      const templateTasks = await queryRunner.manager.find(ProcessTemplateTaskEntity, {
        where: { processTemplateId: templateId },
        order: { displayOrder: 'DESC' }
      });

      if (!templateTasks || templateTasks.length === 0) {
        this.logger.warn(`Template ${template.name} không có task nào`);
        return;
      }

      // Lấy recurring config cha để lấy thông tin
      const parentConfig = await queryRunner.manager.findOne(TaskRecurringConfigEntity, {
        where: { id: parentConfigId }
      });

      if (!parentConfig) {
        throw new BadRequestException('Không tìm thấy recurring config');
      }

      // Debug: Log endDate từ database

      const configData = JSON.parse(parentConfig.taskData);
      const user: any = await this.sqlsvRepo.getUserById(userId);
      const unitCode = user?.codeND || 'UNIT';

      // VALIDATE THỜI GIAN THỰC HIỆN QUY TRÌNH MẪU
      const baseStart = parentDto?.startDate || new Date();
      if (template.totalExecutionTime && parentDto?.endDate && !parentDto?.bypassTemplateTimeValidation) {
        // Parse totalExecutionTime (ví dụ: "66 ngày")
        const match = template.totalExecutionTime.match(/(\d+)\s*(ngày|day)/i);
        if (match) {
          const days = parseInt(match[1]);
          const templateEndDate = dayjs(baseStart).add(days, 'day').toDate();
          const configEndDate = dayjs(parentDto.endDate).toDate();

          // Debug log

          if (templateEndDate > configEndDate) {
            const message = `Quy trình mẫu "${template.name}" cần ${days} ngày để hoàn thành, nhưng hạn xử lý của cấu hình lặp lại chỉ còn ${dayjs(configEndDate).diff(baseStart, 'day')} ngày. Bạn có muốn tiếp tục không?`;
            throw new BadRequestException({
              message,
              code: 'TEMPLATE_TIME_EXCEEDED',
              templateName: template.name,
              requiredDays: days,
              availableDays: dayjs(configEndDate).diff(baseStart, 'day'),
            });
          }
        }
      }
      // TÍNH TOÁN THỜI GIAN CHO CÁC TASK CON (relative time)
      const timeMap = new Map<string, { durationDays: number, offsetDays: number }>();

      const addDuration = (durationStr: string, unit: string): number => {
        const amount = parseInt(durationStr) || 0;
        const u = (unit || '').toLowerCase();
        if (u.includes('ngày') || u.includes('day')) return amount;
        if (u.includes('giờ') || u.includes('hour')) return Math.ceil(amount / 24);
        if (u.includes('phút') || u.includes('minute')) return Math.ceil(amount / 1440);
        return amount;
      };

      const calculateTime = (t: ProcessTemplateTaskEntity, visited = new Set<string>()) => {
        if (timeMap.has(t.id)) return timeMap.get(t.id);
        if (visited.has(t.id)) return { durationDays: addDuration(t.executionTime, t.unit), offsetDays: 0 };
        visited.add(t.id);

        let offsetDays = 0;
        if (t.dependency && this.isUuid(t.dependency)) {
          const depTask = templateTasks.find(dt => dt.id === t.dependency);
          const depTime = depTask ? calculateTime(depTask, visited) : null;
          if (depTime) {
            offsetDays = depTime.offsetDays + depTime.durationDays;
          }
        }

        const durationDays = addDuration(t.executionTime, t.unit);
        const times = { durationDays, offsetDays };
        timeMap.set(t.id, times);
        return times;
      };

      templateTasks.forEach(t => calculateTime(t));

      // TẠO CÁC RECURRING CONFIG CON TỪ TEMPLATE (ĐỆ QUY)
      const createRecursive = async (parentTemplateId: string | null, parentRealConfigId: number) => {
        const children = templateTasks.filter(t => (t.parentId || null) === parentTemplateId);
        if (children.length === 0) return;

        const createdConfigs = await Promise.all(
          children.map(async (t) => {
            const times = timeMap.get(t.id);
            if (!times) return null;

            const childCode = await this.generateTaskCode('LAPLAI', unitCode);

            // Tạo taskData cho config con
            const childTaskData: any = {
              name: t.name,
              note: t.note,
              typeTask: (t as any).typeTask || TASK_TYPE.GENERAL,
              priority: t.priority,
              processStatus: '1',
              progress: '0',
              projectId: configData.projectId,
              bpmnId: bpmnId,
              topic: parentConfig.topic,
              isApprovalRequired: t.isApprovalRequired ?? false,
              assigners: configData?.assigners || [],
            };

            // Tạo recurring config con
            const childConfigData = {
              name: t.name,
              code: childCode,
              repetitiveTask: parentConfig.repetitiveTask,
              daysOfWeek: parentConfig.daysOfWeek ?? undefined,
              monthInQuarter: parentConfig.monthInQuarter ?? undefined,
              executionType: parentConfig.executionType ?? undefined,
              dayOfMonth: parentConfig.dayOfMonth ?? undefined,
              relativeWeek: parentConfig.relativeWeek ?? undefined,
              relativeDay: parentConfig.relativeDay ?? undefined,
              startTime: parentConfig.startTime ?? undefined,
              durationDays: times.durationDays,
              startDate: parentConfig.startDate,
              endDate: parentConfig.endDate,
              taskData: JSON.stringify(childTaskData),
              isApprovalRequired: t.isApprovalRequired ?? false,
              bpmnId: parentConfig.bpmnId ?? undefined,
              flowId: parentConfig.flowId ?? undefined,
              docType: parentConfig.docType ?? undefined,
              routingKey: parentConfig.routingKey ?? undefined,
              ...(t.priority && { priority: t.priority }),
              topic: parentConfig.topic ?? undefined,
              note: t.note ?? undefined,
              reminderTime: parentConfig.reminderTime ?? undefined,
              parentId: parentRealConfigId, // ✅ Liên kết với config cha
              createdById: userId,
              updatedById: userId,
              status: 1,
            };

            const childConfig = queryRunner.manager.create(TaskRecurringConfigEntity, childConfigData);

            const savedConfig = await queryRunner.manager.save(childConfig);

            // Copy files from template task to the new recurring config
            if (t.files && Array.isArray(t.files) && t.files.length > 0) {
              await this.copyFilesFromTemplateData(queryRunner, t.files, 'task_recurring_config', savedConfig.id, userId);
            }



            return { templateId: t.id, realConfigId: savedConfig.id };
          })
        );

        const validConfigs = createdConfigs.filter(c => c !== null);

        // Đệ quy tạo config con của config con
        await Promise.all(
          validConfigs.map(config => createRecursive(config.templateId, config.realConfigId))
        );
      };

      await createRecursive(null, parentConfigId);

      // Cập nhật parent config với templateId
      await queryRunner.manager.update(TaskRecurringConfigEntity,
        { id: parentConfigId },
        {
          templateId: templateId,
          note: parentDto?.note ? `${parentDto.note}\n[Template: ${template.name}]` : `[Template: ${template.name}]`
        }
      );


    } catch (error) {
      this.logger.error(`Error creating recurring configs from template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Helper để copy file từ dữ liệu JSON trong ProcessTemplateTaskEntity.files sang một đối tượng đích
   */
  private async copyFilesFromTemplateData(
    queryRunner: QueryRunner,
    files: any[],
    objectType: string,
    objectId: string | number,
    userId: string,
  ): Promise<void> {
    if (!files || !Array.isArray(files) || files.length === 0) return;

    for (const file of files) {
      try {
        // file object format in JSON: {id, file_name, file_path, storage_type, ...}
        const newFileId = await this.filesRepository.createFile({
          file_name: file.file_name,
          storage_type: file.storage_type || 'minio',
          storage_path: file.file_path, // Template dùng file_path làm storage_path/file_path
          file_path: file.file_path,
          mime_type: file.mime_type || 'application/octet-stream',
          file_size: file.file_size || 0,
          parent_id: file.parent_id || null,
          description: file.description || 'Copied from process template',
          created_by: userId,
        });

        await this.filesRepository.createFileRelation({
          object_type: objectType,
          object_id: String(objectId),
          file_id: newFileId,
        });
      } catch (err) {
        this.logger.error(`Error copying file from template for ${objectType} ${objectId}:`, err);
      }
    }
  }

  /**
   * Transform DTO data to Entity format
   * Convert weekdays from number[] to JSON string
   */
  private transformDtoForEntity(dto: any, isUpdate = false): any {
    const transformed = { ...dto };

    // Convert weekdays array to JSON string
    if (dto.weekdays && Array.isArray(dto.weekdays)) {
      transformed.weekdays = JSON.stringify(dto.weekdays);
    }

    if (isUpdate) {
      if (transformed.processStatus === null || transformed.processStatus === '') {
        transformed.processStatus = '1';
      }
    } else {
      if (transformed.processStatus === undefined || transformed.processStatus === null || transformed.processStatus === '') {
        transformed.processStatus = '1';
      }
    }

    return transformed;
  }

  private applyTabFilter(qb: SelectQueryBuilder<TaskEntity>, tab?: TaskTab) {
    switch (tab) {
      case TaskTab.REPEAT:
        qb.andWhere('task.repetitiveTask = :repeat', { repeat: 'co' });
        break;

      case TaskTab.DOCUMENT:
        qb.andWhere('task.bpmnId IS NOT NULL');
        break;

      case TaskTab.MEETING:
        qb.andWhere('task.parent IS NOT NULL');
        break;

      case TaskTab.GENERAL:
      default:
        qb.andWhere('task.repetitiveTask = :repeat', { repeat: 'khong' })
          .andWhere('task.bpmnId IS NULL')
          .andWhere('task.parent IS NULL');
        break;
    }
  }

  // async findAll(queryParams: ListTaskDto, userId?: string) {
  //   const {
  //     page = 1,
  //     limit = 10,
  //     status,
  //     tab,
  //     typeTask,
  //     filter,
  //     sort,
  //   } = queryParams;

  //   const pageNum = Number(page) || 1;
  //   const limitNum = Number(limit) || 10;

  //   /* =====================================================
  //    * 1. QUERY LẤY TASK ID (NHẸ – TỐI ƯU)
  //    * ===================================================== */
  //   const idQb = this.taskRepository
  //     .createQueryBuilder('task')
  //     .select('task.id', 'id');

  //   const { name } = filter || {};

  //   if (name) {
  //     idQb.andWhere('task.name COLLATE Latin1_General_CI_AI LIKE :name', {
  //       name: `%${name}%`,
  //     });
  //   }

  //   idQb.andWhere('task.status = :status', {
  //     status: status ?? 1,
  //   });

  //   idQb.andWhere('task.typeTask = :typeTask', {
  //     typeTask: typeTask ?? TASK_TYPE.GENERAL,
  //   });

  //   if (tab) {
  //     this.applyTabFilter(idQb, tab);
  //   }

  //   /* =====================================================
  //    * 🔥 CÁCH 2 – QUERY work_items TRƯỚC
  //    * ===================================================== */
  //   let flowTaskIds: number[] = [];

  //   if (userId) {
  //     const wiRows = await this.dataSource.query(
  //       `
  //       SELECT DISTINCT TRY_CAST(document_id AS BIGINT) AS taskId
  //       FROM work_items WITH (NOLOCK)
  //       WHERE assignee_user_id = @0
  //         AND TRY_CAST(document_id AS BIGINT) IS NOT NULL
  //       `,
  //       [userId],
  //     );

  //     flowTaskIds = wiRows.map((r: any) => Number(r.taskId));

  //     idQb
  //       .andWhere(
  //         new Brackets((qb) => {
  //           qb.where('task.createdById = :userId');

  //           if (flowTaskIds.length) {
  //             qb.orWhere('task.id IN (:...flowTaskIds)', {
  //               flowTaskIds,
  //             });
  //           }
  //         }),
  //       )
  //       .setParameter('userId', userId);
  //   }

  //   // paging
  //   idQb
  //     .orderBy('task.createdAt', 'DESC')
  //     .skip((pageNum - 1) * limitNum)
  //     .take(limitNum);

  //   const idRows = await idQb.getRawMany();

  //   if (!idRows.length) {
  //     return {
  //       data: [],
  //       total: 0,
  //       page: pageNum,
  //       limit: limitNum,
  //       totalPages: 0,
  //     };
  //   }

  //   const taskIds = idRows.map((r) => r.id);

  //   /* =====================================================
  //    * 2. QUERY COUNT (NHẸ – KHÔNG OFFSET / ORDER)
  //    * ===================================================== */
  //   const countQb = this.taskRepository
  //     .createQueryBuilder('task')
  //     .select('COUNT(DISTINCT task.id)', 'cnt');

  //   if (name) {
  //     countQb.andWhere('task.name COLLATE Latin1_General_CI_AI LIKE :name', {
  //       name: `%${name}%`,
  //     });
  //   }

  //   countQb.andWhere('task.status = :status', {
  //     status: status ?? 1,
  //   });

  //   countQb.andWhere('task.typeTask = :typeTask', {
  //     typeTask: typeTask ?? TASK_TYPE.GENERAL,
  //   });

  //   if (tab) {
  //     this.applyTabFilter(countQb, tab);
  //   }

  //   if (userId) {
  //     countQb
  //       .andWhere(
  //         new Brackets((qb) => {
  //           qb.where('task.createdById = :userId');

  //           if (flowTaskIds.length) {
  //             qb.orWhere('task.id IN (:...flowTaskIds)', {
  //               flowTaskIds,
  //             });
  //           }
  //         }),
  //       )
  //       .setParameter('userId', userId);
  //   }

  //   const { cnt } = await countQb.getRawOne();
  //   const total = Number(cnt);

  //   /* =====================================================
  //    * 3. QUERY DETAIL
  //    * ===================================================== */
  //   const qb = this.taskRepository
  //     .createQueryBuilder('task')
  //     .leftJoinAndSelect('task.taskUsers', 'taskUsers')
  //     .leftJoinAndSelect('task.createdBy', 'createdBy')
  //     .leftJoinAndSelect('task.updatedBy', 'updatedBy')
  //     .where('task.id IN (:...ids)', { ids: taskIds })
  //     .orderBy('task.createdAt', 'DESC');

  //   const data = await qb.getMany();

  //   /* =====================================================
  //    * 4. MAP DATA (GIỮ NGUYÊN LOGIC CŨ)
  //    * ===================================================== */
  //   const mappedData = await Promise.all(
  //     data.map(async (task) => {
  //       const progressView = await buildProgressView(task);
  //       const { assigner, director, supporter, viewer } = this.mapTaskUsers(
  //         task.taskUsers,
  //       );

  //       const crmMappedValues = await this.mapCrmTitles(task);

  //       return {
  //         ...task,
  //         processStatusUi: this.mapProcessStatusToHtml(task.processStatus),
  //         flag:
  //           crmMappedValues.priority === 'Gấp' ? RED_FLAG_SVG : WHITE_FLAG_SVG,
  //         assigner,
  //         director,
  //         supporter,
  //         viewer,
  //         progressView: progressView.html,
  //         startDate: task.startDate
  //           ? dayjs(task.startDate).format('DD/MM/YYYY')
  //           : null,
  //         endDate: task.endDate
  //           ? dayjs(task.endDate).format('DD/MM/YYYY')
  //           : null,
  //         createdAt: dayjs(task.createdAt).format('DD/MM/YYYY HH:mm'),
  //         updatedAt: task.updatedAt
  //           ? dayjs(task.updatedAt).format('DD/MM/YYYY HH:mm')
  //           : null,
  //         createdBy: task.createdBy
  //           ? {
  //               id: task.createdBy.id,
  //               name: task.createdBy.name,
  //               email: task.createdBy.emailUser,
  //             }
  //           : null,
  //         updatedBy: task.updatedBy
  //           ? {
  //               id: task.updatedBy.id,
  //               name: task.updatedBy.name,
  //             }
  //           : null,
  //         parent: task.parent || null,
  //       };
  //     }),
  //   );

  //   /* =====================================================
  //    * 5. SORT UI
  //    * ===================================================== */
  //   if (sort && typeof sort === 'object') {
  //     Object.entries(sort).forEach(([field, direction]) => {
  //       if (['assigner', 'director', 'supporter', 'viewer'].includes(field)) {
  //         mappedData.sort((a, b) =>
  //           Number(direction) === -1
  //             ? (b[field] || '').localeCompare(a[field] || '', 'vi')
  //             : (a[field] || '').localeCompare(b[field] || '', 'vi'),
  //         );
  //       }
  //     });
  //   }

  //   return {
  //     data: mappedData,
  //     total,
  //     page: pageNum,
  //     limit: limitNum,
  //     totalPages: Math.ceil(total / limitNum),
  //   };
  // }

  async findAll(queryParams: ListTaskDto, userId?: string) {
    const startedAt = Date.now();
    const timings: Record<string, number> = {};
    const mark = (label: string, from: number) => {
      timings[label] = Date.now() - from;
    };

    const parseStart = Date.now();
    const params = this.findAll_phase1_parseQueryParams(queryParams);
    mark('parseQueryParams', parseStart);

    const contextStart = Date.now();
    const context = await this.findAll_phase2_getUserContext(userId);
    mark('getUserContext', contextStart);

    // Sử dụng Repository mới
    const repoStart = Date.now();
    const { data, total } = await this.taskRepo.findAllTasks(
      queryParams,
      userId,
      context.unitId,
      context.isClerk,
      context.delegatedConfigs,
    );
    mark('taskRepo.findAllTasks', repoStart);

    const phase3Start = Date.now();
    const templateNameMap = await this.findAll_phase3_fetchTemplateNames(data);
    mark('fetchTemplateNames', phase3Start);

    const crmStart = Date.now();
    const crmTitlesBatch = await this.mapCrmTitlesBatch(data);
    mark('mapCrmTitlesBatch', crmStart);

    const phase4Start = Date.now();
    const mappedData = this.findAll_phase4_mapDetails(
      data,
      userId,
      params.typeTask,
      params.isExport,
      templateNameMap,
      crmTitlesBatch,
    );
    mark('mapDetails', phase4Start);

    const sortStart = Date.now();
    this.applyJsTaskSort(mappedData, params.sort);
    mark('applyJsTaskSort', sortStart);

    const childrenStart = Date.now();
    await this.setHasChildrenBatch(mappedData);
    mark('setHasChildrenBatch', childrenStart);

    const totalDuration = Date.now() - startedAt;

    const isKanban = queryParams.viewMode === 'kanban';
    const isMyJob = params.filter?.myJob === true || params.filter?.myJob === 'true' || params.filter?.myDirector === true || params.filter?.myDirector === 'true' || params.filter?.mySupporter === true || params.filter?.mySupporter === 'true';

    return {
      data: isKanban ? mappedData : mappedData.filter((t: any) => !t.parent || Number(t.parent) === 0),
      total,
      page: params.pageNum,
      limit: params.limitNum,
      totalPages: Math.ceil(total / params.limitNum),
      expandTree: isMyJob,
    };
  }

  async getCompanyTasksForDashboard(
    queryParams: ListTaskDto,
    userId?: string,
  ) {
    const params = this.findAll_phase1_parseQueryParams(queryParams);
    const context = await this.findAll_phase2_getUserContext(userId);

    const { data, total } = await this.taskRepo.findAllTasksForDashboard(
      queryParams,
      userId,
      context.unitId,
      context.isClerk,
      context.delegatedConfigs,
      queryParams.type,
    );

    const templateNameMap = await this.findAll_phase3_fetchTemplateNames(data);
    const crmTitlesBatch = await this.mapCrmTitlesBatch(data);

    const mappedData = this.findAll_phase4_mapDetails(
      data,
      userId,
      params.typeTask,
      params.isExport,
      templateNameMap,
      crmTitlesBatch,
    );

    this.applyJsTaskSort(mappedData, params.sort);
    await this.setHasChildrenBatch(mappedData);

    const isKanban = queryParams.viewMode === 'kanban';
    const isMyJob = params.filter?.myJob === true || params.filter?.myJob === 'true' || params.filter?.myDirector === true || params.filter?.myDirector === 'true' || params.filter?.mySupporter === true || params.filter?.mySupporter === 'true';

    return {
      data: isKanban ? mappedData : mappedData.filter((t: any) => !t.parent || Number(t.parent) === 0),
      total,
      page: params.pageNum,
      limit: params.limitNum,
      totalPages: Math.ceil(total / params.limitNum),
      expandTree: isMyJob,
    };
  }


  // HELPER METHODS FOR findAll (PHASES 1 - 4)
  private findAll_phase1_parseQueryParams(queryParams: ListTaskDto) {
    if (queryParams.status === undefined || queryParams.status === null) {
      queryParams.status = 1;
    }
    const {
      page = 1,
      limit = 10,
      status,
      tab,
      typeTask,
      filter,
      sort,
      isExport = false,
    } = queryParams;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    return { pageNum, limitNum, status, tab, typeTask, filter, sort, isExport };
  }

  private async findAll_phase2_getUserContext(userId?: string) {
    let isClerk = false;
    let unitId: string | undefined;
    let delegatedConfigs: TaskAssignmentConfigEntity[] = [];

    if (userId) {
      try {
        const tStart = Date.now();

        const t0 = Date.now();
        const userInfo: any = await this.sqlsvRepo.getUserById(userId);
        unitId = userInfo?.parent?.id;
        const tUserInfo = Date.now() - t0;

        const t1 = Date.now();
        const groups = await this.sqlsvRepo.getUserGroups(userId);
        const vanThuCodes = [GROUP_CODES.VAN_THU, GROUP_CODES.VAN_THU_PHONG, 'VAN_THU', 'VAN_THU_PHONG', 'vtphong', 'vanthutct'];
        if (groups?.some((g) => vanThuCodes.includes(g.code))) {
          isClerk = true;
        }
        const tGroups = Date.now() - t1;

        const t2 = Date.now();
        delegatedConfigs = await this.assignmentConfigService.findAllConfigsByUserId(userId);
        const tDelegated = Date.now() - t2;

        // this.logger.log(`[PERF] findAll_phase2_getUserContext details:
        // - getUserById: ${tUserInfo}ms
        // - getUserGroups: ${tGroups}ms
        // - findAllConfigsByUserId: ${tDelegated}ms
        // - total: ${Date.now() - tStart}ms`);
      } catch (e) {
        this.logger.warn(`Error fetching user info for findAll: ${e.message}`);
      }
    }
    return { isClerk, unitId, delegatedConfigs };
  }

  private async findAll_phase3_fetchTemplateNames(data: any[]) {
    const templateNameMap: Record<string, string> = {};
    const templateIds = [...new Set(data.map((t) => t.templateId).filter(Boolean))];
    if (templateIds.length > 0) {
      try {
        const templates = await this.dataSource.manager.find(ProcessTemplateEntity, {
          where: [
            { id: In(templateIds) },
            { code: In(templateIds) }
          ],
          select: ['id', 'code', 'name']
        });
        templates.forEach(t => {
          templateNameMap[t.id] = t.name;
          templateNameMap[t.code] = t.name;
        });
      } catch (e) {
        this.logger.error('Error fetching template names', e);
      }
    }
    return templateNameMap;
  }

  private findAll_phase4_mapDetails(
    data: any[],
    userId: string | undefined,
    typeTask: string | undefined,
    isExport: any,
    templateNameMap: Record<string, string>,
    crmTitlesBatch: Record<string, any>,
  ) {
    const parentMap = new Map(data.map((p) => [p.id, p]));
    return data.map((task) => {
      const { isApprovalRequired, ...safeTask } = task as any;
      const progressView = buildProgressView(task);
      const { assigner, director, supporter, viewer, directorDep } = this.mapTaskUsers(
        task.taskUsers || [],
      );
      const crmMappedValues = crmTitlesBatch[task.id] || {};

      const parentTask = task.parent
        ? parentMap.get(task.parent as number)
        : undefined;

      const taskProjectId = Number((task as any).projectId ?? (task as any).project?.id);
      const isLevelOneProjectTask =
        typeTask === TASK_TYPE.PROJECT &&
        !!taskProjectId &&
        (!task.parent || Number(task.parent) === 0 || Number(task.parent) === taskProjectId);
      const projectStartDate = isLevelOneProjectTask ? (task as any).project?.startDate ?? null : null;
      const projectEndDate = isLevelOneProjectTask ? (task as any).project?.endDate ?? null : null;

      const { formattedStartDate, formattedEndDate, startDateTooltip, endDateTooltip } =
        this.validateTaskDates(task, parentTask, projectStartDate, projectEndDate);

      const startDate = isExport === 'true'
        ? (task.startDate ? dayjs(task.startDate).format('DD/MM/YYYY') : null)
        : formattedStartDate;

      const endDate = isExport === 'true'
        ? (task.endDate ? dayjs(task.endDate).format('DD/MM/YYYY') : null)
        : formattedEndDate;

      return {
        ...task,
        topic: crmMappedValues.topic,
        flag:
          crmMappedValues.priority === 'Gấp' ? RED_FLAG_SVG : WHITE_FLAG_SVG,
        priority: crmMappedValues.priority,
        assigner,
        director,
        supporter,
        viewer,
        progress: task.progress,
        typeTask: task.typeTask,
        typeTaskText: this.TYPE_TASK_VN[task.typeTask],
        templateName: task.templateId ? (templateNameMap[task.templateId] || task.templateId) : null,
        processName: task.templateId ? (templateNameMap[task.templateId] || task.templateId) : null,
        processStatusUi:
          isExport === 'true'
            ? this.mapProcessStatus(task.processStatus) // TEXT
            : this.mapProcessStatusToHtml(task.processStatus), // HTML

        progressView:
          isExport === 'true'
            ? progressView.rawText // TEXT
            : progressView.html,
        progressColor: progressView.color,
        isDeadlineExceeded: progressView.isDeadlineExceeded,
        startDate,
        endDate,
        startDateTooltip,
        endDateTooltip,
        startDateNotHTML: task.startDate
          ? dayjs(task.startDate).format('DD/MM/YYYY')
          : null,

        endDateNotHTML: task.endDate
          ? dayjs(task.endDate).format('DD/MM/YYYY')
          : null,
        startDateISO: task.startDate ? new Date(task.startDate).toISOString() : null,
        endDateISO: task.endDate ? new Date(task.endDate).toISOString() : null,
        projectStartDate,
        projectEndDate,
        deadlineStartParent: projectStartDate
          ? dayjs(projectStartDate).toISOString()
          : null,

        deadlineEndParent: projectEndDate
          ? dayjs(projectEndDate).toISOString()
          : null,
        createdAt: dayjs(task.createdAt).format('DD/MM/YYYY HH:mm'),
        updatedAt: task.updatedAt
          ? dayjs(task.updatedAt).format('DD/MM/YYYY HH:mm')
          : null,
        createdBy: task.createdBy
          ? {
            id: task.createdBy.id,
            name: task.createdBy.name,
            email: task.createdBy.emailUser,
          }
          : null,
        updatedBy: task.updatedBy
          ? { id: task.updatedBy.id, name: task.updatedBy.name }
          : null,
        parentDirector: directorDep || task.parent || null,
        flags: {
          ...(task.flags || {}),
          isAssigner:
            ['1', '2'].includes(String(task.processStatus)) &&
            !!userId &&
            !!task.taskUsers?.some(
              (taskUser) =>
                taskUser.role === 'assigner' &&
                (taskUser.processId === userId || taskUser.user?.id === userId),
            ),
          hideAdd:
            [3, 4].includes(Number(task.project?.projectStatus)) ? false :
              typeTask === TASK_TYPE.PROJECT
                ? !!userId &&
                !!task.taskUsers?.some(
                  (taskUser) =>
                    taskUser.role === 'director' &&
                    (taskUser.processId === userId || taskUser.user?.id === userId),
                )
                : (task.flags || {}).hideAdd,
        },
      };
    });
  }

  async findAllFormDoc(queryParams: ListTaskDto, userId?: string) {
    const t0 = Date.now();
    this.logger.log(`[findAllFormDoc] Starting... userId: ${userId}`);
    // Phase 1: Parse & Initialize
    const params = this.phase1_parseQueryParams(queryParams);
    const t1 = Date.now();

    // Phase 2: Get Context & Feature Config
    this.logger.log(`[findAllFormDoc] Getting user context...`);
    const context = await this.phase2_getUserContext(userId);
    const t2 = Date.now();

    // Phase 6: Execute SQL Queries
    this.logger.log(`[findAllFormDoc] Executing taskRepo.findAllFormDoc...`);
    // Sử dụng Repository mới
    const queryResult = await this.taskRepo.findAllFormDoc(
      queryParams,
      userId,
      false, // isSelectFormDoc
      context.unitId,
      context.isClerk,
      context.delegatedConfigs,
    );
    const t3 = Date.now();

    // Phase 8: Map Details & Return
    this.logger.log(`[findAllFormDoc] Mapping details (records: ${queryResult?.data?.length})...`);
    const res = await this.phase8_mapDetailsAndReturn(queryResult, params, userId);
    const t4 = Date.now();

    this.logger.log(`[PERF] findAllFormDoc measurements:
    - Phase 1 (Parse Params): ${t1 - t0}ms
    - Phase 2 (User Context): ${t2 - t1}ms
    - Phase 6 (Execute SQL Repo): ${t3 - t2}ms
    - Phase 8 (Map Details): ${t4 - t3}ms
    - Total Time: ${t4 - t0}ms`);

    return res;
  }

  // =========================================================================
  // HELPER METHODS FOR findAllFormDoc (PHASES 1 - 8)
  // =========================================================================

  private phase1_parseQueryParams(queryParams: ListTaskDto) {
    if (queryParams.status === undefined || queryParams.status === null) {
      queryParams.status = 1;
    }
    const {
      page = 1,
      limit = 10,
      status,
      tab,
      typeTask,
      filter,
      sort,
      isExport = 'false',
      viewMode,
    } = queryParams;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    return { pageNum, limitNum, isExport, sort, tab, typeTask, filter, status, viewMode };
  }

  private async phase2_getUserContext(userId?: string) {
    let isClerk = false;
    let unitId: string | undefined;
    let delegatedConfigs: TaskAssignmentConfigEntity[] = [];

    if (userId) {
      try {
        const tStart = Date.now();
        let tUserInfo = 0, tGroups = 0, tDelegated = 0;

        const [userInfo, groups, configs] = await Promise.all([
          (async () => {
            const ts = Date.now();
            const res = await this.sqlsvRepo.getUserById(userId);
            tUserInfo = Date.now() - ts;
            return res;
          })(),
          (async () => {
            const ts = Date.now();
            const res = await this.sqlsvRepo.getUserGroups(userId);
            tGroups = Date.now() - ts;
            return res;
          })(),
          (async () => {
            const ts = Date.now();
            const res = await this.assignmentConfigService.findAllConfigsByUserId(userId);
            tDelegated = Date.now() - ts;
            return res;
          })(),
        ]);

        delegatedConfigs = configs;
        unitId = userInfo?.parent?.id;

        const vanThuCodes = [GROUP_CODES.VAN_THU, GROUP_CODES.VAN_THU_PHONG, 'VAN_THU', 'VAN_THU_PHONG', 'vtphong', 'vanthutct'];
        if (groups?.some((g) => vanThuCodes.includes(g.code))) {
          isClerk = true;
        }

        this.logger.log(`[PERF] findAllFormDoc Phase 2 details:
        - getUserById: ${tUserInfo}ms
        - getUserGroups: ${tGroups}ms
        - findAllConfigsByUserId: ${tDelegated}ms
        - Promise.all total: ${Date.now() - tStart}ms`);
      } catch (e) {
        this.logger.warn(`Error fetching user info for findAllFormDoc context: ${e.message}`);
      }
    }
    return { isClerk, unitId, delegatedConfigs };
  }

  private phase3_buildCriteria(filter: any) {
    return filter || {};
  }

  private phase4_buildQueryConditions(filters: any, tab?: string | TaskTab) {
    return { filters, tab };
  }

  private phase5_buildSelectAndSort(sort: any) {
    return sort;
  }

  private async phase7_loadBpmnAndCache() {
    return null; // Trống / chừa sẵn không gian cho quy trình BPMN nếu nâng cấp sau này
  }

  private async phase8_fetchIncomingDocs(uniqueDocIds: string[]) {
    const docMap = new Map<string, { toBook: string; documentDate: string; abstractNote: string, documentType: string }>();
    if (uniqueDocIds.length > 0) {
      const qb = this.dataSource
        .createQueryBuilder()
        .select(['document_id', 'to_book', 'document_date', 'abstract_note', 'document_type'])
        .from('incomming_documents', 'idoc');

      if (uniqueDocIds.length > 1800) {
        qb.where(
          `idoc.document_id IN (
            SELECT value
            FROM OPENJSON(:docIdsJson)
          )`,
          { docIdsJson: JSON.stringify(uniqueDocIds) },
        );
      } else {
        qb.where('idoc.document_id IN (:...docIds)', { docIds: uniqueDocIds });
      }

      const incomingDocuments = await qb.getRawMany();
      for (const doc of incomingDocuments) {
        docMap.set(String(doc.document_id), {
          toBook: doc.to_book,
          documentDate: doc.document_date,
          abstractNote: doc.abstract_note,
          documentType: doc.document_type
        });
      }
    }
    return docMap;
  }

  private async fetchLatestSlowReasonMap(taskIds: Array<string | number>) {
    const normalizedIds = [...new Set(
      taskIds
        .map((id) => String(id ?? '').trim())
        .filter(Boolean),
    )];

    const slowReasonMap = new Map<string, string>();
    if (normalizedIds.length === 0) {
      return slowReasonMap;
    }

    try {
      const query = normalizedIds.length > 1800
        ? `
          SELECT document_id, content
          FROM (
            SELECT
              document_id,
              content,
              ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY created_at DESC) AS rn
            FROM document_comments
            WHERE type = 'slowReason'
              AND document_id IN (SELECT value FROM OPENJSON(@0))
          ) t
          WHERE rn = 1
        `
        : `
          SELECT document_id, content
          FROM (
            SELECT
              document_id,
              content,
              ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY created_at DESC) AS rn
            FROM document_comments
            WHERE type = 'slowReason'
              AND document_id IN (${normalizedIds.map((_, idx) => `@${idx}`).join(',')})
          ) t
          WHERE rn = 1
        `;

      const params = normalizedIds.length > 1800
        ? [JSON.stringify(normalizedIds)]
        : normalizedIds;

      const rows = await this.dataSource.query(query, params);
      rows.forEach((row: any) => {
        slowReasonMap.set(String(row.document_id), row.content);
      });
    } catch (e) {
      return slowReasonMap;
    }

    return slowReasonMap;
  }

  private phase8_mapSingleTask(
    task: any,
    docMap: Map<string, { toBook: string; documentDate: string; abstractNote: string, documentType: string }>,
    crmTitlesBatch: any,
    isExport: string,
    userId?: string
  ) {
    const { isApprovalRequired, ...safeTask } = task as any;
    const progressView = buildProgressView(task);
    const { assigner, director, supporter, viewer, directorDep } = this.mapTaskUsers(
      task.taskUsers || [],
    );
    const crmMappedValues = crmTitlesBatch[task.id] || {};
    const taskDocIds = task.docId?.split(',').filter(Boolean) || [];
    type DocInfo = { toBook: string; documentDate: string; abstractNote: string, documentType: string };
    const docInfos = taskDocIds
      .map((id) => docMap.get(id))
      .filter((d): d is DocInfo => d !== undefined);

    const toBooks = docInfos
      .map((d) => d.toBook)
      .filter(Boolean)
      .join(', ');

    const documentDates = docInfos
      .map((d) =>
        d.documentDate ? dayjs(d.documentDate).format('DD/MM/YYYY') : null,
      )
      .filter(Boolean)
      .join(', ');
    const abstractNote = docInfos
      .map((d) => d.abstractNote)
      .filter(Boolean)
      .join(', ');

    const processStatusUi =
      isExport === 'true'
        ? {
          processStatusUi: this.mapProcessStatus(task.processStatus),
          progressView: progressView.rawText,
          progressColor: progressView.color,
          isDeadlineExceeded: progressView.isDeadlineExceeded,
        }
        : {
          processStatusUi: this.mapProcessStatusToHtml(
            task.processStatus,
          ),
          progressView: progressView.html,
          isDeadlineExceeded: progressView.isDeadlineExceeded,
          progressColor: progressView.color,
        };

    const flagSvg = crmMappedValues.priority === 'Gấp' ? RED_FLAG_SVG : WHITE_FLAG_SVG;
    const mapDataFinal = {
      toBook: toBooks || null,
      documentDate: documentDates || null,
      abstractNote,
      documentType: crmMappedValues.documentType,
      summary: [toBooks, abstractNote].filter(Boolean).join(' - '),
      flag: flagSvg,
      priority: crmMappedValues.priority,
      assigner,
      director,
      supporter,
      viewer,

      startDate: task.startDate
        ? dayjs(task.startDate).format('DD/MM/YYYY')
        : null,
      endDate: task.endDate
        ? dayjs(task.endDate).format('DD/MM/YYYY')
        : null,
      startDateISO: task.startDate ? new Date(task.startDate).toISOString() : null,
      endDateISO: task.endDate ? new Date(task.endDate).toISOString() : null,

      createdAt: dayjs(task.createdAt).format('DD/MM/YYYY HH:mm'),
      updatedAt: task.updatedAt
        ? dayjs(task.updatedAt).format('DD/MM/YYYY HH:mm')
        : null,
      createdBy: task.createdBy
        ? {
          id: task.createdBy.id,
          name: task.createdBy.name,
          email: task.createdBy.emailUser,
        }
        : null,
      updatedBy: task.updatedBy
        ? { id: task.updatedBy.id, name: task.updatedBy.name }
        : null,
      parentDirector: directorDep || task.parent || null,
      typeTask: task.typeTask,
      note: task.note,
      typeTaskText: this.TYPE_TASK_VN[task.typeTask],
      flags: {
        ...(task.flags || {}),
        isAssigner:
          ['1', '2'].includes(String(task.processStatus)) &&
          !!userId &&
          !!task.taskUsers?.some(
            (taskUser) =>
              taskUser.role === 'assigner' &&
              (taskUser.processId === userId || taskUser.user?.id === userId),
          ),
      },
    };
    return {
      ...safeTask,
      ...mapDataFinal,
      ...processStatusUi,
    };
  }

  private async phase8_mapDetailsAndReturn(
    queryResult: { data: any[]; total: number; totalRoot: number },
    params: { pageNum: number; limitNum: number; isExport: string; sort: any; viewMode?: string },
    userId?: string,
    bpmnCache?: any
  ) {
    const { data, total: totalCount, totalRoot } = queryResult;
    const { pageNum, limitNum, isExport, sort, viewMode } = params;

    const allDocIds = data.flatMap((task) =>
      task.docId ? task.docId.split(',').filter(Boolean) : [],
    );
    const uniqueDocIds = [...new Set(allDocIds)];
    const docMap = await this.phase8_fetchIncomingDocs(uniqueDocIds);
    const slowReasonMap = await this.fetchLatestSlowReasonMap(data.map((task) => task.id));

    data.forEach((task: any) => {
      task.slowReason = slowReasonMap.get(String(task.id)) || null;
    });

    // Fetch CRM titles in batch
    data.forEach((task: any) => {
      const taskDocIds = task.docId?.split(',').filter(Boolean) || [];
      const types = taskDocIds
        .map((id) => docMap.get(String(id.trim()))?.documentType)
        .filter(Boolean);

      if (types.length > 0) {
        task.documentType = [...new Set(types)].join(',');
      }
    });

    const crmTitlesBatch = await this.mapCrmTitlesBatch(data);

    const mappedData = data.map((task) =>
      this.phase8_mapSingleTask(task, docMap, crmTitlesBatch, isExport, userId)
    );

    await this.setHasChildrenBatch(mappedData);

    const filteredData = mappedData.map((item: any) => {
      const hasChildren = !!item?.flags?.hasChildren;
      return {
        ...item,
        children: null,
        isChildren: hasChildren,
        ischhilden: hasChildren,
      };
    });

    this.applyJsTaskSort(filteredData, sort);

    const finalTotal = totalRoot !== undefined ? totalRoot : totalCount;

    const isKanban = viewMode === 'kanban';

    return {
      data: isKanban ? filteredData : filteredData.filter((t: any) => !t.parent || Number(t.parent) === 0),
      total: finalTotal,
      totalRoot: finalTotal,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(finalTotal / limitNum),
      totalPagesRoot: Math.ceil(finalTotal / limitNum),
    };
  }

  async findAllSelectFormDoc(queryParams: ListTaskDto, userId?: string) {
    const startedAt = Date.now();
    const timings: Record<string, number> = {};
    const mark = (label: string, from: number) => {
      timings[label] = Date.now() - from;
    };

    const qp: any = queryParams as any;
    if (!queryParams.filter || typeof queryParams.filter !== 'object') {
      queryParams.filter = {} as any;
    }
    if (typeof qp.filter === 'string') {
      try {
        queryParams.filter = JSON.parse(qp.filter);
      } catch {
        queryParams.filter = {} as any;
      }
    }
    const flatName = qp['filter[name]'];
    const flatCode = qp['filter[code]'];
    if (flatName && !(queryParams.filter as any).name) {
      (queryParams.filter as any).name = flatName;
    }
    if (flatCode && !(queryParams.filter as any).code) {
      (queryParams.filter as any).code = flatCode;
    }

    if (queryParams.status === undefined || queryParams.status === null) {
      queryParams.status = 1;
    }
    const {
      page = 1,
      limit = 10,
      status,
      tab,
      typeTask,
      filter,
      sort,
      isExport = 'false',
    } = queryParams;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    // Kiểm tra user có phải là văn thư không và lấy unitId
    const contextStart = Date.now();
    let isClerk = false;
    let unitId: string | undefined;

    if (userId) {
      try {
        const userInfo: any = await this.sqlsvRepo.getUserById(userId);
        unitId = userInfo?.parent?.id;

        const groups = await this.sqlsvRepo.getUserGroups(userId);
        const vanThuCodes = [GROUP_CODES.VAN_THU, GROUP_CODES.VAN_THU_PHONG, 'VAN_THU', 'VAN_THU_PHONG', 'vtphong', 'vanthutct'];
        if (groups?.some((g) => vanThuCodes.includes(g.code))) {
          isClerk = true;
        }
      } catch (e) {
        this.logger.warn(`Error fetching user info for findAllSelectFormDoc: ${e.message}`);
      }
    }
    mark('getUserContext', contextStart);

    // Sử dụng Repository mới với cờ isSelectFormDoc = true
    const repoStart = Date.now();
    const { data, total: totalCount, totalRoot } = await this.taskRepo.findAllFormDoc(
      queryParams,
      userId,
      true,
      unitId,
      isClerk,
    );
    mark('taskRepo.findAllFormDoc', repoStart);

    // const docIds = data.map((task) => task.docId).filter(Boolean);
    // const docMap = new Map<string, { toBook: string; documentDate: string }>();

    // if (docIds.length > 0) {
    //       const incomingDocuments = await this.dataSource
    //         .createQueryBuilder()
    //         .select(['document_id', 'to_book','document_date'])
    //         .from('incomming_documents', 'idoc')
    //         // .where('idoc.document_id IN (:...docIds)', { docIds })
    //         .where('CAST(idoc.document_id AS BIGINT) IN (:...docIds)', { docIds })
    //         .getRawMany();
    //     for (const doc of incomingDocuments) {
    //     docMap.set(doc.document_id, {
    //       toBook: doc.to_book,
    //       documentDate: doc.document_date,
    //     });
    //   }
    // }

    const crmStart = Date.now();
    // [New] Fetch CRM titles in batch
    const crmTitlesBatch = await this.mapCrmTitlesBatch(data);
    mark('mapCrmTitlesBatch', crmStart);

    const mapStart = Date.now();
    const mappedData = data.map((task) => {
      const progressView = buildProgressView(task);
      const { assigner, director, supporter, viewer, directorDep } = this.mapTaskUsers(
        task.taskUsers || [],
      );
      const crmMappedValues = crmTitlesBatch[task.id] || {};
      //  const docInfo = task.docId ? docMap.get(task.docId) : null;
      let processStatusUi = {};
      if (isExport !== 'true') {
        processStatusUi = {
          processStatusUi: this.mapProcessStatusToHtml(task.processStatus),
          progressView: progressView.html,
          progressColor: progressView.color,
          isDeadlineExceeded: progressView.isDeadlineExceeded,
        };
      } else {
        processStatusUi = {
          progressColor: progressView.color,
          isDeadlineExceeded: progressView.isDeadlineExceeded,
        };
      }
      const flagSvg = crmMappedValues.priority === 'Gấp' ? RED_FLAG_SVG : WHITE_FLAG_SVG;
      const mapDataFinal = {
        // processStatus: this.mapProcessStatus(task.processStatus),
        // toBook: docInfo?.toBook || null,
        // documentDate: docInfo?.documentDate || null, // <-- thêm trường mới

        // processStatus: this.mapProcessStatus(task.processStatus),
        flag: flagSvg,
        name: `${flagSvg} ${task.name}`,
        assigner,
        director,
        supporter,
        viewer,

        startDate: task.startDate
          ? dayjs(task.startDate).format('DD/MM/YYYY')
          : null,
        endDate: task.endDate
          ? dayjs(task.endDate).format('DD/MM/YYYY')
          : null,
        // ✅ Thêm trường ISO format
        startDateISO: task.startDate ? new Date(task.startDate).toISOString() : null,
        endDateISO: task.endDate ? new Date(task.endDate).toISOString() : null,
        createdAt: dayjs(task.createdAt).format('DD/MM/YYYY HH:mm'),
        updatedAt: task.updatedAt
          ? dayjs(task.updatedAt).format('DD/MM/YYYY HH:mm')
          : null,
        createdBy: task.createdBy
          ? {
            id: task.createdBy.id,
            name: task.createdBy.name,
            email: task.createdBy.emailUser,
          }
          : null,
        updatedBy: task.updatedBy
          ? { id: task.updatedBy.id, name: task.updatedBy.name }
          : null,
        parentDirector: directorDep || task.parent || null,
      };
      return {
        ...task,
        ...mapDataFinal,
        ...processStatusUi,
      };
    });
    if (sort && typeof sort === 'object') {
      Object.entries(sort).forEach(([field, direction]) => {
        if (['assigner', 'director', 'supporter', 'viewer'].includes(field)) {
          mappedData.sort((a, b) => {
            const aVal = a[field] || '';
            const bVal = b[field] || '';

            return Number(direction) === -1
              ? bVal.localeCompare(aVal, 'vi')
              : aVal.localeCompare(bVal, 'vi');
          });
        }
      });
    }
    mark('mapAndSort', mapStart);

    const totalDuration = Date.now() - startedAt;
    this.logger.log(`[findAllSelectFormDoc] Finished. Total time: ${totalDuration}ms. Timings: ${JSON.stringify(timings)}`);

    return {
      data: mappedData,
      total: totalCount,
      totalRoot: totalRoot ?? totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      totalPagesRoot: Math.ceil((totalRoot ?? totalCount) / limitNum),
    };
  }

  async findAllMeeting(queryParams: ListTaskDto, userId?: string) {
    const t0 = Date.now();
    this.logger.log(`[findAllMeeting] Starting... userId: ${userId}`);
    const params = this.findAllMeeting_phase1_parseQueryParams(queryParams);
    const t1 = Date.now();

    this.logger.log(`[findAllMeeting] Getting user context...`);
    const context = await this.findAllMeeting_phase2_getUserContext(userId);
    const t2 = Date.now();

    this.logger.log(`[findAllMeeting] Executing taskRepo.findAllMeetingTasks...`);
    const { data, totalCount } = await this.findAllMeeting_phase3_fetchData(
      queryParams,
      userId,
      context,
      params,
    );
    const t3 = Date.now();

    this.logger.log(`[findAllMeeting] Fetching related data (records: ${data?.length})...`);
    const { meetingMap, conclusionMap } = await this.findAllMeeting_phase4_fetchRelatedData(data);
    const t4 = Date.now();

    this.logger.log(`[findAllMeeting] Mapping details...`);
    const mappedData = await this.findAllMeeting_phase5_mapDetails(
      data,
      userId,
      params.isExport,
      meetingMap,
      conclusionMap,
    );
    const t5 = Date.now();

    this.logger.log(`[findAllMeeting] Setting children batch...`);
    await this.setHasChildrenBatch(mappedData);
    const t6 = Date.now();
    this.applyJsTaskSort(mappedData, params.sort);
    const t7 = Date.now();

    // this.logger.log(`[PERF] findAllMeeting measurements:
    // - Phase 1 (Parse Params): ${t1 - t0}ms
    // - Phase 2 (User Context): ${t2 - t1}ms
    // - Phase 3 (Fetch Data Repo): ${t3 - t2}ms
    // - Phase 4 (Fetch Related): ${t4 - t3}ms
    // - Phase 5 (Map Details): ${t5 - t4}ms
    // - Phase 6 (Set Has Children): ${t6 - t5}ms
    // - Phase 7 (Sort & Finalize): ${t7 - t6}ms
    // - Total Time: ${t7 - t0}ms`);

    const isKanban = queryParams.viewMode === 'kanban';

    return {
      data: isKanban ? mappedData : mappedData.filter((t: any) => !t.parent || Number(t.parent) === 0),
      total: totalCount,
      page: params.pageNum,
      limit: params.limitNum,
      totalPages: Math.ceil(totalCount / params.limitNum),
    };
  }

  private findAllMeeting_phase1_parseQueryParams(queryParams: ListTaskDto) {
    if (queryParams.status === undefined || queryParams.status === null) {
      queryParams.status = 1;
    }
    const {
      page = 1,
      limit = 10,
      status,
      tab,
      typeTask,
      filter,
      sort,
      isExport = 'false',
    } = queryParams;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    return { pageNum, limitNum, status, tab, typeTask, filter, sort, isExport };
  }

  private async findAllMeeting_phase2_getUserContext(userId?: string) {
    let isClerk = false;
    let unitId: string | undefined;
    let isManager = false;
    let managedUnitIds: string[] = [];
    let delegatedConfigs: TaskAssignmentConfigEntity[] = [];

    if (userId) {
      try {
        const tStart = Date.now();
        let tUserInfo = 0, tGroups = 0, tDelegated = 0;

        const [userInfo, groups, configs] = await Promise.all([
          (async () => {
            const ts = Date.now();
            const res = await this.sqlsvRepo.getUserById(userId);
            tUserInfo = Date.now() - ts;
            return res;
          })(),
          (async () => {
            const ts = Date.now();
            const res = await this.sqlsvRepo.getUserGroups(userId);
            tGroups = Date.now() - ts;
            return res;
          })(),
          (async () => {
            const ts = Date.now();
            const res = await this.assignmentConfigService.findAllConfigsByUserId(userId);
            tDelegated = Date.now() - ts;
            return res;
          })(),
        ]);

        delegatedConfigs = configs;
        unitId = userInfo?.parent?.id;

        const groupCodes = (groups || []).map(g => g.code);

        const vanThuCodes = [GROUP_CODES.VAN_THU, GROUP_CODES.VAN_THU_PHONG, 'VAN_THU', 'VAN_THU_PHONG', 'vtphong', 'vanthutct'];
        if (groupCodes.some((code: string) => vanThuCodes.includes(code))) {
          isClerk = true;
        }

        const isDeptHead = groupCodes.includes(GROUP_CODES.TRUONG_PHONG) || groupCodes.includes(GROUP_CODES.PHO_TRUONG_PHONG);
        const isDivHead = groupCodes.includes(GROUP_CODES.TRUONG_BAN);
        isManager = isDeptHead || isDivHead;

        if (isManager && unitId) {
          managedUnitIds = [unitId];
        }

        this.logger.log(`[PERF] Phase 2 details:
        - getUserById: ${tUserInfo}ms
        - getUserGroups: ${tGroups}ms
        - findAllConfigsByUserId: ${tDelegated}ms
        - Promise.all total: ${Date.now() - tStart}ms`);
      } catch (e) {
        this.logger.warn(`Error fetching user info for findAllMeeting: ${e.message}`);
      }
    }

    return { isClerk, unitId, isManager, managedUnitIds, delegatedConfigs };
  }

  private async findAllMeeting_phase3_fetchData(
    queryParams: ListTaskDto,
    userId: string | undefined,
    context: any,
    params: any,
  ) {
    return this.taskRepo.findAllMeetingTasks(
      queryParams,
      userId,
      context.unitId,
      context.isClerk,
      context.delegatedConfigs,
      context.isManager,
      context.managedUnitIds,
    );
  }

  private async findAllMeeting_phase4_fetchRelatedData(data: any[]) {
    const meetingIds = data.map((t) => t.meetingId).filter(Boolean);
    const uniqueMeetingIds = [...new Set(meetingIds)];
    const meetingMap = new Map<string, { title: string; meetingDate: Date | null; meetingTime: string | null }>();

    if (uniqueMeetingIds.length > 0) {
      const meetings = await this.dataSource
        .createQueryBuilder()
        .select(['id', 'title', 'meeting_date', 'meeting_time'])
        .from('meetings', 'm')
        .where(
          uniqueMeetingIds.length > 1800
            ? `m.id IN (SELECT CAST(value AS VARCHAR) FROM OPENJSON(:idsJson))`
            : 'm.id IN (:...ids)',
          uniqueMeetingIds.length > 1800
            ? { idsJson: JSON.stringify(uniqueMeetingIds) }
            : { ids: uniqueMeetingIds }
        )
        .getRawMany();

      for (const m of meetings) {
        meetingMap.set(String(m.id), {
          title: m.title,
          meetingDate: m.meeting_date,
          meetingTime: m.meeting_time
        });
      }
    }

    const conclusionIds = data.map((t) => t.meetingConclusionId).filter(Boolean);
    const uniqueConclusionIds = [...new Set(conclusionIds)];
    const conclusionMap = new Map<string, { content: string; meetingId: string }>();

    if (uniqueConclusionIds.length > 0) {
      const conclusions = await this.dataSource
        .createQueryBuilder()
        .select(['id', 'content', 'meeting_id'])
        .from('meeting_conclusions', 'mc')
        .where(
          uniqueConclusionIds.length > 1800
            ? `mc.id IN (SELECT CAST(value AS VARCHAR) FROM OPENJSON(:idsJson))`
            : 'mc.id IN (:...ids)',
          uniqueConclusionIds.length > 1800
            ? { idsJson: JSON.stringify(uniqueConclusionIds) }
            : { ids: uniqueConclusionIds }
        )
        .getRawMany();

      for (const c of conclusions) {
        conclusionMap.set(String(c.id), { content: c.content, meetingId: c.meeting_id });
      }
    }

    return { meetingMap, conclusionMap };
  }

  private async findAllMeeting_phase5_mapDetails(
    data: any[],
    userId: string | undefined,
    isExport: string,
    meetingMap: Map<string, any>,
    conclusionMap: Map<string, any>,
  ) {
    const slowReasonMap = await this.fetchLatestSlowReasonMap(data.map((task) => task.id));
    data.forEach((task: any) => {
      task.slowReason = slowReasonMap.get(String(task.id)) || null;
    });

    const crmTitlesBatch = await this.mapCrmTitlesBatch(data);

    return Promise.all(
      data.map(async (task) => {
        const progressView = await buildProgressView(task);
        const { assigner, director, supporter, viewer, directorDep } = this.mapTaskUsers(
          task.taskUsers || [],
        );
        const crmMappedValues = crmTitlesBatch[task.id] || {};

        const meetingInfo = task.meetingId
          ? meetingMap.get(task.meetingId)
          : null;

        const conclusionInfo = task.meetingConclusionId
          ? conclusionMap.get(String(task.meetingConclusionId))
          : null;

        const processStatusUi =
          isExport === 'true'
            ? {
              processStatusUi: this.mapProcessStatus(task.processStatus),
              progressView: progressView.rawText,
              progressColor: progressView.color,
              isDeadlineExceeded: progressView.isDeadlineExceeded,
            }
            : {
              processStatusUi: this.mapProcessStatusToHtml(
                task.processStatus,
              ),
              progressView: progressView.html,
              progressColor: progressView.color,
              isDeadlineExceeded: progressView.isDeadlineExceeded,
            };

        return {
          ...task,
          meetingTitle: meetingInfo?.title || null,
          meetingDate: meetingInfo?.meetingDate
            ? dayjs(meetingInfo.meetingDate).format('DD/MM/YYYY')
            : null,
          meetingTime: meetingInfo?.meetingTime || null,
          titleMeeting: (() => {
            if (!meetingInfo?.title) return null;
            const meetingDateStr = meetingInfo.meetingDate
              ? dayjs(meetingInfo.meetingDate).format('DD/MM/YYYY')
              : '';
            const titleWithDate = meetingDateStr
              ? `${meetingInfo.title} - ${meetingDateStr}`
              : meetingInfo.title;
            return task.typeTaskMeeting === 'conclusion'
              ? `Kết luận - ${titleWithDate}`
              : titleWithDate;
          })(),
          meetingConclusionId: task.meetingConclusionId || null,
          conclusionContent: conclusionInfo?.content || null,
          typeTaskMeeting: task.typeTaskMeeting || null,
          flag:
            crmMappedValues.priority === 'Gấp' || crmMappedValues.priority === 'gap' ? RED_FLAG_SVG : WHITE_FLAG_SVG,
          startDate: task.startDate
            ? dayjs(task.startDate).format('DD/MM/YYYY')
            : null,
          endDate: task.endDate
            ? dayjs(task.endDate).format('DD/MM/YYYY')
            : null,
          startDateISO: task.startDate ? new Date(task.startDate).toISOString() : null,
          endDateISO: task.endDate ? new Date(task.endDate).toISOString() : null,
          createdAt: dayjs(task.createdAt).format('DD/MM/YYYY HH:mm'),
          updatedAt: task.updatedAt
            ? dayjs(task.updatedAt).format('DD/MM/YYYY HH:mm')
            : null,
          ...(() => {
            const result = { assigners: [], directors: [], supporters: [], viewers: [] };
            for (const tu of task.taskUsers ?? []) {
              let formattedName = tu.processName || tu.user?.name || '';
              if (tu.user?.parent?.name) {
                formattedName = `${formattedName} - ${tu.user.parent.name}`;
              }
              const item = {
                processId: tu.processId,
                name: formattedName,
                type: tu.type,
              };
              if (result[`${tu.role}s`]) {
                result[`${tu.role}s`].push(item);
              }
            }
            return result;
          })(),
          assigner,
          director,
          supporter,
          viewer,
          parentDirector: directorDep || task.parent || null,
          ...processStatusUi,
          typeTask: task.typeTask,
          typeTaskText: this.TYPE_TASK_VN[task.typeTask],

          flags: {
            ...((task as any).flags || {}),
            isAssigner:
              ['1', '2'].includes(String(task.processStatus)) &&
              !!userId &&
              !!task.taskUsers?.some(
                (taskUser) =>
                  taskUser.role === 'assigner' &&
                  (taskUser.processId === userId || taskUser.user?.id === userId),
              ),
            hideDelete: (
              !!userId &&
              (task.createdBy?.id === userId ||
                (task.taskUsers &&
                  task.taskUsers.some(
                    (taskUser) =>
                      taskUser.processId === userId && taskUser.role === 'assigner',
                  ))) &&
              task.processStatus === '1'
            ),
            hideAdd:
              [3, 4].includes(Number(task.project?.projectStatus)) ? false :
                task.endDate && new Date() > new Date(task.endDate) && task.processStatus !== '4' ? false :
                  (!['4', '8', '3'].includes(task.processStatus) ||
                    (!!userId &&
                      task.taskUsers &&
                      task.taskUsers.some(
                        (tu) => tu.processId === userId && tu.role === 'viewer',
                      ))),
            isAssignWork:
              !!userId &&
              (task.createdBy?.id === userId ||
                (task.taskUsers &&
                  task.taskUsers.some(
                    (taskUser) =>
                      taskUser.processId === userId && taskUser.role === 'assigner',
                  ))) &&
              ['1', '2', '6'].includes(task.processStatus),
          },
        };
      }),
    );
  }

  async findTasksByMeetingRecord(queryParams: ListTaskDto, userId?: string) {
    const {
      page = 1,
      limit = 10,
      status,
      tab,
      typeTask,
      filter,
      sort,
      isExport = 'false',
      meetingId,
      meetingConclusionId,
    } = queryParams;

    const SORTABLE_FIELDS = [
      'name',
      'progress',
      'assigner',
      'director',
      'supporter',
      'viewer',
      'processStatus',
      'createdAt',
      'updatedAt',
      'startDate',
      'endDate',
    ];

    const SORT_FIELD_MAP: Record<string, string> = {
      name: 'task.name',
      progress: 'task.progress',
      processStatus: 'task.processStatus',
      createdAt: 'task.createdAt',
      updatedAt: 'task.updatedAt',
      startDate: 'task.startDate',
      endDate: 'task.endDate',
    };

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const qb = this.taskRepository.createQueryBuilder('task');
    const { name } = filter || {};

    /* ================= FILTER ================= */
    if (name) {
      qb.andWhere('task.name COLLATE Latin1_General_CI_AI LIKE :name', {
        name: `%${name}%`,
      });
    }

    if (status) {
      qb.andWhere('task.status = :status', { status });
    } else {
      qb.andWhere('task.status = 1');
    }

    // ========== THAY ĐỔI: Filter theo meetingId và meetingConclusionId ==========
    if (meetingId) {
      qb.andWhere('task.meetingId = :meetingId', { meetingId });
    }

    if (meetingConclusionId) {
      qb.andWhere('task.meetingConclusionId = :meetingConclusionId', { meetingConclusionId });
    }

    if (userId) {
      qb.andWhere(
        new Brackets((qb2) => {
          qb2.where('task.createdById = :userId', { userId })
            .orWhere(`
            EXISTS (
              SELECT 1
              FROM work_items wi
              WHERE wi.assignee_user_id = :userId
                AND wi.document_id = CAST(task.id AS NVARCHAR(100))
            )
          `).orWhere(`
            EXISTS (
              SELECT 1
              FROM task_users tu
              WHERE tu.task_id = task.id
                AND tu.process_id = :userId
                AND tu.role IN ('viewer', 'supporter')
            )
          `);
        }),
        { userId },
      );
    }

    if (tab) {
      this.applyTabFilter(qb, tab);
    }

    /* ================= SORT DB ================= */
    if (sort && typeof sort === 'object') {
      let hasValidSort = false;

      Object.entries(sort).forEach(([field, direction]) => {
        if (!SORTABLE_FIELDS.includes(field)) return;

        if (field === 'progress') {
          qb.addSelect('CAST(task.progress AS INT)', 'progress_num');
          qb.addOrderBy(
            'progress_num',
            Number(direction) === -1 ? 'DESC' : 'ASC',
          );
          hasValidSort = true;
          return;
        }

        const column = SORT_FIELD_MAP[field];
        if (!column) return;

        qb.addOrderBy(column, Number(direction) === -1 ? 'DESC' : 'ASC');
        hasValidSort = true;
      });

      if (!hasValidSort) {
        qb.addOrderBy('task.createdAt', 'DESC');
      }
    } else {
      qb.addOrderBy('task.createdAt', 'DESC');
    }
    const [sql, params] = qb.getQueryAndParameters();
    /* ================= QUERY TASK ================= */
    const data = await qb
      .leftJoin('task.taskUsers', 'taskUsers')
      .leftJoin('taskUsers.user', 'user')
      .leftJoin('taskUsers.organizationUnit', 'org')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.updatedBy', 'updatedBy')
      .leftJoin('task.project', 'project')
      .select([
        'task.id',
        'task.name',
        'task.code',
        'task.meetingId',
        'task.progress',
        'task.processStatus',
        'task.startDate',
        'task.endDate',
        'task.createdAt',
        'createdBy.id',
        'createdBy.name',
        'task.typeTask', // Added typeTask
        'task.projectId',
        'task.templateId',
        'task.meetingConclusionId',
        'project.id',
        'project.projectStatus',
      ])
      .addSelect([
        'taskUsers.id',
        'taskUsers.role',
        'taskUsers.type',
        'taskUsers.processId',
        'taskUsers.processName',
        'user.id',
        'user.name',
        'org.id',
        'org.name',
      ])
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getMany();

    /* ================= TOTAL ================= */
    const total = await qb
      .clone()
      .orderBy()
      .skip(undefined)
      .take(undefined)
      .select('COUNT(DISTINCT task.id)', 'cnt')
      .getRawOne();

    const totalCount = Number(total.cnt);

    /* ================= MEETING MAP (GIỐNG FORM DOC) ================= */
    const meetingIds = data.map((t) => t.meetingId).filter(Boolean);
    const uniqueMeetingIds = [...new Set(meetingIds)];

    const meetingMap = new Map<string, { title: string }>();

    if (uniqueMeetingIds.length > 0) {
      const meetings = await this.dataSource
        .createQueryBuilder()
        .select(['id', 'title'])
        .from('meetings', 'm')
        .where('m.id IN (:...ids)', { ids: uniqueMeetingIds })
        .getRawMany();

      for (const m of meetings) {
        meetingMap.set(String(m.id), { title: m.title });
      }
    }

    /* ================= MAP DATA ================= */
    const crmTitlesBatch = await this.mapCrmTitlesBatch(data);

    const mappedData = await Promise.all(
      data.map(async (task) => {
        const progressView = await buildProgressView(task);
        const { assigner, director, supporter, viewer } = this.mapTaskUsers(
          task.taskUsers || [],
        );
        const crmMappedValues = crmTitlesBatch[task.id] || {};

        const meetingInfo = task.meetingId
          ? meetingMap.get(task.meetingId)
          : null;

        const processStatusUi =
          isExport === 'true'
            ? {
              processStatusUi: this.mapProcessStatus(task.processStatus),
              progressView: progressView.rawText,
              isDeadlineExceeded: progressView.isDeadlineExceeded,
            }
            : {
              processStatusUi: this.mapProcessStatusToHtml(
                task.processStatus,
              ),
              progressView: progressView.html,
              isDeadlineExceeded: progressView.isDeadlineExceeded,
            };

        return {
          ...task,
          meetingTitle: meetingInfo?.title || null,
          flag:
            crmMappedValues.priority === 'Gấp' ? RED_FLAG_SVG : WHITE_FLAG_SVG,
          assigner,
          director,
          supporter,
          viewer,
          startDate: task.startDate
            ? dayjs(task.startDate).format('DD/MM/YYYY')
            : null,
          endDate: task.endDate
            ? dayjs(task.endDate).format('DD/MM/YYYY')
            : null,
          createdAt: dayjs(task.createdAt).format('DD/MM/YYYY HH:mm'),
          updatedAt: task.updatedAt
            ? dayjs(task.updatedAt).format('DD/MM/YYYY HH:mm')
            : null,
          parent: task.parent || null,
          ...processStatusUi,
        };
      }),
    );

    /* ================= SORT MEMORY ================= */
    if (sort && typeof sort === 'object') {
      Object.entries(sort).forEach(([field, direction]) => {
        if (['assigner', 'director', 'supporter', 'viewer'].includes(field)) {
          mappedData.sort((a, b) => {
            const aVal = a[field] || '';
            const bVal = b[field] || '';
            return Number(direction) === -1
              ? bVal.localeCompare(aVal, 'vi')
              : aVal.localeCompare(bVal, 'vi');
          });
        }
      });
    }

    return {
      data: mappedData,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    };
  }

  async findTasksByMeeting(queryParams: ListTaskDto, userId?: string) {
    const {
      page = 1,
      limit = 10,
      status,
      tab,
      typeTask,
      filter,
      sort,
      isExport = 'false',
      meetingId,
    } = queryParams;

    const SORTABLE_FIELDS = [
      'name',
      'progress',
      'assigner',
      'director',
      'supporter',
      'viewer',
      'processStatus',
      'createdAt',
      'updatedAt',
      'startDate',
      'endDate',
    ];

    const SORT_FIELD_MAP: Record<string, string> = {
      name: 'task.name',
      progress: 'task.progress',
      processStatus: 'task.processStatus',
      createdAt: 'task.createdAt',
      updatedAt: 'task.updatedAt',
      startDate: 'task.startDate',
      endDate: 'task.endDate',
    };

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const qb = this.taskRepository.createQueryBuilder('task');
    const { name } = filter || {};

    /* ================= FILTER ================= */
    if (name) {
      qb.andWhere('task.name COLLATE Latin1_General_CI_AI LIKE :name', {
        name: `%${name}%`,
      });
    }

    if (status) {
      qb.andWhere('task.status = :status', { status });
    } else {
      qb.andWhere('task.status = 1');
    }

    // ========== Filter theo meetingId ==========
    if (meetingId) {
      qb.andWhere('task.meetingId = :meetingId', { meetingId });
    }

    if (userId) {
      qb.andWhere(
        new Brackets((qb2) => {
          qb2.where('task.createdById = :userId', { userId })
            .orWhere(`
            EXISTS (
              SELECT 1
              FROM work_items wi
              WHERE wi.assignee_user_id = :userId
                AND wi.document_id = CAST(task.id AS NVARCHAR(100))
            )
          `)
            .orWhere(`
            EXISTS (
              SELECT 1
              FROM task_users tu
              WHERE tu.task_id = task.id
                AND tu.process_id = :userId
                AND tu.role IN ('viewer', 'supporter')
            )
          `);
        }),
        { userId },
      );
    }
    if (tab) {
      this.applyTabFilter(qb, tab);
    }

    /* ================= SORT DB ================= */
    if (sort && typeof sort === 'object') {
      let hasValidSort = false;

      Object.entries(sort).forEach(([field, direction]) => {
        if (!SORTABLE_FIELDS.includes(field)) return;

        if (field === 'progress') {
          qb.addSelect('CAST(task.progress AS INT)', 'progress_num');
          qb.addOrderBy(
            'progress_num',
            Number(direction) === -1 ? 'DESC' : 'ASC',
          );
          hasValidSort = true;
          return;
        }

        const column = SORT_FIELD_MAP[field];
        if (!column) return;

        qb.addOrderBy(column, Number(direction) === -1 ? 'DESC' : 'ASC');
        hasValidSort = true;
      });

      if (!hasValidSort) {
        qb.addOrderBy('task.createdAt', 'DESC');
      }
    } else {
      qb.addOrderBy('task.createdAt', 'DESC');
    }
    const [sql, params] = qb.getQueryAndParameters();
    /* ================= QUERY TASK ================= */
    const data = await qb
      .leftJoin('task.taskUsers', 'taskUsers')
      .leftJoin('taskUsers.user', 'user')
      .leftJoin('taskUsers.organizationUnit', 'org')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.updatedBy', 'updatedBy')
      .select([
        'task.id',
        'task.name',
        'task.code',
        'task.meetingId',
        'task.progress',
        'task.processStatus',
        'task.startDate',
        'task.endDate',
        'task.createdAt',
        'createdBy.id',
        'createdBy.name',
      ])
      .addSelect([
        'taskUsers.id',
        'taskUsers.role',
        'taskUsers.type',
        'taskUsers.processId',
        'taskUsers.processName',
        'user.id',
        'user.name',
        'org.id',
        'org.name',
      ])
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getMany();

    /* ================= TOTAL ================= */
    const total = await qb
      .clone()
      .orderBy()
      .skip(undefined)
      .take(undefined)
      .select('COUNT(DISTINCT task.id)', 'cnt')
      .getRawOne();

    const totalCount = Number(total.cnt);

    /* ================= MEETING MAP (GIỐNG FORM DOC) ================= */
    const meetingIds = data.map((t) => t.meetingId).filter(Boolean);
    const uniqueMeetingIds = [...new Set(meetingIds)];

    const meetingMap = new Map<string, { title: string }>();

    if (uniqueMeetingIds.length > 0) {
      const meetings = await this.dataSource
        .createQueryBuilder()
        .select(['id', 'title'])
        .from('meetings', 'm')
        .where('m.id IN (:...ids)', { ids: uniqueMeetingIds })
        .getRawMany();

      for (const m of meetings) {
        meetingMap.set(String(m.id), { title: m.title });
      }
    }

    const crmTitlesBatch = await this.mapCrmTitlesBatch(data);

    const mappedData = await Promise.all(
      data.map(async (task) => {
        const progressView = await buildProgressView(task);
        const { assigner, director, supporter, viewer } = this.mapTaskUsers(
          task.taskUsers || [],
        );
        const crmMappedValues = crmTitlesBatch[task.id] || {};

        const meetingInfo = task.meetingId
          ? meetingMap.get(task.meetingId)
          : null;

        const processStatusUi =
          isExport === 'true'
            ? {
              processStatusUi: this.mapProcessStatus(task.processStatus),
              progressView: progressView.rawText,
              isDeadlineExceeded: progressView.isDeadlineExceeded,
            }
            : {
              processStatusUi: this.mapProcessStatusToHtml(
                task.processStatus,
              ),
              progressView: progressView.html,
              isDeadlineExceeded: progressView.isDeadlineExceeded,
            };

        return {
          ...task,
          meetingTitle: meetingInfo?.title || null,
          flag:
            crmMappedValues.priority === 'Gấp' ? RED_FLAG_SVG : WHITE_FLAG_SVG,
          assigner,
          director,
          supporter,
          viewer,
          startDate: task.startDate
            ? dayjs(task.startDate).format('DD/MM/YYYY')
            : null,
          endDate: task.endDate
            ? dayjs(task.endDate).format('DD/MM/YYYY')
            : null,
          createdAt: dayjs(task.createdAt).format('DD/MM/YYYY HH:mm'),
          updatedAt: task.updatedAt
            ? dayjs(task.updatedAt).format('DD/MM/YYYY HH:mm')
            : null,
          parent: task.parent || null,
          ...processStatusUi,
        };
      }),
    );

    if (sort && typeof sort === 'object') {
      Object.entries(sort).forEach(([field, direction]) => {
        if (['assigner', 'director', 'supporter', 'viewer'].includes(field)) {
          mappedData.sort((a, b) => {
            const aVal = a[field] || '';
            const bVal = b[field] || '';
            return Number(direction) === -1
              ? bVal.localeCompare(aVal, 'vi')
              : aVal.localeCompare(bVal, 'vi');
          });
        }
      });
    }

    return {
      data: mappedData,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    };
  }

  async countTask(userId?: string) {
    return this.taskRepo.countTask(userId);
  }

  async statisticBasic(queryParams: ListTaskDto) {
    const { status, typeTask, filter } = queryParams;

    const { name } = filter || {};

    const qb = this.taskUserRepository

      .createQueryBuilder('tu')

      .leftJoin(UserEntity, 'u', 'u.id = tu.processId')

      .leftJoin('tu.task', 'task')
      .leftJoin('organization_units', 'ou', 'ou.id = u.parent') // join phòng ban

      .where('tu.type = 1')

      .andWhere('u.id IS NOT NULL');

    // filter task

    qb.andWhere('task.status = :status', { status: status ?? 1 });

    if (typeTask) {
      qb.andWhere('task.typeTask = :typeTask', { typeTask: typeTask });
    }

    if (name) {
      qb.andWhere('task.name COLLATE Latin1_General_CI_AI LIKE :name', {
        name: `%${name}%`,
      });
    }

    // select stats

    qb.select([
      'u.codeND AS maNV',

      'u.name AS tenNV',

      'u.position AS chucVu',

      'COUNT(DISTINCT tu.taskId) AS soLuongCvDamNhan',

      "COALESCE(ou.name, 'Khong co phong ban') AS phongBan", // fix dấu nháy

      `SUM(CASE WHEN tu.role = 'director' THEN 1 ELSE 0 END) AS xuLyChinh`,

      `SUM(CASE WHEN tu.role = 'supporter' THEN 1 ELSE 0 END) AS phoiHop`,
    ])

      .groupBy('u.id')

      .addGroupBy('u.codeND')

      .addGroupBy('u.name')

      .addGroupBy('u.position')
      .addGroupBy('ou.name') // phải có trong GROUP BY

      .orderBy('soLuongCvDamNhan', 'DESC');

    const rows = await qb.getRawMany();

    // map output

    return rows.map((r) => ({
      maNV: r.maNV,

      tenNV: r.tenNV,

      chucVu: r.chucVu,
      phongBan: r.phongBan,

      soLuongCvDamNhan: Number(r.soLuongCvDamNhan),

      xuLyChinh: Number(r.xuLyChinh),

      phoiHop: Number(r.phoiHop),
    }));
  }

  async statisticBasicOrg(queryParams: ListTaskDto) {
    const { status, typeTask, filter } = queryParams;
    const { name } = filter || {};

    const qb = this.taskUserRepository
      .createQueryBuilder('tu')
      .leftJoin(UserEntity, 'u', 'u.id = tu.processId')
      .leftJoin('tu.task', 'task')
      .leftJoin('organization_units', 'ou', 'ou.id = u.parent') // join bảng phòng ban
      .where('tu.type = 1')
      .andWhere('u.id IS NOT NULL');

    // filter task
    qb.andWhere('task.status = :status', { status: status ?? 1 });

    if (typeTask) {
      qb.andWhere('task.typeTask = :typeTask', { typeTask });
    }

    if (name) {
      qb.andWhere('task.name COLLATE Latin1_General_CI_AI LIKE :name', {
        name: `%${name}%`,
      });
    }

    // select stats theo phòng ban
    qb.select([
      'ou.name AS phongBan', // lấy tên phòng ban từ bảng organization_units
      'COUNT(DISTINCT tu.taskId) AS soLuongCv', // tổng số task
      `SUM(CASE WHEN tu.role = 'director' THEN 1 ELSE 0 END) AS xuLyChinh`,
      `SUM(CASE WHEN tu.role = 'supporter' THEN 1 ELSE 0 END) AS phoiHop`,
    ])
      .groupBy('ou.id')
      .addGroupBy('ou.name')
      .orderBy('soLuongCv', 'DESC');

    const rows = await qb.getRawMany();

    return rows.map((r) => ({
      phongBan: r.phongBan,
      soLuongCv: Number(r.soLuongCv),
      xuLyChinh: Number(r.xuLyChinh),
      phoiHop: Number(r.phoiHop),
    }));
  }

  //    async statisticListTask(queryParams: ListTaskDto) {
  //   const { status, filter } = queryParams;
  //   const { name, progress, processStatus, priority } = filter || {};
  //   const qb = this.taskUserRepository
  //     .createQueryBuilder('tu')
  //     .leftJoin('tu.task', 'task')
  //     .leftJoin(UserEntity, 'u', 'u.id = tu.processId')
  //     // nếu có người tạo task
  //     .leftJoin(UserEntity, 'creator', 'creator.id = task.createdBy')
  //     .where('tu.type = 1');

  //   // ===== FILTER =====
  //   qb.andWhere('task.status = :status', { status: status ?? 1 });
  // const orConditions: string[] = [];
  //   const parameters: Record<string, any> = {};
  //  if (name) {
  //     orConditions.push('task.name COLLATE Latin1_General_CI_AI LIKE :name');
  //     parameters.name = `%${name}%`;
  //   }
  //   if (progress) {
  //     orConditions.push('task.progress LIKE :progress');
  //     parameters.progress = `%${progress}%`;
  //   }
  //   if (processStatus) {
  //     orConditions.push('task.process_status = :processStatus');
  //     parameters.processStatus = processStatus;
  //   }
  //   if (priority) {
  //     orConditions.push('task.priority = :priority');
  //     parameters.priority = priority;
  //   }

  //   if (orConditions.length) {
  //     qb.andWhere(`(${orConditions.join(' OR ')})`, parameters);
  //   }

  //   // ===== SELECT =====
  //   qb.select([
  //     'task.id AS taskId',
  //     'task.name AS taskName',
  //     'task.created_at AS createdAt',
  //     'task.end_date AS endDate',
  //     'task.process_status AS processStatus',
  //     'task.priority AS priority',
  //     'task.progress AS progress',

  //     'u.name AS assigneeName',
  //     'tu.role AS role',

  //     'creator.name AS createdBy',
  //   ]);
  //  qb.orderBy(
  //   `CASE task.process_status
  //       WHEN '1' THEN 1
  //       WHEN '2' THEN 2
  //       WHEN '3' THEN 3
  //       WHEN '4' THEN 4
  //       WHEN '5' THEN 5
  //       WHEN '6' THEN 6
  //       WHEN '7' THEN 7
  //       WHEN '8' THEN 8
  //       WHEN '9' THEN 9
  //       ELSE 999
  //    END`,
  //   'ASC'
  // )

  //   const rows = await qb.getRawMany();

  //   // ===== GROUP director PER TASK =====
  //   const taskMap = new Map<number, any>();

  //   for (const r of rows) {
  //     if (!taskMap.has(r.taskId)) {
  //       taskMap.set(r.taskId, {
  //         taskId: r.taskId,
  //         taskName: r.taskName,
  //         createdAt: r.createdAt,
  //         endDate: r.endDate,
  //         processStatus: this.mapProcessStatus(r.processStatus),
  //         mapProcessStatusUi : this.mapProcessStatusToHtml(r.processStatus),
  //         priority: r.priority,
  //         progress: r.progress,
  //         createdBy: r.createdBy,
  //         director: [],
  //       });
  //     }

  //     if (r.role === 'director') {
  //     taskMap.get(r.taskId).director = r.assigneeName;

  //   }
  //   }

  //   return Array.from(taskMap.values());
  // }

  async statisticListTask(queryParams: ListTaskDto, userId?: string) {
    const {
      status,
      typeTask,
      filter = {},
      sort,
      page = 1,
      limit = 10,
    } = queryParams;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const { name, progress, priority, processStatus, assigner } = filter || {};

    // Step 1: Build the base query for tasks with filters.
    const taskQb = this.taskRepository
      .createQueryBuilder('task')
      .where('task.status = :status', { status: status ?? 1 });

    if (typeTask) {
      taskQb.andWhere('task.typeTask = :typeTask', { typeTask });
    }
    if (assigner && assigner.trim() !== '') {
      taskQb
        .innerJoin('task.taskUsers', 'tu_assigner')  // Giả sử relation: Task có @OneToMany(() => TaskUser, tu => tu.task)
        .innerJoin(UserEntity, 'u_assigner', 'u_assigner.id = tu_assigner.processId')
        .andWhere('tu_assigner.role = :assignerRole', { assignerRole: 'assigner' })
        .andWhere(
          'u_assigner.name COLLATE Latin1_General_CI_AI LIKE :assignerName',
          { assignerName: `%${assigner}%` }
        );
    }
    // ── MỚI: Filter createdAt ──
    if (filter.start_date_from) {
      const { startDate, endDate } = filter.start_date_from;

      if (startDate) {
        const from = new Date(startDate);
        if (!isNaN(from.getTime())) {
          taskQb.andWhere('task.created_at >= :createdFrom', { createdFrom: from.toISOString() });
        }
      }

      if (endDate) {
        const to = new Date(endDate);
        if (!isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          taskQb.andWhere('task.created_at <= :createdTo', { createdTo: to.toISOString() });
        }
      }
    }
    // ── MỚI: Filter endDate ──
    if (filter.end_date_from) {
      const { startDate, endDate } = filter.end_date_from;

      if (startDate) {
        const from = new Date(startDate);
        if (!isNaN(from.getTime())) {
          taskQb.andWhere('task.end_date >= :endFrom', { endFrom: from.toISOString() });
        }
      }

      if (endDate) {
        const to = new Date(endDate);
        if (!isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          taskQb.andWhere('task.end_date <= :endTo', { endTo: to.toISOString() });
        }
      }
    }

    // Apply filters with AND
    if (filter) {
      if (name && name.trim() !== '') {
        taskQb.andWhere('task.name COLLATE Latin1_General_CI_AI LIKE :name', {
          name: `%${name}%`,
        });
      }
      if (progress != null && progress !== '') {
        taskQb.andWhere('task.progress = :progress', { progress });
      }
      if (priority && priority.trim() !== '') {
        taskQb.andWhere('task.priority = :priority', { priority });
      }
      if (processStatus && processStatus.trim() !== '') {
        taskQb.andWhere('task.process_status = :processStatus', {
          processStatus,
        });
      }
    }

    // Step 2: Get the total count of matching tasks.
    const total = await taskQb.getCount();

    // Step 3: Apply sorting and pagination to get a page of task IDs.
    taskQb
      .orderBy(
        `CASE task.process_status
          WHEN '1' THEN 1 WHEN '2' THEN 2 WHEN '3' THEN 3 WHEN '4' THEN 4 WHEN '5' THEN 5
          WHEN '6' THEN 6 WHEN '7' THEN 7 WHEN '8' THEN 8 WHEN '9' THEN 9
          ELSE 999
        END`,
        'ASC',
      )
      .addOrderBy('task.created_at', 'DESC');

    taskQb.select('task.id'); // Select only IDs for pagination
    taskQb.skip((pageNum - 1) * limitNum).take(limitNum);

    const taskIds = (await taskQb.getRawMany()).map((t) => t.task_id);

    if (taskIds.length === 0) {
      return {
        data: [],
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    }
    const tasks = await this.taskRepository.find({
      where: { id: In(taskIds) },
      select: ['id', 'priority'],
    });
    const crmPriorityMap = new Map<number, string>();
    const crmTitlesBatch = await this.mapCrmTitlesBatch(tasks);

    for (const task of tasks) {
      const crmMapped = crmTitlesBatch[task.id] || {};

      crmPriorityMap.set(
        task.id,
        crmMapped.priority ?? 'Bình thường', // fallback an toàn
      );
    }


    // Step 4: Fetch the full data for the paginated tasks.
    const qb = this.taskUserRepository
      .createQueryBuilder('tu')
      .innerJoin('tu.task', 'task', 'task.id IN (:...taskIds)', { taskIds })
      .leftJoin(UserEntity, 'u', 'u.id = tu.processId')
      .leftJoin(UserEntity, 'creator', 'creator.id = task.createdBy')
      .where('tu.type IN (1, 2)')   // lấy cả type 1 và type 2

    qb.select([
      'task.id AS taskId',
      'task.name AS taskName',
      'task.created_at AS createdAt',
      'task.end_date AS endDate',
      'task.process_status AS processStatus',
      'task.priority AS priority',
      'task.progress AS progress',
      'u.name AS assigneeName',
      'tu.role AS role',
      'creator.name AS createdBy',
    ]);

    const rows = await qb.getRawMany();

    // Step 5: Group by task and map data (same as original logic)
    const taskMap = new Map<number, any>();
    for (const r of rows) {
      if (!taskMap.has(r.taskId)) {
        taskMap.set(r.taskId, {
          taskId: r.taskId,
          taskName: r.taskName,
          createdAt: r.createdAt,
          endDate: r.endDate,
          processStatus: this.mapProcessStatus(r.processStatus),
          mapProcessStatusUi: this.mapProcessStatusToHtml(r.processStatus),
          priorityRaw: r.priority,
          //   priority: crmMapped.priority ??             // Ưu tiên từ CRM
          // (r.priority === 'gap' ? 'Gấp' : 'Bình thường'),
          priority: crmPriorityMap.get(r.taskId),

          progress: r.progress,
          createdBy: r.createdBy,
          director: [],
          assigner: [],
        });
      }
      if (r.role === 'director') {
        taskMap.get(r.taskId).director = r.assigneeName;
      }
      if (r.role === 'assigner') {
        taskMap.get(r.taskId).assigner = r.assigneeName;
      }
    }

    // Step 6: Apply UI sorting if provided
    const result = Array.from(taskMap.values());
    if (sort && typeof sort === 'object') {
      Object.entries(sort).forEach(([field, direction]) => {
        if (
          ['taskName', 'progress', 'priority', 'processStatus'].includes(field)
        ) {
          result.sort((a, b) => {
            const aVal = (a[field] || '').toString();
            const bVal = (b[field] || '').toString();
            return Number(direction) === -1
              ? bVal.localeCompare(aVal, 'vi')
              : aVal.localeCompare(bVal, 'vi');
          });
        }
      });
    }

    await this.setHasChildrenBatch(result);

    // Step 7: Return paginated result object
    return {
      data: result,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async statisticPersonalPerformanceByMonth(
    params: {
      fromMonth: number;
      fromYear: number;
      toMonth: number;
      toYear: number;
      creatorId?: string;
    },
    userId: string,
  ) {
    const { fromMonth, fromYear, toMonth, toYear, creatorId } = params;

    const qb = this.taskRepository
      .createQueryBuilder('task')
      .innerJoin(
        'task_users',
        'tu',
        'tu.task_id = task.id AND tu.type = 1 AND tu.process_id = :userId',
        { userId },
      )
      .leftJoin(UserEntity, 'creator', 'creator.id = task.created_by')

      .where('task.status = 1');

    // lọc theo khoảng tháng / năm
    qb.andWhere(
      `
      (
        YEAR(task.created_at) * 100 + MONTH(task.created_at)
        BETWEEN :fromYM AND :toYM
      )
      `,
      {
        fromYM: fromYear * 100 + fromMonth,
        toYM: toYear * 100 + toMonth,
      },
    );

    if (creatorId) {
      qb.andWhere('task.created_by = :creatorId', { creatorId });
    }

    qb.select([
      `
    CONCAT(
      RIGHT('0' + CAST(MONTH(task.created_at) AS VARCHAR), 2),
      '/',
      YEAR(task.created_at)
    ) AS month
    `,
      'COUNT(task.id) AS totalTask',

      // hoàn thành
      `
    SUM(
      CASE
        WHEN task.process_status = '4'
        THEN 1 ELSE 0
      END
    ) AS completed
    `,

      // đúng hạn
      `
    SUM(
      CASE
        WHEN task.process_status = '4'
        AND GETDATE() <= task.end_date
        THEN 1 ELSE 0
      END
    ) AS onTime
    `,

      // quá hạn
      `
    SUM(
      CASE
        WHEN task.process_status = '4'
        AND GETDATE() > task.end_date
        THEN 1 ELSE 0
      END
    ) AS late
    `,

      // đang xử lý
      `
    SUM(
      CASE
        WHEN task.process_status <> '4'
          OR task.process_status IS NULL
        THEN 1 ELSE 0
      END
    ) AS inProgress
    `,
    ]);

    qb.groupBy(`
    YEAR(task.created_at),
    MONTH(task.created_at)
  `);

    qb.orderBy('YEAR(task.created_at)', 'ASC').addOrderBy(
      'MONTH(task.created_at)',
      'ASC',
    );

    const raw = await qb.getRawMany();
    const user = await this.dataSource.getRepository(UserEntity).findOne({
      where: { id: userId },
    });

    return raw.map((r) => ({
      user: creatorId || userId,
      userName: user?.name || null,
      month: r.month,
      totalTask: Number(r.totalTask),
      completed: Number(r.completed),
      onTime: Number(r.onTime),
      late: Number(r.late),
      inProgress: Number(r.inProgress),
    }));
  }

  async statisticPersonalPerformanceByMonthAll(params: {
    fromMonth: number;
    fromYear: number;
    toMonth: number;
    toYear: number;
    creatorId?: string;
  }) {
    const { fromMonth, fromYear, toMonth, toYear, creatorId } = params;

    const qb = this.taskRepository
      .createQueryBuilder('task')
      // join tất cả user trong task_users (type = 1)
      .innerJoin('task_users', 'tu', 'tu.task_id = task.id AND tu.type = 1')
      // join bảng users để lấy tên
      .leftJoin(UserEntity, 'user', 'user.id = tu.process_id')
      .where('task.status = 1');

    // lọc theo creator nếu có
    if (creatorId) {
      qb.andWhere('task.created_by = :creatorId', { creatorId });
    }

    // lọc theo khoảng tháng/năm
    qb.andWhere(
      `(YEAR(task.created_at) * 100 + MONTH(task.created_at) 
        BETWEEN :fromYM AND :toYM)`,
      { fromYM: fromYear * 100 + fromMonth, toYM: toYear * 100 + toMonth },
    );

    // select các field + thống kê
    qb.select([
      `
      CONCAT(
        RIGHT('0' + CAST(MONTH(task.created_at) AS VARCHAR), 2),
        '/',
        YEAR(task.created_at)
      ) AS month
      `,
      'tu.process_id AS userId',
      'user.name AS userName',
      'COUNT(task.id) AS totalTask',
      `SUM(CASE WHEN task.process_status = '4' THEN 1 ELSE 0 END) AS completed`,
      `SUM(CASE WHEN task.process_status = '4' AND GETDATE() <= task.end_date THEN 1 ELSE 0 END) AS onTime`,
      `SUM(CASE WHEN task.process_status = '4' AND GETDATE() > task.end_date THEN 1 ELSE 0 END) AS late`,
      `SUM(CASE WHEN task.process_status <> '4' OR task.process_status IS NULL THEN 1 ELSE 0 END) AS inProgress`,
    ]);

    // group theo tháng và user
    qb.groupBy('YEAR(task.created_at)')
      .addGroupBy('MONTH(task.created_at)')
      .addGroupBy('tu.process_id')
      .addGroupBy('user.name');

    // sort theo tháng
    qb.orderBy('YEAR(task.created_at)', 'ASC').addOrderBy(
      'MONTH(task.created_at)',
      'ASC',
    );

    // chạy query
    const raw = await qb.getRawMany();

    // map lại data trả về
    return raw.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      month: r.month,
      totalTask: Number(r.totalTask),
      completed: Number(r.completed),
      onTime: Number(r.onTime),
      late: Number(r.late),
      inProgress: Number(r.inProgress),
    }));
  }

  async getOverdueTasks(params: {
    fromMonth: number;
    fromYear: number;
    toMonth: number;
    toYear: number;
    creatorId?: string;
  }) {
    const { fromMonth, fromYear, toMonth, toYear, creatorId } = params;

    const qb = this.taskRepository
      .createQueryBuilder('task')
      .innerJoin('task_users', 'tu', 'tu.task_id = task.id AND tu.type = 1')
      .leftJoin(UserEntity, 'user', 'user.id = tu.process_id')
      .where('task.status = 1')
      // quá hạn: chưa hoàn thành + hiện tại > end_date
      .andWhere(
        `(task.process_status <> '4' OR task.process_status IS NULL) AND GETDATE() > task.end_date`,
      )
      // lọc theo khoảng tháng/năm
      .andWhere(
        `(YEAR(CONVERT(DATETIME, task.created_at)) * 100 + MONTH(CONVERT(DATETIME, task.created_at)) 
          BETWEEN :fromYM AND :toYM)`,
        { fromYM: fromYear * 100 + fromMonth, toYM: toYear * 100 + toMonth },
      );

    if (creatorId) {
      qb.andWhere('task.created_by = :creatorId', { creatorId });
    }

    // select fields cần thiết, thêm overdueDays
    qb.select([
      'task.id AS taskId',
      'task.name AS taskName',
      'CONVERT(VARCHAR(10), task.start_date, 120) AS startDate',
      'CONVERT(VARCHAR(10), task.end_date, 120) AS endDate',
      'tu.process_id AS userId',
      'user.name AS userName',
      'task.process_status AS status',
      'task.created_by AS creatorId',
      'task.progress AS progress', // 👈 thêm dòng này
      'DATEDIFF(day, task.end_date, GETDATE()) AS overdueDays', // số ngày quá hạn
    ]);

    qb.orderBy('task.end_date', 'ASC');

    const raw = await qb.getRawMany();

    return raw.map((r) => ({
      taskId: r.taskId,
      taskName: r.taskName,
      startDate: r.startDate,
      endDate: r.endDate,
      userId: r.userId,
      userName: r.userName,
      status: r.status,
      creatorId: r.creatorId,
      progress: Number(r.progress),
      overdueDays: Number(r.overdueDays), // convert về number
    }));
  }

  async statisticRecurringByCycle(
    query: {
      fromDate?: string;
      toDate?: string;
      scope?: 'me' | 'all';
    },
    userId: string,
  ) {
    const { fromDate, toDate, scope = 'me' } = query;

    const qb = this.taskRepository
      .createQueryBuilder('task')
      .where('task.status = 1')
      .andWhere(`task.type_task = 'recurring'`);
    qb.andWhere(`task.repetitive_task != 'khong'`); // không lấy các task k thuộc loại lặp lại

    // Join director
    qb.leftJoin(
      'task_users',
      'tu',
      `
      tu.task_id = task.id
      AND tu.type = 1
    `,
    );
    qb.leftJoin('users', 'u', 'u.id = tu.process_id');

    // Scope = me → chỉ lấy task mình làm director
    if (scope === 'me') {
      qb.andWhere('tu.process_id = :userId', { userId });
    }

    if (fromDate) {
      qb.andWhere('task.created_at >= :fromDate', { fromDate });
    }

    if (toDate) {
      qb.andWhere('task.created_at <= :toDate', { toDate });
    }

    // SELECT đúng những field phục vụ thống kê
    qb.select([
      'task.id AS id',
      'task.name AS name',
      'task.process_status AS processStatus',
      'task.created_at AS createdAt',
      'task.start_date AS startDate',
      'task.repetitive_start AS repetitiveStart',
      'task.repetitive_end AS repetitiveEnd',
      'task.repetitive_task AS repetitiveTask',
      'task.end_date AS endDate',
      'tu.process_id AS directorId',
      'u.name AS directorName',
    ]);

    qb.orderBy('task.created_at', 'DESC');

    const raw = await qb.getRawMany();

    return {
      scope,
      userId: scope === 'me' ? userId : null,
      total: raw.length,
      data: raw.map((r) => ({
        id: r.id,
        name: r.name,
        processStatus: r.processStatus,
        createdAt: r.createdAt,
        startDate: r.startDate,
        endDate: r.endDate,
        repetitiveStart: r.repetitiveStart,
        repetitiveEnd: r.repetitiveEnd,
        repetitiveTask: r.repetitiveTask,
        directorId: r.directorId,
        directorName: r.directorName,
      })),
    };
  }

  async statisticTaskByCreator(queryParams: ListTaskDto) {
    const {
      status,
      typeTask,
      filter,
      sort,
      page = 1,
      limit = 10,
    } = queryParams;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const qb = this.taskRepository
      .createQueryBuilder('task')
      .innerJoin(UserEntity, 'creator', 'creator.id = task.createdById')
      .leftJoin(TaskUserEntity, 'tu', 'tu.taskId = task.id AND tu.type = 1') // assignee/director
      .leftJoin(
        UserEntity,
        'director',
        'director.id = tu.processId AND tu.role = :role',
        { role: 'director' },
      )
      .select([
        'creator.id AS creatorId',
        'creator.name AS creatorName',
        'director.name AS directorName',
        'COUNT(task.id) AS totalTask',
        `SUM(CASE WHEN task.progress = '100' THEN 1 ELSE 0 END) AS completedTask`,
        `SUM(CASE WHEN task.progress = '100' AND task.endDate <= GETDATE() THEN 1 ELSE 0 END) AS onTimeTask`,
        `SUM(CASE WHEN task.progress != '100' AND task.endDate < GETDATE() AND task.processStatus != 4 THEN 1 ELSE 0 END) AS lateTask`,
        `AVG(DATEDIFF(day, task.startDate, task.endDate)) AS avgProcessTime`,
      ])
      .where('task.status = :status', { status: status ?? 1 });

    if (typeTask) qb.andWhere('task.typeTask = :typeTask', { typeTask });

    // filter
    if (filter?.name)
      qb.andWhere('task.name LIKE :name', { name: `%${filter.name}%` });
    if (filter?.progress != null)
      qb.andWhere('task.progress = :progress', {
        progress: filter.progress.toString(),
      });
    if (filter?.priority)
      qb.andWhere('task.priority = :priority', { priority: filter.priority });
    if (filter?.processStatus)
      qb.andWhere('task.processStatus = :processStatus', {
        processStatus: filter.processStatus,
      });

    qb.groupBy('creator.id')
      .addGroupBy('creator.name')
      .addGroupBy('director.name');

    // total creators
    const totalCreators = await qb.getCount();

    // apply pagination
    qb.skip((pageNum - 1) * limitNum).take(limitNum);

    const rows = await qb.getRawMany();

    // map result
    const data = rows.map((r) => ({
      creatorId: r.creatorId,
      creatorName: r.creatorName,
      directorName: r.directorName,
      totalTask: Number(r.totalTask),
      completedTask: Number(r.completedTask),
      onTimeTask: Number(r.onTimeTask),
      lateTask: Number(r.lateTask),
      avgProcessTime: Number(r.avgProcessTime?.toFixed(1)) || 0,
      completionRate: Number(
        ((r.completedTask / r.totalTask) * 100).toFixed(0),
      ),
    }));

    return {
      data,
      total: totalCreators,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCreators / limitNum),
    };
  }

  async statisticCompletedTaskByDuration(
    query: {
      fromDate?: string;
      toDate?: string;
      scope?: 'me' | 'all';
    },
    userId: string,
  ) {
    const { fromDate, toDate, scope = 'me' } = query;

    /**
     * 1️⃣ Lấy TASK đã hoàn thành (KHÔNG JOIN USER)
     */
    const taskQb = this.taskRepository
      .createQueryBuilder('task')
      .where('task.status = 1')
      .andWhere('task.process_status = :processStatus', { processStatus: '4' })
      .andWhere('task.start_date IS NOT NULL')
      .andWhere('task.end_date IS NOT NULL');

    if (fromDate) {
      taskQb.andWhere('task.created_at >= :fromDate', { fromDate });
    }

    if (toDate) {
      taskQb.andWhere('task.created_at <= :toDate', { toDate });
    }

    taskQb.select([
      'task.id AS id',
      'task.name AS name',
      'task.start_date AS startDate',
      'task.end_date AS endDate',
      `
      DATEDIFF(
        HOUR,
        task.start_date,
        task.end_date
      ) AS completeHours
    `,
    ]);

    const tasks = await taskQb.getRawMany();

    if (!tasks.length) {
      return {
        scope,
        userId: scope === 'me' ? userId : null,
        total: 0,
        data: [],
      };
    }

    const taskIds = tasks.map((t) => t.id);

    /**
     * 2️⃣ Lấy TẤT CẢ director của các task
     */
    const directorsRaw = await this.dataSource
      .createQueryBuilder()
      .select([
        'tu.task_id AS taskId',
        'u.id AS directorId',
        'u.name AS directorName',
      ])
      .from('task_users', 'tu')
      .innerJoin('users', 'u', 'u.id = tu.process_id')
      .where('tu.type = 1')
      .andWhere('tu.task_id IN (:...taskIds)', { taskIds })
      .getRawMany();

    /**
     * 3️⃣ Group director theo task
     */
    const directorMap = new Map<number, { id: string; name: string }[]>();

    for (const d of directorsRaw) {
      if (!directorMap.has(d.taskId)) {
        directorMap.set(d.taskId, []);
      }
      directorMap.get(d.taskId)!.push({
        id: d.directorId,
        name: d.directorName,
      });
    }

    /**
     * 4️⃣ Gộp task + director
     */
    let data = tasks.map((t) => {
      const hours = Number(t.completeHours);

      return {
        id: t.id,
        name: t.name,
        startDate: t.startDate,
        endDate: t.endDate,
        completeHours: hours,
        completeDays: +(hours / 24).toFixed(2),
        directors: directorMap.get(t.id) || [],
      };
    });

    /**
     * 5️⃣ scope = me → chỉ giữ task có tôi là director
     */
    if (scope === 'me') {
      data = data.filter((task) => task.directors.some((d) => d.id === userId));
    }

    /**
     * 6️⃣ Sort giảm dần theo thời gian hoàn thành
     */
    data.sort((a, b) => b.completeHours - a.completeHours);

    return {
      scope,
      userId: scope === 'me' ? userId : null,
      total: data.length,
      data,
    };
  }

  private TYPE_TASK_VN: Record<string, string> = {
    template: 'Mẫu',
    recurring: 'Công việc lặp lại',
    general: 'Công việc chung',
    form_doc: 'Công việc từ văn bản',
    form_meeting: 'Công việc từ cuộc họp',
  };

  async findAllApprove(params: ListTaskDto, userId: string) {
    const tStart = performance.now();
    if (params.status === undefined || params.status === null) {
      params.status = 1;
    }
    await this.validateBpmnAndPermission(userId, undefined, true);
    const tValidate = performance.now();

    // Đếm số lượng cho type 'sent' và 'pending' song song
    const [sentCountResult, pendingCountResult] = await Promise.all([
      this.taskRepo.findSentTasksWithHistory({ ...params, page: 1, limit: 1 }, userId),
      this.taskRepo.findApproveTasks({ ...params, type: 'pending', page: 1, limit: 1 } as any, userId),
    ]);
    const tCount = performance.now();

    const countSent = sentCountResult.total || 0;
    const countPending = pendingCountResult.total || 0;

    // console.log(`[findAllApprove] Performance logs:`);
    // console.log(`  - Validate BPMN & Permission: ${(tValidate - tStart).toFixed(2)}ms`);
    // console.log(`  - Count Sent & Pending: ${(tCount - tValidate).toFixed(2)}ms`);

    // Xử lý riêng cho trường hợp SENT: Mỗi dòng log là 1 record
    if ((params as any).type === 'sent') {
      const dataWithHistory = await this.taskRepo.findSentTasksWithHistory(params, userId);
      const { data, total } = dataWithHistory;

      const mappedData = await Promise.all(data.map(async (row: any) => {
        // row là kết quả raw join giữa Audit và Task
        // Cần map lại giống format trả về data bên dưới
        // row cấu trúc: { ...taskEntityFields, audit_id, audit_action_code, audit_created_at, audit_note, audit_receiver_name, ... }

        // Chúng ta có thể reuse mapTask để lấy thông tin cơ bản của task
        // Tuy nhiên row ở đây là raw data, cần convert sang Entity hoặc map thủ công
        // Để đơn giản và hiệu quả, ta map các field quan trọng.

        // Lấy thông tin task cơ bản
        const taskBasic = {
          id: row.taskId,
          name: row.taskName,
          code: row.taskCode,
          status: row.taskStatus,
          priority: row.taskPriority,
          processStatus: row.taskProcessStatus,
          typeTask: row.taskTypeTask,
          endDate: row.taskEndDate,
          progress: row.taskProgress,
        };

        const typeTaskView = buildTypeTaskView(taskBasic.typeTask);
        // Use next audit action code if available to show the response status (e.g. Rejected)
        const approvalActionCode = row.nextAuditActionCode || row.auditActionCode || 'pending';
        const processStatusView = buildApprovalStatusView(approvalActionCode);
        const typeRequestView = buildTypeRequestView(row.auditActionCode);

        // Parse note
        let noteSent: string | null = null;
        if (row.auditDetails) {
          try {
            const det = JSON.parse(row.auditDetails);
            if (det?.note) noteSent = det.note;
          } catch { }
        }

        // Người nhận:
        // Audit log lưu receiver id. Repo đã join user để lấy tên.
        const receiverName = row.auditReceiverName;

        return {
          ...taskBasic,
          id: row.auditId,
          auditId: row.auditId, // Add auditId here
          // auditCode: row.auditId, // Add auditId here
          taskId: row.taskId,
          typeTask: typeTaskView.html,
          typeRequest: typeRequestView.html,
          typeRequestText: row.auditActionCode,
          processStatus: processStatusView.html, // Trạng thái của LẦN GỬI ĐÓ
          sender: row.auditSenderName, // Người gửi là người tạo log (userId)
          receiver: receiverName,
          dateSent: row.auditCreatedAt ? dayjs(row.auditCreatedAt).format('DD/MM/YYYY HH:mm') : null,
          note: noteSent,
          noteSent: noteSent,
          // Các field khác nếu cần
          isHistoryRow: true, // Marker để FE biết đây là dòng lịch sử
        };
      }));

      return {
        data: mappedData,
        total,
        page: Number(params.page || 1),
        limit: Number(params.limit || 10),
        totalPages: Math.ceil(total / (Number(params.limit || 10))),
        countSent,
        countPending,
      };
    }

    // Logic cũ cho các trường hợp khác (Received, Approve...)
    const dataWithFilters = await this.taskRepo.findApproveTasks(params, userId);
    const { entities, raw, total } = dataWithFilters;

    const rawMap = new Map<number, any>();
    raw.forEach(r => rawMap.set(r.task_id, r));

    const data = await Promise.all(
      entities.map(async task => {
        const audit = rawMap.get(task.id);
        const mapped = await this.mapTask(task);

        // Build badge views
        // Use send_action_code (original request) for typeRequest, fallback to latest audit if needed
        const typeRequestCode = audit?.send_action_code || audit?.audit_action_code || '';
        const typeRequestView = buildTypeRequestView(typeRequestCode);
        const typeTaskView = buildTypeTaskView(mapped.typeTask);

        // Use latest audit action for processStatus (to show if it's Pending, Approved, Rejected etc.)
        const processStatusView = buildApprovalStatusView(audit?.audit_action_code || 'pending');

        let noteValue = audit?.audit_note || null;
        if (audit?.audit_details) {
          try {
            const details = JSON.parse(audit.audit_details);
            if (details?.note) {
              noteValue = details.note;
            }
          } catch (e) {
            // ignore
          }
        }

        const noteSent: string | null = null;
        const rejectionReason: string | null = null;
        const rejectionDate: string | null = null;
        const dateSentForList: string | null = null;
        const typeRequestText: string | null = null;
        const sendHistory: any[] = [];

        // Logic cũ cho Received: vẫn hiển thị history nếu cần, nhưng chỉ 1 dòng per task
        // ... (Giữ nguyên logic history nếu user muốn xem chi tiết task sent/received dạng grouped)
        // Tuy nhiên ở đây là list view, nếu là params.type != 'sent', ta giữ nguyên logic cũ.

        return {
          ...mapped,
          // typeTask: this.TYPE_TASK_VN[mapped.typeTask],
          typeTask: typeTaskView.html,
          // typeRequest:
          //   audit?.audit_action_code === 'GUI_PHE_DUYET'
          //     ? 'Phê duyệt kết quả'
          //     : 'Điều chỉnh thông tin',
          typeRequest: typeRequestView.html,
          typeRequestText: typeRequestText || typeRequestCode,
          // processStatus: 'Chờ phê duyệt',
          processStatus: processStatusView.html,
          sender: audit?.audit_sender_name || null,
          receiver: null, // Received tab usually doesn't show receiver (it's the current user)
          dateSent: audit?.audit_date_sent
            ? dayjs(audit.audit_date_sent).format('DD/MM/YYYY HH:mm')
            : null,
          note: noteValue,
        };
      }),
    );

    const page = Number(params.page || 1);
    const limit = Number(params.limit || 10);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      countSent,
      countPending,
    };
  }


  async findAllChild(queryParams: QueryParams, userId?: string) {
    if (queryParams.status === undefined || queryParams.status === null) {
      queryParams.status = 1;
    }
    const { page = 1, limit = 10, name, status, parent } = queryParams;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const parentID = Number(parent) || 10;
    const qb = this.taskRepository.createQueryBuilder('task');
    if (parent) {
      qb.andWhere('task.parent = :parent', { parent });
    }
    if (name) {
      qb.andWhere('task.name LIKE :name', { name: `%${name}%` });
    }
    if (status) {
      qb.andWhere('task.status = :status', { status });
    } else {
      qb.andWhere('task.status = 1'); // Default to active tasks
    }

    const [data, total] = await qb
      .leftJoinAndSelect('task.taskUsers', 'taskUsers')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .orderBy('task.id', 'ASC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .select([
        'task.id',
        'task.name',
        'task.startDate',
        'task.endDate',
        'task.parent',
        'task.processStatus',
        'task.progress',
        'task.priority',
        'task.createdAt',
        'task.updatedAt',
        'task.reminderTime',
        'taskUsers.id',
        'taskUsers.role',
        'taskUsers.processId',
        'taskUsers.processName',
        'createdBy.id',
        'createdBy.name',
        'createdBy.emailUser',
        // 'updatedBy.id',
        // 'updatedBy.name',
      ])
      .getManyAndCount();

    const parentTask = parent ? await this.taskRepository.findOne({ where: { id: Number(parent) } }) : null;
    const crmTitlesBatch = await this.mapCrmTitlesBatch(data);
    const dataMap = await Promise.all(
      data.map(async (task) => {
        const progressView = await buildProgressView(task);
        const mappedTask = await this.mapTask(task);
        const crmMappedValues = crmTitlesBatch[task.id] || {};

        // let startDate = task.startDate
        //   ? dayjs(task.startDate).format('DD/MM/YYYY')
        //   : null;
        // let endDate = task.endDate
        //   ? dayjs(task.endDate).format('DD/MM/YYYY')
        //   : null;

        // if (parentTask) {
        //   if (
        //     task.startDate &&
        //     parentTask.startDate &&
        //     dayjs(task.startDate).isAfter(dayjs(parentTask.startDate))
        //   ) {
        //     startDate = `<span style="color:red">${startDate}</span>`;
        //   }

        //   if (
        //     task.endDate &&
        //     parentTask.endDate &&
        //     dayjs(task.endDate).isAfter(dayjs(parentTask.endDate))
        //   ) {
        //     endDate = `<span style="color:red">${endDate}</span>`;
        //   }
        // }

        return {
          ...mappedTask,
          progressView: progressView.html,
          flag: crmMappedValues.priority === 'Gấp' ? RED_FLAG_SVG : WHITE_FLAG_SVG,
          typeTaskText: this.TYPE_TASK_VN[task.typeTask],
          // startDate,
          // endDate,
          startDateNotHTML: task.startDate ? dayjs(task.startDate).format('DD/MM/YYYY') : null,
          endDateNotHTML: task.endDate ? dayjs(task.endDate).format('DD/MM/YYYY') : null,
          flags: {
            isAssigner:
              ['1', '2'].includes(String(task.processStatus)) &&
              !!userId &&
              !!task.taskUsers?.some(
                (taskUser) =>
                  taskUser.role === 'assigner' &&
                  (taskUser.processId === userId || taskUser.user?.id === userId),
              ),
            canDelete: !!userId &&
              task.createdBy?.id === userId &&
              task.processStatus === 'Công việc mới',
          }
        };
      }),
    );

    await this.setHasChildrenBatch(dataMap);

    return {
      data: dataMap,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  private async setHasChildrenBatch(data: any[]): Promise<void> {
    if (!data || data.length === 0) return;
    const taskIds = data.map((t) => t.id || t.taskId).filter((id) => id);
    if (!taskIds.length) return;

    try {
      const parentCounts = await this.taskRepo
        .createQueryBuilder('task')
        .select('task.parent', 'parent')
        .addSelect('COUNT(*)', 'count')
        .where('task.parent IN (:...ids)', { ids: taskIds })
        .andWhere('task.status != 3') // Ẩn các bản ghi đã xóa nếu cần
        .groupBy('task.parent')
        .getRawMany();

      const hasChildrenMap = new Map<number, boolean>();
      parentCounts.forEach((pc) => {
        if (pc.parent) {
          hasChildrenMap.set(Number(pc.parent), Number(pc.count) > 0);
        }
      });

      data.forEach((item) => {
        const id = item.id || item.taskId;
        if (!item.flags) item.flags = {};
        item.flags.hasChildren = hasChildrenMap.get(Number(id)) || false;
      });
    } catch (error) {
      this.logger.error('Error in setHasChildrenBatch:', error.message);
      // Fallback: gán false cho tất cả nếu lỗi để tránh crash
      data.forEach((item) => {
        if (!item.flags) item.flags = {};
        if (item.flags.hasChildren === undefined) {
          item.flags.hasChildren = false;
        }
      });
    }
  }

  private async mapTasksBatch(tasks: TaskEntity[]): Promise<any[]> {
    if (!tasks.length) return [];

    const crmTitlesBatch = await this.mapCrmTitlesBatch(tasks);

    return tasks.map((task) => {
      const crmMappedValues = crmTitlesBatch[task.id] || {};

      // 🔹 Tách taskUsers theo role
      const assigners: TaskUserEntity[] = [];
      const directors: TaskUserEntity[] = [];
      const supporters: TaskUserEntity[] = [];
      const viewers: TaskUserEntity[] = [];

      (task.taskUsers || []).forEach((tu) => {
        if (tu.user?.parent?.name) {
          tu.processName = `${tu.processName || tu.user.name} - ${tu.user.parent.name}`;
        }
        switch (tu.role) {
          case 'assigner':
            assigners.push(tu);
            break;
          case 'director':
            directors.push(tu);
            break;
          case 'supporter':
            supporters.push(tu);
            break;
          case 'viewer':
            viewers.push(tu);
            break;
        }
      });

      return {
        ...task,
        taskUsers: undefined,
        // ✅ 4 nhóm user
        assigners,
        directors,
        supporters,
        viewers,
        priority: crmMappedValues.priority ?? null,
        topic: crmMappedValues.topic ?? null,
        repetitiveTask: crmMappedValues.repetitiveTask ?? null,
        reminderTime: crmMappedValues.reminderTime ?? null,
        month: crmMappedValues.month ?? null,
        bpmnId: crmMappedValues.bpmnId ?? null,
        processStatus: this.mapProcessStatusToHtml(task.processStatus),
      };
    });
  }

  private async mapTask(task: TaskEntity): Promise<any> {
    const crmMappedValues = await this.mapCrmTitles(task);

    // 🔹 Tách taskUsers theo role
    const assigners: TaskUserEntity[] = [];
    const directors: TaskUserEntity[] = [];
    const supporters: TaskUserEntity[] = [];
    const viewers: TaskUserEntity[] = [];

    (task.taskUsers || []).forEach((tu) => {
      if (tu.user?.parent?.name) {
        tu.processName = `${tu.processName || tu.user.name} - ${tu.user.parent.name}`;
      }
      switch (tu.role) {
        case 'assigner':
          assigners.push(tu);
          break;
        case 'director':
          directors.push(tu);
          break;
        case 'supporter':
          supporters.push(tu);
          break;
        case 'viewer':
          viewers.push(tu);
          break;
      }
    });

    return {
      ...task,
      taskUsers: undefined,
      // ✅ 4 nhóm user
      assigners,
      directors,
      supporters,
      viewers,
      priority: crmMappedValues.priority ?? null,
      topic: crmMappedValues.topic ?? null,
      repetitiveTask: crmMappedValues.repetitiveTask ?? null,
      reminderTime: crmMappedValues.reminderTime ?? null,
      month: crmMappedValues.month ?? null,
      bpmnId: crmMappedValues.bpmnId ?? null,
      processStatusUi: this.mapProcessStatusToHtml(task.processStatus),
    };
  }

  async findOne(id: number, userId?: string): Promise<any> {
    if (userId) {
      await this.ensurePhongBanTaskPermission(userId);
    }
    const task = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.taskUsers', 'taskUsers')
      .leftJoinAndSelect('taskUsers.user', 'tuUser')
      .leftJoinAndSelect('tuUser.parent', 'tuParent')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.updatedBy', 'updatedBy')
      .leftJoin('task.project', 'project')
      .select([
        'task.id',
        'task.name',
        'task.code',
        'task.docId',
        'task.note',
        'task.reminderTime',
        'task.topic',
        'task.startDate',
        'task.endDate',
        'task.parent',
        'task.processStatus',
        'task.priority',
        'task.progress',
        'task.typeTask',
        'task.projectId',
        'task.createdAt',
        'task.updatedAt',
        'task.templateId',
        'task.isApprovalRequired',
        'project.id',
        'project.projectStatus',

        // taskUsers fields used in logic
        'taskUsers.id',
        'taskUsers.role',
        'taskUsers.type',
        'taskUsers.processId',
        'taskUsers.processName',
        'tuUser.id',
        'tuUser.name',
        'tuParent.id',
        'tuParent.name',

        // createdBy
        'createdBy.id',
        'createdBy.name',
        'createdBy.emailUser',
        'createdBy.username',

        // updatedBy
        'updatedBy.id',
        'updatedBy.name',
      ])
      .where('task.id = :id', { id })
      .andWhere('task.status = :status', { status: 1 })
      .getOne();

    if (!task) {
      throw new NotFoundException(`Không tìm thấy công việc với ID ${id}`);
    }

    // =========================
    // Parent task
    // =========================
    let parentName: string | null = null;
    let deadlineStartParent: string | null = null;
    let deadlineEndParent: string | null = null;
    if (task.parent) {
      const parentTask = await this.taskRepository.findOne({
        where: { id: task.parent },
        select: ['name', 'startDate', 'endDate'],
      });
      parentName = parentTask?.name ?? null;
      deadlineStartParent = parentTask?.startDate
        ? dayjs(parentTask.startDate).toISOString()
        : null;
      deadlineEndParent = parentTask?.endDate
        ? dayjs(parentTask.endDate).toISOString()
        : null;
    }

    // =========================
    // Template name
    // =========================
    let templateName: string | null = null;
    if (task.templateId && this.isUuid(task.templateId)) {
      const template = await this.processTemplateRepo.findOne({
        where: { id: task.templateId },
        select: ['name'],
      });
      templateName = template?.name ?? null;
    }
    // task.templateName = templateName;
    // =========================
    // Task detail
    // =========================
    const crmMappedValues = await this.mapCrmTitles(task);
    const taskDetail = this.mapTaskDetail(task, crmMappedValues);

    // =========================
    // BPMN DATA
    // =========================
    let bpmnData: any = {};
    const senderName: string | null = null;
    let receiverName: string | null = null;
    let note: string | null = null;
    const sentAt: string | null = null;
    const typeRequest: string | null = null;
    const hasChildren = (await this.taskRepository.count({ where: { parent: id } })) > 0;
    if (userId) {
      try {
        // [Tối ưu] Chạy song song thay vì tuần tự → giảm latency ~50%
        const [user, userGroups]: [any, any[]] = await Promise.all([
          this.sqlsvRepo.getUserById(userId),
          this.sqlsvRepo.getUserGroups(userId),
        ]);
        if (!user?.parent?.id) {
          throw new BadRequestException(
            'Không xác định được đơn vị người dùng',
          );
        }
        // WorkItems
        // [Tối ưu] Chỉ chọn cột cần thiết thay vì SELECT *
        const workItems = await this.dataSource.query(
          `
          SELECT id, node_id, role, assignee_user_id, state, bpmn_version, node_type
          FROM work_items
          WHERE document_id = @0
            AND assignee_user_id = @1
            AND state = 'open'
          `,
          [String(id), userId],
        );

        // Khởi tạo flags mặc định trước
        const defaultFlags = {
          canInProcess: false,
          canSendAdjust: true,
          canCreateTaskSub: false,
          canExecute: true,
          updateStatus: (taskDetail.directors.some(d => d.processId === userId) || task?.createdBy?.id === userId || taskDetail.assigners.some(d => d.processId === userId)),
          canStatusSucess: !taskDetail.directors.some(d => d.processId === userId),
          canUpdateFolder:
            (taskDetail.directors.some(d => d.processId === userId) ||
              taskDetail.supporters.some(s => s.processId === userId) || task?.createdBy?.id === userId) && (task.processStatus !== '4' && task.processStatus !== '8'),
          canApprove: true,
          canConfirmAdjust: true,
          canUpdate: ((taskDetail.assigners.some(a => a.processId === userId) || task?.createdBy?.id === userId) && task.processStatus !== '4' && task.processStatus !== '8' && task.processStatus !== '3'),
          isSlowReason: false,
          canSucessfull: false
        };

        // Xử lý flags dựa trên roles của user (không phụ thuộc work items)
        const isAssigner = task?.taskUsers?.some(
          (tu: any) =>
            tu.role === 'assigner' &&
            (tu.userId === userId ||
              tu.id === userId ||
              tu.processId === userId),
        );
        const isDirector = task?.taskUsers?.some(
          (tu: any) =>
            tu.role === 'director' &&
            (tu.userId === userId ||
              tu.id === userId ||
              tu.processId === userId),
        );
        const isSupporter = task?.taskUsers?.some(
          (tu: any) =>
            tu.role === 'supporter' &&
            (tu.userId === userId ||
              tu.id === userId ||
              tu.processId === userId),
        );
        // Người tạo, Người giao, Người chủ trì, Người phối hợp đều có thể tạo công việc con
        if ((task?.createdBy?.id === userId || isAssigner || isDirector || isSupporter) && task.processStatus !== '4' && task.processStatus !== '8' && task.processStatus !== '3') {
          defaultFlags.canCreateTaskSub = true;
        }
        if ((isDirector || isAssigner || task?.createdBy?.id === userId) && (task?.processStatus === '2' || task?.processStatus === '1') && !hasChildren) {
          defaultFlags.canInProcess = true;
        }
        if ((isAssigner || isDirector) && task?.processStatus !== '4' && task.processStatus !== '8' && task.processStatus !== '3') {
          defaultFlags.canUpdateFolder = true;
          // defaultFlags.canUpdate = true;
        }
        if ((isAssigner) && task?.processStatus !== '4' && task.processStatus !== '8' && task.processStatus !== '3') {
          // defaultFlags.canUpdateFolder = true;
          defaultFlags.canUpdate = true;
        }
        if ((isDirector || isAssigner || task?.createdBy?.id === userId) && new Date(task?.endDate) < new Date() && task?.processStatus !== '8') {
          defaultFlags.isSlowReason = true
        }

        // Nếu không có work items, trả về flags mặc định và bỏ qua BPMN processing
        if (!workItems || workItems.length === 0 && task.processStatus !== '4' && task.processStatus !== '8') {
          bpmnData = {
            workItem: null,
            availableActions: [],
            flags: defaultFlags,
          };
        } else {
          // Có work items, tiếp tục xử lý BPMN
          const docType = workItems[0].bpmn_version || 'TaskManyUnit';
          const flowConfig = await this.sqlsvRepo.getFlowByUnit(
            String(user.parent.id),
            docType,
          );

          if (!flowConfig) {
            throw new BadRequestException('Đơn vị chưa được cấu hình BPMN');
          }
          const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig?.id);
          if (!bpmnXML) {
            throw new Error('Không tìm thấy BPMN TaskManyUnit');
          }

          const { process, indexes } = await this.getModelFromXml(bpmnXML);
          const userParent = user?.parent?.id;

          let userRoles: string[] = [];
          try {
            const roleInfo = await this.sqlRepo.getUserRole(userId);
            if (roleInfo?.roles) {
              userRoles = roleInfo.roles;
            }
          } catch {
            // ignore
          }

          const audit = await this.sqlRepo.getAudit(String(id));

          const perItems: any[] = [];
          const lastAuditEntry =
            audit && audit.length > 0 ? audit[audit.length - 1] : null;

          if (lastAuditEntry) {
            note = lastAuditEntry.note || null;
            if (lastAuditEntry.receiver) {
              try {
                const u = await this.sqlsvRepo.getUserById(
                  lastAuditEntry.receiver,
                );
                receiverName = u?.name || u?.username || null;
              } catch { }
            }
          }
          for (const wi of workItems) {
            const mappedWi = {
              id: wi.id,
              nodeId: wi.node_id,
              role: wi.role,
              assigneeUserId: wi.assignee_user_id,
              nodeType: wi.node_type || wi.node_type,
            };

            const res = await this.bpmnEngine.computeAvailableActions({
              process,
              indexes,
              currentNodeId: mappedWi.nodeId,
              workItem: mappedWi,
              document: { ...task, bookDocumentId: null, isIncomming: false },
              userId,
              userRoles,
              getUsersByRole: (role) =>
                this.sqlsvRepo.getUsersByRoleMongoDB(role),
              audit,
              userParent,
            });

            if (
              lastAuditEntry &&
              ((lastAuditEntry.actionCode === stageStatusDoc.PHE_DUYET_DIEU_CHINH) ||
                (lastAuditEntry.actionCode === stageStatusDoc.DONG_Y_DIEU_CHINH))
            ) {
              // Tìm flow "Xác nhận điều chỉnh" động
              const outs = indexes.outgoingBySource.get(mappedWi.nodeId) || [];

              if (outs && outs.length > 0) {
                // const { node: nextNode } =
                //   this.bpmnEngine.nextInteractiveFromFlow(outs, indexes);

                // const targetRole = nextNode
                //   ? indexes.laneMap.get(nextNode.id)
                //   : undefined;

                res.availableActions = [
                  {
                    ...actionCatalog.actions.XAC_NHAN_DIEU_CHINH,
                    code: 'GIAO_VIEC',
                    flowId: outs[0].id,
                    // targetRole,
                    canExecute: true,
                  },
                ];
              } else {
                // Không tìm được flow thì KHÔNG CHO ACTION NÀO
                res.availableActions = [];
              }
            }

            // Logic này chạy sau khi computeAvailableActions hoặc override
            if (res.availableActions && res.availableActions.length > 0) {
              const isApprovalRequired = task.isApprovalRequired ?? false;
              const hasSameAssignerAndDirector = taskDetail.assigners.some(
                (a) =>
                  a.processId &&
                  taskDetail.directors.some((d) => d.processId === a.processId),
              );

              if (hasSameAssignerAndDirector) {
                res.availableActions = res.availableActions.filter(
                  (a: any) =>
                    a.code !== 'GUI_PHE_DUYET' &&
                    a.code !== 'CHO_PHE_DUYET' &&
                    a.code !== 'GUI_DIEU_CHINH' &&
                    a.type !== 'approvetaskformdoc',
                );
              } else if (isApprovalRequired) {
                // Nếu cần phê duyệt -> Ẩn "Hoàn thành" (HOAN_THANH)
                res.availableActions = res.availableActions.filter(
                  (a: any) => a.code !== 'HOAN_THANH',
                );
              } else {
                // Nếu KHÔNG cần phê duyệt -> Ẩn "Gửi phê duyệt" (GUI_PHE_DUYET)
                res.availableActions = res.availableActions.filter(
                  (a: any) => a.code !== 'GUI_PHE_DUYET' && a.code !== 'CHO_PHE_DUYET',
                );
              }
              const outs = indexes.outgoingBySource.get(mappedWi.nodeId) || [];

              if (outs && outs.length > 0) {
                const firstFlow = outs[0];
                const flowExtProps = this.bpmnEngine.getFlowExtensionProperties(firstFlow);

                // Nếu flow KHÔNG có flagAllowAction = 'true' → xóa tất cả actions
                if (!flowExtProps?.flagInTask || flowExtProps.flagInTask !== 'true') {
                  res.availableActions = [];
                }
              }
            }

            perItems.push({
              workItem: mappedWi,
              node: res.node,
              availableActions: res.availableActions,
            });
          }

          // =========================
          // Build BPMN Result (3 FLAGS)
          // =========================
          bpmnData = (() => {
            let workItem = null;
            let availableActions: any[] = [];

            // Khởi tạo flags từ defaultFlags
            const flags = { ...defaultFlags };

            // Then, update flags based on user's work items
            for (const item of perItems) {
              // lấy workItem đầu tiên có thể execute
              if (
                !workItem &&
                item.availableActions?.some((a: any) => a.canExecute)
              ) {
                workItem = item.workItem;
                availableActions = item.availableActions;
              }

              const nodeName = item.node?.name;
              const workItemRole = item.workItem?.role;

              const flagCheck = indexes?.nodes.get(item.workItem?.nodeId);
              if (flagCheck?.incoming?.[0]?.targetRef) {
                const check = getAllNodeExtensionProperties(
                  flagCheck.incoming[0].targetRef,
                );
                // New logic for canUpdateFolder
                if (check?.flagUpdateFolder === 'true' && task.processStatus !== '4') {
                  flags.canUpdateFolder = true;
                }
                if (check?.canSucessfull) {
                  flags.canSucessfull = true;
                }
                if (check?.canInProcess === 'true' && !hasChildren) {
                  flags.canInProcess = true;
                }
                if (check?.flagCreateSubTask === 'true') {
                  flags.canCreateTaskSub = true;
                  const groupCodes = userGroups?.map((g) => g.code) || [];
                  const LEADERS = ['tonggd', 'phodgtongcty'];
                  const directors: any[] = taskDetail.directors || [];
                  const isUnit = directors.some(
                    (d) => d.type === TaskUserType.DEPARTMENT,
                  );
                  if (groupCodes.some((c) => LEADERS.includes(c)) && isUnit) {
                    if (check?.typeBpmn) {
                      (flags as any).createUrl = check.typeBpmn;
                    }
                  }
                }
              }

              if (
                audit &&
                lastAuditEntry &&
                ((lastAuditEntry.actionCode === stageStatusDoc.PHE_DUYET_DIEU_CHINH) ||
                  (lastAuditEntry.actionCode === stageStatusDoc.DONG_Y_DIEU_CHINH))
              ) {
                flags.canUpdateFolder = true;
                flags.canUpdate = true;
              }
            }

            if (
              availableActions.some((a: any) =>
                a?.canExecute &&
                (a.code === 'HOAN_THANH' || a.type === 'tasksucessfull')
              )
            ) {
              flags.canSucessfull = true;
            }

            return {
              workItem,
              availableActions,
              flags,
            };
          })();
        }
      } catch (error) {
        console.error('Error in findOne BPMN processing:', error);
      }
    }
    // let toBook: string | null = null;
    let docInfo: {
      toBook: string;
      documentDate: string;
      abstractNote: string;
    } | null = null;

    if (task.docId) {
      const doc = await this.dataSource
        .createQueryBuilder()
        .select(['to_book', 'document_date', 'abstract_note'])
        .from('incomming_documents', 'idoc')
        .where('idoc.document_id = :docId', { docId: task.docId })
        .getRawOne();

      docInfo = doc
        ? {
          toBook: doc.to_book,
          documentDate: doc.document_date,
          abstractNote: doc.abstract_note,
        }
        : null;
    }

    // =========================
    // RESPONSE
    // =========================
    const progressView = buildProgressView(task);
    const returnedValue = {
      ...taskDetail,
      templateName,
      templateId: task.templateId,
      typeTask: this.TYPE_TASK_VN[task.typeTask] || task.typeTask, // map luôn
      docId: task.docId,
      toBook: docInfo?.toBook ?? null,
      documentDate: docInfo?.documentDate ?? null, // <-- thêm trường mới
      abstractNote: docInfo?.abstractNote ?? null,
      summary: [docInfo?.toBook, docInfo?.abstractNote]
        .filter(Boolean)
        .join(' - '),
      sender: senderName,
      receiver: receiverName,
      // note: note,
      dateSent: sentAt,
      typeRequest,
      parentName,
      deadlineStartParent,
      deadlineEndParent,
      progressColor: progressView.color,
      progressStatus: progressView.status,
      isDeadlineExceeded: progressView.isDeadlineExceeded,
      ...bpmnData,
      flags: {
        ...(bpmnData.flags || {}),
        hasChildren,
        canCreateTaskSub: progressView.status === 'OVERDUE' ? false : (bpmnData.flags?.canCreateTaskSub ?? false),
      },
    };

    if (task.projectId) {
      const project = await this.dataSource.getRepository(ProjectEntity).findOne({
        where: { id: task.projectId, status: 1 },
        select: ['projectStatus']
      });
      if (project) {
        const pStatus = project.projectStatus;
        if (pStatus === 3 || pStatus === 4) {
          returnedValue.flags = {
            ...returnedValue.flags,
            canInProcess: false,
            canSendAdjust: false,
            canCreateTaskSub: false,
            canExecute: false,
            updateStatus: false,
            canUpdateFolder: false,
            canApprove: false,
            canConfirmAdjust: false,
            canUpdate: false,
            isSlowReason: false,
            canSucessfull: false,
          };
          returnedValue.availableActions = [];
        } else if (pStatus === 5) {
          returnedValue.flags = {
            ...returnedValue.flags,
            canCreateTaskSub: false,
          };
        }
      }
    }

    // Thêm thông tin công việc cha nếu là công việc con
    returnedValue.deadlineStartParent = deadlineStartParent;
    returnedValue.deadlineEndParent = deadlineEndParent;
    returnedValue.deadlineStartParentISO = deadlineStartParent;
    returnedValue.deadlineEndParentISO = deadlineEndParent;

    return returnedValue;
  }

  async findOneSent(
    id: number,
    userId?: string,
    auditId?: number
  ): Promise<any> {
    // Reuse logic from approve
    const result = await this.findOneApprove(id, userId);

    const receiverName: string | null = null;
    let dateSent: string | null = null;
    const noteSent: string | null = null;
    const rejectionReason: string | null = null;
    let rejectionDate: string | null = null;

    if (!userId) return result;

    const audit = await this.sqlRepo.getAudit(String(id));
    if (!Array.isArray(audit) || audit.length === 0) return result;

    const sortedAudit = [...audit].sort(
      (a, b) =>
        new Date(a.createdAt || a.time).getTime() -
        new Date(b.createdAt || b.time).getTime()
    );

    const sendActionCodes = [
      stageStatusDoc.GUI_PHE_DUYET,
      stageStatusDoc.DIEU_CHINH,
      stageStatusDoc.GUI_DIEU_CHINH,
    ];

    const rejectionActionCodes = [
      stageStatusDoc.TU_CHOI,
      stageStatusDoc.TU_CHOI_PHE_DUYET,
    ];

    let sendAudit: any = null;
    let responseAudit: any = null;

    // =========================
    // 1. XÁC ĐỊNH SEND AUDIT
    // =========================
    if (auditId) {
      const sendIndex = sortedAudit.findIndex(
        (a) => Number(a.id) === Number(auditId)
      );

      if (sendIndex !== -1) {
        sendAudit = sortedAudit[sendIndex];

        // 👉 auditId đúng tại index tìm được
        const exactAuditId = sortedAudit[sendIndex].id;

        responseAudit = sortedAudit[sendIndex + 1] || null;
      }
    }
    else {
      // Latest sent
      sendAudit = [...sortedAudit]
        .reverse()
        .find((a) => sendActionCodes.includes(a.actionCode));

      if (sendAudit) {
        const sendIndex = sortedAudit.findIndex(
          (a) => a.id === sendAudit.id
        );

        if (sendIndex !== -1) {
          const nextAudit = sortedAudit[sendIndex + 1];
          if (
            nextAudit &&
            rejectionActionCodes.includes(nextAudit.actionCode)
          ) {
            responseAudit = nextAudit;
          }
        }
      }
    }

    if (!sendAudit) return result;

    // =========================
    // 2. MAP THÔNG TIN SEND
    // =========================
    result.dateSent = sendAudit.updatedAt || sendAudit.time;
    result.typeRequest = buildTypeRequestView(sendAudit.actionCode).html;
    result.typeRequestText = sendAudit.actionCode;

    dateSent = result.dateSent;
    result.noteSent = sendAudit?.details?.note || null;

    if (
      responseAudit &&
      rejectionActionCodes.includes(responseAudit.actionCode)
    ) {
      result.rejectionReason = responseAudit?.details?.note || null;
      rejectionDate = responseAudit.updatedAt || responseAudit.time;
    }

    // Receiver
    if (sendAudit.receiver) {
      try {
        const u = await this.sqlsvRepo.getUserById(sendAudit.receiver);
        result.receiver = u?.name || u?.username || null;
      } catch { }
    }

    // =========================
    // 3. PROCESS STATUS (QUAN TRỌNG)
    // =========================
    if (auditId) {
      const currentIndex = sortedAudit.findIndex(
        (a) => Number(a.id) === Number(auditId)
      );

      if (currentIndex !== -1) {
        const currentAudit = sortedAudit[currentIndex];
        const nextAudit = sortedAudit[currentIndex + 1];

        result.processStatus = buildApprovalStatusView(
          nextAudit?.actionCode || currentAudit.actionCode
        ).html;
      } else {
        result.processStatus = buildApprovalStatusView('pending').html;
      }
    } else {
      const lastAudit = sortedAudit[sortedAudit.length - 1];
      result.processStatus = buildApprovalStatusView(
        lastAudit?.actionCode || 'pending'
      ).html;
    }

    // =========================
    // 4. NEXT ACTION CODE
    // =========================
    const sendIndex = sortedAudit.findIndex(
      (a) => a.id === sendAudit.id
    );

    if (sendIndex !== -1 && sendIndex < sortedAudit.length - 1) {
      result.nextAuditActionCode =
        sortedAudit[sendIndex + 1].actionCode;
    } else {
      result.nextAuditActionCode = null;
    }

    // =========================
    // 5. FILES
    // =========================
    if (
      sendAudit.details?.currentFileIds &&
      Array.isArray(sendAudit.details.currentFileIds)
    ) {
      try {
        const fileIds = sendAudit.details.currentFileIds.map((id) =>
          Number(id)
        );

        const filesDetail =
          await this.filesRepository.getFilesByIdsFull(
            fileIds,
            userId
          );

        result.files = filesDetail.map((row: any) => {
          const isParentTask =
            String(row.object_id) === String(id);

          return {
            ...row,
            from_task: row.task_name
              ? `${row.task_code || ''} - ${row.task_name}`
              : null,
            from_source: isParentTask
              ? row.created_by_name || 'Không xác định'
              : row.task_name || 'Không xác định',
            source_type: isParentTask ? 'person' : 'task',
            is_uploader:
              userId &&
              row.created_by &&
              String(row.created_by) === String(userId),
          };
        });
      } catch (e) {
        console.error('Error fetching files for sent task:', e);
      }
    }

    return result;
  }


  // async findOneSent(id: number, userId?: string, auditId?: number): Promise<any> {
  //   // Reuse findOneApprove logic as base since it gets most details
  //   // But we might need to adjust sender/receiver mapping
  //   const result = await this.findOneApprove(id, userId);

  //   // For "Sent" items, the viewer (userId) is likely the sender
  //   // We want to see who received it.
  //   // We can try to extract receiver from audit if available, or current assignees.
  //   let receiverName: string | null = null;
  //   let dateSent: string | null = null;
  //   let noteSent: string | null = null;
  //   let rejectionReason: string | null = null;
  //   let rejectionDate: string | null = null;

  //   if (userId) {
  //     const audit = await this.sqlRepo.getAudit(String(id));
  //     if (Array.isArray(audit) && audit.length > 0) {
  //       // Logic for "Sent" items: Use the Send action to identify receiver (same as list)
  //       // We ensure we look for the latest audit that matches a SEND type action
  //       const sendActionCodes = [stageStatusDoc.GUI_PHE_DUYET, stageStatusDoc.DIEU_CHINH, stageStatusDoc.GUI_DIEU_CHINH];

  //       let sendAudit: any = null;
  //       let responseAudit: any = null;

  //       const sortedAudit = [...audit].sort((a, b) => new Date(a.createdAt || a.time).getTime() - new Date(b.createdAt || b.time).getTime());

  //       if (auditId) {
  //         // If specific auditId is requested (History view)
  //         const sendIndex = sortedAudit.findIndex(a => Number(a.id) === Number(auditId));
  //         if (sendIndex !== -1) {
  //           sendAudit = sortedAudit[sendIndex];
  //           // Find the next action which acts as the response (if any)
  //           if (sendIndex < sortedAudit.length - 1) {
  //             responseAudit = sortedAudit[sendIndex + 1];
  //           }
  //         }
  //       } else {
  //         // Default: Latest Sent action
  //         // Find the latest audit that is a Send Action
  //         sendAudit = [...sortedAudit].reverse().find(a => sendActionCodes.includes(a.actionCode));

  //         // And find any latest rejection for legacy reasons or global status
  //         // However, for consistency, we should probably look at the response to THIS sendAudit?
  //         // But existing logic seemed to look for ANY rejection. Let's keep it robust.
  //         const rejectionActionCodes = [stageStatusDoc.TU_CHOI, stageStatusDoc.TU_CHOI_PHE_DUYET];
  //         const latestRejection = [...sortedAudit].reverse().find(a => rejectionActionCodes.includes(a.actionCode));
  //         if (latestRejection) {
  //           // Only if the rejection is AFTER the sendAudit?
  //           if (sendAudit && new Date(latestRejection.createdAt).getTime() > new Date(sendAudit.createdAt).getTime()) {
  //             responseAudit = latestRejection;
  //           }
  //         }
  //       }

  //       if (sendAudit) {
  //         result.dateSent = sendAudit.updatedAt || sendAudit.time;
  //         result.typeRequest = buildTypeRequestView(sendAudit.actionCode).html;
  //         result.typeRequestText = sendAudit.actionCode;
  //         dateSent = sendAudit.updatedAt || sendAudit.time;
  //         noteSent = sendAudit?.details?.note || null;

  //         // Process Status based on Response
  //         if (auditId && responseAudit) {
  //           result.processStatus = buildApprovalStatusView(responseAudit.actionCode).html;
  //         } else if (auditId && !responseAudit) {
  //           // If viewing history and no response next, it is pending
  //           // Unless it is the LAST action, then usage result.processStatus from findOneApprove might be correct?
  //           // No, safely assume Pending-like status of the Send action itself
  //           result.processStatus = buildApprovalStatusView(sendAudit.actionCode).html;
  //         }
  //         // If !auditId (latest view), findOneApprove already set processStatus based on LATEST audit of the task, which is correct.

  //         if (responseAudit && [stageStatusDoc.TU_CHOI, stageStatusDoc.TU_CHOI_PHE_DUYET].includes(responseAudit.actionCode)) {
  //           rejectionReason = responseAudit?.details?.note || null;
  //           rejectionDate = responseAudit.updatedAt || responseAudit.time;
  //         }

  //         if (sendAudit.receiver) {
  //           try {
  //             const u = await this.sqlsvRepo.getUserById(sendAudit.receiver);
  //             result.receiver = u?.name || u?.username || null;
  //           } catch { }
  //         }

  //         // Calculate nextAuditActionCode
  //         const sendIndex = sortedAudit.findIndex(a => a.id === sendAudit.id);
  //         if (sendIndex !== -1 && sendIndex < sortedAudit.length - 1) {
  //           result.nextAuditActionCode = sortedAudit[sendIndex + 1].actionCode;
  //         } else {
  //           result.nextAuditActionCode = null;
  //         }

  //         if (sendAudit.details?.currentFileIds && Array.isArray(sendAudit.details.currentFileIds)) {
  //           try {
  //             const fileIds = sendAudit.details.currentFileIds.map((id) => Number(id));
  //             const filesDetail = await this.filesRepository.getFilesByIdsFull(fileIds, userId);

  //             const mappedFiles = filesDetail.map((row: any) => {
  //               const isParentTask = String(row.object_id) === String(id);
  //               return {
  //                 ...row,
  //                 from_task: row.task_name ? `${row.task_code || ''} - ${row.task_name}` : null,
  //                 // Trường tổng hợp: Nếu task cha → người tải, nếu task con → tên task
  //                 from_source: isParentTask
  //                   ? (row.created_by_name || 'Không xác định')
  //                   : (row.task_name || 'Không xác định'),
  //                 // Trường phân biệt loại nguồn
  //                 source_type: isParentTask ? 'person' : 'task',
  //                 is_uploader: userId && row.created_by && String(row.created_by) === String(userId) ? true : false,
  //               };
  //             });

  //             result.files = mappedFiles;
  //           } catch (e) {
  //             console.error('Error fetching files for sent task:', e);
  //           }
  //         }
  //       }


  //       const lastAudit = sortedAudit[sortedAudit.length - 1];
  //       // processStatus always shows the latest status from audit
  //       result.processStatus = buildApprovalStatusView(lastAudit.actionCode || 'pending').html;
  //     }
  //   }

  //   return {
  //     ...result,
  //     sender: result.sender, // Keep existing sender logic or override?
  //     // If the user viewed this, they are the viewer.
  //     // In findOneApprove, 'sender' is who sent it TO the viewer.
  //     // In findOneSent, we might want 'receiver' to be prominent.
  //     receiver: receiverName || result.receiver,
  //     dateSent: dateSent || result.dateSent,
  //     noteSent: noteSent || result.noteSent,
  //     rejectionReason: rejectionReason || result.rejectionReason,
  //     rejectionDate: rejectionDate // Add rejection date to help user distinguish details
  //   };
  // }
  async findOneApprove(id: number, userId?: string): Promise<any> {
    const task = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.taskUsers', 'taskUsers')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.updatedBy', 'updatedBy')
      .select([
        'task.id',
        'task.name',
        'task.code',
        'task.docId',
        'task.typeTask',
        'task.note',
        'task.reminderTime',
        'task.topic',
        'task.startDate',
        'task.endDate',
        'task.parent',
        'task.processStatus',
        'task.priority',
        'task.progress',
        'task.createdAt',
        'task.updatedAt',
        'task.isApprovalRequired',

        // taskUsers fields used in logic
        'taskUsers.id',
        'taskUsers.role',
        'taskUsers.type',
        'taskUsers.processId',
        'taskUsers.processName',

        // createdBy
        'createdBy.id',
        'createdBy.name',
        'createdBy.emailUser',
        'createdBy.username',

        // updatedBy
        'updatedBy.id',
        'updatedBy.name',
      ])
      .where('task.id = :id', { id })
      .andWhere('task.status = :status', { status: 1 })
      .getOne();

    if (!task) {
      throw new NotFoundException(`Không tìm thấy công việc với ID ${id}`);
    }

    // =========================
    // Parent task
    // =========================
    let parentName: string | null = null;
    if (task.parent) {
      const parentTask = await this.taskRepository.findOne({
        where: { id: task.parent },
        select: ['name'],
      });
      parentName = parentTask?.name ?? null;
    }

    // =========================
    // Task detail
    // =========================
    const crmMappedValues = await this.mapCrmTitles(task);
    const taskDetail = this.mapTaskDetail(task, crmMappedValues);

    // =========================
    // BPMN DATA
    // =========================
    let bpmnData: any = {};
    let senderName: string | null = null;
    let sentAt: string | null = null;
    let typeRequest: string | undefined = undefined;
    let typeRequestCode: string | undefined = undefined;
    let noteSent: string | null = null;
    let rejectionReason: string | null = null;
    let processStatusHtml: string | undefined = undefined;
    if (userId) {
      try {
        const user: any = await this.sqlsvRepo.getUserById(userId);
        if (!user?.parent?.id) {
          throw new BadRequestException(
            'Không xác định được đơn vị người dùng',
          );
        }
        const workItems = await this.dataSource.query(
          `
          SELECT *
          FROM work_items
          WHERE document_id = @0
            AND assignee_user_id = @1
            AND state = 'open'
          `,
          [String(id), userId],
        );

        const docType = workItems[0]?.bpmn_version ?? 'TaskManyUnit';
        const flowConfig = await this.sqlsvRepo.getFlowByUnit(
          String(user.parent.id),
          docType,
        );

        if (!flowConfig) {
          throw new BadRequestException('Đơn vị chưa được cấu hình BPMN');
        }
        const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig?.id);
        if (!bpmnXML) {
          throw new Error('Không tìm thấy BPMN TaskManyUnit');
        }

        const { process, indexes } = await this.getModelFromXml(bpmnXML);
        const userParent = user?.parent?.id;

        let userRoles: string[] = [];
        const hasChildren = (await this.taskRepository.count({ where: { parent: id } })) > 0;
        try {
          const roleInfo = await this.sqlRepo.getUserRole(userId);
          if (roleInfo?.roles) {
            userRoles = roleInfo.roles;
          }
        } catch {
          // ignore
        }
        const audit = await this.sqlRepo.getAudit(String(id));

        if (Array.isArray(audit)) {
          typeRequest = audit.find((a) => a.actionCode === 'GUI_PHE_DUYET')
            ? 'Phê duyệt kết quả'
            : audit.find((a) => a.actionCode === 'DIEU_CHINH')
              ? 'Điều chỉnh thông tin'
              : undefined;
          const sendActionCodes = [stageStatusDoc.GUI_PHE_DUYET, stageStatusDoc.DIEU_CHINH, stageStatusDoc.GUI_DIEU_CHINH];
          const rejectionActionCodes = [stageStatusDoc.TU_CHOI, stageStatusDoc.TU_CHOI_PHE_DUYET];

          const approveAudit = [...audit]
            .filter((a) => sendActionCodes.includes(a.actionCode))
            .sort(
              (a, b) =>
                new Date(b.createdAt || b.time).getTime() -
                new Date(a.createdAt || a.time).getTime(),
            )[0];

          const rejectionAudit = [...audit]
            .filter((a) => rejectionActionCodes.includes(a.actionCode))
            .sort(
              (a, b) =>
                new Date(b.createdAt || b.time).getTime() -
                new Date(a.createdAt || a.time).getTime(),
            )[0];

          if (rejectionAudit) {
            rejectionReason = rejectionAudit.note || null;
          }

          if (approveAudit) {
            sentAt = approveAudit.updatedAt || approveAudit.time;
            typeRequestCode = approveAudit.actionCode;
            typeRequest = buildTypeRequestView(typeRequestCode).html;
            noteSent = approveAudit?.details?.note || null;

            // ưu tiên displayName trong audit
            if (approveAudit.displayName) {
              senderName = approveAudit.displayName;
            } else if (approveAudit.userId) {
              // fallback: lấy tên user từ DB
              try {
                const sender = await this.sqlsvRepo.getUserById(
                  approveAudit.userId,
                );
                senderName = sender?.name || sender?.username || null;
              } catch {
                senderName = null;
              }
            }
          }
        }
        const perItems: any[] = [];
        const lastAuditEntry =
          audit && audit.length > 0 ? audit[audit.length - 1] : null;
        processStatusHtml = buildApprovalStatusView(lastAuditEntry?.actionCode || 'pending').html;
        for (const wi of workItems) {
          const mappedWi = {
            id: wi.id,
            nodeId: wi.node_id,
            role: wi.role,
            assigneeUserId: wi.assignee_user_id,
            nodeType: wi.node_type || wi.node_type,
          };

          const res = await this.bpmnEngine.computeAvailableActions({
            process,
            indexes,
            currentNodeId: mappedWi.nodeId,
            workItem: mappedWi,
            document: { ...task, bookDocumentId: null, isIncomming: false },
            userId,
            userRoles,
            getUsersByRole: (role) =>
              this.sqlsvRepo.getUsersByRoleMongoDB(role),
            audit,
            userParent,
          });

          /** =========================
           *  OVERRIDE ACTIONS KHI PHE_DUYET_DIEU_CHINH
           * ========================= */
          if (
            lastAuditEntry &&
            lastAuditEntry.actionCode === stageStatusDoc.PHE_DUYET_DIEU_CHINH
          ) {
            // Tìm flow "Xác nhận điều chỉnh" động
            const outs = indexes.outgoingBySource.get(mappedWi.nodeId) || [];

            if (outs && outs.length > 0) {
              const { node: nextNode } =
                this.bpmnEngine.nextInteractiveFromFlow(outs, indexes);

              const targetRole = nextNode
                ? indexes.laneMap.get(nextNode.id)
                : undefined;

              res.availableActions = [
                {
                  ...actionCatalog.actions.XAC_NHAN_DIEU_CHINH,
                  code: 'GIAO_VIEC',
                  flowId: outs[0].id,
                  targetRole,
                  canExecute: true,
                },
              ];
            } else {
              // Không tìm được flow thì KHÔNG CHO ACTION NÀO
              res.availableActions = [];
            }
          }

          // Logic này chạy sau khi computeAvailableActions hoặc override
          if (res.availableActions && res.availableActions.length > 0) {
            const isApprovalRequired = task.isApprovalRequired ?? false;
            const hasSameAssignerAndDirector = taskDetail.assigners.some(
              (a) =>
                a.processId &&
                taskDetail.directors.some((d) => d.processId === a.processId),
            );

            if (hasSameAssignerAndDirector) {
              res.availableActions = res.availableActions.filter(
                (a: any) =>
                  a.code !== 'GUI_PHE_DUYET' &&
                  a.code !== 'CHO_PHE_DUYET' &&
                  a.code !== 'GUI_DIEU_CHINH' &&
                  a.type !== 'approvetaskformdoc',
              );
            } else if (isApprovalRequired) {
              // Nếu cần phê duyệt -> Ẩn các hành động "Hoàn thành" (có flags = canSucessfull)
              res.availableActions = res.availableActions.filter(
                (a: any) => a.code !== 'HOAN_THANH',
              );
            } else {
              // Nếu KHÔNG cần phê duyệt -> Ẩn hành động "Gửi phê duyệt"
              res.availableActions = res.availableActions.filter(
                (a: any) =>
                  a.code !== 'GUI_PHE_DUYET' &&
                  a.code !== 'CHO_PHE_DUYET' &&
                  a.type !== 'approvetaskformdoc',
              );
            }

            const outs = indexes.outgoingBySource.get(mappedWi.nodeId) || [];
            if (outs && outs.length > 0) {
              const firstFlow = outs[0];
              const flowExtProps = this.bpmnEngine.getFlowExtensionProperties(firstFlow);

              // Nếu flow KHÔNG có flagAllowAction = 'true' → xóa tất cả actions
              if (flowExtProps?.flagInTask === 'true') {
                res.availableActions = [];
              }
            }
          }

          perItems.push({
            workItem: mappedWi,
            node: res.node,
            availableActions: res.availableActions,
          });
        }

        // =========================
        // Build BPMN Result (3 FLAGS)
        // =========================
        bpmnData = (() => {
          let workItem = null;
          let availableActions: any[] = [];

          // Initialize flags based on task properties first
          const flags = {
            canInProcess: false,
            canSendAdjust: true,
            canCreateTaskSub: false,
            canExecute: true,
            canUpdateFolder:
              taskDetail.directors.length === 0 &&
              taskDetail.supporters.length === 0,
            canApprove: true,
            canUpdate: taskDetail.directors.length === 0,
            canSucessfull: false,
          };

          // Then, update flags based on user's work items
          for (const item of perItems) {
            // lấy workItem đầu tiên có thể execute
            if (
              !workItem &&
              item.availableActions?.some((a: any) => a.canExecute)
            ) {
              workItem = item.workItem;
              availableActions = item.availableActions;
            }

            const nodeName = item.node?.name;
            const workItemRole = item.workItem?.role;

            const flagCheck = indexes?.nodes.get(item.workItem?.nodeId);
            const check = getAllNodeExtensionProperties(
              flagCheck.incoming[0].targetRef,
            );
            // New logic for canUpdateFolder
            if (check?.flagUpdateFolder === 'true' && task.processStatus !== '4') {
              flags.canUpdateFolder = true;
            }
            if (check?.canSucessfull === 'true') {
              flags.canSucessfull = true;
            }
            if (check?.canInProcess === 'true') {
              flags.canInProcess = true;
            }
            if (
              audit &&
              lastAuditEntry &&
              lastAuditEntry.actionCode === stageStatusDoc.PHE_DUYET_DIEU_CHINH
            ) {
              flags.canUpdateFolder = true;
              flags.canUpdate = true;
            }
          }

          if (task?.createdBy?.id === userId) {
            flags.canCreateTaskSub = true;
          }
          const isAssigner = task?.taskUsers?.some(
            (tu: any) =>
              tu.role === 'assigner' &&
              (tu.userId === userId ||
                tu.id === userId ||
                tu.processId === userId),
          );
          const isDirector = task?.taskUsers?.some(
            (tu: any) =>
              tu.role === 'director' &&
              (tu.userId === userId ||
                tu.id === userId ||
                tu.processId === userId),
          );
          if ((isDirector || isAssigner) && task?.processStatus !== '4') {
            flags.canInProcess = true;
          }
          if (isAssigner) {
            flags.canUpdateFolder = true;
            flags.canUpdate = true;
          }

          if (
            availableActions.some((a: any) =>
              a?.canExecute &&
              (a.code === 'HOAN_THANH' || a.type === 'tasksucessfull')
            )
          ) {
            flags.canSucessfull = true;
          }

          return {
            workItem,
            availableActions,
            flags,
          };
        })();
      } catch (error) {
        console.error('Error in findOne BPMN processing:', error);
      }
    }
    // let toBook: string | null = null;
    let docInfo: {
      toBook: string;
      documentDate: string;
      abstractNote: string;
    } | null = null;

    if (task.docId) {
      const doc = await this.dataSource
        .createQueryBuilder()
        .select(['to_book', 'document_date', 'abstract_note'])
        .from('incomming_documents', 'idoc')
        .where('idoc.document_id = :docId', { docId: task.docId })
        .getRawOne();

      docInfo = doc
        ? {
          toBook: doc.to_book,
          documentDate: doc.document_date,
          abstractNote: doc.abstract_note,
        }
        : null;
    }

    const typeTaskView = buildTypeTaskView(task.typeTask);

    // =========================
    // RESPONSE
    // =========================
    return {
      ...taskDetail,
      processStatus: processStatusHtml || taskDetail.processStatus,
      typeTask: typeTaskView.html, // map luôn
      typeTaskText: task.typeTask,
      docId: task.docId,
      toBook: docInfo?.toBook ?? null,
      documentDate: docInfo?.documentDate ?? null, // <-- thêm trường mới
      abstractNote: docInfo?.abstractNote ?? null,
      summary: [docInfo?.toBook, docInfo?.abstractNote]
        .filter(Boolean)
        .join(' - '),
      sender: senderName,
      dateSent: sentAt,
      typeRequestText: typeRequestCode,
      typeRequest: typeRequest,
      noteSent: noteSent,
      rejectionReason: rejectionReason,
      parentName,
      ...bpmnData,
      // flags: {
      //   ...(bpmnData.flags || {}),
      //   hasChildren: (await this.taskRepository.count({ where: { parent: id } })) > 0,
      // },
    };
  }

  async findOneFormDoc(id: number, userId?: string): Promise<any> {
    const task = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.taskUsers', 'taskUsers')
      .leftJoinAndSelect('taskUsers.user', 'tuUser')
      .leftJoinAndSelect('tuUser.parent', 'tuParent')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.updatedBy', 'updatedBy')
      .select([
        'task.id',
        'task.name',
        'task.code',
        'task.docId',
        'task.startDate',
        'task.endDate',
        'task.parent',
        'task.processStatus',
        'task.priority',
        'task.note',
        'task.reminderTime',
        'task.progress',
        'task.createdAt',
        'task.updatedAt',
        'task.templateId',
        'task.isApprovalRequired',

        // taskUsers fields used in logic
        'taskUsers.id',
        'taskUsers.role',
        'taskUsers.type',
        'taskUsers.processId',
        'taskUsers.processName',
        'tuUser.id',
        'tuUser.name',
        'tuParent.id',
        'tuParent.name',

        // createdBy
        'createdBy.id',
        'createdBy.name',
        'createdBy.emailUser',
        'createdBy.username',

        // updatedBy
        'updatedBy.id',
        'updatedBy.name',
      ])
      .where('task.id = :id', { id })
      .andWhere('task.status = :status', { status: 1 })
      .getOne();

    if (!task) {
      throw new NotFoundException(`Không tìm thấy công việc với ID ${id}`);
    }

    // =========================
    // Parent task
    // =========================
    let parentName: string | null = null;
    let deadlineStartParent: string | null = null;
    let deadlineEndParent: string | null = null;
    if (task.parent) {
      const parentTask = await this.taskRepository.findOne({
        where: { id: task.parent },
        select: ['name', 'startDate', 'endDate'],
      });
      parentName = parentTask?.name ?? null;
      deadlineStartParent = parentTask?.startDate
        ? dayjs(parentTask.startDate).toISOString()
        : null;
      deadlineEndParent = parentTask?.endDate
        ? dayjs(parentTask.endDate).toISOString()
        : null;
    }

    // =========================
    // Task detail
    // =========================
    const crmMappedValues = await this.mapCrmTitles(task);
    const taskDetail = this.mapTaskDetail(task, crmMappedValues);

    // =========================
    // BPMN DATA
    // =========================
    let bpmnData: any = {};
    const senderName: string | null = null;
    const sentAt: string | null = null;
    const typeRequest: string | null = null;
    if (userId) {
      try {
        const user: any = await this.sqlsvRepo.getUserById(userId);
        if (!user?.parent?.id) {
          throw new BadRequestException(
            'Không xác định được đơn vị người dùng',
          );
        }

        // WorkItems
        const workItems = await this.dataSource.query(
          `
          SELECT *
          FROM work_items
          WHERE document_id = @0
            AND assignee_user_id = @1
            AND state = 'open'
          `,
          [String(id), userId],
        );
        // Khởi tạo flags mặc định trước
        const defaultFlags = {
          canInProcessFromDoc: false,
          canInProcess: false,
          canSendAdjustFromDoc: true,
          canConfirmAdjustFromDoc: true,
          canCreateTaskSub: false,
          canCreateTaskSubFromDoc: false,
          canAgreeFromDoc: true,
          canRejectFromDoc: true,
          canExecuteFromDoc: true,
          updateStatus: (taskDetail.directors.some(d => d.processId === userId) || task?.createdBy?.id === userId || taskDetail.assigners.some(d => d.processId === userId)),
          canStatusSucess: !taskDetail.directors.some(d => d.processId === userId),
          canUpdateFolderFromDoc:
            ((taskDetail.directors.length === 0 &&
              taskDetail.supporters.length === 0) || task?.createdBy?.id === userId) && (task.processStatus !== '4' && task.processStatus !== '8'),
          canApproveFromDoc: true,
          canUpdateFromDoc: ((taskDetail.directors.length === 0 || task?.createdBy?.id === userId) && task.processStatus !== '4' && task.processStatus !== '8' && task.processStatus !== '3'),
          isSlowReason: false
        };

        const hasChildren = (await this.taskRepository.count({ where: { parent: id } })) > 0;

        // Xử lý flags dựa trên roles của user (không phụ thuộc work items)
        const isAssigner = task?.taskUsers?.some(
          (tu: any) =>
            tu.role === 'assigner' &&
            (tu.userId === userId ||
              tu.id === userId ||
              tu.processId === userId),
        );
        const isDirector = task?.taskUsers?.some(
          (tu: any) =>
            tu.role === 'director' &&
            (tu.userId === userId ||
              tu.id === userId ||
              tu.processId === userId),
        );
        const isSupporter = task?.taskUsers?.some(
          (tu: any) =>
            tu.role === 'supporter' &&
            (tu.userId === userId ||
              tu.id === userId ||
              tu.processId === userId),
        );
        // Người tạo, Người giao, Người chủ trì, Người phối hợp đều có thể tạo công việc con
        if ((task?.createdBy?.id === userId || isAssigner || isDirector || isSupporter) && task.processStatus !== '4' && task.processStatus !== '8' && task.processStatus !== '3') {
          defaultFlags.canCreateTaskSub = true;
          defaultFlags.canCreateTaskSubFromDoc = true;
        }
        if ((isDirector || isAssigner || task?.createdBy?.id === userId) && (task?.processStatus === '2' || task?.processStatus === '1') && !hasChildren) {
          defaultFlags.canInProcessFromDoc = true;
          defaultFlags.canInProcess = true;
        }

        if ((isAssigner) && task?.processStatus !== '4' && task.processStatus !== '8' && task.processStatus !== '3') {
          defaultFlags.canUpdateFolderFromDoc = true;
          defaultFlags.canUpdateFromDoc = true;
        }
        if ((isDirector || isAssigner || task?.createdBy?.id === userId) && new Date(task?.endDate) < new Date() && task?.processStatus !== '8') {
          defaultFlags.isSlowReason = true
        }

        // Nếu không có work items, trả về flags mặc định và bỏ qua BPMN processing
        if (!workItems || workItems.length === 0 && task.processStatus !== '4' && task.processStatus !== '8') {
          bpmnData = {
            workItem: null,
            availableActions: [],
            flags: defaultFlags,
          };
        } else {

          const docType = workItems[0].bpmn_version || 'TaskDocument';

          const flowConfig = await this.sqlsvRepo.getFlowByUnit(
            String(user.parent.id),
            docType,
          );

          if (!flowConfig) {
            throw new BadRequestException('Đơn vị chưa được cấu hình BPMN');
          }
          const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig?.id);
          if (!bpmnXML) {
            throw new Error('Không tìm thấy BPMN TaskManyUnit');
          }

          const { process, indexes } = await this.getModelFromXml(bpmnXML);
          const userParent = user?.parent?.id;

          let userRoles: string[] = [];
          try {
            const roleInfo = await this.sqlRepo.getUserRole(userId);
            if (roleInfo?.roles) {
              userRoles = roleInfo.roles;
            }
          } catch {
            // ignore
          }

          const audit = await this.sqlRepo.getAudit(String(id));

          // if (Array.isArray(audit)) {
          //   typeRequest = audit.find((a) => a.actionCode === 'GUI_PHE_DUYET')
          //     ? 'Phê duyệt kết quả'
          //     : audit.find((a) => a.actionCode === 'DIEU_CHINH')
          //       ? 'Điều chỉnh thông tin'
          //       : null;
          //   // lấy bản ghi GUI_PHE_DUYET mới nhất (nếu có nhiều)
          //   const approveAudit = [...audit]
          //     .filter((a) => a.actionCode === 'GUI_PHE_DUYET')
          //     .sort(
          //       (a, b) =>
          //         new Date(b.createdAt || b.time).getTime() -
          //         new Date(a.createdAt || a.time).getTime(),
          //     )[0];

          //   if (approveAudit) {
          //     sentAt = approveAudit.updatedAt || approveAudit.time;

          //     // ưu tiên displayName trong audit
          //     if (approveAudit.displayName) {
          //       senderName = approveAudit.displayName;
          //     } else if (approveAudit.userId) {
          //       // fallback: lấy tên user từ DB
          //       try {
          //         const sender = await this.sqlsvRepo.getUserById(
          //           approveAudit.userId,
          //         );
          //         senderName = sender?.name || sender?.username || null;
          //       } catch {
          //         senderName = null;
          //       }
          //     }
          //   }
          // }
          const hasChildren = (await this.taskRepository.count({ where: { parent: id } })) > 0;
          const perItems: any[] = [];
          const lastAuditEntry =
            audit && audit.length > 0 ? audit[audit.length - 1] : null;
          for (const wi of workItems) {
            const mappedWi = {
              id: wi.id,
              nodeId: wi.node_id,
              role: wi.role,
              assigneeUserId: wi.assignee_user_id,
              nodeType: wi.node_type || wi.node_type,
            };

            const res = await this.bpmnEngine.computeAvailableActions({
              process,
              indexes,
              currentNodeId: mappedWi.nodeId,
              workItem: mappedWi,
              document: { ...task, bookDocumentId: null, isIncomming: false },
              userId,
              userRoles,
              getUsersByRole: (role) =>
                this.sqlsvRepo.getUsersByRoleMongoDB(role),
              audit,
              userParent,
            });

            /** =========================
             *  OVERRIDE ACTIONS KHI PHE_DUYET_DIEU_CHINH
             * ========================= */
            if (
              lastAuditEntry &&
              lastAuditEntry.actionCode === stageStatusDoc.DONG_Y_DIEU_CHINH
            ) {
              // Tìm flow "Xác nhận điều chỉnh" động
              const outs = indexes.outgoingBySource.get(mappedWi.nodeId) || [];

              if (outs) {
                const { node: nextNode } =
                  this.bpmnEngine.nextInteractiveFromFlow(outs, indexes);

                const targetRole = nextNode
                  ? indexes.laneMap.get(nextNode.id)
                  : undefined;

                res.availableActions = [
                  {
                    ...actionCatalog.actions.XAC_NHAN_DIEU_CHINH_DOC,
                    code: 'GIAO_VIEC',
                    flowId: outs[0].id,
                    targetRole,
                    canExecute: true,
                  },
                ];
              } else {
                // Không tìm được flow thì KHÔNG CHO ACTION NÀO
                res.availableActions = [];
              }
            }

            if (res.availableActions && res.availableActions.length > 0) {
              const isApprovalRequired = task.isApprovalRequired ?? false;
              const hasSameAssignerAndDirector = taskDetail.assigners.some(
                (a) =>
                  a.processId &&
                  taskDetail.directors.some((d) => d.processId === a.processId),
              );

              if (hasSameAssignerAndDirector) {
                res.availableActions = res.availableActions.filter(
                  (a: any) =>
                    a.code !== 'GUI_PHE_DUYET' &&
                    a.code !== 'CHO_PHE_DUYET' &&
                    a.code !== 'GUI_DIEU_CHINH' &&
                    a.type !== 'approvetaskformdoc',
                );
              } else if (isApprovalRequired) {
                // Nếu cần phê duyệt -> Ẩn "Hoàn thành" (HOAN_THANH)
                res.availableActions = res.availableActions.filter(
                  (a: any) => a.code !== 'HOAN_THANH',
                );
              } else {
                // Nếu KHÔNG cần phê duyệt -> Ẩn "Gửi phê duyệt" (GUI_PHE_DUYET)
                res.availableActions = res.availableActions.filter(
                  (a: any) => a.code !== 'GUI_PHE_DUYET' && a.code !== 'CHO_PHE_DUYET',
                );
              }

              const outs = indexes.outgoingBySource.get(mappedWi.nodeId) || [];

              if (outs && outs.length > 0) {
                const firstFlow = outs[0];
                const flowExtProps = this.bpmnEngine.getFlowExtensionProperties(firstFlow);

                // Nếu flow KHÔNG có flagAllowAction = 'true' → xóa tất cả actions
                if (!flowExtProps?.flagInTask || flowExtProps.flagInTask !== 'true') {
                  res.availableActions = [];
                }
              }
            }

            perItems.push({
              workItem: mappedWi,
              node: res.node,
              availableActions: res.availableActions,
            });
          }
          // =========================
          // Build BPMN Result (3 FLAGS)
          // =========================
          bpmnData = (() => {
            let workItem = null;
            let availableActions: any[] = [];

            // Initialize flags based on task properties first
            const flags = { ...defaultFlags, canSucessfull: false };

            // Then, update flags based on user's work items
            for (const item of perItems) {
              // lấy workItem đầu tiên có thể execute
              if (
                !workItem &&
                item.availableActions?.some((a: any) => a.canExecute)
              ) {
                workItem = item.workItem;
                availableActions = item.availableActions;
              }

              const nodeName = item.node?.name;
              const workItemRole = item.workItem?.role;

              const flagCheck = indexes?.nodes.get(item.workItem?.nodeId);
              if (flagCheck?.incoming?.[0]?.targetRef) {
                const check = getAllNodeExtensionProperties(
                  flagCheck.incoming[0].targetRef,
                );
                // New logic for canUpdateFolder
                if (check?.flagUpdateFolder === 'true' && task.processStatus !== '4') {
                  flags.canUpdateFolderFromDoc = true;
                }
                if (check?.canSucessfull === 'true') {
                  flags.canSucessfull = true;
                }
                if (check?.canInProcess === 'true' && !hasChildren) {
                  flags.canInProcess = true;
                }
                if (check?.flagCreateSubTask === 'true') {
                  flags.canCreateTaskSub = true;
                  flags.canCreateTaskSubFromDoc = true;
                }
              }

              if (
                audit &&
                lastAuditEntry &&
                lastAuditEntry.actionCode === stageStatusDoc.DONG_Y_DIEU_CHINH
              ) {
                flags.canUpdateFolderFromDoc = true;
                flags.canUpdateFromDoc = true;
              }
            }

            if (
              availableActions.some((a: any) =>
                a?.canExecute &&
                (a.code === 'HOAN_THANH' || a.type === 'tasksucessfull')
              )
            ) {
              flags.canSucessfull = true;
            }

            return {
              workItem,
              availableActions,
              flags,
            };
          })();
        }


      } catch (error) {

        console.error('Error in findOne BPMN processing:', error);
      }
    }
    // let toBook: string | null = null;
    let docInfo: {
      toBook: string;
      documentDate: string;
      abstractNote: string;
      documentType: string
    } | null = null;

    if (task.docId) {
      const doc = await this.dataSource
        .createQueryBuilder()
        .select(['to_book', 'document_date', 'abstract_note', 'document_type'])
        .from('incomming_documents', 'idoc')
        .where('idoc.document_id = :docId', { docId: task.docId })
        .getRawOne();

      docInfo = doc
        ? {
          toBook: doc.to_book,
          documentDate: doc.document_date,
          abstractNote: doc.abstract_note,
          documentType: doc.document_type
        }
        : null;
    }

    // =========================
    // Template info
    // =========================
    let templateName: string | null = null;
    if (task.templateId) {
      const template = await this.processTemplateRepo.findOne({
        where: { id: task.templateId },
        select: ['name'],
      });
      templateName = template?.name ?? null;
    }

    const progressView = buildProgressView(task);

    // =========================
    // RESPONSE
    // =========================
    return {
      ...taskDetail,
      typeTask: this.TYPE_TASK_VN[task.typeTask] || task.typeTask, // map luôn
      docId: task.docId,
      priority: task.priority,
      toBook: docInfo?.toBook ?? null,
      documentDate: docInfo?.documentDate ?? null, // <-- thêm trường mới
      abstractNote: docInfo?.abstractNote ?? null,
      summary: [docInfo?.toBook, docInfo?.abstractNote]
        .filter(Boolean)
        .join(' - '),
      documentType: docInfo?.documentType ?? null,
      templateId: task.templateId ?? null,
      templateName,
      sender: senderName,
      dateSent: sentAt,
      typeRequest,
      parentName,
      deadlineStartParent,
      deadlineEndParent,
      deadlineStartParentISO: deadlineStartParent,
      deadlineEndParentISO: deadlineEndParent,
      progressColor: progressView.color,
      progressStatus: progressView.status,
      isDeadlineExceeded: progressView.isDeadlineExceeded,
      ...bpmnData,
      flags: {
        ...(bpmnData.flags || {}),
        hasChildren: (await this.taskRepository.count({ where: { parent: id } })) > 0,
        canCreateTaskSub: progressView.status === 'OVERDUE' ? false : (bpmnData.flags?.canCreateTaskSub ?? false),
      },
    };
  }
  async findOneFormMeeting(id: number, userId?: string): Promise<any> {
    const task = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.taskUsers', 'taskUsers')
      .leftJoinAndSelect('taskUsers.user', 'tuUser')
      .leftJoinAndSelect('tuUser.parent', 'tuParent')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.updatedBy', 'updatedBy')
      .select([
        'task.id',
        'task.name',
        'task.code',
        'task.docId',
        'task.meetingId',
        'task.meetingConclusionId',
        'task.typeTaskMeeting',
        'task.note',
        'task.reminderTime',
        'task.topic',
        'task.startDate',
        'task.endDate',
        'task.parent',
        'task.processStatus',
        'task.priority',
        'task.progress',
        'task.createdAt',
        'task.updatedAt',
        'task.templateId',
        'task.isApprovalRequired',

        // taskUsers fields used in logic
        'taskUsers.id',
        'taskUsers.role',
        'taskUsers.type',
        'taskUsers.processId',
        'taskUsers.processName',
        'tuUser.id',
        'tuUser.name',
        'tuParent.id',
        'tuParent.name',

        // createdBy
        'createdBy.id',
        'createdBy.name',
        'createdBy.emailUser',
        'createdBy.username',

        // updatedBy
        'updatedBy.id',
        'updatedBy.name',
      ])
      .where('task.id = :id', { id })
      .andWhere('task.status = :status', { status: 1 })
      .getOne();

    if (!task) {
      throw new NotFoundException(`Không tìm thấy công việc với ID ${id}`);
    }

    // =========================
    // Parent task
    // =========================
    let parentName: string | null = null;
    let deadlineStartParent: string | null = null;
    let deadlineEndParent: string | null = null;
    if (task.parent) {
      const parentTask = await this.taskRepository.findOne({
        where: { id: task.parent },
        select: ['name', 'startDate', 'endDate'],
      });
      parentName = parentTask?.name ?? null;
      deadlineStartParent = parentTask?.startDate
        ? dayjs(parentTask.startDate).toISOString()
        : null;
      deadlineEndParent = parentTask?.endDate
        ? dayjs(parentTask.endDate).toISOString()
        : null;
    }

    // =========================
    // Task detail
    // =========================
    const crmMappedValues = await this.mapCrmTitles(task);
    const taskDetail = this.mapTaskDetail(task, crmMappedValues);

    // =========================
    // BPMN DATA
    // =========================
    let bpmnData: any = {};
    const senderName: string | null = null;
    const sentAt: string | null = null;
    const typeRequest: string | null = null;
    const hasChildren = (await this.taskRepository.count({ where: { parent: id } })) > 0;
    if (userId) {
      try {
        const user: any = await this.sqlsvRepo.getUserById(userId);
        if (!user?.parent?.id) {
          throw new BadRequestException(
            'Không xác định được đơn vị người dùng',
          );
        }
        // WorkItems
        const workItems = await this.dataSource.query(
          `
            SELECT *
            FROM work_items
            WHERE document_id = @0
              AND assignee_user_id = @1
              AND state = 'open'
            `,
          [String(id), userId],
        );

        // Khởi tạo flags mặc định trước
        const defaultFlags = {
          canInProcess: false,
          canSendAdjust: true,
          canCreateTaskSub: false,
          canSucessfull: false,
          canExecuteMetting: true,
          updateStatus: (taskDetail.directors.some(d => d.processId === userId) || task?.createdBy?.id === userId || taskDetail.assigners.some(d => d.processId === userId)),
          canStatusSucess: !taskDetail.directors.some(d => d.processId === userId),
          canUpdateFolder:
            ((taskDetail.directors.length === 0 &&
              taskDetail.supporters.length === 0) || task?.createdBy?.id === userId) && (task.processStatus !== '4' && task.processStatus !== '8'),
          canApprove: true,
          canConfirmAdjust: true,
          canUpdate: ((taskDetail.directors.length === 0 || task?.createdBy?.id === userId) && task.processStatus !== '4' && task.processStatus !== '8' && task.processStatus !== '3'),
          isSlowReason: false
        };

        // Xử lý flags dựa trên roles của user (không phụ thuộc work items)
        const isAssigner = task?.taskUsers?.some(
          (tu: any) =>
            tu.role === 'assigner' &&
            (tu.userId === userId ||
              tu.id === userId ||
              tu.processId === userId),
        );
        const isDirector = task?.taskUsers?.some(
          (tu: any) =>
            tu.role === 'director' &&
            (tu.userId === userId ||
              tu.id === userId ||
              tu.processId === userId),
        );
        const isSupporter = task?.taskUsers?.some(
          (tu: any) =>
            tu.role === 'supporter' &&
            (tu.userId === userId ||
              tu.id === userId ||
              tu.processId === userId),
        );
        // Người tạo, Người giao, Người chủ trì, Người phối hợp đều có thể tạo công việc con
        if ((task?.createdBy?.id === userId || isAssigner || isDirector || isSupporter) && task.processStatus !== '4' && task.processStatus !== '8' && task.processStatus !== '3') {
          defaultFlags.canCreateTaskSub = true;
        }
        if ((isDirector || isAssigner || task?.createdBy?.id === userId) && (task?.processStatus === '2' || task?.processStatus === '1') && !hasChildren) {
          defaultFlags.canInProcess = true;
        }
        if ((isAssigner || isDirector) && task?.processStatus !== '4' && task.processStatus !== '8' && task.processStatus !== '3') {
          defaultFlags.canUpdateFolder = true;
        }
        if ((isAssigner) && task?.processStatus !== '4' && task.processStatus !== '8' && task.processStatus !== '3') {
          defaultFlags.canUpdate = true;
        }
        if ((isDirector || isAssigner || task?.createdBy?.id === userId) && new Date(task?.endDate) < new Date() && task?.processStatus !== '8') {
          defaultFlags.isSlowReason = true
        }

        // Nếu không có work items, trả về flags mặc định và bỏ qua BPMN processing
        if (!workItems || workItems.length === 0 && task.processStatus !== '4' && task.processStatus !== '8') {
          bpmnData = {
            workItem: null,
            availableActions: [],
            flags: defaultFlags,
          };
        } else {
          // Có work items, tiếp tục xử lý BPMN
          const docType = workItems[0].bpmn_version || 'TaskManyUnit';
          const flowConfig = await this.sqlsvRepo.getFlowByUnit(
            String(user.parent.id),
            docType,
          );

          if (!flowConfig) {
            throw new BadRequestException('Đơn vị chưa được cấu hình BPMN');
          }
          const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig?.id);
          if (!bpmnXML) {
            throw new Error('Không tìm thấy BPMN TaskManyUnit');
          }

          const { process, indexes } = await this.getModelFromXml(bpmnXML);
          const userParent = user?.parent?.id;

          let userRoles: string[] = [];
          try {
            const roleInfo = await this.sqlRepo.getUserRole(userId);
            if (roleInfo?.roles) {
              userRoles = roleInfo.roles;
            }
          } catch {
            // ignore
          }

          const audit = await this.sqlRepo.getAudit(String(id));

          const perItems: any[] = [];
          const lastAuditEntry =
            audit && audit.length > 0 ? audit[audit.length - 1] : null;
          for (const wi of workItems) {
            const mappedWi = {
              id: wi.id,
              nodeId: wi.node_id,
              role: wi.role,
              assigneeUserId: wi.assignee_user_id,
              nodeType: wi.node_type || wi.node_type,
            };

            const res = await this.bpmnEngine.computeAvailableActions({
              process,
              indexes,
              currentNodeId: mappedWi.nodeId,
              workItem: mappedWi,
              document: { ...task, bookDocumentId: null, isIncomming: false },
              userId,
              userRoles,
              getUsersByRole: (role) =>
                this.sqlsvRepo.getUsersByRoleMongoDB(role),
              audit,
              userParent,
            });

            /** =========================
             *  OVERRIDE ACTIONS KHI PHE_DUYET_DIEU_CHINH
             * ========================= */
            if (
              lastAuditEntry &&
              ((lastAuditEntry.actionCode === stageStatusDoc.PHE_DUYET_DIEU_CHINH) ||
                (lastAuditEntry.actionCode === stageStatusDoc.DONG_Y_DIEU_CHINH))
            ) {
              // Tìm flow "Xác nhận điều chỉnh" động
              const outs = indexes.outgoingBySource.get(mappedWi.nodeId) || [];

              if (outs && outs.length > 0) {
                // const { node: nextNode } =
                //   this.bpmnEngine.nextInteractiveFromFlow(outs, indexes);

                // const targetRole = nextNode
                //   ? indexes.laneMap.get(nextNode.id)
                //   : undefined;

                res.availableActions = [
                  {
                    ...actionCatalog.actions.XAC_NHAN_DIEU_CHINH,
                    code: 'GIAO_VIEC',
                    flowId: outs[0].id,
                    // targetRole,
                    canExecute: true,
                  },
                ];
              } else {
                // Không tìm được flow thì KHÔNG CHO ACTION NÀO
                res.availableActions = [];
              }
            }

            // Logic này chạy sau khi computeAvailableActions hoặc override
            if (res.availableActions && res.availableActions.length > 0) {
              const isApprovalRequired = task.isApprovalRequired ?? false;
              const hasSameAssignerAndDirector = taskDetail.assigners.some(
                (a) =>
                  a.processId &&
                  taskDetail.directors.some((d) => d.processId === a.processId),
              );

              if (hasSameAssignerAndDirector) {
                res.availableActions = res.availableActions.filter(
                  (a: any) =>
                    a.code !== 'GUI_PHE_DUYET' &&
                    a.code !== 'CHO_PHE_DUYET' &&
                    a.code !== 'GUI_DIEU_CHINH' &&
                    a.type !== 'approvetaskformdoc',
                );
              } else if (isApprovalRequired) {
                // Nếu cần phê duyệt -> Ẩn "Hoàn thành" (HOAN_THANH)
                res.availableActions = res.availableActions.filter(
                  (a: any) => a.code !== 'HOAN_THANH',
                );
              } else {
                // Nếu KHÔNG cần phê duyệt -> Ẩn "Gửi phê duyệt" (GUI_PHE_DUYET)
                res.availableActions = res.availableActions.filter(
                  (a: any) => a.code !== 'GUI_PHE_DUYET' && a.code !== 'CHO_PHE_DUYET',
                );
              }
              const outs = indexes.outgoingBySource.get(mappedWi.nodeId) || [];

              if (outs && outs.length > 0) {
                const firstFlow = outs[0];
                const flowExtProps = this.bpmnEngine.getFlowExtensionProperties(firstFlow);

                // Nếu flow KHÔNG có flagAllowAction = 'true' → xóa tất cả actions
                if (!flowExtProps?.flagInTask || flowExtProps.flagInTask !== 'true') {
                  res.availableActions = [];
                }
              }
            }

            perItems.push({
              workItem: mappedWi,
              node: res.node,
              availableActions: res.availableActions,
            });
          }

          // =========================
          // Build BPMN Result (3 FLAGS)
          // =========================
          bpmnData = (() => {
            let workItem = null;
            let availableActions: any[] = [];

            // Khởi tạo flags từ defaultFlags
            const flags = { ...defaultFlags };

            // Then, update flags based on user's work items
            for (const item of perItems) {
              // lấy workItem đầu tiên có thể execute
              if (
                !workItem &&
                item.availableActions?.some((a: any) => a.canExecute)
              ) {
                workItem = item.workItem;
                availableActions = item.availableActions;
              }

              const nodeName = item.node?.name;
              const workItemRole = item.workItem?.role;

              const flagCheck = indexes?.nodes.get(item.workItem?.nodeId);
              if (flagCheck?.incoming?.[0]?.targetRef) {
                const check = getAllNodeExtensionProperties(
                  flagCheck.incoming[0].targetRef,
                );
                // New logic for canUpdateFolder
                if (check?.flagUpdateFolder === 'true' && task.processStatus !== '4') {
                  flags.canUpdateFolder = true;
                }
                if (check?.canSucessfull === 'true') {
                  flags.canSucessfull = true;
                }

                if (check?.canInProcess === 'true' && !hasChildren) {
                  flags.canInProcess = true;
                }
                if (check?.flagCreateSubTask === 'true') {
                  flags.canCreateTaskSub = true;
                }
              }

              if (
                audit &&
                lastAuditEntry &&
                lastAuditEntry.actionCode === stageStatusDoc.PHE_DUYET_DIEU_CHINH
              ) {
                flags.canUpdateFolder = true;
                flags.canUpdate = true;
              }
            }

            return {
              workItem,
              availableActions,
              flags,
            };
          })();
        }
      } catch (error) {
        console.error('Error in findOne BPMN processing:', error);
      }
    }
    // let toBook: string | null = null;
    let docInfo: {
      toBook: string;
      documentDate: string;
      abstractNote: string;
    } | null = null;

    if (task.docId) {
      const doc = await this.dataSource
        .createQueryBuilder()
        .select(['to_book', 'document_date', 'abstract_note'])
        .from('incomming_documents', 'idoc')
        .where('idoc.document_id = :docId', { docId: task.docId })
        .getRawOne();

      docInfo = doc
        ? {
          toBook: doc.to_book,
          documentDate: doc.document_date,
          abstractNote: doc.abstract_note,
        }
        : null;
    }

    // =========================
    // MEETING INFO
    // =========================
    let meetingInfo: { title: string; startDate: Date | null } | null = null;
    if (task.meetingId) {
      const meeting = await this.dataSource
        .createQueryBuilder()
        .select(['title', 'meeting_date'])
        .from('meetings', 'm')
        .where('m.id = :meetingId', { meetingId: task.meetingId })
        .getRawOne();

      meetingInfo = meeting ? { title: meeting.title, startDate: meeting.meeting_date } : null;
    }

    // =========================
    // MEETING CONCLUSION INFO
    // =========================
    let conclusionInfo: { content: string; meetingId: string } | null = null;
    if (task.meetingConclusionId) {
      const conclusion = await this.dataSource
        .createQueryBuilder()
        .select(['content', 'meeting_id'])
        .from('meeting_conclusions', 'mc')
        .where('mc.id = :conclusionId', { conclusionId: task.meetingConclusionId })
        .getRawOne();

      conclusionInfo = conclusion
        ? { content: conclusion.content, meetingId: conclusion.meeting_id }
        : null;
    }

    // =========================
    // Template info
    // =========================
    let templateName: string | null = null;
    if (task.templateId) {
      const template = await this.processTemplateRepo.findOne({
        where: { id: task.templateId },
        select: ['name'],
      });
      templateName = template?.name ?? null;
    }

    const progressView = buildProgressView(task);

    // =========================
    // RESPONSE
    // =========================
    return {
      ...taskDetail,
      typeTask: this.TYPE_TASK_VN[task.typeTask] || task.typeTask, // map luôn
      docId: task.docId,
      toBook: docInfo?.toBook ?? null,
      documentDate: docInfo?.documentDate ?? null, // <-- thêm trường mới
      abstractNote: docInfo?.abstractNote ?? null,
      meetingId: task.meetingId ?? null,
      meetingTitle: meetingInfo?.title ?? null,
      meetingDate: meetingInfo?.startDate
        ? new Date(meetingInfo.startDate).toLocaleDateString('vi-VN')
        : null,
      meetingConclusionId: task.meetingConclusionId ?? null,
      conclusionContent: conclusionInfo?.content ?? null,
      typeTaskMeeting: task.typeTaskMeeting ?? null,
      titleMeeting: (() => {
        if (!meetingInfo?.title) return null;
        const meetingDate = meetingInfo.startDate
          ? new Date(meetingInfo.startDate).toLocaleDateString('vi-VN')
          : '';
        const titleWithDate = meetingDate
          ? `${meetingInfo.title} - ${meetingDate}`
          : meetingInfo.title;
        return task.typeTaskMeeting === 'conclusion'
          ? `Kết luận - ${titleWithDate}`
          : titleWithDate;
      })(),
      templateId: task.templateId ?? null,
      templateName,
      sender: senderName,
      dateSent: sentAt,
      typeRequest,
      parentName,
      deadlineStartParent,
      deadlineEndParent,
      deadlineStartParentISO: deadlineStartParent,
      deadlineEndParentISO: deadlineEndParent,
      progressColor: progressView.color,
      progressStatus: progressView.status,
      isDeadlineExceeded: progressView.isDeadlineExceeded,
      ...bpmnData,
      flags: {
        ...(bpmnData.flags || {}),
        hasChildren,
        canCreateTaskSub: progressView.status === 'OVERDUE' ? false : (bpmnData.flags?.canCreateTaskSub ?? false),
      },
    };
  }
  // async findOneFormMeeting(id: number, userId?: string): Promise<any> {
  //   const task = await this.taskRepository
  //     .createQueryBuilder('task')
  //     .leftJoinAndSelect('task.taskUsers', 'taskUsers')
  //     .leftJoinAndSelect('task.createdBy', 'createdBy')
  //     .leftJoinAndSelect('task.updatedBy', 'updatedBy')
  //     .select([
  //       'task.id',
  //       'task.name',
  //       'task.code',
  //       'task.meetingId',
  //       'task.startDate',
  //       'task.endDate',
  //       'task.parent',
  //       'task.processStatus',
  //       'task.priority',
  //       'task.note',
  //       'task.reminderTime',
  //       'task.progress',
  //       'task.createdAt',
  //       'task.updatedAt',

  //       // taskUsers
  //       'taskUsers.id',
  //       'taskUsers.role',
  //       'taskUsers.type',
  //       'taskUsers.processId',
  //       'taskUsers.processName',

  //       // createdBy
  //       'createdBy.id',
  //       'createdBy.name',
  //       'createdBy.emailUser',
  //       'createdBy.username',

  //       // updatedBy
  //       'updatedBy.id',
  //       'updatedBy.name',
  //     ])
  //     .where('task.id = :id', { id })
  //     .andWhere('task.status = :status', { status: 1 })
  //     .getOne();

  //   if (!task) {
  //     throw new NotFoundException(`Không tìm thấy công việc với ID ${id}`);
  //   }

  //   // =========================
  //   // Parent task
  //   // =========================
  //   let parentName: string | null = null;
  //   if (task.parent) {
  //     const parentTask = await this.taskRepository.findOne({
  //       where: { id: task.parent },
  //       select: ['name'],
  //     });
  //     parentName = parentTask?.name ?? null;
  //   }

  //   // =========================
  //   // Task detail
  //   // =========================
  //   const crmMappedValues = await this.mapCrmTitles(task);
  //   const taskDetail = this.mapTaskDetail(task, crmMappedValues);

  //   // =========================
  //   // BPMN DATA
  //   // =========================
  //   let bpmnData: any = {};
  //   let senderName: string | null = null;
  //   let sentAt: string | null = null;
  //   let typeRequest: string | null = null;
  //   const hasChildren = (await this.taskRepository.count({ where: { parent: id } })) > 0;
  //   if (userId) {
  //     try {
  //       const user: any = await this.sqlsvRepo.getUserById(userId);
  //       if (!user?.parent?.id) {
  //         throw new BadRequestException(
  //           'Không xác định được đơn vị người dùng',
  //         );
  //       }
  //       const workItems = await this.dataSource.query(
  //         `
  //       SELECT *
  //       FROM work_items
  //       WHERE document_id = @0
  //         AND assignee_user_id = @1
  //         AND state = 'open'
  //       `,
  //         [String(id), userId],
  //       );

  //       // Khởi tạo default flags trước
  //       const defaultFlags = {
  //         canInProcess: false,
  //         // canInProcess: false,
  //         canSendAdjustFormMeeting: true,
  //         canConfirmAdjustFormMeeting: true,
  //         canCreateTaskSubFormMeeting: false,
  //         canAgreeFormMeeting: true,
  //         canRejectFormMeeting: true,
  //         canExecuteFormMeeting: true,
  //         canUpdateFolderFormMeeting: (taskDetail.directors.length === 0 || task?.createdBy?.id === userId) && (task.processStatus !== '4' && task.processStatus !== '8'),
  //         canUpdateFolder: ((taskDetail.directors.length === 0 &&
  //           taskDetail.supporters.length === 0) || task?.createdBy?.id === userId) && (task.processStatus !== '4' && task.processStatus !== '8'),
  //         canApproveFormMeeting: true,
  //         // canUpdate: false,
  //         canUpdate: ((taskDetail.directors.length === 0 || task?.createdBy?.id === userId) && task.processStatus !== '4' && task.processStatus !== '8'),
  //         updateStatus: task.processStatus === '2' && (taskDetail.assigners[0] as any)?.processId === userId,
  //       };

  //       // Xử lý flags dựa trên roles của user (không phụ thuộc work items)
  //       const isAssigner = task.taskUsers?.some(
  //         (tu: any) =>
  //           tu.role === 'assigner' &&
  //           (tu.userId === userId ||
  //             tu.id === userId ||
  //             tu.processId === userId),
  //       );
  //       const isDirector = task.taskUsers?.some(
  //         (tu: any) =>
  //           tu.role === 'director' &&
  //           (tu.userId === userId ||
  //             tu.id === userId ||
  //             tu.processId === userId),
  //       );
  //       if (task.createdBy?.id === userId || isAssigner) {
  //         defaultFlags.canCreateTaskSubFormMeeting = true;
  //       }
  //       if ((isDirector || isAssigner || task?.createdBy?.id === userId) && task.processStatus === '2' && !hasChildren) {
  //         defaultFlags.canInProcess = true;
  //         // defaultFlags.canInProcess = true;
  //       }
  //       if (isAssigner) {
  //         defaultFlags.canUpdateFolderFormMeeting = true;
  //         defaultFlags.canUpdateFolder = true;
  //         defaultFlags.canUpdate = true;
  //       }

  //       // Nếu không có work items, trả về flags mặc định
  //       if (!workItems || workItems.length === 0) {
  //         bpmnData = {
  //           workItem: null,
  //           availableActions: [],
  //           flags: defaultFlags,
  //         };
  //       } else {
  //         // Có work items, tiếp tục xử lý BPMN
  //         const flowConfig = await this.sqlsvRepo.getFlowByUnit(
  //           String(user.parent.id),
  //           workItems[0].bpmn_version,
  //         );

  //         if (!flowConfig) {
  //           throw new BadRequestException('Đơn vị chưa được cấu hình BPMN');
  //         }

  //         const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig.id);
  //         if (!bpmnXML) {
  //           throw new Error('Không tìm thấy BPMN TaskMeeting');
  //         }

  //         const { process, indexes } = await this.getModelFromXml(bpmnXML);
  //         const userParent = user.parent.id;

  //         let userRoles: string[] = [];
  //         try {
  //           const roleInfo = await this.sqlRepo.getUserRole(userId);
  //           if (roleInfo?.roles) {
  //             userRoles = roleInfo.roles;
  //           }
  //         } catch { }

  //         // =========================
  //         // WorkItems
  //         // =========================


  //         const audit = await this.sqlRepo.getAudit(String(id));

  //         if (Array.isArray(audit)) {
  //           typeRequest = audit.find((a) => a.actionCode === 'GUI_PHE_DUYET')
  //             ? 'Phê duyệt kết quả'
  //             : audit.find((a) => a.actionCode === 'DIEU_CHINH')
  //               ? 'Điều chỉnh thông tin'
  //               : null;

  //           const approveAudit = [...audit]
  //             .filter((a) => a.actionCode === 'GUI_PHE_DUYET')
  //             .sort(
  //               (a, b) =>
  //                 new Date(b.createdAt || b.time).getTime() -
  //                 new Date(a.createdAt || a.time).getTime(),
  //             )[0];

  //           if (approveAudit) {
  //             sentAt = approveAudit.updatedAt || approveAudit.time;

  //             if (approveAudit.displayName) {
  //               senderName = approveAudit.displayName;
  //             } else if (approveAudit.userId) {
  //               try {
  //                 const sender = await this.sqlsvRepo.getUserById(
  //                   approveAudit.userId,
  //                 );
  //                 senderName = sender?.name || sender?.username || null;
  //               } catch {
  //                 senderName = null;
  //               }
  //             }
  //           }
  //         }

  //         const perItems: any[] = [];
  //         const lastAuditEntry =
  //           audit && audit.length > 0 ? audit[audit.length - 1] : null;

  //         for (const wi of workItems) {
  //           const mappedWi = {
  //             id: wi.id,
  //             nodeId: wi.node_id,
  //             role: wi.role,
  //             assigneeUserId: wi.assignee_user_id,
  //             nodeType: wi.node_type,
  //           };

  //           const res = await this.bpmnEngine.computeAvailableActions({
  //             process,
  //             indexes,
  //             currentNodeId: mappedWi.nodeId,
  //             workItem: mappedWi,
  //             document: { ...task, bookDocumentId: null, isIncomming: false },
  //             userId,
  //             userRoles,
  //             getUsersByRole: (role) =>
  //               this.sqlsvRepo.getUsersByRoleMongoDB(role),
  //             audit,
  //             userParent,
  //           });

  //           // =========================
  //           // OVERRIDE khi ĐỒNG Ý ĐIỀU CHỈNH
  //           // =========================
  //           if (
  //             lastAuditEntry &&
  //             lastAuditEntry.actionCode === stageStatusDoc.DONG_Y_DIEU_CHINH
  //           ) {
  //             const outs = indexes.outgoingBySource.get(mappedWi.nodeId) || [];

  //             if (outs.length) {
  //               const { node: nextNode } =
  //                 this.bpmnEngine.nextInteractiveFromFlow(outs, indexes);

  //               const targetRole = nextNode
  //                 ? indexes.laneMap.get(nextNode.id)
  //                 : undefined;

  //               res.availableActions = [
  //                 {
  //                   ...actionCatalog.actions.XAC_NHAN_DIEU_CHINH_DOC,
  //                   code: 'GIAO_VIEC',
  //                   flowId: outs[0].id,
  //                   targetRole,
  //                   canExecute: true,
  //                 },
  //               ];
  //             } else {
  //               res.availableActions = [];
  //             }
  //           }

  //           perItems.push({
  //             workItem: mappedWi,
  //             node: res.node,
  //             availableActions: res.availableActions,
  //           });
  //         }


  //         bpmnData = (() => {
  //           let workItem = null;
  //           let availableActions: any[] = [];

  //           const summaryFlags = { ...defaultFlags };

  //           for (const item of perItems) {
  //             if (
  //               !workItem &&
  //               item.availableActions?.some((a: any) => a.canExecute)
  //             ) {
  //               workItem = item.workItem;
  //               availableActions = item.availableActions;
  //             }

  //             const flagCheck = indexes?.nodes.get(item.workItem?.nodeId);
  //             if (flagCheck?.incoming?.[0]?.targetRef) {
  //               const check = getAllNodeExtensionProperties(
  //                 flagCheck.incoming[0].targetRef,
  //               );

  //               if (check?.flagUpdateFolder === 'true' && task.processStatus !== '4') {
  //                 summaryFlags.canUpdateFolder = true;
  //                 summaryFlags.canUpdateFolderFormMeeting = true;
  //               }
  //             }

  //             if (
  //               audit &&
  //               lastAuditEntry &&
  //               lastAuditEntry.actionCode === stageStatusDoc.DONG_Y_DIEU_CHINH
  //             ) {
  //               summaryFlags.canUpdateFolderFormMeeting = true;
  //               summaryFlags.canUpdateFolder = true;
  //               summaryFlags.canUpdate = true;
  //               // summaryFlags.canUpdateFormMeeting = true;
  //             }
  //           }

  //           return {
  //             workItem,
  //             availableActions,
  //             flags: { ...summaryFlags }
  //           };
  //         })();
  //       }
  //     } catch (error) {
  //       console.error('Error in findOneFormMeeting BPMN processing:', error);
  //     }
  //   }

  //   // =========================
  //   // MEETING INFO
  //   // =========================
  //   let meetingInfo: {
  //     title: string;
  //     content: string;
  //     meetingDate: string | null;
  //   } | null = null;

  //   if (task.meetingId != null) {
  //     const meeting = await this.dataSource
  //       .createQueryBuilder()
  //       .select([
  //         'm.title AS title',
  //         'm.content AS content',
  //         'm.meeting_date AS meetingDate',
  //       ])
  //       .from('meetings', 'm')
  //       .where('m.id = :meetingId', { meetingId: task.meetingId })
  //       .getRawOne();

  //     meetingInfo = meeting
  //       ? {
  //         title: meeting.title,
  //         content: meeting.content,
  //         meetingDate: meeting.meetingDate ?? null,
  //       }
  //       : null;
  //   }


  //   // =========================
  //   // RESPONSE
  //   // =========================
  //   return {
  //     ...taskDetail,
  //     typeTask: this.TYPE_TASK_VN[task.typeTask] || task.typeTask,

  //     meetingId: task.meetingId || null,
  //     meetingTitle: meetingInfo?.title ?? null,
  //     meetingContent: meetingInfo?.content ?? null,
  //     meetingDate: meetingInfo?.meetingDate ?? null,
  //     summary: [meetingInfo?.title, meetingInfo?.content]
  //       .filter(Boolean)
  //       .join(' - '),

  //     sender: senderName,
  //     dateSent: sentAt,
  //     typeRequest,
  //     parentName,
  //     ...bpmnData,
  //     flags: {
  //       ...(bpmnData.flags || {}),
  //       hasChildren: (await this.taskRepository.count({ where: { parent: id } })) > 0,
  //     },
  //   };
  // }



  private async mapCrmTitlesBatch(
    tasks: TaskEntity[],
  ): Promise<Record<number, Record<string, string>>> {
    if (!tasks.length) return {};

    const mappingConfigs = [
      { code: 'DOUUTIEN', keyInTask: 'priority', keyInResult: 'priority' },
      { code: 'CDCV', keyInTask: 'topic', keyInResult: 'topic' },
      { code: 'CONGVIECLAPLAI', keyInTask: 'repetitiveTask', keyInResult: 'repetitiveTask' },
      { code: 'S34', keyInTask: 'reminderTime', keyInResult: 'reminderTime' },
      { code: 'S35', keyInTask: 'month', keyInResult: 'month' },
      { code: 'S99ultra', keyInTask: 'bpmnId', keyInResult: 'bpmnId' },
      { code: 'S19', keyInTask: 'documentType', keyInResult: 'documentType' },
    ];

    // 1. Thu thập unique values theo từng code
    const uniqueValuesByCode: Record<string, Set<string>> = {};
    mappingConfigs.forEach(cfg => uniqueValuesByCode[cfg.code] = new Set());

    tasks.forEach(task => {
      mappingConfigs.forEach(cfg => {
        const val = task[cfg.keyInTask];
        if (val !== null && val !== undefined && String(val).trim() !== '') {
          // Hỗ trợ cả trường hợp giá trị là danh sách cách nhau bởi dấu phẩy
          String(val).split(',').forEach(v => {
            const trimmed = v.trim();
            if (trimmed) {
              uniqueValuesByCode[cfg.code].add(trimmed);
            }
          });
        }
      });
    });

    // 2. Query mỗi code 1 lần bằng IN (Gom vào 1 query lớn hơn chút nhưng dùng IN sẽ nhanh hơn nhiều OR)
    const allConditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 0;

    mappingConfigs.forEach(cfg => {
      const values = Array.from(uniqueValuesByCode[cfg.code]);
      if (values.length > 0) {
        allConditions.push(`(cs.code = @${paramIdx} AND csd.value IN (${values.map((_, i) => `@${paramIdx + 1 + i}`).join(',')}))`);
        params.push(cfg.code, ...values);
        paramIdx += 1 + values.length;
      }
    });

    if (!allConditions.length) return {};

    const query = `
      SELECT cs.code, csd.value, csd.title
      FROM crm_sources cs
      JOIN crm_source_data csd ON cs.id = csd.source_id
      WHERE ${allConditions.join(' OR ')}
    `;

    const rows = await this.dataSource.query(query, params);

    // 3. Xây dựng Map tra cứu nhanh: code -> value -> title
    const titleLookup: Record<string, Record<string, string>> = {};
    rows.forEach((row: any) => {
      if (!titleLookup[row.code]) titleLookup[row.code] = {};
      titleLookup[row.code][row.value] = row.title;
    });

    // 4. Map ngược lại cho từng task
    const result: Record<number, Record<string, string>> = {};
    tasks.forEach(task => {
      const taskResult: Record<string, string> = {};
      mappingConfigs.forEach(cfg => {
        const val = task[cfg.keyInTask];
        if (val !== null && val !== undefined && String(val).trim() !== '') {
          const rawValues = String(val).split(',').map(v => v.trim()).filter(Boolean);
          const titles = rawValues
            .map(v => titleLookup[cfg.code]?.[v])
            .filter(Boolean);

          if (titles.length > 0) {
            taskResult[cfg.keyInResult] = titles.join(', ');
          }
        }
      });
      result[task.id] = taskResult;
    });

    return result;
  }

  private async mapCrmTitles(
    task: TaskEntity,
  ): Promise<Record<string, string>> {
    const results = await this.mapCrmTitlesBatch([task]);
    return results[task.id] || {};
  }

  public mapProcessStatus(status?: string): string | null {
    const map: Record<string, string> = {
      1: 'Công việc mới',
      2: 'Đang thực hiện',
      3: 'Chờ phê duyệt',
      4: 'Hoàn thành',
      5: 'Từ chối phê duyệt',
      6: 'Điều chỉnh',
      7: 'Từ chối điều chỉnh',
      8: 'Huỷ',
      9: 'Điều chỉnh'
    };

    return status ? (map[status] ?? status) : null;
  }

  public mapProcessStatusToHtml(status?: string): string | null {
    const label = this.mapProcessStatus(status);
    if (!label) return null;

    return this.mapProcessStatusCodeToHtml(label);
  }

  private mapTaskDetail(
    task: TaskEntity,
    mappedValues: Record<string, string> = {},
  ) {
    const result = {
      id: task.id,
      name: task.name,
      code: task.code,
      startDate: task.startDate,
      endDate: task.endDate,
      // ✅ Thêm trường ISO format
      startDateISO: task.startDate ? new Date(task.startDate).toISOString() : null,
      endDateISO: task.endDate ? new Date(task.endDate).toISOString() : null,

      priority: task.priority,
      // topic: mappedValues.topic ?? task.topic,
      topic: task.topic,
      note: task.note,
      progress: task.progress,
      status: task.status,
      parent: task.parent,
      typeTask: task.typeTask,
      processStatus: this.mapProcessStatusToHtml(this.mapProcessStatus(task.processStatus) ?? undefined),

      bpmnId: mappedValues.bpmnId ?? task.bpmnId,
      reminderTime: mappedValues.reminderTime ?? task.reminderTime,
      repetitiveTask: mappedValues.repetitiveTask ?? task.repetitiveTask,
      month: mappedValues.month ?? task.month,

      repetitiveStart: task.repetitiveStart,
      repetitiveEnd: task.repetitiveEnd,
      path: task.path,
      isApprovalRequired: task.isApprovalRequired,

      createdAt: task.createdAt,
      updatedAt: task.updatedAt,

      createdBy: task.createdBy?.name ?? null,
      updatedBy: task.updatedBy?.name ?? null,

      assigners: [] as any[],
      directors: [] as any[],
      supporters: [] as any[],
      viewers: [] as any[],
    };

    for (const tu of task.taskUsers ?? []) {
      const departmentName = tu.user?.parent?.name ?? null;
      if (departmentName) {
        tu.processName = `${tu.processName || tu.user.name} - ${departmentName}`;
      }
      const item = {
        processId: tu.processId,
        name: tu.processName,
        type: tu.type,
        department: departmentName,
      };

      if (result[`${tu.role}s`]) {
        result[`${tu.role}s`].push(item);
      }
    }

    return result;
  }
  async update(
    id: number,
    updateTaskDto: UpdateTaskDto,
    userId: string,
    req?: any,
    // isTaskProject?: string,
  ): Promise<any> {
    this.validateUpdateInput(updateTaskDto);
    await this.ensurePhongBanTaskPermission(userId);
    const { assigners, directors, isTaskProject, supporters, viewers, ...taskData } =
      updateTaskDto;

    if (updateTaskDto.typeTask === undefined) {
      delete (taskData as Partial<UpdateTaskDto>).typeTask;
    }


    let docType = "";
    if (isTaskProject === true) {
      docType = "TaskProject";
    } else {
      const { docType: docTypeFromBpmn } = await this.determineDocTypeFromBpmn(userId, taskData.bpmnId, updateTaskDto);
      docType = docTypeFromBpmn;
    }
    // VALIDATE BPMN + QUYỀN
    const { bpmnXML, flowId } = await this.validateBpmnAndPermission(userId, docType);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    // ===== FLAG LOG =====
    let isTaskInfoChanged = false;
    let isUserChanged = false;

    try {
      // 2. Fetch task đầy đủ trong transaction
      const task = await queryRunner.manager.findOne(TaskEntity, {
        where: { id, status: 1 },
        relations: ['taskUsers'],
      });

      if (!task) {
        throw new NotFoundException(
          `Không tìm thấy công việc với ID ${id} để cập nhật.`,
        );
      }

      if (updateTaskDto.priority !== undefined && String(updateTaskDto.priority) !== String(task.priority)) {
        const isAssigner = task.createdById === userId || task.taskUsers?.some(tu => tu.processId === userId && tu.role === 'assigner');
        if (!isAssigner) {
          throw new BadRequestException('Chỉ người giao việc mới có quyền cập nhật độ ưu tiên với công việc');
        }
      }

      if (task.projectId) {
        const project = await queryRunner.manager.findOne(ProjectEntity, {
          where: { id: task.projectId, status: 1 },
          select: ['projectStatus']
        });
        if (project && (project.projectStatus === 3 || project.projectStatus === 4)) {
          throw new BadRequestException('Dự án đã Hoàn thành hoặc Hủy, không thể cập nhật công việc.');
        }
      }

      // Validate: Ngày bắt đầu phải trước hoặc bằng ngày kết thúc
      // So sánh với dữ liệu mới hoặc dữ liệu cũ trong database
      const finalStartDate = updateTaskDto.startDate ? new Date(updateTaskDto.startDate) : (task.startDate ? new Date(task.startDate) : null);
      const finalEndDate = updateTaskDto.endDate ? new Date(updateTaskDto.endDate) : (task.endDate ? new Date(task.endDate) : null);

      if (finalStartDate && finalEndDate && finalStartDate > finalEndDate) {
        throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc (hạn xử lý)');
      }

      taskData.typeTask = task.typeTask;
      // 3. Update task info
      // ===== UPDATE TASK INFO (CHUẨN NGHIỆP VỤ) =====
      const TASK_INFO_FIELDS = [
        'name',
        'progress',
        'startDate',
        'endDate',
        'priority',
        'topic',
        'note',
        'processStatus',
        'dependentTaskId',
        'isApprovalRequired',
      ];

      if (updateTaskDto.dependentTaskId !== undefined) {
        const isAssigner = await queryRunner.manager.findOne(TaskUserEntity, {
          where: { taskId: id, processId: userId, role: 'assigner' },
        });

        if (!isAssigner) {
          throw new BadRequestException('Chỉ người giao việc mới có quyền cập nhật vị trí công việc phụ thuộc.');
        }

        if (!task.parent) {
          throw new BadRequestException('Không thể di chuyển công việc nếu không có công việc cha.');
        }

        if (updateTaskDto.dependentTaskId !== null && updateTaskDto.dependentTaskId !== undefined) {
          const depId = Number(updateTaskDto.dependentTaskId);
          if (isNaN(depId)) {
            delete taskData.dependentTaskId;
          } else {
            const depTask = await queryRunner.manager.findOne(TaskEntity, {
              where: { id: depId, status: 1 },
            });
            if (!depTask) {
              throw new BadRequestException('Công việc phụ thuộc không tồn tại.');
            }
            if (depTask.parent !== task.parent) {
              throw new BadRequestException('Công việc phụ thuộc phải có cùng công việc cha.');
            }
          }
        }
      }

      const hasTaskInfoChange = TASK_INFO_FIELDS.some(
        (key) => updateTaskDto[key] !== undefined,
      );
      let oldProgress: any;
      if (hasTaskInfoChange) {
        oldProgress = task.progress;
        queryRunner.manager.merge(TaskEntity, task, {
          ...this.transformDtoForEntity(taskData, true),
          updatedById: userId,
        });

        await queryRunner.manager.save(task);
        isTaskInfoChanged = true;

        if (updateTaskDto.progress !== undefined) {
          await this.updateProgressRecursive(id, queryRunner.manager);
        }
      }


      // 4. Update task users
      const updatedRoles: string[] = [];
      if (assigners !== undefined) updatedRoles.push('assigner');
      if (directors !== undefined) updatedRoles.push('director');
      if (supporters !== undefined) updatedRoles.push('supporter');
      if (viewers !== undefined) updatedRoles.push('viewer');

      if (updatedRoles.length > 0) {
        isUserChanged = true;

        await queryRunner.manager.delete(TaskUserEntity, {
          taskId: id,
          role: In(updatedRoles),
        });

        const allUsers = [
          ...(assigners || []).map((u) => ({ ...u, role: 'assigner' })),
          ...(directors || []).map((u) => ({ ...u, role: 'director' })),
          ...(supporters || []).map((u) => ({ ...u, role: 'supporter' })),
          ...(viewers || []).map((u) => ({ ...u, role: 'viewer' })),
        ];

        if (allUsers.length > 0) {
          const newTaskUsers: TaskUserEntity[] = [];

          // [Tối ưu] Batch query thay vì N+1 query trong vòng for
          // Tách thành 2 nhóm: cá nhân (type=1) và đơn vị (type=2)
          const userTypeEntries = allUsers.filter(u => (u.type ?? 1) === 1);
          const orgTypeEntries = allUsers.filter(u => u.type === 2);

          const userIds = [...new Set(userTypeEntries.map(u => u.processId))];
          const orgIds = [...new Set(orgTypeEntries.map(u => u.processId))];

          // Chạy song song 2 batch queries
          const [fetchedUsers, fetchedOrgs] = await Promise.all([
            userIds.length
              ? queryRunner.manager.find(UserEntity, {
                where: { id: In(userIds) },
                select: ['id', 'name'],
              })
              : Promise.resolve([]),
            orgIds.length
              ? queryRunner.manager.find(OrganizationUnitEntity, {
                where: { id: In(orgIds) },
                select: ['id', 'name'],
              })
              : Promise.resolve([]),
          ]);

          // Tạo Map để tra cứu tên O(1)
          const userNameMap = new Map<string, string>(
            (fetchedUsers as any[]).map(u => [u.id, u.name])
          );
          const orgNameMap = new Map<string, string>(
            (fetchedOrgs as any[]).map(o => [o.id, o.name])
          );

          for (const u of allUsers) {
            const type = u.type ?? 1;
            const processName = type === 2
              ? (orgNameMap.get(u.processId) ?? '')
              : (userNameMap.get(u.processId) ?? '');

            newTaskUsers.push(
              queryRunner.manager.create(TaskUserEntity, {
                taskId: id,
                processId: u.processId,
                processName,
                role: u.role,
                type,
              }),
            );
          }

          await queryRunner.manager.save(newTaskUsers);

          // Notify participants about update
          const recipients = newTaskUsers
            .filter(tu => tu.role === 'director' || tu.role === 'supporter')
            .map(tu => tu.processId);

          if (recipients.length > 0) {
            this.notificationService.createForRecipients({
              recipientIds: [...new Set(recipients)],
              content: `Thông tin người tham gia trong công việc [${task.name}] đã được cập nhật.`,
              senderId: userId,
              key: 'VIEW_TASK',
              type: NotificationType.TASK_STATUS_CHANGED.value,
              recordId: String(id),
              link: `/task/detail/${id}`,
            })
          }
        }
      }

      // ===== RESET PROCESS STATUS IF NO DIRECTOR =====
      const directorCount = await queryRunner.manager.count(TaskUserEntity, {
        where: { taskId: id, role: 'director' },
      });

      if (directorCount === 0) {
        task.processStatus = '1';
        await queryRunner.manager.save(task);
      }

      // ===== SYSTEM LOG (GỌN) =====
      const logs: string[] = [];

      // ===== XỬ LÝ PROCESS STATUS =====
      if (updateTaskDto.processStatus !== undefined) {
        await this.handleProcessStatusUpdateWithManager(id, updateTaskDto.processStatus, queryRunner.manager);
      }

      // ===== SYSTEM LOG (TÁCH RIÊNG) =====
      const isProgressChanged =
        updateTaskDto.progress !== undefined &&
        String(updateTaskDto.progress) !== String(oldProgress ?? '');
      const isProcessStatusChanged = updateTaskDto.processStatus !== undefined;
      const isCommonInfoChanged =
        isTaskInfoChanged &&
        TASK_INFO_FIELDS.some(
          (field) =>
            field !== 'progress' &&
            field !== 'processStatus' &&
            updateTaskDto[field] !== undefined,
        );

      if (isTaskInfoChanged) {
        // [Tối ưu] fire-and-forget, không block response
        this.SystemLogServiceSql.createLogFromSystem({
          action: 'PATCH',
          details: `Cập nhật thông tin công việc (ID: ${id})`,
          method: 'PATCH',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
          subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
          userInfo: req?.user?.userId || userId || '',
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        }).catch(err => this.logger.error('[update] SystemLog isTaskInfoChanged error:', err));

        // Ghi log nghiệp vụ để API all-log-task đọc được
        if (isProgressChanged) {
          await this.createLogFromSystem({
            actions: 'PATCH',
            details: 'Cập nhật tiến độ công việc',
            userInfo: userId,
            timestamps: new Date().toISOString(),
            taskId: id.toString(),
          });
        }
        if (isProcessStatusChanged) {
          await this.createLogFromSystem({
            actions: 'PATCH',
            details: 'Cập nhật trạng thái công việc',
            userInfo: userId,
            timestamps: new Date().toISOString(),
            taskId: id.toString(),
          });
        }
        if (isCommonInfoChanged) {
          await this.createLogFromSystem({
            actions: 'PATCH',
            details: 'Cập nhật thông tin chung',
            userInfo: userId,
            timestamps: new Date().toISOString(),
            taskId: id.toString(),
          });
        }
      }

      if (isUserChanged) {
        // [Tối ưu] fire-and-forget, không block response
        this.SystemLogServiceSql.createLogFromSystem({
          action: 'PATCH',
          details: `Cập nhật người tham gia công việc (ID: ${id})`,
          method: 'PATCH',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
          subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
          userInfo: req?.user?.userId || userId || '',
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        }).catch(err => this.logger.error('[update] SystemLog isUserChanged error:', err));

        // Ghi log nghiệp vụ để API all-log-task đọc được
        await this.createLogFromSystem({
          actions: 'PATCH',
          details: 'Cập nhật thông tin người tham gia',
          userInfo: userId,
          timestamps: new Date().toISOString(),
          taskId: id.toString(),
        });
      }
      // TẠO CÔNG VIỆC TỪ QUY TRÌNH MẪU (NẾU CÓ)
      if (updateTaskDto.templateId && this.isUuid(updateTaskDto.templateId)) {
        // Lấy assigners của task hiện tại từ bảng task_users
        const taskAssigners = await queryRunner.manager.find(TaskUserEntity, {
          where: { taskId: id, role: 'assigner' },
          select: ['processId', 'processName', 'type'],
        });
        updateTaskDto.assigners = taskAssigners.map((tu) => ({
          processId: tu.processId,
          processName: tu.processName,
          type: tu.type,
          role: 'assigner',
        }));
        // this.logger.log(`Creating tasks from template: ${dto.templateId} for parent task: ${task.id}`);
        await this.createTasksFromTemplate(queryRunner, updateTaskDto.templateId, task.id, userId, bpmnXML, flowId, docType, '', updateTaskDto.bpmnId || '', updateTaskDto as CreateTaskDto);
      }
      // 5. BPMN logic
      if (directors || supporters) {
        try {
          await this.sqlRepo.removeWorkItemByConditions({
            documentId: String(task.id),
            state: 'open',
          });
        } catch (err) {
        }

        let newDirectorId = directors?.[0]?.processId;
        const isDirectorUnit = Number(directors?.[0]?.type) === TaskUserType.DEPARTMENT;
        if (isDirectorUnit && newDirectorId) {
          const fallbackId = await this.getDepartmentAssignee(newDirectorId);
          if (fallbackId) newDirectorId = fallbackId;
        }
        if (newDirectorId) {
          await this.createDocumentAtNode({
            bpmnXML,
            data: {
              documentId: String(task.id),
              ...updateTaskDto,
            },
            assigneeUserId: newDirectorId,
            docType,
            queryRunner,
          });
        }

        let firstSupporterId = supporters?.[0]?.processId;
        const isSupporterUnit = Number(supporters?.[0]?.type) === TaskUserType.DEPARTMENT;
        if (isSupporterUnit && firstSupporterId) {
          const fallbackId = await this.getDepartmentAssignee(firstSupporterId);
          if (fallbackId) firstSupporterId = fallbackId;
        }
        if (firstSupporterId) {
          await this.assignSupporter({
            bpmnXML,
            supporterId: firstSupporterId,
            data: {
              documentId: String(task.id),
              ...updateTaskDto,
            },
            docType,
          });
        }
      }

      await queryRunner.commitTransaction();

      // TỰ ĐỘNG CẬP NHẬT TIẾN ĐỘ DỰ ÁN NẾU CÔNG VIỆC THUỘC DỰ ÁN
      if (task.projectId) {
        await this.projectService.calculateAndUpdateProjectProgress(Number(task.projectId));
      } else if (task.parent) {
        // Tìm projectId từ parent nếu task hiện tại không có
        if (task.path) {
          const rootId = task.path.split('/')[0];
          const rootTaskEntity = await this.taskRepository.findOne({
            where: { id: Number(rootId) },
            select: ['projectId']
          });
          if (rootTaskEntity?.projectId) {
            await this.projectService.calculateAndUpdateProjectProgress(Number(rootTaskEntity.projectId));
          }
        }
      }

      if (['4', '8'].includes(String(updateTaskDto.processStatus))) {
        this.notifyTaskParticipantsOfStatusChange(id, String(updateTaskDto.processStatus), userId)
          .catch((err) => this.logger.error('[update] notify status change failed:', err));
      }

      return this.findOne(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }


  async updateFormDoc(
    id: number,
    updateTaskDto: UpdateTaskDto,
    userId: string,
  ): Promise<any> {
    this.validateUpdateInput(updateTaskDto);
    const { assigners, directors, supporters, viewers, ...taskData } =
      updateTaskDto;

    // 1. BPMN permission check
    const { docType, routingKey } = await this.determineDocTypeFromBpmn(
      userId,
      updateTaskDto.bpmnId,
      updateTaskDto,
      'TaskDocumentWorkflow',
    );
    const { bpmnXML, flowId } =
      await this.validateBpmnAndPermissionApproveFormDoc(userId, docType);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // ===== FLAG LOG =====
    let isTaskInfoChanged = false;
    let isUserChanged = false;

    try {
      // 2. Fetch task
      const task = await queryRunner.manager.findOne(TaskEntity, {
        where: { id, status: 1 },
        relations: ['taskUsers'],
      });

      if (!task) {
        throw new NotFoundException(
          `Không tìm thấy công việc với ID ${id} để cập nhật.`,
        );
      }

      if (updateTaskDto.priority !== undefined && String(updateTaskDto.priority) !== String(task.priority)) {
        const isAssigner = task.createdById === userId || task.taskUsers?.some(tu => tu.processId === userId && tu.role === 'assigner');
        if (!isAssigner) {
          throw new BadRequestException('Chỉ người giao việc mới có quyền cập nhật độ ưu tiên với công việc');
        }
      }

      // ✅ Không cho update typeTask
      taskData.typeTask = task.typeTask;

      // ===== UPDATE TASK INFO =====
      const TASK_INFO_FIELDS = [
        'name',
        'progress',
        'startDate',
        'endDate',
        'priority',
        'topic',
        'note',
        'dependentTaskId',
        'isApprovalRequired',
      ];

      if (updateTaskDto.dependentTaskId !== undefined) {
        const isAssigner = task.taskUsers?.some(tu => tu.processId === userId && tu.role === 'assigner');

        if (!isAssigner) {
          throw new BadRequestException('Chỉ người giao việc mới có quyền cập nhật vị trí công việc phụ thuộc.');
        }

        if (!task.parent) {
          throw new BadRequestException('Không thể di chuyển công việc nếu không có công việc cha.');
        }

        if (updateTaskDto.dependentTaskId !== null && updateTaskDto.dependentTaskId !== undefined) {
          const depTask = await queryRunner.manager.findOne(TaskEntity, {
            where: { id: updateTaskDto.dependentTaskId as number, status: 1 },
          });
          if (!depTask) {
            throw new BadRequestException('Công việc phụ thuộc không tồn tại.');
          }
          if (depTask.parent !== task.parent) {
            throw new BadRequestException('Công việc phụ thuộc phải có cùng công việc cha.');
          }
        }
      }

      const hasTaskInfoChange = TASK_INFO_FIELDS.some(
        (key) => updateTaskDto[key] !== undefined,
      );

      if (hasTaskInfoChange) {
        queryRunner.manager.merge(TaskEntity, task, {
          ...this.transformDtoForEntity(taskData, true),
          updatedById: userId,
        });

        if (task.progress === '100') {
          await this.handleProcessStatusUpdateWithManager(id, '4', queryRunner.manager);
        }

        await queryRunner.manager.save(task);
        isTaskInfoChanged = true;

        if (updateTaskDto.progress !== undefined) {
          await this.updateProgressRecursive(id, queryRunner.manager);
        }
      }

      // ===== UPDATE TASK USERS =====
      if (assigners || directors || supporters || viewers) {
        isUserChanged = true;

        await queryRunner.manager.delete(TaskUserEntity, { taskId: id });

        const allUsers = [
          ...(assigners || []).map((u) => ({ ...u, role: 'assigner' })),
          ...(directors || []).map((u) => ({ ...u, role: 'director' })),
          ...(supporters || []).map((u) => ({ ...u, role: 'supporter' })),
          ...(viewers || []).map((u) => ({ ...u, role: 'viewer' })),
        ];

        if (allUsers.length > 0) {
          const newTaskUsers: TaskUserEntity[] = [];

          for (const u of allUsers) {
            const type = u.type ?? 1;
            let processName = '';

            if (type === 1) {
              const user = await queryRunner.manager.findOne(UserEntity, {
                where: { id: u.processId },
                select: ['name'],
              });
              processName = user?.name ?? '';
            }

            if (type === 2) {
              const org = await queryRunner.manager.findOne(
                OrganizationUnitEntity,
                {
                  where: { id: u.processId },
                  select: ['name'],
                },
              );
              processName = org?.name ?? '';
            }

            newTaskUsers.push(
              queryRunner.manager.create(TaskUserEntity, {
                taskId: id,
                processId: u.processId,
                processName,
                role: u.role,
                type,
              }),
            );
          }

          await queryRunner.manager.save(newTaskUsers);

          // Notify participants about update
          const recipients = newTaskUsers
            .filter(tu => tu.role === 'director' || tu.role === 'supporter')
            .map(tu => tu.processId);

          if (recipients.length > 0) {
            this.notificationService.createForRecipients({
              recipientIds: [...new Set(recipients)],
              content: `Thông tin người tham gia trong công việc [${task.name}] đã được cập nhật.`,
              senderId: userId,
              key: 'VIEW_TASK',
              type: NotificationType.TASK_STATUS_CHANGED.value,
              recordId: String(id),
              link: `/task/detail/${id}`,
            })
          }
        }
      }

      // ===== XỬ LÝ PROCESS STATUS =====
      if (updateTaskDto.processStatus !== undefined) {
        await this.handleProcessStatusUpdateWithManager(id, updateTaskDto.processStatus, queryRunner.manager);
      }
      // ===== SYSTEM LOG (TÁCH RIÊNG) =====
      if (isTaskInfoChanged) {
        await this.createLogFromSystem({
          actions: 'PATCH',
          details: 'Cập nhật thông tin công việc',
          userInfo: userId,
          timestamps: new Date().toISOString(),
          taskId: id.toString(),
        });
      }

      if (isUserChanged) {
        await this.createLogFromSystem({
          actions: 'PATCH',
          details: 'Cập nhật thông tin người tham gia',
          userInfo: userId,
          timestamps: new Date().toISOString(),
          taskId: id.toString(),
        });
      }

      // TẠO CÔNG VIỆC TỪ QUY TRÌNH MẪU (NẾU CÓ)
      if (updateTaskDto.templateId && this.isUuid(updateTaskDto.templateId)) {
        // this.logger.log(`Creating tasks from template: ${dto.templateId} for parent task: ${task.id}`);
        await this.createTasksFromTemplate(queryRunner, updateTaskDto.templateId, task.id, userId, bpmnXML, flowId, docType, '', updateTaskDto.bpmnId || '', updateTaskDto as CreateTaskDto);
      }

      // ===== BPMN =====
      if (directors || supporters) {
        await this.sqlRepo.removeWorkItemByConditions({
          documentId: String(task.id),
          state: 'open',
        });

        let newDirectorId = directors?.[0]?.processId;
        const isDirectorUnit = Number(directors?.[0]?.type) === TaskUserType.DEPARTMENT;
        if (isDirectorUnit && newDirectorId) {
          const fallbackId = await this.getDepartmentAssignee(newDirectorId);
          if (fallbackId) newDirectorId = fallbackId;
        }
        if (newDirectorId) {
          await this.createDocumentAtNode({
            bpmnXML,
            data: {
              documentId: String(task.id),
              ...updateTaskDto,
            },
            assigneeUserId: newDirectorId,
            docType,
            queryRunner,
          });
        }

        if (supporters && supporters.length > 0) {
          await Promise.all(
            supporters.map(async (supporter) => {
              if (supporter.processId) {
                let supporterId = supporter.processId;
                const isSupporterUnit = Number(supporter.type) === TaskUserType.DEPARTMENT;
                if (isSupporterUnit) {
                  const fallbackId = await this.getDepartmentAssignee(supporterId);
                  if (fallbackId) supporterId = fallbackId;
                }
                return this.assignSupporter({
                  bpmnXML,
                  supporterId: supporterId,
                  data: {
                    documentId: String(task.id),
                    ...updateTaskDto,
                  },
                  docType
                });
              }
            }),
          );
        }
      }

      await queryRunner.commitTransaction();

      // TỰ ĐỘNG CẬP NHẬT TIẾN ĐỘ DỰ ÁN NẾU CÔNG VIỆC THUỘC DỰ ÁN
      if (task.projectId) {
        await this.projectService.calculateAndUpdateProjectProgress(Number(task.projectId));
      } else if (task.parent) {
        // Tìm projectId từ parent nếu task hiện tại không có
        if (task.path) {
          const rootId = task.path.split('/')[0];
          const rootTaskEntity = await this.taskRepository.findOne({
            where: { id: Number(rootId) },
            select: ['projectId']
          });
          if (rootTaskEntity?.projectId) {
            await this.projectService.calculateAndUpdateProjectProgress(Number(rootTaskEntity.projectId));
          }
        }
      }

      return this.findOne(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }




  async updateStatusJob(
    id: number,
    processStatus: string,
    userId: string,
  ): Promise<any> {
    if (processStatus === undefined || processStatus === null) {
      throw new BadRequestException('Trạng thái mới không hợp lệ');
    }

    const task = await this.taskRepository.findOne({ where: { id } });

    if (!task) {
      throw new NotFoundException(`Không tìm thấy công việc với ID ${id}`);
    }

    if (task.projectId) {
      const project = await this.dataSource.getRepository(ProjectEntity).findOne({
        where: { id: task.projectId, status: 1 },
        select: ['projectStatus']
      });
      if (project && (project.projectStatus === 3 || project.projectStatus === 4)) {
        throw new BadRequestException('Dự án đã Hoàn thành hoặc Hủy, không thể cập nhật trạng thái công việc.');
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (processStatus === '8' || processStatus === '4') {
        await this.handleProcessStatusUpdateWithManager(id, processStatus, queryRunner.manager);
      } else {
        task.processStatus = processStatus;
        task.updatedById = userId;
        await queryRunner.manager.save(task);
      }
      await queryRunner.commitTransaction();

      // CẬP NHẬT TIẾN ĐỘ DỰ ÁN
      if (task.projectId) {
        await this.projectService.calculateAndUpdateProjectProgress(Number(task.projectId));
      } else if (task.parent) {
        // Tìm projectId từ parent nếu task hiện tại không có
        const rootTask = await this.taskRepository.findOne({
          where: { id: task.id },
          select: ['path']
        });
        if (rootTask?.path) {
          const rootId = rootTask.path.split('/')[0];
          const rootTaskEntity = await this.taskRepository.findOne({
            where: { id: Number(rootId) },
            select: ['projectId']
          });
          if (rootTaskEntity?.projectId) {
            await this.projectService.calculateAndUpdateProjectProgress(Number(rootTaskEntity.projectId));
          }
        }
      }

      if (['4', '8'].includes(String(processStatus))) {
        this.notifyTaskParticipantsOfStatusChange(id, String(processStatus), userId)
          .catch((err) => this.logger.error('[  Job] notify status change failed:', err));
      }

      return this.findOne(id, userId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async removeMany(ids: number[], idUser: string) {
    await this.ensurePhongBanTaskPermission(idUser);
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Danh sách id không hợp lệ');
    }

    // 1️⃣ Lấy tất cả task thỏa điều kiện
    const tasks = await this.taskRepository.find({
      where: {
        id: In(ids),
        processStatus: In(['1']),
        // createdBy: { id: idUser },
        status: 1,
      },
      select: ['id', 'path', 'parent', 'projectId'],
    });

    if (!tasks.length) {
      // return {
      //   // affectedRows: 0,
      //   message: 'Công việc đã chạy luồng quy trình không thể xoá',
      // };
      throw new BadRequestException('Công việc đã chạy luồng quy trình không thể xoá');
    }

    let totalAffected = 0;

    // 2️⃣ Update root task theo id
    const resultRoot = await this.taskRepository.update(
      { id: In(ids) },
      { status: 3 },
    );
    totalAffected += resultRoot.affected || 0;

    // 3️⃣ Update task con nếu có path
    for (const task of tasks) {
      if (task.path) {
        const resChild = await this.taskRepository
          .createQueryBuilder()
          .update()
          .set({ status: 3 })
          .where('path LIKE :like', { like: `${task.path}/%` })
          .execute();

        totalAffected += resChild.affected || 0;
      }
    }

    // 4️⃣ Tự động cập nhật tiến độ dự án nếu các công việc bị xóa thuộc dự án
    const projectIds = [...new Set(tasks.map((t: any) => t.projectId).filter((id: any) => !!id))];
    for (const pid of projectIds as any[]) {
      await this.projectService.calculateAndUpdateProjectProgress(Number(pid));
    }

    // 5️⃣ Tạo log cho từng task
    for (const task of tasks) {
      const details = task.parent
        ? `Xóa công việc con của task ${task.parent}`
        : 'Xóa công việc';

      // await this.createLogFromSystem({
      //   actions: 'DELETE',
      //   details,
      //   userInfo: idUser,
      //   timestamps: new Date().toISOString(),
      //   taskId: task.id.toString(),
      // });
    }

    return {
      message: 'Xóa thành công',
      status: 3,
      affected: totalAffected,
      affectedRows: 1,
    };
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

  async buildExcel(queryParams: QueryParams): Promise<ExcelJS.Workbook> {
    const { data } = await this.findAll({
      ...queryParams,
      page: 1,
      limit: 1000000,
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách công việc');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Mã công việc', key: 'code', width: 15 },
      { header: 'Tên công việc', key: 'name', width: 30 },
      { header: 'Chủ đề', key: 'topic', width: 20 },
      { header: 'Độ ưu tiên', key: 'priority', width: 15 },
      { header: 'Tiến độ', key: 'progress', width: 12 },
      { header: 'Trạng thái xử lý', key: 'processStatus', width: 20 },
      { header: 'Ngày bắt đầu', key: 'startDate', width: 18 },
      { header: 'Ngày kết thúc', key: 'endDate', width: 18 },
      { header: 'Người cập nhật', key: 'updatedBy', width: 25 },
      { header: 'Ngày cập nhật', key: 'updatedAt', width: 20 },
      { header: 'Người giao việc', key: 'assigner', width: 25 },
      { header: 'Chủ trì', key: 'director', width: 25 },
      { header: 'Phối hợp', key: 'supporter', width: 30 },
      { header: 'Theo dõi', key: 'viewer', width: 25 },
    ];

    data.forEach((task) => {
      const users = this.mapTaskUsers(task.taskUsers || []);

      sheet.addRow({
        id: task.id,
        code: task.code,
        name: task.name,
        topic: task.topic,
        priority: task.priority,
        progress: task.progress,
        processStatus: task.processStatus,
        startDate: this.formatDate(task.startDate),
        endDate: this.formatDate(task.endDate),
        updatedBy: task.updatedBy?.name || '',
        updatedAt: this.formatDate(task.updatedAt),
        assigner: users.assigner,
        director: users.director,
        supporter: users.supporter,
        viewer: users.viewer,
      });
    });

    sheet.getRow(1).font = { bold: true };

    return workbook;
  }

  async buildExcelDynamic(queryParams: ListTaskDto, userId: string): Promise<any> {
    const viewCode = queryParams.processFn || 'quanlycv';
    const config = await this.configurationService.findOne(viewCode);
    if (!config || !config.field) {
      throw new BadRequestException(`Không tìm thấy cấu hình hiển thị (viewConfig) cho module ${viewCode}`);
    }

    const fields = Array.isArray(config.field) ? config.field : (config.field as any)?.field ?? [];

    if (!fields.length) {
      throw new BadRequestException(`Cấu hình hiển thị (viewConfig) của ${viewCode} không có dữ liệu cột`);
    }

    // Chọn nguồn dữ liệu dựa trên viewCode
    let result: any;
    if (viewCode === 'quanlycvvb') {
      result = await this.findAllFormDoc({
        ...queryParams,
        page: 1,
        limit: 10000,
        isExport: 'true',
      }, userId);
    } else {
      result = await this.findAll({
        ...queryParams,
        page: 1,
        limit: 10000,
        isExport: 'true',
      }, userId);
    }
    const data = result.data || [];

    // Lọc các cột được hiển thị (isShow !== false)
    const activeColumns = fields.filter(col => {
      const isHidden = col.isHidden === true || col.hide === true || col.isShow === false;
      return (col.key || col.dataIndex || col.id || col.name) && !isHidden;
    });

    const excelColumns = [{ header: 'STT', key: 'stt', width: 6 }];
    activeColumns.forEach(col => {
      const fieldKey = col.key || col.dataIndex || col.id || col.name;
      let width = 20;
      if (col.width) {
        const w = parseInt(col.width.toString());
        if (!isNaN(w)) width = w / 7;
      }
      excelColumns.push({
        header: col.label || col.title || col.header || fieldKey,
        key: fieldKey,
        width: width < 10 ? 20 : width,
      });
    });

    const mappedData = data.map((task: any, index: number) => {
      const rowData: any = { stt: index + 1 };
      activeColumns.forEach(col => {
        const fieldKey = col.key || col.dataIndex || col.id || col.name;
        let value = task[fieldKey];

        // 1. Xử lý các trường mảng người xử lý (assigners, directors, supporters, viewers)
        if (['assigners', 'directors', 'supporters', 'viewers', 'taskUsers'].includes(fieldKey) && Array.isArray(value)) {
          value = value.map(u => u.name || u.processName || (u.user?.name)).filter(Boolean).join(', ');
        }
        // 2. Xử lý các trường singular có sẵn từ mapTaskUsers (assigner, director, supporter, viewer)
        else if (['assigner', 'director', 'supporter', 'viewer'].includes(fieldKey)) {
          value = task[fieldKey] ?? '';
        }
        // 3. Xử lý các trường đặc biệt: Trạng thái, Tiến độ
        else if (fieldKey === 'progressView') {
          value = task.progressView || '';
        } else if (fieldKey === 'processStatusUi' || fieldKey === 'processStatus') {
          value = task.processStatusUi || task.processStatus || '';
        }
        // 4. Xử lý Ngày tháng (ưu tiên bản Text thuần từ findAll)
        else if (fieldKey === 'startDate') {
          value = task.startDateNotHTML || task.startDate || '';
        } else if (fieldKey === 'endDate') {
          value = task.endDateNotHTML || task.endDate || '';
        } else if (fieldKey === 'createdAt') {
          value = task.createdAt || '';
        } else if (fieldKey === 'updatedAt') {
          value = task.updatedAt || '';
        }
        // 5. Xử lý các trường đối tượng: createdBy, updatedBy, parent
        else if (fieldKey === 'createdBy' || fieldKey === 'updatedBy') {
          value = task[fieldKey]?.name || '';
        } else if (fieldKey === 'parent') {
          value = task.parent?.name || task.parent || '';
        }
        // 6. Xử lý mặc định cho các trường object khác
        else if (typeof value === 'object' && value !== null) {
          value = value.name || value.title || JSON.stringify(value);
        }

        rowData[fieldKey] = value ?? '';
      });
      return rowData;
    });

    const nameOfList = `Công việc`;

    return { mappedData, excelColumns, nameOfList };
  }

  async buildExcelTaskFormDoc(
    queryParams: QueryParams,
  ): Promise<ExcelJS.Workbook> {
    const { data } = await this.findAllFormDoc({
      ...queryParams,
      page: 1,
      limit: 1000000,
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách công việc từ văn bản');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Mã công việc', key: 'code', width: 15 },
      { header: 'Tên công việc', key: 'name', width: 30 },
      { header: 'Chủ đề', key: 'topic', width: 20 },
      { header: 'Độ ưu tiên', key: 'priority', width: 15 },
      { header: 'Tiến độ', key: 'progress', width: 12 },
      { header: 'Số văn bản', key: 'toBook', width: 20 },
      { header: 'Trạng thái xử lý', key: 'processStatus', width: 20 },
      { header: 'Ngày bắt đầu', key: 'startDate', width: 18 },
      { header: 'Ngày kết thúc', key: 'endDate', width: 18 },
      { header: 'Người cập nhật', key: 'updatedBy', width: 25 },
      { header: 'Ngày cập nhật', key: 'updatedAt', width: 20 },
      { header: 'Người giao việc', key: 'assigner', width: 25 },
      { header: 'Chủ trì', key: 'director', width: 25 },
      { header: 'Phối hợp', key: 'supporter', width: 30 },
      { header: 'Theo dõi', key: 'viewer', width: 25 },
    ];

    data.forEach((task) => {
      const users = this.mapTaskUsers(task.taskUsers || []);

      sheet.addRow({
        id: task.id,
        code: task.code,
        name: task.name,
        topic: task.topic,
        priority: task.priority,
        progress: task.progress,
        toBook: task.toBook || '',
        processStatus: task.processStatus,
        startDate: this.formatDate(task.startDate),
        endDate: this.formatDate(task.endDate),
        updatedBy: task.updatedBy?.name || '',
        updatedAt: this.formatDate(task.updatedAt),
        assigner: users.assigner,
        director: users.director,
        supporter: users.supporter,
        viewer: users.viewer,
      });
    });

    sheet.getRow(1).font = { bold: true };

    return workbook;
  }

  private mapTaskUsers(taskUsers: any[]) {
    const mapByRole = (role: string) =>
      (taskUsers || [])
        .filter((u) => u.role === role)
        .map((u) => u.processName)
        .join(', ');

    const directorDep = (taskUsers || [])
      .filter((u) => u.role === 'director' && u.user?.parent?.name)
      .map((u) => u.user.parent.name)
      .join(', ');

    return {
      assigner: mapByRole('assigner'),
      director: mapByRole('director'),
      supporter: mapByRole('supporter'),
      viewer: mapByRole('viewer'),
      directorDep: directorDep || null,
    };
  }

  private parseDisplayDateToTimestamp(value: any): number {
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;

    const raw = String(value).trim();
    if (!raw) return 0;

    const m = raw.match(
      /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/,
    );
    if (m) {
      const [, dd, mm, yyyy, hh = '00', mi = '00'] = m;
      return new Date(
        Number(yyyy),
        Number(mm) - 1,
        Number(dd),
        Number(hh),
        Number(mi),
      ).getTime();
    }

    const parsed = new Date(raw).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private applyJsTaskSort(data: any[], sort: any): void {
    if (!sort || typeof sort !== 'object' || !Array.isArray(data) || data.length < 2) {
      return;
    }

    const textFields = new Set(['assigner', 'director', 'supporter', 'viewer', 'name']);
    const numberFields = new Set(['progress']);
    const dateFields = new Set(['startDate', 'endDate', 'createdAt', 'updatedAt']);
    const sortEntries = Object.entries(sort).filter(([field]) =>
      textFields.has(field) || numberFields.has(field) || dateFields.has(field),
    );

    if (!sortEntries.length) return;

    data.sort((a, b) => {
      for (const [field, direction] of sortEntries) {
        const isDesc = Number(direction) === -1;
        let cmp = 0;

        if (dateFields.has(field)) {
          const aVal = field === 'startDate' ? (a.startDateNotHTML || a.startDate) : field === 'endDate' ? (a.endDateNotHTML || a.endDate) : a[field];
          const bVal = field === 'startDate' ? (b.startDateNotHTML || b.startDate) : field === 'endDate' ? (b.endDateNotHTML || b.endDate) : b[field];
          cmp = this.parseDisplayDateToTimestamp(aVal) - this.parseDisplayDateToTimestamp(bVal);
        } else if (numberFields.has(field)) {
          cmp = Number(a[field] || 0) - Number(b[field] || 0);
        } else {
          cmp = String(a[field] || '').localeCompare(String(b[field] || ''), 'vi');
        }

        if (cmp !== 0) {
          return isDesc ? -cmp : cmp;
        }
      }
      return 0;
    });
  }

  private formatDate(date?: string | Date | null) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('vi-VN');
  }

  // ==========================================
  // CRONJOB LOGIC: RECURRING TASKS
  // ==========================================

  // async scanAndCreateRecurringTasks(cronContext?: {
  //   currentHour: number;
  //   currentMinute: number;
  //   currentDay: number; // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
  //   now: Date;
  // }) {
  //   const now = cronContext?.now ? dayjs(cronContext.now) : dayjs();

  //   // 1. Tìm các task gốc (GENERAL) có cấu hình lặp (tuan, thang, quy) và đang hoạt động
  //   const tasks = await this.taskRepository.find({
  //     where: {
  //       typeTask: TASK_TYPE.GENERAL,
  //       status: STATUS.ACTIVED,
  //       repetitiveTask: In(['tuan', 'thang', 'quy', 'phut']),
  //     },
  //   });

  //   this.logger.log(
  //     `[Cron] Tìm thấy ${tasks.length} công việc lặp lại cần kiểm tra.`,
  //   );

  //   for (const task of tasks) {
  //     try {
  //       // Kiểm tra loop date range
  //       if (task.repetitiveStart && now.isBefore(dayjs(task.repetitiveStart), 'day')) {
  //         continue; // Chưa đến ngày bắt đầu vòng lặp
  //       }
  //       if (task.repetitiveEnd && now.isAfter(dayjs(task.repetitiveEnd), 'day')) {
  //         continue; // Đã quá ngày kết thúc vòng lặp
  //       }

  //       // Kiểm tra TIME (Giờ lặp)
  //       // Nếu có cấu hình repeatTime, phải đúng giờ phút (sai số 5p)


  //       // Kiểm tra DATE (Ngày lặp)
  //       if (this.isTaskDue(task, now)) {
  //         // Check xem hôm nay đã tạo task chưa (tránh trùng lặp)
  //         const alreadyCreated = await this.checkIfRecurringExists(task.id, task.repetitiveTask, now);
  //         if (!alreadyCreated) {
  //            await this.createRecurringTaskFromTemplate(task, cronContext);
  //         }
  //       }
  //     } catch (error) {
  //       this.logger.error(
  //         `[Cron] Lỗi xử lý lặp lại cho task ID ${task.id}`,
  //         error,
  //       );
  //     }
  //   }
  // }

  private async checkIfRecurringExists(
    originalId: number,
    type: string,
    now: dayjs.Dayjs,
  ): Promise<boolean> {
    let start: Date;
    let end: Date;

    if (type === 'phut') {
      start = now.startOf('minute').toDate();
      end = now.endOf('minute').toDate();
    } else {
      start = now.startOf('day').toDate();
      end = now.endOf('day').toDate();
    }

    const count = await this.taskRepository.count({
      where: {
        recurringFromId: originalId,
        typeTask: TASK_TYPE.RECURRING,
        createdAt: Between(start, end),
      },
    });

    return count > 0;
  }

  private isTaskDue(task: TaskEntity, currentMoment: dayjs.Dayjs): boolean {
    // Kiểm tra xem có vượt quá ngày kết thúc lặp không
    if (task.repetitiveEnd) {
      const endMoment = dayjs(task.repetitiveEnd).startOf('day');
      if (currentMoment.isAfter(endMoment)) return false;
    }

    // Các biến phụ trợ
    const currentDayOfWeek = currentMoment.day(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const currentDate = currentMoment.date();
    const currentMonthIndex = currentMoment.month(); // 0-11

    switch (task.repetitiveTask) {
      case 'phut':
        return true;

      case 'tuan': // Lặp hàng tuần - check theo thứ mấy
        if (!task.weekDays) return false;

        try {
          // weekDays có thể là "[2,3,4]" hoặc "2,3,4"
          const weekDaysStr = task.weekDays.replace(/[\[\]]/g, '').trim();
          const selectedDays = weekDaysStr.split(',').map(d => parseInt(d.trim()));

          // Chuyển đổi: currentDayOfWeek (0-6) sang format (2-8)
          // 0=Sunday->8, 1=Monday->2, 2=Tuesday->3, ..., 6=Saturday->7
          const dayInFormat = currentDayOfWeek === 0 ? 8 : currentDayOfWeek + 1;

          return selectedDays.includes(dayInFormat);
        } catch (error) {
          this.logger.error(`Error parsing weekDays for task ${task.id}:`, error);
          return false;
        }

      case 'thang': // Lặp hàng tháng - lặp theo ngày trong tháng từ startDate
        if (!task.startDate) return false;

        const startDate = dayjs(task.startDate);
        const targetDayOfMonth = startDate.date(); // Lấy ngày từ startDate

        // Kiểm tra xem ngày hiện tại có khớp với ngày trong startDate không
        return currentDate === targetDayOfMonth;

      case 'quy': // Lặp hàng quý - lặp theo ngày và tháng được chọn
        if (!task.startDate) return false;

        const startDateQuarterly = dayjs(task.startDate);
        const targetDayQuarterly = startDateQuarterly.date();

        // Kiểm tra ngày có khớp không
        if (currentDate !== targetDayQuarterly) return false;

        // Kiểm tra tháng trong quý
        if (task.month) {
          try {
            // month có thể là "[1,2]" hoặc "1,2" - đại diện cho tháng thứ mấy trong quý (1, 2, hoặc 3)
            const monthStr = task.month.replace(/[\[\]]/g, '').trim();
            const selectedMonthsInQuarter = monthStr.split(',').map(m => parseInt(m.trim()));

            // Tính tháng hiện tại trong quý (1, 2, hoặc 3)
            const currentMonthInQuarter = (currentMonthIndex % 3) + 1;

            return selectedMonthsInQuarter.includes(currentMonthInQuarter);
          } catch (error) {
            this.logger.error(`Error parsing month for quarterly task ${task.id}:`, error);
            return false;
          }
        } else {
          // Nếu không có month được chọn, mặc định chạy vào tháng đầu tiên của quý
          const currentMonthInQuarter = (currentMonthIndex % 3) + 1;
          return currentMonthInQuarter === 1;
        }

      default:
        return false;
    }
  }

  private async createRecurringTaskFromTemplate(
    originalTask: TaskEntity,
    cronContext?: {
      currentHour: number;
      currentMinute: number;
      currentDay: number;
      now: Date;
    },
  ) {
    // 2. Tìm bản ghi TEMPLATE tương ứng của task gốc
    const template = await this.taskRepository.findOne({
      where: {
        recurringFromId: originalTask.id,
        typeTask: TASK_TYPE.TEMPLATE,
        status: 1,
      },
      relations: ['taskUsers'],
    });

    if (!template) {
      this.logger.warn(
        `[Cron] Không tìm thấy template cho task gốc ID ${originalTask.id}`,
      );
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Tính toán thời hạn dựa trên executionDays và executionHours (nếu có)
      const duration = 0;
      const durationUnit: 'day' | 'hour' = 'day';

      const newStartDate = new Date(); // Hôm nay
      const newEndDate = duration > 0
        ? dayjs(newStartDate).add(duration, durationUnit).toDate()
        : dayjs(newStartDate).add(1, 'day').toDate(); // Mặc định 1 ngày

      // Sinh mã công việc mới
      const newCode = await this.generateTaskCode('CN', 'UNIT');

      // 3. Tạo bản ghi RECURRING mới từ Template
      const newTask = queryRunner.manager.create(TaskEntity, {
        ...template,
        id: undefined, // Tạo ID mới
        typeTask: TASK_TYPE.RECURRING,
        recurringFromId: originalTask.id, // Lưu ID gốc
        startDate: newStartDate,
        endDate: newEndDate,
        status: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        code: newCode, // Tạo mã mới
        taskUsers: undefined, // Sẽ copy thủ công bên dưới
      });

      const savedTask = await queryRunner.manager.save(newTask);

      // 4. Copy Task Users từ Template sang Task mới
      if (template.taskUsers && template.taskUsers.length > 0) {
        const newUsers = template.taskUsers.map((u) =>
          queryRunner.manager.create(TaskUserEntity, {
            taskId: savedTask.id,
            processId: u.processId,
            processName: u.processName,
            role: u.role,
            type: u.type,
          }),
        );
        await queryRunner.manager.save(newUsers);
      }

      await queryRunner.commitTransaction();
      // this.logger.log(
      //   `[Cron] Đã tạo công việc lặp lại ID ${savedTask.id} từ gốc ${originalTask.id}`,
      // );
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async confirmAdjust(taskId: number, userId: string) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['taskUsers'],
    });
    if (!task) {
      throw new NotFoundException('Công việc không tồn tại');
    }

    const workItems = await this.dataSource.query(
      `SELECT TOP 1 * FROM work_items WHERE document_id = @0 AND assignee_user_id = @1`,
      [String(taskId), userId],
    );

    if (!workItems || workItems.length === 0) {
      throw new BadRequestException(
        'Bạn không có quyền thực hiện hành động này hoặc công việc đã được xử lý',
      );
    }
    const data = workItems[0] as any;
    const docType = data.bpmn_version;
    // Các bước nặng (BPMN) xử lý TRƯỚC transaction
    const { bpmnXML } = await this.validateBpmnAndPermission(userId, docType);
    const { indexes } = await this.getModelFromXml(bpmnXML);

    let directorTargetNode: any = null;
    let supporterTargetNode: any = null;
    let extensionSourceNode: any = null;

    // =========================
    // LOGIC PARENT NODE
    // =========================
    const parentNodeId = data.node_id || data.parent_node_id;
    if (parentNodeId) {
      const parentNode = (indexes.nodes as Map<string, any>).get(parentNodeId);
      if (parentNode && (docType === DOCTYPE.TaskManyLevelUnit || docType === 'TaskProject')) {
        if (parentNode?.outgoing) {
          extensionSourceNode = parentNode;
          const gctFlow = parentNode.outgoing.find(
            (fl: any) => fl.name === 'GIAO_CHU_TRI',
          );
          if (gctFlow) {
            const resGct = this.bpmnEngine.nextInteractiveFromFlow(
              gctFlow,
              indexes,
            );
            directorTargetNode = resGct.node;
          }

          // Find Supporter Target (GIAO_PHOI_HOP)
          const gphFlow = parentNode.outgoing.find(
            (fl: any) => fl.name === 'GIAO_PHOI_HOP',
          );
          if (gphFlow) {
            const resGph = this.bpmnEngine.nextInteractiveFromFlow(
              gphFlow,
              indexes,
            );
            supporterTargetNode = resGph.node;
          }
        }
      }
    }

    // =========================
    // LOGIC START EVENT (Fallback)
    // =========================
    if (!directorTargetNode && !supporterTargetNode) {
      const startEvent = Array.from(indexes.nodes.values()).find(
        (node: any) => node.$type === 'bpmn:StartEvent',
      ) as any;

      if (!startEvent) {
        throw new BadRequestException('Không tìm thấy StartEvent');
      }

      const { node: firstNode } = this.bpmnEngine.nextInteractiveFromFlow(
        startEvent.outgoing?.[0],
        indexes,
      );

      extensionSourceNode = firstNode;

      if (firstNode) {
        // Director (GIAO_CHU_TRI)
        const dFlow = firstNode.outgoing?.find(
          (fl: any) => fl.name === 'GIAO_CHU_TRI',
        );
        if (dFlow) {
          const res = this.bpmnEngine.nextInteractiveFromFlow(dFlow, indexes);
          directorTargetNode = res.node;
        }

        // Supporter (GIAO_PHOI_HOP)
        const sFlow = firstNode.outgoing?.find(
          (fl: any) => fl.name === 'GIAO_PHOI_HOP',
        );
        if (sFlow) {
          const res = this.bpmnEngine.nextInteractiveFromFlow(sFlow, indexes);
          supporterTargetNode = res.node;
        }
      }
    }

    // ================= TRANSACTION MSSQL =================
    const tx = await this.sqlRepo.begin();

    try {
      const allRecipientIds: string[] = [];

      // 1. Xóa workitem cũ
      await this.sqlRepo.removeWorkItemByConditions(
        {
          documentId: String(taskId),
          state: 'open',
        },
        tx,
      );

      // ====================================================
      // 2. WORK ITEM CHO DIRECTOR
      // ====================================================
      const directors = task.taskUsers.filter((u) => u.role === 'director');
      const isDirectorUnit =
        directors.length > 0 ? directors[0].type === TaskUserType.DEPARTMENT : false;

      if (directors.length > 0 && directorTargetNode) {
        let directorIds: string[] = [];
        if (isDirectorUnit) {
          directorIds = await this.getDepartmentClerks(directors[0].processId);
          if (directorIds.length === 0) {
            const fallbackId = await this.getDepartmentAssignee(directors[0].processId);
            if (fallbackId) directorIds.push(fallbackId);
          }
        } else if (directors[0].processId) {
          directorIds = [directors[0].processId];
        }

        const role = indexes.laneMap.get(directorTargetNode.id);

        if (role && directorIds.length > 0) {
          for (const directorId of directorIds) {
            allRecipientIds.push(directorId);
            const workItem: WorkItem = {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: directorTargetNode.id,
              role,
              assigneeUserId: directorId,
              nodeType: directorTargetNode.$type,
            };
            await this.sqlRepo.addWorkItem(
              String(taskId),
              workItem,
              tx,
              docType,
            );

            await this.sqlRepo.addAudit(
              String(taskId),
              {
                userId,
                role,
                actionCode: 'XAC_NHAN_DIEU_CHINH',
                fromNodeId: null,
                toNodeId: directorTargetNode.id,
                created_by: userId,
                receiver: directorId,
                roleProcess: role,
                action: 'Xác nhận điều chỉnh',
                stage_status: 'GIAO_CHU_TRI',
                details: { taskId },
                typeDocument: 'TaskManyUnit',
              },
              tx,
            );
          }
          // Check extension (dựa trên flow GIAO_CHU_TRI hoặc flow 0)
          const props =
            getAllNodeExtensionProperties(
              extensionSourceNode?.outgoing?.find(
                (fl: any) => fl.name === 'GIAO_CHU_TRI',
              )?.targetRef || extensionSourceNode?.outgoing?.[0]?.targetRef,
            ) || {};
          // const props =
          //   getAllNodeExtensionProperties(directorTargetNode) || {};

          if (props?.statusCode) {
            await this.sqlRepo.updateTaskStatus(taskId, props.statusCode, tx);
          }
        }
      }

      // ====================================================
      // 3. WORK ITEM CHO SUPPORTER
      // ====================================================
      const supporters = task.taskUsers.filter((u) => u.role === 'supporter');

      if (supporters.length > 0 && supporterTargetNode) {
        const role = indexes.laneMap.get(supporterTargetNode.id);

        if (role) {
          for (const supporter of supporters) {
            if (!supporter.processId) continue;
            let assigneeId = supporter.processId;
            const isSupporterUnit = supporter.type === TaskUserType.DEPARTMENT;

            if (isSupporterUnit) {
              const targetId = await this.getDepartmentAssignee(assigneeId);
              if (targetId) {
                assigneeId = targetId;
              }
            }

            allRecipientIds.push(assigneeId);
            const workItem: WorkItem = {
              id: `wi_sup_${Date.now()}_${assigneeId}`,
              nodeId: supporterTargetNode.id,
              role,
              assigneeUserId: assigneeId,
              nodeType: supporterTargetNode.$type,
            };

            await this.sqlRepo.addWorkItem(
              String(taskId),
              workItem,
              tx,
              docType,
            );

            await this.sqlRepo.addAudit(
              String(taskId),
              {
                userId,
                role: 'supporter',
                actionCode: 'ASSIGN_SUPPORTER',
                fromNodeId: supporterTargetNode.id,
                toNodeId: supporterTargetNode.id,
                action: 'Giao phối hợp (Sau điều chỉnh)',
                stage_status: 'PHOI_HOP',
                receiver: assigneeId,
                details: { taskId },
                typeDocument: 'TaskManyUnit',
              },
              tx,
            );
          }
        }
      }

      // ✅ COMMIT DUY NHẤT
      await tx.commit();

      // 🔔 Thông báo cho người chủ trì và người phối hợp
      if (allRecipientIds.length > 0) {
        const uniqueRecipients = [...new Set(allRecipientIds)];
        const taskUsers = await this.taskUserRepository.find({
          where: { taskId: Number(taskId) },
        });

        const viewerSet = new Set(
          taskUsers
            .filter((tu) => tu.role === TaskUserRole.VIEWER)
            .map((tu) => String(tu.processId).trim()),
        );

        const processorRecipients = uniqueRecipients.filter((id) => !viewerSet.has(String(id).trim()));
        const viewerRecipients = uniqueRecipients.filter((id) => viewerSet.has(String(id).trim()));

        if (processorRecipients.length > 0) {
          await this.notificationService.createForRecipients({
            recipientIds: processorRecipients,
            senderId: userId || '',
            key: 'VIEW_TASK',
            type: NotificationType.TASK_ADJUSTMENT_APPROVED_PROCESSOR.value,
            content: `Công việc đã được điều chỉnh: ${task.name}`,
            recordId: String(taskId),
          });
        }

        if (viewerRecipients.length > 0) {
          await this.notificationService.createForRecipients({
            recipientIds: viewerRecipients,
            senderId: userId || '',
            key: 'VIEW_TASK',
            type: NotificationType.TASK_ADJUSTMENT_APPROVED_VIEWER.value,
            content: `Công việc đã được điều chỉnh: ${task.name}`,
            recordId: String(taskId),
          });
        }
      }

      // Ghi log hệ thống SQL Server
      try {
        await this.SystemLogServiceSql.createLogFromSystem({
          action: 'POST',
          details: `Xác nhận điều chỉnh công việc`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
          subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
          userInfo: userId,
          ipAddress: 'System',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Lỗi ghi log hệ thống:', error);
      }

      await this.createLogFromSystem({
        actions: 'POST',
        details: `Xác nhận điều chỉnh công việc`,
        // note: dto.note,
        userInfo: userId,
        timestamps: new Date().toISOString(),
        taskId: task.id.toString(),
      });

      return {
        success: true,
        message: 'Xác nhận điều chỉnh thành công',
      };
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  async confirmAdjustFormDoc(taskId: number, userId: string) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['taskUsers'],
    });
    if (!task) {
      throw new NotFoundException('Công việc không tồn tại');
    }
    const { docType, routingKey } = await this.determineDocTypeFromBpmn(
      userId,
      task.bpmnId,
      task,
      'TaskDocumentWorkflow',
    );

    // const docType = 'TaskDocument';
    // ❗ Các bước nặng (BPMN) xử lý TRƯỚC transaction
    const { bpmnXML } = await this.validateBpmnAndPermission(
      userId,
      docType,
    );
    const { indexes } = await this.getModelFromXml(bpmnXML);

    const startEvent = Array.from(indexes.nodes.values()).find(
      (node: any) => node.$type === 'bpmn:StartEvent',
    ) as any;

    if (!startEvent) {
      throw new BadRequestException('Không tìm thấy StartEvent');
    }

    // ================= TRANSACTION MSSQL =================
    const tx = await this.sqlRepo.begin();

    try {
      const allRecipientIds: string[] = [];

      // 1. Xóa workitem cũ
      await this.sqlRepo.removeWorkItemByConditions(
        {
          documentId: String(taskId),
          state: 'open',
        },
        tx,
      );

      // ====================================================
      // 2. WORK ITEM CHO DIRECTOR
      // ====================================================
      const directors = task.taskUsers.filter((u) => u.role === 'director');
      const isDirectorUnit =
        directors.length > 0 ? directors[0].type === TaskUserType.DEPARTMENT : false;

      if (directors.length > 0) {
        let directorIds: string[] = [];
        if (isDirectorUnit) {
          directorIds = await this.getDepartmentClerks(directors[0].processId);
          if (directorIds.length === 0) {
            const fallbackId = await this.getDepartmentAssignee(directors[0].processId);
            if (fallbackId) directorIds.push(fallbackId);
          }
        } else if (directors[0].processId) {
          directorIds = [directors[0].processId];
        }

        const flow = startEvent.outgoing?.[0];
        const { node: firstNode } = this.bpmnEngine.nextInteractiveFromFlow(
          flow,
          indexes,
        );

        const { node: targetNode } = this.bpmnEngine.nextInteractiveFromFlow(
          firstNode?.outgoing?.[0],
          indexes,
        );

        if (targetNode) {
          const role = indexes.laneMap.get(targetNode.id);

          if (role && directorIds.length > 0) {
            for (const directorId of directorIds) {
              allRecipientIds.push(directorId);
              const workItem: WorkItem = {
                id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                nodeId: targetNode.id,
                role,
                assigneeUserId: directorId,
                nodeType: targetNode.$type,
              };
              await this.sqlRepo.addWorkItem(
                String(taskId),
                workItem,
                tx,
                docType,
              );

              await this.sqlRepo.addAudit(
                String(taskId),
                {
                  userId,
                  role,
                  actionCode: 'XAC_NHAN_DIEU_CHINH',
                  fromNodeId: null,
                  toNodeId: targetNode.id,
                  created_by: userId,
                  receiver: directorId,
                  roleProcess: role,
                  action: 'Xác nhận điều chỉnh',
                  stage_status: 'GIAO_CHU_TRI',
                  details: { taskId }, // ❗ tránh stringify object lớn
                  typeDocument: 'TaskDocument',
                },
                tx,
              );
            }
            const props =
              getAllNodeExtensionProperties(
                firstNode?.outgoing?.[0].targetRef,
              ) || {};

            if (props?.statusCode) {
              await this.sqlRepo.updateTaskStatus(taskId, props.statusCode, tx);
            }
          }
        }
      }

      // ====================================================
      // 3. WORK ITEM CHO SUPPORTER
      // ====================================================
      const supporters = task.taskUsers.filter((u) => u.role === 'supporter');

      if (supporters.length > 0) {
        const flow = startEvent.outgoing?.[0];
        const { node: firstNode } = this.bpmnEngine.nextInteractiveFromFlow(
          flow,
          indexes,
        );

        const { node: targetNode } = this.bpmnEngine.nextInteractiveFromFlow(
          firstNode?.outgoing?.[1],
          indexes,
        );

        if (targetNode) {
          const role = indexes.laneMap.get(targetNode.id);

          if (role) {
            for (const supporter of supporters) {
              if (!supporter.processId) continue;
              let assigneeId = supporter.processId;
              const isSupporterUnit = supporter.type === TaskUserType.DEPARTMENT;

              if (isSupporterUnit) {
                const targetId = await this.getDepartmentAssignee(assigneeId);
                if (targetId) {
                  // this.logger.log(
                  //   `XAC_NHAN_DIEU_CHINH: Chuyển assignee phối hợp từ phòng ban ${assigneeId} sang user ${targetId}`,
                  // );
                  assigneeId = targetId;
                }
              }

              allRecipientIds.push(assigneeId);
              const workItem: WorkItem = {
                id: `wi_sup_${Date.now()}_${assigneeId}`,
                nodeId: targetNode.id,
                role,
                assigneeUserId: assigneeId,
                nodeType: targetNode.$type,
              };

              await this.sqlRepo.addWorkItem(
                String(taskId),
                workItem,
                tx,
                undefined,
              );

              await this.sqlRepo.addAudit(
                String(taskId),
                {
                  userId,
                  role: 'supporter',
                  actionCode: 'ASSIGN_SUPPORTER',
                  fromNodeId: targetNode.id,
                  toNodeId: targetNode.id,
                  action: 'Giao phối hợp (Sau điều chỉnh)',
                  stage_status: 'PHOI_HOP',
                  receiver: assigneeId,
                  details: { taskId },
                  typeDocument: 'TaskDocument',
                },
                tx,
              );
            }
          }
        }
      }

      // ✅ COMMIT DUY NHẤT
      await tx.commit();

      // 🔔 Thông báo cho người chủ trì và người phối hợp
      if (allRecipientIds.length > 0) {
        const uniqueRecipients = [...new Set(allRecipientIds)];
        const taskUsers = await this.taskUserRepository.find({
          where: { taskId: Number(taskId) },
        });

        const viewerSet = new Set(
          taskUsers
            .filter((tu) => tu.role === TaskUserRole.VIEWER)
            .map((tu) => String(tu.processId).trim()),
        );

        const processorRecipients = uniqueRecipients.filter((id) => !viewerSet.has(String(id).trim()));
        const viewerRecipients = uniqueRecipients.filter((id) => viewerSet.has(String(id).trim()));

        if (processorRecipients.length > 0) {
          await this.notificationService.createForRecipients({
            recipientIds: processorRecipients,
            senderId: userId || '',
            key: 'VIEW_TASK',
            type: NotificationType.TASK_ADJUSTMENT_APPROVED_PROCESSOR.value,
            content: `Công việc đã được điều chỉnh: ${task.name}`,
            recordId: String(taskId),
          });
        }

        if (viewerRecipients.length > 0) {
          await this.notificationService.createForRecipients({
            recipientIds: viewerRecipients,
            senderId: userId || '',
            key: 'VIEW_TASK',
            type: NotificationType.TASK_ADJUSTMENT_APPROVED_VIEWER.value,
            content: `Công việc đã được điều chỉnh: ${task.name}`,
            recordId: String(taskId),
          });
        }
      }

      // Ghi log hệ thống SQL Server
      try {
        await this.SystemLogServiceSql.createLogFromSystem({
          action: 'POST',
          details: `Xác nhận điều chỉnh công việc từ văn bản`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
          subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
          userInfo: userId,
          ipAddress: 'System',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Lỗi ghi log hệ thống:', error);
      }

      await this.createLogFromSystem({
        actions: 'POST',
        details: `Xác nhận điều chỉnh công việc`,
        // tuỳ bạn muốn note lấy từ đâu
        userInfo: userId,
        timestamps: new Date().toISOString(),
        taskId: task.id.toString(),
      });

      return {
        success: true,
        message: 'Xác nhận điều chỉnh thành công',
      };
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }


  async sendAdjust(userId: string, dto: SendApprovalDto, req?: any) {
    const { taskId, actionCode, note, files, assigneeUserId } = dto;
    // 1. Validate Task
    // [Tối ưu] Lấy task và workItems song song
    const [task, workItems] = await Promise.all([
      this.taskRepository.findOne({
        where: { id: taskId, status: 1 },
      }),
      this.dataSource.query(
        `SELECT TOP 1 * FROM work_items WHERE document_id = @0 AND assignee_user_id = @1`,
        [String(taskId), userId],
      ),
    ]);

    if (!task) throw new NotFoundException('Công việc không tồn tại');

    if (!workItems || workItems.length === 0) {
      throw new BadRequestException(
        'Bạn không có quyền thực hiện hành động này hoặc công việc đã được xử lý',
      );
    }
    const docType = workItems[0].bpmn_version;
    const { bpmnXML } = await this.validateBpmnAndPermissionApprove(userId, docType);
    const { indexes } = await this.getModelFromXml(bpmnXML);

    const wi = workItems[0];

    // 4. Determine Next Node
    const node = indexes.nodes.get(wi.node_id);
    if (!node)
      throw new BadRequestException(
        'Node hiện tại không hợp lệ trong quy trình',
      );

    const outs = indexes.outgoingBySource.get(node.id) || [];
    const flow = outs.find(
      (f) =>
        f.name?.toUpperCase() === actionCode?.toUpperCase() ||
        f.id === actionCode,
    );
    if (!flow) {
      throw new BadRequestException(
        `Không tìm thấy luồng đi cho hành động: ${actionCode}`,
      );
    }
    const nodeExtCode = flow.targetRef
      ? this.bpmnEngine.getFlowExtensionProperties(flow)
      : undefined;
    const nodeExt = flow.targetRef
      ? getAllNodeExtensionProperties(flow.targetRef)
      : undefined;

    let nextNode;
    if (nodeExtCode?.flagNotNextNode === 'true') {
      ({ node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
        flow,
        indexes,
      ));
    } else {
      ({ node: nextNode } = this.bpmnEngine.findNextGatewayFromFlow(
        flow,
        indexes,
      ));
    }

    const targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;
    // 5. Transaction Execution
    const tx = await this.sqlRepo.begin();
    const processStatus = nodeExt?.statusCode ? nodeExt.statusCode : undefined;
    // Find the original assigner of the task
    // [Tối ưu] Lấy originalAssigner và originalDirectors song song
    const [originalAssigner, originalDirectors] = await Promise.all([
      this.taskUserRepository.findOne({ where: { taskId: taskId, role: 'assigner' } }),
      this.taskUserRepository.findOne({ where: { taskId: taskId, role: 'director' } }),
    ]);
    if (!originalAssigner) {
      throw new NotFoundException(
        'Không tìm thấy người giao việc gốc của công việc này.',
      );
    }
    let nextAssigneeId;

    if (nodeExtCode?.flagNotNextNode === 'true') {
      if (originalDirectors?.type === 2) {
        nextAssigneeId = await this.getDepartmentClerks(originalDirectors.processId);
      } else {
        nextAssigneeId = originalDirectors?.processId || null;
      }
    } else {
      nextAssigneeId = originalAssigner.processId;
    }
    if (docType === DOCTYPE.TaskManyLevelUnit && nodeExtCode?.flagGctGph === 'true') {
      const { directorTargetNode, supporterTargetNode } = this.findGctGphNodes(nextNode, indexes);

      // 5.1 Remove Old WorkItem
      await this.sqlRepo.removeWorkItem(String(taskId), wi.id, tx);

      // 5.2 Create WorkItem for Director
      if (directorTargetNode) {
        const directors = await this.taskUserRepository.find({
          where: { taskId, role: 'director' },
        });
        let directorIds: string[] = [];
        if (directors[0]?.type === 2) {
          // Lấy tất cả văn thư trong phòng ban
          directorIds = await this.getDepartmentClerks(directors[0]?.processId);
          // Nếu không có văn thư nào thì fallback về getDepartmentAssignee (lấy 1 người)
          if (directorIds.length === 0) {
            const fallbackId = await this.getDepartmentAssignee(directors[0]?.processId);
            if (fallbackId) directorIds.push(fallbackId);
          }
        } else if (directors[0]?.processId) {
          directorIds = [directors[0].processId];
        }
        if (directorIds.length > 0) {
          const role = indexes.laneMap.get(directorTargetNode.id);
          for (const directorId of directorIds) {
            const newWi: WorkItem = {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: directorTargetNode.id,
              role: role || '',
              assigneeUserId: directorId,
              nodeType: directorTargetNode.$type,
            };
            await this.sqlRepo.addWorkItem(String(taskId), newWi, tx, docType);

            await this.sqlRepo.addAudit(
              String(taskId),
              {
                userId,
                role: wi.role,
                actionCode,
                fromNodeId: wi.nodeId,
                toNodeId: directorTargetNode.id,
                action: this.getActionLabel(actionCode),
                details: { note, files, nextAssigneeId: directorId },
                typeDocument: 'TaskManyUnit',
                stage_status: 'DA_XU_LY',
                created_at: new Date(),
                updated_at: new Date(),
                receiver: directorId,
              },
              tx,
            );
          }
        }
      }

      // 5.3 Create WorkItem for Supporter
      if (supporterTargetNode) {
        const supporters = await this.taskUserRepository.find({
          where: { taskId, role: 'supporter' },
        });
        const firstSupporterId = supporters?.[0]?.processId;
        if (firstSupporterId) {
          const role = indexes.laneMap.get(supporterTargetNode.id);
          const newWiSup: WorkItem = {
            id: `wi_sup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: supporterTargetNode.id,
            role: role || '',
            assigneeUserId: firstSupporterId,
            nodeType: supporterTargetNode.$type,
          };
          await this.sqlRepo.addWorkItem(String(taskId), newWiSup, tx, docType);
        }
      }

      if (processStatus !== undefined) {
        await this.handleProcessStatusUpdate(taskId, processStatus, tx);
      }

      await this.sqlRepo.commit(tx);

      // Ghi log nghiệp vụ để API all-log-task đọc được
      this.createLogFromSystem({
        actions: 'POST',
        details: `${this.getActionLabel(actionCode)} công việc`,
        note: dto.note,
        userInfo: userId,
        timestamps: new Date().toISOString(),
        taskId: taskId.toString(),
      }).catch(err => this.logger.error('[sendAdjust] createLogFromSystem error in special case:', err));

      // Skip the rest of the function for this special case
      return { success: true, message: this.getActionMessage(actionCode) };
    }
    try {
      if (actionCode === 'GIAO_VIEC') {
        await this.sqlRepo.removeWorkItemByConditions(
          { documentId: String(taskId) },
          tx,
        );
        const directors = await this.taskUserRepository.find({
          where: { taskId, role: 'director' },
        });
        const supporters = await this.taskUserRepository.find({
          where: { taskId, role: 'supporter' },
        });
        const firstDirectorId = directors?.[0]?.processId;
        const firstSupporterId = supporters?.[0]?.processId;
        const startEvent = Array.from(indexes.nodes.values()).find(
          (n: any) => n.$type === 'bpmn:StartEvent',
        ) as any;
        if (startEvent?.outgoing?.length) {
          const { node: firstNode } = this.bpmnEngine.nextInteractiveFromFlow(
            startEvent.outgoing[0],
            indexes,
          );
          if (firstNode?.outgoing?.length) {
            const { node: directorNode } =
              this.bpmnEngine.nextInteractiveFromFlow(
                firstNode.outgoing[0],
                indexes,
              );
            if (directorNode && firstDirectorId) {
              const role = indexes.laneMap.get(directorNode.id);
              const newWi: WorkItem = {
                id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                nodeId: directorNode.id,
                role: role || '',
                assigneeUserId: firstDirectorId,
                nodeType: directorNode.$type,
              };
              await this.sqlRepo.addWorkItem(
                String(taskId),
                newWi,
                tx,
                undefined,
              );
              await this.sqlRepo.addAudit(
                String(taskId),
                {
                  userId,
                  role: wi.role,
                  actionCode,
                  fromNodeId: wi.nodeId,
                  toNodeId: directorNode.id,
                  action: 'Giao việc',
                  details: { note, files },
                  typeDocument: 'TaskManyUnit',
                  stage_status: 'GIAO_VIEC',
                  created_at: new Date(),
                  updated_at: new Date(),
                  receiver: firstDirectorId,
                },
                tx,
              );
              const props = this.bpmnEngine.getCamundaProperties(directorNode);
              if (props.statusCode) {
                const dbName = this.sqlRepo.getDbName();
                const tableName = this.taskRepository.metadata.tableName;
                await tx
                  .request()
                  .input('taskId', taskId)
                  .input('ps', props.statusCode).query(`
                  UPDATE ${dbName}.dbo.${tableName}
                  SET process_status = @ps
                  WHERE id = @taskId
                `);
              }
            }
            if (firstNode.outgoing.length > 1 && firstSupporterId) {
              const { node: supporterNode } =
                this.bpmnEngine.nextInteractiveFromFlow(
                  firstNode.outgoing[1],
                  indexes,
                );
              if (supporterNode) {
                const role = indexes.laneMap.get(supporterNode.id);
                const newWiSup: WorkItem = {
                  id: `wi_sup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  nodeId: supporterNode.id,
                  role: role || '',
                  assigneeUserId: firstSupporterId,
                  nodeType: supporterNode.$type,
                };
                await this.sqlRepo.addWorkItem(
                  String(taskId),
                  newWiSup,
                  tx,
                  undefined,
                );
                await this.sqlRepo.addAudit(
                  String(taskId),
                  {
                    userId,
                    role: wi.role,
                    actionCode: 'ASSIGN_SUPPORTER',
                    fromNodeId: wi.nodeId,
                    toNodeId: supporterNode.id,
                    action: 'Giao phối hợp',
                    stage_status: 'PHOI_HOP',
                    details: { note, files },
                    typeDocument: 'TaskManyUnit',
                    created_at: new Date(),
                    updated_at: new Date(),
                    receiver: firstSupporterId,
                  },
                  tx,
                );
              }
            }
          }
        }
      } else {
        // 5.1 Remove Old WorkItem
        await this.sqlRepo.removeWorkItem(String(taskId), wi.id, tx);

        // 5.2 Create New WorkItem(s) and Audit(s)
        const assignees = Array.isArray(nextAssigneeId) ? nextAssigneeId : [nextAssigneeId];

        for (const assigneeId of assignees) {
          if (nextNode && nextNode.$type !== 'bpmn:EndEvent') {
            const newWi: WorkItem = {
              id: `wi_${Date.now()}_${assigneeId}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: nextNode.id,
              role: targetRole || '',
              assigneeUserId: assigneeId || null,
              nodeType: nextNode.$type,
            };
            await this.sqlRepo.addWorkItem(String(taskId), newWi, tx, docType);
          }

          // 5.3 Add Audit Log
          await this.sqlRepo.addAudit(
            String(taskId),
            {
              userId,
              role: wi.role,
              actionCode,
              fromNodeId: wi.nodeId,
              toNodeId: nextNode?.id || 'END',
              action: this.getActionLabel(actionCode),
              details: { note, files, nextAssigneeId: assigneeId },
              typeDocument: 'TaskManyUnit',
              stage_status: 'DA_XU_LY',
              created_at: new Date(),
              updated_at: new Date(),
              receiver: assigneeId,
            },
            tx,
          );
        }

        if (processStatus !== undefined) {
          await this.handleProcessStatusUpdate(taskId, processStatus, tx);
        }
      }
      await this.sqlRepo.commit(tx);
      // [Tối ưu] Ghi log không cần await – fire-and-forget, không block response
      this.createLogFromSystem({
        actions: 'POST',
        details: `${this.getActionLabel(actionCode)} công việc`,
        note: dto.note,
        userInfo: userId,
        timestamps: new Date().toISOString(),
        taskId: taskId.toString(),
      }).catch(err => this.logger.error('[sendAdjust] createLogFromSystem error:', err));

      // ===== SYSTEM LOG (GLOBAL) – fire-and-forget =====
      this.SystemLogServiceSql.createLogFromSystem({
        action: 'POST',
        details: `${this.getActionLabel(actionCode)} công việc (ID: ${taskId})`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      }).catch(err => this.logger.error('Lỗi ghi log hệ thống (sendAdjust):', err));

      if (actionCode === 'HOAN_THANH') {
        this.notifyTaskParticipantsOfStatusChange(taskId, '4', userId)
          .catch((err) => this.logger.error('[sendAdjust] notify HOAN_THANH failed:', err));
      }

      // =====================================================
      // XỬ LÝ GỬI THÔNG BÁO VÀ EMAIL CHO 4 TRƯỜNG HỢP
      // =====================================================
      const shouldNotifyApproval = (
        actionCode === stageStatusDoc.DONG_Y_DIEU_CHINH ||
        actionCode === stageStatusDoc.TU_CHOI ||
        actionCode === stageStatusDoc.TU_CHOI_PHE_DUYET ||
        actionCode === 'PHE_DUYET'
      );

      if (shouldNotifyApproval) {
        // [Tối ưu] Lấy senderUser, directors và supporters song song
        const [senderUser, directors, supporters] = await Promise.all([
          this.sqlsvRepo.getUserById(userId),
          this.taskUserRepository.find({ where: { taskId, role: 'director' } }),
          this.taskUserRepository.find({ where: { taskId, role: 'supporter' } }),
        ]);
        const senderName = (senderUser as any)?.name || (senderUser as any)?.username || 'Người phê duyệt';

        // Gửi thông báo và email song song cho tất cả người chủ trì + phối hợp (không block API)
        const allRecipients = [...directors, ...supporters].filter(u => u.processId);
        Promise.all(
          allRecipients.map(recipient =>
            this.handleApprovalResponseNotificationAndEmail({
              taskId,
              taskName: task.name,
              senderId: userId,
              senderName,
              recipientId: recipient.processId,
              actionCode,
              note: dto.note,
              typeTask: task.typeTask,
            }).catch(err => this.logger.error(`[NotifyResponse] Error for ${recipient.processId}: ${err.message}`))
          )
        ).catch(err => this.logger.error(`[NotifyResponse] Promise.all error: ${err.message}`));
      }

      return { success: true, message: this.getActionMessage(actionCode) };
    } catch (err) {
      await this.sqlRepo.rollback(tx);
      throw err;
    }
  }

  async sendApproval(userId: string, dto: SendApprovalDto) {
    const { taskId, actionCode, note, files, assigneeUserId } = dto;
    // 1. Validate Task + 3. Get Current WorkItem (song song)
    const [task, workItems] = await Promise.all([
      this.taskRepository.findOne({ where: { id: taskId, status: 1 } }),
      this.dataSource.query(
        `SELECT TOP 1 * FROM work_items WHERE document_id = @0 AND assignee_user_id = @1`,
        [String(taskId), userId],
      ),
    ]);

    if (!task) throw new NotFoundException('Công việc không tồn tại');

    if (!workItems || workItems.length === 0) {
      throw new BadRequestException(
        'Bạn không có quyền thực hiện hành động này hoặc công việc đã được xử lý',
      );
    }
    const docType = workItems[0].bpmn_version;
    const { bpmnXML } = await this.validateBpmnAndPermissionApprove(userId, docType);
    const { indexes } = await this.getModelFromXml(bpmnXML);

    const wi = workItems[0];

    // 4. Determine Next Node
    const node = indexes.nodes.get(wi.node_id);
    if (!node)
      throw new BadRequestException(
        'Node hiện tại không hợp lệ trong quy trình',
      );

    const outs = indexes.outgoingBySource.get(node.id) || [];
    const flow = outs.find(
      (f) =>
        f.name?.toUpperCase() === actionCode?.toUpperCase() ||
        f.id === actionCode,
    );
    if (!flow) {
      throw new BadRequestException(
        `Không tìm thấy luồng đi cho hành động: ${actionCode}`,
      );
    }
    const nodeExtCode = flow.targetRef
      ? this.bpmnEngine.getFlowExtensionProperties(flow)
      : undefined;
    const nodeExt = flow.targetRef
      ? getAllNodeExtensionProperties(flow.targetRef)
      : undefined;

    let nextNode;
    if (nodeExtCode?.flagNotNextNode === 'true') {
      ({ node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
        flow,
        indexes,
      ));
    } else {

      ({ node: nextNode } = this.bpmnEngine.findNextGatewayFromFlow(
        flow,
        indexes,
      ));
    }

    const targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;
    // 5. Transaction Execution
    const tx = await this.sqlRepo.begin();
    const processStatus = nodeExt?.statusCode ? nodeExt.statusCode : undefined;
    // [Tối ưu] Lấy originalAssigner và originalDirectors song song
    const [originalAssigner, originalDirectors] = await Promise.all([
      this.taskUserRepository.findOne({ where: { taskId: taskId, role: 'assigner' } }),
      this.taskUserRepository.findOne({ where: { taskId: taskId, role: 'director' } }),
    ]);
    if (!originalAssigner) {
      throw new NotFoundException(
        'Không tìm thấy người giao việc gốc của công việc này.',
      );
    }
    let nextAssigneeId;

    if (nodeExtCode?.flagNotNextNode === 'true') {
      // Nếu là phòng ban (type = 2) thì lấy tài khoản Văn thư
      if (originalDirectors?.type === 2) {
        nextAssigneeId = await this.getDepartmentAssignee(originalDirectors.processId);
      } else {
        nextAssigneeId = originalDirectors?.processId || null;
      }
    } else {
      nextAssigneeId = originalAssigner.processId;
    }
    if (docType === DOCTYPE.TaskManyLevelUnit && nodeExtCode?.flagGctGph === 'true') {
      const { directorTargetNode, supporterTargetNode } = this.findGctGphNodes(nextNode, indexes);

      // 5.1 Remove Old WorkItem
      await this.sqlRepo.removeWorkItem(String(taskId), wi.id, tx);

      // 5.2 Create WorkItem for Director
      if (directorTargetNode) {
        const directors = await this.taskUserRepository.find({
          where: { taskId, role: 'director' },
        });
        const firstDirectorId = directors?.[0]?.processId;
        if (firstDirectorId) {
          const role = indexes.laneMap.get(directorTargetNode.id);
          const newWi: WorkItem = {
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: directorTargetNode.id,
            role: role || '',
            assigneeUserId: firstDirectorId,
            nodeType: directorTargetNode.$type,
          };
          await this.sqlRepo.addWorkItem(String(taskId), newWi, tx, docType);

          await this.sqlRepo.addAudit(
            String(taskId),
            {
              userId,
              role: wi.role,
              actionCode,
              fromNodeId: wi.nodeId,
              toNodeId: directorTargetNode.id,
              action: this.getActionLabel(actionCode),
              details: { note, files, nextAssigneeId: firstDirectorId },
              typeDocument: 'TaskManyUnit',
              stage_status: 'DA_XU_LY',
              created_at: new Date(),
              updated_at: new Date(),
              receiver: firstDirectorId,
            },
            tx,
          );
        }
      }

      // 5.3 Create WorkItem for Supporter
      if (supporterTargetNode) {
        const supporters = await this.taskUserRepository.find({
          where: { taskId, role: 'supporter' },
        });
        const firstSupporterId = supporters?.[0]?.processId;
        if (firstSupporterId) {
          const role = indexes.laneMap.get(supporterTargetNode.id);
          const newWiSup: WorkItem = {
            id: `wi_sup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: supporterTargetNode.id,
            role: role || '',
            assigneeUserId: firstSupporterId,
            nodeType: supporterTargetNode.$type,
          };
          await this.sqlRepo.addWorkItem(String(taskId), newWiSup, tx, docType);
        }
      }

      if (processStatus !== undefined) {
        await this.handleProcessStatusUpdate(taskId, processStatus, tx);
      }

      await this.sqlRepo.commit(tx);

      // Ghi log nghiệp vụ để API all-log-task đọc được
      this.createLogFromSystem({
        actions: 'POST',
        details: `${this.getActionLabel(actionCode)} công việc`,
        note: dto.note,
        userInfo: userId,
        timestamps: new Date().toISOString(),
        taskId: taskId.toString(),
      }).catch(err => this.logger.error('[sendApproval] createLogFromSystem error in special case:', err));

      return { success: true, message: this.getActionMessage(actionCode) };
    }
    try {
      if (actionCode === 'GIAO_VIEC') {
        await this.sqlRepo.removeWorkItemByConditions(
          { documentId: String(taskId) },
          tx,
        );
        const directors = await this.taskUserRepository.find({
          where: { taskId, role: 'director' },
        });
        const supporters = await this.taskUserRepository.find({
          where: { taskId, role: 'supporter' },
        });
        const firstDirectorId = directors?.[0]?.processId;
        const firstSupporterId = supporters?.[0]?.processId;
        const startEvent = Array.from(indexes.nodes.values()).find(
          (n: any) => n.$type === 'bpmn:StartEvent',
        ) as any;
        if (startEvent?.outgoing?.length) {
          const { node: firstNode } = this.bpmnEngine.nextInteractiveFromFlow(
            startEvent.outgoing[0],
            indexes,
          );
          if (firstNode?.outgoing?.length) {
            const { node: directorNode } =
              this.bpmnEngine.nextInteractiveFromFlow(
                firstNode.outgoing[0],
                indexes,
              );
            if (directorNode && firstDirectorId) {
              const role = indexes.laneMap.get(directorNode.id);
              const newWi: WorkItem = {
                id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                nodeId: directorNode.id,
                role: role || '',
                assigneeUserId: firstDirectorId,
                nodeType: directorNode.$type,
              };
              await this.sqlRepo.addWorkItem(
                String(taskId),
                newWi,
                tx,
                docType,
              );
              await this.sqlRepo.addAudit(
                String(taskId),
                {
                  userId,
                  role: wi.role,
                  actionCode,
                  fromNodeId: wi.nodeId,
                  toNodeId: directorNode.id,
                  action: 'Giao việc',
                  details: { note, files },
                  typeDocument: 'TaskManyUnit',
                  stage_status: 'GIAO_VIEC',
                  created_at: new Date(),
                  updated_at: new Date(),
                  receiver: firstDirectorId,
                },
                tx,
              );
              const props = this.bpmnEngine.getCamundaProperties(directorNode);
              if (props.statusCode) {
                const dbName = this.sqlRepo.getDbName();
                const tableName = this.taskRepository.metadata.tableName;
                await tx
                  .request()
                  .input('taskId', taskId)
                  .input('ps', props.statusCode).query(`
                  UPDATE ${dbName}.dbo.${tableName}
                  SET process_status = @ps
                  WHERE id = @taskId
                `);
              }
            }
            if (firstNode.outgoing.length > 1 && firstSupporterId) {
              const { node: supporterNode } =
                this.bpmnEngine.nextInteractiveFromFlow(
                  firstNode.outgoing[1],
                  indexes,
                );
              if (supporterNode) {
                const role = indexes.laneMap.get(supporterNode.id);
                const newWiSup: WorkItem = {
                  id: `wi_sup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  nodeId: supporterNode.id,
                  role: role || '',
                  assigneeUserId: firstSupporterId,
                  nodeType: supporterNode.$type,
                };
                await this.sqlRepo.addWorkItem(
                  String(taskId),
                  newWiSup,
                  tx,
                  docType,
                );
                await this.sqlRepo.addAudit(
                  String(taskId),
                  {
                    userId,
                    role: wi.role,
                    actionCode: 'ASSIGN_SUPPORTER',
                    fromNodeId: wi.nodeId,
                    toNodeId: supporterNode.id,
                    action: 'Giao phối hợp',
                    stage_status: 'PHOI_HOP',
                    details: { note, files },
                    typeDocument: 'TaskManyUnit',
                    created_at: new Date(),
                    updated_at: new Date(),
                    receiver: firstSupporterId,
                  },
                  tx,
                );
              }
            }
          }
        }
      } else {
        // 5.1 Remove Old WorkItem
        await this.sqlRepo.removeWorkItem(String(taskId), wi.id, tx);

        // 5.2 Create New WorkItem
        if (nextNode && nextNode.$type !== 'bpmn:EndEvent') {
          const newWi: WorkItem = {
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: nextNode.id,
            role: targetRole || '',
            assigneeUserId: nextAssigneeId || null,
            nodeType: nextNode.$type,
          };
          await this.sqlRepo.addWorkItem(String(taskId), newWi, tx, docType);
        }

        // 5.3 Add Audit Log
        const auditDetails: any = { note, files, nextAssigneeId };
        if (actionCode === 'GUI_PHE_DUYET' || actionCode === 'GUI_DIEU_CHINH' || actionCode === 'DIEU_CHINH') {
          const filesDB = await this.filesRepository.getFilesByObjectAndStatus(
            'finaldocuments',
            String(taskId),
          );
          if (filesDB && filesDB.length > 0) {
            auditDetails.currentFileIds = filesDB.map((f) => f.id);
          }
        }

        await this.sqlRepo.addAudit(
          String(taskId),
          {
            userId,
            role: wi.role,
            actionCode,
            fromNodeId: wi.nodeId,
            toNodeId: nextNode?.id || 'END',
            action: this.getActionLabel(actionCode),
            details: auditDetails,
            typeDocument: 'TaskManyUnit',
            stage_status: 'DA_XU_LY',
            created_at: new Date(),
            updated_at: new Date(),
            receiver: nextAssigneeId,
          },
          tx,
        );

        if (processStatus !== undefined) {
          await this.handleProcessStatusUpdate(taskId, processStatus, tx);
        }
      }
      await this.sqlRepo.commit(tx);
      // [Tối ưu] Ghi log không cần await – fire-and-forget
      this.createLogFromSystem({
        actions: 'POST',
        details: `${this.getActionLabel(actionCode)} công việc`,
        note: dto.note,
        userInfo: userId,
        timestamps: new Date().toISOString(),
        taskId: taskId.toString(),
      }).catch(err => this.logger.error('[sendApproval] createLogFromSystem error:', err));

      // =====================================================
      // XỬ LÝ GUI_PHE_DUYET / GUI_DIEU_CHINH: Tạo notification và gửi email
      // =====================================================
      const shouldNotify = (
        actionCode === stageStatusDoc.GUI_PHE_DUYET ||
        actionCode === stageStatusDoc.GUI_DIEU_CHINH ||
        actionCode === stageStatusDoc.DIEU_CHINH
      ) && nextAssigneeId;
      if (shouldNotify) {
        // Lấy thông tin người gửi
        const senderUser = await this.sqlsvRepo.getUserById(userId);
        const senderName = senderUser?.name || senderUser?.username || 'Người giao việc';
        const taskDeadline = task.endDate ? moment(task.endDate).format('HH:mm - DD/MM/YYYY') : '';
        // Gửi thông báo và email - chạy ngầm không block API
        this.handleApprovalNotificationAndEmail({
          taskId,
          taskName: task.name,
          senderId: userId,
          senderName,
          recipientId: nextAssigneeId,
          actionCode,
          note: dto.note,
          taskDeadline,
        }).catch(err => this.logger.error(`[NotifySend] Error: ${err.message}`));
      }

      return { success: true, message: this.getActionMessage(actionCode) };
    } catch (err) {
      await this.sqlRepo.rollback(tx);
      throw err;
    }
  }

  /**
   * Handle process status update with automatic progress calculation
   * When processStatus is '4', set child progress to 100% and update parent progress
   */
  private async handleProcessStatusUpdate(
    taskId: number,
    processStatus: string,
    tx: any,
  ): Promise<void> {
    // If processStatus is '4', set progress to '100' and update parent
    if (processStatus === '4') {
      // Update task with progress = 100
      await this.taskRepo.updateTaskProcessStatus(
        taskId,
        processStatus,
        '100',
        tx,
      );

      // Check if task is root (parent is null)
      // const directParentId = await this.taskRepo.getParentTaskId(taskId, tx);

      // if (!directParentId) {
      // Recursive update: update all descendants (children, grandchildren, etc.)
      await this.completeAllDescendants(taskId, tx);
      // }

      // Recursive update: climb up the hierarchy until parent is null (update parent progress)
      let currentChildId = taskId;

      while (true) {
        // Get parent task ID
        const parentId = await this.taskRepo.getParentTaskId(currentChildId, tx);

        // Stop if no parent exists (root task reached)
        if (!parentId) {
          break;
        }

        // Update this parent's progress based on its children
        await this.taskRepo.updateParentProgress(parentId, tx);

        // Move up: this parent becomes the child for the next iteration
        currentChildId = parentId;
      }
    } else {
      // For other processStatus values, just update processStatus
      await this.taskRepo.updateTaskProcessStatus(
        taskId,
        processStatus,
        undefined,
        tx,
      );
    }
  }

  // Helper to recursively complete all descendants
  private async completeAllDescendants(taskId: number, tx: any): Promise<void> {
    const tableName = this.taskRepository.metadata.tableName;
    const request = tx.request();

    // Find all active children
    const childRes = await request
      .input('pId', taskId)
      .query(`SELECT id FROM ${tableName} WHERE parent = @pId AND status = 1`);

    if (childRes.recordset && childRes.recordset.length > 0) {
      for (const row of childRes.recordset) {
        const childId = row.id;
        // Update child: processStatus = '4', progress = '100'
        await this.taskRepo.updateTaskProcessStatus(childId, '4', '100', tx);

        // Recurse
        await this.completeAllDescendants(childId, tx);
      }
    }
  }

  /**
   * Phiên bản sử dụng EntityManager cho update/updateFormDoc
   * Khi processStatus = '4':
   * 1. Cập nhật task hiện tại thành hoàn thành (progress = 100)
   * 2. Cập nhật TẤT CẢ task con/cháu thành hoàn thành
   * 3. Cập nhật progress của các task cha
   */
  private async handleProcessStatusUpdateWithManager(
    taskId: number,
    processStatus: string,
    manager: any,
    isApprovalRequired = false,
  ): Promise<void> {
    if (processStatus === '4') {
      // if (isApprovalRequired) {
      //   // Redirrect to approval flow instead of completing
      //   await this.triggerApprovalFlowWithManager(taskId, manager);
      //   return;
      // }
      // 1. Cập nhật task hiện tại
      await manager.update(TaskEntity, { id: taskId }, { processStatus, progress: '100' });

      // 2. Cập nhật tất cả task con/cháu thành hoàn thành
      await this.completeAllDescendantsWithManager(taskId, manager);

      // 3. Cập nhật progress của các task cha (đi lên trên)
      let currentChildId = taskId;
      while (true) {
        const currentTask = await manager.findOne(TaskEntity, {
          where: { id: currentChildId },
          select: ['parent'],
        });
        const parentId = currentTask?.parent;
        if (!parentId) break;

        const children = await manager.find(TaskEntity, {
          where: { parent: parentId, status: 1 },
          select: ['progress'],
        });

        if (children.length > 0) {
          let totalProgress = 0;
          let validCount = 0;
          for (const child of children) {
            const pv = parseFloat(child.progress || '0');
            if (!isNaN(pv)) { totalProgress += pv; validCount++; }
          }
          const avg = validCount > 0 ? Math.round(totalProgress / validCount) : 0;
          await manager.update(TaskEntity, { id: parentId }, { progress: avg.toString() });
        }
        currentChildId = parentId;
      }
    } else if (processStatus === '8') {
      // 1. Cập nhật task hiện tại
      await manager.update(TaskEntity, { id: taskId }, { processStatus });

      // 2. Cập nhật tất cả task con/cháu thành dừng (status 8)
      await this.updateAllDescendantsStatusWithManager(taskId, processStatus, manager);
    } else {
      await manager.update(TaskEntity, { id: taskId }, { processStatus });
    }
  }

  private async notifyTaskParticipantsOfStatusChange(
    taskId: number,
    processStatus: string,
    senderId: string,
  ): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      select: ['name'],
    });
    if (!task) {
      return;
    }

    const taskUsers = await this.taskUserRepository.find({
      where: {
        taskId,
      },
    });

    const recipientIds = [...new Set(
      taskUsers
        .map((tu) => String(tu.processId).trim())
        .filter((id) => id && id !== senderId),
    )];

    if (recipientIds.length === 0) {
      return;
    }

    const statusLabel =
      processStatus === '4'
        ? 'Hoàn thành'
        : processStatus === '8'
          ? 'Hủy'
          : processStatus;

    await this.notificationService.createForRecipients({
      recipientIds,
      senderId: senderId || '',
      key: 'VIEW_TASK',
      type: NotificationType.TASK_STATUS_CHANGED.value,
      content: `Công việc ${task.name} được cập nhật trạng thái sang ${statusLabel}`,
      recordId: String(taskId),
      link: `/task/detail/${taskId}`,
    });
  }

  private resolveNotificationKeyForTask(task: {
    typeTask?: string | null;
    docId?: string | null;
    meetingId?: string | null;
    meetingConclusionId?: string | null;
    projectId?: number | null;
  }): string {
    if (task.docId || task.typeTask === TASK_TYPE.FORM_DOC) {
      return 'VIEW_JOB_TO_DOCUMENT';
    }

    if (
      task.meetingId ||
      task.meetingConclusionId ||
      task.typeTask === TASK_TYPE.FORM_MEETING
    ) {
      return 'VIEW_JOB_TO_MEETING';
    }

    if (
      task.projectId ||
      task.typeTask === TASK_TYPE.PROJECT ||
      task.typeTask === TASK_TYPE.FORM_PROJECT
    ) {
      return 'VIEW_PROJECT';
    }

    return 'VIEW_TASK';
  }

  async sendStartDateTaskNotifications(): Promise<void> {
    const now = dayjs();
    const startOfToday = now.startOf('day');
    const startOfTomorrow = startOfToday.add(1, 'day');
    const notificationTime = startOfToday.add(7, 'hour').toDate();

    const tasks = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.taskUsers', 'taskUsers')
      .select([
        'task.id',
        'task.name',
        'task.startDate',
        'task.typeTask',
        'task.docId',
        'task.meetingId',
        'task.meetingConclusionId',
        'task.projectId',
        'task.status',
        'task.processStatus',
        'taskUsers.id',
        'taskUsers.taskId',
        'taskUsers.processId',
        'taskUsers.role',
        'taskUsers.type',
      ])
      .where('task.status = :status', { status: 1 })
      .andWhere('task.startDate IS NOT NULL')
      .andWhere('task.startDate >= :startOfToday', { startOfToday: startOfToday.toDate() })
      .andWhere('task.startDate < :startOfTomorrow', { startOfTomorrow: startOfTomorrow.toDate() })
      .andWhere('(task.processStatus IS NULL OR task.processStatus NOT IN (:...closedStatuses))', {
        closedStatuses: ['4', '8'],
      })
      .andWhere(`
        EXISTS (
          SELECT 1
          FROM task_users tu_director
          WHERE tu_director.task_id = task.id
            AND tu_director.role = :directorRole
            AND tu_director.type = :individualType
            AND tu_director.process_id IS NOT NULL
        )
      `, {
        directorRole: TaskUserRole.DIRECTOR,
        individualType: TaskUserType.INDIVIDUAL,
      })
      .getMany();

    if (!tasks.length) {
      this.logger.log('[start-date-notify] No task starts today');
      return;
    }

    let sentCount = 0;

    for (const task of tasks) {
      const recipientIds = [
        ...new Set(
          (task.taskUsers || [])
            .filter((taskUser) =>
              taskUser.type === TaskUserType.INDIVIDUAL &&
              [TaskUserRole.DIRECTOR, TaskUserRole.SUPPORTER].includes(taskUser.role as TaskUserRole) &&
              taskUser.processId,
            )
            .map((taskUser) => String(taskUser.processId).trim())
            .filter(Boolean),
        ),
      ];

      if (!recipientIds.length) {
        continue;
      }

      const content = `Bạn cần thực hiện công việc ${task.name ?? ''}`.trim();
      // Tạm thời bỏ check trùng để test cron tạo notification.
      const notificationKey = this.resolveNotificationKeyForTask(task);
      const dedupedRecipientIds: string[] = [];

      for (const recipientId of recipientIds) {
        const existed = await this.dataSource
          .createQueryBuilder()
          .select('1')
          .from('notifications', 'n')
          .where('n.recipientId = :recipientId', { recipientId })
          .andWhere('n.recordId = :recordId', { recordId: String(task.id) })
          .andWhere('n.key = :key', { key: notificationKey })
          .andWhere('n.type = :type', { type: NotificationType.ADDED_TO_NEW_TASK_MEMBER.value })
          .andWhere('n.content = :content', { content })
          .andWhere('n.createdAt >= :fromDate', { fromDate: startOfToday.toDate() })
          .andWhere('n.createdAt < :toDate', { toDate: startOfTomorrow.toDate() })
          .getRawOne();

        if (!existed) {
          dedupedRecipientIds.push(recipientId);
        }
      }

      if (!dedupedRecipientIds.length) {
        continue;
      }

      await this.notificationService.createInAppOnlyForRecipients({
        recipientIds: dedupedRecipientIds,
        senderId: 'system',
        key: notificationKey,
        type: NotificationType.ADDED_TO_NEW_TASK_MEMBER.value,
        content,
        recordId: String(task.id),
        link: `/task/detail/${task.id}`,
        time: notificationTime,
        status: 1,
      });

      sentCount += dedupedRecipientIds.length;
    }

    this.logger.log(`[start-date-notify] Sent ${sentCount} notifications for ${tasks.length} tasks`);
  }

  async sendOverdueTaskNotifications(testMode = false): Promise<void> {
    const now = dayjs();
    const cycleKey = `OVERDUE_REASON:${now.format('YYYY-MM')}`;
    const rows: { taskId: number; directorProcessId: string }[] = await this.dataSource.query(
      `SELECT DISTINCT t.id AS taskId, LTRIM(RTRIM(tu.process_id)) AS directorProcessId
       FROM task t
       INNER JOIN task_users tu ON tu.task_id = t.id
       WHERE t.status = 1
         AND t.end_date IS NOT NULL
         AND t.end_date < GETDATE()
         AND (t.process_status IS NULL OR t.process_status NOT IN ('4', '8'))
         AND tu.role = @0 AND tu.type = @1
         AND NULLIF(LTRIM(RTRIM(tu.process_id)), '') IS NOT NULL`,
      [TaskUserRole.DIRECTOR, TaskUserType.INDIVIDUAL],
    );

    const tasksByUser = new Map<string, Set<number>>();
    for (const row of rows) {
      const userId = String(row.directorProcessId);
      if (!tasksByUser.has(userId)) tasksByUser.set(userId, new Set());
      tasksByUser.get(userId)!.add(Number(row.taskId));
    }

    const usersToProcess = testMode
      ? Array.from(tasksByUser.entries()).slice(0, 1)
      : Array.from(tasksByUser.entries());

    let notificationCount = 0;
    for (const [userId, taskIds] of usersToProcess) {
      const remaining = taskIds.size;
      if (!remaining) continue;

      const existing = await this.dataSource.query(
        `SELECT TOP 1 id, [key] FROM notifications
         WHERE recipientId = @0 AND recordId = @1 AND type = 'TASK_OVERDUE_REASON_REQUIRED'
         ORDER BY id DESC`,
        [userId, cycleKey],
      );

      let notificationId = Number(existing[0]?.id || 0);
      const content = `Bạn đang có ${remaining} công việc trễ hạn cần cập nhật lý do. Vui lòng kiểm tra và xử lý.`;
      if (notificationId && existing[0]?.key !== NotificationKey.STAT_CARD_DETAIL_DIALOG) {
        await this.dataSource.query(
          `UPDATE notifications SET [key] = @0 WHERE id = @1`,
          [NotificationKey.STAT_CARD_DETAIL_DIALOG, notificationId],
        );
      }
      if (!notificationId) {
        const ids = await this.notificationService.createInAppOnlyForRecipients({
          recipientIds: [userId], senderId: 'system', key: NotificationKey.STAT_CARD_DETAIL_DIALOG,
          type: NotificationType.TASK_OVERDUE_REASON_REQUIRED.value, content, recordId: cycleKey,
          link: '/tasks/overdue-reason-requests', time: now.toDate(), status: 1,
        });
        notificationId = ids[0];
        notificationCount++;
      }
    }

    this.logger.log(
      `[overdue-task-notify] ${rows.length} overdue tasks for ${tasksByUser.size} users, ${notificationCount} new grouped notifications`,
    );
  }

  async getMyOverdueReasonRequests(userId: string, page: string | number = 1, limit: string | number = 25) {
    if (!userId) throw new BadRequestException('Không xác định được người dùng');
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const offset = (pageNum - 1) * limitNum;
    const notifications = await this.dataSource.query(
      `SELECT TOP 1 id, createdAt
       FROM notifications
       WHERE recipientId = @0 AND type = 'TASK_OVERDUE_REASON_REQUIRED'
       ORDER BY id DESC`,
      [userId],
    );
    const notification = notifications[0];
    if (!notification) {
      return {
        cycleDate: null,
        total: 0,
        remaining: 0,
        items: [],
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      };
    }

    const stats = await this.dataSource.query(
      `SELECT SUM(CASE WHEN completed.id IS NULL THEN 1 ELSE 0 END) AS remaining
       FROM task t
       INNER JOIN task_users tu ON tu.task_id = t.id
       OUTER APPLY (
         SELECT TOP 1 c.id
         FROM document_comments c
         WHERE c.document_id = CONVERT(NVARCHAR(50), t.id)
           AND c.user_id = @0 AND c.type = 'slowReason'
           AND c.created_at >= @1
         ORDER BY c.created_at DESC
       ) completed
       WHERE t.status = 1 AND t.end_date IS NOT NULL AND t.end_date < @1
         AND (t.process_status IS NULL OR t.process_status NOT IN ('4', '8'))
         AND tu.role = 'director' AND tu.type = 1
         AND LTRIM(RTRIM(tu.process_id)) = @0`,
      [userId, notification.createdAt],
    );
    const remaining = Number(stats[0]?.remaining || 0);

    const items = await this.dataSource.query(
      `SELECT NULL AS requestId, t.id AS taskId, t.name, t.code,
              t.end_date AS endDate, t.process_status AS processStatus,
              completed.created_at AS completedAt, completed.id AS reasonCommentId,
              assigner.processId AS assignerId,
              assigner.processName AS assignerName,
              t.type_task AS typeTask,
              CASE t.type_task
                WHEN 'general' THEN N'Công việc chung'
                WHEN 'TaskGeneral' THEN N'Công việc chung'
                WHEN 'form_doc' THEN N'Công việc từ văn bản'
                WHEN 'TaskFormDoc' THEN N'Công việc từ văn bản'
                WHEN 'form_meeting' THEN N'Công việc từ cuộc họp'
                WHEN 'TaskFormMeeting' THEN N'Công việc từ cuộc họp'
                WHEN 'project' THEN N'Công việc từ dự án'
                ELSE t.type_task
              END AS sourceName
       FROM task t
       INNER JOIN task_users tu ON tu.task_id = t.id
       OUTER APPLY (
         SELECT TOP 1 atu.process_id AS processId,
                COALESCE(NULLIF(LTRIM(RTRIM(atu.process_name)), ''), u.name, u.username) AS processName
         FROM task_users atu
         LEFT JOIN users u ON u.id = atu.process_id
         WHERE atu.task_id = t.id AND atu.role = 'assigner'
         ORDER BY atu.id ASC
       ) assigner
       OUTER APPLY (
         SELECT TOP 1 c.id, c.created_at
         FROM document_comments c
         WHERE c.document_id = CONVERT(NVARCHAR(50), t.id)
           AND c.user_id = @0 AND c.type = 'slowReason'
           AND c.created_at >= @1
         ORDER BY c.created_at DESC
       ) completed
       WHERE t.status = 1 AND t.end_date IS NOT NULL AND t.end_date < @1
         AND (t.process_status IS NULL OR t.process_status NOT IN ('4', '8'))
         AND tu.role = 'director' AND tu.type = 1
         AND LTRIM(RTRIM(tu.process_id)) = @0
       ORDER BY CASE WHEN completed.id IS NULL THEN 0 ELSE 1 END, t.end_date ASC, t.id ASC
       OFFSET @2 ROWS FETCH NEXT @3 ROWS ONLY`,
      [userId, notification.createdAt, offset, limitNum],
    );
    const mappedItems = items.map((item: any) => {
      const sourceView = buildTypeTaskView(item.typeTask);
      return {
        ...item,
        sourceName: sourceView.text || item.sourceName,
        sourceHtml: sourceView.html,
      };
    });
    return {
      cycleDate: notification.createdAt,
      total: remaining,
      remaining,
      items: mappedItems,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(remaining / limitNum),
    };
  }

  /**
   * 🚀 Tự động kích hoạt quy trình phê duyệt khi công việc "Hoàn thành" nhưng cài đặt "Cần phê duyệt"
   */
  private async triggerApprovalFlowWithManager(taskId: number, manager: any): Promise<void> {
    const task = await manager.findOne(TaskEntity, { where: { id: taskId } });
    if (!task) return;

    // 1. Tìm người giao việc gốc (Assigner)
    const assigner = await manager.findOne(TaskUserEntity, {
      where: { taskId, role: 'assigner' },
    });

    if (!assigner) {
      this.logger.warn(`Không tìm thấy người giao việc cho task ${taskId} để gửi phê duyệt.`);
      // Fallback: Nếu không có người giao việc, cứ cho hoàn thành luôn
      await manager.update(TaskEntity, { id: taskId }, { processStatus: '4', progress: '100' });
      return;
    }

    // 2. Cập nhật trạng thái task thành "Chờ phê duyệt"
    await manager.update(TaskEntity, { id: taskId }, {
      processStatus: stageStatusDoc.GUI_PHE_DUYET,
      progress: '100'
    });

    // 3. Tạo BPMN WorkItem cho người giao việc
    // Lấy BPMN XML và flowId thông qua User đơn vị (để xác định node PHE_DUYET)
    // Tạm thời lấy flow từ flowId của task nếu có, nếu không lấy từ đơn vị
    let bpmnXML = '';
    const flowId = task.flowId;
    if (flowId) {
      bpmnXML = await this.sqlRepo.getBpmnFile(flowId);
    }

    let nodeId = 'PHE_DUYET'; // Default node id cho phê duyệt
    let role = 'assigner';

    if (bpmnXML) {
      const { indexes } = await this.getModelFromXml(bpmnXML);
      const nextNode = Array.from(indexes.nodes.values()).find((n: any) => n.id === 'PHE_DUYET' || n.name === 'Phê duyệt') as any;
      if (nextNode) {
        nodeId = nextNode.id;
        role = indexes.laneMap.get(nodeId) || role;
      }
    }

    const newWi: any = {
      id: `wi_auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      nodeId: nodeId,
      role: role,
      assigneeUserId: assigner.processId,
      nodeType: 'bpmn:UserTask',
    };

    // Chuyển transaction sang manager.queryRunner if possible, hoặc dùng repository call
    // Vì addWorkItem nhận QueryRunner làm tham số tx
    const tx = manager.queryRunner;

    await this.sqlRepo.addWorkItem(String(taskId), newWi, tx, task.docType);

    // 4. Ghi Audit log
    await this.sqlRepo.addAudit(
      String(taskId),
      {
        userId: task.updatedById || assigner.processId, // Thường là director đang update
        role: 'director',
        actionCode: stageStatusDoc.GUI_PHE_DUYET,
        fromNodeId: 'THUC_HIEN',
        toNodeId: nodeId,
        action: 'Tự động gửi phê duyệt',
        details: { note: 'Hệ thống tự động gửi phê duyệt khi hoàn thành công việc' },
        typeDocument: task.docType || 'TaskManyUnit',
        stage_status: 'CHO_PHE_DUYET',
        created_at: new Date(),
        updated_at: new Date(),
        receiver: assigner.processId,
      },
      tx,
    );

    // 5. Gửi thông báo
    try {
      const senderUser = await this.sqlsvRepo.getUserById(task.updatedById || '');
      const senderName = senderUser?.name || 'Người thực hiện';
      const taskDeadline = task.endDate ? moment(task.endDate).format('HH:mm - DD/MM/YYYY') : '';

      this.handleApprovalNotificationAndEmail({
        taskId,
        taskName: task.name,
        senderId: task.updatedById || '',
        senderName,
        recipientId: assigner.processId,
        actionCode: stageStatusDoc.GUI_PHE_DUYET,
        note: 'Tự động gửi phê duyệt',
        taskDeadline,
      }).catch(err => this.logger.error(`[AutoNotifySend] Error: ${err.message}`));
    } catch (e) {
      this.logger.error(`[AutoNotifyError] Error: ${e.message}`);
    }
  }

  /**
   * Helper: Đệ quy cập nhật tất cả task con/cháu thành một trạng thái cụ thể
   */
  private async updateAllDescendantsStatusWithManager(
    taskId: number,
    processStatus: string,
    manager: any,
  ): Promise<void> {
    const children = await manager.find(TaskEntity, {
      where: { parent: taskId, status: 1 },
      select: ['id'],
    });

    if (children && children.length > 0) {
      for (const child of children) {
        await manager.update(TaskEntity, { id: child.id }, { processStatus });
        await this.updateAllDescendantsStatusWithManager(child.id, processStatus, manager);
      }
    }
  }

  /**
   * Helper: Đệ quy cập nhật tất cả task con/cháu thành hoàn thành
   * Sử dụng EntityManager
   */
  private async completeAllDescendantsWithManager(
    taskId: number,
    manager: any,
  ): Promise<void> {
    // Tìm tất cả task con đang active
    const children = await manager.find(TaskEntity, {
      where: { parent: taskId, status: 1 },
      select: ['id'],
    });

    if (children && children.length > 0) {
      for (const child of children) {
        // Cập nhật task con: processStatus = '4', progress = '100'
        await manager.update(
          TaskEntity,
          { id: child.id },
          { processStatus: '4', progress: '100' }
        );

        // Đệ quy cho các task cháu
        await this.completeAllDescendantsWithManager(child.id, manager);
      }
    }
  }



  private async updateProgressRecursive(
    startTaskId: number,
    manager: any,
  ): Promise<void> {
    let currentChildId = startTaskId;
    while (true) {
      const currentTask = await manager.findOne(TaskEntity, {
        where: { id: currentChildId },
        select: ['parent'],
      });
      const parentId = currentTask?.parent;
      if (!parentId) break;

      const children = await manager.find(TaskEntity, {
        where: { parent: parentId, status: 1 },
        select: ['progress'],
      });

      if (children.length > 0) {
        let totalProgress = 0;
        let validCount = 0;
        for (const child of children) {
          const pv = parseFloat(child.progress || '0');
          if (!isNaN(pv)) {
            totalProgress += pv;
            validCount++;
          }
        }
        const avg = validCount > 0 ? Math.round(totalProgress / validCount) : 0;
        await manager.update(TaskEntity, { id: parentId }, { progress: avg.toString() });
      }
      currentChildId = parentId;
    }
  }

  private getActionLabel(actionCode: string): string {
    const map: Record<string, string> = {
      GIAO_VIEC: 'Giao việc',
      GUI_DIEU_CHINH: 'Gửi điều chỉnh',
      PHE_DUYET_DIEU_CHINH: 'Phê duyệt điều chỉnh',
      TU_CHOI: 'Từ chối điều chỉnh',
      PHE_DUYET: 'Phê duyệt công việc',
      TU_CHOI_PHE_DUYET: 'Từ chối phê duyệt',
      DONG_Y_DIEU_CHINH: 'Đồng ý điều chỉnh',
      HOAN_THANH: 'Hoàn thành công việc',
    };

    return map[actionCode] || 'Gửi phê duyệt';
  }

  private getActionMessage(actionCode: string): string {
    const map: Record<string, string> = {
      GIAO_VIEC: 'Giao việc thành công',

      PHE_DUYET_DIEU_CHINH: 'Phê duyệt điều chỉnh thành công',
      TU_CHOI: 'Từ chối thành công',
      PHE_DUYET: 'Phê duyệt thành công',
      TU_CHOI_PHE_DUYET: 'Từ chối phê duyệt thành công',
    };

    return map[actionCode] || 'Thực hiện thành công';
  }

  /**
   * =====================================================
   * HELPER: Xử lý thông báo và email khi gửi phê duyệt/điều chỉnh
   * =====================================================
   * Được gọi khi:
   * - actionCode === GUI_PHE_DUYET → "Bạn có công việc cần phê duyệt"
   * - actionCode === GUI_DIEU_CHINH hoặc DIEU_CHINH → "Bạn có công việc cần điều chỉnh"
   */
  private async handleApprovalNotificationAndEmail(params: {
    taskId: number;
    taskName: string;
    senderId: string;
    senderName: string;
    recipientId: string;
    actionCode: string;
    note?: string;
    taskDeadline?: string;
  }): Promise<void> {
    const { taskId, taskName, senderId, senderName, recipientId, actionCode, note, taskDeadline } = params;

    // Xác định loại thông báo dựa trên actionCode
    const isAdjustment = actionCode === stageStatusDoc.GUI_DIEU_CHINH ||
      actionCode === stageStatusDoc.DIEU_CHINH;

    const notificationContent = isAdjustment
      ? `Công việc ${taskName} do ${senderName} gửi yêu cầu phê duyệt điều chỉnh thông tin.${note ? `\nLý do điều chỉnh: ${note}` : ''}`
      : `Công việc ${taskName} do ${senderName} gửi yêu cầu phê duyệt.`;

    // const notificationKey = isAdjustment
    //   ? NotificationKey.VIEW_TASK_ADJUSTMENT
    //   : NotificationKey.VIEW_APPROVAL_REQUEST;
    const notificationKey = NotificationKey.VIEW_APPROVAL_REQUEST;
    const logPrefix = isAdjustment ? '[GUI_DIEU_CHINH]' : '[GUI_PHE_DUYET]';
    const emailType = isAdjustment ? 'adjustment' : 'approval';

    try {
      // 1. Phân biệt vai trò của người nhận (xử lý vs người xem)
      const recipientTaskUser = await this.taskUserRepository.findOne({
        where: { taskId: Number(taskId), processId: String(recipientId) },
      });
      const isViewerRecipient = recipientTaskUser?.role === TaskUserRole.VIEWER;

      let notiType: any;
      if (isAdjustment) {
        notiType = isViewerRecipient
          ? NotificationType.TASK_ADJUSTMENT_APPROVAL_REQUESTED_VIEWER.value
          : NotificationType.TASK_ADJUSTMENT_APPROVAL_REQUESTED_PROCESSOR.value;
      } else {
        notiType = isViewerRecipient
          ? NotificationType.TASK_RESULT_APPROVAL_REQUESTED_VIEWER.value
          : NotificationType.TASK_RESULT_APPROVAL_REQUESTED_PROCESSOR.value;
      }

      // Tạo Notification cho người nhận chính
      await this.notificationService.create({
        content: notificationContent,
        recipientId: recipientId,
        senderId: senderId,
        key: notificationKey,
        type: notiType,
        recordId: String(taskId),
        link: `/task/approve/${taskId}`,
        isRead: false,
        status: 1,
      });

      // 1b. Gửi thông báo cho những người xem (Viewers) khác của công việc
      const taskViewers = await this.taskUserRepository.find({
        where: { taskId: Number(taskId), role: TaskUserRole.VIEWER },
      });

      const viewerIds = taskViewers
        .map((tv) => String(tv.processId).trim())
        .filter((id) => id && id !== senderId && id !== recipientId);

      if (viewerIds.length > 0) {
        const viewerType: any = isAdjustment
          ? NotificationType.TASK_ADJUSTMENT_APPROVAL_REQUESTED_VIEWER.value
          : NotificationType.TASK_RESULT_APPROVAL_REQUESTED_VIEWER.value;

        await this.notificationService.createForRecipients({
          recipientIds: [...new Set(viewerIds)],
          senderId: senderId,
          key: notificationKey,
          type: viewerType,
          content: notificationContent,
          recordId: String(taskId),
          link: `/task/approve/${taskId}`,
        });
      }


      // 2. Lấy thông tin email của người nhận
      const recipientUser = await this.sqlsvRepo.getUserById(recipientId);
      if (recipientUser?.emailUser) {
        // 3. Gửi email thông báo - chạy ngầm không block API
        this.mailService.sendApprovalNotificationMail({
          recipientEmail: recipientUser.emailUser,
          recipientName: recipientUser.name || recipientUser.username || 'Quý Anh/Chị',
          senderName: senderName,
          taskName: taskName,
          taskId: taskId,
          note: note,
          taskDeadline: taskDeadline,
          type: emailType,
        }).then(() => {
        }).catch((emailError) => {
          this.logger.error(`${logPrefix} Failed to send email to ${recipientUser.emailUser}: ${emailError.message}`);
        });
      } else {
        this.logger.warn(`${logPrefix} Recipient ${recipientId} has no email configured`);
      }
    } catch (error) {
      // Log lỗi nhưng không throw để không ảnh hưởng đến luồng chính
      this.logger.error(`${logPrefix} Error sending notification/email: ${error.message}`, error.stack);
    }
  }

  /**
   * Xử lý gửi thông báo và email cho các trường hợp phản hồi phê duyệt/điều chỉnh
   * - DONG_Y_DIEU_CHINH: Đồng ý điều chỉnh
   * - TU_CHOI: Từ chối điều chỉnh
   * - TU_CHOI_PHE_DUYET: Từ chối phê duyệt
   * - PHE_DUYET: Phê duyệt
   */
  private async handleApprovalResponseNotificationAndEmail(params: {
    taskId: number;
    taskName: string;
    senderId: string;
    senderName: string;
    recipientId: string;
    actionCode: string;
    note?: string;
    typeTask?: string;
  }): Promise<void> {
    const { taskId, taskName, senderId, senderName, recipientId, actionCode, note, typeTask = 'general' } = params;

    // Xác định loại thông báo và email dựa trên actionCode
    let notificationContent: string;
    let notificationKey: string;
    let logPrefix: string;
    let emailType: 'approval_approved' | 'approval_rejected' | 'adjustment_approved' | 'adjustment_rejected';

    if (actionCode === stageStatusDoc.DONG_Y_DIEU_CHINH) {
      // Đồng ý điều chỉnh (2.3.1)
      notificationContent = `Yêu cầu điều chỉnh thông tin đối với công việc ${taskName} đã được ${senderName} điều chỉnh.`;
      notificationKey = 'VIEW_TASK';
      logPrefix = '[DONG_Y_DIEU_CHINH]';
      emailType = 'adjustment_approved';
    } else if (actionCode === stageStatusDoc.TU_CHOI) {
      // Từ chối điều chỉnh (2.4.1)
      notificationContent = `Yêu cầu điều chỉnh thông tin đối với công việc ${taskName} đã bị ${senderName} từ chối phê duyệt.${note ? `\nLý do từ chối: ${note}` : ''}`;
      notificationKey = 'VIEW_TASK';
      logPrefix = '[TU_CHOI]';
      emailType = 'adjustment_rejected';
    } else if (actionCode === stageStatusDoc.TU_CHOI_PHE_DUYET) {
      // Từ chối phê duyệt (2.2.1)
      notificationContent = `Kết quả thực hiện công việc ${taskName} đã bị ${senderName} từ chối phê duyệt.${note ? `\nLý do từ chối: ${note}` : ''}`;
      if (typeTask === 'form_doc') {
        notificationKey = 'VIEW_JOB_TO_DOCUMENT';
      } else if (typeTask === 'form_meeting') {
        notificationKey = 'VIEW_JOB_TO_MEETING';
      } else {
        notificationKey = 'VIEW_TASK';
      }
      logPrefix = '[TU_CHOI_PHE_DUYET]';
      emailType = 'approval_rejected';
    } else if (actionCode === 'PHE_DUYET') {
      // Phê duyệt (2.1.1)
      notificationContent = `Kết quả thực hiện công việc ${taskName} đã được ${senderName} phê duyệt.`;
      notificationKey = 'VIEW_TASK';
      logPrefix = '[PHE_DUYET]';
      emailType = 'approval_approved';
    } else {
      // Trường hợp không xác định
      this.logger.warn(`Unknown actionCode for approval response: ${actionCode}`);
      return;
    }

    try {
      // 1. Phân biệt vai trò của người nhận (xử lý vs người xem)
      const recipientTaskUser = await this.taskUserRepository.findOne({
        where: { taskId: Number(taskId), processId: String(recipientId) },
      });
      const isViewerRecipient = recipientTaskUser?.role === TaskUserRole.VIEWER;

      let notiType: any = NotificationType.TASK_RESULT_APPROVED_PROCESSOR.value;
      if (actionCode === stageStatusDoc.DONG_Y_DIEU_CHINH) {
        notiType = isViewerRecipient
          ? NotificationType.TASK_ADJUSTMENT_APPROVED_VIEWER.value
          : NotificationType.TASK_ADJUSTMENT_APPROVED_PROCESSOR.value;
      } else if (actionCode === stageStatusDoc.TU_CHOI) {
        notiType = isViewerRecipient
          ? NotificationType.TASK_ADJUSTMENT_REJECTED_VIEWER.value
          : NotificationType.TASK_ADJUSTMENT_REJECTED_PROCESSOR.value;
      } else if (actionCode === stageStatusDoc.TU_CHOI_PHE_DUYET) {
        notiType = isViewerRecipient
          ? NotificationType.TASK_RESULT_REJECTED_VIEWER.value
          : NotificationType.TASK_RESULT_REJECTED_PROCESSOR.value;
      } else if (actionCode === 'PHE_DUYET') {
        notiType = isViewerRecipient
          ? NotificationType.TASK_RESULT_APPROVED_VIEWER.value
          : NotificationType.TASK_RESULT_APPROVED_PROCESSOR.value;
      }

      await this.notificationService.create({
        content: notificationContent,
        recipientId: recipientId,
        senderId: senderId,
        key: notificationKey,
        type: notiType,
        recordId: String(taskId),
        link: `/task/detail/${taskId}`,
        isRead: false,
        status: 1,
      });

      // 1b. Gửi thông báo cho người xem (Viewers) khác của công việc
      const taskViewers = await this.taskUserRepository.find({
        where: { taskId: Number(taskId), role: TaskUserRole.VIEWER },
      });

      const viewerIds = taskViewers
        .map((tv) => String(tv.processId).trim())
        .filter((id) => id && id !== senderId && id !== recipientId);

      if (viewerIds.length > 0) {
        let viewerNotiType: any = null;
        if (actionCode === stageStatusDoc.DONG_Y_DIEU_CHINH) {
          viewerNotiType = NotificationType.TASK_ADJUSTMENT_APPROVED_VIEWER.value;
        } else if (actionCode === stageStatusDoc.TU_CHOI) {
          viewerNotiType = NotificationType.TASK_ADJUSTMENT_REJECTED_VIEWER.value;
        } else if (actionCode === stageStatusDoc.TU_CHOI_PHE_DUYET) {
          viewerNotiType = NotificationType.TASK_RESULT_REJECTED_VIEWER.value;
        } else if (actionCode === 'PHE_DUYET') {
          viewerNotiType = NotificationType.TASK_RESULT_APPROVED_VIEWER.value;
        }

        if (viewerNotiType) {
          await this.notificationService.createForRecipients({
            recipientIds: [...new Set(viewerIds)],
            senderId: senderId,
            key: notificationKey,
            type: viewerNotiType,
            content: notificationContent,
            recordId: String(taskId),
            link: `/task/detail/${taskId}`,
          });
        }
      }


      // 2. Lấy thông tin email của người nhận
      const recipientUser = await this.sqlsvRepo.getUserById(recipientId);
      if (recipientUser?.emailUser) {
        // 3. Gửi email thông báo - chạy ngầm không block API
        this.mailService.sendApprovalNotificationMail({
          recipientEmail: recipientUser.emailUser,
          recipientName: recipientUser.name || recipientUser.username || 'Quý Anh/Chị',
          senderName: senderName,
          taskName: taskName,
          taskId: taskId,
          note: note,
          type: emailType,
        }).then(() => {
        }).catch((emailError) => {
          this.logger.error(`${logPrefix} Failed to send email to ${recipientUser.emailUser}: ${emailError.message}`);
        });
      } else {
        this.logger.warn(`${logPrefix} Recipient ${recipientId} has no email configured`);
      }
    } catch (error) {
      // Log lỗi nhưng không throw để không ảnh hưởng đến luồng chính
      this.logger.error(`${logPrefix} Error sending notification/email: ${error.message}`, error.stack);
    }
  }
  async sendApprovalFormDoc(userId: string, dto: SendApprovalDto) {
    const { taskId, actionCode, note, files, assigneeUserId } = dto;
    // 1. Validate Task & 3. Get Current WorkItem (Tối ưu: Parallelize)
    const [task, workItems] = await Promise.all([
      this.taskRepository.findOne({ where: { id: taskId, status: 1 } }),
      this.dataSource.query(
        `SELECT TOP 1 * FROM work_items WHERE document_id = @0 AND assignee_user_id = @1`,
        [String(taskId), userId],
      )
    ]);
    if (!task) throw new NotFoundException('Công việc không tồn tại');

    if (!workItems || workItems.length === 0) {
      throw new BadRequestException(
        'Bạn không có quyền thực hiện hành động này hoặc công việc đã được xử lý',
      );
    }
    const docType = workItems[0].bpmn_version;
    // 2. Validate BPMN & Permission
    const { bpmnXML } =
      await this.validateBpmnAndPermissionApproveFormDoc(userId, docType);
    const { indexes } = await this.getModelFromXml(bpmnXML);

    const wi = workItems[0];

    // 4. Determine Next Node
    const node = indexes.nodes.get(wi.node_id);
    if (!node)
      throw new BadRequestException(
        'Node hiện tại không hợp lệ trong quy trình',
      );

    const outs = indexes.outgoingBySource.get(node.id) || [];
    const flow = outs.find(
      (f) =>
        f.name?.toUpperCase() === actionCode?.toUpperCase() ||
        f.id === actionCode,
    );
    if (!flow) {
      throw new BadRequestException(
        `Không tìm thấy luồng đi cho hành động: ${actionCode}`,
      );
    }
    let nextNode;
    if (
      actionCode === stageStatusDoc.THUC_HIEN ||
      actionCode === stageStatusDoc.TU_CHOI
    ) {
      ({ node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
        flow,
        indexes,
      ));
    } else {
      ({ node: nextNode } = this.bpmnEngine.findNextGatewayFromFlow(
        flow,
        indexes,
      ));
    }

    const targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;
    // 5. Transaction Execution
    const tx = await this.sqlRepo.begin();
    const nodeExt = flow.targetRef
      ? getAllNodeExtensionProperties(flow.targetRef)
      : undefined;
    const processStatus = nodeExt?.statusCode ? nodeExt.statusCode : undefined;
    // Find the original assigner and directors of the task (Tối ưu: Batch lookup)
    const taskUsers = await this.taskUserRepository.find({
      where: { taskId: taskId, role: In(['assigner', 'director']) },
    });
    const originalAssigner = taskUsers.find(u => u.role === 'assigner');
    const originalDirectors = taskUsers.find(u => u.role === 'director');

    if (!originalAssigner) {
      throw new NotFoundException(
        'Không tìm thấy người giao việc gốc của công việc này.',
      );
    }
    let nextAssigneeId;

    if (
      actionCode === stageStatusDoc.THUC_HIEN ||
      actionCode === stageStatusDoc.TU_CHOI
    ) {
      nextAssigneeId = originalDirectors?.processId || null;
    } else {
      nextAssigneeId = originalAssigner.processId;
    }
    // const assigneeUserId =
    try {
      if (actionCode === 'GIAO_VIEC') {
        await this.sqlRepo.removeWorkItemByConditions(
          { documentId: String(taskId) },
          tx,
        );
        const [directors, supporters] = await Promise.all([
          this.taskUserRepository.find({ where: { taskId, role: 'director' } }),
          this.taskUserRepository.find({ where: { taskId, role: 'supporter' } }),
        ]);
        const firstDirectorId = directors?.[0]?.processId;
        const firstSupporterId = supporters?.[0]?.processId;
        const startEvent = Array.from(indexes.nodes.values()).find(
          (n: any) => n.$type === 'bpmn:StartEvent',
        ) as any;
        if (startEvent?.outgoing?.length) {
          const { node: firstNode } = this.bpmnEngine.nextInteractiveFromFlow(
            startEvent.outgoing[0],
            indexes,
          );
          if (firstNode?.outgoing?.length) {
            const { node: directorNode } =
              this.bpmnEngine.nextInteractiveFromFlow(
                firstNode.outgoing[0],
                indexes,
              );
            if (directorNode && firstDirectorId) {
              const role = indexes.laneMap.get(directorNode.id);
              const newWi: WorkItem = {
                id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                nodeId: directorNode.id,
                role: role || '',
                assigneeUserId: firstDirectorId,
                nodeType: directorNode.$type,
              };
              await this.sqlRepo.addWorkItem(
                String(taskId),
                newWi,
                tx,
                docType,
              );
              await this.sqlRepo.addAudit(
                String(taskId),
                {
                  userId,
                  role: wi.role,
                  actionCode,
                  fromNodeId: wi.nodeId,
                  toNodeId: directorNode.id,
                  action: 'Giao việc',
                  details: { note, files },
                  typeDocument: 'TaskManyUnit',
                  stage_status: 'GIAO_VIEC',
                  created_at: new Date(),
                  updated_at: new Date(),
                  receiver: firstDirectorId,
                },
                tx,
              );
              const props = this.bpmnEngine.getCamundaProperties(directorNode);
              if (props.statusCode) {
                const dbName = this.sqlRepo.getDbName();
                const tableName = this.taskRepository.metadata.tableName;
                await tx
                  .request()
                  .input('taskId', taskId)
                  .input('ps', props.statusCode).query(`
                  UPDATE ${dbName}.dbo.${tableName}
                  SET process_status = @ps
                  WHERE id = @taskId
                `);
              }
            }
            if (firstNode.outgoing.length > 1 && firstSupporterId) {
              const { node: supporterNode } =
                this.bpmnEngine.nextInteractiveFromFlow(
                  firstNode.outgoing[1],
                  indexes,
                );
              if (supporterNode) {
                const role = indexes.laneMap.get(supporterNode.id);
                const newWiSup: WorkItem = {
                  id: `wi_sup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  nodeId: supporterNode.id,
                  role: role || '',
                  assigneeUserId: firstSupporterId,
                  nodeType: supporterNode.$type,
                };
                await this.sqlRepo.addWorkItem(
                  String(taskId),
                  newWiSup,
                  tx,
                  docType,
                );
                await this.sqlRepo.addAudit(
                  String(taskId),
                  {
                    userId,
                    role: wi.role,
                    actionCode: 'ASSIGN_SUPPORTER',
                    fromNodeId: wi.nodeId,
                    toNodeId: supporterNode.id,
                    action: 'Giao phối hợp',
                    stage_status: 'PHOI_HOP',
                    details: { note, files },
                    typeDocument: 'TaskManyUnit',
                    created_at: new Date(),
                    updated_at: new Date(),
                    receiver: firstSupporterId,
                  },
                  tx,
                );
              }
            }
          }
        }
      } else {
        // 5.1 Remove Old WorkItem
        await this.sqlRepo.removeWorkItem(String(taskId), wi.id, tx);

        // 5.2 Create New WorkItem
        if (nextNode && nextNode.$type !== 'bpmn:EndEvent') {
          const newWi: WorkItem = {
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: nextNode.id,
            role: targetRole || '',
            assigneeUserId: nextAssigneeId || null,
            nodeType: nextNode.$type,
          };
          await this.sqlRepo.addWorkItem(String(taskId), newWi, tx, docType);
        }

        const auditDetails: any = { note, files, nextAssigneeId };
        if (actionCode === 'GUI_PHE_DUYET' || actionCode === 'GUI_DIEU_CHINH' || actionCode === 'DIEU_CHINH') {
          const filesDB = await this.filesRepository.getFilesByObjectAndStatus(
            'finaldocuments',
            String(taskId),
          );
          if (filesDB && filesDB.length > 0) {
            auditDetails.currentFileIds = filesDB.map((f) => f.id);
          }
        }

        // 5.3 Add Audit Log
        await this.sqlRepo.addAudit(
          String(taskId),
          {
            userId,
            role: wi.role,
            actionCode,
            fromNodeId: wi.nodeId,
            toNodeId: nextNode?.id || 'END',
            action: 'Gửi phê duyệt',
            details: auditDetails,
            typeDocument: 'TaskManyUnit',
            stage_status: 'CHO_PHE_DUYET',
            created_at: new Date(),
            updated_at: new Date(),
            receiver: nextAssigneeId,
          },
          tx,
        );

        if (processStatus !== undefined) {
          const dbName = this.sqlRepo.getDbName();
          const tableName = this.taskRepository.metadata.tableName;
          await tx
            .request()
            .input('taskId', taskId)
            .input('processStatus', processStatus).query(`
            UPDATE ${dbName}.dbo.${tableName}
            SET process_status = @processStatus,
                update_at = GETDATE()
            WHERE id = @taskId
          `);
        }
      }
      await this.sqlRepo.commit(tx);
      // [Tối ưu] Ghi log không cần await – fire-and-forget
      this.createLogFromSystem({
        actions: 'POST',
        details: `${this.getActionLabel(actionCode)} công việc`,
        note: dto?.note,
        userInfo: userId,
        timestamps: new Date().toISOString(),
        taskId: task.id.toString(),
      }).catch(err => this.logger.error('[sendApprovalFormDoc] createLogFromSystem error:', err));

      // =====================================================
      // XỬ LÝ GUI_PHE_DUYET / GUI_DIEU_CHINH: Tạo notification và gửi email
      // =====================================================
      const shouldNotify = (
        actionCode === stageStatusDoc.GUI_PHE_DUYET ||
        actionCode === stageStatusDoc.GUI_DIEU_CHINH ||
        actionCode === stageStatusDoc.DIEU_CHINH
      ) && nextAssigneeId;

      if (shouldNotify) {
        // Lấy thông tin người gửi
        const senderUser = await this.sqlsvRepo.getUserById(userId);
        const senderName = senderUser?.name || senderUser?.username || 'Người giao việc';
        const taskDeadline = task.endDate ? moment(task.endDate).format('HH:mm - DD/MM/YYYY') : '';
        // Gửi thông báo và email - chạy ngầm không block API
        this.handleApprovalNotificationAndEmail({
          taskId,
          taskName: task.name,
          senderId: userId,
          senderName,
          recipientId: nextAssigneeId,
          actionCode,
          note: dto.note,
          taskDeadline,
        }).catch(err => this.logger.error(`[NotifySend] Error: ${err.message}`));
      }

      return { success: true, message: dto.actionCode === stageStatusDoc.GUI_PHE_DUYET ? 'Gửi phê duyệt thành công' : 'Gửi điều chỉnh thành công' };
    } catch (err) {
      await this.sqlRepo.rollback(tx);
      throw err;
    }
  }

  async approveTask(userId: string, dto: SendApprovalDto) {
    const { taskId, actionCode, note, files, assigneeUserId } = dto;
    // 1. Validate Task
    const task = await this.taskRepository.findOne({
      where: { id: taskId, status: 1 },
    });
    if (!task) throw new NotFoundException('Công việc không tồn tại');

    // 2. Validate BPMN & Permission
    // 3. Get Current WorkItem
    const workItems = await this.dataSource.query(
      `SELECT TOP 1 * FROM work_items WHERE document_id = @0 AND assignee_user_id = @1`,
      [String(taskId), userId],
    );

    if (!workItems || workItems.length === 0) {
      throw new BadRequestException(
        'Bạn không có quyền thực hiện hành động này hoặc công việc đã được xử lý',
      );
    }
    const docType = workItems[0].bpmn_version;
    const { bpmnXML } = await this.validateBpmnAndPermissionApprove(userId, docType);
    const { indexes } = await this.getModelFromXml(bpmnXML);

    const wi = workItems[0];

    // 4. Determine Next Node
    const node = indexes.nodes.get(wi.node_id);
    if (!node)
      throw new BadRequestException(
        'Node hiện tại không hợp lệ trong quy trình',
      );

    const outs = indexes.outgoingBySource.get(node.id) || [];
    const flow = outs.find(
      (f) =>
        f.name?.toUpperCase() === actionCode?.toUpperCase() ||
        f.id === actionCode,
    );
    if (!flow) {
      throw new BadRequestException(
        `Không tìm thấy luồng đi cho hành động: ${actionCode}`,
      );
    }
    const nodeExtCode = flow.targetRef
      ? this.bpmnEngine.getFlowExtensionProperties(flow)
      : undefined;
    const nodeExt = flow.targetRef
      ? getAllNodeExtensionProperties(flow.targetRef)
      : undefined;

    let nextNode;
    if (nodeExtCode?.flagNotNextNode === 'true') {
      ({ node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
        flow,
        indexes,
      ));
    } else {
      ({ node: nextNode } = this.bpmnEngine.findNextGatewayFromFlow(
        flow,
        indexes,
      ));
    }

    const targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;
    // 5. Transaction Execution
    const tx = await this.sqlRepo.begin();
    const processStatus = nodeExt?.statusCode ? nodeExt.statusCode : undefined;
    // Find the original assigner of the task
    const originalAssigner = await this.taskUserRepository.findOne({
      where: { taskId: taskId, role: 'assigner' },
    });
    const originalDirectors = await this.taskUserRepository.findOne({
      where: { taskId: taskId, role: 'director' },
    });
    if (!originalAssigner) {
      throw new NotFoundException(
        'Không tìm thấy người giao việc gốc của công việc này.',
      );
    }
    let nextAssigneeId;

    if (nodeExtCode?.flagNotNextNode === 'true') {
      nextAssigneeId = originalDirectors?.processId || null;
    } else {
      nextAssigneeId = originalAssigner.processId;
    }
    // const assigneeUserId =
    try {
      if (actionCode === 'GIAO_VIEC') {
        await this.sqlRepo.removeWorkItemByConditions(
          { documentId: String(taskId) },
          tx,
        );
        const directors = await this.taskUserRepository.find({
          where: { taskId, role: 'director' },
        });
        const supporters = await this.taskUserRepository.find({
          where: { taskId, role: 'supporter' },
        });
        const firstDirectorId = directors?.[0]?.processId;
        const firstSupporterId = supporters?.[0]?.processId;
        const startEvent = Array.from(indexes.nodes.values()).find(
          (n: any) => n.$type === 'bpmn:StartEvent',
        ) as any;
        if (startEvent?.outgoing?.length) {
          const { node: firstNode } = this.bpmnEngine.nextInteractiveFromFlow(
            startEvent.outgoing[0],
            indexes,
          );
          if (firstNode?.outgoing?.length) {
            const { node: directorNode } =
              this.bpmnEngine.nextInteractiveFromFlow(
                firstNode.outgoing[0],
                indexes,
              );
            if (directorNode && firstDirectorId) {
              const role = indexes.laneMap.get(directorNode.id);
              const newWi: WorkItem = {
                id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                nodeId: directorNode.id,
                role: role || '',
                assigneeUserId: firstDirectorId,
                nodeType: directorNode.$type,
              };
              await this.sqlRepo.addWorkItem(
                String(taskId),
                newWi,
                tx,
                undefined,
              );
              await this.sqlRepo.addAudit(
                String(taskId),
                {
                  userId,
                  role: wi.role,
                  actionCode,
                  fromNodeId: wi.nodeId,
                  toNodeId: directorNode.id,
                  action: 'Giao việc',
                  details: { note, files },
                  typeDocument: 'TaskManyUnit',
                  stage_status: 'GIAO_VIEC',
                  created_at: new Date(),
                  updated_at: new Date(),
                  receiver: firstDirectorId,
                },
                tx,
              );
              const props = this.bpmnEngine.getCamundaProperties(directorNode);
              if (props.statusCode) {
                const dbName = this.sqlRepo.getDbName();
                const tableName = this.taskRepository.metadata.tableName;
                await tx
                  .request()
                  .input('taskId', taskId)
                  .input('ps', props.statusCode).query(`
                  UPDATE ${dbName}.dbo.${tableName}
                  SET process_status = @ps
                  WHERE id = @taskId
                `);
              }
            }
            if (firstNode.outgoing.length > 1 && firstSupporterId) {
              const { node: supporterNode } =
                this.bpmnEngine.nextInteractiveFromFlow(
                  firstNode.outgoing[1],
                  indexes,
                );
              if (supporterNode) {
                const role = indexes.laneMap.get(supporterNode.id);
                const newWiSup: WorkItem = {
                  id: `wi_sup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  nodeId: supporterNode.id,
                  role: role || '',
                  assigneeUserId: firstSupporterId,
                  nodeType: supporterNode.$type,
                };
                await this.sqlRepo.addWorkItem(
                  String(taskId),
                  newWiSup,
                  tx,
                  undefined,
                );
                await this.sqlRepo.addAudit(
                  String(taskId),
                  {
                    userId,
                    role: wi.role,
                    actionCode: 'ASSIGN_SUPPORTER',
                    fromNodeId: wi.nodeId,
                    toNodeId: supporterNode.id,
                    action: 'Giao phối hợp',
                    stage_status: 'PHOI_HOP',
                    details: { note, files },
                    typeDocument: 'TaskManyUnit',
                    created_at: new Date(),
                    updated_at: new Date(),
                    receiver: firstSupporterId,
                  },
                  tx,
                );
              }
            }
          }
        }
      } else {
        // 5.1 Remove Old WorkItem
        await this.sqlRepo.removeWorkItem(String(taskId), wi.id, tx);

        // 5.2 Create New WorkItem
        if (nextNode && nextNode.$type !== 'bpmn:EndEvent') {
          const newWi: WorkItem = {
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: nextNode.id,
            role: targetRole || '',
            assigneeUserId: nextAssigneeId || null,
            nodeType: nextNode.$type,
          };
          await this.sqlRepo.addWorkItem(String(taskId), newWi, tx, docType);
        }

        // 5.3 Add Audit Log
        await this.sqlRepo.addAudit(
          String(taskId),
          {
            userId,
            role: wi.role,
            actionCode,
            fromNodeId: wi.nodeId,
            toNodeId: nextNode?.id || 'END',
            action: this.getActionLabel(actionCode),
            details: { note, files, nextAssigneeId },
            typeDocument: 'TaskManyUnit',
            stage_status: actionCode,
            created_at: new Date(),
            updated_at: new Date(),
            receiver: nextAssigneeId,
          },
          tx,
        );

        if (processStatus !== undefined) {
          await this.handleProcessStatusUpdate(taskId, processStatus, tx);
        }
      }
      await this.sqlRepo.commit(tx);

      // CẬP NHẬT TIẾN ĐỘ DỰ ÁN
      if (task.projectId) {
        await this.projectService.calculateAndUpdateProjectProgress(Number(task.projectId));
      } else if (task.parent) {
        // Tìm projectId từ parent nếu task hiện tại không có
        const rootTask = await this.taskRepository.findOne({
          where: { id: task.id },
          select: ['path']
        });
        if (rootTask?.path) {
          const rootId = rootTask.path.split('/')[0];
          const rootTaskEntity = await this.taskRepository.findOne({
            where: { id: Number(rootId) },
            select: ['projectId']
          });
          if (rootTaskEntity?.projectId) {
            await this.projectService.calculateAndUpdateProjectProgress(Number(rootTaskEntity.projectId));
          }
        }
      }

      // Ghi log hệ thống SQL Server
      try {
        await this.SystemLogServiceSql.createLogFromSystem({
          action: 'POST',
          details: `${this.getActionLabel(actionCode)} công việc từ văn bản (ID: ${taskId})`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
          subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
          userInfo: userId,
          ipAddress: 'System',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Lỗi ghi log hệ thống (sendApprovalFormDoc):', error);
      }

      await this.createLogFromSystem({
        actions: 'POST',
        details: `Thực hiện hành động ${this.getActionLabel(actionCode)} cho công việc`,
        note: dto.note,
        userInfo: userId,
        timestamps: new Date().toISOString(),
        taskId: taskId.toString(),
      });

      // =====================================================
      // XỬ LÝ GỬI THÔNG BÁO VÀ EMAIL CHO 4 TRƯỜNG HỢP
      // =====================================================
      const shouldNotifyApproval = (
        actionCode === stageStatusDoc.DONG_Y_DIEU_CHINH ||
        actionCode === stageStatusDoc.TU_CHOI ||
        actionCode === stageStatusDoc.TU_CHOI_PHE_DUYET ||
        actionCode === 'PHE_DUYET'
      );

      if (shouldNotifyApproval) {
        // Lấy thông tin người gửi (người phê duyệt/từ chối)
        const senderUser = await this.sqlsvRepo.getUserById(userId);
        const senderName = senderUser?.name || senderUser?.username || 'Người phê duyệt';

        // Lấy danh sách người chủ trì và người phối hợp
        const directors = await this.taskUserRepository.find({
          where: { taskId, role: 'director' },
        });
        const supporters = await this.taskUserRepository.find({
          where: { taskId, role: 'supporter' },
        });

        // Gửi thông báo và email song song cho tất cả người chủ trì + phối hợp (không block API)
        const allRecipients = [...directors, ...supporters].filter(u => u.processId);
        Promise.all(
          allRecipients.map(recipient =>
            this.handleApprovalResponseNotificationAndEmail({
              taskId,
              taskName: task.name,
              senderId: userId,
              senderName,
              recipientId: recipient.processId,
              actionCode,
              note: dto.note,
              typeTask: task.typeTask,
            }).catch(err => this.logger.error(`[NotifyResponse] Error for ${recipient.processId}: ${err.message}`))
          )
        ).catch(err => this.logger.error(`[NotifyResponse] Promise.all error: ${err.message}`));
      }

      return { success: true, message: this.getActionMessage(actionCode) };
    } catch (err) {
      await this.sqlRepo.rollback(tx);
      throw err;
    }
  }

  async historyApprove(queryParams: ListTaskDto, userId: string) {
    const {
      page = 1,
      limit = 10,
      type: typeTop,
    } = queryParams;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const isSent = (typeTop || (queryParams as any).type) === 'sent';

    // Get audit history data from repository
    const { data: rawData, total } = await this.taskRepository.findHistoryTasksWithAudit(queryParams, userId);

    const data = await Promise.all(
      rawData.map(async (row: any) => {
        // Basic task info
        const taskBasic = {
          id: row.taskId,
          name: row.taskName,
          code: row.taskCode,
          status: row.taskStatus,
          priority: row.taskPriority,
          processStatus: row.taskProcessStatus,
          typeTask: row.taskTypeTask,
          endDate: row.taskEndDate,
          progress: row.taskProgress,
        };

        const typeTaskView = buildTypeTaskView(taskBasic.typeTask);
        const currentActionCode = row.auditActionCode;

        // Type of request view
        const typeRequestView = buildTypeRequestView(currentActionCode);

        // Outcome determination
        const outcomeActionCode = row.nextAuditActionCode || 'pending';
        const processStatusView = buildApprovalStatusView(outcomeActionCode);

        // Extraction of rejection reason
        let rejectionReason: string | null = null;
        const rejectionActionCodes = [stageStatusDoc.TU_CHOI, stageStatusDoc.TU_CHOI_PHE_DUYET];

        if (rejectionActionCodes.includes(outcomeActionCode)) {
          if (row.nextAuditDetails) {
            try {
              const nextDet = typeof row.nextAuditDetails === 'string' ? JSON.parse(row.nextAuditDetails) : row.nextAuditDetails;
              rejectionReason = nextDet.note || null;
            } catch (e) { }
          }
        }

        // Action label/message
        let resultText = 'Chờ xử lý';
        if (outcomeActionCode !== 'pending') {
          const isAccepted = ['PHE_DUYET', 'DIEU_CHINH', 'DONG_Y'].includes(outcomeActionCode);
          const isRejected = ['TU_CHOI', 'TU_CHOI_PHE_DUYET'].includes(outcomeActionCode);

          if (isAccepted) {
            resultText = ['PHE_DUYET', 'DONG_Y'].includes(outcomeActionCode) ? 'Đồng ý phê duyệt' : 'Yêu cầu điều chỉnh';
          } else if (isRejected) {
            resultText = 'Từ chối phê duyệt';
          } else {
            resultText = this.getActionLabel(outcomeActionCode) || outcomeActionCode;
          }
        }

        // Note of the submission
        let noteSent: string | null = null;
        if (row.auditDetails) {
          try {
            const det = typeof row.auditDetails === 'string' ? JSON.parse(row.auditDetails) : row.auditDetails;
            noteSent = det.note || null;
          } catch (e) { }
        }

        return {
          ...taskBasic,
          id: row.auditId, // Identification by audit log
          auditId: row.auditId,
          taskId: row.taskId,
          typeTask: typeTaskView.html,
          typeRequest: typeRequestView.html,
          typeRequestText: currentActionCode,
          processStatus: processStatusView.html,
          sender: row.auditSenderName || null,
          receiver: row.auditReceiverName || null,
          dateSent: row.auditCreatedAt
            ? dayjs(row.auditCreatedAt).format('DD/MM/YYYY HH:mm')
            : null,
          processedAt: row.nextAuditCreatedAt
            ? dayjs(row.nextAuditCreatedAt).format('DD/MM/YYYY HH:mm')
            : (outcomeActionCode !== 'pending' ? dayjs(row.auditCreatedAt).format('DD/MM/YYYY HH:mm') : null),
          result: resultText,
          nextAuditActionCode: row.nextAuditActionCode || null,
          rejectionReason: rejectionReason,
          note: noteSent,
          noteSent: noteSent,
          isHistoryRow: true,
        };
      }),
    );

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }


  async getInfoWorkflow(name: string) {
    if (name) {
      // Xử lý tìm kiếm theo name
    }
    return {
      count: 3,
      data: Workflows,
      limit: 100,
      skip: 0,
    };
  }

  async findOneSelectFormDoc(
    docId: string,
    page = 1,
    limit = 25,
    userId?: string,
    name?: string,
  ): Promise<{
    data: any[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    interface DocInfo {
      toBook: string | null;
      documentDate: string | null;
      abstractNote: string | null;
    }

    const skip = (page - 1) * limit;

    /* ================= QUERY + COUNT ================= */
    // BƯỚC 1: Lấy tất cả các task gốc khớp với docId
    const baseRootTasks = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.id')
      .where(`:docId IN (SELECT value FROM STRING_SPLIT(task.docId, ','))`, {
        docId,
      })
      .andWhere('task.status = :status', { status: 1 })
      .getMany();

    if (!baseRootTasks.length) {
      return { data: [], page, limit, total: 0, totalPages: 0 };
    }

    const baseRootIds = baseRootTasks.map((t) => t.id);

    // BƯỚC 2: Kéo toàn bộ gia phả của các task thuộc docId này
    const allDocTaskIds = await this.taskRepository.getAllRelatedTaskIdsSearchName(baseRootIds, '');

    // BƯỚC 3: Lọc THEO TÊN (name) TRONG TẬP HỢP GIA PHẢ ĐÓ để làm phân trang
    const qb = this.taskRepository
      .createQueryBuilder('task')
      .select('task.id')
      .where('task.id IN (:...allDocTaskIds)', { allDocTaskIds })
      .andWhere('task.status = :status', { status: 1 });

    if (name) {
      qb.andWhere('task.name COLLATE Latin1_General_CI_AI LIKE :name', {
        name: `%${name}%`,
      });
    }

    const rootTasks = await qb
      .skip(skip)
      .take(limit)
      .getMany();

    if (!rootTasks.length) {
      return { data: [], page, limit, total: 0, totalPages: 0 };
    }

    // rootIds bây giờ là ID của những task KHỚP VỚI TÊN (có thể là con, là cháu)
    const rootIds = rootTasks.map((t) => t.id);

    // BƯỚC 4: Từ những task khớp tên này, lại kéo ngược gia phả của tụi nó 
    // để xuất ra màn hình UI thành 1 mạch cây đầy đủ (từ gốc -> cha -> ông)
    const taskIds = await this.taskRepository.getAllRelatedTaskIdsSearchName(rootIds, name || '');

    const tasks = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.taskUsers', 'taskUsers')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.updatedBy', 'updatedBy')
      .select([
        'task.id',
        'task.name',
        'task.code',
        'task.docId',
        'task.startDate',
        'task.endDate',
        'task.parent',
        'task.path',
        'task.processStatus',
        'task.priority',
        'task.progress',
        'task.createdAt',
        'task.updatedAt',
        'task.typeTask',
        'taskUsers.id',
        'taskUsers.role',
        'taskUsers.type',
        'taskUsers.processId',
        'taskUsers.processName',
        'createdBy.id',
        'createdBy.name',
        'createdBy.emailUser',
        'createdBy.username',
        'updatedBy.id',
        'updatedBy.name',
      ])
      .where('task.id IN (:...taskIds)', { taskIds })
      .andWhere('task.status = :status', { status: 1 })
      .orderBy('task.createdAt', 'DESC')
      .getMany();

    // Đếm tổng số task thỏa mãn tên (nằm trong tập sub-tree của docId)
    const countQb = this.taskRepository
      .createQueryBuilder('task')
      .where('task.id IN (:...allDocTaskIds)', { allDocTaskIds })
      .andWhere('task.status = :status', { status: 1 });

    if (name) {
      countQb.andWhere('task.name COLLATE Latin1_General_CI_AI LIKE :name', {
        name: `%${name}%`,
      });
    }

    const total = await countQb.getCount();

    /* ================= MAP DATA ================= */
    const crmTitlesBatch = await this.mapCrmTitlesBatch(tasks);

    // [TỐI ƯU HIỆU NĂNG] Lấy toàn bộ thông tin văn bản TỪ TRƯỚC VÒNG LẶP (Tránh N+1 query)
    let globalDocInfo: DocInfo | null = null;
    const doc = await this.dataSource
      .createQueryBuilder()
      .select(['to_book', 'document_date', 'abstract_note'])
      .from('incomming_documents', 'idoc')
      .where('idoc.document_id = :docId', { docId })
      .getRawOne();

    if (doc) {
      globalDocInfo = {
        toBook: doc.to_book ?? null,
        documentDate: doc.document_date ?? null,
        abstractNote: doc.abstract_note ?? null,
      };
    }

    // [TỐI ƯU HIỆU NĂNG] Lấy toàn bộ tên task cha TỪ TRƯỚC VÒNG LẶP (Tránh N+1 query)
    const parentIds = [...new Set(tasks.map(t => t.parent).filter(Boolean))];
    const parentNameMap = new Map<number, string>();
    if (parentIds.length > 0) {
      const parentTasks = await this.taskRepository.find({
        where: { id: In(parentIds) },
        select: ['id', 'name'],
      });
      parentTasks.forEach(pt => parentNameMap.set(pt.id, pt.name));
    }

    // [TỐI ƯU HIỆU NĂNG] Vòng lặp map trở thành Synchronous hoàn toàn (Không Promise.all, không await bên trong loop)
    const data = tasks.map((task) => {
      let parentName: string | null = null;
      if (task.parent) {
        parentName = parentNameMap.get(task.parent) ?? null;
      }

      const progressView = buildProgressView(task);
      const { assigner, director, supporter, viewer, directorDep } = this.mapTaskUsers(
        task.taskUsers || [],
      );
      const crmMappedValues = crmTitlesBatch[task.id] || {};

      const processStatusUi = {
        processStatusUi: this.mapProcessStatusToHtml(task.processStatus),
        progressView: progressView.html,
      };

      const docInfo: DocInfo | null = task.docId ? globalDocInfo : null;

      // const flagSvg = crmMappedValues.priority === 'Gấp' ? RED_FLAG_SVG : WHITE_FLAG_SVG;
      const mapDataFinal = {
        // flag: flagSvg,
        name: `${task.name}`,
        assigner,
        director,
        supporter,
        viewer,

        startDate: task.startDate
          ? dayjs(task.startDate).format('DD/MM/YYYY')
          : null,
        endDate: task.endDate
          ? dayjs(task.endDate).format('DD/MM/YYYY')
          : null,
        // ✅ Thêm trường ISO format
        startDateISO: task.startDate ? new Date(task.startDate).toISOString() : null,
        endDateISO: task.endDate ? new Date(task.endDate).toISOString() : null,
        createdAt: dayjs(task.createdAt).format('DD/MM/YYYY HH:mm'),
        updatedAt: task.updatedAt
          ? dayjs(task.updatedAt).format('DD/MM/YYYY HH:mm')
          : null,
        createdBy: task.createdBy
          ? {
            id: task.createdBy.id,
            name: task.createdBy.name,
            email: task.createdBy.emailUser,
          }
          : null,
        updatedBy: task.updatedBy
          ? { id: task.updatedBy.id, name: task.updatedBy.name }
          : null,
        parentDirector: directorDep || task.parent || null,
      };

      return {
        ...task,
        ...mapDataFinal,
        ...processStatusUi,
        docId: task.docId,
        toBook: docInfo?.toBook ?? null,
        documentDate: docInfo?.documentDate ?? null,
        abstractNote: docInfo?.abstractNote ?? null,
        summary: [docInfo?.toBook, docInfo?.abstractNote]
          .filter(Boolean)
          .join(' - '),
        parentName,
      };
    });

    /* ================= RESPONSE ================= */
    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async patchSelectFormDoc(
    docId: string,
    taskIds: number[],
    userId: string,
  ): Promise<any> {
    if (!docId || !taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      throw new BadRequestException(
        'docId và taskIds là bắt buộc và taskIds phải là một mảng không rỗng.',
      );
    }

    const doc = await this.dataSource
      .createQueryBuilder()
      .select('document_id')
      .from('incomming_documents', 'idoc')
      .where('idoc.document_id = :docId', { docId: String(docId) })
      .getRawOne();

    if (!doc) {
      throw new NotFoundException(`Không tìm thấy văn bản đến với ID ${docId}`);
    }

    // lấy task hiện tại
    const tasks = await this.taskRepository.find({
      where: { id: In(taskIds), status: 1 },
      select: ['id', 'docId'],
    });

    for (const task of tasks) {
      const currentDocIds = task.docId
        ? task.docId.split(',').map((d) => d.trim())
        : [];

      if (!currentDocIds.includes(docId)) {
        currentDocIds.push(docId);
      }

      task.docId = currentDocIds.join(',');
      task.updatedById = userId;
    }

    await this.taskRepository.save(tasks);

    return {
      success: true,
      message: `Đã gán văn bản ${docId} cho ${tasks.length} công việc.`,

      affectedCount: tasks.length,
    };
  }

  /**
   * Kiểm tra quyền tạo công việc (chọn phòng ban / cá nhân)
   * Trả về các cờ flag để UI hiển thị
   */
  async checkCreatePermission(userId: string, leaderId?: string) {
    if (!userId) {
      return {
        disableSuporter: false,
        directorSelectDepartment: false,
        supporterSelectDepartment: false,
        isVanThu: false
      };
    }

    // 1. Lấy thông tin nhóm của User
    const userGroups = await this.sqlsvRepo.getUserGroups(userId);
    const groupCodes = userGroups?.map(g => g.code) || [];

    // 2. Danh sách nhóm Lãnh đạo (có quyền giao Phòng ban)
    const LEADERS = [GROUP_CODES.TONG_GIAM_DOC, GROUP_CODES.PHO_GIAM_DOC, GROUP_CODES.TRUONG_PHONG, GROUP_CODES.PHO_TRUONG_PHONG];
    const LEADERS_TONG = [GROUP_CODES.TONG_GIAM_DOC, GROUP_CODES.PHO_GIAM_DOC];

    // 3. Logic check
    let isLeader = groupCodes.some(code => LEADERS.includes(code));
    let isLeadertong = groupCodes.some(code => LEADERS_TONG.includes(code));

    // Nếu FE gửi leaderId, kiểm tra xem người đó có phải lãnh đạo không
    if (leaderId) {
      const targetUserGroups = await this.sqlsvRepo.getUserGroups(leaderId);
      const targetGroupCodes = targetUserGroups?.map(g => g.code) || [];
      if (targetGroupCodes.some(code => LEADERS.includes(code))) {
        isLeader = true;
      }
      if (targetGroupCodes.some(code => LEADERS_TONG.includes(code))) {
        isLeadertong = true;
      }
    }

    const userGroupsQuery = await this.groupUserRepository
      .createQueryBuilder('g')
      .innerJoin('g.users', 'u')
      .where('u.id = :userId', { userId })
      .getMany();

    const userGroupCodes = userGroupsQuery.map(g => g.code);
    const isCanBo = userGroupCodes.includes(GROUP_CODES.CANBO);
    // let isVanThu = userGroupCodes.includes(GROUP_CODES.VAN_THU);
    let isVanThu = false;

    // NẾU ĐƯỢC ỦY QUYỀN bởi LÃNH ĐẠO -> Coi như Văn thư
    const activeDelegations = await this.delegationService.findActiveEntitiesByToUser(userId);
    const hasLeaderDelegation = activeDelegations.some(d => {
      const fromUserGroups = d.fromUser?.groupUsers?.map(g => g.code) || [];
      return fromUserGroups.some(code => LEADERS.includes(code));
    });

    if (hasLeaderDelegation) {
      isVanThu = true;
    }

    return {
      // disableSuporter: isLeader ? false : isCanBo,
      disableSuporter: false,
      directorSelectDepartment: isLeadertong,
      supporterSelectDepartment: isLeadertong,
      isVanThu: isVanThu,
      // isSecret: isLeadertong
      isSecret: false
    };
  }

  /**
   * Kiểm tra quyền tạo công việc (chọn phòng ban / cá nhân)
   * Trả về các cờ flag để UI hiển thị
   */
  async checkCreatePermissionForMeeting(userId: string, leaderId?: string) {
    if (!userId) {
      return {
        disableSuporter: false,
        directorSelectDepartment: false,
        supporterSelectDepartment: false,
        isVanThu: false
      };
    }

    // 1. Lấy thông tin nhóm của User
    const userGroups = await this.sqlsvRepo.getUserGroups(userId);
    const groupCodes = userGroups?.map(g => g.code) || [];

    // 2. Danh sách nhóm Lãnh đạo (có quyền giao Phòng ban)
    const LEADERS = [GROUP_CODES.TONG_GIAM_DOC, GROUP_CODES.PHO_GIAM_DOC, GROUP_CODES.TRUONG_PHONG, GROUP_CODES.PHO_TRUONG_PHONG];
    const LEADERS_TONG = [GROUP_CODES.TONG_GIAM_DOC, GROUP_CODES.PHO_GIAM_DOC];

    // 3. Logic check
    let isLeader = groupCodes.some(code => LEADERS.includes(code));
    const isLeadertong = groupCodes.some(code => LEADERS_TONG.includes(code));

    // Nếu FE gửi leaderId, kiểm tra xem người đó có phải lãnh đạo không
    if (leaderId) {
      const targetUserGroups = await this.sqlsvRepo.getUserGroups(leaderId);
      const targetGroupCodes = targetUserGroups?.map(g => g.code) || [];
      if (targetGroupCodes.some(code => LEADERS.includes(code))) {
        isLeader = true;
      }
    }

    const userGroupsQuery = await this.groupUserRepository
      .createQueryBuilder('g')
      .innerJoin('g.users', 'u')
      .where('u.id = :userId', { userId })
      .getMany();

    const userGroupCodes = userGroupsQuery.map(g => g.code);
    const isCanBo = userGroupCodes.includes(GROUP_CODES.CANBO);
    // let isVanThu = userGroupCodes.includes(GROUP_CODES.VAN_THU);
    let isVanThu = false;

    // NẾU ĐƯỢC ỦY QUYỀN bởi LÃNH ĐẠO -> Coi như Văn thư
    const activeDelegations = await this.delegationService.findActiveEntitiesByToUser(userId);
    const hasLeaderDelegation = activeDelegations.some(d => {
      const fromUserGroups = d.fromUser?.groupUsers?.map(g => g.code) || [];
      return fromUserGroups.some(code => LEADERS.includes(code));
    });

    if (hasLeaderDelegation) {
      isVanThu = true;
    }

    return {
      disableSuporter: false,
      directorSelectDepartment: true,
      supporterSelectDepartment: true,
      isVanThu: isVanThu,
      // isSecret: isLeadertong
      isSecret: false
    };
  }

  //////////////////Task Project//////////////////
  async createDocumentAtNodeForProject({
    bpmnXML,
    data,
    queryRunner,
    assigneeUserId = null,
    flowId = null,
    docType,
  }: {
    bpmnXML: string;
    data: any;
    queryRunner?: QueryRunner;
    assigneeUserId?: string | null;
    flowId?: string | null;
    docType?: string;
  }): Promise<any> {
    const { indexes } = await this.getModelFromXml(bpmnXML);

    let targetNode: any = null;
    let flow: any = null;

    if (data.parentNodeId) {
      // Tìm flow từ parent node
      // Với TaskProject: GIAO_VIEC → GIAO_CHU_TRI
      // Với task khác: TAO_CONG_VIEC → GIAO_VIEC → GIAO_CHU_TRI
      let initialFlow: any = null;
      const flowName = docType === 'TaskProject' ? 'GIAO_VIEC' : 'TAO_CONG_VIEC';

      const parentNodeId = data.parentNodeId;
      if (parentNodeId) {
        const parentNode = (indexes.nodes as Map<string, any>).get(parentNodeId);
        if (parentNode && parentNode.outgoing) {
          initialFlow = parentNode.outgoing.find(
            (fl: any) => fl.name === flowName,
          );
        }
      }

      if (!initialFlow) {
        // Fallback: tìm trong toàn bộ BPMN
        for (const node of (indexes.nodes as Map<string, any>).values()) {
          if (node.outgoing) {
            const f = node.outgoing.find((fl: any) => fl.name === flowName);
            if (f) {
              initialFlow = f;
              break;
            }
          }
        }
      }

      if (initialFlow) {
        flow = initialFlow;
        const res = this.bpmnEngine.nextInteractiveFromFlow(
          initialFlow,
          indexes,
        );
        let currentNode = res.node;

        // Nếu là TaskProject, tìm GIAO_CHU_TRI trực tiếp
        // Nếu là task khác, tìm GIAO_VIEC trước, rồi mới GIAO_CHU_TRI
        if (docType !== 'TaskProject') {
          // Tìm thêm flow 'GIAO_VIEC'
          if (currentNode && currentNode.outgoing) {
            const gvFlow = currentNode.outgoing.find(
              (fl: any) => fl.name === 'GIAO_VIEC',
            );
            if (gvFlow) {
              flow = gvFlow;
              const resGv = this.bpmnEngine.nextInteractiveFromFlow(
                gvFlow,
                indexes,
              );
              currentNode = resGv.node;
            }
          }
        }

        // Tìm thêm flow 'GIAO_CHU_TRI'
        if (currentNode && currentNode.outgoing) {
          const gctFlow = currentNode.outgoing.find(
            (fl: any) => fl.name === 'GIAO_CHU_TRI',
          );
          if (gctFlow) {
            flow = gctFlow;
            const resGct = this.bpmnEngine.nextInteractiveFromFlow(
              gctFlow,
              indexes,
            );
            currentNode = resGct.node;
          }
        }

        targetNode = currentNode;

        // Tìm giao việc
        const isUnit =
          data.directors?.[0]?.type === TaskUserType.DEPARTMENT ||
          data.directors?.[0]?.type === String(TaskUserType.DEPARTMENT);
        if (isUnit && assigneeUserId) {
          const targetId = await this.getDepartmentAssignee(assigneeUserId);
          if (targetId) {
            assigneeUserId = targetId;
          }
        }
      }
    }

    if (!targetNode) {
      // =========================
      // BPMN: START → NODE ĐẦU
      // =========================
      const startEvent = Array.from(indexes.nodes.values()).find(
        (node: any) => node.$type === 'bpmn:StartEvent',
      ) as any;

      if (!startEvent) {
        throw new BadRequestException('BPMN không có StartEvent');
      }

      flow = startEvent.outgoing[0];
      if (flow) {
        const { node: firstNode } = this.bpmnEngine.nextInteractiveFromFlow(
          flow,
          indexes,
        );

        const outgoingFlows = firstNode?.outgoing || [];
        const targetFlow = outgoingFlows.find(
          (f: any) => f.name === 'GIAO_CHU_TRI',
        );

        if (targetFlow) {
          const res = this.bpmnEngine.nextInteractiveFromFlow(
            targetFlow,
            indexes,
          );
          targetNode = res.node;
        }
      }
    }

    if (targetNode) {
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

      const initialStatus = data?.statusCode ?? '1';
      // TẠO AUDIT + WORKITEM
      await this.createInitialAuditAndWorkItem({
        documentId,
        node: targetNode,
        role,
        assigneeUserId,
        data,
        statusCode: initialStatus,
        docType: docType,
      });

      // 3️⃣ Update Task Status from BPMN Extension
      const props = this.bpmnEngine.getCamundaProperties(targetNode);
      if (props.statusCode) {
        if (queryRunner) {
          await queryRunner.manager.update(
            TaskEntity,
            { id: Number(documentId) },
            { processStatus: props.statusCode },
          );
        } else {
          await this.taskRepository.update(
            { id: Number(documentId) },
            { processStatus: props.statusCode },
          );
        }
      }
    }

    if (flow) {
      const nodeExt = flow.targetRef
        ? getAllNodeExtensionProperties(flow.targetRef)
        : undefined;
      // const processStatus = nodeExt?.statusCode ? nodeExt.statusCode : undefined;
      const processStatus = '1';

      if (processStatus) {
        if (queryRunner) {
          await queryRunner.manager.update(
            TaskEntity,
            { id: Number(data.documentId) },
            {
              processStatus,
              updatedAt: new Date(),
            },
          );
        } else {
          await this.taskRepository.update(
            { id: Number(data.documentId) },
            {
              processStatus,
              updatedAt: new Date(),
            },
          );
        }
      }
    }

    return;
  }

  private async createBpmnWorkItemsAndAuditForProject(
    queryRunner: QueryRunner,
    taskId: number,
    dto: CreateTaskDto,
    bpmnXML: string,
    flowId: string,
    docType: string,
    routingKey?: string,
    userId?: string,
  ): Promise<void> {
    // Tạo BPMN WORKITEM + AUDIT với người chủ trì
    let firstDirectorId = dto.directors?.length ? dto.directors[0].processId : null;
    const isDirectorUnit = dto.directors?.length ? dto.directors[0].type === TaskUserType.DEPARTMENT : false;

    // Xử lý riêng cho LANH_DAO_GIAO_PHONG_BAN
    if (routingKey === TaskRoutingKey.LANH_DAO_GIAO_PHONG_BAN && isDirectorUnit && firstDirectorId) {
      const targetId = await this.getDepartmentAssignee(firstDirectorId);
      if (targetId) {
        // this.logger.log(`LANH_DAO_GIAO_PHONG_BAN: Chuyển assignee chủ trì từ phòng ban ${firstDirectorId} sang user ${targetId}`);
        firstDirectorId = targetId;
      }
    }

    if (firstDirectorId) {
      await this.createDocumentAtNodeForProject({
        bpmnXML,
        data: {
          documentId: String(taskId),
          ...dto,
        },
        assigneeUserId: firstDirectorId,
        flowId,
        queryRunner,
        docType,
      });

      // 🔔 Thông báo cho người chủ trì
      await this.notificationService.createForRecipients({
        recipientIds: [firstDirectorId],
        senderId: userId || '',
        key: 'VIEW_JOB_PROJECT',
        type: NotificationType.ADDED_TO_NEW_TASK_MEMBER.value,
        title: 'Thông báo chủ trì công việc (Dự án)',
        content: `Bạn được chỉ định chủ trì công việc mới trong dự án: ${dto.name}`,
        recordId: String(taskId),
      });
    }

    // Tạo BPMN WORKITEM + AUDIT với người phối hợp
    if (dto.supporters && dto.supporters.length > 0) {
      const supporterRecipientIds: string[] = [];
      await Promise.all(
        dto.supporters
          .filter((supporter) => supporter.processId)
          .map(async (supporter) => {
            let assigneeId = supporter.processId;
            const isSupporterUnit = supporter.type === TaskUserType.DEPARTMENT;

            if (routingKey === TaskRoutingKey.LANH_DAO_GIAO_PHONG_BAN && isSupporterUnit) {
              const targetId = await this.getDepartmentAssignee(assigneeId);
              if (targetId) {
                // this.logger.log(`LANH_DAO_GIAO_PHONG_BAN: Chuyển assignee phối hợp từ phòng ban ${assigneeId} sang user ${targetId}`);
                assigneeId = targetId;
              }
            }

            supporterRecipientIds.push(assigneeId);

            return this.assignSupporterForProject({
              bpmnXML,
              supporterId: assigneeId,
              data: {
                documentId: String(taskId),
                ...dto,
              },
              docType,
              parentNodeId: (dto as any).parentNodeId,
            });
          }),
      );

      // 🔔 Thông báo cho người phối hợp
      if (supporterRecipientIds.length > 0) {
        await this.notificationService.createForRecipients({
          recipientIds: [...new Set(supporterRecipientIds)],
          senderId: userId || '',
          key: 'VIEW_JOB_PROJECT',
          type: NotificationType.ADDED_TO_NEW_TASK_MEMBER.value,
          title: 'Thông báo phối hợp công việc (Dự án)',
          content: `Bạn được chỉ định phối hợp công việc mới trong dự án: ${dto.name}`,
          recordId: String(taskId),
        });
      }
    }

    // 🔔 Thông báo cho người theo dõi
    if (dto.viewers && dto.viewers.length > 0) {
      const viewerIds = dto.viewers.filter(v => v.processId).map(v => v.processId);
      if (viewerIds.length > 0) {
        await this.notificationService.createForRecipients({
          recipientIds: [...new Set(viewerIds)],
          senderId: userId || '',
          key: 'VIEW_JOB_PROJECT',
          type: NotificationType.ADDED_TO_NEW_TASK_VIEWER.value,
          title: 'Thông báo theo dõi công việc (Dự án)',
          content: `Bạn được chỉ định theo dõi công việc mới trong dự án: ${dto.name}`,
          recordId: String(taskId),
        });
      }
    }
  }

  private async assignSupporterForProject(params: {
    bpmnXML: string;
    data: any;
    supporterId: string;
    docType?: string;
    parentNodeId?: string;
  }): Promise<void> {
    const { bpmnXML, data, supporterId, docType, parentNodeId } = params;

    const { indexes } = await this.getModelFromXml(bpmnXML);

    let firstNode: any = null;
    let flow: any = null;

    if (parentNodeId) {
      // =========================
      // BẮT ĐẦU TỪ PARENT NODE (nextNode)
      // =========================
      firstNode = (indexes.nodes as Map<string, any>).get(parentNodeId);
      if (!firstNode) {
        throw new BadRequestException(`Không tìm thấy node với ID ${parentNodeId}`);
      }
    } else {
      // =========================
      // BPMN: START → NODE ĐẦU (fallback)
      // =========================
      const startEvent = Array.from(indexes.nodes.values()).find(
        (node: any) => node.$type === 'bpmn:StartEvent',
      ) as any;

      if (!startEvent?.outgoing?.length) {
        throw new BadRequestException('BPMN không có StartEvent hợp lệ');
      }

      const result = this.bpmnEngine.nextInteractiveFromFlow(
        startEvent.outgoing[0],
        indexes,
      );
      firstNode = result.node;
    }

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
      const startEvent = Array.from(indexes.nodes.values()).find(
        (node: any) => node.$type === 'bpmn:StartEvent',
      ) as any;

      if (!startEvent) {
        throw new BadRequestException('BPMN không có StartEvent');
      }

      flow = startEvent.outgoing[0];
      if (flow) {
        const { node: firstNode } = this.bpmnEngine.nextInteractiveFromFlow(
          flow,
          indexes,
        );

        const outgoingFlows = firstNode?.outgoing || [];
        const targetFlow = outgoingFlows.find(
          (f: any) => f.name === 'GIAO_PHOI_HOP',
        );

        if (targetFlow) {
          const res = this.bpmnEngine.nextInteractiveFromFlow(
            targetFlow,
            indexes,
          );
          targetNode = res.node;
        }
      }
    }
    if (!targetNode) {
      throw new BadRequestException('Không xác định được node xử lý supporter');
    }

    const role = indexes.laneMap.get(targetNode.id);

    if (!role) {
      throw new BadRequestException(
        `Không xác định được role cho node ${targetNode.id}`,
      );
    }

    // 🎯 ÉP ĐÚNG supporter
    // if (role !== 'supporter') {
    //   throw new BadRequestException(
    //     `Node ${targetNode.id} không phải role supporter`,
    //   );
    // }

    const documentId = data?.documentId;
    if (!documentId) {
      throw new BadRequestException('documentId is required in data');
    }

    // =========================
    // TẠO WORK ITEM SUPPORTER
    // =========================
    await this.createSupporterWorkItem({
      documentId,
      role,
      node: targetNode,
      supporterId,
      docType,
    });

    // =========================
    // (OPTIONAL) TẠO AUDIT
    // =========================
    // await this.createSupporterAudit({
    //   documentId,
    //   node: targetNode,
    //   supporterId,
    //   data,
    // });
  }

  private validateTaskDateBounds(taskStart: any, taskEnd: any, parentStart: any, parentEnd: any, context: 'dự án' | 'công việc cha') {
    if (taskStart && parentStart && dayjs(taskStart).isBefore(dayjs(parentStart), 'minute')) {
      throw new BadRequestException(`Ngày bắt đầu công việc không được trước ngày bắt đầu ${context}`);
    }
    if (taskEnd && parentEnd && dayjs(taskEnd).isAfter(dayjs(parentEnd), 'minute')) {
      throw new BadRequestException(`Hạn xử lý công việc không được sau ngày kết thúc ${context}`);
    }
  }

  private async validateProjectTaskRules(
    dto: CreateTaskDto,
    userId: string,
    isChildTask: boolean,
  ): Promise<void> {
    const projectId = dto.projectId ? Number(dto.projectId) : null;
    if (!projectId && isChildTask && dto.parent) {
      const parentTask = await this.dataSource.query(
        `SELECT TOP 1 project_id FROM task WHERE id = @0 AND status = 1`,
        [dto.parent],
      );
      if (parentTask && parentTask.length > 0) {
        dto.projectId = parentTask[0].project_id;
      }
    }

    const finalProjectId = dto.projectId ? Number(dto.projectId) : null;
    if (!finalProjectId) {
      throw new BadRequestException('Không tìm thấy projectId hợp lệ cho công việc dự án.');
    }

    // 1. Lấy thông tin vai trò của các thành viên trong dự án
    const projectMembers = await this.dataSource.query(
      `SELECT user_id, role FROM project_members WHERE project_id = @0`,
      [finalProjectId],
    );

    const projectMemberMap = new Map<string, string>(); // userId -> role
    projectMembers.forEach((m: any) => {
      projectMemberMap.set(String(m.user_id).toLowerCase(), String(m.role).toLowerCase());
    });

    const isQLDA = projectMemberMap.get(userId.toLowerCase()) === 'manager';

    let isParentAssigner = false;
    let isParentDirector = false;
    let isParentSupporter = false;

    // 2. Kiểm tra quyền tạo
    if (!isChildTask) {
      // Công việc cha: Chỉ QLDA được tạo
      if (!isQLDA) {
        throw new ForbiddenException('Chỉ quản lý dự án (QLDA) mới có quyền tạo công việc cha.');
      }
    } else {
      // Công việc con: Người giao, Người chủ trì, Người phối hợp của công việc cha được tạo
      if (!dto.parent) {
        throw new BadRequestException('Công việc con bắt buộc phải có thông tin công việc cha (parent).');
      }

      // Truy vấn vai trò của người dùng trong công việc cha
      const parentTaskUsers = await this.dataSource.query(
        `SELECT role FROM task_users WHERE task_id = @0 AND LOWER(process_id) = LOWER(@1)`,
        [dto.parent, userId],
      );

      parentTaskUsers.forEach((u: any) => {
        const role = String(u.role).toLowerCase();
        if (role === 'assigner') isParentAssigner = true;
        if (role === 'director') isParentDirector = true;
        if (role === 'supporter') isParentSupporter = true;
      });

      const hasRoleInParent = isParentAssigner || isParentDirector || isParentSupporter;

      if (!hasRoleInParent && !isQLDA) {
        throw new ForbiddenException(
          'Bạn không có quyền tạo công việc con (chỉ Người giao, Người chủ trì, Người phối hợp của công việc cha hoặc QLDA mới có quyền).'
        );
      }
    }

    // 3. Chuẩn bị danh sách ID để xác thực
    const assignerIds = (dto.assigners || [])
      .map((u: any) => (typeof u.processId === 'string' ? u.processId : u.processId?.id))
      .filter(Boolean)
      .map((id: string) => id.toLowerCase());

    const directorIds = (dto.directors || [])
      .map((u: any) => (typeof u.processId === 'string' ? u.processId : u.processId?.id))
      .filter(Boolean)
      .map((id: string) => id.toLowerCase());

    let supporterIds = (dto.supporters || [])
      .map((u: any) => (typeof u.processId === 'string' ? u.processId : u.processId?.id))
      .filter(Boolean)
      .map((id: string) => id.toLowerCase());

    const viewerIds = (dto.viewers || [])
      .map((u: any) => (typeof u.processId === 'string' ? u.processId : u.processId?.id))
      .filter(Boolean)
      .map((id: string) => id.toLowerCase());

    // 4. Áp dụng quy tắc Host = Assigner -> ẩn/bỏ phối hợp
    // Nếu chọn người chủ trì trùng với người giao
    const isHostEqualAssigner = directorIds.some((dId) => assignerIds.includes(dId));
    if (isHostEqualAssigner) {
      dto.supporters = [];
      supporterIds = [];
    }

    // 5. Xác thực Người chủ trì (directors)
    if (directorIds.length > 0) {
      if (!isChildTask) {
        // Công việc cha: Bản thân hoặc thành viên dự án
        for (const dId of directorIds) {
          const isSelf = dId === userId.toLowerCase();
          const isMember = projectMemberMap.has(dId);
          if (!isSelf && !isMember) {
            throw new BadRequestException('Người chủ trì công việc cha phải là bản thân hoặc thành viên trong dự án.');
          }
        }
      } else {
        // Công việc con
        if (isQLDA) {
          // Nếu QLDA tạo công việc con: Bản thân hoặc thành viên dự án
          for (const dId of directorIds) {
            const isSelf = dId === userId.toLowerCase();
            const isMember = projectMemberMap.has(dId);
            if (!isSelf && !isMember) {
              throw new BadRequestException('Người chủ trì công việc con (do QLDA tạo) phải là bản thân hoặc thành viên trong dự án.');
            }
          }
        } else {
          // Nếu thành viên dự án tạo công việc con
          if (isParentDirector || isParentSupporter) {
            // Là người chủ trì hoặc phối hợp của công việc cha: Chỉ được chọn bản thân
            for (const dId of directorIds) {
              const isSelf = dId === userId.toLowerCase();
              if (!isSelf) {
                throw new BadRequestException('Thành viên dự án là Người chủ trì hoặc Người phối hợp của công việc cha chỉ có thể chọn bản thân làm người chủ trì công việc con.');
              }
            }
          } else if (isParentAssigner) {
            // Là người giao của công việc cha: Có thể chọn bản thân hoặc thành viên khác trong dự án
            for (const dId of directorIds) {
              const isSelf = dId === userId.toLowerCase();
              const isMember = projectMemberMap.has(dId);
              if (!isSelf && !isMember) {
                throw new BadRequestException('Thành viên dự án là Người giao của công việc cha khi tạo công việc con phải chọn người chủ trì là bản thân hoặc thành viên trong dự án.');
              }
            }
          } else {
            // Trường hợp khác (an toàn)
            for (const dId of directorIds) {
              const isSelf = dId === userId.toLowerCase();
              if (!isSelf) {
                throw new BadRequestException('Bạn chỉ có thể chọn bản thân làm người chủ trì công việc con.');
              }
            }
          }
        }
      }
    }

    // 6. Xác thực Người phối hợp (supporters)
    if (supporterIds.length > 0) {
      for (const sId of supporterIds) {
        // Phải là thành viên dự án
        if (!projectMemberMap.has(sId)) {
          throw new BadRequestException('Người phối hợp phải là thành viên trong dự án.');
        }
        // Phải ẩn/loại trừ người đã chọn ở người giao + người chủ trì
        if (assignerIds.includes(sId)) {
          throw new BadRequestException('Người phối hợp không được trùng với người giao.');
        }
        if (directorIds.includes(sId)) {
          throw new BadRequestException('Người phối hợp không được trùng với người chủ trì.');
        }
      }
    }

    // 7. Xác thực Người xem (viewers)
    if (viewerIds.length > 0) {
      for (const vId of viewerIds) {
        // Phải là thành viên dự án hoặc người xem dự án
        const role = projectMemberMap.get(vId);
        if (!role || !['manager', 'member', 'viewer'].includes(role)) {
          throw new BadRequestException('Người xem phải là thành viên hoặc người xem của dự án.');
        }
        // Phải ẩn/loại trừ những người đã chọn ở các vai trò khác (giao, chủ trì, phối hợp)
        if (assignerIds.includes(vId)) {
          throw new BadRequestException('Người xem không được trùng với người giao.');
        }
        if (directorIds.includes(vId)) {
          throw new BadRequestException('Người xem không được trùng với người chủ trì.');
        }
        if (supporterIds.includes(vId)) {
          throw new BadRequestException('Người xem không được trùng với người phối hợp.');
        }
      }
    }
  }

  private async createGeneralTaskForProject(
    qr: QueryRunner,
    dto: CreateTaskDto,
    userId: string,
    recurringFromId: number | null = null,
  ): Promise<TaskEntity> {
    const { id, ...taskData } = dto as any;

    // Lấy mã đơn vị từ user
    const user: any = await this.sqlsvRepo.getUserById(userId);
    const unitCode = user?.codeND || 'UNIT';
    const typeCode = this.getTaskTypeCode(dto.typeTask || TASK_TYPE.PROJECT);
    const code = taskData.code || await this.generateTaskCode(typeCode, unitCode);

    const task = qr.manager.create(TaskEntity, {
      ...taskData,
      typeTask: TASK_TYPE.PROJECT,
      recurringFromId,
      code,
      createdById: userId,
      updatedById: userId,
      status: 1,
    });

    const saved = await qr.manager.save(task);
    await this.createTaskUsers(qr, saved.id, dto);

    return saved;
  }

  async createTaskforProject(
    dto: CreateTaskDto,
    userId: string,
    qr_ext?: QueryRunner,
    bypassValidateRules = false,
    bypassTaskDateBounds = false,
  ): Promise<TaskEntity> {
    // VALIDATE INPUT
    this.validateCreateInput(dto);

    // Validate project task rules (Only QLDA, host/supporter/viewer constraints)
    if (!bypassValidateRules) {
      await this.validateProjectTaskRules(dto, userId, false);
    }

    if (!dto.projectId) {
      throw new BadRequestException('Thiếu projectId');
    }

    const projectCheck = await this.dataSource.getRepository(ProjectEntity).findOne({
      where: { id: Number(dto.projectId), status: 1 },
      select: ['projectStatus']
    });
    if (projectCheck) {
      if (projectCheck.projectStatus === 3 || projectCheck.projectStatus === 4) {
        throw new BadRequestException('Dự án đã Hoàn thành hoặc Hủy, không thể tạo công việc.');
      }
      if (projectCheck.projectStatus === 5) {
        throw new BadRequestException('Dự án đang Tạm dừng, không thể tạo công việc.');
      }
    }

    // if (dto.parent) {
    //   throw new BadRequestException('Vui lòng gọi endpoint child-from-project để tạo công việc con');
    // } 

    let projectForBounds: { startDate: any; endDate: any } | null = null;
    if (qr_ext) {
      const txProjectRows = await qr_ext.manager.query(
        `SELECT TOP 1 startDate, endDate FROM projects WHERE id = @0 AND status = 1`,
        [Number(dto.projectId)],
      );
      const txProject = txProjectRows?.[0];
      if (!txProject) {
        throw new NotFoundException(`Không tìm thấy dự án với ID ${dto.projectId}`);
      }
      projectForBounds = {
        startDate: txProject.startDate,
        endDate: txProject.endDate,
      };
    } else {
      const project = await this.projectService.findOne(Number(dto.projectId), userId);
      if (project) {
        projectForBounds = {
          startDate: project.startDate,
          endDate: project.endDate,
        };
      }
    }
    if (projectForBounds && !bypassTaskDateBounds) {
      this.validateTaskDateBounds(
        dto.startDate,
        dto.endDate,
        projectForBounds.startDate,
        projectForBounds.endDate,
        'dự án',
      );
    }
    // XÁC ĐỊNH DOCTYPE TỪ LUỒNG BPMN
    // const { docType, routingKey } = await this.determineDocTypeFromBpmn(userId, dto.bpmnId, dto);
    const docType = 'TaskProject';
    // VALIDATE BPMN + QUYỀN
    const { bpmnXML, flowId } = await this.validateBpmnAndPermission(userId, docType);

    // TÌM WORK ITEM CỦA DỰ ÁN (nếu có parent là project)
    let parentNodeId: string | undefined = undefined;
    let nextNode: any = undefined;
    if (dto.projectId) {
      const projectWorkItems = await this.dataSource.query(
        `SELECT TOP 1 node_id FROM work_items WHERE document_id = @0 AND bpmn_version = @1 ORDER BY id DESC`,
        [String(dto.projectId), docType],
      );
      if (projectWorkItems && projectWorkItems.length > 0) {
        parentNodeId = projectWorkItems[0].node_id;

        // Tìm next node từ parent node
        if (bpmnXML && parentNodeId) {
          const { indexes } = await this.getModelFromXml(bpmnXML);
          const parentNode = (indexes.nodes as Map<string, any>).get(parentNodeId!);

          if (parentNode && parentNode.outgoing && parentNode.outgoing.length > 0) {
            // Tìm flow GIAO_VIEC từ parent node
            const giaoViecFlow = parentNode.outgoing.find((f: any) => f.name === 'TAO_VIEC');
            if (giaoViecFlow) {
              const res = this.bpmnEngine.nextInteractiveFromFlow(giaoViecFlow, indexes);
              nextNode = res.node;
            }
          }
        }

        // Gán parentNodeId vào dto để createDocumentAtNode có thể sử dụng
        (dto as any).parentNodeId = nextNode?.id;
      }
    }

    // BẮT ĐẦU TRANSACTION (hoặc dùng transaction hiện có)
    const queryRunner = qr_ext || this.dataSource.createQueryRunner();
    if (!qr_ext) {
      await queryRunner.connect();
      await queryRunner.startTransaction();
    }

    try {
      // TẠO TASK GENERAL
      const task = await this.createGeneralTaskForProject(queryRunner, { ...dto }, userId);

      // TẠO CÔNG VIỆC TỪ QUY TRÌNH MẪU (NẾU CÓ)
      if (dto.templateId && this.isUuid(dto.templateId)) {
        dto.typeTask = 'project';
        await this.createTasksFromTemplate(queryRunner, dto.templateId, task.id, userId, bpmnXML, flowId, docType, '', dto.bpmnId || '', dto);
      }

      // TẠO BPMN WORKITEM + AUDIT
      // Nếu có parentNodeId, createDocumentAtNode sẽ navigate từ node đó qua GIAO_VIEC và GIAO_CHU_TRI
      await this.createBpmnWorkItemsAndAuditForProject(queryRunner, task.id, dto, bpmnXML, flowId, docType, userId);

      // XỬ LÝ PATH VÀ RECURRING TASK
      const recurringConfigId = await this.handlePathAndRecurringTask(queryRunner, task.id, dto, userId);

      if (!qr_ext) {
        await queryRunner.commitTransaction();

        // TẠO SYSTEM LOG (chỉ khi tự quản lý transaction)
        //nếu có cv cha thì lưu log vào cv cha nếu là công việc gốc thuộc dự án thì lưu vào log dự án
        await this.createTaskSystemLogs(task.id, dto.parent?.toString() || dto.projectId?.toString(), userId);

        // CẬP NHẬT TRẠNG THÁI DỰ ÁN
        await this.projectService.checkAndUpdateProjectStatus(Number(dto.projectId));
        await this.projectService.calculateAndUpdateProjectProgress(Number(dto.projectId));

        return this.findOne(task.id);
      }

      // Khi dùng transaction ngoài (qr_ext), trả về task trực tiếp
      // Các bước system log + status update sẽ do caller xử lý sau khi commit
      return task;
    } catch (e) {
      if (!qr_ext) await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      if (!qr_ext) await queryRunner.release();
    }
  }

  /**
   * Tạo công việc con trong công việc cha từ dự án
   * Sử dụng parent để tìm work item của công việc cha
   */
  async createChildForProject(dto: CreateTaskDto, userId: string): Promise<TaskEntity> {
    // VALIDATE INPUT
    this.validateCreateInput(dto);

    // Validate project task rules (Parent task roles, host/supporter/viewer constraints)
    await this.validateProjectTaskRules(dto, userId, true);

    let finalProjId = dto.projectId;
    if (!finalProjId && dto.parent) {
      const parentTask = await this.taskRepository.findOne({ where: { id: dto.parent }, select: ['projectId'] });
      finalProjId = parentTask?.projectId;
    }

    if (finalProjId) {
      const projectCheck = await this.dataSource.getRepository(ProjectEntity).findOne({
        where: { id: Number(finalProjId), status: 1 },
        select: ['projectStatus']
      });
      if (projectCheck) {
        if (projectCheck.projectStatus === 3 || projectCheck.projectStatus === 4) {
          throw new BadRequestException('Dự án đã Hoàn thành hoặc Hủy, không thể tạo công việc con.');
        }
        if (projectCheck.projectStatus === 5) {
          throw new BadRequestException('Dự án đang Tạm dừng, không thể tạo công việc con.');
        }
      }
    }

    if (dto.parent) {
      const parentTask = await this.taskRepository.findOne({ where: { id: dto.parent } });
      if (parentTask) {
        this.validateTaskDateBounds(dto.startDate, dto.endDate, parentTask.startDate, parentTask.endDate, 'công việc cha');
      }
    }

    const docType = 'TaskProject';
    // const { docType, routingKey } = await this.determineDocTypeFromBpmn(userId, dto.bpmnId, dto);
    // VALIDATE BPMN + QUYỀN
    const { bpmnXML, flowId } = await this.validateBpmnAndPermission(userId, docType);

    // TÌM WORK ITEM CỦA CÔNG VIỆC CHA (nếu có parent)
    let parentNodeId: string | undefined = undefined;
    let nextNode: any = undefined;

    if (dto.parent) {
      const parentWorkItems = await this.dataSource.query(
        `SELECT TOP 1 node_id FROM work_items WHERE document_id = @0 AND bpmn_version = @1 ORDER BY id DESC`,
        [String(dto.parent), flowId],
      );

      if (parentWorkItems && parentWorkItems.length > 0) {
        parentNodeId = parentWorkItems[0].node_id;

        // Tìm next node từ parent node
        if (bpmnXML && parentNodeId) {
          const { indexes } = await this.getModelFromXml(bpmnXML);
          const parentNode = (indexes.nodes as Map<string, any>).get(parentNodeId!);

          if (parentNode && parentNode.outgoing && parentNode.outgoing.length > 0) {
            // Tìm flow TAO_VIEC từ parent node
            const taoViecFlow = parentNode.outgoing.find((f: any) => f.name === 'TAO_VIEC');
            if (taoViecFlow) {
              const res = this.bpmnEngine.nextInteractiveFromFlow(taoViecFlow, indexes);
              nextNode = res.node;
            }
          }
        }

        // Gán parentNodeId vào dto để createDocumentAtNode có thể sử dụng
        (dto as any).parentNodeId = nextNode?.id;
      }
    }
    // BẮT ĐẦU TRANSACTION
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // TẠO TASK
      const task = await this.createGeneralTaskForProject(queryRunner, { ...dto }, userId);

      // TẠO BPMN WORKITEM + AUDIT
      await this.createBpmnWorkItemsAndAuditForProject(queryRunner, task.id, dto, bpmnXML, flowId, docType);

      // XỬ LÝ PATH VÀ RECURRING TASK
      const recurringConfigId = await this.handlePathAndRecurringTask(queryRunner, task.id, dto, userId);

      await queryRunner.commitTransaction();

      // TẠO SYSTEM LOG
      await this.createTaskSystemLogs(task.id, dto.parent?.toString(), userId);

      // CẬP NHẬT TRẠNG THÁI DỰ ÁN
      let finalProjectId = dto.projectId;
      if (!finalProjectId && dto.parent) {
        const parentTask = await queryRunner.manager.findOne(TaskEntity, { where: { id: dto.parent }, select: ['projectId'] });
        finalProjectId = parentTask?.projectId;
        if (finalProjectId) {
          await queryRunner.manager.update(TaskEntity, { id: task.id }, { projectId: finalProjectId });
        }
      }

      if (finalProjectId) {
        await this.projectService.checkAndUpdateProjectStatus(Number(finalProjectId));
        await this.projectService.calculateAndUpdateProjectProgress(Number(finalProjectId));
      }

      return this.findOne(task.id);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async exportDynamic(queryParams: ListTaskDto & { exportType?: string; processFn?: string }, userId: string) {
    const { mappedData, excelColumns, nameOfList } = await this.buildExcelDynamic(queryParams, userId);
    const exportType = (queryParams.exportType || 'excel').toLowerCase();
    const processFn = queryParams.processFn || 'quanlycv';

    return this.documentsService.export(
      mappedData,
      processFn,
      exportType === 'pdf' ? 'pdf' : 'excel',
      userId,
      { columns: excelColumns, nameOfList }
    );
  }

  async findAllRecurringConfigs(query: ListTaskDto, userId: string) {
    const { data, total, page, limit, totalPages } = await this.recurringConfigRepo.findAll(userId, query);

    // Filter and total are already handled in Repo
    // Here we just ensure any extra mapping needed by UI is present
    const mappedData = data.map((config: any) => {
      // statusText mapping if not already in HTML (though Repo returns HTML in .status)
      // If UI expects statusText separately:
      if (!config.statusText) {
        // config.status might be HTML now, so we need to know the original status
        // Repo currently overwrites .status with statusHtml
        // Let's assume the UI can handle the HTML in .status or we add statusText back
        // Looking at previous code, it used config.status (number)
        // Since Repo replaced .status with HTML, we might need the original number
        // but Repo's mappedData are NEW objects.

        // Let's check how Repo was modified.
        // It does: let newConfig: any = { ...config, ... }; newConfig.status = statusHtml;
        // So config.status (number) is lost in newConfig.
      }

      // If Repo already returned mappedData with flags and HTML status, we are good.
      // But we might want to ensure 'statusText' is there for some parts of UI.
      return config;
    });

    return {
      data: mappedData,
      total,
      page,
      limit,
      totalPages,
    };
  }

  private calculateNextExecutionDate(config: TaskRecurringConfigEntity): Date | null {
    const today = dayjs().startOf('day');
    let current = today;

    // Nếu hôm nay đã chạy rồi (lastExecutedAt == today) thì bắt đầu tìm từ ngày mai
    if (config.lastExecutedAt && dayjs(config.lastExecutedAt).isSame(today, 'day')) {
      current = current.add(1, 'day');
    }
    // Giới hạn tìm kiếm trong 2 năm (730 ngày) để tránh vô hạn loop
    for (let i = 0; i < 730; i++) {
      if (this.isRecurringConfigDue(config, current)) {
        return current.toDate();
      }
      current = current.add(1, 'day');
    }

    return null;
  }

  /**
   * 🎯 Kiểm tra xem task có đến hạn không
   */
  private isRecurringConfigDue(config: TaskRecurringConfigEntity, checkDate: dayjs.Dayjs): boolean {
    const { repetitiveTask, daysOfWeek, monthInQuarter, executionType, dayOfMonth, relativeWeek, relativeDay } = config;

    // Chuẩn hóa repetitiveTask
    const type = this.normalizeRecurringType(repetitiveTask || '');

    // 2. Kiểm tra tần suất
    if (['daily', 'hang ngay', 'hàng ngày', 'ngay', 'ngày'].includes(type)) {
      return true;
    }

    if (['weekly', 'tuan', 'tuần', 'theo tuần', 'hang tuan', 'hàng tuần'].includes(type)) {
      if (!daysOfWeek) return false;
      const selectedDays = daysOfWeek.split(',').map((d) => parseInt(d.trim()));
      // Current system seems to implementation: 2=Mon, 3=Tue, ..., 7=Sat, 8=Sun (or CN=8) based on user feedback/context.
      // dayjs.day(): 0 (Sun) - 6 (Sat).
      // Map dayjs to 2-8 format:
      // 0 (Sun) -> 8
      // 1 (Mon) -> 2
      // 2 (Tue) -> 3
      // ...
      // 6 (Sat) -> 7
      const currentDay = checkDate.day() === 0 ? 8 : checkDate.day() + 1;
      return selectedDays.includes(currentDay);
    }

    if (['monthly', 'thang', 'tháng', 'theo tháng', 'hang thang', 'hàng tháng'].includes(type)) {
      return this.isDayOfMonthMatch(config, checkDate);
    }

    if (['quarterly', 'quy', 'quý', 'theo quý', 'hang quy', 'hàng quý'].includes(type)) {
      // Tháng trong quý: 1, 2, 3.
      // checkDate.month() -> 0..11.
      // (checkDate.month() % 3) + 1 -> 1..3
      // Logic này giả sử mọi quý bắt đầu từ tháng 1 (Jan). 
      // Jan (0) -> 1, Feb (1) -> 2, Mar (2) -> 3. Apr (3) -> 1...

      // Nếu user muốn specific monthInQuarter check:
      if (monthInQuarter) {
        const currentMonthInQuarter = (checkDate.month() % 3) + 1;
        if (currentMonthInQuarter !== monthInQuarter) return false;
      }
      return this.isDayOfMonthMatch(config, checkDate);
    }



    return false;
  }

  private normalizeRecurringType(value: string): string {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private isDayOfMonthMatch(config: TaskRecurringConfigEntity, date: dayjs.Dayjs): boolean {
    const { executionType, dayOfMonth, relativeWeek, relativeDay } = config;

    if (executionType === 'specific_day') {
      return date.date() === (dayOfMonth || 1);
    }

    if (executionType === 'last_day') {
      return date.date() === date.daysInMonth();
    }

    if (executionType === 'relative_day') {
      if (relativeDay === undefined || !relativeWeek) return false;

      // Tìm ngày thứ n trong tháng
      // relativeDay: 2 (T2)... 8 (CN)? 
      // Map to dayjs (0-6)
      let targetDayjsIndex = relativeDay - 1;
      if (relativeDay === 8) targetDayjsIndex = 0;

      // Assuming 1 is not used or handled above.

      const startOfMonth = date.startOf('month');
      let targetDate: dayjs.Dayjs;

      if (relativeWeek === 'last') {
        const endOfMonth = date.endOf('month');
        // Find last occurrence of targetDayjsIndex
        // (end.day() - target + 7) % 7 is diff to subtract
        targetDate = endOfMonth.subtract((endOfMonth.day() - targetDayjsIndex + 7) % 7, 'day');
      } else {
        // First occurrence
        const firstOccurrence = startOfMonth.add((targetDayjsIndex - startOfMonth.day() + 7) % 7, 'day');
        const weeksToAdd = { first: 0, 1: 0, second: 1, 2: 1, third: 2, 3: 2, fourth: 3, 4: 3 }[relativeWeek] || 0;
        targetDate = firstOccurrence.add(weeksToAdd, 'week');
      }

      return date.isSame(targetDate, 'day');
    }

    return false;
  }

  async findRecurringConfig(id: number): Promise<TaskRecurringConfigEntity> {
    const config = await this.recurringConfigRepo.findOne({
      where: { id },
      relations: ['createdBy', 'updatedBy'],
    });
    if (!config) throw new NotFoundException('Không tìm thấy cấu hình công việc lặp lại');

    const newConfig = { ...config } as any;

    // Map statusText
    // Map status colors and labels
    let statusLabel = 'Không xác định';
    let bgColor = '#E0E0E0';
    let borderColor = '#AEB5BE';
    let textColor = '#555555';

    switch (newConfig.status) {
      case 0: // Kết thúc
        statusLabel = 'Kết thúc';
        bgColor = '#FFDCD9';
        borderColor = '#F44336';
        textColor = '#c73535ff';
        break;
      case 1: // Hoạt động
        statusLabel = 'Hoạt động';
        bgColor = '#D0FFDE';
        borderColor = '#ADECC0';
        textColor = '#007D3E';
        break;
      case 2: // Tạm dừng
        statusLabel = 'Tạm dừng';
        bgColor = '#FEF9C2';
        borderColor = '#AEB5BE';
        textColor = '#FFA600';
        break;
    }

    newConfig.statusText = `<div style="display: flex; align-items: center; justify-content: center; width: 142px; height: 24px; background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 22px; color: ${textColor}; font-size: 0.75rem; font-weight: 700; text-transform: none; box-sizing: border-box;">${statusLabel}</div>`;

    // Unpack taskData
    if (newConfig.taskData) {
      try {
        const taskData = JSON.parse(newConfig.taskData);

        // delete taskData.id;
        // delete taskData.status;
        // delete taskData.code;
        // delete taskData.createdById;
        // delete taskData.updatedById;
        // delete taskData.createdAt;
        // delete taskData.updatedAt;

        // Object.assign(newConfig, taskData);

        // Map specific fields from taskData (participants) to newConfig
        if (taskData.assigners && Array.isArray(taskData.assigners)) {
          newConfig.assigners = taskData.assigners;
        }
        if (taskData.directors && Array.isArray(taskData.directors)) {
          newConfig.directors = taskData.directors;
        }
        if (taskData.supporters && Array.isArray(taskData.supporters)) {
          newConfig.supporters = taskData.supporters;
        }
        if (taskData.viewers && Array.isArray(taskData.viewers)) {
          newConfig.viewers = taskData.viewers;
        }

        // Collect all processIds to fetch names
        const userIds: string[] = [];
        const orgIds: string[] = [];

        const collectIds = (list: any[]) => {
          if (Array.isArray(list)) {
            list.forEach((u) => {
              if (u.processId) {
                if (u.type === 2) {
                  orgIds.push(u.processId);
                } else {
                  userIds.push(u.processId);
                }
              }
            });
          }
        };

        collectIds(taskData.assigners);
        collectIds(taskData.directors);
        collectIds(taskData.supporters);
        collectIds(taskData.viewers);

        const userMap: Record<string, string> = {};
        const orgMap: Record<string, string> = {};

        if (userIds.length > 0) {
          const users = await this.dataSource.getRepository(UserEntity).find({
            where: { id: In(userIds) },
            select: ['id', 'name'],
          });
          users.forEach((u) => (userMap[u.id] = u.name));
        }

        if (orgIds.length > 0) {
          const orgs = await this.dataSource.getRepository(OrganizationUnitEntity).find({
            where: { id: In(orgIds) },
            select: ['id', 'name'],
          });
          orgs.forEach((o) => (orgMap[o.id] = o.name));
        }

        const updateProcessName = (list: any[]) => {
          if (Array.isArray(list)) {
            list.forEach((u) => {
              if (u.processId && !u.name) {
                if (u.type === 2) {
                  u.name = orgMap[u.processId];
                } else {
                  u.name = userMap[u.processId];
                }
              }
            });
          }
        };

        updateProcessName(taskData.assigners);
        updateProcessName(taskData.directors);
        updateProcessName(taskData.supporters);
        updateProcessName(taskData.viewers);

        // const getName = (u: any) => u.name || '';

        // if (taskData.assigners && Array.isArray(taskData.assigners)) {
        //   newConfig.assigner = taskData.assigners.map(getName).join(', ');
        // }
        // if (taskData.directors && Array.isArray(taskData.directors)) {
        //   newConfig.director = taskData.directors.map(getName).join(', ');
        // }
        // if (taskData.supporters && Array.isArray(taskData.supporters)) {
        //   newConfig.supporter = taskData.supporters.map(getName).join(', ');
        // }
        // if (taskData.viewers && Array.isArray(taskData.viewers)) {
        //   newConfig.viewer = taskData.viewers.map(getName).join(', ');
        // }

        const getName = (u: any) => {
          if (u.type === 2) return orgMap[u.processId] || u.processName || u.processId;
          return userMap[u.processId] || u.processName || u.processId;
        };

        // Map participants to single string fields (comma separated names)
        if (taskData.assigners && Array.isArray(taskData.assigners)) {
          newConfig.assigner = taskData.assigners.map(getName).join(', ');
        }
        if (taskData.directors && Array.isArray(taskData.directors)) {
          newConfig.director = taskData.directors.map(getName).join(', ');
        }
        if (taskData.supporters && Array.isArray(taskData.supporters)) {
          newConfig.supporter = taskData.supporters.map(getName).join(', ');
        }
        if (taskData.viewers && Array.isArray(taskData.viewers)) {
          newConfig.viewer = taskData.viewers.map(getName).join(', ');
        }
      } catch (e) {
        console.error('Error parsing taskData for recurring config:', e);
      }
    }
    if (newConfig.createdBy) {
      newConfig.createdBy = newConfig.createdBy.name;
    }
    if (newConfig.updatedBy) {
      newConfig.updatedBy = newConfig.updatedBy.name;
    }
    delete newConfig.startDate;
    delete newConfig.endDate;

    // =========================
    // Template info
    // =========================
    let templateIdFromData = null;
    if (config.taskData) {
      try {
        const parsed = JSON.parse(config.taskData);
        templateIdFromData = parsed.templateId;
      } catch (e) { }
    }
    const templateId = config.templateId || templateIdFromData;
    newConfig.templateId = templateId || null;
    newConfig.templateName = null;

    if (templateId) {
      const template = await this.processTemplateRepo.findOne({
        where: { id: templateId },
        select: ['name'],
      });
      newConfig.templateName = template?.name ?? null;
    }

    return newConfig;
    // }
  }

  // Map createdBy / updatedBy to name only

  async findRecurringInstances(userId: string): Promise<any> {
    return this.taskRepo.find({
      where: {
        createdById: userId,
      },
      order: { id: 'DESC' },
      // relations: ['createdBy', 'updatedBy'],
    });
  }

  /**
   * Cập nhật cấu hình công việc lặp lại
   */
  async updateRecurringConfig(id: number, dto: UpdateTaskDto, userId: string) {
    this.validateUpdateInputRecurring(dto);
    const config = await this.recurringConfigRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('Không tìm thấy cấu hình lặp lại');

    // Parse taskData cũ để update các trường trong đó
    const taskData = JSON.parse(config.taskData || '{}');
    const newTaskData = { ...taskData, ...dto };

    // Cập nhật các trường chính của config
    if (dto.name) config.name = dto.name;

    // Cập nhật trạng thái (0: Paused, 1: Active, 2: Finished)
    if (dto.status !== undefined && [0, 1, 2].includes(dto.status)) {
      config.status = dto.status;
      // Nếu trạng thái là Kết thúc (2), cập nhật ngày kết thúc về hiện tại
      if (config.status === TaskRecurringStatus.FINISHED) {
        config.endDate = new Date();
      }
    }

    if (dto.repetitiveTask !== undefined) config.repetitiveTask = dto.repetitiveTask;
    if (dto.executionType !== undefined) config.executionType = dto.executionType;
    if (dto.startTime !== undefined) config.startTime = dto.startTime;
    if (dto.durationDays !== undefined) config.durationDays = dto.durationDays;
    if (dto.topic !== undefined) config.topic = dto.topic;
    if (dto.note !== undefined) config.note = dto.note;
    if (dto.priority !== undefined) config.priority = dto.priority;
    if (dto.reminderTime !== undefined) config.reminderTime = dto.reminderTime;
    if (dto.isApprovalRequired !== undefined) config.isApprovalRequired = dto.isApprovalRequired;
    // Cập nhật logic lặp lại chi tiết
    if (dto.month) {
      const parsedArray = dto.month.split(',').map(m => parseInt(m.trim())).filter(m => !isNaN(m));
      if (parsedArray.length > 0) config.monthInQuarter = parsedArray[0];
    }
    if (dto.monthInQuarter !== undefined) config.monthInQuarter = dto.monthInQuarter;

    if (dto.dayOfMonth !== undefined) config.dayOfMonth = dto.dayOfMonth;

    if (dto.daysOfWeek !== undefined) config.daysOfWeek = dto.daysOfWeek;
    if (dto.relativeWeek !== undefined) config.relativeWeek = dto.relativeWeek;
    if (dto.relativeDay !== undefined) config.relativeDay = dto.relativeDay;

    // if ((config.repetitiveTask || 'tuan').toLowerCase() === 'thang' || (config.repetitiveTask || 'tuan').toLowerCase() === 'monthly') {
    //   if (rEnd.diff(rStart, 'day') < 31) {
    //     throw new BadRequestException('Đối với lặp hàng tháng, ngày kết thúc phải sau ngày bắt đầu ít nhất 31 ngày');
    //   }
    // }

    // // Validate Quarterly Recurrence Duration
    // if (rTaskType === 'quy' || rTaskType === 'quarterly') {
    //   if (rEnd.diff(rStart, 'day') < 90) {
    //     throw new BadRequestException('Đối với lặp hàng quý, ngày kết thúc phải sau ngày bắt đầu ít nhất 90 ngày');
    //   }
    // }

    // Cập nhật thông tin tạm dừng
    if (dto.pauseReason !== undefined) config.pauseReason = dto.pauseReason;
    if (dto.pauseStartDate !== undefined) config.pauseStartDate = dto.pauseStartDate ? new Date(dto.pauseStartDate) : null;
    if (dto.pauseEndDate !== undefined) config.pauseEndDate = dto.pauseEndDate ? new Date(dto.pauseEndDate) : null;
    if (dto.pauseIndefinitely !== undefined) config.pauseIndefinitely = dto.pauseIndefinitely;

    // VALIDATE PAUSE DATES
    // if (config.pauseStartDate) {
    //   if (config.startDate && config.pauseStartDate < config.startDate) {
    //     throw new BadRequestException('Ngày bắt đầu tạm dừng không được nhỏ hơn ngày bắt đầu công việc lặp lại');
    //   }
    //   if (config.endDate && config.pauseStartDate > config.endDate) {
    //     throw new BadRequestException('Ngày bắt đầu tạm dừng không được lớn hơn ngày kết thúc công việc lặp lại');
    //   }
    // }

    // if (config.pauseEndDate) {
    //   if (config.startDate && config.pauseEndDate < config.startDate) {
    //     throw new BadRequestException('Ngày kết thúc tạm dừng không được nhỏ hơn ngày bắt đầu công việc lặp lại');
    //   }
    //   if (config.endDate && config.pauseEndDate > config.endDate) {
    //     throw new BadRequestException('Ngày kết thúc tạm dừng không được lớn hơn ngày kết thúc công việc lặp lại');
    //   }
    //   if (config.pauseStartDate && config.pauseEndDate < config.pauseStartDate) {
    //     throw new BadRequestException('Ngày kết thúc tạm dừng không được nhỏ hơn ngày bắt đầu tạm dừng');
    //   }
    // }

    // Cập nhật metadata
    config.taskData = JSON.stringify(newTaskData);
    config.updatedById = userId;

    return this.recurringConfigRepo.save(config);
  }

  async removeRecurringConfig(id: number, userId: string) {
    const config = await this.recurringConfigRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('Không tìm thấy cấu hình lặp lại');

    config.status = 3; // soft delete
    config.updatedById = userId;

    return this.recurringConfigRepo.save(config);
  }

  async removeManyRecurringConfigs(ids: number[], userId: string) {
    if (!ids || ids.length === 0) return;

    // Lấy tất cả các config cần xóa
    const configs = await this.recurringConfigRepo.find({
      where: { id: In(ids) },
    });

    if (configs.length === 0) {
      throw new NotFoundException('Không tìm thấy cấu hình lặp lại nào');
    }

    const cannotDeleteIds: number[] = [];
    const canDeleteIds: number[] = [];
    const reasons: string[] = [];

    for (const config of configs) {
      let canDelete = false;
      let reason = '';

      // Chỉ kiểm tra theo dữ liệu giao việc, không phụ thuộc ngày bắt đầu/kết thúc vòng lặp
      if (config.taskData) {
        try {
          const taskData = JSON.parse(config.taskData);
          const hasDirectors = taskData.directors && Array.isArray(taskData.directors) && taskData.directors.length > 0;

          if (!hasDirectors) {
            canDelete = true;
          } else {
            reason = `Cấu hình "${config.name}" đã được gán người chủ trì và đã bắt đầu vòng lặp`;
          }
        } catch (e) {
          // Nếu không parse được taskData, coi như chưa có người chủ trì
          canDelete = true;
        }
      }

      if (canDelete) {
        canDeleteIds.push(config.id);
      } else {
        cannotDeleteIds.push(config.id);
        if (reason) reasons.push(reason);
      }
    }

    // Nếu có config không thể xóa, throw error
    if (cannotDeleteIds.length > 0) {
      const errorMessage = reasons.length > 0
        ? reasons.join('; ')
        : `Không thể xóa ${cannotDeleteIds.length} cấu hình đã được gán người chủ trì và đã bắt đầu vòng lặp`;

      throw new BadRequestException({
        message: errorMessage,
        cannotDeleteIds,
        canDeleteIds,
      });
    }

    // Xóa các config được phép xóa
    if (canDeleteIds.length > 0) {
      await this.recurringConfigRepo.createQueryBuilder()
        .update()
        .set({ status: 3, updatedById: userId })
        .where('id IN (:...ids)', { ids: canDeleteIds })
        .execute();
    }

    return {
      success: true,
      deletedCount: canDeleteIds.length,
      message: `Đã xóa ${canDeleteIds.length} cấu hình lặp lại`,
    };
  }

  private findGctGphNodes(sourceNode: any, indexes: any) {
    let directorTargetNode: any = null;
    let supporterTargetNode: any = null;

    if (sourceNode?.outgoing) {
      const gctFlow = sourceNode.outgoing.find(
        (fl: any) => fl.name === 'GIAO_CHU_TRI',
      );
      if (gctFlow) {
        const resGct = this.bpmnEngine.nextInteractiveFromFlow(gctFlow, indexes);
        directorTargetNode = resGct.node;
      }

      const gphFlow = sourceNode.outgoing.find(
        (fl: any) => fl.name === 'GIAO_PHOI_HOP',
      );
      if (gphFlow) {
        const resGph = this.bpmnEngine.nextInteractiveFromFlow(gphFlow, indexes);
        supporterTargetNode = resGph.node;
      }
    }

    return { directorTargetNode, supporterTargetNode };
  }
  // =====================================================
  // LẤY DANH SÁCH CÔNG VIỆC CON TRỰC TIẾP THEO PARENT ID
  // (Dùng cho lazy-load tree: mỗi lần mở 1 cấp)
  // =====================================================
  async getChildrenByParentId(
    parentId: number,
    userId: string,
    queryParams?: { page?: number; limit?: number; name?: string; isSortStart?: string | boolean; filter?: any },
  ): Promise<any> {
    const pageNum = Number(queryParams?.page) || 1;
    const limitNum = Number(queryParams?.limit) || 100;

    // Fetch parent task to get its name, dates and projectId
    const parentTask = await this.taskRepository.findOne({
      where: { id: parentId },
      select: ['id', 'name', 'startDate', 'endDate', 'projectId'],
    });

    const parentStartDate = parentTask?.startDate;
    const parentEndDate = parentTask?.endDate;

    let projectStartDate: Date | null = null;
    let projectEndDate: Date | null = null;

    if (parentTask?.projectId) {
      const project = await this.dataSource.getRepository(ProjectEntity).findOne({
        where: { id: parentTask.projectId },
        select: ['id', 'startDate', 'endDate'],
      });
      if (project) {
        projectStartDate = project.startDate;
        projectEndDate = project.endDate;
      }
    }

    const qb = this.taskRepository
      .createQueryBuilder('task')
      .where('task.parent = :parentId', { parentId })
      .andWhere('task.status != 3') // loại bỏ bản ghi đã xóa mềm
      .leftJoinAndSelect('task.taskUsers', 'taskUsers')
      .leftJoinAndSelect('taskUsers.user', 'tuUser')
      .leftJoinAndSelect('tuUser.parent', 'tuParent')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .select([
        'task.id',
        'task.name',
        'task.code',
        'task.startDate',
        'task.endDate',
        'task.parent',
        'task.projectId',
        'task.processStatus',
        'task.progress',
        'task.priority',
        'task.typeTask',
        'task.status',
        'task.createdAt',
        'task.updatedAt',
        'task.path',
        'taskUsers.id',
        'taskUsers.role',
        'taskUsers.type',
        'taskUsers.processId',
        'taskUsers.processName',
        'tuUser.id',
        'tuUser.name',
        'tuParent.id',
        'tuParent.name',
        'createdBy.id',
        'createdBy.name',
        'createdBy.emailUser',
      ]);

    if (queryParams?.isSortStart === 'true' || queryParams?.isSortStart === true) {
      qb.addSelect('CASE WHEN task.startDate IS NULL THEN 1 ELSE 0 END', 'isStartDateNull')
        .orderBy('isStartDateNull', 'ASC')
        .addOrderBy('task.startDate', 'ASC')
        .addOrderBy('task.id', 'ASC');
    } else {
      qb.orderBy('task.id', 'ASC');
    }

    if (queryParams?.name) {
      qb.andWhere('task.name LIKE :name', { name: `%${queryParams.name}%` });
    }

    const filter = queryParams?.filter;
    if (filter) {
      const { myAssign, myJob, myDirector, mySupporter } = filter;
      const isMyAssign = myAssign === true || myAssign === 'true';
      const isMyDirector = myDirector === true || myDirector === 'true';
      const isMySupporter = mySupporter === true || mySupporter === 'true';

      if (userId && (isMyAssign || isMyDirector || isMySupporter)) {
        const roles: string[] = [];
        if (isMyAssign) roles.push('assigner');
        if (isMyDirector) roles.push('director');
        if (isMySupporter) roles.push('supporter');

        qb.andWhere(
          " EXISTS (SELECT 1 FROM task_users tu_myRoles WHERE tu_myRoles.task_id = task.id AND LOWER(tu_myRoles.process_id) = LOWER(:myRolesUserId) AND tu_myRoles.role IN (:...myRoles)) ",
          { myRolesUserId: userId, myRoles: roles }
        );
      }

      if (myJob === true || myJob === 'true') {
        qb.andWhere(
          " EXISTS (SELECT 1 FROM task_users tu_myjob WHERE tu_myjob.task_id = task.id AND LOWER(tu_myjob.process_id) = LOWER(:myJobUserId) AND tu_myjob.role IN ('director', 'supporter')) ",
          { myJobUserId: userId },
        );
      }
    }

    const [data, total] = await qb
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    const slowReasonMap = await this.fetchLatestSlowReasonMap(data.map((task) => task.id));
    data.forEach((task: any) => {
      task.slowReason = slowReasonMap.get(String(task.id)) || null;
    });

    const crmTitlesBatch = await this.mapCrmTitlesBatch(data);

    const dataMap = await Promise.all(
      data.map(async (task) => {
        const progressView = await buildProgressView(task);
        const mappedTask = await this.mapTask(task);
        const crmMappedValues = crmTitlesBatch[task.id] || {};
        const { assigner, director, supporter, viewer } = this.mapTaskUsers(task.taskUsers || []);

        const { formattedStartDate, formattedEndDate, startDateTooltip, endDateTooltip } =
          this.validateTaskDates(task, parentTask, projectStartDate, projectEndDate);

        const startDateStr = task.startDate ? moment(task.startDate).format('DD/MM/YYYY') : null;
        const endDateStr = task.endDate ? moment(task.endDate).format('DD/MM/YYYY') : null;

        return {
          ...mappedTask,
          assigner,
          director,
          supporter,
          viewer,
          progressView: progressView.html,
          isDeadlineExceeded: progressView.isDeadlineExceeded,
          processStatusHtml: this.mapProcessStatusCodeToHtml(task.processStatus),
          flag: crmMappedValues.priority === 'Gấp' ? RED_FLAG_SVG : WHITE_FLAG_SVG,
          typeTaskText: this.TYPE_TASK_VN?.[task.typeTask] ?? task.typeTask,
          startDateNotHTML: startDateStr,
          endDateNotHTML: endDateStr,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          startDateISO: task.startDate ? new Date(task.startDate).toISOString() : null,
          endDateISO: task.endDate ? new Date(task.endDate).toISOString() : null,
          startDateTooltip,
          endDateTooltip,
          deadlineStartParentISO: parentStartDate
            ? moment(parentStartDate).toISOString()
            : null,
          deadlineEndParentISO: parentEndDate
            ? moment(parentEndDate).toISOString()
            : null,
          flags: {
            isAssigner: !!userId && !!task.taskUsers?.some(
              (taskUser) =>
                taskUser.role === 'assigner' &&
                (taskUser.processId === userId || taskUser.user?.id === userId),
            ),
            canDelete:
              !!userId &&
              task.createdBy?.id === userId &&
              task.processStatus === 'Công việc mới',
            hasChildren: false, // sẽ được gán lại ở bước dưới
          },
        };
      }),
    );

    // Gán hasChildren cho từng item (batch query)
    await this.setHasChildrenBatch(dataMap);

    if (queryParams?.isSortStart === 'true' || queryParams?.isSortStart === true) {
      dataMap.sort((a, b) => {
        const aTime = this.parseDisplayDateToTimestamp(a.startDateNotHTML || a.startDate);
        const bTime = this.parseDisplayDateToTimestamp(b.startDateNotHTML || b.startDate);
        if (aTime === 0 && bTime !== 0) return 1;
        if (aTime !== 0 && bTime === 0) return -1;
        return aTime - bTime;
      });
    }

    return {
      data: dataMap,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      parentId,
    };
  }


  async findTasksByConclusion(queryParams: ListTaskDto) {
    const {
      page = 1,
      limit = 10,
      status,
      tab,
      filter,
      sort,
      isExport = 'false',
      meetingConclusionId,
      userId,
    } = queryParams;

    // ─────────────────────────────────────────────
    // 1. Parse IDs
    // ─────────────────────────────────────────────
    const conclusionIds = String(meetingConclusionId || '')
      .split(',')
      .map(x => x.trim())
      .filter(Boolean);

    if (!conclusionIds.length) {
      throw new BadRequestException('meetingConclusionId là bắt buộc');
    }

    const isExportMode = isExport === 'true';
    const pageNum = Number(page) || 1;
    const limitNum = isExportMode ? 9999 : Number(limit) || 10;
    const { name } = filter || {};

    // ─────────────────────────────────────────────
    // 2. Fetch Conclusions
    // ─────────────────────────────────────────────
    const conclusions = await this.dataSource
      .createQueryBuilder()
      .select(['mc.id AS id', 'mc.content AS content', 'm.title AS title'])
      .from('meeting_conclusions', 'mc')
      .leftJoin('meetings', 'm', 'm.id = mc.meeting_id')
      .where('mc.id IN (:...conclusionIds)', { conclusionIds })
      .andWhere('mc.status = 1')
      .getRawMany();

    const conclusionMap = new Map(conclusions.map(c => [c.id, c]));

    // ─────────────────────────────────────────────
    // 3. Export Info
    // ─────────────────────────────────────────────
    const exportUser: any = userId ? await this.sqlsvRepo.getUserById(userId) : null;
    const exportInfo = isExportMode
      ? [
        {
          key: 'unit',
          label: 'Đơn vị',
          value:
            exportUser?.parent?.name ||
            exportUser?.organizationUnit?.name ||
            exportUser?.unit?.name ||
            '',
        },
        {
          key: 'createBy',
          label: 'Người lập',
          value: exportUser?.name || exportUser?.fullName || '',
        },
        {
          key: 'titleMeeting',
          label: 'Tên cuộc họp',
          value: conclusions[0]?.title,
        },
        {
          key: 'contentColusion',
          label: 'Nội dung kết luận',
          value: conclusions.map(c => c.content).filter(Boolean).join('\n'),
        },
        {
          key: 'dateReport',
          label: 'Ngày báo cáo',
          value: dayjs().format('DD/MM/YYYY'),
        },
      ]
      : [];

    // ─────────────────────────────────────────────
    // 4. Base Query
    // ─────────────────────────────────────────────
    const baseQb = this.taskRepository.createQueryBuilder('task');

    if (name) {
      baseQb.andWhere('task.name COLLATE Latin1_General_CI_AI LIKE :name', {
        name: `%${name}%`,
      });
    }

    baseQb.andWhere('task.status = 1');

    if (status) {
      baseQb.andWhere('task.processStatus = :status', { status });
    }

    baseQb.andWhere('task.meetingConclusionId IN (:...conclusionIds)', {
      conclusionIds,
    });

    if (tab) {
      this.applyTabFilter(baseQb, tab);
    }

    const totalCount = await baseQb.clone().getCount();
    const idsQb = baseQb.clone().select('task.id', 'id');

    if (sort) {
      const [field, order] = sort.split(':');
      idsQb.orderBy(`task.${field}`, (order || 'DESC').toUpperCase());
    } else {
      idsQb.orderBy('task.createdAt', 'DESC');
    }

    if (!isExportMode) {
      idsQb.skip((pageNum - 1) * limitNum).take(limitNum);
    }

    const taskIds = (await idsQb.getRawMany()).map(x => x.id);
    if (!taskIds.length) {
      return {
        data: [],
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        exportInfo,
      };
    }

    // ─────────────────────────────────────────────
    // 5. Fetch Tasks with Users
    // ─────────────────────────────────────────────
    const data = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.taskUsers', 'taskUsers')
      .leftJoin('taskUsers.user', 'user')
      .leftJoin('taskUsers.organizationUnit', 'org')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.updatedBy', 'updatedBy')
      .where('task.id IN (:...ids)', { ids: taskIds })
      .select([
        'task.id',
        'task.name',
        'task.code',
        'task.progress',
        'task.processStatus',
        'task.startDate',
        'task.endDate',
        'task.createdAt',
        'task.updatedAt',
        'task.typeTask',
        'task.templateId',
        'task.meetingConclusionId',
        'createdBy.id',
        'createdBy.name',
      ])
      .addSelect([
        'taskUsers.id',
        'taskUsers.role',
        'taskUsers.type',
        'taskUsers.processId',
        'taskUsers.processName',
        'user.id',
        'user.name',
        'user.position',
        'org.id',
        'org.name',
      ])
      .getMany();

    // ─────────────────────────────────────────────
    // 6. Mapping Task Users & Progress
    // ─────────────────────────────────────────────
    const crmTitlesBatch = await this.mapCrmTitlesBatch(data);

    const mappedData = await Promise.all(
      data.map(async (task) => {
        const progressView = await buildProgressView(task);

        // map người phụ trách, chủ trì, hỗ trợ, xem
        const { assigner, director, supporter, viewer } =
          this.mapTaskUsersWithPosition(task.taskUsers || []);

        // CRM mapping (priority, flag, ...)
        const crmMappedValues = crmTitlesBatch[task.id] || {};

        // xử lý progress & status hiển thị cho export hoặc web
        const processStatusUi =
          isExportMode
            ? {
              processStatusUi: this.mapProcessStatus(task.processStatus),
              progressView: progressView.rawText,
            }
            : {
              processStatusUi: this.mapProcessStatusToHtml(task.processStatus),
              progressView: progressView.html,
            };

        // Lấy conclusion tương ứng với task
        const conclusion = conclusionMap.get(task.meetingConclusionId);

        return {
          ...task,
          meetingTitle: conclusion?.title || null,
          conclusionContent: conclusion?.content || null,
          flag:
            crmMappedValues.priority === 'G\u1ea5p'
              ? RED_FLAG_SVG
              : WHITE_FLAG_SVG,
          assigner,
          director,
          supporter,
          viewer,
          startDate: task.startDate
            ? dayjs(task.startDate).format('DD/MM/YYYY HH:mm')
            : null,
          endDate: task.endDate
            ? dayjs(task.endDate).format('DD/MM/YYYY HH:mm')
            : null,
          createdAt: dayjs(task.createdAt).format('DD/MM/YYYY HH:mm'),
          updatedAt: task.updatedAt
            ? dayjs(task.updatedAt).format('DD/MM/YYYY HH:mm')
            : null,
          parent: task.parent || null,
          ...processStatusUi,
        };
      }),
    );

    // ─────────────────────────────────────────────
    // 7. Group by Conclusion (Export)
    // ─────────────────────────────────────────────
    let finalData: any[] = mappedData;
    if (isExportMode) {
      const groupMap = new Map<string, any[]>();
      for (const item of mappedData) {
        const key = item.meetingConclusionId || 'unknown';
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(item);
      }

      finalData = [];
      let conclusionIndex = 1;
      for (const [conclusionId, tasks] of groupMap.entries()) {
        const total = tasks.length;
        const completed = tasks.filter(t => t.processStatus === 'DONE').length;

        // GROUP HEADER
        finalData.push({
          isGroup: true,
          stt: `${conclusionIndex}. Kết luận ${conclusionIndex} - Tổng số công việc : ${total}, Đã hoàn thành : ${completed}`,
        });

        tasks.forEach((t, idx) => {
          finalData.push({
            ...t,
            stt: idx + 1,
            progress: isExport ? `${t.progress}%` : t.progress,
          });
        });

        conclusionIndex++;
      }
    }

    return {
      data: finalData,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      exportInfo,
    };
  }
  private mapTaskUsersWithPosition(taskUsers: any[]) {
    const mapByRole = (role: string) =>
      (taskUsers || [])
        .filter((u) => u.role === role)
        .map((u) => {
          const name = u.user?.name;
          const position = u.user?.position;

          if (!name) return null;

          return position ? `${name} - ${position}` : name;
        })
        .filter(Boolean)
        .join(', ');

    const directorDep = (taskUsers || [])
      .filter((u) => u.role === 'director' && u.user?.parent?.name)
      .map((u) => u.user.parent.name)
      .join(', ');

    return {
      assigner: mapByRole('assigner'),
      director: mapByRole('director'),
      supporter: mapByRole('supporter'),
      viewer: mapByRole('viewer'),
      directorDep: directorDep || null,
    };
  }

  private validateTaskDates(
    task: any,
    parentTask?: any,
    projectStartDate?: Date | string | null,
    projectEndDate?: Date | string | null,
  ) {
    const childStart = task.startDate ? moment(task.startDate) : null;
    const childEnd = task.endDate ? moment(task.endDate) : null;

    let isStartOut = false;
    let isEndOut = false;
    let startTooltip = '';
    let endTooltip = '';

    const taskName = task.name || 'ABC';
    const parentName = parentTask?.name || 'BCD';
    const parentStartDate = parentTask?.startDate;
    const parentEndDate = parentTask?.endDate;

    if (childStart) {
      if (parentStartDate && childStart.isBefore(moment(parentStartDate), 'day')) {
        isStartOut = true;
        startTooltip = `<strong>Ngày bắt đầu của công việc <span style="color: #0F6BB2; font-weight: bold;">${taskName}</span> đang sớm hơn ngày bắt đầu công việc <span style="color: #0F6BB2; font-weight: bold;">${parentName}</span>. Hãy cập nhật lại thời gian.</strong>`;
      } else if (parentEndDate && childStart.isAfter(moment(parentEndDate), 'day')) {
        isStartOut = true;
        startTooltip = `<strong>Ngày bắt đầu của công việc <span style="color: #0F6BB2; font-weight: bold;">${taskName}</span> đang vượt quá hạn kết thúc công việc <span style="color: #0F6BB2; font-weight: bold;">${parentName}</span>. Hãy cập nhật lại thời gian.</strong>`;
      } else if (projectStartDate && childStart.isBefore(moment(projectStartDate), 'day')) {
        isStartOut = true;
        startTooltip = `<strong>Ngày bắt đầu của công việc <span style="color: #0F6BB2; font-weight: bold;">${taskName}</span> đang sớm hơn ngày bắt đầu của <span style="color: #0F6BB2; font-weight: bold;">dự án</span>. Hãy cập nhật lại thời gian.</strong>`;
      } else if (projectEndDate && childStart.isAfter(moment(projectEndDate), 'day')) {
        isStartOut = true;
        startTooltip = `<strong>Ngày bắt đầu của công việc <span style="color: #0F6BB2; font-weight: bold;">${taskName}</span> đang vượt quá ngày kết thúc của <span style="color: #0F6BB2; font-weight: bold;">dự án</span>. Hãy cập nhật lại thời gian.</strong>`;
      }
    }

    if (childEnd) {
      if (parentStartDate && childEnd.isBefore(moment(parentStartDate), 'day')) {
        isEndOut = true;
        endTooltip = `<strong>Hạn kết thúc của công việc <span style="color: #0F6BB2; font-weight: bold;">${taskName}</span> đang sớm hơn ngày bắt đầu công việc <span style="color: #0F6BB2; font-weight: bold;">${parentName}</span>. Hãy cập nhật lại thời gian.</strong>`;
      } else if (parentEndDate && childEnd.isAfter(moment(parentEndDate), 'day')) {
        isEndOut = true;
        endTooltip = `<strong>Hạn kết thúc của công việc <span style="color: #0F6BB2; font-weight: bold;">${taskName}</span> đang vượt quá hạn kết thúc công việc <span style="color: #0F6BB2; font-weight: bold;">${parentName}</span>. Hãy cập nhật lại thời gian.</strong>`;
      } else if (projectStartDate && childEnd.isBefore(moment(projectStartDate), 'day')) {
        isEndOut = true;
        endTooltip = `<strong>Hạn kết thúc của công việc <span style="color: #0F6BB2; font-weight: bold;">${taskName}</span> đang sớm hơn ngày bắt đầu của <span style="color: #0F6BB2; font-weight: bold;">dự án</span>. Hãy cập nhật lại thời gian.</strong>`;
      } else if (projectEndDate && childEnd.isAfter(moment(projectEndDate), 'day')) {
        isEndOut = true;
        endTooltip = `<strong>Hạn kết thúc của công việc <span style="color: #0F6BB2; font-weight: bold;">${taskName}</span> đang vượt quá ngày kết thúc của <span style="color: #0F6BB2; font-weight: bold;">dự án</span>. Hãy cập nhật lại thời gian.</strong>`;
      }
    }

    const startDateStr = task.startDate ? moment(task.startDate).format('DD/MM/YYYY') : null;
    const endDateStr = task.endDate ? moment(task.endDate).format('DD/MM/YYYY') : null;

    const formattedStartDate = isStartOut && startDateStr
      ? `<span style="color: #ff6c70; margin-left: 5px;">${startDateStr}</span>`.trim()
      : startDateStr;

    const formattedEndDate = isEndOut && endDateStr
      ? `<span style="color: #ff6c70; margin-left: 5px;">${endDateStr}</span>`.trim()
      : endDateStr;

    return {
      formattedStartDate,
      formattedEndDate,
      startDateTooltip: isStartOut ? startTooltip : null,
      endDateTooltip: isEndOut ? endTooltip : null,
    };
  }
}
