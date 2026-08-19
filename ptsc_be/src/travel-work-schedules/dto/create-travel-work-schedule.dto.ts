import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsIn,
  ValidateIf,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Item for multiDay schedules
 */
export class ScheduleItemDto {
  @ApiPropertyOptional({
    example: 'motngay',
    description: 'Số ngày',
  })
  @IsString()
  @IsOptional()
  numDays?: string;

  @ApiPropertyOptional({
    example: 'session',
    description: 'Định dạng (session/fullDay)',
  })
  @IsString()
  @IsOptional()
  format?: string;

  @ApiPropertyOptional({
    example: '2026-04-15 00:00:00',
    description: 'Ngày cụ thể',
  })
  @IsOptional()
  date?: string;

  @ApiProperty({
    example: '2026-03-26 00:00:00',
    description: 'Ngày bắt đầu chi tiết',
  })
  @IsOptional()
  startDate: string;

  @ApiProperty({
    example: '2026-03-27 00:00:00',
    description: 'Ngày kết thúc chi tiết',
  })
  @IsOptional()
  endDate: string;

  @ApiProperty({
    example: 'LT',
    description: 'Địa điểm chi tiết',
  })
  @IsString()
  @IsOptional()
  location: string;

  @ApiProperty({
    example: 'Họp giao ban chi tiết',
    description: 'Nội dung chi tiết',
  })
  @IsString()
  @IsOptional()
  content: string;

  @ApiPropertyOptional({
    description: 'Địa điểm buổi sáng',
  })
  @IsString()
  @IsOptional()
  morningLocation?: string;

  @ApiPropertyOptional({
    description: 'Nội dung buổi sáng',
  })
  @IsString()
  @IsOptional()
  morningContent?: string;

  @ApiPropertyOptional({
    description: 'Địa điểm buổi chiều',
  })
  @IsString()
  @IsOptional()
  afternoonLocation?: string;

  @ApiPropertyOptional({
    description: 'Nội dung buổi chiều',
  })
  @IsString()
  @IsOptional()
  afternoonContent?: string;
}

/**
 * Base DTO for common fields
 */
export class BaseTravelWorkScheduleDto {
  @ApiProperty({
    example: '96E591E1-81BE-4FA3-844A-0FAE15B60120',
    description: 'ID người dẫn đầu',
  })
  @IsString()
  @IsNotEmpty()
  leader: string;

  @ApiProperty({
    example: 'singleDay',
    enum: ['singleDay', 'multiDay'],
    description: 'Loại công tác',
  })
  @IsString()
  @IsIn(['singleDay', 'multiDay'])
  scheduleType: 'singleDay' | 'multiDay';

  @ApiPropertyOptional({
    example: 'nhieulich',
    description: 'Loại lịch công tác',
  })
  @IsString()
  @IsOptional()
  travelSchedule?: string;
}

/**
 * DTO for Single Day - Session format
 * Trong ngày - Theo buổi
 */
export class SingleDaySessionDto extends BaseTravelWorkScheduleDto {
  @ApiProperty({
    example: 'session',
    description: 'Hình thức lịch',
  })
  @IsString()
  @IsIn(['session'])
  calendarFormat: 'session';

  @ApiProperty({
    example: '2026-01-29T10:08:19Z',
    description: 'Ngày công tác',
  })
  @IsDateString()
  workDate: string;

  @ApiProperty({
    example: '1901',
    description: 'Địa điểm buổi sáng',
  })
  @IsString()
  @IsNotEmpty()
  morningLocation: string;

  @ApiProperty({
    example: 'Tân cảng',
    description: 'Nội dung buổi sáng',
  })
  @IsString()
  @IsNotEmpty()
  morningContent: string;

  @ApiProperty({
    example: '1902',
    description: 'Địa điểm buổi chiều',
  })
  @IsString()
  @IsNotEmpty()
  afternoonLocation: string;

  @ApiProperty({
    example: 'Urenco',
    description: 'Nội dung buổi chiều',
  })
  @IsString()
  @IsNotEmpty()
  afternoonContent: string;
}

/**
 * DTO for Single Day - Full Day format
 * Trong ngày - Cả ngày
 */
export class SingleDayFullDayDto extends BaseTravelWorkScheduleDto {
  @ApiProperty({
    example: 'fullDay',
    description: 'Hình thức lịch',
  })
  @IsString()
  @IsIn(['fullDay'])
  calendarFormat: 'fullDay';

  @ApiProperty({
    example: '2026-01-29T10:08:19Z',
    description: 'Ngày công tác',
  })
  @IsDateString()
  workDate: string;

  @ApiProperty({
    example: 'LT',
    description: 'Địa điểm',
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    example: 'Họp giao ban',
    description: 'Nội dung công tác',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}

/**
 * DTO for Multi Day
 * Nhiều ngày
 */
export class MultiDayDto extends BaseTravelWorkScheduleDto {
  @ApiProperty({
    example: '2026-01-28T10:12:56Z',
    description: 'Ngày bắt đầu',
  })
  @IsDateString()
  fromDate: string;

  @ApiProperty({
    example: '2026-01-31T10:12:58Z',
    description: 'Ngày kết thúc',
  })
  @IsDateString()
  toDate: string;

  @ApiProperty({
    example: 'LT',
    description: 'Địa điểm',
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    example: 'Họp giao ban',
    description: 'Nội dung công tác',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}

/**
 * Main Create DTO
 * Unified DTO that accepts all formats
 */
export class CreateTravelWorkScheduleDto {
  @ApiProperty({
    example: '96E591E1-81BE-4FA3-844A-0FAE15B60120',
    description: 'ID người dẫn đầu',
  })
  @IsString()
  @IsNotEmpty()
  leader: string;

  @ApiProperty({
    example: 'singleDay',
    enum: ['singleDay', 'multiDay'],
    description: 'Loại công tác',
  })
  @IsString()
  @IsIn(['singleDay', 'multiDay'])
  scheduleType: 'singleDay' | 'multiDay';

  @ApiPropertyOptional({
    example: 'nhieulich',
    description: 'Loại lịch công tác',
  })
  @IsString()
  @IsOptional()
  travelSchedule?: string;

  // ===== CALENDAR FORMAT (for singleDay only) =====
  @ApiPropertyOptional({
    example: 'session',
    enum: ['session', 'fullDay'],
    description: 'Hình thức lịch (chỉ cho singleDay)',
  })
  @ValidateIf(o => o.scheduleType === 'singleDay')
  @IsString()
  @IsIn(['session', 'fullDay'])
  calendarFormat?: 'session' | 'fullDay';

  // ===== DATES =====
  @ApiPropertyOptional({
    example: '2026-01-29T10:08:19Z',
    description: 'Ngày công tác (cho singleDay)',
  })
  @ValidateIf(o => o.scheduleType === 'singleDay')
  @IsDateString()
  workDate?: string;

  @ApiPropertyOptional({
    example: '2026-01-28T10:12:56Z',
    description: 'Ngày bắt đầu (cho multiDay)',
  })
  @ValidateIf(o => o.scheduleType === 'multiDay')
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    example: '2026-01-31T10:12:58Z',
    description: 'Ngày kết thúc (cho multiDay)',
  })
  @ValidateIf(o => o.scheduleType === 'multiDay')
  @IsDateString()
  toDate?: string;

  // ===== FULL DAY & MULTI DAY FIELDS =====
  @ApiPropertyOptional({
    example: 'LT',
    description: 'Địa điểm (cho fullDay và multiDay)',
  })
  @ValidateIf(
    o =>
      (o.scheduleType === 'singleDay' && o.calendarFormat === 'fullDay') ||
      (o.scheduleType === 'multiDay' && !o.schedules),
  )
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    example: 'Họp giao ban',
    description: 'Nội dung (cho fullDay và multiDay)',
  })
  @ValidateIf(
    o =>
      (o.scheduleType === 'singleDay' && o.calendarFormat === 'fullDay') ||
      (o.scheduleType === 'multiDay' && !o.schedules),
  )
  @IsString()
  @IsOptional()
  content?: string;

  // ===== SCHEDULES ARRAY (for multiDay only) =====
  @ApiPropertyOptional({
    type: [ScheduleItemDto],
    description: 'Danh sách lịch chi tiết (chỉ cho multiDay)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  schedules?: ScheduleItemDto[];

  // ===== SESSION FIELDS =====
  @ApiPropertyOptional({
    example: '1901',
    description: 'Địa điểm buổi sáng (cho session)',
  })
  @ValidateIf(
    o =>
      o.scheduleType === 'singleDay' &&
      o.calendarFormat === 'session' &&
      (o.morningLocation ||
        o.morningContent ||
        (!o.afternoonLocation && !o.afternoonContent)),
  )
  @IsString()
  @IsNotEmpty()
  morningLocation?: string;

  @ApiPropertyOptional({
    example: 'Tân cảng',
    description: 'Nội dung buổi sáng (cho session)',
  })
  @ValidateIf(
    o =>
      o.scheduleType === 'singleDay' &&
      o.calendarFormat === 'session' &&
      (o.morningLocation ||
        o.morningContent ||
        (!o.afternoonLocation && !o.afternoonContent)),
  )
  @IsString()
  @IsNotEmpty()
  morningContent?: string;

  @ApiPropertyOptional({
    example: '1902',
    description: 'Địa điểm buổi chiều (cho session)',
  })
  @ValidateIf(
    o =>
      o.scheduleType === 'singleDay' &&
      o.calendarFormat === 'session' &&
      (o.afternoonLocation || o.afternoonContent),
  )
  @IsString()
  @IsNotEmpty()
  afternoonLocation?: string;

  @ApiPropertyOptional({
    example: 'Urenco',
    description: 'Nội dung buổi chiều (cho session)',
  })
  @ValidateIf(
    o =>
      o.scheduleType === 'singleDay' &&
      o.calendarFormat === 'session' &&
      (o.afternoonLocation || o.afternoonContent),
  )
  @IsString()
  @IsNotEmpty()
  afternoonContent?: string;
}