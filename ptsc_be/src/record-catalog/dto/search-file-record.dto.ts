import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchFileRecordDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    yearCategoryId?: string;

    @ApiProperty({ required: false, description: 'Lọc theo FolderDetail ID (Level 1)' })
    @IsOptional()
    @IsString()
    folderDetailId?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    keyword?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    status?: string;

    // Pagination if needed
    @ApiProperty({ required: false, default: 1 })
    @IsOptional()
    page?: number;

    @ApiProperty({ required: false, default: 25 })
    @IsOptional()
    limit?: number;

    @ApiProperty({ required: false, enum: ['excel', 'pdf'], description: 'Loại file xuất: excel hoặc pdf' })
    @IsOptional()
    @IsString()
    exportType?: 'excel' | 'pdf';

    @ApiProperty({ required: false })
    @IsOptional()
    filter?: {
        title?: string;
        fileSymbol?: string;
        totalDocuments?: string | number;
        totalFiles?: string | number;
        status?: string;
    };

    @ApiProperty({ required: false })
    @IsOptional()
    sort?: {
        title?: number;
        fileSymbol?: number;
        totalDocuments?: number;
        totalFiles?: number;
        createdAt?: number;
    };
}
