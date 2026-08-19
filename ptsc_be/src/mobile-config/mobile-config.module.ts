import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth-sso/auth-sso.module';
import { UsersModule } from 'src/users/users.module';
import { UserEntity } from 'src/users/entities/user.entity';
import { AdminGuard } from 'src/users/guards/admin.guard';
import { MobileAppVersionConfigEntity } from './entities/mobile-app-version-config.entity';
import { MobileConfigController } from './mobile-config.controller';
import { MobileConfigService } from './mobile-config.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [MobileAppVersionConfigEntity, UserEntity],
      'mssqlConnection',
    ),
    AuthModule,
    UsersModule,
  ],
  controllers: [MobileConfigController],
  providers: [MobileConfigService, AdminGuard],
  exports: [MobileConfigService],
})
export class MobileConfigModule {}
