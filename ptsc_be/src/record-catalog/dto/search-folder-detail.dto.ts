import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumberString } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchFolderDetailDto {
    @ApiPropertyOptional({ description: 'ID danh mục năm để lọc' })
    @IsOptional()
    @IsString()
    yearCategoryId?: string;

    @ApiPropertyOptional({ description: 'Từ khoá tìm kiếm theo tiêu đề' })
    @IsOptional()
    @IsString()
    keyword?: string;

    @ApiPropertyOptional({ description: 'Trang hiện tại', default: 1 })
    @IsOptional()
    @Transform(({ value }) => Number(value))
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Số bản ghi mỗi trang', default: 25 })
    @IsOptional()
    @Transform(({ value }) => Number(value))
    limit?: number = 25;

    @ApiPropertyOptional({ description: 'Loại file xuất: excel hoặc pdf' })
    @IsOptional()
    @IsString()
    exportType?: 'excel' | 'pdf';

    @ApiPropertyOptional({ description: 'Bộ lọc bổ sung' })
    @IsOptional()
    filter?: {
        title?: string;
        totalDocuments?: string | number;
        totalFiles?: string | number;
    };

    @ApiPropertyOptional({ description: 'Sắp xếp' })
    @IsOptional()
    sort?: {
        title?: number;
        totalDocuments?: number;
        totalFiles?: number;
        createdAt?: number;
    };
}
