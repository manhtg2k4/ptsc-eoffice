import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectStatisticsController } from './project-statistics.controller';
import { ProjectStatisticsService } from './project-statistics.service';
import { ProjectEntity } from '../project/entities/project.entity';
import { TaskEntity } from '../task/entity/task.entity';
import { ProjectMemberEntity } from '../project/entities/project-member.entity';
import { UserEntity } from '../users/entities/user.entity';
import { SystemLogSqlModule } from '../systemLogManagement/system-log.module';
import { DataExportModule } from '../data-export/data-export.module';
import { DataExportService } from '../data-export/data-export.service';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [
        TypeOrmModule.forFeature(
            [ProjectEntity, TaskEntity, ProjectMemberEntity, UserEntity],
            'mssqlConnection',
        ),
        SystemLogSqlModule,
        forwardRef(() => DataExportModule),
        forwardRef(() => DatabaseModule),
    ],
    controllers: [ProjectStatisticsController],
    providers: [ProjectStatisticsService],
    exports: [ProjectStatisticsService],
})
export class ProjectStatisticsModule implements OnModuleInit {
    constructor(
        private readonly projectStatisticsService: ProjectStatisticsService,
        private readonly dataExportService: DataExportService,
    ) {}

    onModuleInit() {
        this.dataExportService.registerService('project-statistics', this.projectStatisticsService);
    }
}
