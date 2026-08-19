import {
  IsOptional,
  IsString,
  IsObject,
  IsInt,
  Min,
  IsBooleanString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for listing travel work schedules with filtering and pagination
 */
export class ListTravelWorkSchedulesDto {
  @ApiPropertyOptional({
    description: 'Đường dẫn file BPMN',
  })
  @IsOptional()
  @IsString()
  bpmn?: string;

  @ApiPropertyOptional({
    description: 'ID người dùng hiện tại',
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
    description: 'Filter object',
    example: {
      scheduleType: 'singleDay',
      leader: '96E591E1-81BE-4FA3-844A-0FAE15B60120',
      workDate: {
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
    },
  })
  @IsOptional()
  @IsObject()
  filter?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Trang hiện tại',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số bản ghi trên mỗi trang',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sắp xếp kết quả',
    example: { createdAt: -1, workDate: 1 },
  })
  @IsOptional()
  @IsObject()
  sort?: Record<string, 1 | -1>;

  @ApiProperty({
    description: 'Mã danh sách (process function)',
    example: 'TRAVEL_WORK_SCHEDULES_LIST',
  })
  @IsNotEmpty()
  @IsString()
  processFn: string;

  @ApiPropertyOptional({
    description: 'Authority flag',
  })
  @IsOptional()
  @IsString()
  @IsBooleanString()
  authority?: string;

  @ApiPropertyOptional({
    description: 'Export flag',
  })
  @IsOptional()
  @IsString()
  @IsBooleanString()
  isExport?: string;

  @ApiPropertyOptional({
    description: 'List dynamic flag',
  })
  @IsOptional()
  @IsString()
  @IsBooleanString()
  isListDynamic?: string;
}