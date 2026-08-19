import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  folder_name: string;

  @IsNumber()
  @IsOptional()
  parent_id?: number; // Tùy chọn: ID của thư mục cha trong bảng 'files'

  @IsString()
  @IsOptional()
  description?: string; // Tùy chọn: Mô tả cho thư mục
}