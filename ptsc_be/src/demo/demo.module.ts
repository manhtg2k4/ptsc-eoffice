import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { DatabaseModule } from 'src/database/database.module';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { BpmnVersionModule } from 'src/bpmn-version/bpmn-version.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { BpmnDesign } from 'src/bpmn-designs/bpmn-design.schema';
import { AgencyEntity } from 'src/orgationies/agencies.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { PostStorageAiModule } from 'src/post-storage-ai/post-storage-ai.module';

@Module({
  imports: [
    BpmnModule, // Import trước để có BpmnEngineService và RuntimeDbService
    DatabaseModule,
    BpmnVersionModule,
    SystemLogSqlModule,
    PostStorageAiModule,
    TypeOrmModule.forFeature([BpmnDesignEntity, BpmnDesign, RoleFeatureEntity, UserEntity, AgencyEntity, OrganizationUnitEntity], 'mssqlConnection'),
  ],
  controllers: [DemoController],
})
export class DemoModule { }
