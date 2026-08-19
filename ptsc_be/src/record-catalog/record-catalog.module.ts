import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YearCategoryEntity } from './entities/year-category.entity';
import { FileRecordEntity } from './entities/file-record.entity';
import { RecordDocumentEntity } from './entities/record-document.entity';
import { FolderDetailEntity } from './entities/folder-detail.entity';
import { RecordCatalogController } from './record-catalog.controller';
import { RecordCatalogService } from './record-catalog.service';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { DatabaseModule } from 'src/database/database.module';
import { UsersModule } from 'src/users/users.module';
import { RecordCatalogPermissionService } from './record-catalog-permission.service';
import { RecordCatalogPermissionGuard } from './guards/record-catalog-permission.guard';
import { ArchiveRecordItemFile } from 'src/archive-records/entities/archive-record-item-flie.entity';
import { ModuleRef } from '@nestjs/core';
import { DataExportService } from 'src/data-export';
import { ArchiveRecord } from 'src/archive-records/entities/archive-record.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([YearCategoryEntity, FileRecordEntity, RecordDocumentEntity, ArchiveRecordItemFile, FolderDetailEntity, ArchiveRecord], 'mssqlConnection'),

        forwardRef(() => SystemLogSqlModule),
        DatabaseModule,
        UsersModule,
    ],
    controllers: [RecordCatalogController],
    providers: [RecordCatalogService, RecordCatalogPermissionService, RecordCatalogPermissionGuard],
    exports: [RecordCatalogService, RecordCatalogPermissionService],
})
export class RecordCatalogModule implements OnModuleInit {
    constructor(
        private readonly recordCatalogService: RecordCatalogService,
        private readonly moduleRef: ModuleRef,
    ) { }

    async onModuleInit() {
        try {
            // Lazy get DataExportService từ ModuleRef
            const dataExportService = this.moduleRef.get(DataExportService, { strict: false });
            if (dataExportService) {
                // Đăng ký service
                dataExportService.registerService('record-catalog', this.recordCatalogService);
            } else {
                console.warn('[RecordCatalogModule] DataExportService not available');
            }
        } catch (error) {
            console.error('[RecordCatalogModule] Failed to register to DataExportService:', error);
        }
    }
}