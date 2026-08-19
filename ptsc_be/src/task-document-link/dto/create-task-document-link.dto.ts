// src/task-document-link/dto/create-task-document-link.dto.ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDocumentLinkDto {
  @ApiProperty({
    description: 'ID công việc',
    example: '123',
  })
  @IsNotEmpty({ message: 'ID công việc không được để trống.' })
  @IsString()
  taskId: string;

  @ApiPropertyOptional({
    description: 'Loại đối tượng (task, project, meeting, document...)',
    example: 'task',
  })
  @IsOptional()
  @IsString()
  objectType?: string;

  @ApiProperty({
    description: 'Tên tài liệu',
    example: 'Báo cáo tháng 1',
  })
  @IsNotEmpty({ message: 'Tên tài liệu không được để trống.' })
  @IsString()
  documentName: string;

  @ApiProperty({
    description: 'Đường dẫn tài liệu',
    example: 'https://docs.google.com/document/d/abc123',
  })
  @IsNotEmpty({ message: 'Đường dẫn tài liệu không được để trống.' })
  @IsString()
  documentUrl: string;

  @ApiPropertyOptional({
    description: 'Mô tả tài liệu',
    example: 'Tài liệu báo cáo tổng hợp tháng 1/2026',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
