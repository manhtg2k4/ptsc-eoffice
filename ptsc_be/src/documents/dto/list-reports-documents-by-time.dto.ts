import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject, IsNotEmpty, IsDefined } from 'class-validator';
import { IsBooleanString, IsPositiveIntString, IsValidDateRangeFilter, IsValidSort, IsValidType } from './list-type.map';
import { IsPagedLimit, clampLimit } from '../../utils/pagination.validator';
/**
 * DTO cho API list documents
 * Hỗ trợ nested filter object, paging, sort, và các field filter cơ bản
 */
export class ListReportOutgoingByTimeDto {
  @ApiPropertyOptional({
    description: 'Đường dẫn file BPMN (mặc định dùng LuongGhepGiaoDien.bpmn)',
  })
  @IsOptional()
  @IsString()
  bpmn?: string;

  @ApiPropertyOptional({
    description: 'ID người dùng hiện tại (tự động lấy từ token nếu có)',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Danh sách vai trò của người dùng, phân tách bằng dấu phẩy',
  })
  @IsOptional()
  @IsString()
  roles?: string;

  @ApiPropertyOptional({
    description:
      'Loại văn bản (urgent, deadline, other, waiting, processed, receive, incompleted, completed)',
  })

  @IsString()
  @IsOptional()
  @IsValidType()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter object' })
  @IsOptional()
  @IsObject()
  @IsValidDateRangeFilter()
  filter?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Trang hiện tại', default: '1' })
  @IsOptional()
  @IsPositiveIntString(1, { message: 'Page phải là số nguyên >= 1.' })
  page?: string = '1';

  @ApiPropertyOptional({ description: 'Số bản ghi trên mỗi trang', default: '20' })
  @IsOptional()
  @IsPagedLimit({ message: 'Limit phải là số nguyên trong khoảng [1, 100].' })
  limit?: string = '20';

  @ApiPropertyOptional({
    description: 'Sắp xếp kết quả, ví dụ: {"userDeadline":1}',
  })
  @IsOptional()
  @IsValidSort()
  sort?: Record<string, any>;

  @ApiProperty({ description: 'Mã danh sách (process function)' })
  @IsString()
  processFn?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  authority?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  room?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  isExport?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  countOnly?: string;
}