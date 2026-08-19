import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, Not, DataSource } from 'typeorm';
import * as sql from 'mssql';
import { ConfigService } from '@nestjs/config';
import { TravelWorkScheduleEntity } from './entity/travel-work-schedules.entity';
import { CreateTravelWorkScheduleDto } from './dto/create-travel-work-schedule.dto';
import { UpdateTravelWorkScheduleDto } from './dto/update-travel-work-schedule.dto';
import { DeleteMultipleTravelWorkSchedulesDto } from './dto/delete-multiple-travel-work-schedules.dto';
import { getMssqlPool } from 'src/database/mssql.pool';
import { TravelWorkScheduleRaw } from './travel-work-schedules.service';
import { ListTravelWorkSchedulesDto } from './dto/list-travel-work-schedules.dto';

/**
 * Repository: Tương tác với database
 * - CRUD operations
 * - Raw SQL queries
 * - Data validation
 */
@Injectable()
export class TravelWorkSchedulesRepository {
  private readonly logger = new Logger(TravelWorkSchedulesRepository.name);
  private dbname: string;
  private pool: sql.ConnectionPool | null = null;

  constructor(
    @InjectRepository(TravelWorkScheduleEntity, 'mssqlConnection')
    private readonly repo: Repository<TravelWorkScheduleEntity>,
    private readonly configService: ConfigService,
    @InjectDataSource('mssqlConnection')
    private readonly dataSource: DataSource,
  ) { }

  onModuleInit() {
    const db = this.configService.get<string>('SQLSERVER_DATABASE');
    if (!db) throw new Error('SQLSERVER_DATABASE not defined');
    this.dbname = `${db}.dbo`;
  }

  private async getPool(): Promise<sql.ConnectionPool> {
    if (this.pool?.connected) return this.pool;
    this.pool = await getMssqlPool(this.configService);
    if (!this.pool.connected) {
      throw new Error('MSSQL pool not connected');
    }
    return this.pool;
  }

  /* =========================
   * CREATE
   * ========================= */
  async create(dto: CreateTravelWorkScheduleDto, userId: string) {
    // Validate based on schedule type
    this.validateCreateDto(dto);

    return this.dataSource.transaction(async (manager) => {
      let contentFields: any;
      let locationFields: any;
      let dateFields: any;
      let schedulesJson: any[] | null = null;

      // Nếu là multiDay và có danh sách chi tiết, ta build content/location tổng hợp và lưu JSON
      if (dto.scheduleType === 'multiDay' && dto.schedules?.length) {
        schedulesJson = dto.schedules;
        const locations = dto.schedules.map(s => {
          if (s.format === 'session') {
            const sessionLoc = [s.morningLocation, s.afternoonLocation].filter(Boolean).join(' - ');
            return sessionLoc || s.location; // nếu không có morning/afternoon thì dùng location
          }
          return s.location;
        }).filter(Boolean);
        
        const contents = dto.schedules.map(s => {
          const start = this.formatDateForSummary(s.startDate);
          const end = this.formatDateForSummary(s.endDate);
          let text = s.content;
          if (s.format === 'session') {
            const parts: string[] = [];
            if (s.morningContent) parts.push(`Sáng: ${s.morningContent}`);
            if (s.afternoonContent) parts.push(`Chiều: ${s.afternoonContent}`);
            const sessionText = parts.join('; ');
            if (sessionText) {
              text = sessionText;
            }
          }
          return text ? `(${start} ${end ? '- ' + end : ''}): ${text}` : '';
        }).filter(Boolean);

        locationFields = {
          location: [...new Set(locations)].join(' | '),
          morningLocation: null,
          afternoonLocation: null
        };
        contentFields = {
          content: contents.join('\n'),
          morningContent: null,
          afternoonContent: null
        };
        dateFields = {
          workDate: null,
          fromDate: dto.fromDate ? new Date(dto.fromDate) : null,
          toDate: dto.toDate ? new Date(dto.toDate) : null
        };
      } else {
        contentFields = this.normalizeContentFields(dto);
        locationFields = this.normalizeLocationFields(dto);
        dateFields = this.normalizeDateFields(dto);
      }

      const schedule = manager.create(TravelWorkScheduleEntity, {
        leader: dto.leader,
        scheduleType: dto.scheduleType,
        calendarFormat: dto.calendarFormat,
        travelSchedule: dto.travelSchedule,
        ...dateFields,
        ...contentFields,
        ...locationFields,
        schedules: schedulesJson,
        createdBy: userId,
        status: '1',
      });

      await manager.save(schedule);

      return schedule;
    });
  }

  private formatDateForSummary(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  }

  private normalizeContentFields(dto: {
    content?: string | null;
    morningContent?: string | null;
    afternoonContent?: string | null;
  }) {
    let { content, morningContent, afternoonContent } = dto;

    const hasMain = !!content?.trim();
    const hasMorning = !!morningContent?.trim();
    const hasAfternoon = !!afternoonContent?.trim();

    // Ưu tiên content chính → đổ xuống sáng/chiều nếu thiếu
    if (hasMain) {
      if (!hasMorning) morningContent = content;
      if (!hasAfternoon) afternoonContent = content;
    }

    // Nếu không có content chính → build từ sáng/chiều
    if (!hasMain && (hasMorning || hasAfternoon)) {
      const parts: string[] = [];

      if (hasMorning) parts.push(`Buổi sáng: ${morningContent!.trim()}`);
      if (hasAfternoon) parts.push(`Buổi chiều: ${afternoonContent!.trim()}`);

      content = parts.join('\n');
    }

    return {
      content: content?.trim() || null,
      morningContent: morningContent?.trim() || null,
      afternoonContent: afternoonContent?.trim() || null,
    };
  }

  private normalizeLocationFields(dto: {
    location?: string | null;
    morningLocation?: string | null;
    afternoonLocation?: string | null;
  }) {
    let { location, morningLocation, afternoonLocation } = dto;

    const hasMain = !!location?.trim();
    const hasMorning = !!morningLocation?.trim();
    const hasAfternoon = !!afternoonLocation?.trim();

    if (hasMain) {
      if (!hasMorning) morningLocation = location;
      if (!hasAfternoon) afternoonLocation = location;
    }

    if (!hasMain && (hasMorning || hasAfternoon)) {
      const parts: string[] = [];

      if (hasMorning) parts.push(`Sáng: ${morningLocation!.trim()}`);
      if (hasAfternoon) parts.push(`Chiều: ${afternoonLocation!.trim()}`);

      location = parts.join(' | ');
    }

    return {
      location: location?.trim() || null,
      morningLocation: morningLocation?.trim() || null,
      afternoonLocation: afternoonLocation?.trim() || null,
    };
  }

  private normalizeDateFields(dto: {
    workDate?: string | Date | null;
    fromDate?: string | Date | null;
    toDate?: string | Date | null;
  }) {
    let { fromDate, toDate } = dto;
    const { workDate } = dto;

    const hasRange = !!fromDate || !!toDate;

    if (!hasRange && workDate) {
      fromDate = workDate;
      toDate = workDate;
    }

    return {
      workDate: workDate ? new Date(workDate) : null,
      fromDate: fromDate ? new Date(fromDate) : null,
      toDate: toDate ? new Date(toDate) : null,
    };
  }

  /**
   * Validate DTO based on schedule type
   */
  private validateCreateDto(dto: CreateTravelWorkScheduleDto) {
    // Validate single day
    if (dto.scheduleType === 'singleDay') {
      if (!dto.workDate) {
        throw new BadRequestException('workDate là bắt buộc cho loại trong ngày');
      }
      if (!dto.calendarFormat) {
        throw new BadRequestException(
          'calendarFormat là bắt buộc cho loại trong ngày',
        );
      }

      // Validate session
      if (dto.calendarFormat === 'session') {
        const hasMorning = !!(dto.morningLocation && dto.morningContent);
        const hasAfternoon = !!(dto.afternoonLocation && dto.afternoonContent);

        if (!hasMorning && !hasAfternoon) {
          throw new BadRequestException(
            'Phải nhập ít nhất một buổi (sáng hoặc chiều) với đầy đủ địa điểm và nội dung',
          );
        }

        if (
          (dto.morningLocation || dto.morningContent) &&
          (!dto.morningLocation || !dto.morningContent)
        ) {
          throw new BadRequestException(
            'Buổi sáng phải có đầy đủ địa điểm và nội dung',
          );
        }

        if (
          (dto.afternoonLocation || dto.afternoonContent) &&
          (!dto.afternoonLocation || !dto.afternoonContent)
        ) {
          throw new BadRequestException(
            'Buổi chiều phải có đầy đủ địa điểm và nội dung',
          );
        }
      }

      // Validate full day
      if (dto.calendarFormat === 'fullDay') {
        if (!dto.location || !dto.content) {
          throw new BadRequestException('Địa điểm và nội dung là bắt buộc');
        }
      }
    }

    // Validate multi day
    if (dto.scheduleType === 'multiDay') {
      if (!dto.fromDate || !dto.toDate) {
        throw new BadRequestException(
          'fromDate và toDate là bắt buộc cho loại nhiều ngày',
        );
      }

      if (dto.schedules?.length) {
        // Validate từng item trong schedules
        for (const item of dto.schedules) {
          const isNhieulich = dto.travelSchedule === 'nhieulich';

          // 1. Validate Date
          if (isNhieulich) {
            // Cho phép startDate/endDate hoặc date
            if (!item.startDate && !item.date) {
              throw new BadRequestException('startDate hoặc date là bắt buộc trong danh sách lịch chi tiết');
            }
          } else {
            // Cũ: bắt buộc startDate và endDate
            if (!item.startDate || !item.endDate) {
              throw new BadRequestException('startDate và endDate là bắt buộc trong danh sách lịch chi tiết');
            }
          }

          // 2. Validate Location/Content
          if (isNhieulich) {
            const hasMain = !!(item.location?.trim() && item.content?.trim());
            const hasMorning = !!(item.morningLocation?.trim() && item.morningContent?.trim());
            const hasAfternoon = !!(item.afternoonLocation?.trim() && item.afternoonContent?.trim());

            if (!hasMain && !hasMorning && !hasAfternoon) {
              throw new BadRequestException(
                'Địa điểm và nội dung là bắt buộc trong danh sách lịch chi tiết',
              );
            }
          } else {
            // Cũ: bắt buộc location và content
            if (!item.location?.trim() || !item.content?.trim()) {
              throw new BadRequestException(
                'Địa điểm và nội dung là bắt buộc trong danh sách lịch chi tiết',
              );
            }
          }
          
          if (item.startDate && item.endDate && new Date(item.startDate) > new Date(item.endDate)) {
            throw new BadRequestException(
              'startDate phải nhỏ hơn hoặc bằng endDate trong lịch chi tiết',
            );
          }
        }
      } else {
        // Nếu không có schedules array, bắt buộc có location và content ở top level
        if (!dto.location || !dto.content) {
          throw new BadRequestException('Địa điểm và nội dung là bắt buộc');
        }
      }

      const from = new Date(dto.fromDate);
      const to = new Date(dto.toDate);
      if (from > to) {
        throw new BadRequestException(
          'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc',
        );
      }
    }
  }

  /* =========================
   * DETAIL
   * ========================= */
  async getDetail(id: string) {
    const pool = await this.getPool();

    const sqlQuery = `
      SELECT
        tws.id,
        tws.leader,
        tws.schedule_type AS scheduleType,
        tws.calendar_format AS calendarFormat,
        tws.travel_schedule AS travelSchedule,
        tws.work_date AS workDate,
        tws.from_date AS fromDate,
        tws.to_date AS toDate,
        tws.location,
        tws.content,
        tws.morning_location AS morningLocation,
        tws.morning_content AS morningContent,
        tws.afternoon_location AS afternoonLocation,
        tws.afternoon_content AS afternoonContent,
        tws.schedules,
        tws.status,
        tws.created_at AS createdAt,
        tws.updated_at AS updatedAt,

        -- Leader info
        lu.id AS leaderId,
        lu.name AS leaderName,

        -- Created by info
        cu.id AS createdById,
        cu.name AS createdByName

      FROM travel_work_schedules tws
      LEFT JOIN ${this.dbname}.users lu ON lu.id = tws.leader
      LEFT JOIN ${this.dbname}.users cu ON cu.id = tws.created_by
      WHERE tws.id = @id
        AND tws.status <> '3'
    `;

    const rs = await pool.request().input('id', id).query(sqlQuery);

    if (!rs.recordset.length) {
      throw new NotFoundException('Không tìm thấy lịch công tác');
    }

    const row = rs.recordset[0];

    return {
      id: row.id,
      leader: row.leaderId
        ? { id: row.leaderId, name: row.leaderName }
        : null,
      scheduleType: row.scheduleType,
      calendarFormat: row.calendarFormat,
      travelSchedule: row.travelSchedule,
      workDate: row.workDate,
      fromDate: row.fromDate,
      toDate: row.toDate,
      location: row.location,
      content: row.content,
      morningLocation: row.morningLocation,
      morningContent: row.morningContent,
      afternoonLocation: row.afternoonLocation,
      afternoonContent: row.afternoonContent,
      schedules: row.schedules ? JSON.parse(row.schedules) : null,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdById
        ? { id: row.createdById, name: row.createdByName }
        : null,
    };
  }

  /* =========================
   * UPDATE
   * ========================= */
  async update(id: string, dto: UpdateTravelWorkScheduleDto) {
    const entity = await this.repo.findOne({
      where: { id, status: Not('3') },
    });

    if (!entity) {
      throw new NotFoundException('Không tìm thấy lịch công tác');
    }

    this.validateUpdateDto(dto, entity);

    return this.dataSource.transaction(async (manager) => {
      Object.assign(entity, {
        leader: this.mergeIfDefined(entity.leader, dto.leader),
        scheduleType: this.mergeIfDefined(entity.scheduleType, dto.scheduleType),
        calendarFormat: this.mergeIfDefined(entity.calendarFormat, dto.calendarFormat),
        travelSchedule: this.mergeIfDefined(entity.travelSchedule, dto.travelSchedule),
        status: this.mergeIfDefined(entity.status, dto.status),
      });

      const contentTouched =
        dto.content !== undefined ||
        dto.morningContent !== undefined ||
        dto.afternoonContent !== undefined;

      const locationTouched =
        dto.location !== undefined ||
        dto.morningLocation !== undefined ||
        dto.afternoonLocation !== undefined;

      const dateTouched =
        dto.workDate !== undefined ||
        dto.fromDate !== undefined ||
        dto.toDate !== undefined;

      if (contentTouched) {
        const normalized = this.normalizeContentFields({
          content: dto.content ?? null,
          morningContent: dto.morningContent ?? entity.morningContent,
          afternoonContent: dto.afternoonContent ?? entity.afternoonContent,
        });

        Object.assign(entity, normalized);
      }

      if (locationTouched) {
        const normalized = this.normalizeLocationFields({
          location: dto.location ?? null,
          morningLocation: dto.morningLocation ?? entity.morningLocation,
          afternoonLocation: dto.afternoonLocation ?? entity.afternoonLocation,
        });

        Object.assign(entity, normalized);
      }

      if (dateTouched) {
        const normalized = this.normalizeDateFields({
          workDate: dto.workDate ?? entity.workDate,
          fromDate: dto.fromDate ?? entity.fromDate,
          toDate: dto.toDate ?? entity.toDate,
        });

        Object.assign(entity, normalized);
      }

      if (dto.schedules !== undefined) {
        entity.schedules = dto.schedules;
        if (dto.schedules && dto.schedules.length > 0) {
          // Rebuild summary if schedules provided
          const locations = dto.schedules.map(s => {
            if (s.format === 'session') {
              const sessionLoc = [s.morningLocation, s.afternoonLocation].filter(Boolean).join(' - ');
              return sessionLoc || s.location; // nếu không có morning/afternoon thì dùng location
            }
            return s.location;
          }).filter(Boolean);

          const contents = dto.schedules.map(s => {
            const start = this.formatDateForSummary(s.startDate);
            const end = this.formatDateForSummary(s.endDate);
            let text = s.content;
            if (s.format === 'session') {
              const parts: string[] = [];
              if (s.morningContent) parts.push(`Sáng: ${s.morningContent}`);
              if (s.afternoonContent) parts.push(`Chiều: ${s.afternoonContent}`);
              const sessionText = parts.join('; ');
              if (sessionText) {
                text = sessionText;
              }
            }
            return text ? `(${start} ${end ? '- ' + end : ''}): ${text}` : '';
          }).filter(Boolean);

          entity.location = [...new Set(locations)].join(' | ');
          entity.content = contents.join('\n');
          entity.morningLocation = null;
          entity.afternoonLocation = null;
          entity.morningContent = null;
          entity.afternoonContent = null;
        }
      }

      const updated = await manager.save(TravelWorkScheduleEntity, entity);
      return updated;
    });
  }

  private mergeIfDefined<T>(oldVal: T, newVal: T | undefined): T {
    return newVal !== undefined ? newVal : oldVal;
  }

  /**
   * Validate update DTO
   */
  private validateUpdateDto(
    dto: UpdateTravelWorkScheduleDto,
    entity: TravelWorkScheduleEntity,
  ) {
    const scheduleType = dto.scheduleType ?? entity.scheduleType;

    // Validate date range for multiDay
    if (scheduleType === 'multiDay') {
      const fromDate = dto.fromDate
        ? new Date(dto.fromDate)
        : entity.fromDate;
      const toDate = dto.toDate ? new Date(dto.toDate) : entity.toDate;

      if (fromDate && toDate && fromDate > toDate) {
        throw new BadRequestException(
          'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc',
        );
      }

      if (dto.schedules?.length) {
        const travelSchedule = dto.travelSchedule ?? entity.travelSchedule;
        const isNhieulich = travelSchedule === 'nhieulich';

        for (const item of dto.schedules) {
          // 1. Validate Date
          if (isNhieulich) {
            if (!item.startDate && !item.date) {
              throw new BadRequestException('startDate hoặc date là bắt buộc trong danh sách lịch chi tiết');
            }
          } else {
            if (!item.startDate || !item.endDate) {
              throw new BadRequestException('startDate và endDate là bắt buộc trong danh sách lịch chi tiết');
            }
          }

          // 2. Validate Location/Content
          if (isNhieulich) {
            const hasMain = !!(item.location?.trim() && item.content?.trim());
            const hasMorning = !!(item.morningLocation?.trim() && item.morningContent?.trim());
            const hasAfternoon = !!(item.afternoonLocation?.trim() && item.afternoonContent?.trim());

            if (!hasMain && !hasMorning && !hasAfternoon) {
              throw new BadRequestException('Địa điểm và nội dung là bắt buộc trong danh sách lịch chi tiết');
            }
          } else {
            if (!item.location?.trim() || !item.content?.trim()) {
              throw new BadRequestException('Địa điểm và nội dung là bắt buộc trong danh sách lịch chi tiết');
            }
          }

          if (item.startDate && item.endDate && new Date(item.startDate) > new Date(item.endDate)) {
            throw new BadRequestException(
              'startDate phải nhỏ hơn hoặc bằng endDate trong lịch chi tiết',
            );
          }
        }
      }
    }
  }

  /* =========================
   * DELETE (SOFT)
   * ========================= */
  async delete(dto: DeleteMultipleTravelWorkSchedulesDto) {
    if (!dto.ids?.length) {
      throw new BadRequestException('Danh sách ID không hợp lệ');
    }

    const count = await this.repo.count({
      where: { id: In(dto.ids), status: Not('3') },
    });

    if (count === 0) {
      throw new NotFoundException('Không tìm thấy lịch công tác hợp lệ');
    }

    if (count !== dto.ids.length) {
      throw new ConflictException(
        'Một hoặc nhiều lịch công tác không tồn tại',
      );
    }

    // Validate: không cho phép xóa lịch đã kết thúc
    const schedules = await this.repo.find({
      where: { id: In(dto.ids), status: Not('3') },
      select: ['id', 'toDate', 'workDate'],
    });

    const now = new Date();
    const expiredSchedules: string[] = [];

    for (const schedule of schedules) {
      const endDate = schedule.toDate || schedule.workDate;
      if (endDate && new Date(endDate) < now) {
        expiredSchedules.push(schedule.id);
      }
    }

    if (expiredSchedules.length) {
      throw new BadRequestException({
        message: 'Không được xóa lịch công tác đã kết thúc',
        expiredIds: expiredSchedules,
      });
    }

    await this.repo.update({ id: In(dto.ids) }, { status: '3' });

    return {
      deletedCount: dto.ids.length,
    };
  }

  /* =========================
   * LIST – raw SQL cho dynamic list
   * ========================= */
  async executeListQuery(params: {
    selectFields: string;
    whereClause: string;
    joins: string;
    orderBy: string;
    pagination: { page: number; limit: number; offset: number };
  }): Promise<{ items: any[]; total: number }> {
    const { selectFields, whereClause, joins, orderBy, pagination } = params;
    const pool = await this.getPool();

    const totalSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.travel_work_schedules tws
      ${joins}
      ${whereClause}
    `;

    const rowsSql = `
      SELECT ${selectFields}
      FROM ${this.dbname}.travel_work_schedules tws
      ${joins}
      ${whereClause}
      ORDER BY ${orderBy}
      OFFSET ${pagination.offset} ROWS
      FETCH NEXT ${pagination.limit} ROWS ONLY
    `;

    try {
      const [totalRs, rowsRs] = await Promise.all([
        pool.request().query(totalSql),
        pool.request().query(rowsSql),
      ]);

      return {
        total: totalRs.recordset[0]?.total ?? 0,
        items: rowsRs.recordset,
      };
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException('Lỗi truy vấn lịch công tác');
    }
  }

  async findForNotes(
    dto: ListTravelWorkSchedulesDto,
    originalUserId: string,
    effectiveUserId: string,
    offset: number,
    limit: number,
  ): Promise<{ rows: TravelWorkScheduleRaw[]; total: number }> {
    const pool = await this.getPool();

    const where: string[] = ['t.status <> \'0\''];

    // ---- FILTER DATE OVERLAP ----
    if (dto.filter?.fromDate && dto.filter?.toDate) {
      where.push(`
        (
          -- lịch trong ngày
          (t.work_date IS NOT NULL AND t.work_date BETWEEN @fromDate AND @toDate)

          OR

          -- lịch nhiều ngày
          (t.work_date IS NULL
            AND t.from_date <= @toDate
            AND t.to_date >= @fromDate)
        )
      `);
    } else if (dto.filter?.fromDate) {
      where.push(`
        (
          (t.work_date IS NOT NULL AND t.work_date >= @fromDate)
          OR
          (t.work_date IS NULL AND t.to_date >= @fromDate)
        )
      `);
    } else if (dto.filter?.toDate) {
      where.push(`
        (
          (t.work_date IS NOT NULL AND t.work_date <= @toDate)
          OR
          (t.work_date IS NULL AND t.from_date <= @toDate)
        )
      `);
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    // ---------- DATA QUERY ----------
    const dataRequest = pool.request();
    dataRequest.input('limit', sql.Int, limit);
    dataRequest.input('offset', sql.Int, offset);

    if (dto.filter?.fromDate)
      dataRequest.input('fromDate', sql.Date, dto.filter.fromDate);

    if (dto.filter?.toDate)
      dataRequest.input('toDate', sql.Date, dto.filter.toDate);

    const dataQuery = `
      SELECT
        u.name                 AS leaderName,
        t.location             AS location,
        t.work_date            AS workDate,
        t.from_date            AS fromDate,
        t.to_date              AS toDate,
        t.morning_location     AS morningLocation,
        t.afternoon_location   AS afternoonLocation
      FROM ${this.dbname}.travel_work_schedules t
      JOIN ${this.dbname}.users u ON u.id = t.leader
      ${whereClause}
      ORDER BY COALESCE(t.work_date, t.from_date) DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    // ---------- COUNT QUERY ----------
    const countRequest = pool.request();

    if (dto.filter?.fromDate)
      countRequest.input('fromDate', sql.Date, dto.filter.fromDate);

    if (dto.filter?.toDate)
      countRequest.input('toDate', sql.Date, dto.filter.toDate);

    const countQuery = `
      SELECT COUNT(1) AS total
      FROM ${this.dbname}.travel_work_schedules t
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      dataRequest.query(dataQuery),
      countRequest.query(countQuery),
    ]);

    return {
      rows: dataResult.recordset,
      total: countResult.recordset[0]?.total ?? 0,
    };
  }

}