import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemLogEntity } from './system-log.entity';
import { SystemLogServiceSql } from './system-log-service-sql';
import { SystemLogControllerSql } from './system-log-controller-sql';
// import { SystemLogManagementModule } from './system-log-management.module';
import { DocumentsModule } from 'src/documents/documents.module';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [SystemLogEntity, UserEntity],
      'mssqlConnection',
    ),
    // MongooseModule.forFeature([
    //   { name: SystemLog.name, schema: SystemLogSchema },
    // ]),
    // forwardRef(() => SystemLogManagementModule),
    forwardRef(() => DocumentsModule),
  ],
  providers: [SystemLogServiceSql],
  controllers: [SystemLogControllerSql],
  exports: [
    TypeOrmModule, // ← ĐÚNG – export TypeOrmModule
    // hoặc nếu muốn export cụ thể hơn:
    // getRepositoryToken(SystemLogEntity, 'mssqlConnection'),
    SystemLogServiceSql,
  ],
})
export class SystemLogSqlModule { }