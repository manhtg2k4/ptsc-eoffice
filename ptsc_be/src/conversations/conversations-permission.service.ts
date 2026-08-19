import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationEntity } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';

@Injectable()
export class ConversationsPermissionService {
  constructor(
    @InjectRepository(ConversationEntity, 'mssqlConnection')
    private readonly convRepo: Repository<ConversationEntity>,
    
    @InjectRepository(ConversationMember, 'mssqlConnection')
    private readonly memberRepo: Repository<ConversationMember>,
  ) {}

  /**
   * Kiểm tra quyền tạo mới hội thoại
   */
  async checkCreate(userId: string): Promise<boolean> {
    // Mặc định mọi người đều có quyền tạo hội thoại
    return true; 
  }

  /**
   * Kiểm tra quyền cập nhật/xoá cứng hội thoại
   * Chỉ người tạo (createdBy) mới có quyền
   */
  async checkCreator(userId: string, conversationId: string): Promise<boolean> {
    const conv = await this.convRepo.findOne({ where: { id: conversationId } });
    if (!conv) {
      throw new NotFoundException(`Không tìm thấy hội thoại với ID: ${conversationId}`);
    }
    
    if (conv.createdBy !== userId) {
      throw new ForbiddenException('Chỉ người tạo mới có quyền thực hiện hành động này với cuộc hội thoại');
    }
    
    return true;
  }

  /**
   * Kiểm tra quyền xem/thao tác cá nhân hội thoại
   * Chỉ các thành viên tham gia mới có quyền
   */
  async checkMember(userId: string, conversationId: string): Promise<boolean> {
    const member = await this.memberRepo.findOne({ 
      where: { 
        userId: userId, 
        conversation: { id: conversationId } 
      } 
    });
    
    if (!member) {
      throw new ForbiddenException('Bạn không phải là thành viên của cuộc hội thoại này');
    }
    
    return true;
  }
}
