import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DocumentStatus } from '../entities/record-document.entity';

export class SearchRecordDocumentDto {
    @ApiProperty({ required: false, description: 'ID hồ sơ để lọc văn bản' })
    @IsOptional()
    @IsString()
    fileRecordId?: string;

    @ApiProperty({ required: false, description: 'ID danh mục năm' })
    @IsOptional()
    @IsString()
    yearCategoryId?: string;

    @ApiProperty({ required: false, description: 'Tìm theo số ký hiệu hoặc tiêu đề' })
    @IsOptional()
    @IsString()
    keyword?: string;

    @ApiProperty({
        enum: DocumentStatus,
        required: false,
        description: 'Lọc theo trạng thái: 0-Chưa mở, 1-Đã mở, 2-Đã lưu trữ'
    })
    @IsOptional()
    @IsEnum(DocumentStatus)
    status?: DocumentStatus;

    @ApiProperty({ required: false })
    @IsOptional()
    filter?: {
        documentTitle?: string;
        documentSymbol?: string;
        createdAt?: {
            startDate?: string;
            endDate?: string;
        };
        status?: DocumentStatus;
    };

    @ApiProperty({ required: false })
    @IsOptional()
    sort?: {
        documentSymbol?: number;
        documentTitle?: number;
        createdAt?: number;
    };

    @ApiProperty({ required: false, enum: ['excel', 'pdf'], description: 'Loại file xuất: excel hoặc pdf' })
    @IsOptional()
    @IsString()
    exportType?: 'excel' | 'pdf';

    @ApiProperty({ required: false, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiProperty({ required: false, default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}
