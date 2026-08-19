import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedbackSuggestionEntity } from './entities/feedback-suggestion.entity';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class FeedbackPermissionService {
  constructor(
    @InjectRepository(FeedbackSuggestionEntity, 'mssqlConnection')
    private readonly feedbackRepo: Repository<FeedbackSuggestionEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async isBPCTOrAdmin(userId: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return false;

    const roleLower = (user.role || '').toLowerCase();
    const isAdmin = roleLower.includes('admin') || roleLower.includes('quan tri') || roleLower.includes('quản trị');
    if (isAdmin) return true;

    const isBPCT = Array.isArray(user.rolesByProcess)
      && user.rolesByProcess.some(
        (p) => Array.isArray(p.roles) && p.roles.some((r) => r.roleCode === 'BO_PHAN_CHUYEN_TRACH'),
      );

    return !!isBPCT;
  }

  async checkCreate(_userId: string): Promise<boolean> {
    return true;
  }

  async checkUpdate(userId: string, id: string): Promise<boolean> {
    const feedback = await this.getFeedback(id);
    if (feedback.createdById === userId) return true;
    if (await this.isBPCTOrAdmin(userId)) return true;

    throw new ForbiddenException('Bạn không có quyền chỉnh sửa phản ánh này');
  }

  async checkDelete(userId: string, id: string): Promise<boolean> {
    const feedback = await this.getFeedback(id);
    if (feedback.createdById === userId) return true;
    if (await this.isBPCTOrAdmin(userId)) return true;

    throw new ForbiddenException('Bạn không có quyền xóa phản ánh này');
  }

  async checkDispatch(userId: string): Promise<boolean> {
    if (await this.isBPCTOrAdmin(userId)) return true;
    throw new ForbiddenException('Chỉ Bộ phận chuyên trách mới có quyền điều phối phản ánh');
  }

  async checkAccept(userId: string, id: string): Promise<boolean> {
    const feedback = await this.getFeedback(id);
    if (await this.isBPCTOrAdmin(userId)) return true;
    if (feedback.processorId === userId) return true;
    if (await this.isSameUnit(userId, feedback.unitId)) return true;

    throw new ForbiddenException('Bạn không có quyền tiếp nhận phản ánh này');
  }

  async checkComplete(userId: string, id: string): Promise<boolean> {
    const feedback = await this.getFeedback(id);
    if (feedback.processorId === userId) return true;
    if (await this.isBPCTOrAdmin(userId)) return true;
    if (await this.isSameUnit(userId, feedback.unitId)) return true;

    throw new ForbiddenException('Bạn không có quyền hoàn thành phản ánh này');
  }

  async checkRating(userId: string, id: string): Promise<boolean> {
    const feedback = await this.getFeedback(id);
    if (feedback.createdById === userId) return true;
    throw new ForbiddenException('Chỉ người tạo phản ánh mới có quyền đánh giá');
  }

  async checkRejectDispatch(userId: string, id: string): Promise<boolean> {
    const feedback = await this.getFeedback(id);
    if (await this.isBPCTOrAdmin(userId)) return true;
    if (feedback.processorId === userId) return true;
    if (await this.isSameUnit(userId, feedback.unitId)) return true;

    throw new ForbiddenException('Bạn không có quyền từ chối điều phối phản ánh này');
  }

  async checkRejectUnit(userId: string, id: string): Promise<boolean> {
    const feedback = await this.getFeedback(id);
    if (await this.isBPCTOrAdmin(userId)) return true;
    if (feedback.processorId === userId) return true;
    if (await this.isSameUnit(userId, feedback.unitId)) return true;

    throw new ForbiddenException('Bạn không có quyền từ chối xử lý phản ánh này');
  }

  private async isSameUnit(userId: string, feedbackUnitId?: string | null): Promise<boolean> {
    if (!feedbackUnitId) return false;

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['parent'],
    });

    return !!user?.parent?.id && String(user.parent.id) === String(feedbackUnitId);
  }

  private async getFeedback(id: string): Promise<FeedbackSuggestionEntity> {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) {
      throw new NotFoundException(`Không tìm thấy phản ánh với ID: ${id}`);
    }
    return feedback;
  }
}
