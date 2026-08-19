import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsDateString,
    IsNumber,
} from 'class-validator';

export class UpdateProjectDisbursementDto {
    @ApiProperty({ description: 'Số tiền giải ngân', required: false })
    @IsOptional()
    @IsNumber()
    disbursementAmount?: number;

    @ApiProperty({ description: 'Đơn vị tiền tệ (Hệ số nhân)', required: false })
    @IsOptional()
    @IsNumber()
    moneyUnit?: number;

    @ApiProperty({ 
        description: 'Thời gian giải ngân (ISO format)', 
        required: false
    })
    @IsOptional()
    @IsDateString()
    disbursementDate?: string;

    @ApiProperty({ 
        description: 'ID người giải ngân', 
        required: false
    })
    @IsOptional()
    @IsString()
    disbursedByUserId?: string;

    @ApiProperty({ 
        description: 'Ghi chú', 
        required: false
    })
    @IsOptional()
    @IsString()
    notes?: string;
}
