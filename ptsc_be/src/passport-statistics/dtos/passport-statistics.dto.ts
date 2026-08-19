import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class BaseQueryDto {
    @ApiPropertyOptional({ description: 'Trang', default: 1 })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    page?: number;

    @ApiPropertyOptional({ description: 'Số lượng bản ghi trên trang', default: 10 })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    limit?: number;
}

export class PassportManagedFilterDto {
    @ApiPropertyOptional({ description: 'ID phòng ban' })
    @IsOptional()
    @IsString()
    departmentId?: string;

    @ApiPropertyOptional({ description: 'Trạng thái (STORING, IN_USE, ...)' })
    @IsOptional()
    @IsString()
    usageStatus?: string;

    @ApiPropertyOptional({ description: 'Thời hạn còn lại (tháng)' })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    remainingMonths?: number;

    @ApiPropertyOptional({ description: 'Thời hạn còn lại (ngày)' })
    @IsOptional()
    _remainingDays?: any;

    @ApiPropertyOptional({ description: 'Từ ngày hết hạn (DD/MM/YYYY)' })
    @IsOptional()
    @IsString()
    fromDate?: string;

    @ApiPropertyOptional({ description: 'Đến ngày hết hạn (DD/MM/YYYY)' })
    @IsOptional()
    @IsString()
    toDate?: string;
}

export class PassportManagedQueryDto extends BaseQueryDto {
    @IsOptional()
    @Type(() => PassportManagedFilterDto)
    filter?: PassportManagedFilterDto;
}

export class PassportHistoryFilterDto {
    @ApiPropertyOptional({ description: 'Từ ngày (DD/MM/YYYY)' })
    @IsOptional()
    @IsString()
    fromDate?: string;

    @ApiPropertyOptional({ description: 'Đến ngày (DD/MM/YYYY)' })
    @IsOptional()
    @IsString()
    toDate?: string;

    @ApiPropertyOptional({ description: 'Dải ngày mượn (object {startDate, endDate})' })
    @IsOptional()
    borrowDate?: any;

    @ApiPropertyOptional({ description: 'ID người mượn' })
    @IsOptional()
    @IsString()
    borrowerId?: string;

    @ApiPropertyOptional({ description: 'Trạng thái' })
    @IsOptional()
    @IsString()
    status?: string;
}

export class PassportHistoryQueryDto extends BaseQueryDto {
    @IsOptional()
    @Type(() => PassportHistoryFilterDto)
    filter?: PassportHistoryFilterDto;
}

export class PassportDeptStatsFilterDto {
    @ApiPropertyOptional({ description: 'ID phòng ban' })
    @IsOptional()
    @IsString()
    departmentId?: string;

    @ApiPropertyOptional({ description: 'Trạng thái' })
    @IsOptional()
    @IsString()
    status?: string;
}

export class PassportDeptStatsQueryDto extends BaseQueryDto {
    @IsOptional()
    @Type(() => PassportDeptStatsFilterDto)
    filter?: PassportDeptStatsFilterDto;
}

export class BusinessTripFilterDto {
    @ApiPropertyOptional({ description: 'Từ ngày (DD/MM/YYYY)' })
    @IsOptional()
    @IsString()
    fromDate?: string;

    @ApiPropertyOptional({ description: 'Đến ngày (DD/MM/YYYY)' })
    @IsOptional()
    @IsString()
    toDate?: string;

    @ApiPropertyOptional({ description: 'Quốc gia' })
    @IsOptional()
    @IsString()
    destination?: string;

    @ApiPropertyOptional({ description: 'Phòng ban' })
    @IsOptional()
    @IsString()
    departmentId?: string;

    @ApiPropertyOptional({ description: 'ID người đi công tác' })
    @IsOptional()
    @IsString()
    fullName?: string;
}

export class BusinessTripQueryDto extends BaseQueryDto {
    @IsOptional()
    @Type(() => BusinessTripFilterDto)
    filter?: BusinessTripFilterDto;
}
