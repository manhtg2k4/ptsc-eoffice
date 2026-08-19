import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsDateString,
    IsNumber,
    IsNotEmpty,
} from 'class-validator';

export class CreateProjectDisbursementDto {
    @ApiProperty({ description: 'Số tiền giải ngân', example: 100000000 })
    @IsNumber()
    @IsNotEmpty()
    disbursementAmount: number;

    @ApiProperty({ description: 'Đơn vị tiền tệ (Hệ số nhân), nếu không truyền sẽ lấy theo dự án', required: false, example: 1000000000 })
    @IsOptional()
    @IsNumber()
    moneyUnit?: number;

    @ApiProperty({ 
        description: 'Thời gian giải ngân (ISO format, mặc định là ngày hôm nay)', 
        required: false,
        example: '2026-04-24T00:00:00Z'
    })
    @IsOptional()
    @IsDateString()
    disbursementDate?: string;

    @ApiProperty({ 
        description: 'ID người giải ngân (chọn từ thành viên dự án)', 
        example: 'user123'
    })
    @IsString()
    @IsNotEmpty()
    disbursedByUserId: string;

    @ApiProperty({ 
        description: 'Ghi chú', 
        required: false,
        example: 'Giải ngân đợt 1'
    })
    @IsOptional()
    @IsString()
    notes?: string;
}
