// src/chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly messagesService: MessagesService,
  ) {}

  /**
   * Gửi tin nhắn và lưu vào DB
   */
  // async sendMessage(dto: {
  //   conversationId: string;
  //   senderId: string;
  //   content: string;
  //   type: number;
  //   data?: any[];
  //   clientTempId?: string;
  // }) {
  //   try {
  //     console.log('[ChatService] ==================== START ====================');
  //     console.log('[ChatService] Input DTO:', JSON.stringify(dto, null, 2));

  //     // ✅ MessagesService expect field "sendId" không phải "senderId"
  //     const messagePayload = {
  //       conversationId: dto.conversationId,
  //       sendId: dto.senderId,               // ✅ Gửi sendId
  //       content: dto.content || '',
  //       type: dto.type,
  //       data: dto.data && dto.data.length > 0 ? dto.data : null,
  //     };

  //     console.log('[ChatService] Payload to MessagesService:', JSON.stringify(messagePayload, null, 2));

  //     const savedMessage: any = await this.messagesService.send(messagePayload as any);

  //     console.log('[ChatService] Raw saved message:', JSON.stringify(savedMessage, null, 2));

  //     // ✅ Format response với sender object
  //     const formattedMessage = {
  //       id: savedMessage.id || savedMessage._id?.toString() || '',
  //       conversationId: savedMessage.conversationId || dto.conversationId,
  //       content: savedMessage.content || dto.content || '',
  //       type: savedMessage.type ?? dto.type,
  //       data: savedMessage.data || dto.data || null,
  //       caption: savedMessage.caption || null,
  //       linkContent: savedMessage.linkContent || null,
  //       mentions: savedMessage.mentions || null,
  //       reactions: savedMessage.reactions || null,
  //       replyTo: savedMessage.replyTo || null,
  //       status: savedMessage.status || null,
  //       sender: {
  //         id: savedMessage.sender?.id || savedMessage.senderId || savedMessage.sendId || dto.senderId,
  //         name: savedMessage.sender?.name || savedMessage.senderName || 'Unknown',
  //         avatar: savedMessage.sender?.avatar || savedMessage.senderAvatar || '[]',
  //       },
  //       createdAt: savedMessage.createdAt || new Date().toISOString(),
  //       updatedAt: savedMessage.updatedAt || new Date().toISOString(),
  //     };

  //     console.log('[ChatService] Formatted message:', JSON.stringify(formattedMessage, null, 2));
  //     console.log('[ChatService] ==================== END ====================');

  //     return formattedMessage;
  //   } catch (error) {
  //     console.error('[ChatService] ❌ ERROR:', error);
  //     console.error('[ChatService] Error message:', error.message);
  //     console.error('[ChatService] Error stack:', error.stack);
  //     throw error;
  //   }
  // }
// chat.service.ts
async sendMessage(dto: {
  conversationId: string;
  senderId: string;
  content: string;
  type: number;
  data?: any[];
  clientTempId?: string;
}) {
  try {

    const messagePayload = {
      conversationId: dto.conversationId,
      sendId: dto.senderId,
      content: dto.content || '',
      type: dto.type,
      data: dto.data && dto.data.length > 0 ? dto.data : null,
    };


    // ✅ MessagesService trả về {status, message, count, data}
    const response: any = await this.messagesService.send(messagePayload as any);


    // ✅ EXTRACT data từ response wrapper
    const savedMessage = response.data || response;


    // ✅ Parse JSON fields nếu cần
    const sender = typeof savedMessage.sender === 'string' 
      ? JSON.parse(savedMessage.sender) 
      : savedMessage.sender;

    const time = typeof savedMessage.time === 'string'
      ? JSON.parse(savedMessage.time)
      : savedMessage.time;

    const data = typeof savedMessage.data === 'string'
      ? JSON.parse(savedMessage.data)
      : savedMessage.data;

    // ✅ Format response chuẩn
    const formattedMessage = {
      id: savedMessage.id || '',
      conversationId: savedMessage.conversationId || dto.conversationId,
      content: savedMessage.content || dto.content || '',
      type: savedMessage.type ?? dto.type,
      data: data || null,
      caption: savedMessage.caption || null,
      linkContent: savedMessage.linkContent || null,
      mentions: savedMessage.mentions || null,
      reactions: savedMessage.reactions || null,
      replyTo: savedMessage.replyTo || null,
      status: savedMessage.status || null,
      sender: {
        id: sender?.id || dto.senderId,
        name: sender?.name || 'Unknown',
        avatar: sender?.avatar || '[]',
      },
      createdAt: savedMessage.createdAt || new Date().toISOString(),
      updatedAt: savedMessage.updatedAt || new Date().toISOString(),
    };


    return formattedMessage;
  } catch (error) {
    console.error('[ChatService] ❌ ERROR:', error);
    console.error('[ChatService] Error message:', error.message);
    console.error('[ChatService] Error stack:', error.stack);
    throw error;
  }
}
  /**
   * Lấy danh sách tin nhắn trong conversation
   */
  async getMessages(conversationId: string, page = 1, limit = 50) {
    try {
      if (typeof (this.messagesService as any).findByConversation === 'function') {
        return await (this.messagesService as any).findByConversation(
          conversationId,
          page,
          limit,
        );
      }
      
      console.warn('MessagesService.findByConversation not implemented');
      return {
        data: [],
        total: 0,
        page,
        limit,
      };
    } catch (error) {
      console.error('ChatService - getMessages error:', error);
      throw error;
    }
  }

  /**
   * Đánh dấu tin nhắn đã đọc
   */
  async markAsRead(
    conversationId: string,
    messageIds: string[],
    userId: string,
  ) {
    try {
      if (typeof (this.messagesService as any).markAsRead === 'function') {
        return await (this.messagesService as any).markAsRead(messageIds, userId);
      }
      
      console.warn('MessagesService.markAsRead not implemented');
      return { success: true, markedCount: messageIds.length };
    } catch (error) {
      console.error('ChatService - markAsRead error:', error);
      throw error;
    }
  }

  /**
   * Xóa tin nhắn
   */
  async deleteMessage(messageId: string, userId: string) {
    try {
      if (typeof (this.messagesService as any).delete === 'function') {
        return await (this.messagesService as any).delete(messageId, userId);
      }
      
      console.warn('MessagesService.delete not implemented');
      return { success: true, deleted: true };
    } catch (error) {
      console.error('ChatService - deleteMessage error:', error);
      throw error;
    }
  }

  /**
   * React to message
   */
  async reactToMessage(messageId: string, userId: string, reaction: string) {
    try {
      if (typeof (this.messagesService as any).addReaction === 'function') {
        return await (this.messagesService as any).addReaction(messageId, userId, reaction);
      }
      
      console.warn('MessagesService.addReaction not implemented');
      return { success: true, reaction };
    } catch (error) {
      console.error('ChatService - reactToMessage error:', error);
      throw error;
    }
  }
}