import { Controller, Get, Query, UseGuards, InternalServerErrorException, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectStatisticsService } from './project-statistics.service';
import { ProjectPerformanceQueryDto, ProjectSummaryQueryDto, ProjectTasksQueryDto } from './dtos/project-statistics.dto';
import { JwtAuthGuard } from '../oauth/jwt.guard';
import { SystemLogServiceSql } from '../systemLogManagement/system-log-service-sql';

@ApiTags('Project Statistics - Báo cáo Dự án')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('project-statistics')
export class ProjectStatisticsController {
    constructor(
        private readonly statisticsService: ProjectStatisticsService,
        private readonly systemLogService: SystemLogServiceSql,
    ) { }

    @Get('summary')
    @ApiOperation({ summary: 'Báo cáo 5.1: Tổng hợp tình trạng dự án' })
    async getProjectSummary(@Query() query: ProjectSummaryQueryDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        try {
            const result = await this.statisticsService.getProjectSummary(query, userId, ipAddress);

            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: 'Xem báo cáo tổng hợp tình trạng dự án',
                method: 'GET',
                status: 'SUCCESS',
                type: 'PROJECT_STATISTICS',
                subType: 'PROJECT_STATISTICS_SUMMARY_CONTROLLER',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });

            return result;
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi khi xem báo cáo dự án: ${error.message}`,
                method: 'GET',
                status: 'FAILURE',
                type: 'PROJECT_STATISTICS',
                subType: 'PROJECT_STATISTICS_SUMMARY_CONTROLLER',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    @Get('tasks')
    @ApiOperation({ summary: 'Báo cáo 5.2: Tiến độ công việc theo dự án' })
    async getProjectTasks(@Query() query: ProjectTasksQueryDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        try {
            const result = await this.statisticsService.getProjectTasks(query, userId, ipAddress);

            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Xem báo cáo tiến độ công việc dự án ID: ${query.filter?.projectId || '-'}`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'PROJECT_STATISTICS',
                subType: 'PROJECT_STATISTICS_TASKS_CONTROLLER',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });

            return result;
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi khi xem báo cáo tiến độ công việc: ${error.message}`,
                method: 'GET',
                status: 'FAILURE',
                type: 'PROJECT_STATISTICS',
                subType: 'PROJECT_STATISTICS_TASKS_CONTROLLER',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    @Get('performance')
    @ApiOperation({ summary: 'Báo cáo 5.3: Thống kê hiệu suất thành viên dự án' })
    async getMemberPerformance(@Query() query: ProjectPerformanceQueryDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        try {
            const result = await this.statisticsService.getMemberPerformance(query, userId, ipAddress);

            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Xem báo cáo hiệu suất thành viên dự án ID: ${query.filter?.projectId || '-'}`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'PROJECT_STATISTICS',
                subType: 'PROJECT_STATISTICS_PERFORMANCE_CONTROLLER',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });

            return result;
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi khi xem báo cáo hiệu suất thành viên: ${error.message}`,
                method: 'GET',
                status: 'FAILURE',
                type: 'PROJECT_STATISTICS',
                subType: 'PROJECT_STATISTICS_PERFORMANCE_CONTROLLER',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
}
