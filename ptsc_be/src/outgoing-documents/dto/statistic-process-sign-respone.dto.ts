// src/document-report/dto/statistic-report-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class DepartmentStatisticProcessDto {
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
        description: 'Tổng VB trình',
        example: 150,
    })
    total: number;

    @ApiProperty({
        description: 'Đúng hạn',
        example: 120,
    })
    onTime: number;

    @ApiProperty({
        description: 'Trễ hạn',
        example: 20,
    })
    late: number;

    @ApiProperty({
        description: 'Đang xử lý',
        example: 10,
    })
    unprocessed: number;

    @ApiProperty({
        description: 'TG trình TB (ngày)',
        example: 10,
    })
    avg: number;

    @ApiProperty({
        description: 'Tỷ lệ đúng hạn',
        example: '80.00%',
    })
    onTimeRate: string;
}

export class StatisticReportProcessResponseDto {
    @ApiProperty({
        type: [DepartmentStatisticProcessDto],
        description: 'Danh sách thống kê theo phòng ban',
    })
    data: DepartmentStatisticProcessDto[];

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