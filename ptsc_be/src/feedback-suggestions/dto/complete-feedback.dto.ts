import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class CompleteFeedbackDto {
    @IsNotEmpty({ message: 'Kết quả xử lý không được để trống' })
    @IsString()
    result: string;

    @IsOptional()
    @IsString()
    overdueReason?: string; // Lý do quá hạn (nếu có)

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsArray()
    resultFiles?: any[]; // File minh chứng kết quả
}
