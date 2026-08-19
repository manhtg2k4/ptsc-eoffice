import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
  ValidateIf,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ScheduleItemDto } from './create-travel-work-schedule.dto';

/**
 * DTO for updating Travel Work Schedule
 * Cho phép update từng phần của schedule
 */
export class UpdateTravelWorkScheduleDto {
  @ApiPropertyOptional({
    example: '96E591E1-81BE-4FA3-844A-0FAE15B60120',
    description: 'ID người dẫn đầu',
  })
  @IsOptional()
  @IsString()
  leader?: string;

  @ApiPropertyOptional({
    example: 'singleDay',
    enum: ['singleDay', 'multiDay'],
    description: 'Loại công tác',
  })
  @IsOptional()
  @IsString()
  @IsIn(['singleDay', 'multiDay'])
  scheduleType?: 'singleDay' | 'multiDay';

  @ApiPropertyOptional({
    example: 'nhieulich',
    description: 'Loại lịch công tác',
  })
  @IsOptional()
  @IsString()
  travelSchedule?: string;

  @ApiPropertyOptional({
    example: 'session',
    enum: ['session', 'fullDay'],
    description: 'Hình thức lịch (chỉ cho singleDay)',
  })
  @IsOptional()
  @IsString()
  @IsIn(['session', 'fullDay'])
  calendarFormat?: 'session' | 'fullDay';

  // ===== DATES =====
  @ApiPropertyOptional({
    example: '2026-01-29T10:08:19Z',
    description: 'Ngày công tác (cho singleDay)',
  })
  @IsOptional()
  @IsDateString()
  workDate?: Date| null;

  @ApiPropertyOptional({
    example: '2026-01-28T10:12:56Z',
    description: 'Ngày bắt đầu (cho multiDay)',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: Date| null;

  @ApiPropertyOptional({
    example: '2026-01-31T10:12:58Z',
    description: 'Ngày kết thúc (cho multiDay)',
  })
  @IsOptional()
  @IsDateString()
  toDate?: Date| null;

  // ===== FULL DAY & MULTI DAY FIELDS =====
  @ApiPropertyOptional({
    example: 'LT',
    description: 'Địa điểm (cho fullDay và multiDay)',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    example: 'Họp giao ban',
    description: 'Nội dung (cho fullDay và multiDay)',
  })
  @IsOptional()
  @IsString()
  content?: string;

  // ===== SESSION FIELDS =====
  @ApiPropertyOptional({
    example: '1901',
    description: 'Địa điểm buổi sáng (cho session)',
  })
  @IsOptional()
  @IsString()
  morningLocation?: string;

  @ApiPropertyOptional({
    example: 'Tân cảng',
    description: 'Nội dung buổi sáng (cho session)',
  })
  @IsOptional()
  @IsString()
  morningContent?: string;

  @ApiPropertyOptional({
    example: '1902',
    description: 'Địa điểm buổi chiều (cho session)',
  })
  @IsOptional()
  @IsString()
  afternoonLocation?: string;

  @ApiPropertyOptional({
    example: 'Urenco',
    description: 'Nội dung buổi chiều (cho session)',
  })
  @IsOptional()
  @IsString()
  afternoonContent?: string;

  @ApiPropertyOptional({
    description: 'Danh sách lịch chi tiết (chỉ cho multiDay)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  schedules?: ScheduleItemDto[];

  // ===== STATUS =====
  @ApiPropertyOptional({
    example: '1',
    enum: ['1', '2', '3'],
    description: 'Trạng thái: 1=active, 2=locked, 3=deleted',
  })
  @IsOptional()
  @IsString()
  @IsIn(['1', '2', '3'])
  status?: string;
}