import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthorityGuard, AuthorityStages, CheckAuthority, EffectiveUser } from 'src/authority-documents';
import { DocumentFollowService } from './document-unfolow.service';
import { DocumentFollowPermissionGuard } from './guards/document-follow-permission.guard';
import {
  DocumentFollowPermissionAction,
  RequireDocumentFollowPermission,
} from './decorators/document-follow-permission.decorator';

@Controller('documents/follow')
@UseGuards(AuthorityGuard, DocumentFollowPermissionGuard)
export class DocumentFollowController {
  constructor(private readonly service: DocumentFollowService) {}

  @Post()
  @RequireDocumentFollowPermission(DocumentFollowPermissionAction.UPDATE)
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  async setFollowState(
    @Req() req: any,
    @EffectiveUser() userId: string,
    @Body('documentId') documentId: string,
    @Body('isFollow') isFollow: boolean,
  ) {
    const effectiveUserId = userId || req.user?.userId;
    return this.service.setFollowState(effectiveUserId, documentId, isFollow);
  }
}