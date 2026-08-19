/**
 * ======================================
 * VÍ DỤ SỬ DỤNG AUTHORITY GUARD
 * ======================================
 * 
 * File này chỉ để tham khảo, không sử dụng trong production
 * Copy các pattern này vào controller thực tế của bạn
 */

import { Controller, Post, UseGuards, Body, Get, Param } from '@nestjs/common';
import { AuthorityGuard } from './guards/authority.guard';
import { CheckAuthority } from './decorators/check-authority.decorator';
import { 
  AuthorizedUser, 
  OriginalUser, 
  EffectiveUser,
  AuthorityInfo 
} from './decorators/authorized-user.decorator';
import { AuthorityStages } from './constants/authority-stages';
import { AuthorityDocumentEntity } from './entities/authority-document.entity';

@Controller('example-authority')
@UseGuards(AuthorityGuard) // Apply guard cho toàn bộ controller
export class ExampleAuthorityController {

  /**
   * VÍ DỤ 1: API phê duyệt văn bản
   * - Check ủy quyền cho stage 'document_approval'
   * - Sử dụng quyền của author nếu có ủy quyền
   */
  @Post('documents/:id/approve')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  async approveDocument(
    @Param('id') documentId: string,
    @EffectiveUser() userId: string, // User cuối cùng (author hoặc current)
    @OriginalUser() currentUserId: string, // User hiện tại
    @AuthorizedUser() authorizedBy: string | null, // User ủy quyền (nếu có)
  ) {

    // Logic phê duyệt với quyền của userId
    // userId sẽ là author nếu có ủy quyền, hoặc currentUserId nếu không có
    
    return {
      success: true,
      message: 'Văn bản đã được phê duyệt',
      approvedBy: userId,
      onBehalfOf: authorizedBy ? currentUserId : null,
    };
  }

  /**
   * VÍ DỤ 2: API ký văn bản
   * - Lấy toàn bộ thông tin ủy quyền để log
   */
  @Post('documents/:id/sign')
  @CheckAuthority(AuthorityStages.DOCUMENT_SIGN)
  async signDocument(
    @Param('id') documentId: string,
    @EffectiveUser() userId: string,
    @AuthorityInfo() authorityInfo: AuthorityDocumentEntity | null,
  ) {


    return {
      success: true,
      signedBy: userId,
      authorityInfo: authorityInfo ? {
        id: authorityInfo.id,
        author: authorityInfo.author,
        validFrom: authorityInfo.startDate,
        validTo: authorityInfo.endDate,
      } : null,
    };
  }

  /**
   * VÍ DỤ 3: API không check ủy quyền
   * - Không có decorator @CheckAuthority
   * - Guard sẽ bỏ qua, không check
   */
  @Get('documents/:id')
  async getDocument(@Param('id') documentId: string) {
    // API này không check ủy quyền, chỉ cần user đã authenticate
    return {
      id: documentId,
      title: 'Document title',
      content: 'Document content',
    };
  }

  /**
   * VÍ DỤ 4: API phê duyệt ngân sách
   * - Stage khác: budget_approval
   */
  @Post('budgets/:id/approve')
  @CheckAuthority(AuthorityStages.BUDGET_APPROVAL)
  async approveBudget(
    @Param('id') budgetId: string,
    @EffectiveUser() userId: string,
    @OriginalUser() currentUserId: string,
  ) {
    return {
      success: true,
      message: 'Ngân sách đã được phê duyệt',
      approvedBy: userId,
      currentUser: currentUserId,
    };
  }

  /**
   * VÍ DỤ 5: API quản lý user
   * - Chỉ người có quyền user_management mới được thực hiện
   */
  @Post('users/:id/activate')
  @CheckAuthority(AuthorityStages.USER_MANAGEMENT)
  async activateUser(
    @Param('id') targetUserId: string,
    @EffectiveUser() userId: string,
  ) {
    // Kiểm tra quyền của userId
    // Thực hiện activate user với quyền của userId
    
    return {
      success: true,
      message: `User ${targetUserId} đã được kích hoạt`,
      activatedBy: userId,
    };
  }

  /**
   * VÍ DỤ 6: Kết hợp với Service
   */
  @Post('documents/:id/review')
  @CheckAuthority(AuthorityStages.DOCUMENT_REVIEW)
  async reviewDocument(
    @Param('id') documentId: string,
    @Body() reviewData: { comment: string; rating: number },
    @EffectiveUser() userId: string,
    @OriginalUser() currentUserId: string,
    @AuthorizedUser() authorizedBy: string | null,
  ) {
    // Gọi service với userId (quyền thực tế)
    // const result = await this.documentsService.review(documentId, userId, reviewData);
    
    // Log để audit
    if (authorizedBy) {
    }

    return {
      success: true,
      reviewedBy: userId,
      comment: reviewData.comment,
      rating: reviewData.rating,
      onBehalf: authorizedBy ? {
        originalUser: currentUserId,
        authorizedBy: authorizedBy,
      } : null,
    };
  }
}

