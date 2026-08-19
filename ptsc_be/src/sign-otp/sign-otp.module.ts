import { forwardRef, Module } from '@nestjs/common';
import { SignOtpService } from './sign-otp.service';
import { SignOtpController } from './sign-otp.controller';
import { UsersModule } from '../users/users.module';
import { DatabaseModule } from '../database/database.module';
import { FilesManagementModule } from '../files-managerment/files-management.module';
import { WorkItemsModule } from '../work-items/work-items.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/entities/user.entity';

@Module({
  imports: [
    UsersModule,
    DatabaseModule,
    FilesManagementModule,
    forwardRef(() => WorkItemsModule),
    ConfigModule,
    TypeOrmModule.forFeature([UserEntity], 'mssqlConnection'),
  ],
  providers: [SignOtpService],
  controllers: [SignOtpController],
  exports: [SignOtpService],
})
export class SignOtpModule { }
