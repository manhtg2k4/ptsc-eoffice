import { ApiProperty } from '@nestjs/swagger';

export class ProjectDisbursementResponseDto {
    @ApiProperty({ description: 'ID giải ngân' })
    id: number;

    @ApiProperty({ description: 'ID dự án' })
    projectId: number;

    @ApiProperty({ description: 'Số tiền giải ngân' })
    disbursementAmount: number;

    @ApiProperty({ description: 'Thời gian giải ngân' })
    disbursementDate: Date;

    @ApiProperty({ description: 'ID người giải ngân' })
    disbursedByUserId: string;

    @ApiProperty({ description: 'Tên người giải ngân' })
    disbursedByUserName?: string;

    @ApiProperty({ description: 'Ghi chú' })
    notes: string;

    @ApiProperty({ description: 'Ngày tạo' })
    createdAt: Date;

    @ApiProperty({ description: 'Ngày cập nhật' })
    updatedAt: Date;

    @ApiProperty({ description: 'Người tạo' })
    createdBy: string;
}

export class ProjectDisbursementSummaryDto {
    @ApiProperty({ description: 'Tổng mức đầu tư (từ thông tin chung của dự án)' })
    totalInvestment: number;

    @ApiProperty({ description: 'Tổng giải ngân' })
    totalDisbursement: number;

    @ApiProperty({ description: 'Số đợt giải ngân' })
    disbursementCount: number;
}

export class ProjectDisbursementListResponseDto {
    @ApiProperty({ 
        description: 'Danh sách các đợt giải ngân',
        type: [ProjectDisbursementResponseDto]
    })
    data: ProjectDisbursementResponseDto[];

    @ApiProperty({ 
        description: 'Thông tin tổng hợp giải ngân',
        type: ProjectDisbursementSummaryDto
    })
    summary: ProjectDisbursementSummaryDto;
}
