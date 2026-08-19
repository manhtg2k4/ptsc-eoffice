
import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsStatisticsController } from './news-statistics.controller';
import { NewsStatisticsService } from './news-statistics.service';
import { News } from '../news/entities/news.entity';
import { Audit } from '../database/schema-sql/audit.entity';
import { TopicEntity } from '../topic/entities/topic.entity';
import { NewsComment } from '../news/entities/news-comment.entity';
import { NewsLike } from '../news/entities/news-like.entity';
import { OrganizationUnitEntity } from '../organization-unit/organization-unit_sql/organization-unit.entity';
import { DataExportModule } from '../data-export/data-export.module';
import { DataExportService } from '../data-export/data-export.service';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([News, TopicEntity, Audit, NewsComment, NewsLike, OrganizationUnitEntity], 'mssqlConnection'),
        DataExportModule,
        forwardRef(() => SystemLogSqlModule),
        forwardRef(() => DatabaseModule),
    ],
    controllers: [NewsStatisticsController],
    providers: [NewsStatisticsService],
})
export class NewsStatisticsModule implements OnModuleInit {
  constructor(
    private readonly dataExportService: DataExportService,
    private readonly newsStatisticsService: NewsStatisticsService,
  ) { }

  onModuleInit() {
    this.dataExportService.registerService('news-statistics', this.newsStatisticsService);
  }
}
