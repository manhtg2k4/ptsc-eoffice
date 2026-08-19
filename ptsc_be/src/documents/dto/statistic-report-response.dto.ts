// src/document-report/dto/statistic-report-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class DepartmentStatisticDto {
  @ApiProperty({
    description: 'ID phòng ban',
    example: '68afb3a1cb36081f0bba5dd6',
  })
  id: string;

  @ApiProperty({
    description: 'Tên phòng ban',
    example: 'Văn phòng',
  })
  senderUnit: string;

  @ApiProperty({
    description: 'Tổng số văn bản nhận',
    example: 150,
  })
  totalReceived: number;

  @ApiProperty({
    description: 'Số văn bản hoàn thành đúng hạn',
    example: 120,
  })
  onTime: number;

  @ApiProperty({
    description: 'Số văn bản hoàn thành trễ hạn',
    example: 20,
  })
  late: number;

  @ApiProperty({
    description: 'Số văn bản chưa xử lý',
    example: 10,
  })
  unprocessed: number;

  @ApiProperty({
    description: 'Tỷ lệ hoàn thành đúng hạn',
    example: '80.00%',
  })
  onTimeRate: string;

  @ApiProperty({
    description: 'Tỷ lệ hoàn thành trễ hạn',
    example: '20.00%',
  })
  lateRate: string;

  onTimeRateRaw?: number;
  lateRateRaw?: number;
}

export class StatisticReportResponseDto {
  @ApiProperty({
    type: [DepartmentStatisticDto],
    description: 'Danh sách thống kê theo phòng ban',
  })
  data: DepartmentStatisticDto[];

  @ApiProperty({
    description: 'Tổng số phòng ban',
    example: 15,
  })
  total: number;

  @ApiProperty({
    description: 'Trang hiện tại',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Số lượng bản ghi mỗi trang',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Tổng số trang',
    example: 1,
  })
  totalPages: number;
}