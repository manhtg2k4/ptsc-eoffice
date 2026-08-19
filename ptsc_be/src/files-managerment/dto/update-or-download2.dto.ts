import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class UpdateOrDownload2Dto {
  @ApiProperty({ description: 'Tên file cần tải từ NextCloud', example: 'namtest2.docx' })
  @IsString()
  @IsNotEmpty()
  file_name: string;

  @ApiProperty({ description: 'Tên thư mục trên NextCloud', example: '123456' })
  @IsString()
  @IsNotEmpty()
  folder_name: string;

  @ApiProperty({ description: "Loại đối tượng", example: 'contract' })
  @IsString()
  @IsNotEmpty()
  object_type: string;

  @ApiProperty({ description: 'ID của đối tượng', example: '12345' })
  @IsString()
  @IsNotEmpty()
  object_id: string;

  @ApiProperty({ description: 'ID file cần chỉnh sửa', example: 999 })
  @IsNumber()
  @IsNotEmpty()
  edit_file_id: number;

  @ApiPropertyOptional({ type: 'number', description: "ID thư mục cha" })
  @IsNumber()
  @IsOptional()
  parent_id?: number;

  @ApiPropertyOptional({ type: 'string', description: 'Mô tả' })
  @IsString()
  @IsOptional()
  description?: string;
}