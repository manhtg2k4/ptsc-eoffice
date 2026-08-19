// src/conversations/conversations.module.ts (hoặc conversations2.module.ts nếu bạn dùng folder 2)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationEntity } from './entities/conversation.entity';  // điều chỉnh path nếu cần
import { ConversationMember } from './entities/conversation-member.entity';
import { ConversationMemberState } from './entities/conversation-member-state.entity';

import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature(
      [ConversationEntity, ConversationMember, ConversationMemberState], 
      'mssqlConnection'
    ),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}