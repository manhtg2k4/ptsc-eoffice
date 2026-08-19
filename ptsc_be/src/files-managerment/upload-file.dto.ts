import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'File cần tải lên' })
  file: any; // Trường này chỉ dùng cho Swagger, không dùng cho validation

  @ApiProperty({ description: "Loại đối tượng liên quan. Ví dụ: 'document', 'user_profile'", default: 'default' })
  @IsString()
  @IsNotEmpty()
  object_type: string;

  @ApiProperty({ description: 'ID của đối tượng mà file này liên quan', default: '0' })
  @IsString() // Thay đổi từ IsNumber sang IsString
  @IsNotEmpty()
  object_id: string;

  @ApiPropertyOptional({
    type: 'number',
    description: "Tùy chọn: ID của thư mục cha trong bảng 'files'",
  })
  @IsNumber()
  @IsOptional()
  parent_id?: number;

  @ApiPropertyOptional({
    type: 'string',
    description: 'Tùy chọn: Mô tả cho file',
  })
  @IsString()
  @IsOptional()
  description?: string;
}