// notification.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { extractSocketToken } from '../utils/socket.util';
import { NotificationService } from './notification.service';
import { ChatService } from '../chat/chat.service';
import { ConversationsService } from '../conversations/conversations.service';


import { verifyKeycloakToken } from '../utils/keycloak-verify';
import { UsersService } from '../users/users.service';
import { validateAttachFileUrls } from '../utils/url-validator.util';
import { NotificationGroup } from './notification.enum';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: `${process.env.SOCKET_PATH || ''}/notifications`,
  path: `/socket.io`,
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('NotificationGateway');
  // Hàng đợi
  private pendingUserIds = new Set<string>();
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    @Inject(forwardRef(() => ConversationsService))
    private readonly conversationsService: ConversationsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) { }

  afterInit(server: Server) {
    server.use(async (socket: Socket, next) => {
      try {
        let token = extractSocketToken(socket);
        if (!token && socket.handshake.headers.cookie) {
          const cookies = socket.handshake.headers.cookie.split('; ');
          const tokenCookie = cookies.find((c) => c.startsWith('tokenUser=') || c.startsWith('token='));
          if (tokenCookie) token = tokenCookie.split('=')[1];
        }

        if (!token) {
          return next(new Error('Authentication error: Missing token'));
        }

        const decoded: any = await verifyKeycloakToken(token);
        const keycloakUserId = decoded.sub || decoded.user || decoded.userId || decoded.id;

        if (!keycloakUserId) {
          return next(new Error('Authentication error: Invalid token payload'));
        }

        // Tìm User trong DB để lấy ID gốc (internal ID)
        const user = await this.usersService.findOneByKeycloakId(keycloakUserId);

        if (!user) {
          this.logger.error(`❌ User with keycloakUserId ${keycloakUserId} not found in database`);
          return next(new Error('Authentication error: User not synchronized'));
        }

        socket.data.userId = user.id; // Lưu Database ID
        socket.data.keycloakUserId = keycloakUserId; // Lưu Keycloak UUID để tham khảo
        next();
      } catch (err) {
        this.logger.error(`❌ Token verification failed for ${socket.id}: ${err.message}`);
        next(new Error('Authentication error: jwt expired'));
      }
    });
  }

  async handleConnection(client: Socket) {
    try {
      // 1. Lấy ID đã được chuẩn hóa từ middleware
      const userId = client.data.userId;

      if (!userId) {
        this.logger.warn(`❌ Không tìm thấy UserID cho client: ${client.id}`);
        client.disconnect(true);
        return;
      }

      // 2. Join các phòng liên quan
      await client.join(userId);

      // AUTO JOIN các phòng chat/conversation
      const conversationIds = await this.conversationsService.getConversationIdsByUser(userId);
      for (const cid of conversationIds) {
        const roomName = `conversation_${cid}`;
        await client.join(roomName);
      }

      // Gửi ngay danh sách notification hiện tại
      const [notifications, unreadCount, processGroup, receiveGroup] = await Promise.all([
        this.notificationService.findAll(userId, { page: 1, limit: 50, excludeHidden: true }),
        this.notificationService.getUnreadCount(userId, true),
        this.notificationService.findAll(userId, { page: 1, limit: 50, filter: { group: NotificationGroup.PROCESS }, excludeHidden: true } as any),
        this.notificationService.findAll(userId, { page: 1, limit: 50, filter: { group: NotificationGroup.RECEIVE }, excludeHidden: true } as any),
      ]);

      client.emit('notificationList', {
        ...notifications,
        unreadCount,
        dataGroup: {
          PROCESS: processGroup,
          RECEIVE: receiveGroup,
        },
      });

    } catch (error) {
      this.logger.error(`🔴 Lỗi trong handleConnection (${client.id}): ${error.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.warn(`🔌 Client ngắt kết nối: id=${client.id}, UserID=${client.data?.userId || 'N/A'}`);
  }

  // NotificationGateway.ts
  async sendUpdate(userId: string, traceKey?: string) {
    try {
      // Get latest notifications (page 1, limit 10)
      const [notifications, unreadCount, processGroup, receiveGroup] = await Promise.all([
        this.notificationService.findAll(userId, { page: 1, limit: 10, excludeHidden: true }),
        this.notificationService.getUnreadCount(userId, true),
        this.notificationService.findAll(userId, { page: 1, limit: 50, filter: { group: NotificationGroup.PROCESS }, excludeHidden: true } as any),
        this.notificationService.findAll(userId, { page: 1, limit: 50, filter: { group: NotificationGroup.RECEIVE }, excludeHidden: true } as any),
      ]);

      // Emit latest list + unread count
      this.server.to(userId).emit('notificationList', {
        ...notifications,
        unreadCount,
        dataGroup: {
          PROCESS: processGroup,
          RECEIVE: receiveGroup,
        },
      });

      if (traceKey === 'BOOK_ASSIGNED') {
      }
    } catch (error) {
      if (traceKey === 'BOOK_ASSIGNED') {
        this.logger.error(`[notify][book-assigned][socket_error] userId=${userId}: ${error.message}`);
      } else {
        this.logger.error(`Failed to send notifications to ${userId}: ${error.message}`);
      }
    }
  }

  @SubscribeMessage('fetchNotifications')
  async handleFetchNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { limit: number; page?: number; key?: string },
  ) {
    try {
      const userId = client.data.userId;
      const limit = payload.limit || 10;
      const page = payload.page || 1;

      const [notifications, unreadCount, processGroup, receiveGroup] = await Promise.all([
        this.notificationService.findAll(userId, { page, limit, key: payload.key, excludeHidden: true }),
        this.notificationService.getUnreadCount(userId, true),
        this.notificationService.findAll(userId, { page: 1, limit: 50, filter: { group: NotificationGroup.PROCESS }, excludeHidden: true } as any),
        this.notificationService.findAll(userId, { page: 1, limit: 50, filter: { group: NotificationGroup.RECEIVE }, excludeHidden: true } as any),
      ]);

      client.emit('notificationList', {
        ...notifications,
        unreadCount,
        dataGroup: {
          PROCESS: processGroup,
          RECEIVE: receiveGroup,
        },
      });
    } catch (error) {
      this.logger.error('fetchNotifications error:', error.message);
    }
  }

  // ============ CHAT METHODS ============

  /**
   * Join conversation room
   * FE emit: socket.emit('join', { conversationId })
   */
  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    try {
      const userId = client.data.userId;
      const { conversationId } = payload;

      if (!conversationId) {
        this.logger.error('Missing conversationId in join event');
        return;
      }

      // Join conversation room
      const roomName = `conversation_${conversationId}`;
      client.join(roomName);


      // Có thể gửi xác nhận về client nếu cần
      client.emit('joined', {
        conversationId,
        success: true
      });
    } catch (error) {
      this.logger.error(`Failed to join conversation: ${error.message}`);
      client.emit('error', {
        message: 'Failed to join conversation',
        error: error.message
      });
    }
  }

  /**
   * Leave conversation room
   * FE emit: socket.emit('leave', { conversationId })
   */
  @SubscribeMessage('leave')
  async handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    try {
      const userId = client.data.userId;
      const { conversationId } = payload;

      if (!conversationId) {
        this.logger.error('Missing conversationId in leave event');
        return;
      }

      const roomName = `conversation_${conversationId}`;
      client.leave(roomName);


      client.emit('left', {
        conversationId,
        success: true
      });
    } catch (error) {
      this.logger.error(`Failed to leave conversation: ${error.message}`);
    }
  }

  /**
   * Gửi tin nhắn
   * FE emit: socket.emit('send_message', {
   *   conversationId,
   *   content,
   *   sendId,
   *   type,
   *   data,
   *   clientTempId
   * })
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      conversationId: string;
      content: string;
      sendId: string;
      type: number; // 0: text, 1: file/image
      data?: Array<{
        attachFile: string;
        name: string;
        size: number;
        type: string;
      }>;
      clientTempId?: string;
    },
  ) {
    try {
      const senderId = client.data.userId;

      if (!senderId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Validate attachFile URLs to prevent Arbitrary URL Injection
      if (payload.data) {
        validateAttachFileUrls(payload.data);
      }


      // Gọi service để lưu message vào DB
      const savedMessage = await this.chatService.sendMessage({
        conversationId: payload.conversationId,
        senderId: senderId,
        content: payload.content,
        type: payload.type,
        data: payload.data,
        clientTempId: payload.clientTempId,
      });

      // savedMessage đã được format sẵn từ ChatService
      const messageResponse = {
        ...savedMessage,
        time: {
          sentAt: savedMessage.createdAt,
        },
        clientTempId: payload.clientTempId,
      };

      // Gửi tin nhắn đến tất cả members trong conversation room
      const roomName = `conversation_${payload.conversationId}`;
      this.server.to(roomName).emit('new_message', messageResponse);

      // Gửi xác nhận cho người gửi (nếu cần riêng)
      client.emit('message_sent', {
        success: true,
        message: messageResponse,
      });

    } catch (error) {
      this.logger.error(`❌ Failed to send message: ${error.message}`);
      this.logger.error(error.stack);

      client.emit('message_error', {
        message: 'Failed to send message',
        error: error.message,
        clientTempId: payload.clientTempId, // Để FE biết message nào bị lỗi
      });
    }
  }

  /**
   * Đánh dấu đã đọc tin nhắn
   * FE emit: socket.emit('mark_as_read', { conversationId, messageIds })
   */
  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      conversationId: string;
      messageIds: string[]
    },
  ) {
    try {
      const userId = client.data.userId;

      // TODO: Implement mark as read logic in ChatService
      // await this.chatService.markAsRead(payload.conversationId, payload.messageIds, userId);

      // Thông báo cho các members khác trong conversation
      const roomName = `conversation_${payload.conversationId}`;
      this.server.to(roomName).emit('messages_read', {
        conversationId: payload.conversationId,
        messageIds: payload.messageIds,
        readBy: userId,
        readAt: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Failed to mark messages as read: ${error.message}`);
    }
  }

  /**
   * User đang typing
   * FE emit: socket.emit('typing', { conversationId, isTyping })
   */
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      conversationId: string;
      isTyping: boolean
    },
  ) {
    try {
      const userId = client.data.userId;

      // Broadcast typing status tới conversation room (trừ người gửi)
      const roomName = `conversation_${payload.conversationId}`;
      client.to(roomName).emit('user_typing', {
        conversationId: payload.conversationId,
        userId: userId,
        isTyping: payload.isTyping,
      });
    } catch (error) {
      this.logger.error(`Failed to broadcast typing status: ${error.message}`);
    }
  }

  /**
   * Xóa tin nhắn
   * FE emit: socket.emit('delete_message', { conversationId, messageId })
   */
  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      conversationId: string;
      messageId: string
    },
  ) {
    try {
      const userId = client.data.userId;

      // TODO: Implement delete message logic in ChatService
      // await this.chatService.deleteMessage(payload.messageId, userId);

      // Thông báo cho các members khác
      const roomName = `conversation_${payload.conversationId}`;
      this.server.to(roomName).emit('message_deleted', {
        conversationId: payload.conversationId,
        messageId: payload.messageId,
        deletedBy: userId,
        deletedAt: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Failed to delete message: ${error.message}`);
    }
  }

  /**
   * React to message (like, love, etc.)
   * FE emit: socket.emit('react_message', { conversationId, messageId, reaction })
   */
  @SubscribeMessage('react_message')
  async handleReactMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      conversationId: string;
      messageId: string;
      reaction: string; // 'like', 'love', 'haha', etc.
    },
  ) {
    try {
      const userId = client.data.userId;

      // TODO: Implement reaction logic in ChatService
      // await this.chatService.reactToMessage(payload.messageId, userId, payload.reaction);

      // Broadcast reaction to conversation
      const roomName = `conversation_${payload.conversationId}`;
      this.server.to(roomName).emit('message_reacted', {
        conversationId: payload.conversationId,
        messageId: payload.messageId,
        userId: userId,
        reaction: payload.reaction,
        reactedAt: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Failed to react to message: ${error.message}`);
    }
  }

  // ============ UTILITY METHODS ============

  /**
   * Gửi tin nhắn mới đến user cụ thể (được gọi từ service/controller)
   */
  async sendNewMessageToUser(userId: string, message: any) {
    try {
      const messageResponse = {
        id: message.id,
        conversationId: message.conversationId,
        content: message.content,
        type: message.type,
        data: message.data || null,
        caption: message.caption || null,
        linkContent: message.linkContent || null,
        mentions: message.mentions || null,
        reactions: message.reactions || null,
        replyTo: message.replyTo || null,
        status: message.status || null,
        sender: {
          id: message.sender.id,
          name: message.sender.name,
          avatar: message.sender.avatar || '[]',
        },
        time: {
          sentAt: message.createdAt,
        },
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      };

      this.server.to(userId).emit('new_message', messageResponse);
    } catch (error) {
      this.logger.error(`Failed to send new message to ${userId}: ${error.message}`);
    }
  }

  /**
   * Broadcast message to conversation room
   */
  async broadcastToConversation(conversationId: string, event: string, data: any) {
    try {
      const roomName = `conversation_${conversationId}`;
      this.server.to(roomName).emit(event, data);
    } catch (error) {
      this.logger.error(`Failed to broadcast to conversation: ${error.message}`);
    }
  }

  /**
   * Gửi sự kiện thành công đến user cụ thể
   */
  async sendSuccessStatus(userId: string, eventName: string, data: any) {
    try {
      this.server.to(userId).emit(eventName, { status: 'success', ...data });
    } catch (error) {
      this.logger.error(`Failed to send event '${eventName}' to ${userId}: ${error.message}`);
    }
  }

  /**
   * Gửi một sự kiện thành công đến TẤT CẢ người dùng đang kết nối.
   * @param eventName Tên của sự kiện (ví dụ: 'fileUpdateSuccess').
   * @param data Dữ liệu đi kèm với sự kiện.
   */
  async broadcastSuccessStatus(eventName: string, data: any) {
    try {
      this.server.emit(eventName, { status: 'success', ...data });
    } catch (error) {
      this.logger.error(`Failed to broadcast event '${eventName}': ${error.message}`);
    }
  }

  /**
   * Được gọi mỗi khi có notification mới
   * Gom userId lại, không emit ngay
   */
  queueUserNotification(userId: string) {
    this.pendingUserIds.add(userId);

    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushQueuedNotifications();
      }, 100); // debounce 100ms
    }
  }

  /**
   * Emit notificationList cho các user đã gom
   */
  private async flushQueuedNotifications() {
    const userIds = Array.from(this.pendingUserIds);
    this.pendingUserIds.clear();
    this.flushTimer = null;

    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const [notifications, unreadCount, processGroup, receiveGroup] = await Promise.all([
            this.notificationService.findAll(userId, { page: 1, limit: 10, excludeHidden: true }),
            this.notificationService.getUnreadCount(userId, true),
            this.notificationService.findAll(userId, { page: 1, limit: 50, filter: { group: NotificationGroup.PROCESS }, excludeHidden: true } as any),
            this.notificationService.findAll(userId, { page: 1, limit: 50, filter: { group: NotificationGroup.RECEIVE }, excludeHidden: true } as any),
          ]);

          this.server.to(userId).emit('notificationList', {
            ...notifications,
            unreadCount,
            dataGroup: {
              PROCESS: processGroup,
              RECEIVE: receiveGroup,
            },
          });
        } catch (error) {
          this.logger.error(
            `Emit notificationList failed for user ${userId}: ${error.message}`,
          );
        }
      }),
    );
  }
}
