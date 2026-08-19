import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumberString, IsObject } from 'class-validator';
import { IsValidDateRangeFilter } from '../../documents/dto/list-type.map';

/**
 * DTO cho API list storage batches
 * Hỗ trợ nested filter object, paging, sort theo format chung của project
 */
export class ListStorageBatchDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại', default: '1' })
  @IsOptional()
  @IsNumberString({}, { message: 'Số trang phải là số' })
  page?: string = '1';

  @ApiPropertyOptional({ description: 'Số bản ghi trên mỗi trang', default: '25' })
  @IsOptional()
  @IsNumberString({}, { message: 'Số bản ghi phải là số' })
  limit?: string = '25';

  @ApiPropertyOptional({
    description: 'Sắp xếp kết quả, ví dụ: {"createdAt":-1} hoặc {"name":1} hoặc string "-createdAt"',
    example: { createdAt: -1 },
  })
  @IsOptional()
  sort?: Record<string, any> | string;

  @ApiPropertyOptional({
    description: 'Filter object - hỗ trợ text search, date range, exact match',
    example: {
      name: 'tên đợt',
      code: 'mã đợt',
      statusCode: 'APPROVED',
      createdAt: { startDate: '2024-01-01', endDate: '2024-12-31' },
    },
  })
  @IsOptional()
  @IsObject()
  @IsValidDateRangeFilter({
    message: 'Filter có startDate / endDate không đúng định dạng YYYY-MM-DD',
  })
  filter?: Record<string, any>;
}

