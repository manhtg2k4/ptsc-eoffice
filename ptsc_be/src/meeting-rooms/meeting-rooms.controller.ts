import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MeetingRoomService } from './meeting-rooms.service';
import { CreateMeetingRoomDto } from './dto/create-meeting-rooms.dto';
import { UpdateMeetingRoomDto } from './dto/update-meeting-rooms.dto';
import { DeleteMeetingRoomDto } from './dto/delete-multiple-meeting-rooms.dto';
import {
  AuthorityGuard,
  AuthorityStages,
  CheckAuthority,
  EffectiveUser,
  OriginalUser
} from 'src/authority-documents';
import { ListMeetingRoomsDto, RoomAvailabilityResponseDto } from './dto/meeting-rooms.dto';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { MeetingRoomsPermissionGuard } from './guard/meeting-rooms-permission.guard';
import { MeetingRoomsPermissionAction, RequireMeetingRoomsPermission } from './decorators/meeting-rooms-permission.decorator';

@ApiTags('Meeting Rooms')
@Controller('meeting-rooms')
@UseGuards(AuthorityGuard)
@UseGuards(MeetingRoomsPermissionGuard)
export class MeetingRoomController {
  constructor(
    private readonly service: MeetingRoomService,
    private readonly systemLogService: SystemLogServiceSql,
  ) { }

  @Get('list')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)  
  // @RequireMeetingRoomsPermission(MeetingRoomsPermissionAction.VIEW)
  @ApiOperation({ summary: 'Danh sách phòng họp' })
  @ApiQuery({ type: ListMeetingRoomsDto, style: 'deepObject', explode: true })
  async list(
    @Query() dto: ListMeetingRoomsDto,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ) {
    // Ghi log truy cập màn danh sách phòng họp
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách phòng họp, trang: ${dto.page || 1}, limit: ${dto.limit || 20}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }

    const result = await this.service.list(dto, originalUserId, effectiveUserId);
    const limit = dto.limit || 20;
    const page = dto.page || 1;
    return {
      success: true,
      items: result.items,
      total: result.total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  @Get('get-all')
  // @RequireMeetingRoomsPermission(MeetingRoomsPermissionAction.VIEW)
  @ApiOperation({ summary: 'Danh sách phòng họp' })
  async findAll(@Query() queryParams: any) {
    const { page = 1, limit = 20 } = queryParams;
    const result = await this.service.getAll(queryParams);

    return {
      success: true,
      data: result.items,
      message: 'Lấy danh sách phòng họp thành công',
      total: result.total,
      page,
      limit,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireMeetingRoomsPermission(MeetingRoomsPermissionAction.CREATE)
  @ApiOperation({ summary: 'Tạo phòng họp mới' })
  async create(@Body() dto: CreateMeetingRoomDto) {
    const room = await this.service.create(dto);
    return {
      status: HttpStatus.CREATED,
      data: room,
      message: 'Tạo phòng họp thành công',
    };
  }

  @Get(':id')
  // @RequireMeetingRoomsPermission(MeetingRoomsPermissionAction.VIEW)
  @ApiOperation({ summary: 'Chi tiết phòng họp' })
  async get(@Param('id') id: string) {
    const room = await this.service.getDetail(id);
    return {
      status: HttpStatus.OK,
      data: room,
    };
  }

  @Put(':id')
  @RequireMeetingRoomsPermission(MeetingRoomsPermissionAction.UPDATE)
  @ApiOperation({ summary: 'Cập nhật phòng họp' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMeetingRoomDto,
  ) {
    const room = await this.service.update(id, dto);
    return {
      status: HttpStatus.OK,
      data: room,
      message: 'Cập nhật phòng họp thành công',
    };
  }

  @Delete()
  @RequireMeetingRoomsPermission(MeetingRoomsPermissionAction.DELETE)
  @ApiOperation({ summary: 'Xóa nhiều phòng họp' })
  async delete(@Body() dto: DeleteMeetingRoomDto) {
    const result = await this.service.delete(dto);
    return {
      status: HttpStatus.OK,
      ...result,
    };
  }

  // meeting-rooms.controller.ts
  @Get(':id/availability')
  // @RequireMeetingRoomsPermission(MeetingRoomsPermissionAction.VIEW)
  @ApiOperation({ summary: 'Kiểm tra phòng họp có sẵn hay không' })
  @ApiResponse({
    status: 200,
    description: 'Trả về trạng thái phòng họp',
    type: RoomAvailabilityResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Phòng họp không tồn tại' })
  async checkAvailability(
    @Param('id') id: string,
  ): Promise<RoomAvailabilityResponseDto> {
    return this.service.checkAvailability(id);
  }

  @Get(':id/schedules')
  @ApiOperation({ summary: 'Lấy danh sách lịch họp của phòng theo ngày' })
  async getSchedules(
    @Param('id') id: string,
    @Query('date') date: string,
  ) {
    const schedules = await this.service.getSchedulesByDate(id, date);
    return {
      success: true,
      data: schedules,
      message: 'Lấy lịch phòng họp thành công',
    };
  }
}