import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleRef } from '@nestjs/core';
import { UserEntity } from 'src/users/entities/user.entity';
import { HrmController } from './hrm.controller';
import { HrmSyncServiceNew } from './hrm-sync.service';
import { HrmCompareService } from './hrm-compare.service';
import { HrmHistoryService } from './hrm-history.service';
import { HrmSyncHistoryEntity } from './entities/hrm-sync-history.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { DataExportModule, DataExportService } from 'src/data-export';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [UserEntity, OrganizationUnitEntity, HrmSyncHistoryEntity],
      'mssqlConnection',
    ),
    forwardRef(() => DataExportModule),
  ],
  controllers: [HrmController],
  providers: [HrmSyncServiceNew, HrmCompareService, HrmHistoryService],
})

export class HrmModule implements OnModuleInit {
  constructor(
    private readonly hrmSyncService: HrmSyncServiceNew,
    private readonly moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    try {
      const dataExportService = this.moduleRef.get(DataExportService, { strict: false });
      if (dataExportService) {
        dataExportService.registerService('hrm', this.hrmSyncService);
      } else {
        console.warn('[HrmModule] DataExportService not available');
      }
    } catch (error) {
      console.error('[HrmModule] Failed to register to DataExportService:', error);
    }
  }
}
