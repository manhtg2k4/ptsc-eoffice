/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, Get, Req, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MeetingScheduleService } from './meeting-schedule.service';
import { MeetingPermissionAction, RequireMeetingPermission } from 'src/meeting/decorators/meeting-permission.decorator';
import { MeetingPermissionGuard } from 'src/meeting/guard/meeting-permission.guard';

@ApiTags('Meeting Schedule - Quản lý lịch họp')
@ApiBearerAuth()
@UseGuards(MeetingPermissionGuard)
@Controller('meeting-schedule')
export class MeetingScheduleController {
  constructor(private readonly meetingService: MeetingScheduleService) {}

  @Get('commanders')
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách trực chỉ huy theo luồng (tự động lấy processKey từ cấu hình user)' })
  async getCommanders(@Req() req: any) {
    const userId = req?.user?.userId;
    return this.meetingService.getCommandersByFlow(userId);
  }

  @Get('organization-units')
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách đơn vị/phòng ban theo luồng với cấu trúc tree và users (tự động lấy processKey từ cấu hình user)' })
  async getOrganizationUnits(
    @Req() req: any,
    @Query('parentId') parentId?: string,
    @Query('search') search?: string,
  ) {
    const userId = req?.user?.userId;
    return this.meetingService.getOrganizationUnitsByFlowLazy(userId, parentId, search);
  }

  @Get('users')
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách người dùng theo luồng cho SELECT Cá nhân tham gia (tự động lấy processKey từ cấu hình user)' })
  async getUsers(@Req() req: any) {
    const userId = req?.user?.userId;
    return this.meetingService.getUsersByFlow(userId);
  }

  // Văn thư lấy người trong phòng
  @Get('organization-units-room')
  @RequireMeetingPermission(MeetingPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách đơn vị/phòng ban theo luồng với cấu trúc tree và users (tự động lấy processKey từ cấu hình user)' })
  async getOrganizationUnitsRoom(@Req() req: any) {
    const userId = req?.user?.userId;
    return this.meetingService.getUsersInCurrentOrgUnit(userId);
  }
}
