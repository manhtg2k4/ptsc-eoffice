import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListFeedbackSuggestionDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @IsOptional()
    @IsString()
    q?: string; // Tìm kiếm tổng quát

    @IsOptional()
    @IsString()
    search?: string; // Tương đương q (legacy)

    @IsOptional()
    @IsString()
    keyword?: string; // Tương đương q (legacy)

    @IsOptional()
    @IsString()
    name?: string; // Tìm kiếm theo tiêu đề (title)

    @IsOptional()
    @IsString()
    code?: string; // Tìm kiếm theo mã (code)

    @IsOptional()
    orFields?: any; // Tìm kiếm OR theo nhiều fields

    @IsOptional()
    filter?: any; // Bộ lọc nâng cao (JSON hoặc object)

    @IsOptional()
    @IsString()
    processFn?: string; // Mã chức năng cấu hình lọc trong DB

    @IsOptional()
    @IsString()
    types?: string;

    @IsOptional()
    @IsString()
    priority?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    processStatus?: number; // Lọc processStatus (1-5)

    @IsOptional()
    @IsString({ each: true })
    actionCodes?: string[];

    @IsOptional()
    @IsString()
    unitId?: string;

    @IsOptional()
    @IsString()
    processorId?: string;

    @IsOptional()
    @IsString()
    createdByUnitId?: string;

    @IsOptional()
    @IsString()
    startDate?: string; // Ngày tạo từ

    @IsOptional()
    @IsString()
    endDate?: string; // Ngày tạo đến

    @IsOptional()
    @IsString()
    deadlineStart?: string; // Hạn xử lý từ

    @IsOptional()
    @IsString()
    deadlineEnd?: string; // Hạn xử lý đến

    @IsOptional()
    @IsString()
    sortBy?: string = 'createdAt'; // createdAt | deadline | priority | processStatus | title

    @IsOptional()
    @IsString()
    order?: 'ASC' | 'DESC' = 'DESC';

    @IsOptional()
    @IsString()
    createdById?: string;

    @IsOptional()
    sort?: any;
}
