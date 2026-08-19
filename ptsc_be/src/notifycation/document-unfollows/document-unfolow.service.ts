import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DocumentUnfollowEntity } from './document-unfollow.entity';

@Injectable()
export class DocumentFollowService {
  constructor(
    @InjectRepository(DocumentUnfollowEntity, 'mssqlConnection')
    private readonly unfollowRepo: Repository<DocumentUnfollowEntity>,
  ) {}

  /**
   * State-based, idempotent
   * - follow   → ensure NO unfollow record
   * - unfollow → ensure unfollow record exists
   */
  async setFollowState(
    userId: string,
    documentId: string,
    isFollow: boolean,
  ): Promise<{ isFollow: boolean; message: string }> {
    try {
      if (isFollow) {
        // Follow: Delete từ bảng unfollow (nếu có)
        await this.unfollowRepo.delete({ userId, documentId });
        return {
          isFollow: true,
          message: 'Đã bật thông báo',
        };
      } else {
        // Unfollow: save vào bảng unfollow
        await this.unfollowRepo.save({ userId, documentId });
        return {
          isFollow: false,
          message: 'Đã tắt thông báo',
        };
      }
    } catch (err: any) {
      // Ignore duplicate key error (state đã đúng rồi)
      if (err?.number === 2627 || err?.number === 2601) {
        return {
          isFollow,
          message: isFollow ? 'Đã bật thông báo' : 'Đã tắt thông báo',
        };
      }
      // Log error thật sự
      console.error('DOCUMENT_SET_FOLLOW_STATE_FAILED', {
        err,
        userId,
        documentId,
        isFollow,
      });

      throw new InternalServerErrorException({
        message: 'Không thể cập nhật trạng thái theo dõi',
      });
    }
  }

  /**
   * Lọc bỏ users đã tắt thông báo cho document
   * 
   * @param userIds - Danh sách users cần check
   * @param documentId - Document ID cần kiểm tra
   * @returns Danh sách users ĐANG BẬT thông báo (đã loại bỏ unfollowed)
   */
  async filterFollowedUsers(
    userIds: readonly string[],
    documentId: string,
  ): Promise<string[]> {
    if (userIds.length === 0) return [];
    // Query users đã tắt thông báo
    const unfollowedUsers = await this.unfollowRepo.find({
      select: ['userId'],
      where: {
        documentId,
        userId: In([...userIds]),
      },
    });
    // Không ai tắt thông báo → return toàn bộ
    if (unfollowedUsers.length === 0) {
      return [...userIds];
    }
    // Tạo Set để O(1) lookup
    const unfollowedSet = new Set(unfollowedUsers.map(u => u.userId));
    // Lọc bỏ users đã tắt thông báo
    return userIds.filter(userId => !unfollowedSet.has(userId));
  }
}
