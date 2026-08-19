// src/document-report/dto/statistic-report-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class DepartmentStatisticSenderUnitDto {
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
    description: 'Tổng số văn bản',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Công văn',
    example: 120,
  })
  officialLetter: number;
  @ApiProperty({
    description: 'Quyết định',
    example: 20,
  })
  decision: number;

  @ApiProperty({
    description: 'Thông báo',
    example: 10,
  })
  notification: number;

  @ApiProperty({
    description: 'Báo cáo',
    example: 10,
  })
  report: number;

  @ApiProperty({
    description: 'Khác',
    example: 20,
  })
  other: number;
}

export class StatisticReportSenderUnitResponseDto {
  @ApiProperty({
    type: [DepartmentStatisticSenderUnitDto],
    description: 'Danh sách thống kê theo phòng ban',
  })
  data: DepartmentStatisticSenderUnitDto[];

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