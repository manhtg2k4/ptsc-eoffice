import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ConversationsPermissionGuard } from '../conversations/guards/conversations-permission.guard';
import { RequireConversationsPermission, ConversationsPermissionAction } from '../conversations/decorators/conversations-permission.decorator';

@ApiTags('Quản lý Tin nhắn')
@ApiBearerAuth()
@Controller('api/messages')
@UseGuards(ConversationsPermissionGuard)
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @ApiOperation({
    summary: 'Gửi tin nhắn',
    description: 'Gửi một tin nhắn mới trong cuộc trò chuyện',
  })
  @ApiBody({
    type: SendMessageDto,
    description: 'Dữ liệu tin nhắn',
  })
  @ApiResponse({
    status: 201,
    description: 'Gửi tin nhắn thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @Post()
  @RequireConversationsPermission(ConversationsPermissionAction.ACTION)
  async send(@Body() dto: SendMessageDto) {
    return this.service.send(dto);
  }

  @ApiOperation({
    summary: 'Lấy danh sách tin nhắn',
    description: 'Lấy danh sách tin nhắn trong một cuộc trò chuyện',
  })
  @ApiQuery({
    name: 'conversationId',
    description: 'ID của cuộc trò chuyện',
    required: true,
  })
  @ApiQuery({
    name: 'userId',
    description: 'ID của người dùng',
    required: true,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Số lượng tin nhắn tối đa (mặc định: 20)',
    required: false,
  })
  @ApiQuery({
    name: 'skip',
    description: 'Số tin nhắn bỏ qua (mặc định: 0)',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  @Get()
  @RequireConversationsPermission(ConversationsPermissionAction.VIEW)
  async list(
    @Query('conversationId') conversationId: string,
    @Query('userId') userId: string,
    @Query('limit') limit = '20',
    @Query('skip') skip = '0',
  ) {
    return this.service.list(
      conversationId,
      userId,
      Number(limit),
      Number(skip),
    );
  }

  @ApiOperation({
    summary: 'Đếm tin nhắn chưa đọc',
    description: 'Lấy số lượng tin nhắn chưa đọc của người dùng',
  })
  @ApiQuery({
    name: 'userId',
    description: 'ID của người dùng',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy số lượng thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Thiếu tham số userId',
  })
  @Get('unread-count')
  @RequireConversationsPermission(ConversationsPermissionAction.VIEW)
  async unreadCount(@Query('userId') userId: string) {
    if (!userId) {
      return {
        status: 0,
        message: 'userId is required',
        data: null,
      };
    }

    const totalUnread = await this.service.getTotalUnread(userId);

    return {
      status: 1,
      data: {
        totalUnread,
      },
    };
  }

  @ApiOperation({
    summary: 'Đếm tin nhắn chưa đọc theo từng cuộc hội thoại',
    description: 'Lấy danh sách unread count cho tất cả hội thoại của người dùng',
  })
  @ApiQuery({
    name: 'userId',
    description: 'ID của người dùng',
    required: true,
  })
  @Get('unread-by-conversation')
  @RequireConversationsPermission(ConversationsPermissionAction.VIEW)
  async unreadByConversation(@Query('userId') userId: string) {
    if (!userId) {
      return {
        status: 0,
        message: 'userId is required',
        data: null,
      };
    }

    const data = await this.service.getUnreadByConversation(userId);

    return {
      status: 1,
      data,
    };
  }

  @ApiOperation({
    summary: 'Tìm kiếm tin nhắn',
    description: 'Tìm kiếm tin nhắn trong một cuộc trò chuyện',
  })
  @Get('search')
  @RequireConversationsPermission(ConversationsPermissionAction.VIEW)
  async search(
    @Query('conversationId') conversationId: string,
    @Query('q') q?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const result = await this.service.searchMessages({
      conversationId,
      keyword: q,
      fromDate,
      toDate,
      page: Number(page),
      limit: Number(limit),
    });

    return {
      status: 1,
      message: 'Search messages success',
      count: result.count,
      data: result.data,
    };
  }
}

  