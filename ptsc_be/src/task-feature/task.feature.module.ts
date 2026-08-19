// src/task-feature/task-feature.module.ts
import { Module } from '@nestjs/common';
import { TaskFeatureService } from './task.feature.service';
import { TaskFeatureController } from './task.feature.controller';
import { TaskFeatureEntity } from './task.feature.entity';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Audit } from 'src/database/schema-sql/audit.entity';


@Module({
  imports: [
    BpmnModule,
    TypeOrmModule.forFeature(
        [TaskFeatureEntity, Audit],
        'mssqlConnection', // BẮT BUỘC CHỈ RÕ CONNECTION NAME
    ),
  ],
  controllers: [TaskFeatureController],
  providers: [TaskFeatureService],
})
export class TaskFeatureModule {}
