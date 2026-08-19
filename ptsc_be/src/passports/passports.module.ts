import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportsService } from './passports.service';
import { PassportsController } from './passports.controller';
import { PassportEntity } from './entities/passport.entity';
import { UserEntity } from '../users/entities/user.entity';
import { SystemLogSqlModule } from '../systemLogManagement/system-log.module';
import { PassportQueryBuilder } from './helpers/passport-query.builder';
import { DataExportModule, DataExportService } from 'src/data-export';
import { NotificationModule } from 'src/notifycation/notification.module';
import { CrmsourceModule } from '../crmsource/crmsource.module';
import { GroupUsersModule } from '../group-users/group-users.module';
import { FilesManagementModule } from '../files-managerment/files-management.module';
import { BpmnModule } from '../bpmn/bpmn.module';
import { DatabaseModule } from '../database/database.module';

import { PassportReminderService } from './passport-reminder.service';
import { OrganizationUnitSqlModule } from '../organization-unit/organization-unit_sql/organization-unit-sql.module';
import { OrganizationUnitEntity } from '../organization-unit/organization-unit_sql/organization-unit.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { FeatureManagementEntity } from 'src/feature-management/feature-management-sql/feature-management.entity';
import { RoleFeatureGuard } from 'src/oauth/role-feature.guard';
import { PassportPermissionEntity } from '../passport-requests/entities/passport-permission.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([PassportEntity, UserEntity, OrganizationUnitEntity, RoleFeatureEntity, FeatureManagementEntity, PassportPermissionEntity], 'mssqlConnection'),
        forwardRef(() => SystemLogSqlModule),
        forwardRef(() => DataExportModule),
        forwardRef(() => NotificationModule),
        forwardRef(() => CrmsourceModule),
        forwardRef(() => GroupUsersModule),
        forwardRef(() => OrganizationUnitSqlModule),
        forwardRef(() => FilesManagementModule),
        forwardRef(() => BpmnModule),
        forwardRef(() => DatabaseModule),
    ],


    controllers: [PassportsController],
    providers: [PassportsService, PassportQueryBuilder, PassportReminderService, RoleFeatureGuard],
    exports: [PassportsService],
})
export class PassportsModule implements OnModuleInit {
    constructor(private readonly moduleRef: ModuleRef) { }

    async onModuleInit() {
        try {
            const dataExportService = this.moduleRef.get(DataExportService, { strict: false });
            const passportsService = this.moduleRef.get(PassportsService);
            dataExportService.registerService('passports', passportsService);
        } catch (error) {
            console.warn('[PassportsModule] DataExportService not available:', error.message);
        }
    }
}
