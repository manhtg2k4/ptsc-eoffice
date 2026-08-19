import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsObject, IsOptional } from "class-validator";
import { IsValidDateRangeFilter, IsValidSort } from "src/documents/dto/list-type.map";

export class StatisticProcessSignQueryDto {

    @ApiPropertyOptional({ description: 'Filter object' })
    @IsOptional()
    @IsObject()
    @IsValidDateRangeFilter()
    filter?: Record<string, any>;

    @ApiPropertyOptional({
        description: 'Sắp xếp kết quả, ví dụ: {"userDeadline":1}',
    })
    @IsOptional()
    @IsValidSort()
    sort?: Record<string, any>;

    @ApiPropertyOptional({
        description: 'Trang hiện tại',
        example: 1,
        default: 1,
    })
    @IsOptional()
    page?: number;

    @ApiPropertyOptional({
        description: 'Số lượng bản ghi mỗi trang',
        example: 20,
        default: 20,
    })
    @IsOptional()
    limit?: number;

    @ApiPropertyOptional({
        description: 'Loại văn bản',
        example: 'Công văn',
    })
    @IsOptional()
    typeDoc?: string;

    @ApiPropertyOptional({
        description: 'Tùy chọn tải về báo cáo',
    })
    @IsOptional()
    isExport?: string;

    @ApiPropertyOptional({
        description: 'Tùy chọn chỉ lấy số lượng',
    })
    @IsOptional()
    countOnly?: string;
}