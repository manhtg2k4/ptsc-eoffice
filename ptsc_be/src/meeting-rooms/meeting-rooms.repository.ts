import { 
  Injectable, 
  Logger, 
  NotFoundException, 
  BadRequestException, 
  ConflictException, 
  InternalServerErrorException 
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, DataSource, EntityManager } from 'typeorm';
import { MeetingRoomEntity } from './entities/meeting-rooms.entity';
import { AmenitiesEntity } from 'src/meeting-room-amenities/entities/amenities.entity';
import { MeetingRoomAmenityEntity } from './entities/meeting-rooms-amenities.entity';
import { MeetingRoomLayoutItemEntity } from './entities/meeting-room-layout-item.entity';
import { CreateMeetingRoomDto } from './dto/create-meeting-rooms.dto';
import { UpdateMeetingRoomDto } from './dto/update-meeting-rooms.dto';
import { DeleteMeetingRoomDto } from './dto/delete-multiple-meeting-rooms.dto';
import { STATUS, ROOM_STAGE } from 'src/variables/CONST_STATUS';
import * as sql from 'mssql';
import { getMssqlPool } from 'src/database/mssql.pool';
import { normalizeDateValueDDMMYYYY, mapActionToLabel } from '../meeting/helper/build.meeting.filter';
import { ConfigService } from '@nestjs/config';
import { RoomAvailabilityResponseDto } from './dto/meeting-rooms.dto';

export enum MEETING_TIME_STATUS {
    DU_KIEN = 'DU_KIEN',
    CHUAN_BI = 'CHUAN_BI',
    DANG_HOP = 'DANG_HOP',
    KET_THUC = 'KET_THUC',
  }
@Injectable()
export class MeetingRoomRepository {
  private dbname: string;
  private readonly logger = new Logger(MeetingRoomRepository.name);
  private pool: sql.ConnectionPool | null = null;

  constructor(
    @InjectRepository(MeetingRoomEntity, 'mssqlConnection')
    private readonly repo: Repository<MeetingRoomEntity>,
    @InjectRepository(MeetingRoomAmenityEntity, 'mssqlConnection')
    private readonly linkRepo: Repository<MeetingRoomAmenityEntity>,
    @InjectRepository(AmenitiesEntity, 'mssqlConnection')
    private readonly amenityRepo: Repository<AmenitiesEntity>,
    private readonly configService: ConfigService,
    @InjectDataSource('mssqlConnection')
    private dataSource: DataSource,
  ) {}
  private getDatabaseName(): string {
    const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
    if (!dbName) throw new Error('SQLSERVER_DATABASE not defined in .env');
    return dbName + '.dbo';
  }
  onModuleInit() {
    this.dbname = this.getDatabaseName();
  }
  private async getPool(): Promise<sql.ConnectionPool> {
    if (this.pool && this.pool.connected) return this.pool;
    this.pool = await getMssqlPool(this.configService);
    if (!this.pool.connected) throw new Error('MSSQL pool not connected');
    return this.pool;
  }

  /** CREATE with amenities */
  async create(dto: CreateMeetingRoomDto): Promise<MeetingRoomEntity> {
    // Validate duplicate name
    const existing = await this.repo.findOne({
      where: { name: dto.name, status: In([STATUS.ACTIVED, STATUS.LOCKED]) },
    });
    if (existing) {
      throw new BadRequestException(`Tên phòng đã tồn tại: ${dto.name}`);
    }

    // Validate amenities nếu có
    if (dto.amenities?.length) {
      const amenityIds = dto.amenities.map(a => a.amenityId);
      const existingAmenities = await this.amenityRepo.find({
        where: { id: In(amenityIds), status: STATUS.ACTIVED },
      });

      if (existingAmenities.length !== amenityIds.length) {
        const foundIds = existingAmenities.map(a => a.id);
        const missingIds = amenityIds.filter(id => !foundIds.includes(id));
        throw new BadRequestException(
          `Các thiết bị không tồn tại hoặc không active: ${missingIds.join(', ')}`
        );
      }
    }

    // Transaction: create room + amenity links
    return this.dataSource.transaction(async (manager) => {
      // 1. Create room
      const room = this.repo.create({
        name: dto.name,
        image: dto.image,
        location: dto.location,
        capacity: dto.capacity,
        status: STATUS.ACTIVED,
        stage: dto.stage || STATUS.ACTIVED,
        availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : null,
        layoutType: dto.layoutType,
        layoutRows: dto.layoutRows,
        layoutCols: dto.layoutCols,
        layoutSeats: dto.layoutSeats,
        layoutBlocks: dto.layoutBlocks,
        totalSeating: dto.totalSeating,
        layoutColWing: dto.layoutColWing,
        layoutRowBottom: dto.layoutRowBottom,
        order: dto.order ?? 1,
      });
      const savedRoom = await manager.save(MeetingRoomEntity, room);

      // 2. Create amenity links
      if (dto.amenities?.length) {
        await this.insertAmenitiesWithOpenJson(manager, savedRoom.id, dto.amenities);
      }

      // 3. Create layout items
      if (dto.layoutItems?.length) {
        await this.insertLayoutItemsWithOpenJson(manager, savedRoom.id, dto.layoutItems);
      }

      return savedRoom;
    });
  }

  async findAll(filter: {
    name?: string;
    skip: number;
    take: number;
    sort?: string;
  }) {
    const qb = this.repo.createQueryBuilder('room')
      .where('room.status != :deleted', { deleted: STATUS.DELETED });
    if (filter.name && filter.name.trim() !== '') {
      qb.andWhere('LOWER(room.name) LIKE LOWER(:name)', {
        name: `%${filter.name.trim()}%`,
      });
    }
    const sortMap: Record<string, string> = {
      createdAt: 'room.createdAt',
      name: 'room.name',
      capacity: 'room.capacity',
      status: 'room.status',
      order: 'room.order',
    };
    const sortField = sortMap[filter.sort ?? ''] || 'room.createdAt';
    qb.orderBy(sortField, 'DESC');
    qb.skip(filter.skip).take(filter.take);

    return qb.getManyAndCount();
  }

  /** FIND BY ID with amenities and layout items */
  async getDetail(id: string): Promise<MeetingRoomEntity> {
    const room = await this.repo.findOne({
      where: { id, status: Not(STATUS.DELETED) },
      relations: ['amenityLinks', 'amenityLinks.amenity', 'layoutItems'],
    });
    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng họp: ${id}`);
    }
    return room;
  }

  /** UPDATE with amenities */
  async update(id: string, dto: UpdateMeetingRoomDto): Promise<MeetingRoomEntity> {
    const room = await this.repo.findOne({
      where: { id, status: Not(STATUS.DELETED) },
    });
    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng họp: ${id}`);
    }

    // Cảnh báo nếu chuyển sang trạng thái Bảo trì (stage = 2) mà đang có lịch họp
    if (dto.stage === ROOM_STAGE.LOCKED) {
      const { hasActiveMeetings } = await this.checkActiveMeetings(id);
      if (hasActiveMeetings) {
        throw new ConflictException(
          'Phòng họp chưa thể "Bảo trì" vì hiện đang có cuộc họp đăng ký sử dụng. Vui lòng hủy hoặc chuyển cuộc họp sang phòng khác trước khi bảo trì.',
        );
      }
    }

    // Validate duplicate name
    if (dto.name && dto.name !== room.name) {
      const existing = await this.repo.findOne({
        where: { 
          name: dto.name, 
          status: In([STATUS.ACTIVED, STATUS.LOCKED]), 
          id: Not(id) 
        },
      });
      if (existing) {
        throw new ConflictException(`Tên phòng họp đã tồn tại: ${dto.name}`);
      }
    }

    // Validate amenities nếu có update
    if (dto.amenities?.length) {
      const amenityIds = dto.amenities.map(a => a.amenityId);
      const existingAmenities = await this.amenityRepo.find({
        where: { id: In(amenityIds), status: STATUS.ACTIVED },
      });

      if (existingAmenities.length !== amenityIds.length) {
        const foundIds = existingAmenities.map(a => a.id);
        const missingIds = amenityIds.filter(id => !foundIds.includes(id));
        throw new BadRequestException(
          `Các thiết bị không tồn tại hoặc không active: ${missingIds.join(', ')}`
        );
      }
    }

    // Transaction: update room + amenity links
    return this.dataSource.transaction(async (manager) => {
      // 1. Update room fields
      if (dto.name !== undefined) room.name = dto.name;
      if (dto.image !== undefined) room.image = dto.image;
      if (dto.location !== undefined) room.location = dto.location;
      if (dto.capacity !== undefined) room.capacity = dto.capacity;
      if (dto.status !== undefined) room.status = dto.status;
      if (dto.stage !== undefined) room.stage = dto.stage;
      if (dto.availableFrom !== undefined) {
        room.availableFrom = dto.availableFrom ? new Date(dto.availableFrom) : null;
      }
      if (dto.layoutType !== undefined) room.layoutType = dto.layoutType;
      if (dto.layoutRows !== undefined) room.layoutRows = dto.layoutRows;
      if (dto.layoutCols !== undefined) room.layoutCols = dto.layoutCols;
      if (dto.layoutSeats !== undefined) room.layoutSeats = dto.layoutSeats;
      if (dto.layoutBlocks !== undefined) room.layoutBlocks = dto.layoutBlocks;
      if (dto.totalSeating !== undefined) room.totalSeating = dto.totalSeating;
      if (dto.layoutColWing !== undefined) room.layoutColWing = dto.layoutColWing;
      if (dto.layoutRowBottom !== undefined) room.layoutRowBottom = dto.layoutRowBottom;
      if (dto.order !== undefined) room.order = dto.order;

      const updatedRoom = await manager.save(MeetingRoomEntity, room);

      // 2. Update amenities nếu có
      if (dto.amenities !== undefined) {
        // Xóa links cũ
        await manager.delete(MeetingRoomAmenityEntity, { meetingRoomId: id });

        // Tạo links mới
        if (dto.amenities.length > 0) {
          await this.insertAmenitiesWithOpenJson(manager, id, dto.amenities);
        }
      }

      // 3. Update layoutItems nếu có
      if (dto.layoutItems !== undefined) {
        // Xóa items cũ
        await manager.delete(MeetingRoomLayoutItemEntity, { meetingRoomId: id });

        // Tạo items mới
        if (dto.layoutItems.length > 0) {
          await this.insertLayoutItemsWithOpenJson(manager, id, dto.layoutItems);
        }
      }

      return updatedRoom;
    });
  }

  /**
   * Helper to check if room has active meetings
   */
  async checkActiveMeetings(roomId: string): Promise<{ hasActiveMeetings: boolean; count: number }> {
    const pool = await this.getPool();
    const sqlQuery = `
      SELECT COUNT(*) AS count
      FROM ${this.dbname}.meetings m
      WHERE m.status = '1'
        AND m.meeting_state NOT IN ('KET_THUC', 'DA_HUY')
        AND (
          m.meeting_date > CAST(GETDATE() AS DATE)
          OR (
            m.meeting_date = CAST(GETDATE() AS DATE)
            AND RIGHT(m.meeting_time, 5) > FORMAT(GETDATE(), 'HH:mm')
          )
        )
        AND (
          m.room_ids = @roomId
          OR m.room_ids LIKE @roomIdStart
          OR m.room_ids LIKE @roomIdMiddle
          OR m.room_ids LIKE @roomIdEnd
        )
    `;

    const sanitizedRoomId = String(roomId).replace(/'/g, "''");
    const result = await pool
      .request()
      .input('roomId', sanitizedRoomId)
      .input('roomIdStart', `${sanitizedRoomId},%`)
      .input('roomIdMiddle', `%,${sanitizedRoomId},%`)
      .input('roomIdEnd', `%,${sanitizedRoomId}`)
      .query(sqlQuery);

    const count = result.recordset[0]?.count ?? 0;
    return {
      hasActiveMeetings: count > 0,
      count,
    };
  }

  /**
   * Helper to get all room IDs that currently have active meetings
   */
  async getAllBookedRoomIds(): Promise<Set<string>> {
    const pool = await this.getPool();
    const sqlQuery = `
      SELECT DISTINCT LTRIM(RTRIM(value)) as roomId
      FROM ${this.dbname}.meetings m
      CROSS APPLY STRING_SPLIT(m.room_ids, ',')
      WHERE m.status = '1'
        AND m.meeting_state NOT IN ('KET_THUC', 'DA_HUY','HUY', 'TU_CHOI')
        AND NOT EXISTS (
          SELECT 1
          FROM (
            SELECT TOP 1 a.action_code
            FROM ${this.dbname}.audit a WITH (NOLOCK)
            WHERE a.document_id = CAST(m.id AS NVARCHAR(64))
              AND a.type_document = 'Meeting'
            ORDER BY a.created_at DESC, a.id DESC
          ) latest_audit
          WHERE latest_audit.action_code = 'TU_CHOI_LICH'
        )
        AND (
          m.meeting_date > CAST(GETDATE() AS DATE)
          OR (
            m.meeting_date = CAST(GETDATE() AS DATE)
            AND RIGHT(m.meeting_time, 5) > FORMAT(GETDATE(), 'HH:mm')
          )
        )
    `;

    const result = await pool.request().query(sqlQuery);
    return new Set(result.recordset.map(r => r.roomId));
  }

  /** DELETE (soft delete) */
  async delete(dto: DeleteMeetingRoomDto) {
    if (!dto.ids?.length) {
      throw new BadRequestException('Cần cung cấp danh sách ID để xóa.');
    }

    const roomsWithMeetings = await this.hasFutureMeetings(dto.ids);
    if (roomsWithMeetings.length) {
      throw new ConflictException(
        `Phòng họp chưa thể xóa vì hiện đang có cuộc họp đăng ký sử dụng.`,
      );
    }

    const rooms = await this.repo.find({
      where: { id: In(dto.ids), status: Not(STATUS.DELETED) },
      select: ['id', 'stage'],
    });

    if (!rooms.length) {
      throw new NotFoundException('Không tìm thấy phòng họp hợp lệ để xóa.');
    }

    if (rooms.length !== dto.ids.length) {
      throw new ConflictException('Một hoặc nhiều phòng họp không tồn tại hoặc đã bị xoá.');
    }

    const invalidRooms = rooms.filter(r => r.stage === 3 || r.stage === 4);
    if (invalidRooms.length > 0) {
      throw new ConflictException(
        'Phòng họp chưa thể xóa vì hiện đang có cuộc họp đăng ký sử dụng. Vui lòng hủy hoặc chuyển cuộc họp sang phòng khác trước khi xóa.',
      );
    }

    // Soft delete room
    await this.repo.update({ id: In(dto.ids) }, { status: STATUS.DELETED });


    return {
      deletedCount: dto.ids.length,
      message: `Đã xóa thành công ${dto.ids.length} phòng họp.`,
    };
  }

  /**
   * Check room availability (stage 3, 4 = đang họp)
   */
  async checkAvailability(roomId: string): Promise<RoomAvailabilityResponseDto> {
    const pool = await this.getPool();

    // Validate room exists và lấy stage
    const checkRoomSql = `
      SELECT id, name, stage
      FROM ${this.dbname}.meeting_rooms
      WHERE id = @roomId AND status = 1
    `;

    let roomResult;
    try {
      roomResult = await pool.request().input('roomId', roomId).query(checkRoomSql);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi kiểm tra phòng họp');
    }

    if (!roomResult.recordset.length) {
      throw new NotFoundException('Phòng họp không tồn tại');
    }

    const room = roomResult.recordset[0];
    const roomName = room.name;
    const roomStage = room.stage;

    // Check stage của phòng (3 hoặc 4 = đang họp)
    if (roomStage !== 3 && roomStage !== 4) {
      // Phòng trống
      return {
        available: true,
        message: `Phòng "${roomName}" đang sẵn sàng`,
      };
    }

    // Phòng đang bận - lấy danh sách meetings đang sử dụng phòng
    const checkMeetingsSql = `
      SELECT 
        m.id,
        m.title,
        m.meeting_date AS meetingDate,
        m.meeting_time AS meetingTime,
        m.status_code AS statusCode
      FROM ${this.dbname}.meetings m
      WHERE m.status = '1'
        AND m.meeting_state NOT IN ('KET_THUC', 'DA_HUY')
        AND (
          m.meeting_date > CAST(GETDATE() AS DATE)
          OR (
            m.meeting_date = CAST(GETDATE() AS DATE)
            AND RIGHT(m.meeting_time, 5) > FORMAT(GETDATE(), 'HH:mm')
          )
        )
        AND (
          m.room_ids = @roomId
          OR m.room_ids LIKE @roomIdStart
          OR m.room_ids LIKE @roomIdMiddle
          OR m.room_ids LIKE @roomIdEnd
        )
      ORDER BY m.meeting_date DESC, m.meeting_time DESC
    `;

    let meetingsResult;
    try {
      const sanitizedRoomId = String(roomId).replace(/'/g, "''");
      meetingsResult = await pool
        .request()
        .input('roomId', sanitizedRoomId)
        .input('roomIdStart', `${sanitizedRoomId},%`)
        .input('roomIdMiddle', `%,${sanitizedRoomId},%`)
        .input('roomIdEnd', `%,${sanitizedRoomId}`)
        .query(checkMeetingsSql);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi kiểm tra lịch họp');
    }

    const activeMeetings = meetingsResult.recordset;

    return {
      available: false,
      message: `Phòng "${roomName}" đang có ${activeMeetings.length} lịch họp đang diễn ra`,
      activeMeetings: activeMeetings.map((m) => ({
        id: m.id,
        title: m.title,
        meetingDate: normalizeDateValueDDMMYYYY(m.meetingDate),
        meetingTime: m.meetingTime,
        statusCode: m.statusCode,
      })),
    };
  }

  /**
   * Kiểm tra danh sách phòng họp xem có lịch nào trong tương lai hay không
   * Trả về danh sách ID của các phòng đang có lịch.
   */
  async hasFutureMeetings(roomIds: string[]): Promise<string[]> {
    if (!roomIds?.length) return [];
    //status=1 đang hoạt động

    const pool = await this.getPool();
    const sql = `
      SELECT DISTINCT LTRIM(RTRIM(s.value)) as roomId
      FROM ${this.dbname}.meetings m
      CROSS APPLY STRING_SPLIT(m.room_ids, ',') s
      WHERE m.status = '1'
        AND m.meeting_state NOT IN ('DA_HUY')
        AND m.is_cancelled = 0
        AND LTRIM(RTRIM(s.value)) IN (${roomIds.map((id) => `'${id}'`).join(',')})
        AND (
          m.meeting_date > CAST(GETDATE() AS DATE)
          OR (
            m.meeting_date = CAST(GETDATE() AS DATE) 
            AND CAST(SUBSTRING(m.meeting_time, 1, 5) AS TIME) > CAST(GETDATE() AS TIME)
          )
        )
    `;

    try {
      const result = await pool.request().query(sql);
      return result.recordset.map((r) => r.roomId);
    } catch (error) {
      this.logger.error('Error in hasFutureMeetings:', error);
      return [];
    }
  }
  
  /**
   * Execute list query (giữ nguyên)
   */
  async executeListQuery(params: {
    selectFields: string;
    whereClause: string;
    joins: string;
    orderBy: string;
    pagination: { page: number; limit: number; offset: number };
    availabilityCondition?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Promise<{ items: any[]; total: number }> {
    const { selectFields, whereClause, joins, orderBy, pagination, availabilityCondition = '' } = params;
    const pool = await this.getPool();

    const totalSql = `SELECT COUNT(*) AS total FROM meeting_rooms ${joins} ${whereClause} ${availabilityCondition}`;
    const rowsSql = `
      SELECT ${selectFields} 
      FROM meeting_rooms ${joins} 
      ${whereClause}
      ${availabilityCondition}
      ORDER BY ${orderBy} 
      OFFSET ${pagination.offset} ROWS 
      FETCH NEXT ${pagination.limit} ROWS ONLY
    `;


    try {
      const [totalResult, rowsResult] = await Promise.all([
        pool.request().query(totalSql),
        pool.request().query(rowsSql),
      ]);

      const total = totalResult.recordset[0]?.total ?? 0;
      const items = rowsResult.recordset;

      return { items, total };
    } catch (error) {
      this.logger.error('Query error:', error);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu');
    }
  }

  async updateStatusMeetingRoom(
    meetingId: string,
    meetingState: MEETING_TIME_STATUS,
  ): Promise<void> {
    const pool = await this.getPool();
    const executor = pool.request();

    executor.input('meetingId', sql.UniqueIdentifier, meetingId);
    executor.input('meetingState', sql.VarChar, meetingState);

    await executor.query(`
      UPDATE mr
      SET
        mr.stage =
          CASE @meetingState
            WHEN 'DU_KIEN'      THEN 3
            WHEN 'CHUAN_BI'     THEN 3
            WHEN 'DANG_HOP'     THEN 4
            WHEN 'KET_THUC'  THEN 1
            ELSE mr.stage
          END,
        mr.updated_at = GETDATE()
      FROM ${this.dbname}.meeting_rooms mr
      INNER JOIN ${this.dbname}.meetings m
        ON mr.id IN (
          SELECT LTRIM(RTRIM(value))
          FROM STRING_SPLIT(m.room_ids, ',')
        )
      WHERE m.id = @meetingId
    `);
  }

  private generateEntityId(): string {
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `${timestamp}-${random}`;
  }

  private async insertLayoutItemsWithOpenJson(
    manager: EntityManager,
    meetingRoomId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    layoutItems: any[],
  ): Promise<void> {
    if (!layoutItems || layoutItems.length === 0) return;

    const itemsPayload = layoutItems.map(item => ({
      id: this.generateEntityId(),
      itemType: item.itemType,
      subType: item.subType ?? null,
      row: Number(item.row),
      col: Number(item.col),
      rowSpan: Number(item.rowSpan ?? 1),
      colSpan: Number(item.colSpan ?? 1),
      rotation: Number(item.rotation ?? 0),
      seatNumber: item.seatNumber ?? null,
      label: item.label ?? null,
      properties: item.properties ? (typeof item.properties === 'string' ? item.properties : JSON.stringify(item.properties)) : null,
    }));

    const jsonString = JSON.stringify(itemsPayload);

    await manager.query(
      `
      INSERT INTO meeting_room_layout_items (
        id, meeting_room_id, item_type, sub_type, [row], [col], row_span, col_span, rotation, seat_number, label, properties, created_at, updated_at
      )
      SELECT 
        j.id,
        @0,
        j.itemType,
        j.subType,
        j.row,
        j.col,
        ISNULL(j.rowSpan, 1),
        ISNULL(j.colSpan, 1),
        ISNULL(j.rotation, 0),
        j.seatNumber,
        j.label,
        j.properties,
        GETDATE(),
        GETDATE()
      FROM OPENJSON(@1) WITH (
        id varchar(40) '$.id',
        itemType varchar(50) '$.itemType',
        subType varchar(50) '$.subType',
        row int '$.row',
        col int '$.col',
        rowSpan int '$.rowSpan',
        colSpan int '$.colSpan',
        rotation int '$.rotation',
        seatNumber nvarchar(50) '$.seatNumber',
        label nvarchar(255) '$.label',
        properties nvarchar(MAX) '$.properties'
      ) AS j;
      `,
      [meetingRoomId, jsonString],
    );
  }

  private async insertAmenitiesWithOpenJson(
    manager: EntityManager,
    meetingRoomId: string,
    amenities: { amenityId: string; quantity: number }[],
  ): Promise<void> {
    if (!amenities || amenities.length === 0) return;

    const amenitiesPayload = amenities.map(a => ({
      id: this.generateEntityId(),
      amenityId: a.amenityId,
      quantity: Number(a.quantity),
    }));

    const jsonString = JSON.stringify(amenitiesPayload);

    await manager.query(
      `
      INSERT INTO meeting_rooms_amenities (
        id, meeting_room_id, amenity_id, quantity, created_at, updated_at
      )
      SELECT 
        j.id,
        @0,
        j.amenityId,
        j.quantity,
        GETDATE(),
        GETDATE()
      FROM OPENJSON(@1) WITH (
        id varchar(40) '$.id',
        amenityId varchar(40) '$.amenityId',
        quantity int '$.quantity'
      ) AS j;
      `,
      [meetingRoomId, jsonString],
    );
  }

  /**
   * Lấy danh sách lịch họp của phòng theo ngày
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getRoomSchedulesByDate(roomId: string, dateStr: string): Promise<any[]> {
    const pool = await this.getPool();
    const sanitizedRoomId = String(roomId).replace(/'/g, "''");

    const sqlQuery = `
      SELECT 
        m.id,
        m.title,
        m.meeting_time AS meetingTime,
        m.meeting_state AS meetingState,
        m.status_code AS statusCode,
        m.meeting_date AS meetingDate
      FROM ${this.dbname}.meetings m
      WHERE m.status = '1'
        AND m.meeting_state NOT IN ('DA_HUY', 'HUY', 'TU_CHOI')
        AND m.is_cancelled = 0
        AND m.meeting_date = @date
        AND (
          m.room_ids = @roomId
          OR m.room_ids LIKE @roomIdStart
          OR m.room_ids LIKE @roomIdMiddle
          OR m.room_ids LIKE @roomIdEnd
        )
        AND (
          CAST(@date AS DATE) <> CAST(GETDATE() AS DATE)
          OR LTRIM(RTRIM(SUBSTRING(m.meeting_time, CHARINDEX('-', m.meeting_time) + 1, 10))) > FORMAT(GETDATE(), 'HH:mm')
        )
      ORDER BY LTRIM(RTRIM(SUBSTRING(m.meeting_time, 1, CHARINDEX('-', m.meeting_time) - 1))) ASC
    `;

    const result = await pool
      .request()
      .input('roomId', sanitizedRoomId)
      .input('roomIdStart', `${sanitizedRoomId},%`)
      .input('roomIdMiddle', `%,${sanitizedRoomId},%`)
      .input('roomIdEnd', `%,${sanitizedRoomId}`)
      .input('date', sql.Date, new Date(dateStr))
      .query(sqlQuery);

    return result.recordset.map(m => {
      const times = m.meetingTime ? m.meetingTime.split('-') : [];
      return {
        id: m.id,
        title: m.title,
        meetingDate: normalizeDateValueDDMMYYYY(m.meetingDate),
        startTime: times[0] || '',
        endTime: times[1] || '',
        meetingState: mapActionToLabel(m.meetingState || m.statusCode),
        meetingTime: m.meetingTime,
      };
    });
  }
}