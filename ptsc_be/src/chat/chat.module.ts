// src/chat/chat.module.ts
import { Module, forwardRef } from '@nestjs/common';
// import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { MessagesModule } from '../messages/messages.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [
    forwardRef(() => MessagesModule),
    ConversationsModule,
  ],
  providers: [ChatService],
  exports: [ChatService], // ✅ QUAN TRỌNG: Export ChatService để NotificationModule có thể inject
})
export class ChatModule {}
 