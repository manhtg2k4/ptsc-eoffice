// src/conversations/conversations.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { UseGuards } from '@nestjs/common';
import { ConversationsPermissionGuard } from './guards/conversations-permission.guard';
import { RequireConversationsPermission, ConversationsPermissionAction } from './decorators/conversations-permission.decorator';

@Controller('conversations')
@UseGuards(ConversationsPermissionGuard)
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Post()
  @RequireConversationsPermission(ConversationsPermissionAction.CREATE)
  create(@Body() dto: CreateConversationDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequireConversationsPermission(ConversationsPermissionAction.VIEW)
  list(
      @Query('userId') userId: string,
      @Query('limit') limit?: number,
      @Query('skip') skip?: number,
      @Query('search') search?: string,
    ) {
      return this.service.list(userId, limit, skip, search);
    }

  @Get(':id')
  @RequireConversationsPermission(ConversationsPermissionAction.VIEW)
  detail(@Param('id') id: string, @Query('userId') userId: string) {
    return this.service.detail(userId, id);
  }

  @Patch(':id')
  @RequireConversationsPermission(ConversationsPermissionAction.UPDATE)
  update(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.service.updateConversation(userId, id, dto);
  }

  @Patch(':id/pin')
  @RequireConversationsPermission(ConversationsPermissionAction.ACTION)
  pin(
    @Param('id') convId: string,
    @Body() body: { userId: string; pinnedOrder?: number },
  ) {
    return this.service.pin(body.userId, convId, body.pinnedOrder);
  }

  @Patch(':id/unpin')
  @RequireConversationsPermission(ConversationsPermissionAction.ACTION)
  unpin(
    @Param('id') convId: string,
    @Body('userId') userId: string,
  ) {
    return this.service.unpin(userId, convId);
  }

  @Post(':id/soft-delete')
  @RequireConversationsPermission(ConversationsPermissionAction.ACTION)
  async deleteSoft(
    @Param('id') convId: string,
    @Body('userId') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.service.deleteSoft(userId, convId);
  }

  @Delete(':id/hard')
  @RequireConversationsPermission(ConversationsPermissionAction.DELETE)
  deleteHard(
    @Param('id') convId: string,
    @Body('userId') userId: string,
  ) {
    return this.service.deleteHard(userId, convId);
  }
}