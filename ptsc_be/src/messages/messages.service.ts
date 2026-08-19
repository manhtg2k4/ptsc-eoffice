// // src/messages/messages.service.ts
// import {
//   BadRequestException,
//   Injectable,
//   Inject,
// } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { ConnectionPool } from 'mssql';
// import { randomUUID } from 'crypto';

// import { MessageEntity } from './entities/message.entity';
// import { SendMessageDto } from './dto/send-message.dto';

// /**
//  * Chuẩn response – GIỮ NGUYÊN STYLE
//  */
// function res(data: any, message = 'Success') {
//   return {
//     status: 1,
//     message,
//     count: Array.isArray(data) ? data.length : data ? 1 : 0,
//     data,
//   };
// }

// @Injectable()
// export class MessagesService {
//   constructor(
//     @InjectRepository(MessageEntity, 'mssqlConnection')
//     private readonly msgRepo: Repository<MessageEntity>,

//     @Inject('MSSQL_POOL')
//     private readonly pool: ConnectionPool,
//   ) {}

//   private validateId(id: string, field = 'id') {
//     if (!id) throw new BadRequestException(`${field} is required`);
//     return id;
//   }

//   // =========================
//   // SEND MESSAGE
//   // =========================
//     async send(dto: SendMessageDto) {
//     const conversationId = this.validateId(dto.conversationId, 'conversationId');
//     const sendId = this.validateId(dto.sendId, 'sendId');

//     const entity = new MessageEntity();

//     entity.id = randomUUID();
//     entity.conversationId = conversationId;
//     entity.sender = JSON.stringify({
//         id: sendId,
//         name: (dto as any).senderName ?? '',
//         avatar: (dto as any).senderAvatar ?? '',
//     });
//     entity.type = dto.type;
//     entity.content = dto.content ?? undefined;
//     entity.caption = dto.caption ?? undefined;
//     entity.data = dto.data ? JSON.stringify(dto.data) : undefined;
//     entity.replyTo = dto.replyTo ? JSON.stringify(dto.replyTo) : undefined;
//     entity.mentions = dto.mentions ? JSON.stringify(dto.mentions) : undefined;
//     entity.reactions = (dto as any).reactions
//         ? JSON.stringify((dto as any).reactions)
//         : undefined;
//     entity.status = (dto as any).status
//         ? JSON.stringify((dto as any).status)
//         : undefined;
//     entity.linkContent = dto.linkContent
//         ? JSON.stringify(dto.linkContent)
//         : undefined;
//     entity.time = JSON.stringify({
//         sentAt: new Date().toISOString(),
//     });

//     const saved = await this.msgRepo.save(entity);

//     await this.pool.request().query(`
//         UPDATE conversations
//         SET lastMessageId = '${saved.id}',
//             lastMessageAt = GETDATE(),
//             updatedAt = GETDATE()
//         WHERE id = '${conversationId}'
//     `);

//     return res(saved, 'Gửi tin nhắn thành công');
//     }


//   // =========================
//   // LIST MESSAGES
//   // =========================
//   async list(conversationId: string, limit = 20, before?: string) {
//     this.validateId(conversationId, 'conversationId');

//     const qb = this.msgRepo
//       .createQueryBuilder('m')
//       .where('m.conversationId = :conversationId', { conversationId })
//       .orderBy('m.createdAt', 'DESC')
//       .take(limit);

//     if (before) {
//       qb.andWhere('m.createdAt < :before', { before });
//     }

//     const rows = await qb.getMany();
//     return res(rows);
//   }

//   // =========================
//   // SEARCH
//   // =========================
//   async search(conversationId: string, q: string) {
//     this.validateId(conversationId, 'conversationId');

//     const rows = await this.msgRepo
//       .createQueryBuilder('m')
//       .where('m.conversationId = :conversationId', { conversationId })
//       .andWhere('m.content LIKE :q', { q: `%${q}%` })
//       .orderBy('m.createdAt', 'DESC')
//       .getMany();

//     return res(rows);
//   }
// }

// src/messages/messages.service.ts
import {
  BadRequestException,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConnectionPool } from 'mssql';
import { randomUUID } from 'crypto';

import { MessageEntity } from './entities/message.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { ConversationsService } from '../conversations/conversations.service';
import { NotificationService } from 'src/notifycation/notification.service';
import { ConfigService } from '@nestjs/config';
import { validateAttachFileUrls } from '../utils/url-validator.util';

/**
 * Chuẩn response – GIỮ NGUYÊN STYLE
 */
function res(data: any, message = 'Success') {
  return {
    status: 1,
    message,
    count: Array.isArray(data) ? data.length : data ? 1 : 0,
    data,
  };
}

/**
 * ===== JSON HELPERS =====
 */
function safeJsonParse<T = any>(value: any): T | null {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function mapMessageResponse(m: any) {
  return {
    ...m,
    sender: safeJsonParse(m.sender),
    data: safeJsonParse(m.data),
    replyTo: safeJsonParse(m.replyTo),
    mentions: safeJsonParse(m.mentions),
    reactions: safeJsonParse(m.reactions),
    status: safeJsonParse(m.status),
    linkContent: safeJsonParse(m.linkContent),
    time: safeJsonParse(m.time),
  };
}

@Injectable()
export class MessagesService {
  private dbname: string;
  constructor(
    @InjectRepository(MessageEntity, 'mssqlConnection')
    private readonly msgRepo: Repository<MessageEntity>,
    private readonly conversationsService: ConversationsService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,

    @Inject('MSSQL_POOL')
    private readonly pool: ConnectionPool,
  ) {}

  private validateId(id: string, field = 'id') {
    if (!id) throw new BadRequestException(`${field} is required`);
    return id;
  }
  private getDatabaseName(): string {
    const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
    if (!dbName) throw new Error('SQLSERVER_DATABASE not defined in .env');
    return dbName + '.dbo';
  }

  onModuleInit() {
    this.dbname = this.getDatabaseName();
  }


  // =========================
  // SEND MESSAGE
  // =========================
async send(dto: SendMessageDto) {
  const conversationId = this.validateId(dto.conversationId, 'conversationId');
  const sendId = this.validateId(dto.sendId, 'sendId');

  // Validate attachFile URLs to prevent Arbitrary URL Injection
  if (dto.data) {
    validateAttachFileUrls(dto.data);
  }

  // 1️⃣ LẤY USER
  const userRes = await this.pool.request().query(`
    SELECT id, name, avatar
    FROM users
    WHERE id = '${sendId}'
  `);

  const user = userRes.recordset[0];
  if (!user) {
    throw new BadRequestException('User không tồn tại');
  }

  // 2️⃣ TẠO ENTITY
  const entity = new MessageEntity();
  entity.id = randomUUID();
  entity.conversationId = conversationId;
  entity.sender = JSON.stringify({
    id: user.id,
    name: user.name,
    avatar: user.avatar,
  });
  entity.type = dto.type;
  entity.content = dto.content ?? undefined;
  entity.caption = dto.caption ?? undefined;
  entity.data = dto.data ? JSON.stringify(dto.data) : undefined;
  entity.replyTo = dto.replyTo ? JSON.stringify(dto.replyTo) : undefined;
  entity.mentions = dto.mentions ? JSON.stringify(dto.mentions) : undefined;
  entity.reactions = (dto as any).reactions
    ? JSON.stringify((dto as any).reactions)
    : undefined;
  entity.status = (dto as any).status
    ? JSON.stringify((dto as any).status)
    : undefined;
  entity.linkContent = dto.linkContent
    ? JSON.stringify(dto.linkContent)
    : undefined;
  entity.time = JSON.stringify({
    sentAt: new Date().toISOString(),
  });

  // 3️⃣ SAVE MESSAGE
  const saved = await this.msgRepo.save(entity);

  // ⭐ UPDATE UNREAD
  await this.pool.request().query(`
    UPDATE ${this.dbname}.conversation_member_states
    SET unread = ISNULL(unread, 0) + 1
    WHERE conversationId = '${conversationId}'
      AND userId <> '${sendId}'
      AND deletedAt IS NULL
  `);

  await this.pool.request().query(`
    UPDATE ${this.dbname}.conversation_member_states
    SET unread = 0,
        lastReadAt = GETDATE()
    WHERE conversationId = '${conversationId}'
      AND userId = '${sendId}'
  `);


    let lastMessagePreview = 'Hiện có tin nhắn mới';

    // 1️⃣ Có data → gửi file / ảnh
    if (dto.data && Array.isArray(dto.data) && dto.data.length > 0) {
      // nếu muốn phân biệt loại file thì làm thêm ở đây
      lastMessagePreview = '📎 Đã gửi một tệp';
    }

    // 2️⃣ Không có data → lấy content / caption
    else if (dto.content && dto.content.trim()) {
      lastMessagePreview = dto.content.trim();
    }
    else if (dto.caption && dto.caption.trim()) {
      lastMessagePreview = dto.caption.trim();
    }

    
    // ⭐ UPDATE PHÒNG
    await this.conversationsService.updateLastMessage({
      conversationId,
      messageId: saved.id,
      lastMessagePreview,
    });
    
    // 🔔 TẠO THÔNG BÁO CHO CÁC THÀNH VIÊN KHÁC
    try {
      // Lấy danh sách userId từ conversation_member_states (trừ người gửi)
      const membersRes = await this.pool.request().query(`
        SELECT userId
        FROM ${this.dbname}.conversation_member_states
        WHERE conversationId = '${conversationId}'
          AND userId <> '${sendId}'
          AND deletedAt IS NULL
          AND (hidden = 0 OR hidden IS NULL)
      `);

      const recipients = membersRes.recordset.map((r: any) => r.userId);

      // Tạo nội dung thông báo
      const notificationContent = dto.data && Array.isArray(dto.data) && dto.data.length > 0
        ? `${user.name} đã gửi một tệp tin`
        : dto.content && dto.content.trim()
        ? `${user.name}: ${dto.content.substring(0, 100)}${dto.content.length > 100 ? '...' : ''}`
        : `${user.name} đã gửi tin nhắn mới`;

      // Tạo thông báo cho từng thành viên
      for (const recipientId of recipients) {
        await this.notificationService.create({
          recipientId: recipientId,
          senderId: sendId,
          content: notificationContent,
          recordId: conversationId,
          link: `/chat/${conversationId}`,
          key: "CHAT",
          time: new Date(),
          status: 1,
        });
      }
    } catch (error) {
      console.error('Failed to create notifications:', error);
      // Không throw error để không ảnh hưởng đến việc gửi tin nhắn
    }

    // 4️⃣ RESPONSE
    return res(mapMessageResponse(saved), 'Gửi tin nhắn thành công');
  }


  // =========================
  // LIST MESSAGES
  // =========================
  async list(
    conversationId: string,
    userId: string,
    limit = 20,
    skip = 0,
  ) {
    this.validateId(conversationId, 'conversationId');

      if (userId) {
    try {
      await this.pool.request()
        .input('userId', userId)
        .input('conversationId', conversationId)
        .query(`
          UPDATE ${this.dbname}.conversation_member_states
          SET unread = 0,
              lastReadAt = GETDATE()
          WHERE userId = @userId
            AND conversationId = @conversationId
        `);
    } catch (error) {
      console.warn('Failed to mark as read:', error);
    }
  }


    // 1️⃣ Query DESC để skip đúng
    const rows = await this.msgRepo
      .createQueryBuilder('m')
      .where('m.conversationId = :conversationId', { conversationId })
      .orderBy('m.createdAt', 'DESC')
      .addOrderBy('m.id', 'DESC') // 🔑 deterministic
      .skip(skip)
      .take(limit)
      .getMany();

        const Countrows = await this.msgRepo
      .createQueryBuilder('m')
      .where('m.conversationId = :conversationId', { conversationId })
      .orderBy('m.createdAt', 'DESC')
      .addOrderBy('m.id', 'DESC') // 🔑 deterministic
      .getMany();

    // 2️⃣ ĐẢO MẢNG KẾT QUẢ (cũ → mới)
    const data = [...rows]
      .reverse()
      .map(mapMessageResponse);

    // 3️⃣ Trả response GIỮ NGUYÊN FORMAT
    return {
      status: 1,
      message: 'Success',
      count: Countrows.length,
      data,
    };
  }

  // =========================
  // SEARCH
  // =========================
  async search(conversationId: string, q: string) {
    this.validateId(conversationId, 'conversationId');

    const rows = await this.msgRepo
      .createQueryBuilder('m')
      .where('m.conversationId = :conversationId', { conversationId })
      .andWhere('m.content LIKE :q', { q: `%${q}%` })
      .orderBy('m.createdAt', 'DESC')
      .getMany();

    return res(rows.map(mapMessageResponse));
  }

// src/messages/messages.service.ts - SỬA 2 METHODS

/**
 * 1️⃣ Đếm tổng unread của 1 CONVERSATION CỤ THỂ
 * GET /api/messages/unread-count?userId=xxx&conversationId=yyy
 */
async getTotalUnread(userId: string): Promise<number> {
  const rs = await this.pool.request()
    .input('userId', userId)
    .query(`
      SELECT COALESCE(SUM(unread), 0) AS totalUnread
      FROM ${this.dbname}.conversation_member_states
      WHERE userId = @userId
        AND deletedAt IS NULL
        AND (hidden = 0 OR hidden IS NULL)
    `);

  return rs.recordset[0].totalUnread;
}

/**
 * 2️⃣ Đếm unread THEO TỪNG CONVERSATION (TẤT CẢ)
 * GET /api/messages/unread-by-conversation?userId=xxx
 */
async getUnreadByConversation(userId: string) {
  const rs = await this.pool.request()
    .input('userId', userId)
    .query(`
      SELECT
        conversationId,
        unread AS unreadCount
      FROM ${this.dbname}.conversation_member_states
      WHERE userId = @userId
        AND deletedAt IS NULL
        AND (hidden = 0 OR hidden IS NULL)
    `);

  return rs.recordset;
}

  /**
   * 3️⃣ Click conversation = đọc hết
   */
  async markConversationRead(userId: string, conversationId: string) {
    await this.pool.request()
      .input('userId', userId)
      .input('conversationId', conversationId)
      .query(`
        UPDATE ${this.dbname}.conversation_member_states
        SET unread = 0,
            lastReadAt = GETDATE()
        WHERE userId = @userId
          AND conversationId = @conversationId
      `);
  }

  async increaseUnreadForMembers(conversationId: string, senderId: string) {
    await this.pool.request()
      .input('conversationId', conversationId)
      .input('senderId', senderId)
      .query(`
        UPDATE ${this.dbname}.conversation_member_states
        SET unread = ISNULL(unread, 0) + 1
        WHERE conversationId = @conversationId
          AND userId <> @senderId
          AND deletedAt IS NULL
          AND (hidden = 0 OR hidden IS NULL)
      `);
  }

  async searchMessages(params: {
  conversationId: string;
  keyword?: string;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
  page: number;
  limit: number;
}) {
  const { conversationId, keyword, fromDate, toDate, page, limit } = params;

  const safePage = page > 0 ? page : 1;
  const safeLimit = limit > 0 ? Math.min(limit, 100) : 20;
  const offset = (safePage - 1) * safeLimit;

  const request = this.pool.request()
    .input('conversationId', conversationId)
    .input('offset', offset)
    .input('limit', safeLimit);

  let whereSql = `
    WHERE m.conversationId = @conversationId
  `;

  /** 🔹 LỌC THEO NGÀY */
  if (fromDate) {
    request.input('fromDate', new Date(`${fromDate}T00:00:00`));
    whereSql += ` AND m.createdAt >= @fromDate`;
  }

  if (toDate) {
    request.input('toDate', new Date(`${toDate}T23:59:59.999`));
    whereSql += ` AND m.createdAt <= @toDate`;
  }

  /** 🔹 SEARCH TIẾNG VIỆT CÓ / KHÔNG DẤU */
  if (keyword && keyword.trim()) {
    request.input('kw', `%${keyword}%`);
    whereSql += `
      AND (
        m.content COLLATE Vietnamese_100_CI_AI_SC LIKE @kw
        OR m.caption COLLATE Vietnamese_100_CI_AI_SC LIKE @kw
        OR m.linkContent COLLATE Vietnamese_100_CI_AI_SC LIKE @kw
      )
    `;
  }

  /** 1️⃣ COUNT */
  const countResult = await request.query(`
    SELECT COUNT(1) AS total
    FROM ${this.dbname}.messages m
    ${whereSql}
  `);

  const count = countResult.recordset[0]?.total ?? 0;

  /** 2️⃣ DATA */
  const dataResult = await request.query(`
    SELECT
      m.id,
      m.conversationId,
      m.senderId,
      m.senderName,
      m.senderAvatar,
      m.type,
      m.content,
      m.caption,
      m.linkContent,
      m.replyTo,
      m.status,
      m.createdAt,
      m.updatedAt
    FROM ${this.dbname}.messages m
    ${whereSql}
    ORDER BY m.createdAt DESC, m.id DESC
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY
  `);

  return {
    count,
    data: dataResult.recordset,
  };
}

}
