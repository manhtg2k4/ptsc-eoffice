// src/comments/comments.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { DatabaseModule } from 'src/database/database.module';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { NotificationModule } from 'src/notifycation/notification.module';

import { ProjectModule } from '../project/project.module';
import { NewsModule } from '../news/news.module';

@Module({
  imports: [
    forwardRef(() => DatabaseModule), forwardRef(() => BpmnModule), forwardRef(() => NotificationModule),
    forwardRef(() => ProjectModule),
    forwardRef(() => NewsModule),
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule { }
