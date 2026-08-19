import { IsString, IsOptional, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExampleFileDto {
  @ApiProperty({
    description: 'Unique key for the example file (e.g., template_invoice)',
    example: 'template_invoice',
  })
  @IsString()
  @IsNotEmpty({ message: 'example_key không được để trống' })
  @MinLength(3, { message: 'example_key phải có ít nhất 3 ký tự' })
  @MaxLength(100, { message: 'example_key không được vượt quá 100 ký tự' })
  @Matches(/^[a-zA-Z0-9_]+$/, { 
    message: 'example_key chỉ được chứa chữ cái, số và dấu gạch dưới' 
  })
  example_key: string;

  @ApiPropertyOptional({
    description: 'Type of example file (default: template)',
    example: 'invoice',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  example_type?: string;

  @ApiPropertyOptional({
    description: 'Description of the example file',
    example: 'File mẫu hóa đơn tiêu chuẩn',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateExampleFileDto {
  @ApiPropertyOptional({
    description: 'Type of example file',
    example: 'invoice',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  example_type?: string;

  @ApiPropertyOptional({
    description: 'Description of the example file',
    example: 'File mẫu hóa đơn tiêu chuẩn',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class GetExampleFileDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  file_name: string;

  @ApiProperty()
  example_key: string;

  @ApiProperty()
  example_type: string;

  @ApiProperty()
  file_size: number;

  @ApiProperty()
  mime_type: string;

  @ApiProperty()
  storage_path: string;

  @ApiProperty()
  storage_type: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty()
  created_by: string;
}

export class GetExampleFilesResponseDto {
  @ApiProperty({ type: [GetExampleFileDto] })
  data: GetExampleFileDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
