import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ProjectStatisticsQueryDto {
    @ApiProperty({ description: 'ID dự án' })
    @IsNumber()
    @IsNotEmpty()
    projectId: number;

    @ApiPropertyOptional({ description: 'Từ ngày' })
    @IsOptional()
    @IsString()
    fromDate?: string;

    @ApiPropertyOptional({ description: 'Đến ngày' })
    @IsOptional()
    @IsString()
    toDate?: string;

    @ApiPropertyOptional({ description: 'Tìm kiếm thành viên' })
    @IsOptional()
    @IsString()
    memberSearch?: string;
}

export class ProjectOverviewStatisticsDto {
    totalTasks: number;
    completedTasks: number;
    onTimeTasks: number;
    overdueTasks: number;
    progressPercentage: number;
}

export class TaskStatusDistributionDto {
    status: string;
    count: number;
    percentage: number;
    color?: string;
}

export class MemberStatisticsDto {
    userId: string;
    userName: string;
    userCode: string;
    position?: string;
    totalAssigned: number;
    mainProcess: number;
    coordinate: number;
    completed: number;
    overdue: number;
}
