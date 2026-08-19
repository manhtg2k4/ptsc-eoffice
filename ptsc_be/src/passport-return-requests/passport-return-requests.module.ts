import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportReturnRequestEntity } from './entities/passport-return-request.entity';
import { PassportReturnRequestItemEntity } from './entities/passport-return-request-item.entity';
import { PassportEntity } from '../passports/entities/passport.entity';
import { UserEntity } from '../users/entities/user.entity';
import { PassportVoucherEntity } from '../passport-vouchers/entities/passport-voucher.entity';
import { PassportVoucherItemEntity } from '../passport-vouchers/entities/passport-voucher-item.entity';
import { WorkItemEntity } from '../work-items/entities/work-item.entity';
import { Audit } from '../database/schema-sql/audit.entity';
import { PassportReturnRequestsService } from './passport-return-requests.service';
import { PassportReturnRequestsController } from './passport-return-requests.controller';
import { BpmnModule } from '../bpmn/bpmn.module';
import { DatabaseModule } from '../database/database.module';
import { GroupUsersModule } from '../group-users/group-users.module';
import { SystemLogSqlModule } from '../systemLogManagement/system-log.module';

import { NotificationModule } from '../notifycation/notification.module';

@Module({
    imports: [
        TypeOrmModule.forFeature(
            [
                PassportReturnRequestEntity,
                PassportReturnRequestItemEntity,
                PassportEntity,
                UserEntity,
                PassportVoucherEntity,
                PassportVoucherItemEntity,
                WorkItemEntity,
                Audit,
            ],
            'mssqlConnection',
        ),
        BpmnModule,
        DatabaseModule,
        GroupUsersModule,
        forwardRef(() => SystemLogSqlModule),
        forwardRef(() => NotificationModule),
    ],
    controllers: [PassportReturnRequestsController],
    providers: [PassportReturnRequestsService],
    exports: [PassportReturnRequestsService],
})
export class PassportReturnRequestsModule {}
