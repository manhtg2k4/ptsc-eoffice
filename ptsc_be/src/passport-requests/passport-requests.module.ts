import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportRequestsService } from './passport-requests.service';
import { PassportRequestsController } from './passport-requests.controller';
import { PassportRequestEntity } from './entities/passport-request.entity';
import { PassportEntity } from '../passports/entities/passport.entity';
import { UserEntity } from '../users/entities/user.entity';
import { SystemLogSqlModule } from '../systemLogManagement/system-log.module';
import { BpmnModule } from '../bpmn/bpmn.module';
import { DatabaseModule } from '../database/database.module';
import { WorkItemEntity } from '../work-items/entities/work-item.entity';
import { Audit } from '../database/schema-sql/audit.entity';
import { GroupUsersModule } from '../group-users/group-users.module';
import { PassportHistoryEntity } from './entities/passport-history.entity';
import { PassportDelegationItemEntity } from './entities/passport-delegation-item.entity';
import { DataExportModule } from '../data-export/data-export.module';
import { DataExportService } from '../data-export/data-export.service';
import { PassportVoucherItemEntity } from 'src/passport-vouchers/entities/passport-voucher-item.entity';
import { PassportVoucherEntity } from 'src/passport-vouchers/entities/passport-voucher.entity';
import { NotificationModule } from '../notifycation/notification.module';
import { CrmsourceModule } from '../crmsource/crmsource.module';
import { PassportPermissionEntity } from './entities/passport-permission.entity';
import { PassportIncomingDelegationController } from './passport-incoming-delegation.controller';
import { PassportIncomingDelegationService } from './passport-incoming-delegation.service';
import { PassportIncomingDelegationsEntity } from './entities/passport-incoming-delegations.entity';
import { PassportIncomingDelegationItemEntity } from './entities/passport-incoming-delegation-item.entity';
import { CrmSourceDataEntity } from '../crmsource/entities/crmsource-data.entity';
import { FilesManagementModule } from 'src/files-managerment/files-management.module';
import { BpmnRoleGuard } from '../oauth/bpmn-role.guard';

@Module({
	imports: [
		TypeOrmModule.forFeature(
			[
				PassportRequestEntity,
				PassportEntity,
				UserEntity,
				WorkItemEntity,
				Audit,
				PassportHistoryEntity,
				PassportDelegationItemEntity,
				PassportVoucherItemEntity,
				PassportVoucherEntity,
				PassportPermissionEntity,
				PassportIncomingDelegationsEntity,
				PassportIncomingDelegationItemEntity,
				CrmSourceDataEntity
			],
			'mssqlConnection',
		),
		forwardRef(() => SystemLogSqlModule),
		forwardRef(() => BpmnModule),
		forwardRef(() => DatabaseModule),
		forwardRef(() => GroupUsersModule),
		forwardRef(() => DataExportModule),
		forwardRef(() => NotificationModule),
		forwardRef(() => CrmsourceModule),
		forwardRef(() => FilesManagementModule),
	],
	controllers: [PassportRequestsController, PassportIncomingDelegationController],
	providers: [PassportRequestsService, PassportIncomingDelegationService, BpmnRoleGuard],
	exports: [PassportRequestsService, PassportIncomingDelegationService],
})
export class PassportRequestsModule implements OnModuleInit {
	constructor(
		private readonly dataExportService: DataExportService,
		private readonly service: PassportRequestsService,
	) { }

	onModuleInit() {
		this.dataExportService.registerService('passport-requests', this.service);
	}
}

