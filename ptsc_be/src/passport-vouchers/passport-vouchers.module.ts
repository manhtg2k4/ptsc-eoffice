import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportVouchersService } from './passport-vouchers.service';
import { PassportVouchersController } from './passport-vouchers.controller';
import { PassportVoucherEntity } from './entities/passport-voucher.entity';
import { PassportVoucherItemEntity } from './entities/passport-voucher-item.entity';
import { PassportRequestEntity } from '../passport-requests/entities/passport-request.entity';
import { PassportEntity } from '../passports/entities/passport.entity';
import { UserEntity } from '../users/entities/user.entity';
import { PassportDelegationItemEntity } from '../passport-requests/entities/passport-delegation-item.entity';

import { PassportRequestsModule } from '../passport-requests/passport-requests.module';
import { BpmnModule } from '../bpmn/bpmn.module';
import { DatabaseModule } from '../database/database.module';
import { GroupUsersModule } from '../group-users/group-users.module';
import { WorkItemEntity } from '../work-items/entities/work-item.entity';
import { Audit } from '../database/schema-sql/audit.entity';
import { NotificationModule } from '../notifycation/notification.module';

@Module({
    imports: [
        TypeOrmModule.forFeature(
            [
                PassportVoucherEntity,
                PassportVoucherItemEntity,
                PassportRequestEntity,
                PassportEntity,
                UserEntity,
                PassportDelegationItemEntity,
                WorkItemEntity,
                Audit
            ],
            'mssqlConnection',
        ),
        PassportRequestsModule,
        forwardRef(() => BpmnModule),
        forwardRef(() => DatabaseModule),
        forwardRef(() => GroupUsersModule),
        forwardRef(() => NotificationModule),
    ],
    controllers: [PassportVouchersController],
    providers: [PassportVouchersService],
    exports: [PassportVouchersService],
})
export class PassportVouchersModule { }
