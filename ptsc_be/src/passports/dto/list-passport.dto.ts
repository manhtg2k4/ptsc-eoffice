import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { IsPagedLimit } from '../../utils/pagination.validator';

/**
 * DTO cho API danh sách hộ chiếu
 * Pattern giống ListAmenitiesDto + IncomingStatisticsByTimeDto
 */
export class ListPassportDto {
    @ApiPropertyOptional({ description: 'Trang hiện tại', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Số bản ghi trên mỗi trang', default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsPagedLimit({ message: 'Limit phải là số nguyên trong khoảng [1, 100].' })
    limit?: number = 20;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm' })
    @IsOptional()
    @IsString()
    q?: string;

    @ApiPropertyOptional({
        description: 'Các trường áp dụng tìm kiếm, dạng chuỗi phân tách dấu phẩy. VD: "all" | "fullName,passportNumber"',
    })
    @IsOptional()
    @IsString()
    searchFields?: string;

    @ApiPropertyOptional({ description: 'Filter object' })
    @IsOptional()
    filter?: Record<string, any>;

    @ApiPropertyOptional({
        description: 'Tab lọc theo trạng thái sử dụng',
        default: 'all',
    })
    @IsOptional()
    @IsString()
    @IsIn(['all', 'dang_luu_tru', 'dang_su_dung'], {
        message: 'Tab phải là: all, dang_luu_tru, dang_su_dung',
    })
    tab?: string = 'all';

    @ApiPropertyOptional({
        description: 'Sắp xếp kết quả, ví dụ: {"createdAt":-1}',
    })
    @IsOptional()
    sort?: Record<string, 1 | -1>;

    @ApiPropertyOptional({ description: 'Mã chức năng (FeatureManagement)' })
    @IsOptional()
    @IsString()
    processFn?: string;
}
