import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateYearCategoryDto {
    @ApiProperty({ example: 2026, description: 'Year of the category' })
    @IsInt()
    @Min(1900)
    year: number;

    @ApiProperty({ example: 'Description for year 2026', required: false })
    @IsOptional()
    @IsString()
    description?: string;
}
