import { IsOptional, IsInt, Min, IsString, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO cho submittedAt date range filter
 */
export class DateRangeFilterDto {
    @ApiPropertyOptional({ description: 'Ngày bắt đầu', example: '2026-01-13' })
    @IsOptional()
    @IsString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'Ngày kết thúc', example: '2026-01-14' })
    @IsOptional()
    @IsString()
    endDate?: string;
}

/**
 * DTO cho orFields - tìm kiếm OR trong nhiều trường
 */
export class OrFieldsFilterDto {
    @ApiPropertyOptional({ description: 'Tìm trong title', example: 'abc' })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({ description: 'Tìm trong content', example: 'xyz' })
    @IsOptional()
    @IsString()
    content?: string;

    @ApiPropertyOptional({ description: 'Tìm trong tags', example: 'tag1' })
    @IsOptional()
    @IsString()
    tags?: string;

    @ApiPropertyOptional({ description: 'Tìm trong summary', example: 'summary text' })
    @IsOptional()
    @IsString()
    summary?: string;

    @ApiPropertyOptional({ description: 'Tìm trong slug', example: 'tin-tuc' })
    @IsOptional()
    @IsString()
    slug?: string;

    @ApiPropertyOptional({ description: 'Tìm trong submitterName', example: 'Nguyen Van A' })
    @IsOptional()
    @IsString()
    submitterName?: string;

    @ApiPropertyOptional({ description: 'Tìm trong authorName', example: 'Tran Thi B' })
    @IsOptional()
    @IsString()
    authorName?: string;

    @ApiPropertyOptional({ description: 'Tìm trong rejectorName', example: 'Le Van C' })
    @IsOptional()
    @IsString()
    rejectorName?: string;

    @ApiPropertyOptional({ description: 'Tìm trong reviewerName', example: 'Pham Van D' })
    @IsOptional()
    @IsString()
    reviewerName?: string;

    @ApiPropertyOptional({ description: 'Tìm trong cancellerName', example: 'Hoang Van E' })
    @IsOptional()
    @IsString()
    cancellerName?: string;

    @ApiPropertyOptional({ description: 'Tìm trong recalledByName', example: 'Vo Thi F' })
    @IsOptional()
    @IsString()
    recalledByName?: string;

    @ApiPropertyOptional({ description: 'Tìm trong department', example: 'Phong KT' })
    @IsOptional()
    @IsString()
    department?: string;
}

/**
 * DTO cho filter object: filter[topic], filter[status], etc.
 */
export class NewsFilterDto {
    @ApiPropertyOptional({ description: 'Tìm kiếm tổng quát trong tất cả các trường (OR logic)', example: 'tin tức' })
    @IsOptional()
    @IsString()
    q?: string;

    @ApiPropertyOptional({
        description: 'Tìm kiếm OR trong nhiều trường với giá trị khác nhau',
        type: OrFieldsFilterDto,
        example: { title: 'abc', submitterName: 'xyz' }
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => OrFieldsFilterDto)
    orFields?: OrFieldsFilterDto;

    @ApiPropertyOptional({ description: 'Lọc theo topic', example: 'technology' })
    @IsOptional()
    @IsString()
    topic?: string;

    @ApiPropertyOptional({ description: 'Lọc theo trạng thái', example: '0' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'Lọc theo loại tin', example: 'news' })
    @IsOptional()
    @IsString()
    type?: string;

    @ApiPropertyOptional({ description: 'Lọc theo đơn vị', example: '123' })
    @IsOptional()
    @IsString()
    organizationUnitId?: string;

    @ApiPropertyOptional({ description: 'Lọc theo người tạo', example: 'user123' })
    @IsOptional()
    @IsString()
    createdBy?: string;

    @ApiPropertyOptional({ description: 'Lọc theo tiêu đề tin', example: 'HLV' })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({ description: 'Lọc theo tên người từ chối', example: 'HLV' })
    @IsOptional()
    @IsString()
    rejectorName?: string;

    @ApiPropertyOptional({ description: 'Lọc theo tên người trình', example: 'Nguyen Van A' })
    @IsOptional()
    @IsString()
    submitterName?: string;

    @ApiPropertyOptional({ description: 'Lọc theo tên tác giả', example: 'Tran Thi B' })
    @IsOptional()
    @IsString()
    authorName?: string;

    @ApiPropertyOptional({ description: 'Lọc theo tên người duyệt', example: 'Le Van C' })
    @IsOptional()
    @IsString()
    reviewerName?: string;

    @ApiPropertyOptional({ description: 'Lọc theo lý do thu hồi', example: 'Le Van C' })
    @IsOptional()
    @IsString()
    recallReason?: string;
    @ApiPropertyOptional({ description: 'Lọc theo người thu hồi', example: 'Le Van C' })
    @IsOptional()
    @IsString()
    recalledByName?: string;

    @ApiPropertyOptional({ description: 'Lọc theo người hủy', example: 'Le Van C' })
    @IsOptional()
    @IsString()
    cancellerName?: string;

    @ApiPropertyOptional({ description: 'Lọc theo phòng ban người gửi', example: '68afc3f5cb36081f0bbef552' })
    @IsOptional()
    @IsString()
    department?: string;

    @ApiPropertyOptional({
        description: 'Lọc theo khoảng ngày trình duyệt',
        type: DateRangeFilterDto,
        example: { startDate: '2026-01-13', endDate: '2026-01-14' }
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => DateRangeFilterDto)
    submittedAt?: DateRangeFilterDto;

    @ApiPropertyOptional({
        description: 'Lọc theo khoảng ngày thu hồi',
        type: DateRangeFilterDto,
        example: { startDate: '2026-01-13', endDate: '2026-01-14' }
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => DateRangeFilterDto)
    recalledAt?: DateRangeFilterDto;

    @ApiPropertyOptional({
        description: 'Lọc theo khoảng ngày xuất bản',
        type: DateRangeFilterDto,
        example: { startDate: '2026-01-13', endDate: '2026-01-14' }
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => DateRangeFilterDto)
    publishedAt?: DateRangeFilterDto;

    @ApiPropertyOptional({
        description: 'Lọc theo hạn xử lý (Khoảng ngày {startDate, endDate} hoặc Boolean string "true"/"false")',
        example: { startDate: '2026-01-13', endDate: '2026-01-14' }
    })
    @IsOptional()
    deadline?: any;

    @ApiPropertyOptional({
        description: 'Lọc theo khoảng ngày được duyệt',
        type: DateRangeFilterDto,
        example: { startDate: '2026-01-13', endDate: '2026-01-14' }
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => DateRangeFilterDto)
    approvedAt?: DateRangeFilterDto;
    @ApiPropertyOptional({
        description: 'Lọc theo khoảng ngày xuất bản',
        type: DateRangeFilterDto,
        example: { startDate: '2026-01-13', endDate: '2026-01-14' }
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => DateRangeFilterDto)
    createdAt?: DateRangeFilterDto;

    @ApiPropertyOptional({ description: '[Deprecated] Lọc theo isComment - dùng filter[isComment] thay thế', example: 'true' })
    @IsOptional()
    @IsString()
    isComment?: string;
    @ApiPropertyOptional({ description: '[Deprecated] Lọc theo isComment - dùng filter[isComment] thay thế', example: 'true' })
    @IsOptional()
    @IsString()
    tags?: string;

    @ApiPropertyOptional({ description: 'Lọc tin của tôi (true) hoặc tất cả (false)', example: 'true' })
    @IsOptional()
    @IsString()
    isMyNews?: string;

    @ApiPropertyOptional({ description: 'Lọc theo hạn xử lý: true (quá hạn), false (còn hạn)', example: 'true' })
    @IsOptional()
    @IsString()
    remainingTime?: string;
}

/**
 * DTO cho các API my-list với hỗ trợ filter[key] query params
 * Ví dụ: GET /my-list/drafts?page=1&limit=10&filter[topic]=technology&filter[status]=0
 */
export class QueryMyNewsListDto {
    @ApiPropertyOptional({ description: 'Số trang', example: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Số lượng bản ghi mỗi trang', example: 10, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (title, content, tags)', example: 'tin tức' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description: 'Sort object - hỗ trợ sort[field]=1 hoặc sort[field]=-1',
        example: { createdAt: 1 }
    })
    @IsOptional()
    sort?: Record<string, string | number>;

    @ApiPropertyOptional({
        description: 'Sắp xếp theo trường (ví dụ: createdAt, updatedAt, publishedAt, viewCount)',
        example: 'createdAt'
    })
    @IsOptional()
    @IsString()
    sortBy?: string = 'createdAt';

    @ApiPropertyOptional({
        description: 'Thứ tự sắp xếp',
        example: 'DESC',
        enum: ['ASC', 'DESC']
    })
    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC' = 'DESC';

    @ApiPropertyOptional({
        description: 'Filter object - hỗ trợ filter[topic], filter[status], filter[type], etc.',
        type: NewsFilterDto,
        example: { topic: 'technology', status: '0' }
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => NewsFilterDto)
    filter?: NewsFilterDto;

    // Backward compatibility - vẫn giữ các field cũ
    @ApiPropertyOptional({ description: '[Deprecated] Lọc theo topic - dùng filter[topic] thay thế', example: 'technology' })
    @IsOptional()
    @IsString()
    topic?: string;

    @ApiPropertyOptional({ description: '[Deprecated] Lọc theo trạng thái - dùng filter[status] thay thế', example: '0' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: '[Deprecated] Lọc theo tags - dùng filter[tags] thay thế', example: 'tag1,tag2' })
    @IsOptional()
    @IsString()
    tags?: string;

    @ApiPropertyOptional({ description: '[Deprecated] Lọc theo isComment - dùng filter[isComment] thay thế', example: 'true' })
    @IsOptional()
    @IsString()
    isComment?: string;

    @ApiPropertyOptional({ description: 'Quy trình xử lý hiện tại', example: 'dspdt' })
    @IsOptional()
    @IsString()
    processFn?: string;

    @ApiPropertyOptional({ description: 'Lọc theo hạn xử lý: true (quá hạn), false (còn hạn)', example: 'true' })
    @IsOptional()
    @IsString()
    remainingTime?: string;
}
