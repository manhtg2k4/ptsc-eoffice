import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  CreateLeadershipDutyScheduleDto,
  UpdateLeadershipDutyScheduleDto,
  DeleteManyLeadershipDutySchedulesDto,
  ListLeadershipDutySchedulesDto,
} from './dto/leadership-duty-schedule.dto';
import {
  LeadershipDutyScheduleRepository,
  LeadershipDutyDetailRepository,
} from './leadership-duty-schedule.repository';
import { LeadershipDutyScheduleQueryBuilder } from './helper/leadership-duty-schedule.query-builder';
import { LeadershipDutyScheduleMapper } from './helper/leadership-duty-schedule.mapper';
import { ConfigurationService } from 'src/view-config/configuration.service';
import { FeatureManagementEntity, StatusFeature } from 'src/feature-management/feature-management.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TravelWorkScheduleEntity } from 'src/travel-work-schedules/entity/travel-work-schedules.entity';
import { LeadershipDutySchedule } from './entity/leadership-duty-schedule.entity';
import { isOverlap } from 'src/meeting/helper/build.meeting.filter';

import * as utc from 'dayjs/plugin/utc';
import * as weekOfYear from 'dayjs/plugin/weekOfYear';
import * as timezone from 'dayjs/plugin/timezone';
import * as isoWeek from 'dayjs/plugin/isoWeek';
import * as dayjs from 'dayjs';
import { UserEntity } from 'src/users/entities/user.entity';
import * as ExcelJS from 'exceljs';
dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class LeadershipDutyScheduleService {
  private readonly logger = new Logger(LeadershipDutyScheduleService.name);

  constructor(
    private readonly scheduleRepo: LeadershipDutyScheduleRepository,
    private readonly detailRepo: LeadershipDutyDetailRepository,
    private readonly queryBuilder: LeadershipDutyScheduleQueryBuilder,
    private readonly mapper: LeadershipDutyScheduleMapper,
    private readonly configurationService: ConfigurationService,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
    @InjectRepository(TravelWorkScheduleEntity, 'mssqlConnection')
    private readonly travelWorkScheduleRepo: Repository<TravelWorkScheduleEntity>,
    @InjectRepository(LeadershipDutySchedule, 'mssqlConnection')
    private readonly leadershipDutyScheduleRepo: Repository<LeadershipDutySchedule>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  private normalizeDutyDayOfWeek(
    dutyDateInput: string | Date,
    inputDayOfWeek: number | undefined,
    action: 'create' | 'update',
    index: number,
  ): number {
    const parsed = dayjs(dutyDateInput);
    const normalized = parsed.isValid() ? parsed.day() + 1 : 0; // 1=CN ... 7=T7
    const input = Number(inputDayOfWeek ?? 0);

    if (parsed.isValid() && input > 0 && input !== normalized) {
      this.logger.warn(
        `[LeadershipDutyScheduleService.${action}] Overwrite dayOfWeek at details[${index}] from ${input} to ${normalized} (dutyDate=${parsed.format('YYYY-MM-DD')})`,
      );
    }

    if (normalized >= 1 && normalized <= 7) return normalized;
    return input >= 1 && input <= 7 ? input : 0;
  }

  async create(dto: CreateLeadershipDutyScheduleDto, userId: string) {
    const start = Date.now();

    if (dto.details.length !== 7) {
      throw new BadRequestException('Lịch trực phải có đầy đủ 7 ngày trong tuần');
    }

    const isDuplicate = await this.scheduleRepo.checkDuplicateSchedule(dto.week, dto.year);
    if (isDuplicate) {
      throw new BadRequestException(`Lịch trực tuần ${dto.week} năm ${dto.year} đã tồn tại`);
    }
    // ===== CHECK TRÙNG LỊCH CÔNG TÁC =====
      const conflicts = await this.checkConflictWithTravel(dto);

      if (conflicts.length) {
        const conflictMessages = conflicts.map(conflict => {
          return `Cán bộ: ${conflict.leaderName} - ${conflict.leaderPosition}, đã bị trùng lịch công tác vào ngày: ${conflict.dates.join(', ')}`;
        });

        throw new BadRequestException({
          message: conflictMessages,
          conflicts
        });
      }

    const savedScheduleId = await this.scheduleRepo.withTransaction(async (queryRunner) => {
      const scheduleData = {
        title: dto.title,
        week: dto.week,
        year: dto.year,
        fromDate: new Date(dto.fromDate),
        toDate: new Date(dto.toDate),
        scheduleDate: new Date(dto.scheduleDate),
        scheduleTime: new Date(dto.scheduleTime),
        createdBy: userId,
        status: 1,
      };

      const savedSchedule = await this.scheduleRepo.createWithTransaction(queryRunner, scheduleData);

      const detailsData = dto.details.map((detail, idx) => ({
        scheduleId: savedSchedule.id,
        dutyDate: new Date(detail.dutyDate),
        dayOfWeek: this.normalizeDutyDayOfWeek(detail.dutyDate, detail.dayOfWeek, 'create', idx),
        leaderId: detail.leaderId,
        notes: detail.notes || '',
        status: 1,
      }));

      await this.detailRepo.bulkInsertWithTransaction(queryRunner, detailsData);
      return savedSchedule.id;
    });

    const fullSchedule = await this.findById(savedScheduleId);


    return {
      success: true,
      message: 'Tạo lịch trực thành công',
      data: fullSchedule,
    };
  }
  private async checkConflictWithTravel(dto: CreateLeadershipDutyScheduleDto) {
    // 1️⃣ Lấy danh sách tất cả user để map id -> name/position
    const users = await this.userRepo.find({
      select: ['id', 'name', 'position'],
    });
    const userMap = new Map(users.map(u => [u.id, u])); // Map userId -> User object

    // 2️⃣ Map leaderId -> [dutyDate]
    const map = new Map<string, string[]>(); // leaderId -> [dutyDate]

    for (const d of dto.details) {
      const date = dayjs(d.dutyDate).format('YYYY-MM-DD'); // Format date

      // Kiểm tra trùng lịch công tác
      const isConflict = await this.checkTravelWorkConflictFast(
        date,
        '01:00', // Bắt đầu từ 01:00
        '24:00', // Kết thúc vào 24:00 (full day)
        d.leaderId, // LeaderId
      );

      if (isConflict) {
        if (!map.has(d.leaderId)) {
          map.set(d.leaderId, []);
        }
        map.get(d.leaderId)!.push(date); // Ghi nhận lịch trùng của leader
      }
    }

    // 3️⃣ Trả ra array với thông tin name, position
    return Array.from(map.entries()).map(([leaderId, dates]) => {
      const user = userMap.get(leaderId); // Lấy thông tin người dùng từ map
      return {
        leaderId,
        leaderName: user?.name || 'Không rõ tên',
        leaderPosition: user?.position || 'Không rõ vị trí',
        dates,
      };
    });
  }
  /**
   * Kiểm tra trùng lịch công tác nhanh
   */
  private async checkTravelWorkConflictFast(
    date: string,
    start: string,
    end: string,
    userId: string,
  ): Promise<boolean> {
    const travels = await this.travelWorkScheduleRepo
      .createQueryBuilder('t')
      .where('t.leader = :userId', { userId })
      .andWhere('t.status != 3')
      .andWhere(`
        (
          -- singleDay
          (t.schedule_type = 'singleDay' 
            AND CONVERT(date, t.work_date) = :date
          )
          OR
          -- multiDay
          (t.schedule_type = 'multiDay'
            AND CONVERT(date, t.from_date) <= :date
            AND CONVERT(date, t.to_date) >= :date
          )
        )
      `, { date })
      .getMany();

    for (const t of travels) {
      // ===== SINGLE DAY =====
      if (t.scheduleType === 'singleDay') {
        let tStart = '01:00';
        let tEnd = '24:00';

        if (t.calendarFormat === 'session') {
          const hasMorning = !!t.morningLocation;
          const hasAfternoon = !!t.afternoonLocation;

          if (hasMorning && !hasAfternoon) {
            tStart = '01:00';
            tEnd = '12:00';
          } else if (!hasMorning && hasAfternoon) {
            tStart = '13:00';
            tEnd = '24:00';
          }
        }

        if (isOverlap(start, end, tStart, tEnd)) return true;
      }

      // ===== MULTI DAY =====
      if (t.scheduleType === 'multiDay') {
        return true; // full day
      }
    }

    return false;
  }
  
  async update(id: string, dto: UpdateLeadershipDutyScheduleDto, userId: string) {
    const start = Date.now();

    const schedule = await this.scheduleRepo.findById(id);
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch trực');

    if (dto.details && dto.details.length !== 7) {
      throw new BadRequestException('Lịch trực phải có đầy đủ 7 ngày trong tuần');
    }

    if (dto.week || dto.year) {
      const isDuplicate = await this.scheduleRepo.checkDuplicateSchedule(
        dto.week ?? schedule.week,
        dto.year ?? schedule.year,
        id,
      );
      if (isDuplicate) {
        throw new BadRequestException('Lịch trực với tuần/tháng/năm này đã tồn tại');
      }
    }

    await this.scheduleRepo.withTransaction(async (queryRunner) => {
      if (dto.title !== undefined) schedule.title = dto.title;
      if (dto.week !== undefined) schedule.week = dto.week;
      if (dto.year !== undefined) schedule.year = dto.year;
      if (dto.scheduleDate !== undefined) schedule.scheduleDate = new Date(dto.scheduleDate);
      if (dto.scheduleTime !== undefined) schedule.scheduleTime = new Date(dto.scheduleTime);
      if (dto.fromDate !== undefined) schedule.fromDate = new Date(dto.fromDate);
      if (dto.toDate !== undefined) schedule.toDate = new Date(dto.toDate);

      await this.scheduleRepo.updateWithTransaction(queryRunner, schedule);

      if (dto.details) {
        // delete + insert trong cùng transaction - không chạy tuần tự nếu không phụ thuộc
        await this.detailRepo.deleteByScheduleIdWithTransaction(queryRunner, id);

        const newDetailsData = dto.details.map((detail, idx) => ({
          scheduleId: id,
          dutyDate: new Date(detail.dutyDate),
          dayOfWeek: this.normalizeDutyDayOfWeek(detail.dutyDate, detail.dayOfWeek, 'update', idx),
          leaderId: detail.leaderId,
          notes: detail.notes || '',
          status: 1,
        }));

        await this.detailRepo.bulkInsertWithTransaction(queryRunner, newDetailsData);
      }
    });

    const fullSchedule = await this.findById(id);


    return {
      success: true,
      message: 'Cập nhật lịch trực thành công',
      data: fullSchedule,
    };
  }

  async delete(id: string, userId: string) {
    const schedule = await this.scheduleRepo.findById(id);
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch trực');

    await this.scheduleRepo.withTransaction(async (queryRunner) => {
      await this.scheduleRepo.deleteWithTransaction(queryRunner, id);
      await this.detailRepo.deleteByScheduleIdWithTransaction(queryRunner, id);
    });

    return { success: true, message: 'Xóa lịch trực thành công' };
  }

  async deleteMany(dto: DeleteManyLeadershipDutySchedulesDto, userId: string) {
    if (!dto.ids?.length) {
      throw new BadRequestException('Danh sách ID không được trống');
    }

    const deletedCount = await this.scheduleRepo.withTransaction(async (queryRunner) => {
      const count = await this.scheduleRepo.deleteManyWithTransaction(queryRunner, dto.ids);
      await this.detailRepo.deleteByScheduleIdsWithTransaction(queryRunner, dto.ids);
      return count;
    });

    return {
      success: true,
      message: `Đã xóa ${deletedCount} lịch trực`,
      deletedCount,
    };
  }

  async findById(id: string) {
    const start = Date.now();

    // Parallel fetch: schedule + details cùng lúc
    const [schedule, details] = await Promise.all([
      this.scheduleRepo.findByIdWithCreator(id),
      this.detailRepo.findByScheduleIdWithLeader(id),
    ]);

    if (!schedule) throw new NotFoundException('Không tìm thấy lịch trực');

    const result = this.mapper.mapFullSchedule(schedule, details);


    return result;
  }

  async list(dto: ListLeadershipDutySchedulesDto, userId: string, authorId?: string) {
    const totalStart = Date.now();

    const {
      page = 1,
      limit = 20,
      filter,
      sort,
      processFn = 'LichTrucLanhDao',
      authority,
      isExport,
      isListDynamic,
    } = dto;

    // effectiveUserId hiện chưa dùng trong query - giữ để không đổi behavior
    const effectiveUserId = authority === 'true' && authorId ? authorId : userId;

    const metadataStart = Date.now();
    // 1. Fetch featureManagement record một lần
    const featureManagement = await this.featureManagementRepo.findOne({
      where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE },
    });

    // 2. Parallel: buildSelectFields + start Building Where clause
    const [ { selectFields, aliases }, filterCriteria ] = await Promise.all([
      this.queryBuilder.buildSelectFields(processFn, this.configurationService, featureManagement),
      this.queryBuilder.buildCriteriaFromFilter(filter),
    ]);

    const { whereClause, joins } = this.queryBuilder.buildWhereClause(
      filterCriteria,
      featureManagement,
      isListDynamic,
    );
    const pagination = this.queryBuilder.buildPagination(page, limit);
    const orderBy = this.queryBuilder.buildOrderBy(sort, aliases);

    const qStart = Date.now();
    // 3. Parallel fetch: count + main items list (không có details subquery)
    const { items: rawItems, total } = await this.scheduleRepo.executeListQuery({
      selectFields,
      whereClause,
      joins,
      orderBy,
      pagination,
    });

    if (!rawItems.length) {
      return { success: true, items: [], message: 'Không có dữ liệu', total: 0 };
    }

    // 4. Batch fetch details cho các IDs trả về - tránh N+1
    const ids = rawItems.map(item => item.id);
    const fetchDetailsStart = Date.now();
    const allDetails = await this.detailRepo.findByScheduleIdsWithLeader(ids);

    const mapStart = Date.now();
    // 5. Link details vào items trong Node.js
    const mappedItems = this.mapper.mapListItems(rawItems, aliases, isExport, isListDynamic, allDetails);


    return { items: mappedItems, total };
  }

  async getScheduledWeeks(year: number): Promise<number[]> {
    return this.scheduleRepo.getScheduledWeeks(year);
  }

  async importExcel(file: Express.Multer.File | undefined, userId: string, importRows?: any[]) {
    // ─── Helper: parse ngày dd/mm/yyyy từ FE (chuỗi string) ──────────────────
    const parseDateDMY = (dateStr: string): Date | null => {
      if (!dateStr || !String(dateStr).trim()) return null;
      const parts = String(dateStr).trim().split('/');
      if (parts.length !== 3) return null;
      const [day, month, year] = parts.map(Number);
      if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
        return date;
      }
      return null;
    };

    let rows: any[];

    if (importRows && importRows.length > 0) {
      // ─── Nhánh JSON: FE gửi data đã parse sẵn ──────────────────────────────
      // Map mỗi phần tử trong importRows sang format rows nội bộ
      rows = importRows.map((item: any, idx: number) => ({
        rowNumber: idx + 2, // Giả lập rowNumber (bắt đầu từ 2 như Excel)
        title: String(item.title || '').trim(),
        dutyDateVal: item.dutyDate || '', // string dd/mm/yyyy
        leader: String(item.leader || '').trim(),
        notes: String(item.notes || '').trim(),
      }));
    } else {
      // ─── Nhánh Excel: parse file như cũ ─────────────────────────────────────
      if (!file?.path) {
        throw new BadRequestException('Vui lòng cung cấp file Excel.');
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
    const maxScan = Math.min(sheet.rowCount, 20);
    for (let i = 1; i <= maxScan; i++) {
      const rowObj = sheet.getRow(i);
      const normalized: string[] = [];
      for (let c = 1; c <= rowObj.cellCount; c++) {
        normalized.push(normalizeHeader(rowObj.getCell(c).value));
      }
      const hasTitle = normalized.some((v) => v.includes('tiêu đề'));
      const hasDate = normalized.some((v) => v.includes('ngày trực'));
      const hasLeader = normalized.some((v) => v.includes('lãnh đạo') || v.includes('tên'));
      if (hasTitle && hasDate && hasLeader) {
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
        const hasYear = normalized.some((v) => v.includes('năm'));
        const hasWeek = normalized.some((v) => v.includes('tuần'));
        if (hasYear && hasWeek) {
          headerRowNo = i;
          break;
        }
      }
    }

    if (!headerRowNo) {
      headerRowNo = 1;
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
      title: col(['tiêu đề lịch', 'tieu de lich', 'tiêu đề']),
      dutyDate: col(['ngày trực', 'ngay truc']),
      leader: col(['tên lãnh đạo trực', 'tên lãnh đạo', 'lanh dao', 'lãnh đạo']),
      notes: col(['ghi chú', 'ghi chu', 'notes', 'note']),
    };

    const missingCols: string[] = [];
    if (!cols.title) missingCols.push('Tiêu đề lịch');
    if (!cols.dutyDate) missingCols.push('Ngày trực');
    if (!cols.leader) missingCols.push('Tên lãnh đạo trực');

    if (missingCols.length > 0) {
      throw new BadRequestException(`File Excel thiếu các cột bắt buộc: ${missingCols.join(', ')}`);
    }

    rows = [];
    for (let r = headerRowNo + 1; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const titleVal = cellText(row.getCell(cols.title).value).trim();
      const dutyDateVal = row.getCell(cols.dutyDate).value;
      const dutyDateStr = cellText(dutyDateVal).trim();
      
      if (!titleVal && !dutyDateStr) continue;

      rows.push({
        rowNumber: r,
        title: titleVal,
        dutyDateVal,
        leader: cellText(row.getCell(cols.leader).value).trim(),
        notes: cols.notes ? cellText(row.getCell(cols.notes).value).trim() : '',
      });
    }

    if (rows.length === 0) {
      throw new BadRequestException('Không tìm thấy dữ liệu hợp lệ trong file Excel.');
    }
    } // end else (Excel branch)

    const errors: Array<{ row: number; field: string; message: string }> = [];

    const users = await this.userRepo.find({
      select: ['id', 'username', 'name', 'status'],
    });

    const normalizeKey = (str: string) => {
      return String(str || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    };

    const userMap = new Map<string, any>();
    for (const u of users) {
      const active = Number(u.status) === 1;
      if (u.username) {
        userMap.set(normalizeKey(u.username), { id: u.id, name: u.name, active });
      }
      if (u.name) {
        userMap.set(normalizeKey(u.name), { id: u.id, name: u.name, active });
      }
    }

    const parseExcelDate = (val: any): Date | null => {
      if (val instanceof Date) {
        if (isNaN(val.getTime())) return null;
        const y = val.getUTCFullYear();
        const m = String(val.getUTCMonth() + 1).padStart(2, '0');
        const d = String(val.getUTCDate()).padStart(2, '0');
        return new Date(`${y}-${m}-${d}`);
      }
      if (typeof val === 'number') {
        const date = new Date((val - 25569) * 86400 * 1000);
        if (isNaN(date.getTime())) return null;
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        return new Date(`${y}-${m}-${d}`);
      }
      const str = String(val ?? '').trim();
      if (!str) return null;

      const dm = str.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
      if (dm) {
        const d = parseInt(dm[1]);
        const m = parseInt(dm[2]) - 1;
        const y = parseInt(dm[3]);
        const date = new Date(y, m, d);
        if (date.getFullYear() === y && date.getMonth() === m && date.getDate() === d) {
          const yy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          return new Date(`${yy}-${mm}-${dd}`);
        }
      }

      const ym = str.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
      if (ym) {
        const y = parseInt(ym[1]);
        const m = parseInt(ym[2]) - 1;
        const d = parseInt(ym[3]);
        const date = new Date(y, m, d);
        if (date.getFullYear() === y && date.getMonth() === m && date.getDate() === d) {
          const yy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          return new Date(`${yy}-${mm}-${dd}`);
        }
      }

      const date = new Date(str);
      if (isNaN(date.getTime())) return null;
      const yy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return new Date(`${yy}-${mm}-${dd}`);
    };

    const parsedRows = rows.map((r) => {
      const parsedDate = parseExcelDate(r.dutyDateVal);
      
      const leaderKey = normalizeKey(r.leader);
      const matchedUser = userMap.get(leaderKey);

      if (!r.title) {
        errors.push({ row: r.rowNumber, field: 'Tiêu đề lịch', message: 'Tiêu đề lịch là bắt buộc.' });
      }
      if (!parsedDate) {
        errors.push({ row: r.rowNumber, field: 'Ngày trực', message: 'Ngày trực không hợp lệ.' });
      }
      if (!r.leader) {
        errors.push({ row: r.rowNumber, field: 'Tên lãnh đạo trực', message: 'Tên lãnh đạo trực là bắt buộc.' });
      } else if (!matchedUser) {
        errors.push({ row: r.rowNumber, field: 'Tên lãnh đạo trực', message: `Lãnh đạo "${r.leader}" không tồn tại trên hệ thống.` });
      } else if (!matchedUser.active) {
        errors.push({ row: r.rowNumber, field: 'Tên lãnh đạo trực', message: `Lãnh đạo "${r.leader}" đã ngừng hoạt động.` });
      }

      let weekNum = 0;
      let yearNum = 0;
      if (parsedDate) {
        const d = dayjs(parsedDate);
        weekNum = d.isoWeek();
        yearNum = d.isoWeekYear();
      }

      return {
        ...r,
        parsedDate,
        yearNum,
        weekNum,
        leaderId: matchedUser?.id,
        leaderName: matchedUser?.name,
      };
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        success: false,
        message: 'Dữ liệu file import không hợp lệ',
        errors,
      });
    }

    const groups = new Map<string, typeof parsedRows>();
    for (const pr of parsedRows) {
      if (!pr.parsedDate) continue;
      const key = `${pr.yearNum}-${pr.weekNum}`;
      const list = groups.get(key) || [];
      list.push(pr);
      groups.set(key, list);
    }

    for (const [key, groupRows] of groups.entries()) {
      const firstRow = groupRows[0];
      const { yearNum, weekNum } = firstRow;

      const isDuplicate = await this.scheduleRepo.checkDuplicateSchedule(weekNum, yearNum);
      if (isDuplicate) {
        errors.push({
          row: firstRow.rowNumber,
          field: 'Ngày trực',
          message: `Lịch trực tuần ${weekNum} năm ${yearNum} đã tồn tại trong hệ thống.`,
        });
        continue;
      }

      if (groupRows.length !== 7) {
        errors.push({
          row: firstRow.rowNumber,
          field: 'Ngày trực',
          message: `Lịch trực tuần ${weekNum} năm ${yearNum} phải có đầy đủ 7 ngày trực (hiện có ${groupRows.length} ngày).`,
        });
        continue;
      }

      const datesSet = new Set<string>();
      const fromDate = dayjs().year(yearNum).isoWeek(weekNum).startOf('isoWeek').toDate();
      const toDate = dayjs().year(yearNum).isoWeek(weekNum).endOf('isoWeek').toDate();

      const fromStart = dayjs(fromDate).startOf('day');
      const toEnd = dayjs(toDate).endOf('day');

      for (const gr of groupRows) {
        const dateStr = dayjs(gr.parsedDate).format('YYYY-MM-DD');
        if (datesSet.has(dateStr)) {
          errors.push({
            row: gr.rowNumber,
            field: 'Ngày trực',
            message: `Ngày trực ${dayjs(gr.parsedDate).format('DD/MM/YYYY')} bị trùng trong tuần ${weekNum}.`,
          });
        }
        datesSet.add(dateStr);

        const grDay = dayjs(gr.parsedDate);
        if (grDay.isBefore(fromStart) || grDay.isAfter(toEnd)) {
          errors.push({
            row: gr.rowNumber,
            field: 'Ngày trực',
            message: `Ngày trực ${grDay.format('DD/MM/YYYY')} không nằm trong khoảng thời gian của tuần ${weekNum} (${fromStart.format('DD/MM/YYYY')} - ${toEnd.format('DD/MM/YYYY')}).`,
          });
        }

        const isConflict = await this.checkTravelWorkConflictFast(
          dateStr,
          '01:00',
          '24:00',
          gr.leaderId!,
        );
        if (isConflict) {
          errors.push({
            row: gr.rowNumber,
            field: 'Tên lãnh đạo trực',
            message: `Lãnh đạo "${gr.leaderName}" đã bị trùng lịch công tác vào ngày ${dayjs(gr.parsedDate).format('DD/MM/YYYY')}.`,
          });
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        success: false,
        message: 'Dữ liệu file import không hợp lệ',
        errors: errors.sort((a, b) => a.row - b.row),
      });
    }

    let importedCount = 0;
    await this.scheduleRepo.withTransaction(async (queryRunner) => {
      for (const [key, groupRows] of groups.entries()) {
        const firstRow = groupRows[0];
        const { yearNum, weekNum } = firstRow;

        const fromDate = dayjs().year(yearNum).isoWeek(weekNum).startOf('isoWeek').toDate();
        const toDate = dayjs().year(yearNum).isoWeek(weekNum).endOf('isoWeek').toDate();

        const scheduleData = {
          title: firstRow.title,
          week: weekNum,
          year: yearNum,
          fromDate,
          toDate,
          scheduleDate: new Date(),
          scheduleTime: new Date(),
          createdBy: userId,
          status: 1,
        };

        const savedSchedule = await this.scheduleRepo.createWithTransaction(queryRunner, scheduleData);

        const detailsData = groupRows.map((gr) => ({
          scheduleId: savedSchedule.id,
          dutyDate: gr.parsedDate!,
          dayOfWeek: this.normalizeDutyDayOfWeek(gr.parsedDate!, undefined, 'create', 0),
          leaderId: gr.leaderId!,
          notes: gr.notes || '',
          status: 1,
        }));

        await this.detailRepo.bulkInsertWithTransaction(queryRunner, detailsData);
        importedCount++;
      }
    });

    return {
      success: true,
      message: `Import thành công ${importedCount} lịch trực ban lãnh đạo.`,
      importedCount,
    };
  }
}
