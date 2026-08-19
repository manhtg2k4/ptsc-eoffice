import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumberString, IsObject } from 'class-validator';

/**
 * DTO cho API list archives
 * Hỗ trợ nested filter object, paging, sort
 */
export class ListArchivesDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại', default: '1' })
  @IsOptional()
  @IsNumberString({}, { message: 'Số trang phải là số' })
  page?: string = '1';

  @ApiPropertyOptional({ description: 'Số bản ghi trên mỗi trang', default: '25' })
  @IsOptional()
  @IsNumberString({}, { message: 'Số bản ghi phải là số' })
  limit?: string = '25';

  @ApiPropertyOptional({
    description: 'Sắp xếp kết quả, ví dụ: {"createdAt":-1} hoặc {"archivesName":1}',
    example: { createdAt: -1 },
  })
  @IsOptional()
  sort?: Record<string, any> | string;

  @ApiPropertyOptional({
    description: 'Filter object - hỗ trợ text search, date range, exact match',
    example: {
      archivesName: 1,
      archivesType: 'projectPolice',
      archivesYear: { startDate: '2024-01-01', endDate: '2024-12-31' },
    },
  })
  @IsOptional()
  @IsObject()
  filter?: Record<string, any>;
}
