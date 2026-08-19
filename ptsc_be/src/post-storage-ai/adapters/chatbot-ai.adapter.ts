// src/post-storage-ai/adapters/chatbot-ai.adapter.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';
import { PushAiDto } from '../dto/push-ai.dto';

@Injectable()
export class ChatbotAiAdapter {
  private readonly logger = new Logger(ChatbotAiAdapter.name);

  private readonly aiUrl =
    process.env.AI_POST_METADATA_URL ||
    'https://administrator.lifetex.vn:436/api/post_metadata_chatbot/';

  constructor(private readonly http: HttpService) {}

  /**
   * Gửi dữ liệu sang AI (multipart/form-data)
   */
  async push(dto: PushAiDto): Promise<void> {
    const form = new FormData();

    form.append('kind', dto.kind);
    form.append('metadata', JSON.stringify(dto.metadata ?? {}));

    if (dto.file) {
      if (dto.file.buffer) {
        form.append('file', dto.file.buffer, {
          filename: dto.file.filename,
          contentType: dto.file.mimetype,
        });
      } else if (dto.file.fullPath) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs');
        form.append('file', fs.createReadStream(dto.file.fullPath), {
          filename: dto.file.filename,
          contentType: dto.file.mimetype,
        });
      }
    }

    await firstValueFrom(
      this.http.post(this.aiUrl, form, {
        headers: form.getHeaders(),
        timeout: 60_000,
        maxBodyLength: Infinity,
      }),
    );

  }
}