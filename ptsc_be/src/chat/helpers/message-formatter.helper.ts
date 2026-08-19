// src/chat/helpers/message-formatter.helper.ts
import { IMessageResponse } from '../interfaces/message.interface';

export class MessageFormatterHelper {
  /**
   * Format raw message từ DB thành IMessageResponse
   * Xử lý safely với nhiều cấu trúc data khác nhau
   */
  static formatMessage(
    rawMessage: any,
    fallbackData?: {
      senderId?: string;
      conversationId?: string;
      content?: string;
      type?: number;
    },
  ): IMessageResponse {
    const now = new Date().toISOString();

    return {
      // ID - Support cả MongoDB (_id) và SQL (id)
      id: rawMessage.id || rawMessage._id?.toString() || '',

      // Conversation ID
      conversationId:
        rawMessage.conversationId ||
        rawMessage.conversation_id ||
        fallbackData?.conversationId ||
        '',

      // Content
      content:
        rawMessage.content ??
        fallbackData?.content ??
        '',

      // Type - 0: text, 1: file/image
      type:
        rawMessage.type ??
        rawMessage.messageType ??
        fallbackData?.type ??
        0,

      // Data - Attachments
      data: this.formatAttachments(rawMessage.data || rawMessage.attachments),

      // Optional fields
      caption: rawMessage.caption || null,
      linkContent: rawMessage.linkContent || rawMessage.link_content || null,
      mentions: rawMessage.mentions || null,
      reactions: rawMessage.reactions || null,
      replyTo: rawMessage.replyTo || rawMessage.reply_to || null,
      status: rawMessage.status || null,

      // Sender information
      sender: {
        id: this.getSenderId(rawMessage, fallbackData?.senderId),
        name: this.getSenderName(rawMessage),
        avatar: this.getSenderAvatar(rawMessage),
      },

      // Time
      time: {
        sentAt: rawMessage.createdAt || rawMessage.created_at || now,
      },

      // Timestamps
      createdAt: rawMessage.createdAt || rawMessage.created_at || now,
      updatedAt: rawMessage.updatedAt || rawMessage.updated_at || now,
    };
  }

  /**
   * Format attachments safely
   */
  private static formatAttachments(data: any): any[] | null {
    if (!data) return null;

    // Nếu đã là array
    if (Array.isArray(data)) {
      return data.map((item) => ({
        attachFile: item.attachFile || item.attach_file || item.url || '',
        name: item.name || item.filename || 'unknown',
        size: item.size || 0,
        type: item.type || item.mimeType || item.mime_type || 'application/octet-stream',
      }));
    }

    // Nếu là string (có thể JSON)
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return this.formatAttachments(parsed);
      } catch {
        return null;
      }
    }

    // Nếu là single object
    if (typeof data === 'object') {
      return [
        {
          attachFile: data.attachFile || data.attach_file || data.url || '',
          name: data.name || data.filename || 'unknown',
          size: data.size || 0,
          type: data.type || data.mimeType || 'application/octet-stream',
        },
      ];
    }

    return null;
  }

  /**
   * Get sender ID từ nhiều possible fields
   */
  private static getSenderId(rawMessage: any, fallbackId?: string): string {
    // Priority 1: sender object
    if (rawMessage.sender) {
      return (
        rawMessage.sender.id ||
        rawMessage.sender.userId ||
        rawMessage.sender._id?.toString() ||
        ''
      );
    }

    // Priority 2: sendId field (MessagesService uses this)
    if (rawMessage.sendId) {
      return rawMessage.sendId;
    }

    // Priority 3: senderId field
    if (rawMessage.senderId) {
      return rawMessage.senderId;
    }

    // Priority 4: other possible fields
    return (
      rawMessage.userId ||
      rawMessage.user_id ||
      fallbackId ||
      'unknown'
    );
  }

  /**
   * Get sender name
   */
  private static getSenderName(rawMessage: any): string {
    // Priority 1: sender object
    if (rawMessage.sender) {
      return (
        rawMessage.sender.name ||
        rawMessage.sender.username ||
        rawMessage.sender.displayName ||
        'Unknown User'
      );
    }

    // Priority 2: direct fields
    return (
      rawMessage.senderName ||
      rawMessage.sender_name ||
      rawMessage.userName ||
      rawMessage.user_name ||
      rawMessage.username ||
      'Unknown User'
    );
  }

  /**
   * Get sender avatar
   */
  private static getSenderAvatar(rawMessage: any): string {
    let avatar;

    // Priority 1: sender object
    if (rawMessage.sender) {
      avatar =
        rawMessage.sender.avatar ||
        rawMessage.sender.avatarUrl ||
        rawMessage.sender.profilePicture;
    }

    // Priority 2: direct fields
    if (!avatar) {
      avatar =
        rawMessage.senderAvatar ||
        rawMessage.sender_avatar ||
        rawMessage.userAvatar ||
        rawMessage.user_avatar ||
        rawMessage.avatar;
    }

    // Nếu là string empty hoặc null, return '[]'
    if (!avatar || avatar === '') return '[]';

    // Nếu là array, stringify
    if (Array.isArray(avatar)) return JSON.stringify(avatar);

    // Return as is
    return avatar;
  }

  /**
   * Format multiple messages
   */
  static formatMessages(rawMessages: any[], fallbackData?: any): IMessageResponse[] {
    if (!Array.isArray(rawMessages)) return [];

    return rawMessages.map((msg) =>
      this.formatMessage(msg, fallbackData),
    );
  }
}