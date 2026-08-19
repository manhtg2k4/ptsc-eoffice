import { forwardRef, Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { News } from './entities/news.entity';
import { NewsComment } from './entities/news-comment.entity';
import { NewsLike } from './entities/news-like.entity';
import { NewsView } from './entities/news-view.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { FilesManagementModule } from 'src/files-managerment/files-management.module';
import { OauthModule } from '../oauth/oauth.module';
import { NewsWorkflowService } from './news-workflow.service';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { Audit } from 'src/database/schema-sql/audit.entity';
import { WorkItemEntity } from 'src/work-items/entities/work-item.entity';
import { DatabaseModule } from 'src/database/database.module';
import { GroupUsersModule } from 'src/group-users/group-users.module';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { SystemSettingLogEntity } from 'src/systemLogManagement/system-setting-log.entity';
import { TopicEntity } from 'src/topic/entities/topic.entity';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { NewsGateway } from './news.gateway';
import { UsersModule } from 'src/users/users.module';
import { NotificationModule } from 'src/notifycation/notification.module';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { BpmnRoleGuard } from 'src/oauth/bpmn-role.guard';

@Module({
  imports: [
    forwardRef(() => NotificationModule),
    TypeOrmModule.forFeature([News, NewsComment, NewsLike, NewsView, UserEntity, Audit, WorkItemEntity, GroupUserEntity, SystemSettingLogEntity, TopicEntity, FeatureManagementEntity, OrganizationUnitEntity, RoleFeatureEntity], 'mssqlConnection'),
    OauthModule,
    forwardRef(() => FilesManagementModule),
    forwardRef(() => SystemLogSqlModule),
    forwardRef(() => BpmnModule),
    forwardRef(() => DatabaseModule),
    forwardRef(() => GroupUsersModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [NewsController],
  providers: [NewsService, NewsWorkflowService, NewsGateway, BpmnRoleGuard],
  exports: [NewsService, NewsWorkflowService],
})
export class NewsModule { }
