import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional, ValidateNested, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO: Chi tiết lịch trực cho từng ngày
 */
export class DutyDetailDto {
  @ApiProperty({ description: 'Ngày trực (YYYY-MM-DD)', example: '2025-01-20' })
  @IsNotEmpty()
  @IsDateString()
  dutyDate: string;

  @ApiProperty({ description: 'Thứ trong tuần (1: CN, 2: T2, ..., 7: T7)', example: 2, minimum: 1, maximum: 7 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(7)
  dayOfWeek: number;

  @ApiProperty({ description: 'User ID của lãnh đạo trực', example: 'USER_12345' })
  @IsNotEmpty()
  @IsString()
  leaderId: string;

  @ApiPropertyOptional({ description: 'Ghi chú', example: 'Trực cả ngày' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO: Tạo lịch trực
 */
export class CreateLeadershipDutyScheduleDto {
  @ApiProperty({ description: 'Tiêu đề lịch', example: 'Lịch trực tuần 3 tháng 1/2025' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Tuần (1-52)', example: 3, minimum: 1, maximum: 52 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(52)
  week: number;

  @ApiProperty({ description: 'Năm', example: 2025, minimum: 2020 })
  @IsNotEmpty()
  @IsNumber()
  @Min(2020)
  year: number;

  @ApiProperty({ description: 'Ngày tạo lịch (YYYY-MM-DD)', example: '2025-01-20' })
  @IsNotEmpty()
  @IsDateString()
  scheduleDate: string;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fromDate: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  toDate: string;

  @ApiProperty({ description: 'Giờ tạo lịch (YYYY-MM-DD)', example: '08-30' })
  @IsNotEmpty()
  @IsDateString()
  scheduleTime: string;

  @ApiProperty({ description: 'Danh sách chi tiết lịch trực 7 ngày', type: [DutyDetailDto] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DutyDetailDto)
  details: DutyDetailDto[];
}

/**
 * DTO: Cập nhật lịch trực
 */
export class UpdateLeadershipDutyScheduleDto {
  @ApiPropertyOptional({ description: 'Tiêu đề lịch' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Tuần (1-52)', minimum: 1, maximum: 52 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(52)
  week?: number;

  @ApiPropertyOptional({ description: 'Năm', minimum: 2020 })
  @IsOptional()
  @IsNumber()
  @Min(2020)
  year?: number;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Ngày tạo lịch (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  scheduleDate?: string;

  @ApiPropertyOptional({ description: 'Giờ tạo lịch (HH-MM)' })
  @IsOptional()
  @IsDateString()
  scheduleTime?: string;

  @ApiPropertyOptional({ description: 'Danh sách chi tiết lịch trực 7 ngày', type: [DutyDetailDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DutyDetailDto)
  details?: DutyDetailDto[];
}

/**
 * DTO: Xóa nhiều lịch trực
 */
export class DeleteManyLeadershipDutySchedulesDto {
  @ApiProperty({ description: 'Mảng ID cần xóa', example: ['LDS_123_ABC', 'LDS_456_DEF'] })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

/**
 * DTO: Danh sách lịch trực
 */
export class ListLeadershipDutySchedulesDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Số bản ghi mỗi trang', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: 'Bộ lọc (JSON string)', example: '{"title":{"value":"Lịch trực"}}' })
  @IsOptional()
  filter?: any;

  @ApiPropertyOptional({ description: 'Sắp xếp (JSON string)', example: '{"created_at":"desc"}' })
  @IsOptional()
  sort?: any;

  @ApiPropertyOptional({ description: 'Tên chức năng', example: 'leadership-duty-schedule' })
  @IsOptional()
  @IsString()
  processFn?: string;

  @ApiPropertyOptional({ description: 'Authority flag', example: 'true' })
  @IsOptional()
  @IsString()
  authority?: string;

  @ApiPropertyOptional({ description: 'Export flag', example: 'false' })
  @IsOptional()
  @IsString()
  isExport?: string;

  @ApiPropertyOptional({ description: 'List dynamic flag', example: 'true' })
  @IsOptional()
  @IsString()
  isListDynamic?: string;
}