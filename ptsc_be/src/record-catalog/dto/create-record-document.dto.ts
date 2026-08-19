import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentStatus } from '../entities/record-document.entity';

export class CreateRecordDocumentDto {
    @ApiProperty({ example: 'VB001/2025', description: 'Số ký hiệu văn bản' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    documentSymbol: string;

    @ApiProperty({ example: 'Về việc triển khai dự án...', description: 'Tiêu đề văn bản' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    documentTitle?: string;

    @ApiProperty({ example: 'file-record-uuid', description: 'ID hồ sơ chứa văn bản này', required: false })
    @IsOptional()
    @IsString()
    fileRecordId?: string;

    @ApiProperty({ example: 'year-category-uuid', description: 'ID danh mục năm' })
    @IsNotEmpty()
    @IsString()
    yearCategoryId: string;

    @ApiProperty({
        enum: DocumentStatus,
        required: false,
        default: DocumentStatus.NOT_OPEN,
        description: 'Trạng thái: 0-Chưa mở, 1-Đã mở, 2-Đã lưu trữ'
    })
    @IsOptional()
    @IsEnum(DocumentStatus)
    status?: DocumentStatus;
}
