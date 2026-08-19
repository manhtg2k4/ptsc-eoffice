// system-log-task-sql.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { SystemLogTaskModule } from './system-log.module';
import { SystemLogEntity } from './system-log.entity';
import { SystemLogTaskServiceSql } from './system-log-service-sql';

@Module({
  imports: [
    // SystemLogTaskModule,
    TypeOrmModule.forFeature(
      [SystemLogEntity],
      'mssqlConnection',
    ),
  ],
  providers: [SystemLogTaskServiceSql],
  exports: [SystemLogTaskServiceSql],
})
export class SystemLogTaskSqlModule { }
