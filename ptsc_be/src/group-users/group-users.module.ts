import { forwardRef, Module } from '@nestjs/common';
import { GroupUsersController } from './group-users.controller';
import { GroupUsersInDocumentController } from './group-users-in-document.controller';
import { GroupUserService } from './group-users.service';
import { GroupUserInDocumentService } from './group-users-in-document.service';
import { HrmSyncModule } from 'src/user-sync/hrm-sync.module';

// import { UserModule } from '../user/user.module';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { DocumentsModule } from 'src/documents/documents.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupUserEntity } from './entities/group-users.entity';
import { HrmJobMappingEntity } from './entities/hrm-job-mapping.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { HrmJobMappingController } from './hrm-job-mapping.controller';
import { HrmJobMappingService } from './hrm-job-mapping.service';
import { ConfigurationModule } from 'src/view-config/configuration.module';
import { UsersModule } from 'src/users/users.module';
import { RolesProcessEntity } from 'src/role-feature/role-feature-sql/roles-process.entity';

@Module({
  imports: [
    SystemLogSqlModule,
    forwardRef(() => DocumentsModule),
    ConfigurationModule,
    forwardRef(() => HrmSyncModule),
    forwardRef(() => UsersModule),
    TypeOrmModule.forFeature(
      [GroupUserEntity, UserEntity, OrganizationUnitEntity, HrmJobMappingEntity, RolesProcessEntity],
      'mssqlConnection',
    ),
  ],
  controllers: [GroupUsersController, GroupUsersInDocumentController, HrmJobMappingController],
  providers: [GroupUserService, GroupUserInDocumentService, HrmJobMappingService],
  exports: [GroupUserService, GroupUserInDocumentService, HrmJobMappingService],
})
export class GroupUsersModule { }
