// src/messages/dto/send-message.dto.ts
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AttachmentDto {
  @ApiProperty({ description: 'URL của file đính kèm' })
  @IsString()
  attachFile: string;

  @ApiProperty({ description: 'Tên file' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Kích thước file (bytes)' })
  @IsNumber()
  size: number;

  @ApiProperty({ description: 'MIME type của file', example: 'image/jpeg' })
  @IsString()
  type: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'ID của conversation' })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({ description: 'ID người gửi' })
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @ApiPropertyOptional({ description: 'Nội dung tin nhắn (text)' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ description: 'Loại tin nhắn: 0 = text, 1 = file/image', example: 0 })
  @IsNumber()
  type: number;

  @ApiPropertyOptional({ description: 'Danh sách file đính kèm', type: [AttachmentDto] })
  @IsArray()
  @IsOptional()
  data?: AttachmentDto[];

  @ApiPropertyOptional({ description: 'Caption cho file/image' })
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiPropertyOptional({ description: 'ID tin nhắn được reply' })
  @IsString()
  @IsOptional()
  replyTo?: string;

  @ApiPropertyOptional({ description: 'Danh sách user được mention' })
  @IsArray()
  @IsOptional()
  mentions?: string[];

  @ApiPropertyOptional({ description: 'Temp ID từ client để tracking' })
  @IsString()
  @IsOptional()
  clientTempId?: string;
}
