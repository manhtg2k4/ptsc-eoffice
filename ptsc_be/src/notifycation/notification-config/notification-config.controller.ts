import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  ValidationPipe,
  ParseIntPipe,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { NotificationConfigService } from './notification-config.service';
import { UpdateNotificationConfigGroupsDto, UpdateNotificationConfigBulkDto } from './dto/update-config-groups.dto';
import { NotificationConfigResponseDto, NotificationConfigGroupsWrapperResponseDto } from './dto/notification-config-response.dto';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: {
    userId?: string;
  };
}

function getUserId(req: RequestWithUser): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new UnauthorizedException('User not authenticated');
  }
  return userId;
}

@ApiTags('Quản lý cấu hình thông báo')
@ApiBearerAuth()
@Controller('notification-config')
export class NotificationConfigController {
  constructor(
    private readonly service: NotificationConfigService,
  ) { }

  @ApiOperation({
    summary: 'Lấy danh sách phân loại thông báo theo group',
    description: 'Trả về tất cả các NotificationConfigEntity thuộc nhóm PROCESS và RECEIVE',
  })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    type: NotificationConfigGroupsWrapperResponseDto,
  })
  @Get('group')
  async getByGroup(@Req() req: RequestWithUser) {
    const userId = getUserId(req);
    return this.service.getByGroup(userId);
  }

  @ApiOperation({
    summary: 'Lấy danh sách cấu hình thông báo phân trang',
    description: 'Lấy danh sách các cấu hình thông báo hỗ trợ phân trang và tìm kiếm theo tên, lọc theo module',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Trang hiện tại' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng phần tử trên trang' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Tìm kiếm theo tên loại thông báo' })
  @ApiQuery({ name: 'module', required: false, type: String, description: 'Lọc theo module (VD: VIEW_INCOMING_DOC, VIEW_OUTCOMING_DOC...)' })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
  })
  @Get()
  async paging(
    @Req() req: RequestWithUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('module') module?: string,
    @Query('group') group?: string,
  ) {
    const userId = getUserId(req);
    return this.service.paging(userId, Number(page) || 1, Number(limit) || 10, search, module, group);
  }

  @ApiOperation({
    summary: 'Lấy chi tiết cấu hình thông báo theo ID',
  })
  @ApiParam({ name: 'id', required: true, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    type: NotificationConfigResponseDto,
  })
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    const userId = getUserId(req);
    return this.service.findById(id, userId);
  }

  @ApiOperation({
    summary: 'Lấy chi tiết cấu hình thông báo theo Code',
  })
  @ApiParam({ name: 'code', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Thành công',
    type: NotificationConfigResponseDto,
  })
  @Get('code/:code')
  async findByCode(
    @Param('code') code: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = getUserId(req);
    return this.service.findByCode(code, userId);
  }

  @ApiOperation({
    summary: 'Cập nhật hàng loạt groups cho danh sách các cấu hình thông báo',
    description: 'Cập nhật trường groups cho nhiều cấu hình thông báo cùng một lúc',
  })
  @ApiBody({ type: UpdateNotificationConfigBulkDto })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
    type: [NotificationConfigResponseDto],
  })
  @Patch('bulk')
  async updateBulk(
    @Body(new ValidationPipe({ transform: true })) dto: UpdateNotificationConfigBulkDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = getUserId(req);
    return this.service.updateBulk(dto.items, userId);
  }

  @ApiOperation({
    summary: 'Cập nhật groups của cấu hình thông báo',
    description: 'Chỉ cập nhật trường groups (truyền list group lên)',
  })
  @ApiParam({ name: 'id', required: true, type: Number })
  @ApiBody({ type: UpdateNotificationConfigGroupsDto })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
    type: NotificationConfigResponseDto,
  })
  @Patch(':id')
  async updateGroups(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ transform: true })) dto: UpdateNotificationConfigGroupsDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = getUserId(req);
    return this.service.updateGroups(id, dto.groups, userId);
  }
}
