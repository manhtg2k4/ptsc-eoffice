// src/conversations/conversations.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationEntity } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { ConversationMemberState } from './entities/conversation-member-state.entity';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { ConversationsPermissionService } from './conversations-permission.service';

@Module({
  imports: [
    forwardRef(() => DatabaseModule),
    forwardRef(() => UsersModule),
    TypeOrmModule.forFeature(
      [ConversationEntity, ConversationMember, ConversationMemberState], 
      'mssqlConnection'
    ),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsPermissionService],
  exports: [ConversationsService, ConversationsPermissionService],
})
export class ConversationsModule {}