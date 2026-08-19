// src/conversations/conversations.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationEntity } from './entities/conversation.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { Inject } from '@nestjs/common';
import { ConnectionPool } from 'mssql';
import { ConversationType } from './conversation.types';
import { ConversationMember } from './entities/conversation-member.entity';
import { ConversationMemberState } from './entities/conversation-member-state.entity';
import { randomUUID } from 'crypto'; // ✅ Thêm import này

function res(data: any, message = 'Success') {
  return {
    status: 1,
    message,
    count: Array.isArray(data) ? data.length : data ? 1 : 0,
    data,
  };
}

// ✅ Di chuyển generateId() lên trước class và implement đúng
function generateId(): string {
  return randomUUID();
}

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(ConversationEntity, 'mssqlConnection')
    private readonly convRepo: Repository<ConversationEntity>,

    @Inject('MSSQL_POOL')
    private readonly pool: ConnectionPool,
  ) {}

  private validateId(id: string, field = 'id'): string {
    if (!id) throw new BadRequestException(`${field} is required`);
    return id;
  }

  async create(dto: CreateConversationDto) {
    // ✅ FIX: Thêm id vào entity
    const entity = this.convRepo.create({
      id: generateId(), // ✅ Generate UUID cho conversation
      createdBy: dto.userId,
      type: dto.type === ConversationType.DIRECT ? 0 : 1,
      title: dto.name,
      avatar: dto.avatar,
      backgroundImage: dto.backgroundImage,
    });

    const saved = await this.convRepo.save(entity);

    // ✅ Tạo member và state cho từng user
    for (const userId of dto.memberIds) {
      const member = this.convRepo.manager.create(ConversationMember, {
        id: generateId(), // ✅ Generate UUID cho member
        conversation: saved,
        userId,
        role: userId === dto.userId ? 1 : 0, // Creator = admin (1)
        joinedAt: new Date(),
      });
      await this.convRepo.manager.save(member);

      const state = this.convRepo.manager.create(ConversationMemberState, {
        id: generateId(), // ✅ Generate UUID cho state
        conversation: saved,
        userId,
        pinnedOrder: null,
        unread: false,
        hidden: false,
        deletedAt: null,
        lastReadAt: null,
      });
      await this.convRepo.manager.save(state);
    }

    return res(saved, 'Tạo cuộc hội thoại thành công');
  }

  // List conversations của user
  async list(userId: string) {
    const uid = this.validateId(userId);
    const convs = await this.convRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.memberStates', 'ms')
      .where('ms.userId = :uid', { uid })
      .andWhere('ms.deletedAt IS NULL')
      .orderBy('c.updatedAt', 'DESC')
      .getMany();
    return res(convs);
  }

  // Chi tiết conversation
  async detail(userId: string, id: string) {
    const uid = this.validateId(userId);
    const cid = this.validateId(id);
    const conv = await this.convRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.members', 'm')
      .leftJoinAndSelect('c.memberStates', 'ms')
      .where('c.id = :cid', { cid })
      .andWhere('ms.userId = :uid AND ms.deletedAt IS NULL', { uid })
      .getOne();

    if (!conv) throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    return res(conv);
  }

  async updateConversation(userId: string, id: string, dto: UpdateConversationDto) {
    const uid = this.validateId(userId);
    const cid = this.validateId(id);
    const conv = await this.convRepo.findOneBy({ id: cid });
    if (!conv || conv.createdBy !== uid) {
      throw new ForbiddenException('Không phải chủ conversation');
    }
    await this.convRepo.update(cid, dto);
    const updated = await this.convRepo.findOneBy({ id: cid });
    return res(updated, 'Cập nhật thành công');
  }

  async pin(userId: string, convId: string, pinnedOrder?: number) {
    const uid = this.validateId(userId);
    const cid = this.validateId(convId);

    const maxRes = await this.pool.request().query(`
      SELECT MAX(JSON_VALUE(value, '$.pinnedOrder')) AS maxOrder
      FROM conversations
      CROSS APPLY OPENJSON(memberStates)
      WHERE id = '${cid}' AND JSON_VALUE(value, '$.userId') = '${uid}'
    `);
    let order = pinnedOrder ?? (Number(maxRes.recordset[0]?.maxOrder || 0) + 1);

    await this.pool.request().query(`
      UPDATE conversations
      SET memberStates = JSON_MODIFY(memberStates, '$[?(@.userId == "${uid}")].pinnedOrder', ${order})
      WHERE id = '${cid}'
    `);

    return { status: 1, message: 'Đã ghim cuộc hội thoại', count: 1, data: { pinnedOrder: order } };
  }

  async unpin(userId: string, convId: string) {
    const uid = this.validateId(userId);
    const cid = this.validateId(convId);

    await this.pool.request().query(`
      UPDATE conversations
      SET memberStates = JSON_MODIFY(memberStates, '$[?(@.userId == "${uid}")].pinnedOrder', NULL)
      WHERE id = '${cid}'
    `);

    return res({}, 'Đã bỏ ghim');
  }

  async deleteSoft(userId: string, convId: string) {
    const uid = this.validateId(userId);
    const cid = this.validateId(convId);

    await this.pool.request().query(`
      UPDATE conversations
      SET memberStates = JSON_MODIFY(memberStates, '$[?(@.userId == "${uid}")].deletedAt', GETDATE())
      WHERE id = '${cid}'
    `);

    return res({}, 'Đã xoá cuộc hội thoại phía bạn');
  }

  async deleteHard(userId: string, convId: string) {
    const uid = this.validateId(userId);
    const cid = this.validateId(convId);
    const conv = await this.convRepo.findOneBy({ id: cid });
    if (!conv || conv.createdBy !== uid) {
      throw new ForbiddenException('Chỉ người tạo mới được xoá vĩnh viễn');
    }
    await this.convRepo.delete(cid);
    return res({}, 'Đã xoá vĩnh viễn cuộc hội thoại');
  }

  async updateLastMessage(conversationId: string, messageId: string) {
    const cid = this.validateId(conversationId);
    await this.convRepo.update(cid, {
      lastMessageId: messageId,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    });
    return res({}, 'Cập nhật last message');
  }

  async markRead(conversationId: string, userId: string) {
    const uid = this.validateId(userId);
    const cid = this.validateId(conversationId);

    await this.pool.request().query(`
      UPDATE conversations
      SET memberStates = JSON_MODIFY(memberStates, '$[?(@.userId == "${uid}")].lastReadAt', GETDATE())
      WHERE id = '${cid}'
    `);

    return res({}, 'Đã đánh dấu đã đọc');
  }
}