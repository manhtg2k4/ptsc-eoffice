// src/post-storage-ai/post-storage-ai.module.ts

import { forwardRef, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { PostStorageAiService } from './post-storage-ai.service';
import { ChatbotAiAdapter } from './adapters/chatbot-ai.adapter';
import { PostStorageAiRepository } from './repositories/post-storage-ai.repository';

import { OutgoingDocumentsModule } from 'src/outgoing-documents/outgoing-documents.module';
import { FilesManagementModule } from 'src/files-managerment/files-management.module';

import { PostStorageAiController } from './post-storage-ai.controller';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => FilesManagementModule),
  ],
  controllers: [PostStorageAiController],
  providers: [
    PostStorageAiService,
    ChatbotAiAdapter,
    PostStorageAiRepository,
  ],
  exports: [PostStorageAiService],
})
export class PostStorageAiModule {}