import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentUnfollowEntity } from './document-unfollow.entity';
import { DocumentFollowService } from './document-unfolow.service';
import { DocumentFollowController } from './document-unfollow.controller';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { DocumentFollowPermissionService } from './document-follow-permission.service';
import { DocumentFollowPermissionGuard } from './guards/document-follow-permission.guard';

@Module({
  imports: [
    AuthorityDocumentsModule,
    TypeOrmModule.forFeature(
      [DocumentUnfollowEntity],
      'mssqlConnection',
    ),
  ],
  controllers: [DocumentFollowController],
  providers: [
    DocumentFollowService,
    DocumentFollowPermissionService,
    DocumentFollowPermissionGuard,
  ],
  exports: [DocumentFollowService],
})
export class DocumentFollowModule {}
