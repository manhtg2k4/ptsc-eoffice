import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { IsBooleanString, IsPositiveIntString, IsValidDateRangeFilter, IsValidSort } from 'src/documents/dto/list-type.map';
import { IsPagedLimit, clampLimit } from '../../utils/pagination.validator';

export class OutgoingStatisticsBySignerDto {
  @ApiPropertyOptional({ description: 'Từ ngày (lọc theo signed_at), ISO string' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Đến ngày (lọc theo signed_at), ISO string' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Lọc theo người ký (user_id) - optional' })
  @IsOptional()
  @IsString()
  signerId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo loại văn bản (document_type) - optional' })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional({ description: 'Trang hiện tại', default: '1' })
  @IsOptional()
  @IsPositiveIntString(1, { message: 'Page phải là số nguyên >= 1.' })
  page?: string = '1';

  @ApiPropertyOptional({ description: 'Filter object' })
  @IsOptional()
  @IsObject()
  @IsValidDateRangeFilter()
  filter?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Số bản ghi trên mỗi trang', default: '20' })
  @IsOptional()
  @IsPagedLimit({ message: 'Limit phải là số nguyên trong khoảng [1, 100].' })
  limit?: string = '20';

  @ApiPropertyOptional({ description: 'Sắp xếp kết quả, ví dụ: {"tongVBKy":-1}' })
  @IsOptional()
  @IsValidSort()
  sort?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Chỉ trả về tổng số bản ghi (countOnly=true)' })
  @IsOptional()
  @IsString()
  @IsBooleanString()
  countOnly?: string;

  @ApiPropertyOptional({ description: 'Xuất file (isExport=true)' })
  @IsOptional()
  @IsString()
  @IsBooleanString()
  isExport?: string;
}
