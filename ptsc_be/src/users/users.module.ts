import { forwardRef, Module, Global } from '@nestjs/common';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { DatabaseModule } from 'src/database/database.module';
import { OutgoingDocumentsModule } from 'src/outgoing-documents/outgoing-documents.module';
import { BpmnVersionModule } from 'src/bpmn-version/bpmn-version.module';
import { FeedbackSuggestionsModule } from 'src/feedback-suggestions/feedback-suggestions.module';

// import { BpmnDesign } from 'src/bpmn-designs/bpmn-design.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';
import { ListRoleEntity } from 'src/list-role/entities/list-role.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { EntityRolegroupModule } from 'src/entity-rolegroup/entity-rolegroup.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { FeatureManagementEntity } from 'src/feature-management/feature-management-sql/feature-management.entity';
import { RoleFeatureSqlModule } from 'src/role-feature/role-feature-sql/role-feature-sql.module';
import { RoleFeatureModule } from 'src/role-feature/role-feature.module';
import { AuthorityModule } from 'src/authority-process/authority-process.module';
import { IncomingModule } from 'src/documents/incomming-document/incoming.module';
import { AuthorityDocumentEntity } from 'src/authority-documents';
import { AuthConfigEntity } from 'src/auth-config/entities/auth-config.entity';
import { WorkItemsModule } from 'src/work-items/work-items.module';
import { GroupUsersModule } from 'src/group-users/group-users.module';
import { TaskDelegationEntity } from 'src/task/entity/task-delegation.entity';
import { TaskDelegationService } from 'src/task/task-delegation.service';
import { UserSyncModule } from 'src/user-sync/user-sync.module';
import { StaticAdminPermissionGuard } from 'src/users/guards/static-admin-permission.guard';
import { LeadersPermissionGuard } from 'src/users/guards/leaders-permission.guard';
import { StaticPermissionGuard } from 'src/users/guards/static-permission.guard';
import { UsersByProcessRoleGuard } from 'src/users/guards/users-by-process-role.guard';
import { TaskRoleScreenGuard } from 'src/users/guards/task-role-screen.guard';

import { DocumentPermissionGuard } from 'src/common/guards/document-permission.guard';

@Global()
@Module({
  imports: [
    forwardRef(() => BpmnModule,
    ),
    forwardRef(() => DatabaseModule),
    // DocumentsModule,
    forwardRef(() => OutgoingDocumentsModule),
    BpmnVersionModule,
    RoleFeatureModule,
    RoleFeatureSqlModule,
    // MongooseModule.forFeature([
    //   { name: User.name, schema: UserSchema },
    //   { name: OrganizationUnit.name, schema: OrganizationSchema },
    //   { name: GroupUser.name, schema: GroupUserSchema },
    //   { name: RoleGroup.name, schema: RoleGroupSchema },
    //   { name: AuthorityDocument.name, schema: AuthoritySchema },
    // ]),
    AuthorityModule,
    EntityRolegroupModule,
    forwardRef(() => SystemLogSqlModule),
    WorkItemsModule,
    forwardRef(() => IncomingModule),
    forwardRef(() => UserSyncModule),
    TypeOrmModule.forFeature(
      [
        BpmnDesignEntity,
        GroupUserEntity,
        OrganizationUnitEntity,
        UserEntity,
        ListRoleEntity,
        RoleFeatureEntity,
        FeatureManagementEntity,
        AuthorityDocumentEntity,
        AuthConfigEntity,
        TaskDelegationEntity
      ],
      'mssqlConnection',
    ),
    forwardRef(() => GroupUsersModule),
    forwardRef(() => FeedbackSuggestionsModule),
  ], // Import BpmnModule to get access to BPMN_RUNTIME
  controllers: [UsersController],
  providers: [
    UsersService,
    TaskDelegationService,
    StaticAdminPermissionGuard,
    LeadersPermissionGuard,
    StaticPermissionGuard,
    UsersByProcessRoleGuard,
    TaskRoleScreenGuard,
    DocumentPermissionGuard,
  ],
  exports: [
    UsersService,
    StaticPermissionGuard,
    UsersByProcessRoleGuard,
    TaskRoleScreenGuard,
    DocumentPermissionGuard,
  ]
})
export class UsersModule { }
