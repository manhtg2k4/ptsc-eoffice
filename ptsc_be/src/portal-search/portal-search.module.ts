import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortalSearchService } from './portal-search.service';
import { PortalSearchController } from './portal-search.controller';
import { News } from 'src/news/entities/news.entity';
import { AlbumImageEntity } from 'src/album-images/entities/album-image.entity';
import { VideoEntity } from 'src/videos/entities/video.entity';
import { TopicEntity } from 'src/topic/entities/topic.entity';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            News,
            AlbumImageEntity,
            VideoEntity,
            TopicEntity
        ], 'mssqlConnection'),
        forwardRef(() => SystemLogSqlModule),
    ],
    controllers: [PortalSearchController],
    providers: [PortalSearchService],
    exports: [PortalSearchService],
})
export class PortalSearchModule { }
