import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsInt } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ProjectSummaryFilterDto {
    @ApiPropertyOptional({ description: 'Sort object, ví dụ: {"projectCode":1}' })
    @IsOptional()
    sort?: any;

    @ApiPropertyOptional({ description: 'Trạng thái dự án (1: Chuẩn bị, 2: Đang thực hiện, 3: Hoàn thành, 4: Hủy, 5: Tạm dừng)' })
    @IsOptional()
    @Transform(({ value }) => {
        if (!value) return undefined;
        return Array.isArray(value) ? value : [value];
    })
    @IsString({ each: true })
    projectStatus?: string[];

    @ApiPropertyOptional({ description: 'Trạng thái dự án (Fallback từ FE)', type: [String] })
    @IsOptional()
    @Transform(({ value }) => {
        if (!value) return undefined;
        return Array.isArray(value) ? value : [value];
    })
    @IsString({ each: true })
    processStatus?: string[];

    @ApiPropertyOptional({ description: 'ID phòng ban phụ trách' })
    @IsOptional()
    @IsString()
    departmentId?: string;

    @ApiPropertyOptional({ description: 'Năm dự án' })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    year?: number;

    @ApiPropertyOptional({ description: 'ID Quản lý dự án (PM)', type: [String] })
    @IsOptional()
    @Transform(({ value }) => {
        if (!value) return undefined;
        return Array.isArray(value) ? value : [value];
    })
    @IsString({ each: true })
    managerId?: string[];
}

export class ProjectSummaryQueryDto {
    @IsOptional()
    @Type(() => ProjectSummaryFilterDto)
    filter?: ProjectSummaryFilterDto;

    @ApiPropertyOptional({ description: 'Sort object, ví dụ: {"projectCode":1}' })
    @IsOptional()
    sort?: any;
}

export class ProjectTasksFilterDto {
    @ApiPropertyOptional({ description: 'Sort object, ví dụ: {"taskName":-1}' })
    @IsOptional()
    sort?: any;

    @ApiPropertyOptional({ description: 'ID dự án' })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    projectId?: number;

    @ApiPropertyOptional({ description: 'Mã dự án' })
    @IsOptional()
    @IsString()
    projectCode?: string;

    @ApiPropertyOptional({ description: 'Trạng thái xử lý (1: Công việc mới, 2: Đang thực hiện, 3: Chờ phê duyệt, 4: Hoàn thành, 8: Huỷ)', type: [String] })
    @IsOptional()
    @Transform(({ value }) => {
        if (!value) return undefined;
        return Array.isArray(value) ? value : [value];
    })
    @IsString({ each: true })
    processStatus?: string[];

    @ApiPropertyOptional({ description: 'ID người phụ trách', type: [String] })
    @IsOptional()
    @Transform(({ value }) => {
        if (!value) return undefined;
        return Array.isArray(value) ? value : [value];
    })
    @IsString({ each: true })
    assigneeId?: string[];

    @ApiPropertyOptional({ description: 'ID Quản lý dự án (PM)', type: [String] })
    @IsOptional()
    @Transform(({ value }) => {
        if (!value) return undefined;
        return Array.isArray(value) ? value : [value];
    })
    @IsString({ each: true })
    managerId?: string[];

    @ApiPropertyOptional({ description: 'Trạng thái công việc' })
    @IsOptional()
    @IsString()
    taskStatus?: string;
}

export class ProjectTasksQueryDto {
    @IsOptional()
    @Type(() => ProjectTasksFilterDto)
    filter?: ProjectTasksFilterDto;

    @ApiPropertyOptional({ description: 'Sort object, ví dụ: {"taskName":-1}' })
    @IsOptional()
    sort?: any;
}

export class ProjectPerformanceFilterDto {
    @ApiPropertyOptional({ description: 'Sort object, ví dụ: {"memberName":1}' })
    @IsOptional()
    sort?: any;

    @ApiPropertyOptional({ description: 'ID dự án' })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    projectId?: number;

    @ApiPropertyOptional({ description: 'Mã dự án' })
    @IsOptional()
    @IsString()
    projectCode?: string;

    @ApiPropertyOptional({ description: 'Từ ngày (DD/MM/YYYY)' })
    @IsOptional()
    @IsString()
    fromDate?: string;

    @ApiPropertyOptional({ description: 'Đến ngày (DD/MM/YYYY)' })
    @IsOptional()
    @IsString()
    toDate?: string;

    @ApiPropertyOptional({ description: 'ID người phụ trách', type: [String] })
    @IsOptional()
    @Transform(({ value }) => {
        if (!value) return undefined;
        return Array.isArray(value) ? value : [value];
    })
    @IsString({ each: true })
    assigneeId?: string[];

    @ApiPropertyOptional({ description: 'ID Quản lý dự án (PM)', type: [String] })
    @IsOptional()
    @Transform(({ value }) => {
        if (!value) return undefined;
        return Array.isArray(value) ? value : [value];
    })
    @IsString({ each: true })
    managerId?: string[];

    @ApiPropertyOptional({ description: 'Trạng thái xử lý (1: Công việc mới, 2: Đang thực hiện, 3: Chờ phê duyệt, 4: Hoàn thành, 8: Huỷ)', type: [String] })
    @IsOptional()
    @Transform(({ value }) => {
        if (!value) return undefined;
        return Array.isArray(value) ? value : [value];
    })
    @IsString({ each: true })
    processStatus?: string[];
}

export class ProjectPerformanceQueryDto {
    @IsOptional()
    @Type(() => ProjectPerformanceFilterDto)
    filter?: ProjectPerformanceFilterDto;

    @ApiPropertyOptional({ description: 'Sort object, ví dụ: {"memberName":1}' })
    @IsOptional()
    sort?: any;
}
