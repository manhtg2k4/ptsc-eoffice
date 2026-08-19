import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannerService } from './banner.service';
import { BannerController } from './banner.controller';
import { Banner } from './entities/banner.entity';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from 'src/users/users.module';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { BannerPermissionService } from './banner-permission.service';
import { BannerPermissionGuard } from './guards/banner-permission.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Banner], 'mssqlConnection'),
    forwardRef(() => DatabaseModule),
    forwardRef(() => UsersModule),
    AuthorityDocumentsModule,
  ],
  controllers: [BannerController],
  providers: [BannerService, BannerPermissionService, BannerPermissionGuard],
  exports: [BannerService, BannerPermissionService],
})
export class BannerModule { }