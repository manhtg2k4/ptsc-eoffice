// src/database/database.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { databaseProviders, MSSQL_REPO, MSSQL_POOL } from './database.provider';
import BpmnEngineService from 'src/bpmn/bpmn-engine.service';
import { SQLSVRepository } from './sqlsvRepo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { BpmnDesign } from 'src/bpmn-designs/bpmn-design.schema';
import { AgencyEntity } from 'src/orgationies/agencies.entity';
import { MenuManagerEntity } from 'src/menu-manager/entities/menu-manager.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { CrmsourceModule } from 'src/crmsource/crmsource.module';
import { GroupUsersModule } from 'src/group-users/group-users.module';
import { ServiceTaskModule } from 'src/service-task/service-task.module';
import { ListRoleEntity } from 'src/list-role/entities/list-role.entity';
import { RecordExploitationEntity } from 'src/record-exploitation/entities/record-exploitation.entity';
import { MeetingEntity } from 'src/meeting/entities/meeting.entity';
import { SqlRepoCountService } from './sqlRepoCount.mssql';
import { PermissionCacheService } from '../oauth/permission-cache.service';
// import { FilesManagementModule } from 'src/files-managerment/files-management.module';

@Module({
    imports: [
        TypeOrmModule.forFeature(
            [BpmnDesignEntity,
                BpmnDesign,
                RoleFeatureEntity,
                UserEntity,
                OrganizationUnitEntity,
                AgencyEntity,
                GroupUserEntity,
                MenuManagerEntity,
                FeatureManagementEntity,
                ListRoleEntity,
                RecordExploitationEntity,
                MeetingEntity
            ],
            'mssqlConnection',
        ),
        forwardRef(() => GroupUsersModule),
        forwardRef(() => ServiceTaskModule),
        // forwardRef(() => CrmsourceModule), // Import để sử dụng CrmSourcesService với forwardRef để tránh circular dependency
        // forwardRef(() => FilesManagementModule),
    ],
    providers: [...databaseProviders, BpmnEngineService, SQLSVRepository, SqlRepoCountService, PermissionCacheService],
    exports: [MSSQL_REPO, MSSQL_POOL, SQLSVRepository, BpmnEngineService, SqlRepoCountService, PermissionCacheService],
})
export class DatabaseModule { }
