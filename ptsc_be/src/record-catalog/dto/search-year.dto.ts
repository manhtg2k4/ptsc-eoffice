import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchYearDto {
    @ApiProperty({ required: false })
    @IsOptional()
    keyword?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    filter?: {
        description?: string;
        year?: string | number;
        totalFiles?: string | number;
        totalDocuments?: string | number;
        createdAt?: {
            startDate?: string;
            endDate?: string;
        };
    };

    @ApiProperty({ required: false })
    @IsOptional()
    sort?: {
        year?: number;
        createdAt?: number;
        totalFiles?: number;
        totalDocuments?: number;
    };

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
