import { forwardRef, Module } from '@nestjs/common';
import { FeatureManagementService } from './feature-management.service';
import { FeatureManagementController } from './feature-management.controller';
import {
  FeatureManagementEntity,
} from './feature-management.entity';
import { TableConfigModule } from 'src/table-config/table-config.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsModule } from 'src/documents/documents.module';

import { UserEntity } from 'src/users/entities/user.entity';
import { TableConfigEntity } from 'src/table-config/table-config.entity';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { AuthorityDocumentEntity } from 'src/authority-process/authority-process.entity';
import { RolesProcessEntity } from 'src/role-feature/role-feature-sql/roles-process.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [FeatureManagementEntity, UserEntity, TableConfigEntity, RoleFeatureEntity, AuthorityDocumentEntity, RolesProcessEntity],
      'mssqlConnection',
    ),
    TableConfigModule,
    forwardRef(() => SystemLogSqlModule),
    forwardRef(() => DocumentsModule),
  ],
  providers: [FeatureManagementService],
  exports: [FeatureManagementService],
  controllers: [FeatureManagementController]
})
export class FeatureManagementModule { }
