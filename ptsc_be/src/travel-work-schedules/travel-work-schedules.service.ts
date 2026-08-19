import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TravelWorkSchedulesRepository } from './travel-work-schedules.repository';
import { TravelWorkSchedulesQueryBuilder } from './helper/travel-work-schedules-query.builder';
import { TravelWorkSchedulesMapper } from './helper/travel-work-schedules.mapper';

import { CreateTravelWorkScheduleDto } from './dto/create-travel-work-schedule.dto';
import { UpdateTravelWorkScheduleDto } from './dto/update-travel-work-schedule.dto';
import { DeleteMultipleTravelWorkSchedulesDto } from './dto/delete-multiple-travel-work-schedules.dto';
import { ListTravelWorkSchedulesDto } from './dto/list-travel-work-schedules.dto';

import { ConfigurationService } from 'src/view-config/configuration.service';
import {
  FeatureManagementEntity,
  StatusFeature,
} from 'src/feature-management/feature-management.entity';
import { normalizeDateValueDDMMYYYY } from 'src/documents/helpers/build.filter';
import { TravelWorkScheduleEntity } from './entity/travel-work-schedules.entity';
import { MeetingEntity } from 'src/meeting/entities/meeting.entity';
export interface TravelWorkScheduleRaw {
  leaderName: string;
  location: string | null;
  workDate: Date | null;
  fromDate: Date | null;
  toDate: Date | null;
  morningLocation: string | null;
  afternoonLocation: string | null;
}
import { isOverlap, parseMeetingTime } from 'src/meeting/helper/build.meeting.filter';
import { LeadershipDutyDetail, LeadershipDutySchedule } from 'src/leadership-duty-schedule/entity/leadership-duty-schedule.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import * as ExcelJS from 'exceljs';

import * as utc from 'dayjs/plugin/utc';
import * as weekOfYear from 'dayjs/plugin/weekOfYear';
import * as timezone from 'dayjs/plugin/timezone';
import * as isoWeek from 'dayjs/plugin/isoWeek';
import * as dayjs from 'dayjs';
dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Service: Orchestrator
 * - Điều phối luồng xử lý
 * - Build query qua helper
 * - Execute qua repository
 * - Map response qua mapper
 * - KHÔNG chứa business logic chi tiết
 */
@Injectable()
export class TravelWorkSchedulesService {
  private readonly logger = new Logger(TravelWorkSchedulesService.name);

  constructor(
    private readonly repo: TravelWorkSchedulesRepository,
    private readonly queryBuilder: TravelWorkSchedulesQueryBuilder,
    private readonly mapper: TravelWorkSchedulesMapper,
    private readonly configurationService: ConfigurationService,

    @InjectRepository(MeetingEntity, 'mssqlConnection')
    private readonly meetingRepo: Repository<MeetingEntity>,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
    @InjectRepository(TravelWorkScheduleEntity, 'mssqlConnection')
    private readonly travelRepo: Repository<TravelWorkScheduleEntity>,
    @InjectRepository(LeadershipDutySchedule, 'mssqlConnection')
    private readonly leadershipDutyScheduleRepo: Repository<LeadershipDutySchedule>,
    @InjectRepository(LeadershipDutyDetail, 'mssqlConnection')
    private readonly leadershipDutyDetailRepo: Repository<LeadershipDutyDetail>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * Create new travel work schedule
   */
  async create(dto: CreateTravelWorkScheduleDto, userId: string) {
    const conflicts = await this.checkConflictBeforeCreateTravel(dto);

    if (conflicts.length) {
      throw new BadRequestException({
        message: 'Lãnh đạo đã có lịch công tác, lịch trực chỉ huy hoặc lịch họp bị trùng',
        conflicts,
      });
    }

    return this.repo.create(dto, userId);
  }
  
  
  /**
   * Kiểm tra trùng lịch trước khi tạo travel
   * Bao gồm: MEETING, TRAVEL, và Lịch trực chỉ huy
   */
  async checkConflictBeforeCreateTravel(dto: CreateTravelWorkScheduleDto) {
    const { leader } = dto;

    // ===== convert về range =====
    const ranges = this.buildRanges(dto);

    const conflictUserIds = new Set<string>();

    for (const r of ranges) {
      const date = r.date;

      // ===== MEETING =====
      const meetingConflicts = await this.checkUserConflict(
        date,
        `${r.start}-${r.end}`,
        [leader],
      );

      for (const c of meetingConflicts) {
        conflictUserIds.add(c.userId);
      }

      // ===== TRAVEL =====
      const travelConflict = await this.checkTravelWorkConflictFast(
        date,
        r.start,
        r.end,
        leader,
      );

      if (travelConflict) {
        conflictUserIds.add(leader);
      }

      // ===== Lịch trực chỉ huy =====
      const leadershipConflicts = await this.checkLeadershipDutyConflict(
        date,
        leader,
      );

      if (leadershipConflicts.length) {
        leadershipConflicts.forEach(u => conflictUserIds.add(u));
      }
    }

    return Array.from(conflictUserIds);
  }

  
  /**
   * Kiểm tra trùng lịch công tác chi tiết
   */
  private async checkTravelWorkConflict(
    meetingDate: string,
    start: string,
    end: string,
    userIds: string[],
  ) {
    const travels = await this.travelRepo
      .createQueryBuilder('t')
      .select([
        't.leader AS leader',
        't.schedule_type AS schedule_type',
        't.calendar_format AS calendar_format',
        't.work_date AS work_date',
        't.from_date AS from_date',
        't.to_date AS to_date',
        't.schedules AS schedules',
        't.morning_location AS morning_location',
        't.afternoon_location AS afternoon_location',
      ])
      .where('t.leader IN (:...userIds)', { userIds })
      .andWhere('t.status != 3')
      .andWhere(`
        (
          (t.schedule_type = 'singleDay' AND CONVERT(date, t.work_date) = :meetingDate)
          OR
          (t.schedule_type = 'multiDay'
            AND (
              (t.from_date IS NOT NULL AND t.to_date IS NOT NULL
                AND CONVERT(date, t.from_date) <= :meetingDate
                AND CONVERT(date, t.to_date) >= :meetingDate
              )
              OR
              (t.schedules IS NOT NULL)
            )
          )
        )
      `, { meetingDate })
      .getRawMany();

    const conflicts = new Map<string, { userId: string; type: string }>();

    for (const t of travels) {
      let isConflict = false;

      // ===== SINGLE DAY =====
      if (t.schedule_type === 'singleDay') {
        let tStart = '01:00';
        let tEnd = '24:00';

        if (t.calendar_format === 'session') {
          const hasMorning = !!t.morning_location;
          const hasAfternoon = !!t.afternoon_location;

          if (hasMorning && !hasAfternoon) {
            tStart = '01:00';
            tEnd = '12:00';
          } else if (!hasMorning && hasAfternoon) {
            tStart = '13:00';
            tEnd = '24:00';
          }
        }

        if (isOverlap(start, end, tStart, tEnd)) {
          isConflict = true;
        }
      }

      // ===== MULTI DAY =====
      if (t.schedule_type === 'multiDay') {
        let matched = false;

        // Ưu tiên schedules JSON
        if (t.schedules) {
          try {
            const schedules = JSON.parse(t.schedules);
            for (const s of schedules) {
              const sStart = dayjs(s.startDate).format('YYYY-MM-DD');
              const sEnd = dayjs(s.endDate).format('YYYY-MM-DD');

              if (meetingDate >= sStart && meetingDate <= sEnd) {
                matched = true;
                break;
              }
            }
          } catch {}
        } else {
          const fromDate = dayjs(t.from_date).format('YYYY-MM-DD');
          const toDate = dayjs(t.to_date).format('YYYY-MM-DD');

          if (meetingDate >= fromDate && meetingDate <= toDate) {
            matched = true;
          }
        }

        if (matched) {
          if (isOverlap(start, end, '01:00', '24:00')) {
            isConflict = true;
          }
        }
      }

      if (isConflict && !conflicts.has(t.leader)) {
        conflicts.set(t.leader, {
          userId: t.leader,
          type: 'TRAVEL',
        });
      }
    }

    return Array.from(conflicts.values());
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
    const travels = await this.travelRepo
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

  
  async checkUserConflict(
    meetingDate: string,
    meetingTime: string,
    userIds: string[],
    excludeMeetingId?: string,
  ) {
    if (!userIds?.length) return [];

    const time = parseMeetingTime(meetingTime);
    const start = dayjs(time.start).format('HH:mm');
    const end = dayjs(time.end).format('HH:mm');

    // ===== CHECK TRÙNG MEETING =====
    const rows = await this.meetingRepo
      .createQueryBuilder('m')
      .innerJoin('meeting_units', 'mu', 'mu.meeting_id = m.id')
      .innerJoin(
        'meeting_participants',
        'mp',
        'mp.meeting_unit_id = mu.id AND mp.user_id IN (:...userIds)',
        { userIds },
      )
      .innerJoin('users', 'u', 'u.id = mp.user_id')
      .where('m.meeting_date = :meetingDate', { meetingDate })
      .andWhere('m.status != :deletedStatus', { deletedStatus: '3' })
      .andWhere('(mp.participant_state IS NULL OR mp.participant_state != :notParticipateState)', { notParticipateState: 'NOT_PARTICIPATE' })
      .andWhere(
        `
        CAST(SUBSTRING(m.meeting_time, 1, 5) AS time) < CAST(:end AS time)
        AND
        CAST(SUBSTRING(m.meeting_time, 7, 5) AS time) > CAST(:start AS time)
        `,
        { start, end },
      )
      .andWhere(excludeMeetingId ? 'm.id != :excludeMeetingId' : '1=1', {
        excludeMeetingId,
      })
      .select([
        'u.id AS userId',
        'u.name AS userName',
        'm.id AS meetingId',
        'm.meeting_time AS meetingTime',
        'm.meeting_date AS meetingDate',
      ])
      .getRawMany();

    // ===== CHECK TRAVEL =====
    const travelRows = await this.checkTravelWorkConflict(
      meetingDate,
      start,
      end,
      userIds,
    );

    // ===== GỘP KẾT QUẢ =====
    const map = new Map<
      string,
      {
        userId: string;
        userName: string;
        meetingTime: string;
        meetingDate: string;
        meetingId: string;
        type: string;
      }
    >();

    // Meeting conflict
    for (const r of rows) {
      if (!map.has(r.userId)) {
        map.set(r.userId, {
          userId: r.userId,
          userName: r.userName,
          meetingTime: r.meetingTime,
          meetingDate: r.meetingDate,
          meetingId: r.meetingId,
          type: 'MEETING',
        });
      }
    }

    // Travel conflict
    for (const r of travelRows) {
      if (!map.has(r.userId)) {
        map.set(r.userId, {
          userId: r.userId,
          userName: (r.userId) || '',
          meetingTime: '',
          meetingDate: meetingDate,
          meetingId: '',
          type: 'TRAVEL',
        });
      }
    }

    return Array.from(map.values());
  }

  /**
   * Kiểm tra trùng lịch trực chỉ huy
   * Trả về danh sách leaderId trùng
   */
  private async checkLeadershipDutyConflict(date: string, leaderId: string) {
    const duties = await this.leadershipDutyDetailRepo
      .createQueryBuilder('ldd')
      .innerJoin('leadership_duty_schedules', 'lds', 'ldd.schedule_id = lds.id')
      .where('ldd.leader_id = :leaderId', { leaderId })
      .andWhere('ldd.status != 0') // chỉ lấy duty active
      .andWhere(':date BETWEEN CONVERT(date, ldd.duty_date) AND CONVERT(date, ldd.duty_date)', { date })
      .getMany();

    return duties.map(d => d.leaderId); // trả về danh sách id
  }
  /**
   * Chuyển DTO thành các khoảng thời gian (ranges) để kiểm tra trùng
   */
  private buildRanges(dto: CreateTravelWorkScheduleDto) {
    const ranges: { date: string; start: string; end: string }[] = [];

    if (dto.scheduleType === 'singleDay') {
      // SỬ DỤNG GIỜ LOCAL Asia/Ho_Chi_Minh
      const date = dayjs(dto.workDate).format('YYYY-MM-DD');

      if (dto.calendarFormat === 'fullDay') {
        ranges.push({ date, start: '01:00', end: '24:00' });
      }

      if (dto.calendarFormat === 'session') {
        if (dto.morningLocation) {
          ranges.push({ date, start: '01:00', end: '12:00' });
        }
        if (dto.afternoonLocation) {
          ranges.push({ date, start: '13:00', end: '24:00' });
        }
      }
    }

    if (dto.scheduleType === 'multiDay') {
      let d = dayjs(dto.fromDate);
      const end = dayjs(dto.toDate);

      while (d.isBefore(end) || d.isSame(end, 'day')) {
        ranges.push({
          date: d.format('YYYY-MM-DD'),
          start: '01:00',
          end: '24:00',
        });
        d = d.add(1, 'day');
      }
    }

    return ranges;
  }
  /**
   * Get detail of travel work schedule
   */
  async getDetail(id: string, userId: string) {
    const schedule = await this.repo.getDetail(id);
    if (!schedule) {
      throw new NotFoundException('Không tìm thấy lịch công tác');
    }
    return this.mapper.mapDetail(schedule, true);
  }

  /**
   * Update travel work schedule
   */
  async update(
    id: string,
    dto: UpdateTravelWorkScheduleDto,
    userId: string,
  ) {
    return this.repo.update(id, dto);
  }

  /**
   * Delete multiple travel work schedules (soft delete)
   */
  async deleteMultiple(
    dto: DeleteMultipleTravelWorkSchedulesDto,
    userId: string,
  ) {
    return this.repo.delete(dto);
  }

  /**
   * List travel work schedules with filtering and pagination
   * Orchestrate các bước:
   * 1. Build criteria
   * 2. Build WHERE / JOIN
   * 3. Build SELECT
   * 4. Execute
   * 5. Map data
   */
  async list(
    dto: ListTravelWorkSchedulesDto,
    userId: string,
    authorId?: string,
  ) {
    const {
      page = 1,
      limit = 20,
      filter,
      sort,
      processFn,
      authority,
      isExport,
      isListDynamic,
    } = dto;

    // Step 1: Resolve effective user
    const effectiveUserId =
      authority === 'true' && authorId ? authorId : userId;

    // Step 2: Load feature management config
    const featureManagement = await this.featureManagementRepo.findOne({
      where: {
        code: processFn,
        status: 1,
        statusFeature: StatusFeature.ACTIVE,
      },
    });

    // Step 3: Build criteria from filter
    const filterCriteria =
      this.queryBuilder.buildCriteriaFromFilter(filter);
    const featureCriteria = featureManagement?.criteria ?? [];
    const allCriteria = [...featureCriteria, ...filterCriteria];

    // Step 4: Build WHERE + JOIN
    const { whereClause, joins } = this.queryBuilder.buildWhereClause(
      allCriteria,
      featureManagement,
    );

    // Step 5: Build SELECT fields
    const { selectFields, aliases } =
      await this.queryBuilder.buildSelectFields(
        processFn,
        this.configurationService,
      );

    // Step 6: Build pagination
    const pagination = this.queryBuilder.buildPagination(page, limit);

    // Step 7: Build ORDER BY
    const orderBy = this.queryBuilder.buildOrderBy(sort, aliases);

    // Step 8: Execute query
    const { items: rawItems, total } = await this.repo.executeListQuery({
      selectFields,
      whereClause,
      joins,
      orderBy,
      pagination,
    });

    // Step 9: Handle empty result
    if (!rawItems.length) {
      return {
        success: true,
        items: [],
        message: 'Không có dữ liệu',
        total: 0,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: 0,
      };
    }

    // Step 10: Map result
    const mappedItems = this.mapper.mapListItems(
      rawItems,
      aliases,
      isExport,
      isListDynamic,
    );

    // Step 11: Return response
    return {
      items: mappedItems,
      total,
    };
  }

  async listNotes(
    dto: ListTravelWorkSchedulesDto,
    originalUserId: string,
    effectiveUserId: string,
  ): Promise<{ items: string[]; total: number }> {
    const { page = 1, limit = 20 } = dto;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.repo.findForNotes(
      dto,
      originalUserId,
      effectiveUserId,
      offset,
      limit,
    );

    const items = rows
      .map((r) => this.buildNote(r))
      .filter(Boolean);

    return { items, total };
  }

  private buildNote(row: TravelWorkScheduleRaw): string {
    if (!row) return '';
    const leader = row.leaderName ?? 'Lãnh đạo';
    const location =
      row.location ||
      [row.morningLocation, row.afternoonLocation].filter(Boolean).join(' - ') ||
      'chưa rõ địa điểm';
    if (row.workDate) {
      return `-${leader} đi công tác ${location} ngày ${normalizeDateValueDDMMYYYY(
        row.workDate,
      )}`;
    }
    if (row.fromDate && row.toDate) {
      if (this.isSameDay(row.fromDate, row.toDate)) {
        return `-${leader} đi công tác ${location} ngày ${normalizeDateValueDDMMYYYY(
          row.fromDate,
        )}`;
      }
      return `-${leader} đi công tác ${location} từ ngày ${normalizeDateValueDDMMYYYY(
        row.fromDate,
      )} đến ngày ${normalizeDateValueDDMMYYYY(row.toDate)}`;
    }
    if (row.fromDate) {
      return `-${leader} đi công tác ${location} ngày ${normalizeDateValueDDMMYYYY(
        row.fromDate,
      )}`;
    }
    return `-${leader} có lịch công tác ${location}`;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
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
      // Map mỗi phần tử trong importRows sang format rows nội bộ giống với Excel branch
      rows = importRows.map((item: any, idx: number) => ({
        rowNumber: idx + 2, // Giả lập rowNumber (bắt đầu từ 2 như Excel)
        code: String(item.code || '').trim(),
        leader: String(item.leader || '').trim(),
        scheduleType: String(item.scheduleType || '').trim(),
        // workDateVal / fromDateVal / toDateVal / subDateVal... là raw value để parseExcelDate xử lý
        // Với JSON từ FE, các field ngày là string dd/mm/yyyy → parseExcelDate nhận chuỗi vẫn parse được
        workDateVal: item.workDate || '',
        fromDateVal: item.fromDate || '',
        toDateVal: item.toDate || '',
        travelSchedule: String(item.travelSchedule || '').trim(),
        subStt: String(item.subStt || '').trim(),
        subNumDays: String(item.subNumDays || '').trim(),
        subFormat: String(item.subFormat || '').trim(),
        subDateVal: item.subDate || '',
        subFromDateVal: item.subFromDate || '',
        subToDateVal: item.subToDate || '',
        location: String(item.location || '').trim(),
        content: String(item.content || '').trim(),
        morningLocation: String(item.morningLocation || '').trim(),
        morningContent: String(item.morningContent || '').trim(),
        afternoonLocation: String(item.afternoonLocation || '').trim(),
        afternoonContent: String(item.afternoonContent || '').trim(),
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
      const hasCode = normalized.some((v) => v.includes('mã lịch công tác') || v.includes('ma lich cong tac'));
      const hasLeader = normalized.some((v) => v.includes('lãnh đạo') || v.includes('lanh dao'));
      const hasType = normalized.some((v) => v.includes('loại công tác') || v.includes('loai cong tac'));
      if (hasCode && hasLeader && hasType) {
        headerRowNo = i;
        break;
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
      }
      for (const lb of labels) {
        const key = normalizeHeader(lb);
        for (const [h, idx] of headerMap.entries()) {
          if (h.includes(key)) return idx;
        }
      }
      return 0;
    };

    const cols = {
      code: col(['mã lịch công tác', 'ma lich cong tac', 'mã lịch', 'ma lich']),
      leader: col(['lãnh đạo công tác', 'lanh dao cong tac', 'lãnh đạo', 'lanh dao']),
      scheduleType: col(['loại công tác', 'loai cong tac']),
      workDate: col(['công tác ngày', 'cong tac ngay']),
      fromDate: col(['công tác từ ngày', 'cong tac tu ngay', 'từ ngày', 'tu ngay']),
      toDate: col(['đến ngày', 'den ngay']),
      travelSchedule: col(['lịch trình công tác', 'lich trinh cong tac', 'lịch trình', 'lich trinh']),
      subStt: col(['stt lịch trình', 'stt lich trinh']),
      subNumDays: col(['số ngày lịch trình', 'so ngay lich trinh', 'số ngày', 'so ngay']),
      subFormat: col(['hình thức lịch trình', 'hinh thuc lich trinh', 'hình thức', 'hinh thuc']),
      subDate: col(['ngày lịch trình', 'ngay lich trinh']),
      subFromDate: col(['từ ngày lịch trình', 'tu ngay lich trinh']),
      subToDate: col(['đến ngày lịch trình', 'den ngay lich trinh']),
      morningLocation: col(['địa điểm buổi sáng', 'dia diem buoi sang']),
      morningContent: col(['nội dung buổi sáng', 'noi dung buoi sang']),
      afternoonLocation: col(['địa điểm buổi chiều', 'dia diem buoi chieu']),
      afternoonContent: col(['nội dung buổi chiều', 'noi dung buoi chieu']),
      location: col(['địa điểm cả ngày/nhiều ngày', 'dia diem ca ngay/nhieu ngay', 'địa điểm', 'dia diem']),
      content: col(['nội dung cả ngày/nhiều ngày', 'noi dung ca ngay/nhieu ngay', 'nội dung', 'noi dung']),
    };

    const missingCols: string[] = [];
    if (!cols.code) missingCols.push('Mã lịch công tác');
    if (!cols.leader) missingCols.push('Lãnh đạo công tác');
    if (!cols.scheduleType) missingCols.push('Loại công tác');

    if (missingCols.length > 0) {
      throw new BadRequestException(`File Excel thiếu các cột bắt buộc: ${missingCols.join(', ')}`);
    }

    rows = [];
    for (let r = headerRowNo + 1; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const codeVal = cellText(row.getCell(cols.code).value).trim();
      const leaderVal = cellText(row.getCell(cols.leader).value).trim();
      const scheduleTypeVal = cellText(row.getCell(cols.scheduleType).value).trim();
      
      if (!codeVal && !leaderVal && !scheduleTypeVal) continue;

      rows.push({
        rowNumber: r,
        code: codeVal,
        leader: leaderVal,
        scheduleType: scheduleTypeVal,
        workDateVal: row.getCell(cols.workDate).value,
        fromDateVal: row.getCell(cols.fromDate).value,
        toDateVal: row.getCell(cols.toDate).value,
        travelSchedule: cellText(row.getCell(cols.travelSchedule).value).trim(),
        subStt: cellText(row.getCell(cols.subStt).value).trim(),
        subNumDays: cellText(row.getCell(cols.subNumDays).value).trim(),
        subFormat: cellText(row.getCell(cols.subFormat).value).trim(),
        subDateVal: row.getCell(cols.subDate).value,
        subFromDateVal: row.getCell(cols.subFromDate).value,
        subToDateVal: row.getCell(cols.subToDate).value,
        location: cellText(row.getCell(cols.location).value).trim(),
        content: cellText(row.getCell(cols.content).value).trim(),
        morningLocation: cellText(row.getCell(cols.morningLocation).value).trim(),
        morningContent: cellText(row.getCell(cols.morningContent).value).trim(),
        afternoonLocation: cellText(row.getCell(cols.afternoonLocation).value).trim(),
        afternoonContent: cellText(row.getCell(cols.afternoonContent).value).trim(),
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

    // Group rows by Code
    const groups = new Map<string, typeof rows>();
    for (const r of rows) {
      const list = groups.get(r.code) || [];
      list.push(r);
      groups.set(r.code, list);
    }

    const validDtos: any[] = [];
    const inMemoryRanges = new Map<string, Array<{ date: string; start: string; end: string }>>();

    for (const [code, groupRows] of groups.entries()) {
      const mainRow = groupRows[0];
      const rowNum = mainRow.rowNumber;

      // Validate leader
      const leaderKey = normalizeKey(mainRow.leader);
      const matchedUser = userMap.get(leaderKey);
      if (!mainRow.leader) {
        errors.push({ row: rowNum, field: 'LÃNH ĐẠO CÔNG TÁC *', message: 'Tên lãnh đạo công tác là bắt buộc.' });
      } else if (!matchedUser) {
        errors.push({ row: rowNum, field: 'LÃNH ĐẠO CÔNG TÁC *', message: `Lãnh đạo "${mainRow.leader}" không tồn tại trên hệ thống.` });
      } else if (!matchedUser.active) {
        errors.push({ row: rowNum, field: 'LÃNH ĐẠO CÔNG TÁC *', message: `Lãnh đạo "${mainRow.leader}" đã ngừng hoạt động.` });
      }

      // Check consistency of leader/scheduleType in the group
      for (let i = 1; i < groupRows.length; i++) {
        const otherRow = groupRows[i];
        if (otherRow.leader && normalizeKey(otherRow.leader) !== leaderKey) {
          errors.push({
            row: otherRow.rowNumber,
            field: 'LÃNH ĐẠO CÔNG TÁC *',
            message: `Lãnh đạo công tác không khớp với lãnh đạo chính "${mainRow.leader}" của mã lịch ${code}.`,
          });
        }
        if (otherRow.scheduleType && otherRow.scheduleType !== mainRow.scheduleType) {
          errors.push({
            row: otherRow.rowNumber,
            field: 'LOẠI CÔNG TÁC *',
            message: `Loại công tác không khớp với loại chính "${mainRow.scheduleType}" của mã lịch ${code}.`,
          });
        }
      }

      const parsedScheduleType = mainRow.scheduleType === 'Trong ngày' ? 'singleDay' : (mainRow.scheduleType === 'Nhiều ngày' ? 'multiDay' : null);
      if (!parsedScheduleType) {
        errors.push({ row: rowNum, field: 'LOẠI CÔNG TÁC *', message: `Loại công tác "${mainRow.scheduleType}" không hợp lệ. Phải là "Trong ngày" hoặc "Nhiều ngày".` });
        continue;
      }

      // Initialize base dto
      const dto: any = {
        leader: matchedUser?.id || '',
        scheduleType: parsedScheduleType,
      };

      if (parsedScheduleType === 'singleDay') {
        const workDate = parseExcelDate(mainRow.workDateVal);
        if (!workDate) {
          errors.push({ row: rowNum, field: 'CÔNG TÁC NGÀY *', message: 'Ngày công tác không hợp lệ.' });
          continue;
        }
        dto.workDate = workDate.toISOString();

        const format = mainRow.subFormat === 'Theo buổi' ? 'session' : (mainRow.subFormat === 'Cả ngày' ? 'fullDay' : null);
        if (!format) {
          errors.push({ row: rowNum, field: 'HÌNH THỨC LỊCH TRÌNH *', message: `Hình thức lịch trình "${mainRow.subFormat}" không hợp lệ. Phải là "Cả ngày" hoặc "Theo buổi".` });
          continue;
        }
        dto.calendarFormat = format;

        if (format === 'fullDay') {
          if (!mainRow.location) {
            errors.push({ row: rowNum, field: 'ĐỊA ĐIỂM CẢ NGÀY/NHIỀU NGÀY', message: 'Địa điểm là bắt buộc khi chọn Cả ngày.' });
          }
          if (!mainRow.content) {
            errors.push({ row: rowNum, field: 'NỘI DUNG CẢ NGÀY/NHIỀU NGÀY', message: 'Nội dung là bắt buộc khi chọn Cả ngày.' });
          }
          dto.location = mainRow.location;
          dto.content = mainRow.content;
        } else {
          // session
          const hasMorning = !!(mainRow.morningLocation && mainRow.morningContent);
          const hasAfternoon = !!(mainRow.afternoonLocation && mainRow.afternoonContent);

          if (!hasMorning && !hasAfternoon) {
            errors.push({ row: rowNum, field: 'ĐỊA ĐIỂM BUỔI SÁNG', message: 'Phải nhập ít nhất một buổi (sáng hoặc chiều) với đầy đủ địa điểm và nội dung.' });
          } else {
            if ((mainRow.morningLocation || mainRow.morningContent) && (!mainRow.morningLocation || !mainRow.morningContent)) {
              errors.push({ row: rowNum, field: 'ĐỊA ĐIỂM BUỔI SÁNG', message: 'Buổi sáng phải có đầy đủ địa điểm và nội dung.' });
            }
            if ((mainRow.afternoonLocation || mainRow.afternoonContent) && (!mainRow.afternoonLocation || !mainRow.afternoonContent)) {
              errors.push({ row: rowNum, field: 'ĐỊA ĐIỂM BUỔI CHIỀU', message: 'Buổi chiều phải có đầy đủ địa điểm và nội dung.' });
            }
          }
          dto.morningLocation = mainRow.morningLocation;
          dto.morningContent = mainRow.morningContent;
          dto.afternoonLocation = mainRow.afternoonLocation;
          dto.afternoonContent = mainRow.afternoonContent;
        }

        if (groupRows.length > 1) {
          errors.push({ row: rowNum, field: 'MÃ LỊCH CÔNG TÁC *', message: `Lịch công tác "Trong ngày" chỉ được có 1 dòng dữ liệu (phát hiện ${groupRows.length} dòng).` });
        }
      } else {
        // multiDay
        const fromDate = parseExcelDate(mainRow.fromDateVal);
        const toDate = parseExcelDate(mainRow.toDateVal);

        if (!fromDate) {
          errors.push({ row: rowNum, field: 'CÔNG TÁC TỪ NGÀY *', message: 'Ngày bắt đầu không hợp lệ.' });
        }
        if (!toDate) {
          errors.push({ row: rowNum, field: 'ĐẾN NGÀY *', message: 'Ngày kết thúc không hợp lệ.' });
        }
        if (fromDate && toDate && fromDate > toDate) {
          errors.push({ row: rowNum, field: 'CÔNG TÁC TỪ NGÀY *', message: 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.' });
        }

        if (!fromDate || !toDate) continue;

        dto.fromDate = fromDate.toISOString();
        dto.toDate = toDate.toISOString();

        const isNhieulich = mainRow.travelSchedule === 'Nhiều lịch trình';
        dto.travelSchedule = isNhieulich ? 'nhieulich' : 'motlich';

        if (!isNhieulich) {
          if (!mainRow.location) {
            errors.push({ row: rowNum, field: 'ĐỊA ĐIỂM CẢ NGÀY/NHIỀU NGÀY', message: 'Địa điểm là bắt buộc khi chọn Một lịch trình.' });
          }
          if (!mainRow.content) {
            errors.push({ row: rowNum, field: 'NỘI DUNG CẢ NGÀY/NHIỀU NGÀY', message: 'Nội dung là bắt buộc khi chọn Một lịch trình.' });
          }
          dto.location = mainRow.location;
          dto.content = mainRow.content;

          if (groupRows.length > 1) {
            errors.push({ row: rowNum, field: 'MÃ LỊCH CÔNG TÁC *', message: `Lịch công tác "Nhiều ngày - Một lịch trình" chỉ được có 1 dòng dữ liệu (phát hiện ${groupRows.length} dòng).` });
          }
        } else {
          // Nhiều lịch trình
          const schedules: any[] = [];
          const seenSubStt = new Set<string>();

          for (const gr of groupRows) {
            if (!gr.subStt) {
              errors.push({ row: gr.rowNumber, field: 'STT LỊCH TRÌNH *', message: 'STT lịch trình là bắt buộc đối với Nhiều lịch trình.' });
              continue;
            }
            if (seenSubStt.has(gr.subStt)) {
              errors.push({ row: gr.rowNumber, field: 'STT LỊCH TRÌNH *', message: `STT lịch trình "${gr.subStt}" bị trùng lặp trong cùng một lịch công tác.` });
              continue;
            }
            seenSubStt.add(gr.subStt);

            const grNumDays = gr.subNumDays === 'Một ngày' ? 'motngay' : (gr.subNumDays === 'Nhiều ngày' ? 'nhieungay' : null);
            if (!grNumDays) {
              errors.push({ row: gr.rowNumber, field: 'SỐ NGÀY LỊCH TRÌNH *', message: `Số ngày lịch trình "${gr.subNumDays}" không hợp lệ. Phải là "Một ngày" hoặc "Nhiều ngày".` });
              continue;
            }

            const item: any = {
              numDays: grNumDays,
            };

            if (grNumDays === 'motngay') {
              const subDate = parseExcelDate(gr.subDateVal);
              if (!subDate) {
                errors.push({ row: gr.rowNumber, field: 'NGÀY LỊCH TRÌNH *', message: 'Ngày lịch trình không hợp lệ.' });
                continue;
              }
              if (subDate < fromDate || subDate > toDate) {
                errors.push({ row: gr.rowNumber, field: 'NGÀY LỊCH TRÌNH *', message: `Ngày lịch trình nằm ngoài khoảng thời gian tổng [${mainRow.fromDateVal} - ${mainRow.toDateVal}].` });
              }

              item.date = subDate.toISOString();
              item.startDate = subDate.toISOString();
              item.endDate = subDate.toISOString();

              const format = gr.subFormat === 'Theo buổi' ? 'session' : (gr.subFormat === 'Cả ngày' ? 'fullDay' : null);
              if (!format) {
                errors.push({ row: gr.rowNumber, field: 'HÌNH THỨC LỊCH TRÌNH *', message: `Hình thức lịch trình "${gr.subFormat}" không hợp lệ. Phải là "Cả ngày" hoặc "Theo buổi".` });
                continue;
              }
              item.format = format;

              if (format === 'fullDay') {
                if (!gr.location) {
                  errors.push({ row: gr.rowNumber, field: 'ĐỊA ĐIỂM CẢ NGÀY/NHIỀU NGÀY', message: 'Địa điểm là bắt buộc khi chọn Cả ngày.' });
                }
                if (!gr.content) {
                  errors.push({ row: gr.rowNumber, field: 'NỘI DUNG CẢ NGÀY/NHIỀU NGÀY', message: 'Nội dung là bắt buộc khi chọn Cả ngày.' });
                }
                item.location = gr.location;
                item.content = gr.content;
              } else {
                // session
                const hasMorning = !!(gr.morningLocation && gr.morningContent);
                const hasAfternoon = !!(gr.afternoonLocation && gr.afternoonContent);

                if (!hasMorning && !hasAfternoon) {
                  errors.push({ row: gr.rowNumber, field: 'ĐỊA ĐIỂM BUỔI SÁNG', message: 'Phải nhập ít nhất một buổi (sáng hoặc chiều) với đầy đủ địa điểm và nội dung.' });
                } else {
                  if ((gr.morningLocation || gr.morningContent) && (!gr.morningLocation || !gr.morningContent)) {
                    errors.push({ row: gr.rowNumber, field: 'ĐỊA ĐIỂM BUỔI SÁNG', message: 'Buổi sáng phải có đầy đủ địa điểm và nội dung.' });
                  }
                  if ((gr.afternoonLocation || gr.afternoonContent) && (!gr.afternoonLocation || !gr.afternoonContent)) {
                    errors.push({ row: gr.rowNumber, field: 'ĐỊA ĐIỂM BUỔI CHIỀU', message: 'Buổi chiều phải có đầy đủ địa điểm và nội dung.' });
                  }
                }
                item.morningLocation = gr.morningLocation;
                item.morningContent = gr.morningContent;
                item.afternoonLocation = gr.afternoonLocation;
                item.afternoonContent = gr.afternoonContent;
              }
            } else {
              // nhieungay
              const subFromDate = parseExcelDate(gr.subFromDateVal);
              const subToDate = parseExcelDate(gr.subToDateVal);

              if (!subFromDate) {
                errors.push({ row: gr.rowNumber, field: 'TỪ NGÀY LỊCH TRÌNH *', message: 'Ngày bắt đầu lịch trình không hợp lệ.' });
              }
              if (!subToDate) {
                errors.push({ row: gr.rowNumber, field: 'ĐẾN NGÀY LỊCH TRÌNH *', message: 'Ngày kết thúc lịch trình không hợp lệ.' });
              }
              if (subFromDate && subToDate) {
                if (subFromDate > subToDate) {
                  errors.push({ row: gr.rowNumber, field: 'TỪ NGÀY LỊCH TRÌNH *', message: 'Ngày bắt đầu lịch trình phải nhỏ hơn hoặc bằng ngày kết thúc.' });
                }
                if (subFromDate < fromDate || subToDate > toDate) {
                  errors.push({ row: gr.rowNumber, field: 'TỪ NGÀY LỊCH TRÌNH *', message: `Khoảng lịch trình nằm ngoài khoảng thời gian tổng [${mainRow.fromDateVal} - ${mainRow.toDateVal}].` });
                }
              }

              if (!subFromDate || !subToDate) continue;

              item.startDate = subFromDate.toISOString();
              item.endDate = subToDate.toISOString();

              if (!gr.location) {
                errors.push({ row: gr.rowNumber, field: 'ĐỊA ĐIỂM CẢ NGÀY/NHIỀU NGÀY', message: 'Địa điểm là bắt buộc khi chọn Nhiều ngày.' });
              }
              if (!gr.content) {
                errors.push({ row: gr.rowNumber, field: 'NỘI DUNG CẢ NGÀY/NHIỀU NGÀY', message: 'Nội dung là bắt buộc khi chọn Nhiều ngày.' });
              }
              item.location = gr.location;
              item.content = gr.content;
            }

            schedules.push(item);
          }
          dto.schedules = schedules;
        }
      }

      // Check internal overlap within the same multi-day schedule
      if (dto.scheduleType === 'multiDay' && dto.schedules && dto.schedules.length > 1) {
        let internalOverlap = false;
        for (let i = 0; i < dto.schedules.length; i++) {
          for (let j = i + 1; j < dto.schedules.length; j++) {
            const s1 = dto.schedules[i];
            const s2 = dto.schedules[j];
            const start1 = dayjs(s1.numDays === 'motngay' ? s1.date : s1.startDate).format('YYYY-MM-DD');
            const end1 = dayjs(s1.numDays === 'motngay' ? s1.date : s1.endDate).format('YYYY-MM-DD');
            const start2 = dayjs(s2.numDays === 'motngay' ? s2.date : s2.startDate).format('YYYY-MM-DD');
            const end2 = dayjs(s2.numDays === 'motngay' ? s2.date : s2.endDate).format('YYYY-MM-DD');

            if (start1 <= end2 && end1 >= start2) {
              internalOverlap = true;
              break;
            }
          }
          if (internalOverlap) break;
        }

        if (internalOverlap) {
          errors.push({
            row: rowNum,
            field: 'LỊCH TRÌNH CÔNG TÁC *',
            message: 'Vui lòng kiểm tra lịch trình công tác các lịch trình đang bị trùng ngày',
          });
          continue;
        }
      }

      // Check conflict and in-memory overlaps for the leader
      if (dto.leader && !errors.some(e => e.row === rowNum && e.field === 'LÃNH ĐẠO CÔNG TÁC *')) {
        const ranges = this.buildRanges(dto);
        
        // 1. Check in-memory overlap
        const leaderRanges = inMemoryRanges.get(dto.leader) || [];
        let selfOverlap = false;
        for (const r of ranges) {
          for (const lr of leaderRanges) {
            if (r.date === lr.date && isOverlap(r.start, r.end, lr.start, lr.end)) {
              errors.push({
                row: rowNum,
                field: 'MÃ LỊCH CÔNG TÁC *',
                message: `Lịch công tác của lãnh đạo "${mainRow.leader}" bị trùng lặp với lịch khác của chính họ trong file import vào ngày ${dayjs(r.date).format('DD/MM/YYYY')}.`,
              });
              selfOverlap = true;
              break;
            }
          }
          if (selfOverlap) break;
        }

        if (!selfOverlap) {
          // Add to in-memory ranges
          leaderRanges.push(...ranges);
          inMemoryRanges.set(dto.leader, leaderRanges);

          // 2. Check database conflict (meeting, other travel, duty)
          try {
            const dbConflicts = await this.checkConflictBeforeCreateTravel(dto);
            if (dbConflicts.length) {
              errors.push({
                row: rowNum,
                field: 'LÃNH ĐẠO CÔNG TÁC *',
                message: `Lãnh đạo "${mainRow.leader}" bị trùng lịch công tác, lịch trực chỉ huy hoặc lịch họp trong hệ thống.`,
              });
            }
          } catch (err) {
            errors.push({
              row: rowNum,
              field: 'Hệ thống',
              message: `Lỗi kiểm tra trùng lịch: ${err.message}`,
            });
          }
        }
      }

      validDtos.push(dto);
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        success: false,
        message: 'Dữ liệu file import không hợp lệ',
        errors: errors.sort((a, b) => a.row - b.row),
      });
    }

    let importedCount = 0;
    for (const dto of validDtos) {
      await this.repo.create(dto, userId);
      importedCount++;
    }

    return {
      success: true,
      message: `Import thành công ${importedCount} lịch công tác.`,
      importedCount,
    };
  }
}