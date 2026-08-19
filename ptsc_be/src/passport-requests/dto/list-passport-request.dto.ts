import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListPassportRequestDto {
    @ApiPropertyOptional({ description: 'Trang hiện tại', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Số bản ghi trên mỗi trang', default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 20;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Lọc theo trạng thái' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'Lọc theo loại yêu cầu (user/organization)' })
    @IsOptional()
    @IsString()
    typeRequest?: string;

    @ApiPropertyOptional({ description: 'Sắp xếp, ví dụ: { "createdAt": -1 }' })
    @IsOptional()
    sort?: Record<string, 1 | -1>;

    @ApiPropertyOptional({ description: 'Filter object, ví dụ: { "namePassportRequest": "van" }' })
    @IsOptional()
    filter?: Record<string, any>;

    @ApiPropertyOptional({ description: 'Mã chức năng (FeatureManagement)' })
    @IsOptional()
    @IsString()
    processFn?: string;

    // Backward compatibility
    @IsOptional()
    @IsString()
    sortBy?: string;

    @IsOptional()
    @IsString()
    sortOrder?: 'ASC' | 'DESC';

    @ApiPropertyOptional({ description: 'Ngày mượn từ (yyyy-MM-dd)', example: '2025-01-01' })
    @IsOptional()
    @IsString()
    borrowDateFrom?: string;

    @ApiPropertyOptional({ description: 'Ngày mượn đến (yyyy-MM-dd)', example: '2025-12-31' })
    @IsOptional()
    @IsString()
    borrowDateTo?: string;

    @ApiPropertyOptional({ description: 'Ngày trả từ (yyyy-MM-dd)', example: '2025-01-01' })
    @IsOptional()
    @IsString()
    returnDateFrom?: string;

    @ApiPropertyOptional({ description: 'Ngày trả đến (yyyy-MM-dd)', example: '2025-12-31' })
    @IsOptional()
    @IsString()
    returnDateTo?: string;

    @ApiPropertyOptional({ description: 'Tình trạng hạn trả (valid, expiringSoon, expired)' })
    @IsOptional()
    @IsString()
    returnStatus?: string;
}
