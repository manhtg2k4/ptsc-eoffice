// src/post-storage-ai/post-storage-ai.controller.ts
import { Controller, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PostStorageAiService } from './post-storage-ai.service';

@ApiTags('Đồng bộ AI Văn bản')
@Controller('internal/post-storage-ai')
export class PostStorageAiController {
  constructor(private readonly service: PostStorageAiService) {}

  /**
   * Test sync AI thủ công
   * POST /internal/post-storage-ai/sync?documentId=859921197405
   */
  @Post('sync')
  async sync(@Query('documentId') documentId: string) {
    await this.service.trySyncOutgoing({ documentId });
    return { success: true };
  }

  @Post('sync-incoming')
  async syncIncoming(@Query('documentId') documentId: string) {
    await this.service.trySyncIncoming({ documentId });
    return { success: true };
  }
}
