// src/files-management/dto/upload-to-nextcloud.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class UploadToNextcloudDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File cần upload',
  })
  file: any;

  @ApiProperty({
    example: '123456',
    description: 'ID của đối tượng (object_id)',
    type: 'string',
  })
  object_id: string;
}