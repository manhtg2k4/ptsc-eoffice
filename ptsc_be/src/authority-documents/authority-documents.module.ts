import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorityDocumentEntity } from './entities/authority-document.entity';
import { AuthorityGuard } from './guards/authority.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthorityDocumentEntity], 'mssqlConnection'),
  ],
  providers: [AuthorityGuard],
  exports: [AuthorityGuard, TypeOrmModule],
})
export class AuthorityDocumentsModule {}

