// get-pending-feedback.dto.ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, IsString, IsIn } from 'class-validator';

export class GetPendingFeedbackDto {
    @IsOptional()
    @Type(() => Number)     // ← BẮT BUỘC PHẢI CÓ DÒNG NÀY
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)     // ← VÀ DÒNG NÀY
    @IsInt()
    @Min(1)
    limit?: number = 20;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsIn(['all', 'outgoing', 'incoming'])
    type?: 'all' | 'outgoing' | 'incoming' = 'all';

    @IsOptional()
    @IsIn(['newest', 'oldest'])
    sort?: 'newest' | 'oldest' = 'newest';
}