import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListIncomingDelegationDto {
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

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (Tên đoàn, Trưởng đoàn...)' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Lọc theo trưởng đoàn' })
    @IsOptional()
    @IsString()
    delegationLeader?: string;

    @ApiPropertyOptional({ description: 'Lọc theo trạng thái' })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    status?: number;

    @ApiPropertyOptional({ description: 'Ngày đến từ (yyyy-MM-dd)' })
    @IsOptional()
    @IsString()
    incomingDateFrom?: string;

    @ApiPropertyOptional({ description: 'Ngày đến đến (yyyy-MM-dd)' })
    @IsOptional()
    @IsString()
    incomingDateTo?: string;

    @ApiPropertyOptional({ description: 'Sắp xếp theo trường nào' })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiPropertyOptional({ description: 'Thứ tự sắp xếp (ASC/DESC)' })
    @IsOptional()
    @IsString()
    sortOrder?: 'ASC' | 'DESC';

    // Cho phép nhận thêm các trường lọc động khác
    [key: string]: any;
}
