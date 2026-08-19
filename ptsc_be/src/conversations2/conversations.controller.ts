// src/conversations/conversations.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ConversationsPermissionGuard } from '../conversations/guards/conversations-permission.guard';
import { RequireConversationsPermission, ConversationsPermissionAction } from '../conversations/decorators/conversations-permission.decorator';

@ApiTags('Quản lý Hội thoại (V2)')
@ApiBearerAuth()
@Controller('conversations')
@UseGuards(ConversationsPermissionGuard)
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Post()
  @RequireConversationsPermission(ConversationsPermissionAction.CREATE)
  @ApiOperation({
    summary: 'Tạo mới hội thoại',
    description: 'Tạo mới một hội thoại giữa các người dùng',
  })
  @ApiBody({
    type: CreateConversationDto,
    description: 'Dữ liệu hội thoại',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công',
  })
  create(@Body() dto: CreateConversationDto) {
    return this.service.create(dto);
  }

  @ApiOperation({
    summary: 'Lấy danh sách hội thoại',
    description: 'Lấy danh sách hội thoại của người dùng',
  })
  @ApiQuery({
    name: 'userId',
    description: 'ID của người dùng',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  @Get()
  @RequireConversationsPermission(ConversationsPermissionAction.VIEW)
  list(@Query('userId') userId: string) {
    return this.service.list(userId);
  }

  @ApiOperation({
    summary: 'Lấy chi tiết hội thoại',
    description: 'Lấy thông tin chi tiết của một hội thoại',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của hội thoại',
    required: true,
  })
  @ApiQuery({
    name: 'userId',
    description: 'ID của người dùng',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy hội thoại',
  })
  @Get(':id')
  @RequireConversationsPermission(ConversationsPermissionAction.VIEW)
  detail(@Param('id') id: string, @Query('userId') userId: string) {
    return this.service.detail(userId, id);
  }

  @ApiOperation({
    summary: 'Cập nhật hội thoại',
    description: 'Cập nhật thông tin hội thoại',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của hội thoại',
    required: true,
  })
  @ApiQuery({
    name: 'userId',
    description: 'ID của người dùng',
    required: true,
    type: String,
  })
  @ApiBody({
    type: UpdateConversationDto,
    description: 'Dữ liệu cập nhật hội thoại',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @Patch(':id')
  @RequireConversationsPermission(ConversationsPermissionAction.UPDATE)
  update(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.service.updateConversation(userId, id, dto);
  }

  @ApiOperation({
    summary: 'Ghim hội thoại',
    description: 'Ghim một hội thoại lên danh sách ưu tiên',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của hội thoại',
    required: true,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'ID của người dùng' },
        pinnedOrder: { type: 'number', description: 'Thứ tự ghim (tùy chọn)' },
      },
      required: ['userId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Ghim thành công',
  })
  @Patch(':id/pin')
  @RequireConversationsPermission(ConversationsPermissionAction.ACTION)
  pin(
    @Param('id') convId: string,
    @Body() body: { userId: string; pinnedOrder?: number },
  ) {
    return this.service.pin(body.userId, convId, body.pinnedOrder);
  }

  @ApiOperation({
    summary: 'Bỏ ghim hội thoại',
    description: 'Bỏ ghim một hội thoại khỏi danh sách ưu tiên',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của hội thoại',
    required: true,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'ID của người dùng' },
      },
      required: ['userId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Bỏ ghim thành công',
  })
  @Patch(':id/unpin')
  @RequireConversationsPermission(ConversationsPermissionAction.ACTION)
  unpin(
    @Param('id') convId: string,
    @Body('userId') userId: string,
  ) {
    return this.service.unpin(userId, convId);
  }

  @ApiOperation({
    summary: 'Xóa mềm hội thoại',
    description: 'Xóa hội thoại (xóa mềm, vẫn giữ dữ liệu)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của hội thoại',
    required: true,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'ID của người dùng' },
      },
      required: ['userId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  @Delete(':id')
  @RequireConversationsPermission(ConversationsPermissionAction.ACTION)
  deleteSoft(
    @Param('id') convId: string,
    @Body('userId') userId: string,
  ) {
    return this.service.deleteSoft(userId, convId);
  }

  @ApiOperation({
    summary: 'Xóa cứng hội thoại',
    description: 'Xóa hội thoại vĩnh viễn (xóa cứng, không thể khôi phục dữ liệu)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của hội thoại',
    required: true,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'ID của người dùng' },
      },
      required: ['userId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  @Delete(':id/hard')
  @RequireConversationsPermission(ConversationsPermissionAction.DELETE)
  deleteHard(
    @Param('id') convId: string,
    @Body('userId') userId: string,
  ) {
    return this.service.deleteHard(userId, convId);
  }
}