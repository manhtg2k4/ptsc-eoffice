import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumberString,
  IsBooleanString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  MinLength,
  IsArray,
} from 'class-validator';

export class ListBookDocumentsDto {
  @ApiPropertyOptional({ description: 'Search keyword' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1, description: 'Page number' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ default: 20, description: 'Items per page' })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({ description: 'Sort order (e.g., "created_at DESC")' })
  @IsOptional()
  sort?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiPropertyOptional({ description: 'Filter by year' })
  @IsOptional()
  @IsNumberString()
  year?: string;

  @ApiPropertyOptional({ description: 'Filter by document type' })
  @IsOptional()
  @IsString()
  type_document?: string;

  @ApiPropertyOptional({ description: 'Filter by sender unit' })
  @IsOptional()
  @IsString()
  sender_unit?: string;

  @ApiPropertyOptional({
    description: "Scope lọc riêng cho bộ lọc sổ văn bản đến (giá trị: 'tct')",
  })
  @IsOptional()
  @IsString()
  scope?: string;
  @ApiPropertyOptional({ description: 'id sổ văn bản' })
  @IsOptional()
  @IsString()
  book_document_id?: string;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
    return value;
  })
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Sổ mặc định', default: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
    return value;
  })
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({
    description: 'Tên sổ văn bản',
    example: 'Sổ văn bản đến 2024',
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  name: string;
  @ApiPropertyOptional({ description: 'Dynamic filters' })
  @IsOptional()
  filter?: Record<string, any>;

  @IsOptional()
  @IsString()
  order?: string;
}

export class CreateBookDocumentDto {
  @ApiProperty({
    description: 'Tên sổ văn bản',
    example: 'Sổ văn bản đến 2024',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @ApiPropertyOptional({ description: 'Năm của sổ', example: 2024 })
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Loại văn bản' })
  @IsOptional()
  @IsString()
  type_document?: string;

  @ApiPropertyOptional({ description: 'Đơn vị gửi' })
  @IsOptional()
  @IsString()
  sender_unit?: string;

  @ApiPropertyOptional({ description: 'Mã vào sổ' })
  @IsOptional()
  @IsString()
  to_book_code?: string;

  @ApiPropertyOptional({ description: 'Lĩnh vực văn bản' })
  @IsOptional()
  document_field?: string[];

  @ApiPropertyOptional({ description: 'Mức độ riêng tư' })
  @IsOptional()
  @IsString()
  private_level?: string;

  @ApiPropertyOptional({ description: 'Người quản lý sổ' })
  @IsOptional()
  manager_book?: string[];

  @IsOptional()
  @IsString()
  order?: string;

  @ApiPropertyOptional({ description: 'id sổ văn bản' })
  @IsOptional()
  @IsString()
  book_document_id?: string;

  @ApiPropertyOptional({ description: 'Số lượng' })
  @IsOptional()
  @IsNumber()
  count?: number;

  @ApiPropertyOptional({ description: 'Sổ mặc định', default: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
    return value;
  })
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isCertifiedCopies?: boolean;
}
export class DeleteBookDocumentsDto {
  @IsOptional()
  ids: string[] | number[];
}
export class UpdateBookDocumentDto extends CreateBookDocumentDto { }
