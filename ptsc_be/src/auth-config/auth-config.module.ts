import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthConfigService } from './auth-config.service';
import { AuthConfigController } from './auth-config.controller';
import { AuthConfigEntity } from './entities/auth-config.entity';
import { UserEntity } from '../users/entities/user.entity';
import { AuthConfigPermissionService } from './auth-config-permission.service';
import { AuthConfigPermissionGuard } from './guards/auth-config-permission.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthConfigEntity, UserEntity], 'mssqlConnection'),
  ],
  controllers: [AuthConfigController],
  providers: [AuthConfigService, AuthConfigPermissionService, AuthConfigPermissionGuard],
  exports: [AuthConfigService, AuthConfigPermissionService],
})
export class AuthConfigModule { }
