import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportStatisticsService } from './passport-statistics.service';
import { PassportStatisticsController } from './passport-statistics.controller';
import { PassportEntity } from '../passports/entities/passport.entity';
import { PassportRequestEntity } from '../passport-requests/entities/passport-request.entity';
import { OrganizationUnitEntity } from '../organization-unit/organization-unit_sql/organization-unit.entity';
import { UserEntity } from '../users/entities/user.entity';
import { SystemLogSqlModule } from '../systemLogManagement/system-log.module';
import { DataExportModule } from '../data-export/data-export.module';
import { DataExportService } from '../data-export/data-export.service';
import { DatabaseModule } from '../database/database.module';
import { CrmsourceModule } from '../crmsource/crmsource.module';


@Module({
    imports: [
        TypeOrmModule.forFeature([
            PassportEntity,
            PassportRequestEntity,
            OrganizationUnitEntity,
            UserEntity
        ], 'mssqlConnection'),
        SystemLogSqlModule,
        forwardRef(() => DataExportModule),
        forwardRef(() => DatabaseModule),
        forwardRef(() => CrmsourceModule),

    ],
    controllers: [PassportStatisticsController],
    providers: [PassportStatisticsService],
    exports: [PassportStatisticsService],
})
export class PassportStatisticsModule implements OnModuleInit {
    constructor(
        private readonly dataExportService: DataExportService,
        private readonly service: PassportStatisticsService,
    ) { }

    onModuleInit() {
        this.dataExportService.registerService('passport-statistics', this.service);
    }
}
