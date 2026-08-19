import { IsInt, IsOptional, IsString, Min, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchDocumentProfileDto {
    @ApiProperty({ required: false, description: 'Từ khóa tìm kiếm' })
    @IsOptional()
    @IsString()
    keyword?: string;

    @ApiProperty({ required: false, description: 'Các cột cần tìm kiếm', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    searchColumns?: string[];

    @ApiProperty({ required: false })
    @IsOptional()
    filter?: Record<string, any>;

    @ApiProperty({ required: false })
    @IsOptional()
    sort?: Record<string, 1 | -1>;

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
