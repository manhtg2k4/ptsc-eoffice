import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { VideoEntity } from './entities/video.entity';
import { VideoViewHistoryEntity } from './entities/video-view-history.entity';
import { TopicEntity } from '../topic/entities/topic.entity';
import { VideoLike } from './entities/video-like.entity';
import { UserEntity } from '../users/entities/user.entity';
import { VideoGateway } from './video.gateway';
import { OauthModule } from '../oauth/oauth.module';
import { DatabaseModule } from '../database/database.module';
import { FilesManagementModule } from '../files-managerment/files-management.module';
import { OrganizationUnitEntity } from '../organization-unit/organization-unit_sql/organization-unit.entity';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([VideoEntity, VideoViewHistoryEntity, TopicEntity, VideoLike, UserEntity, OrganizationUnitEntity], 'mssqlConnection'),
        forwardRef(() => DatabaseModule), // cung cấp SQLSVRepository để lấy thông tin user
        forwardRef(() => FilesManagementModule), // cung cấp FilesManagementService để lưu metadata vào bảng files
        OauthModule,
        forwardRef(() => SystemLogSqlModule),
    ],
    controllers: [VideosController],
    providers: [VideosService, VideoGateway],
    exports: [VideosService, VideoGateway],
})
export class VideosModule { }
