import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Get,
  UnauthorizedException,
  UseGuards,
  Query,
  Delete,
  Req,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { MeetingService } from './meeting.service';
import {
  CreateMeetingDto,
  UpdateMeetingDto,
  DeleteMeetingsDto,
  DelegateMeetingPayload,
} from './dto/meeting.dto';
import {
  AuthorityGuard,
  AuthorityStages,
  CheckAuthority,
  EffectiveUser,
  OriginalUser,
} from 'src/authority-documents';
import { MeetingDetailDto } from './dto/meeting-detail.dto';
import { WorkItemsService } from 'src/work-items/work-items.service';
import { ReplaceRoomParticipantsDto, GetMeetingParticipantsQueryDto, ReplaceRoomParticipantsAllRoomDto } from './dto/meeting-participants.dto';
import { WorkItemDto } from 'src/work-items/dto/work-item.dto';
import { MeetingConclusionDetailDto } from './dto/meeting-conclusion.dto';
import {
  AddMeetingRelationsResponseDto,
  AddMeetingRelationsDto,
  RemoveMeetingRelationsDto,
} from './dto/meeting-relation.dto';
import {
  CreateMeetingConclusionDto,
  CreateMeetingConclusionResponseDto,
  CreateMeetingConclusionsAndRelationsResponseDto,
  CreateMeetingConclusionsAndRelationsDto,
  DeleteMeetingConclusionResponseDto,
  GetMeetingConclusionDetailResponseDto,
  GetMeetingConclusionsResponseDto,
  UpdateMeetingConclusionResponseDto,
  UpdateMeetingConclusionsAndRelationsDto
} from './dto/meeting-conclusions.dto';
import {
  CheckRoomConflictDto,
  CheckUserConflictDto,
} from './dto/meeting.check.dto';
import { UpdateMeetingProcessingStateDto } from 'src/meeting/dto/meeting.update.dto';
import { AudioTranscriptResponseDto, CreateAudioTranscriptDto, UpdateTranscriptTextDto } from './dto/audio-transcript.dto';
import { listConclusionsFromKMeetingDto, listMeetingAttendanceReportDto, ListMeetingByTimeDto, ListMeetingRoomsStatsDto } from './dto/meeting-rooms-stats.dto';
import { ListDocumentsOverDueDto } from 'src/documents/dto/list-documents.dto';
import { MeetingPermissionGuard } from './guard/meeting-permission.guard';
import { MeetingPermissionAction, RequireMeetingPermission } from './decorators/meeting-permission.decorator';
@ApiTags('Cuộc họp')
@Controller('meetings')
@UseGuards(AuthorityGuard)
@UseGuards(MeetingPermissionGuard)
export class MeetingController {
  private readonly logger = new Logger(MeetingController.name);
  constructor(
    private readonly service: MeetingService,
  ) { }

  @Get('get-action')
  // @RequireMeetingPermission(MeetingPermissionAction.CREATE)
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @ApiOperation({ summary: 'Lấy nút tạo mới 1 cuộc họp' })
  @ApiResponse({ status: 201, description: 'Lấy nút tạo mới 1 cuộc họp' })
  /**
   * Lấy danh sách các hành động có thể thực hiện của người dùng
   * với một cuộc họp cụ thể để tạo lịch họp
   *
   * @param {string} originalUserId - ID của người dùng
   * @returns {Promise<{ id: string; title: string }[]>}
   * Danh sách các hành động có thể thực hiện của người dùng
   */
  async getActionAvailableByUser(
    @OriginalUser() originalUserId: string,
  ) {
    return this.service.getActionAvailableByUser(originalUserId);
  }

  @Get('find-all')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @ApiOperation({ summary: 'Bộ lọc tìm kiếm các cuộc họp' })
  @ApiResponse({ status: 201, description: 'Bộ lọc tìm kiếm các cuộc họp' })
  /**
   * Tìm kiếm các cuộc họp để lọc filter dựa trên keyword.
   *
   * @param {string} [keyword] - Từ khóa tìm kiếm
   * @returns {Promise<{ success: boolean; data: { id: string; title: string }[]>}
   */
  async searchMeetings(
    @Query('keyword') keyword?: string,
  ) {
    return this.service.searchMeetings(keyword);
  }

  @Post()
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.CREATE)
  @ApiOperation({ summary: 'Tạo một cuộc họp mới' })
  @ApiResponse({ status: 201, description: 'Tạo cuộc họp thành công' })
  async create(
    @Req() req: any,
    @Body() dto: CreateMeetingDto,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
  ) {
    const startTime = Date.now();
    this.logger.log(`[POST /meetings] Start create meeting. originalUserId: ${originalUserId}, effectiveUserId: ${effectiveUserId}`);
    this.logger.debug(`[POST /meetings] Request fields: ${Object.keys(dto || {}).join(',')}`);

    if (!originalUserId) {
      this.logger.error('[POST /meetings] Unauthorized: Missing originalUserId');
      throw new UnauthorizedException('Không tìm thấy originalUserId từ token');
    }

    try {
      const result = await this.service.create(dto, {
        originalUserId,
        effectiveUserId,
      }, req);

      const duration = Date.now() - startTime;
      this.logger.log(`[POST /meetings] Success - Duration: ${duration}ms. Result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[POST /meetings] Error after ${duration}ms. Message: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('processing-state')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.PROCESS)
  @ApiOperation({ summary: 'Cập nhật trạng thái xử lý lịch họp theo đơn vị' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái xử lý thành công' })
  async updateProcessingState(
    @Body() dto: UpdateMeetingProcessingStateDto,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId?: string,
  ) {
    if (!originalUserId) {
      throw new UnauthorizedException('Không tìm thấy originalUserId từ token');
    }

    return this.service.updateMeetingUnitProcessingState(dto, {
      originalUserId,
      effectiveUserId,
    });
  }

  @Get('list/meeting-rooms-stats')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Danh sách thống kê phòng họp' })
  @ApiQuery({ type: ListMeetingRoomsStatsDto })
  @ApiResponse({ status: 200, description: 'Danh sách thống kê phòng họp trả về, gồm các trường: items, total, page, limit, totalPages' })
  /**
   * Danh sách thống kê phòng họp
   * Hỗ trợ phân trang, lọc theo tháng/năm và export
   * @param req - Request object
   * @param query - ListMeetingRoomsStatsDto object
   * @param effectiveUserId - Id của người dùng hiệu lực
   * @returns - Danh sách thống kê phòng họp, gồm các trường: items, total, page, limit, totalPages
   */
  async listMeetingRoomsStats(
    @Req() req: any,
    @Query() query: ListMeetingRoomsStatsDto,
    @EffectiveUser() effectiveUserId: string
  ) {
    return this.service.listMeetingRoomsStats(query, effectiveUserId, req);
  }

  @Get('list/meeting-in-meeting-rooms-stats')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Danh sách thống kê cuộc họp theo phòng họp' })
  @ApiQuery({ type: ListDocumentsOverDueDto, style: 'deepObject', explode: true })
  @ApiResponse({ status: 200, description: 'Danh sách thống kê cuộc họp theo phòng họp trả về, gồm các trường: items, total, page, limit, totalPages' })
  /**
   * Danh sách thống kê cuộc họp theo phòng họp
   * Hỗ trợ phân trang, lọc theo tháng/năm và export
   * @param req - Request object
   * @param query - ListDocumentsOverDueDto object
   * @param effectiveUserId - Id của người dùng hiệu lực
   * @returns - Danh sách thống kê cuộc họp theo phòng họp, gồm các trường: items, total, page, limit, totalPages
   */
  async listMeetingInMeeetingRoomsStats(
    @Req() req: any,
    @Query() query: ListDocumentsOverDueDto,
    @EffectiveUser() effectiveUserId: string
  ) {
    return this.service.listMeetingInMeeetingRoomsStats(query, effectiveUserId, req);
  }


  @Get('list/meeting-by-time')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Danh sách thống kê phòng họp' })
  @ApiQuery({ type: ListMeetingByTimeDto })
  @ApiResponse({ status: 200, description: 'Danh sách thống kê lịch họp theo thời gian trả về, gồm các trường: items, total, page, limit, totalPages' })
  async listMeetingByTime(
    @Req() req: any,
    @Query() query: ListMeetingByTimeDto,
    @EffectiveUser() effectiveUserId: string
  ) {
    return this.service.statisticMeetingsByTime(query, effectiveUserId, req);
  }

  @Get('list/meeting-attendance-report')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Danh sách báo cáo thống kê tham dự cuộc họp' })
  @ApiQuery({ type: listMeetingAttendanceReportDto })
  @ApiResponse({ status: 200, description: 'Danh sách thống kê lịch họp theo thời gian trả về, gồm các trường: items, total, page, limit, totalPages' })
  async listMeetingAttendanceReport(
    @Req() req: any,
    @Query() query: listMeetingAttendanceReportDto,
    @EffectiveUser() effectiveUserId: string
  ) {
    return this.service.listMeetingAttendanceReport(query, effectiveUserId, req);
  }

  @Get('list/conclusions-from-meeting')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Danh sách báo cáo theo dõi kết luận cuộc họp' })
  @ApiQuery({ type: listConclusionsFromKMeetingDto })
  @ApiResponse({ status: 200, description: 'Danh sách thống kê lịch họp theo thời gian trả về, gồm các trường: items, total, page, limit, totalPages' })
  async listConclusionsFromKMeeting(
    @Req() req: any,
    @Query() query: listConclusionsFromKMeetingDto,
    @EffectiveUser() effectiveUserId: string
  ) {
    return this.service.listConclusionsFromKMeeting(query, effectiveUserId, req);
  }

  @Patch(':id/update-recuring')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE)
  @ApiOperation({ summary: 'Cập nhật thông tin cuộc họp theo ID' })
  @ApiParam({ name: 'id', description: 'ID của cuộc họp', type: String })
  @ApiResponse({ status: 200, description: 'Cập nhật cuộc họp thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy cuộc họp' })
  async updateForRecuring(
    @Param('id') id: string,
    @Body() dto: UpdateMeetingDto,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ) {
    return this.service.updateForRecuring(id, dto, effectiveUserId, req);
  }

  @Patch(':id')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE)
  @ApiOperation({ summary: 'Cập nhật thông tin cuộc họp theo ID' })
  @ApiParam({ name: 'id', description: 'ID của cuộc họp', type: String })
  @ApiResponse({ status: 200, description: 'Cập nhật cuộc họp thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy cuộc họp' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMeetingDto,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, effectiveUserId, req);
  }

  @Patch(':id/rooms/:roomId/participants')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiOperation({ summary: 'Cập nhật sơ đồ chỗ ngồi cho một phòng họp' })
  @ApiParam({ name: 'id', description: 'ID cuộc họp' })
  @ApiParam({ name: 'roomId', description: 'ID phòng họp' })

  async updateRoomSeatMap(
    @Param('id') meetingId: string,
    @Param('roomId') roomId: string,
    @Body() dto: ReplaceRoomParticipantsDto,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ) {
    return this.service.replaceRoomParticipants(
      meetingId,
      roomId,
      dto,
      effectiveUserId,
      req
    );
  }

  @Patch(':id/replace-participants')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)  // Kiểm tra quyền
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiOperation({ summary: 'Cập nhật sơ đồ chỗ ngồi cho các phòng họp' })
  @ApiParam({ name: 'id', description: 'ID cuộc họp' })
  async updateRoomSeatAllRoomMap(
    @Param('id') meetingId: string,  // Nhận ID cuộc họp
    @Body() dto: ReplaceRoomParticipantsAllRoomDto,  // Nhận dữ liệu cập nhật chỗ ngồi
    @OriginalUser() originalUserId: string,
    @Req() req: any,
  ) {
    return this.service.replaceRoomParticipantsAllRoom(
      meetingId,
      dto,
      originalUserId,
      req
    );
  }

  @Get(':id/check-seat-assigment')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)  // Kiểm tra quyền
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Cập nhật sơ đồ chỗ ngồi cho các phòng họp' })
  @ApiParam({ name: 'id', description: 'ID cuộc họp' })
  async updateRoomSeatAllRoomMap2(
    @Param('id') meetingId: string,  // Nhận ID cuộc họp
  ) {
    return this.service.checkUnassignedSeats(
      meetingId
    );
  }


  @Post('check-prepare-user')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Kiểm tra trạng thái hoàn thành của người tham gia' })
  async checkPrepareUser(
    @Body() dto: UpdateMeetingProcessingStateDto,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId?: string,
  ) {
    if (!originalUserId) {
      throw new UnauthorizedException('Không tìm thấy originalUserId từ token');
    }

    return this.service.checkPrepareUser(dto, {
      originalUserId,
      effectiveUserId,
    });
  }

  @Get('company')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách các cuộc họp của công ty' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các cuộc họp của công ty',
  })
  async getCompanyMeetings(
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: CreateMeetingDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.service.listMeetingCompany(
      query,
      originalUserId,
      effectiveUserId,
      req
    );
  }

  @Get('prepare')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách các cuộc họp của người dùng' })
  @ApiQuery({ type: CreateMeetingDto, style: 'deepObject', explode: true })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các cuộc họp của người dùng',
  })
  async getMeetingsListPrepare(
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: CreateMeetingDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.service.listPrepareMeetingSchedule(
      query,
      originalUserId,
      effectiveUserId,
      req
    );
  }

  @Get('approval')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách các cuộc họp của người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các cuộc họp của người dùng',
  })
  @ApiQuery({ type: CreateMeetingDto, style: 'deepObject', explode: true })
  async getMeetingsListApproval(
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: CreateMeetingDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.service.listApprovalSchedule(
      query,
      originalUserId,
      effectiveUserId,
      req
    );
  }

  @Get('process')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách các cuộc họp của người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các cuộc họp của người dùng',
  })
  async getMeetingsListProcess(
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: CreateMeetingDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.service.listProcessSchedule(
      query,
      originalUserId,
      effectiveUserId,
      req
    );
  }

  @Get('seat-assignment')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách các cuộc họp của người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các cuộc họp của người dùng',
  })
  async seatAssignmentList(
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: CreateMeetingDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.service.seatAssignmentList(
      query,
      originalUserId,
      effectiveUserId,
      req
    );
  }


  @Get('duty-roster-leaders')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách các cuộc họp của người dùng' })
  @ApiQuery({ type: CreateMeetingDto, style: 'deepObject', explode: true })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các cuộc họp của người dùng',
  })
  async rosterForLeadersList(
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: CreateMeetingDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.service.rosterForLeadersList(
      query,
      originalUserId,
      effectiveUserId,
      req
    );
  }
  @Get('unit')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách các cuộc họp của đơn vị' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các cuộc họp của đơn vị',
  })
  async getUnitMeetings(
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: CreateMeetingDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.service.listMeetingUnit(query, originalUserId, effectiveUserId, req);
  }

  @Get('unit-history')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách lịch sử cuộc họp của đơn vị' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các cuộc họp của đơn vị',
  })
  async getUnitHistoryMeetings(
    @OriginalUser() originalUserId: string,
    @Query() query: CreateMeetingDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.service.listMeetingUnitHistory(
      query,
      originalUserId,
      effectiveUserId,
      req
    );
  }

  @Get('user')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách tất cả các cuộc họp' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả các cuộc họp' })
  async getAllMeetings(
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: CreateMeetingDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.service.listMeetingPerson(
      query,
      originalUserId,
      effectiveUserId,
      req
    );
  }

  @Get('list-for-task')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách tất cả các cuộc họp cho công việc' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tất cả các cuộc họp cho tạo  công việc',
  })
  getAllMeetingsForTask(
    @OriginalUser() originalUserId: string,
    @Query() query: CreateMeetingDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.service.listMeetingForTask(
      query,
      originalUserId,
      effectiveUserId,
    );
  }

  @Get(':meetingId/finished-meetings-for-linking')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({
    summary:
      'Lấy danh sách cuộc họp đã kết thúc dùng để liên kết với cuộc họp hiện tại',
  })
  @ApiResponse({
    status: 200,
    description:
      'Danh sách cuộc họp đã kết thúc theo phạm vi tổng công ty hoặc phòng ban',
  })
  finishedMeetingsForLinking(
    @OriginalUser() originalUserId: string,
    @Param('meetingId') meetingId: string,
    @Query() query: CreateMeetingDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.service.finishedMeetingsForLinking(
      {
        ...query,
        meetingId,
      },
      effectiveUserId,
      originalUserId,
    );
  }

  @Get(':id')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy chi tiết cuộc họp' })
  @ApiParam({ name: 'id', example: 'meet_123' })
  @ApiResponse({ status: 200, type: MeetingDetailDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy cuộc họp' })
  async getDetail(
    @Param('id') id: string,
    @Query('listparammeeting') listparammeeting: string,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ) {
    return this.service.getDetail(id, effectiveUserId, listparammeeting, req);
  }

  @Get(':meetingId/tasks')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  async getTasksByUser(
    @EffectiveUser() effectiveUserId: string,
    @Param('meetingId') meetingId: string,
    @Query('type') type: 'meeting' | 'unit' | 'user' | 'all',
  ) {
    const userId = effectiveUserId;

    return {
      success: true,
      data: await this.service.getTasksByUser(meetingId, userId, type),
    };
  }
  // Phòng xác nhận tham gia
  @Post(':meetingId/:workItemId/room-confirm-join')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiQuery({ name: 'authority', description: 'Cờ ủy quyền (true/false)', required: false, type: Boolean, example: false })
  async roomConfirmJoin(
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Param('meetingId') meetingId: string,
    @Param('workItemId') workItemId: string,
    @Query('authority') authority: boolean,
    @Body() payload: WorkItemDto,
  ) {
    return {
      success: true,
      data: await this.service.unitConfirmJoinMeeting(
        meetingId,
        originalUserId,
        effectiveUserId,
        workItemId,
        payload,
        authority,
      ),
    };
  }
  // Người xác nhận tham gia
  @Post(':meetingId/:workItemId/user-confirm-join')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiQuery({ name: 'authority', description: 'Cờ ủy quyền (true/false)', required: false, type: Boolean, example: false })
  async userConfirmJoin(
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Param('meetingId') meetingId: string,
    @Param('workItemId') workItemId: string,
    @Query('authority') authority: boolean,
    @Body() payload: WorkItemDto,
  ) {
    return {
      success: true,
      data: await this.service.userConfirmJoinMeeting(
        meetingId,
        originalUserId,
        effectiveUserId,
        workItemId,
        payload,
        authority,
      ),
    };
  }

  // Người hủy xác nhận tham gia
  @Post(':meetingId/:workItemId/user-cancel-join')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiQuery({ name: 'authority', description: 'Cờ ủy quyền (true/false)', required: false, type: Boolean, example: false })
  async userCancelJoin(
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Param('meetingId') meetingId: string,
    @Param('workItemId') workItemId: string,
    @Query('authority') authority: boolean,
    @Body() payload: WorkItemDto,
  ) {
    return {
      success: true,
      data: await this.service.userCancelJoinMeeting(
        meetingId,
        originalUserId,
        effectiveUserId,
        workItemId,
        payload,
        authority,
      ),
    };
  }

  // Thu hôi 
  @Post(':meetingId/recall')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.PROCESS)
  @ApiQuery({ name: 'authority', description: 'Cờ ủy quyền (true/false)', required: false, type: Boolean, example: false })
  async recallMeeting(
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Param('meetingId') meetingId: string,
    @Query('authority') authority: boolean,
    @Req() req: any,
    @Body() payload: any,
  ) {
    return {
      success: true,
      data: await this.service.userRecallMeeting({
        meetingId,
        payload,
        userId: originalUserId,
        author: authority ? effectiveUserId : originalUserId,
        req
      }),
    };
  }

  // Phòng xác nhận tham gia
  @Post(':meetingId/:workItemId/room-finish-meeting')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiOperation({ summary: 'Phòng hoàn thành xử lý cuộc họp' })
  @ApiParam({ name: 'meetingId', description: 'ID cuộc họp', type: String })
  @ApiParam({ name: 'workItemId', description: 'ID công việc trong cuộc họp', type: String })
  @ApiQuery({ name: 'authority', description: 'Cờ ủy quyền (true/false)', required: false, type: Boolean, example: false })
  @ApiResponse({ status: 201, description: 'Hoàn thành xử lý thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  async roomFinish(
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Param('meetingId') meetingId: string,
    @Param('workItemId') workItemId: string,
    @Query('authority') authority: boolean,
    @Body() payload: WorkItemDto,
  ) {
    return {
      success: true,
      data: await this.service.unitFinishMeeting(
        meetingId,
        originalUserId,
        effectiveUserId,
        workItemId,
        payload,
        authority,
      ),
    };
  }
  // Người xác nhận tham gia
  @Post(':meetingId/:workItemId/user-finish-meeting')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiQuery({ name: 'authority', description: 'Cờ ủy quyền (true/false)', required: false, type: Boolean, example: false })
  async userFinish(
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Param('meetingId') meetingId: string,
    @Param('workItemId') workItemId: string,
    @Query('authority') authority: boolean,
    @Body() payload: WorkItemDto,
  ) {
    return {
      success: true,
      data: await this.service.userFinishMeeting(
        meetingId,
        originalUserId,
        effectiveUserId,
        workItemId,
        payload,
        authority,
      ),
    };
  }
  // Đơn vị chuyển trạng thái Đang xử lý
  @Post(':meetingId/unit-processing')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiQuery({ name: 'authority', description: 'Cờ ủy quyền (true/false)', required: false, type: Boolean, example: false })
  async updateUnitToProcessing(
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Param('meetingId') meetingId: string,
    @Query('authority') authority: boolean,
  ) {
    const userId = authority ? effectiveUserId : originalUserId;

    await this.service.updateUnitStateToProcessing(meetingId, userId);

    return { success: true };
  }

  // Đơn vị chuyển trạng thái Đang xử lý
  @Post(':meetingId/user-processing')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiQuery({ name: 'authority', description: 'Cờ ủy quyền (true/false)', required: false, type: Boolean, example: false })
  async updateUserToProcessing(
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Param('meetingId') meetingId: string,
    @Query('authority') authority: boolean,
  ) {
    const userId = authority ? effectiveUserId : originalUserId;

    await this.service.updateParticipantStateToProcessing(meetingId, userId);

    return { success: true };
  }

  @Get(':meetingId/participants')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiQuery({ type: GetMeetingParticipantsQueryDto, style: 'deepObject', explode: true })
  async getUserParticipantMeeting(
    @Query() query: GetMeetingParticipantsQueryDto,
    @Param('meetingId') meetingId: string,
  ) {
    const data = await this.service.getUserParticipantMeeting(
      query,
      meetingId,
    );

    return {
      success: true,
      data: data
    };
  }

  @Delete()
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.DELETE)
  async deleteMeetings(
    @Body() dto: DeleteMeetingsDto,
    @Req() req: any,
    @OriginalUser() originalUserId: string,
  ) {
    const result = await this.service.softDeleteMeetings(dto.ids, originalUserId, req);

    return {
      success: true,
      message: result.message,
      data: result.affectedRows,
    };
  }

  // Tab kết luận
  @Get(':meetingId/conclusion')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiResponse({
    status: 200,
    description: 'Chi tiết kết luận cuộc họp',
    type: MeetingConclusionDetailDto,
  })
  async getMeetingConclusionTabDetail(
    @Param('meetingId') meetingId: string,
  ): Promise<MeetingConclusionDetailDto> {
    const result = await this.service.getMeetingConclusionTabDetail({
      meetingId,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Post(':meetingId/relations')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiResponse({
    status: 201,
    description: 'Thêm quan hệ giữa các cuộc họp thành công',
    type: AddMeetingRelationsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu đầu vào không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy cuộc họp',
  })
  async addMeetingRelations(
    @Param('meetingId') meetingId: string,
    @Body() dto: AddMeetingRelationsDto,
  ): Promise<AddMeetingRelationsResponseDto> {
    const result = await this.service.addMeetingRelations({
      meetingId,
      relatedMeetingIds: dto.relatedMeetingIds,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Delete(':meetingId/relations')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  async removeMeetingRelations(
    @Param('meetingId') meetingId: string,
    @Body() dto: RemoveMeetingRelationsDto,
  ) {
    const result = await this.service.removeMeetingRelations({
      meetingId,
      relatedMeetingIds: dto.relatedMeetingIds,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 1. Tạo meeting conclusion mới
   * POST /meetings/:meetingId/conclusions
   */
  @Post(':meetingId/conclusions')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiResponse({
    status: 201,
    description: 'Tạo meeting conclusion thành công',
    type: CreateMeetingConclusionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy cuộc họp' })
  async createMeetingConclusion(
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateMeetingConclusionDto[],
  ): Promise<CreateMeetingConclusionResponseDto> {
    const result = await this.service.createMeetingConclusion({
      meetingId,
      conclusions: dto,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 2. Lấy danh sách conclusions theo meetingId
   * GET /meetings/:meetingId/conclusions
   */
  @Get(':meetingId/conclusions')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách conclusions thành công',
    type: GetMeetingConclusionsResponseDto,
  })
  async getMeetingConclusions(
    @Param('meetingId') meetingId: string,
  ): Promise<GetMeetingConclusionsResponseDto> {
    const result = await this.service.getMeetingConclusions({
      meetingId,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 3. Lấy chi tiết 1 conclusion (có tasks)
   * GET /meetings/conclusions/:conclusionId
   */
  @Get(':meetingId/conclusions/:conclusionId')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết conclusion thành công',
    type: GetMeetingConclusionDetailResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy conclusion' })
  async getMeetingConclusionDetail(
    @Param('conclusionId') conclusionId: string,
    @Param('meetingId') meetingId: string,
  ): Promise<GetMeetingConclusionDetailResponseDto> {
    const result = await this.service.getMeetingConclusionDetail({
      conclusionId: parseInt(conclusionId, 10),
      meetingId: meetingId,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 4. Cập nhật meeting conclusion
   * PATCH /meetings/conclusions/:conclusionId
   */
  @Patch('conclusions/:meetingId')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiResponse({
    status: 200,
    description: 'Cập nhật conclusion thành công',
    type: UpdateMeetingConclusionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy conclusion' })
  async updateMeetingConclusionsAndRelations(
    @Param('meetingId') meetingId: string,
    @Body() dto: UpdateMeetingConclusionsAndRelationsDto,
  ): Promise<UpdateMeetingConclusionResponseDto> {
    const result = await this.service.updateMeetingConclusionsAndRelations({
      meetingId: meetingId,
      conclusions: dto.conclusions,
      relatedMeetingIds: dto.relatedMeetingIds,
    });

    return {
      success: true,
      data: result
    }
  }

  /**
   * 5. Xóa meeting conclusion (soft delete)
   * DELETE /meetings/conclusions/:conclusionId
   */
  @Delete('conclusions/:conclusionId')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiResponse({
    status: 200,
    description: 'Xóa conclusion thành công',
    type: DeleteMeetingConclusionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy conclusion' })
  async deleteMeetingConclusion(
    @Param('conclusionId') conclusionId: string,
  ): Promise<DeleteMeetingConclusionResponseDto> {
    const result = await this.service.deleteMeetingConclusion({
      conclusionId: parseInt(conclusionId, 10),
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 1. Tạo meeting conclusions + meeting relations
   * POST /meetings/:meetingId/create/conclusions
   */
  @Post(':meetingId/create/conclusions')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiResponse({
    status: 201,
    description: 'Tạo meeting conclusion và relations thành công',
    type: CreateMeetingConclusionsAndRelationsDto,
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy cuộc họp' })
  async createMeetingConclusionsAndRelations(
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateMeetingConclusionsAndRelationsDto,
  ): Promise<CreateMeetingConclusionsAndRelationsResponseDto> {
    const result = await this.service.createMeetingWithConclusionsAndRelations({
      meetingId,
      conclusions: dto.conclusions,
      relatedMeetingIds: dto.relatedMeetingIds,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Post('room/check')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Check trùng phòng họp' })
  @ApiResponse({ status: 200, description: 'Danh sách phòng bị trùng lịch' })
  async roomCheck(@Body() dto: CheckRoomConflictDto) {
    const schedules = await this.service.getFutureRoomSchedules(
      dto.roomIds,
      dto.excludeMeetingId,
    );

    return {
      success: true,
      data: schedules,
    };
  }

  @Post('user/check-conflict')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Check trùng người tham gia họp' })
  @ApiResponse({ status: 200, description: 'Danh sách người bị trùng lịch' })
  async checkUserConflict(@Body() dto: CheckUserConflictDto) {
    const conflicts = await this.service.checkUserConflict(
      dto.meetingDate,
      dto.meetingTime,
      dto.userIds,
      dto.excludeMeetingId,
    );

    // Không trùng
    if (!conflicts.length) {
      return {
        success: true,
        data: [],
      };
    }

    // Có trùng
    const result = conflicts.map((c) => ({
      userId: c.userId,
      userName: c.userName ?? 'Cán bộ',
      meetingId: c.meetingId,
      meetingDate: c.meetingDate,
      meetingTime: c.meetingTime,
      meetingName: c.meetingName ?? '',
      position: c.position ?? '',
    }));
    const message = `Không thể gán cán bộ ${conflicts.map((c) => `${c.userName ?? 'Cán bộ'}`).join(', ')} tham gia vào lịch họp! Cán bộ này đã tham dự một cuộc họp khác hoặc đã có lịch công tác vào khoảng thời gian `;

    return {
      success: false,
      data: result,
      message: message,
    };
  }

  // Tab ghi âm
  @Post('audio-transcripts')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Tạo transcript cho file audio' })
  @ApiResponse({
    status: 201,
    description: 'Tạo transcript thành công',
    type: AudioTranscriptResponseDto,
  })
  // @ApiResponse({ status: 400, description: 'File không phải định dạng audio' })
  @ApiResponse({ status: 404, description: 'File không tồn tại' })
  @ApiResponse({ status: 409, description: 'File này đã có transcript' })
  async createAudio(
    @Body() createDto: CreateAudioTranscriptDto,
    @EffectiveUser() userId: string,
  ): Promise<AudioTranscriptResponseDto> {
    return this.service.createAudioTranscript(
      createDto,
      userId,
    );
  }

  @Patch('audio-transcripts/:id/text')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiOperation({ summary: 'Cập nhật nội dung transcript' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật transcript thành công',
    type: AudioTranscriptResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Transcript không tồn tại' })
  async updateText(
    @Param('id') id: string,
    @Body() updateDto: UpdateTranscriptTextDto,
    @EffectiveUser() userId: string,
  ): Promise<AudioTranscriptResponseDto> {
    return this.service.updateTranscriptText(
      id,
      updateDto,
      userId,
    );
  }

  @Delete('audio-transcripts/:id')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiOperation({ summary: 'Xóa transcript' })
  @ApiResponse({
    status: 200,
    description: 'Xóa transcript thành công',
    type: AudioTranscriptResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Transcript không tồn tại' })
  async delete(
    @Param('id') id: string,
    @EffectiveUser() userId: string,
  ): Promise<AudioTranscriptResponseDto> {
    return this.service.deleteTranscript(id, userId);
  }

  @Get('audio-transcripts/:meetingId')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy transcript theo file ID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy transcript thành công',
    type: AudioTranscriptResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Transcript không tồn tại' })
  async getByMeetingId(
    @Param('meetingId') meetingId: string,
    @EffectiveUser() userId: string,
  ): Promise<AudioTranscriptResponseDto> {
    return this.service.getTranscriptByMeetingId(meetingId, userId);
  }

  @Get(':meetingId/unit-tasks')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({
    summary: 'Lấy danh sách task của phòng ban (UNIT) trong cuộc họp',
    description:
      'Chỉ khi includeComments=true thì hệ thống mới lấy comment + like của task',
  })
  @ApiParam({
    name: 'meetingId',
    description: 'ID cuộc họp',
    type: String,
  })
  @ApiQuery({
    name: 'includeComments',
    required: false,
    enum: ['true'],
    description:
      'Chỉ truyền true nếu muốn lấy comment + like. Không truyền → không lấy comment',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách task của UNIT',
  })
  async getUnitTasks(
    @Param('meetingId') meetingId: string,
    @EffectiveUser() effectiveUserId: string,
    @Query('includeComments') includeComments?: string,
  ) {
    const include = includeComments === 'true';

    return this.service.getUnitTasksOfUserInMeeting(
      meetingId,
      effectiveUserId,
      include,
    );
  }


  @Get(':meetingId/my-tasks')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({
    summary: 'Lấy danh sách task cá nhân của người tham gia cuộc họp',
    description:
      'Chỉ khi includeComments=true thì hệ thống mới lấy comment + like của task',
  })
  @ApiParam({
    name: 'meetingId',
    description: 'ID cuộc họp',
    type: String,
  })
  @ApiQuery({
    name: 'includeComments',
    required: false,
    enum: ['true'],
    description:
      'Chỉ truyền true nếu muốn lấy comment + like. Không truyền → không lấy comment',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách task cá nhân',
  })
  async getMyTasks(
    @Param('meetingId') meetingId: string,
    @EffectiveUser() effectiveUserId: string,
    @Query('includeComments') includeComments?: string,
  ) {
    const include = includeComments === 'true';

    return this.service.getParticipantTasksInMeeting(
      meetingId,
      effectiveUserId,
      include,
    );
  }

  @Post(':id/attendance/confirm')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  async confirmMyAttendance(
    @Param('id') meetingId: string,
    @OriginalUser() originalUserId: string,
  ) {
    return this.service.confirmMyAttendance(
      meetingId,
      originalUserId,
    );
  }

  @Get(':id/check-early-start')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({
    summary: 'Kiểm tra xem bắt đầu sớm và trùng lịch không',
  })
  async checkEarlyStart(
    @Param('id') meetingId: string,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.service.checkEarlyStart(meetingId, effectiveUserId);
  }

  @Post(':id/start')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiOperation({
    summary: 'Bắt đầu cuộc họp',
  })
  @ApiParam({
    name: 'id',
  })
  @ApiResponse({ status: 200, description: 'Bắt đầu cuộc họp thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy cuộc họp' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 400, description: 'Sai trạng thái' })
  async startMeeting(
    @Param('id') meetingId: string,
    @Body() body: { reason?: string },
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ) {
    const result = await this.service.startMeeting(
      meetingId,
      effectiveUserId,
      body?.reason,
      req
    );

    return result;
  }

  @Post(':id/attendance/not-check-bulk')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  async setNotCheckBulk(
    @Param('id') meetingId: string,
    @Body() body: any,
    @OriginalUser() originalUserId: string,
  ) {
    return this.service.setNotCheckBulk(
      meetingId,
      originalUserId,
      body.participantIds || [],
      body.notCheck === true,
    );
  }

  @Post(':id/attendance/lock')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  async lockAttendance(
    @Param('id') meetingId: string,
    @OriginalUser() originalUserId: string,
  ) {
    return this.service.setAttendanceLock(
      meetingId,
      originalUserId
    );
  }
  @Get('list/conslusion-meetings')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách các kết luận' })
  @ApiQuery({ type: CreateMeetingDto, style: 'deepObject', explode: true })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các kết luận',
  })
  getConclusionMeetings(
    @OriginalUser() originalUserId: string,
    @Query() query: CreateMeetingDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.service.listMeetingCompany(
      query,
      originalUserId,
      effectiveUserId,
    );
  }



  @Post(':id/end')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiOperation({
    summary: 'Kết thúc cuộc họp',
    description: 'Chuyển meeting_state từ DANG_HOP → KET_THUC',
  })
  @ApiParam({
    name: 'id',
  })
  @ApiResponse({
    status: 200,
    description: 'Kết thúc cuộc họp thành công',
  })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 400, description: 'Sai trạng thái' })
  async endMeeting(
    @Param('id') meetingId: string,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ) {
    const result = await this.service.endMeeting(
      meetingId,
      effectiveUserId,
      req
    );

    return result

  }

  @Post(':id/participants/sync')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiOperation({
    summary: 'Đồng bộ người tham gia theo đơn vị',
    description: 'Giữ người cũ, thêm người mới, xóa người bị bỏ',
  })
  @ApiParam({
    name: 'id',
    description: 'Meeting ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Đồng bộ danh sách người tham gia thành công',
  })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async syncMeetingParticipants(
    @Param('id') meetingId: string,
    @Body() body: any,
    @OriginalUser() originalUserId: string,
    @Req() req: any,
  ) {
    const result = await this.service.syncMeetingParticipants(
      meetingId,
      body.meetingUnitId,
      body.unitId,
      body.members,
      originalUserId,
      body.secretary,
      req
    );

    return result;
  }

  @Post(':id/cancel')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiOperation({
    summary: 'Hủy cuộc họp',
    description: 'Người tạo, chủ trì hoặc thư ký được phép hủy cuộc họp',
  })
  @ApiParam({
    name: 'id',
    description: 'Meeting ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Hủy cuộc họp thành công',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền hủy cuộc họp',
  })
  @ApiResponse({
    status: 400,
    description: 'Cuộc họp không tồn tại hoặc đã bị hủy',
  })
  async cancelMeeting(
    @Param('id') meetingId: string,
    @EffectiveUser() effectiveUserId: string,
    @Body() payload: WorkItemDto,
    @Req() req: any,
  ) {
    const note = payload.note || ''
    return this.service.cancelMeeting(meetingId, effectiveUserId, note, req);
  }

  @Post(':id/cancel-recurring')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  @ApiOperation({
    summary: 'Hủy cuộc họp',
    description: 'Người tạo, chủ trì hoặc thư ký được phép hủy cuộc họp',
  })
  @ApiParam({
    name: 'id',
    description: 'Meeting ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Hủy cuộc họp thành công',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền hủy cuộc họp',
  })
  @ApiResponse({
    status: 400,
    description: 'Cuộc họp không tồn tại hoặc đã bị hủy',
  })
  async cancelRecuringMeeting(
    @Param('id') meetingId: string,
    @EffectiveUser() effectiveUserId: string,
    @Body() payload: any,
    @Req() req: any,
  ) {
    return this.service.cancelRecuringMeeting(
      meetingId,
      effectiveUserId,
      payload.note || '',
      payload.isToday,
      payload.isNextDay,
      req
    );
  }



  // lấy action code cho người dùng khi ấn không tham gia
  @Post(':meetingId/:workItemId/user-not-join')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  async getNextAction(
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Param('meetingId') meetingId: string,
    @Param('workItemId') workItemId: string,
    @Req() req: any,
    @Body() payload: WorkItemDto,
  ) {
    return {
      success: true,
      data: await this.service.getNextAction({
        meetingId,
        userId: originalUserId,  // Dùng originalUserId làm userId
        authorId: effectiveUserId, // Dùng effectiveUserId làm authorId
        workItemId,
        payload,
        authority: true,  // Truyền authority = true vào service (hoặc tùy chỉnh theo nhu cầu)
      }),
    };
  }
  @Post(':meetingId/:workItemId/assigning-seat')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  async assignmentToProcessing(
    @OriginalUser() originalUserId: string,
    @Req() req: any,
    @Param('meetingId') meetingId: string,
  ) {
    const data = await this.service.assignmentToProcessing({
      meetingId,
      userId: originalUserId,
    });

    return data;
  }


  // ủy quyền 
  @Post('delegate')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  async delegateMeeting(
    @OriginalUser() originalUserId: string,
    @Body() payload: DelegateMeetingPayload,
    @Req() req: any,
  ) {
    return this.service.delegateMeeting(payload, originalUserId, req);
  }

  // Người dùng không tham gia 
  @Patch(':meetingId/user-reject-join')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  async userRejectJoin(
    @OriginalUser() originalUserId: string,
    @Param('meetingId') meetingId: string,
    @Body() body: { note?: string },
    @Req() req: any,
  ) {
    const note = body?.note ?? '';
    return this.service.userRejectJoin(meetingId, originalUserId, note, req);
  }

  @Post(':meetingId/delegation/resolve')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.UPDATE_PARTICIPANT)
  async resolveDelegation(
    @OriginalUser() originalUserId: string,
    @Param('meetingId') meetingId: string,
    @Body() body: { participantIds: string[]; action: 'APPROVE' | 'REJECT' },
    @Req() req: any,
  ) {
    return this.service.approveOrRejectDelegation(
      meetingId,
      body.participantIds,
      body.action,
      originalUserId,
      req,
    );
  }

  @Get(':meetingId/pending-delegations')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  async getPendingDelegations(
    @Param('meetingId') meetingId: string,
  ) {
    return this.service.getPendingDelegations(meetingId);
  }

}
