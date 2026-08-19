import { Module } from '@nestjs/common';
import { WopiController } from './wopi.controller';
import { WopiService } from './wopi.service';
import { WopiTokenService } from './wopi-token.service';
import { FilesManagementModule } from '../files-managerment/files-management.module';
import { CollaboraExternalController } from './collabora-external.controller';

@Module({
  imports: [FilesManagementModule],
  controllers: [WopiController, CollaboraExternalController],
  providers: [WopiService, WopiTokenService],
  exports: [WopiTokenService],
})
export class WopiModule { }
