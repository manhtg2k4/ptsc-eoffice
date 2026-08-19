import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateMeetingRoomDto } from './dto/create-meeting-rooms.dto';
import { UpdateMeetingRoomDto } from './dto/update-meeting-rooms.dto';
import { DeleteMeetingRoomDto } from './dto/delete-multiple-meeting-rooms.dto';
import { ListMeetingRoomsDto, RoomAvailabilityResponseDto } from './dto/meeting-rooms.dto';
import { MeetingRoomRepository } from './meeting-rooms.repository';
import { MeetingRoomQueryBuilder } from './helpers/meeting-room-query.builder';
import { MeetingRoomMapper } from './helpers/meeting-room.mapper';
import { ConfigurationService } from 'src/view-config/configuration.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureManagementEntity, StatusFeature } from 'src/feature-management/feature-management.entity';

/**
 * Service: orchestrator
 * - Điều phối các bước xử lý
 * - Gọi helper để build query
 * - Gọi repo để execute
 * - Gọi mapper để transform
 * - KHÔNG chứa logic cụ thể, chỉ gọi và kết hợp
 */
@Injectable()
export class MeetingRoomService {
  private readonly logger = new Logger(MeetingRoomService.name);
  private static readonly AVAILABILITY_BUFFER_MS = 30 * 60 * 1000;

  constructor(
    private readonly meetingRoomRepo: MeetingRoomRepository,
    private readonly queryBuilder: MeetingRoomQueryBuilder,
    private readonly mapper: MeetingRoomMapper,
    private readonly configurationService: ConfigurationService,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private validateLayout(layoutItems?: any[]) {
    if (!layoutItems) return;
    const seatNumbers = new Set<string>();
    for (const item of layoutItems) {
      if (item.itemType === 'CHAIR' && item.seatNumber) {
        const trimmedSeat = item.seatNumber.trim();
        if (seatNumbers.has(trimmedSeat)) {
          throw new BadRequestException(`Mã số ghế "${trimmedSeat}" bị lặp lại trong sơ đồ.`);
        }
        seatNumbers.add(trimmedSeat);
      }
    }
  }

  async create(dto: CreateMeetingRoomDto) {
    this.validateLayout(dto.layoutItems);
    return this.meetingRoomRepo.create(dto);
  }

  async getDetail(id: string) {
    const room = await this.meetingRoomRepo.getDetail(id);
    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng họp');
    }

    const { hasActiveMeetings } = await this.meetingRoomRepo.checkActiveMeetings(id);

    return {
      id: room.id,
      name: room.name,
      location: room.location,
      capacity: room.capacity,
      status: room.status,
      stage: room.stage,
      availableFrom: room.availableFrom,
      image: room.image,
      layoutType: room.layoutType,
      layoutRows: room.layoutRows,
      layoutCols: room.layoutCols,
      layoutSeats: room.layoutSeats,
      layoutBlocks: room.layoutBlocks,
      totalSeating: room.totalSeating,
      layoutColWing: room.layoutColWing,
      layoutRowBottom: room.layoutRowBottom,
      order: room.order,
      hasActiveMeetings, // Flag cho frontend
      amenities: room.amenityLinks?.map(link => ({
        id: link.amenity.id,
        name: link.amenity.name,
        quantity: link.quantity,
      })) ?? [],
      layoutItems: room.layoutItems?.map(item => {
        let propertiesObj: Record<string, unknown> = {};
        if (item.properties) {
          try {
            propertiesObj = JSON.parse(item.properties);
          } catch {
            propertiesObj = {};
          }
        }
        return {
          id: item.id,
          itemType: item.itemType,
          subType: item.subType,
          row: item.row,
          col: item.col,
          rowSpan: item.rowSpan,
          colSpan: item.colSpan,
          rotation: item.rotation,
          seatNumber: item.seatNumber,
          label: item.label,
          properties: propertiesObj,
        };
      }) ?? [],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getAll(queryParams: any) {
    const page = Math.max(Number(queryParams.page) || 1, 1);
    const limit = Math.min(Math.max(Number(queryParams.limit) || 9999, 1), 9999);
    const skip = (page - 1) * limit;

    const [rooms, total] = await this.meetingRoomRepo.findAll({
      name: queryParams.name,
      skip,
      take: limit,
      sort: queryParams.sort,
    });

    const bookedRoomIds = await this.meetingRoomRepo.getAllBookedRoomIds();

    return {
      items: rooms.map(r => ({
        id: r.id,
        name: r.name,
        location: r.location,
        capacity: r.capacity,
        status: r.status,
        stage: r.stage,
        availableFrom: r.availableFrom,
        image: r.image,
        layoutType: r.layoutType,
        layoutRows: r.layoutRows,
        layoutCols: r.layoutCols,
        layoutSeats: r.layoutSeats,
        layoutBlocks: r.layoutBlocks,
        totalSeating: r.totalSeating,
        layoutColWing: r.layoutColWing,
        layoutRowBottom: r.layoutRowBottom,
        order: r.order,
        hasActiveMeetings: bookedRoomIds.has(r.id), // Flag cho frontend
      })),
      total,
      page,
      limit,
    };
  }

  async update(id: string, dto: UpdateMeetingRoomDto) {
    this.validateLayout(dto.layoutItems);
    return this.meetingRoomRepo.update(id, dto);
  }

  async delete(dto: DeleteMeetingRoomDto) {
    return this.meetingRoomRepo.delete(dto);
  }

  /**
   * List: orchestrate các bước
   * 1. Build query components (where, join, select)
   * 2. Execute query
   * 3. Map raw data
   */
  async list(dto: ListMeetingRoomsDto, userId: string, authorId?: string) {
    const { page = 1, limit = 20, filter, sort = { order: 'asc', updated_at: 'desc' }, processFn, authority, isExport, isListDynamic, view } = dto;

    // Step 1: Resolve userId
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const effectiveUserId = authority === 'true' && authorId ? authorId : userId;

    // Step 2: Get feature management config
    const featureManagement = await this.featureManagementRepo.findOne({
      where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE },
    });

    // Step 3: Build criteria from filter
    const { startTime, endTime, normalFilter } = this.normalizeTimeFilter(filter);
    const filterCriteria = this.queryBuilder.buildCriteriaFromFilter(normalFilter);
    const featureCriteria = featureManagement?.criteria ?? [];
    const allCriteria = [...featureCriteria, ...filterCriteria];

    // Step 4: Build WHERE clause
    const { whereClause, joins } = this.queryBuilder.buildWhereClause(
      allCriteria,
      featureManagement,
      isListDynamic
    );

    // Step 5: Build SELECT fields
    const { selectFields, aliases } = await this.queryBuilder.buildSelectFields(
      processFn,
      this.configurationService,
    );

    const availabilityCondition = isListDynamic === 'false' 
      ? this.queryBuilder.buildAvailabilityCondition(startTime, endTime)
      : '';

    // Step 6: Build pagination
    const pagination = this.queryBuilder.buildPagination(page, limit);

    // Step 7: Build ORDER BY
    const orderBy = this.queryBuilder.buildOrderBy(sort, aliases);

    // Step 8: Execute query
    const { items: rawItems, total } = await this.meetingRoomRepo.executeListQuery({
      selectFields,
      whereClause,
      joins,
      orderBy,
      pagination,
      availabilityCondition,
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

    // Batch check active meetings for all items in list
    const bookedRoomIds = await this.meetingRoomRepo.getAllBookedRoomIds();

    // Step 10: Map raw data to response format
    let enrichedItems = rawItems.map(item => ({
      ...item,
      hasActiveMeetings: bookedRoomIds.has(item.id),
    }));

    if (view === 'true') {
      enrichedItems = enrichedItems.map(item => ({
        ...item,
        flags: {
          ...(item.flags ?? {}),
          view: true,
        },
      }));
    }    
    let mappedItems;
    if (isListDynamic === 'false') {
      mappedItems = this.mapper.mapListItems(enrichedItems, aliases, isExport, isListDynamic);
    } else {
      mappedItems = this.mapper.mapListItems(enrichedItems, aliases, isExport, isListDynamic);
    }

    // Step 11: Build response
    return {
      items: mappedItems,
      total,
    };
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  normalizeTimeFilter(filter: any): {
    startTime?: string;
    endTime?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    normalFilter: any;
  } {
    if (!filter) {
      return { startTime: undefined, endTime: undefined, normalFilter: {} };
    }
    const { startTime, endTime, meetingDate, meetingTime, ...rest } = filter;
    if (startTime || endTime) {
      const start = startTime ? new Date(startTime) : undefined;
      const end = endTime
        ? new Date(new Date(endTime).getTime() + MeetingRoomService.AVAILABILITY_BUFFER_MS)
        : undefined;
      return {
        startTime: start ? this.formatLocal(start) : undefined,
        endTime: end ? this.formatLocal(end) : undefined,
        normalFilter: rest,
      };
    }
    if (meetingDate && meetingTime) {
      const match = meetingTime.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
      if (!match) {
        throw new BadRequestException('meetingTime format must be HH:mm-HH:mm');
      }
      const [, sh, sm, eh, em] = match.map(Number);
      if (sh > 23 || eh > 23 || sm > 59 || em > 59) {
        throw new BadRequestException('Invalid meetingTime value');
      }
      const start = new Date(`${meetingDate}T00:00:00`);
      const end = new Date(start);
      start.setHours(sh, sm, 0, 0);
      end.setHours(eh, em, 0, 0);

      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }
      const startWithBuffer = new Date(
        start.getTime() - MeetingRoomService.AVAILABILITY_BUFFER_MS,
      );
      return {
        startTime: this.formatLocal(startWithBuffer),
        endTime: this.formatLocal(end),
        normalFilter: rest,
      };
    }

    return {
      startTime: undefined,
      endTime: undefined,
      normalFilter: rest,
    };
  }

  private formatLocal(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
          `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  /**
   * Check availability: delegate to repository
   */
  async checkAvailability(roomId: string): Promise<RoomAvailabilityResponseDto> {
    return this.meetingRoomRepo.checkAvailability(roomId);
  }

  async hasFutureMeetings(roomIds: string[]): Promise<string[]> {
    return this.meetingRoomRepo.hasFutureMeetings(roomIds);
  }

  /**
   * Lấy danh sách lịch họp của phòng theo ngày
   */
  async getSchedulesByDate(roomId: string, date: string) {
    if (!date) {
      throw new BadRequestException('Vui lòng cung cấp ngày (date) theo định dạng YYYY-MM-DD');
    }
    return this.meetingRoomRepo.getRoomSchedulesByDate(roomId, date);
  }
}