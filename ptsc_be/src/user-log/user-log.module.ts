// src/user-log/user-log.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { UserLogService } from './user-log.service';
import { UserLogController } from './user-log.controller';
import { UserLog, UserLogSchema } from './user_log.schema';
import { UserLogHelper } from 'src/documents/helpers/user-log.helper';
// import { User, UserSchema } from 'src/user/user.schema';
import { OrganizationUnit } from 'src/organization-unit/organization-unit.schema';
import { UserLogEntity } from './user-log.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    // MongooseModule.forFeature([{ name: UserLog.name, schema: UserLogSchema },
    // { name: User.name, schema: UserSchema }, // ✅ THÊM
    // {
    //   name: OrganizationUnit.name,
    //   schema: OrganizationUnit,       // ✅ THÊM
    // },
    // ]),
    TypeOrmModule.forFeature([UserLogEntity], 'mssqlConnection'),
    HttpModule,
  ],
  providers: [UserLogService, UserLogHelper],
  controllers: [UserLogController],
  exports: [UserLogService, UserLogHelper], // export để module khác có thể gọi createLog
})
export class UserLogModule { }
