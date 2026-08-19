import { forwardRef, Module } from '@nestjs/common';
import { TopicService } from './topic.service';
import { TopicController } from './topic.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TopicEntity } from './entities/topic.entity';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';

import { UserEntity } from 'src/users/entities/user.entity';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { OauthModule } from 'src/oauth/oauth.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TopicEntity, UserEntity], 'mssqlConnection'),
    forwardRef(() => SystemLogSqlModule),
    AuthorityDocumentsModule,
    OauthModule,
    forwardRef(() => DatabaseModule),
  ],
  controllers: [TopicController],
  providers: [TopicService],
  exports: [TopicService],
})
export class TopicModule { }
