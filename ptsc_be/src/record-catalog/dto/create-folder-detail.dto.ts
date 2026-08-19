import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateFolderDetailDto {
    @ApiProperty({ description: 'Tiêu đề mục hồ sơ', example: 'HỒ SƠ CỦA BINH ĐOÀN' })
    @IsString()
    @IsNotEmpty({ message: 'Tên đề mục hồ sơ không được để trống' })
    @MaxLength(500)
    title: string;

    @ApiProperty({ description: 'ID danh mục năm', example: 'uuid-year-category' })
    @IsString()
    @IsNotEmpty({ message: 'yearCategoryId không được để trống' })
    yearCategoryId: string;
}
