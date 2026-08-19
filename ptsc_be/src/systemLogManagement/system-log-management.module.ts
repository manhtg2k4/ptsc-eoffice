// import { forwardRef, Module } from '@nestjs/common';
// import { SystemLogManagementService } from './system-log-management.service';
// import { SystemLogManagementController } from './system-log-management.controller';
// import { MongooseModule } from '@nestjs/mongoose';
// import { SystemLog, SystemLogSchema } from './system-log.schema';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { SystemSettingClearLog } from 'src/settingClearLog/setting-log.entity';
// import { DocumentsModule } from 'src/documents/documents.module';
// import { SystemLogSqlModule } from './system-log.module';

// @Module({
//   imports: [
//     // MongooseModule.forFeature([
//     //   { name: SystemLog.name, schema: SystemLogSchema },
//     // ]),
//     forwardRef(() => DocumentsModule),
//     forwardRef(() => SystemLogSqlModule),
//     TypeOrmModule.forFeature([SystemSettingClearLog], 'mssqlConnection'), // TypeORM module
//   ],
//   controllers: [SystemLogManagementController],
//   providers: [SystemLogManagementService],
//   exports: [SystemLogManagementService], // Export service nếu bạn muốn dùng ở module khác
// })
// export class SystemLogManagementModule { }