import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListPassportPermissionDto {
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

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (Mã hoặc Phạm vi)' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Bộ lọc bổ sung (Dạng object hoặc array)' })
    @IsOptional()
    filter?: any;
}
