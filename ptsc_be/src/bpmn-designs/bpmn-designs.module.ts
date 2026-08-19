import { forwardRef, Module } from '@nestjs/common';
import { BpmnDesignsService } from './bpmn-designs.service';
import { BpmnDesignsController } from './bpmn-designs.controller';

import { HttpModule } from '@nestjs/axios';

import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { CamundaVariableEntity } from 'src/cmd-variable/camunda-variable.entity';
// import { ProfileManagementEntity } from 'src/profile-management/profile-management.entity'; // ✅ Commented - module deleted
// import { UserModule } from 'src/user/user.module';
import { FileManagerModule } from 'src/file-manager/file-manager.module';
import { ConfigModule } from '@nestjs/config';
import { BpmnVersionModule } from 'src/bpmn-version/bpmn-version.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoryBpmnEntity } from './history-bpmn.entity';
import { BpmnDesignEntity } from './bpmn-design.entity';
import { RoleFeatureSqlModule } from 'src/role-feature/role-feature-sql/role-feature-sql.module';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth-sso/auth-sso.module';
import { CrmsourceModule } from 'src/crmsource/crmsource.module';
import { UserEntity } from 'src/users/entities/user.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { DatabaseModule } from 'src/database/database.module';
import { IncomingModule } from 'src/documents/incomming-document/incoming.module';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        BpmnDesignEntity,
        HistoryBpmnEntity,
        FeatureManagementEntity,
        CamundaVariableEntity,
        UserEntity,
        OrganizationUnitEntity,
        // ProfileManagementEntity, // ✅ Commented - module deleted
      ],
      'mssqlConnection',
    ),

    HttpModule,
    UsersModule,
    FileManagerModule,
    ConfigModule,
    DatabaseModule,
    forwardRef(() => IncomingModule),
    BpmnVersionModule,
    RoleFeatureSqlModule,
    AuthModule,
    CrmsourceModule,
  ],

  controllers: [BpmnDesignsController],
  providers: [BpmnDesignsService],
  exports: [BpmnDesignsService],
})
export class BpmnDesignsModule { }
