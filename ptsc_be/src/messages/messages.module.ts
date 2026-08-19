import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MessageEntity } from './entities/message.entity';

import { DatabaseModule } from '../database/database.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { NotificationModule } from '../notifycation/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageEntity], 'mssqlConnection'),
    forwardRef(() => DatabaseModule),
    forwardRef(() => ConversationsModule),
    forwardRef(() => NotificationModule), 
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
  