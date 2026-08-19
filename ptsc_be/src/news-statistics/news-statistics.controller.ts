
import { Controller, Get, Query, UseGuards, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NewsStatisticsService } from './news-statistics.service';
import { Public } from 'src/oauth/decorator/public.decorator';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Adjust path if needed or use existing guards

@ApiTags('Thống kê Tin tức')
@Controller('news-statistics')
// @UseGuards(JwtAuthGuard) // Enable if auth is required
// @ApiBearerAuth()
export class NewsStatisticsController {
    constructor(
        private readonly newsStatisticsService: NewsStatisticsService,
        private readonly systemLogService: SystemLogServiceSql
    ) { }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách thống kê tin tức với trạng thái từ Audit' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Tìm kiếm chung' })
    @ApiQuery({ name: 'title', required: false, type: String, description: 'Tìm theo tiêu đề' })
    @ApiQuery({ name: 'topic', required: false, type: String })
    @ApiQuery({ name: 'department', required: false, type: String })
    @ApiQuery({ name: 'authorDepartment', required: false, type: String, description: 'Lọc theo phòng ban của tác giả' })
    @ApiQuery({ name: 'status', required: false, type: String, description: 'Trạng thái xử lý (VD: DA_DUYET, CHO_DUYET, TRA_LAI, HUY_TIN, THU_HOI hoặc "Đã duyệt", "Chờ duyệt"...)' })
    @ApiQuery({ name: 'newsStatus', required: false, type: Number, description: 'Trạng thái bản ghi (0: Nháp, 1: Xuất bản, 2: Lên lịch, 3: Đã xóa)' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiQuery({ name: 'top', required: false, type: Number, description: 'Lấy top tin tức (VD: 10, 20, 30, 50)' })
    @ApiQuery({ name: 'sort', required: false, type: String, description: 'Sắp xếp dạng JSON (VD: {"publishedAt": 1, "viewCount": -1}). 1: ASC, -1: DESC' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Trường sắp xếp (title, authorName, department, authorDepartment, topicName, viewCount, createdAt, publishedAt, submittedAt, likeCount, commentCount, engagementRate)' })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
    async findAll(@Query() query: any, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        try {
            const result = await this.newsStatisticsService.findAll(query, userId, ipAddress);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Thống kê: Truy cập danh sách thống kê tin tức, trang: ${query.page || 1}, limit: ${query.limit || 10}`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_LIST',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi: Thống kê: Truy cập danh sách thống kê tin tức - ${error.message}`,
                method: 'GET',
                status: 'ERROR',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_LIST',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    @Get('summary-by-topic')
    @ApiOperation({ summary: 'Thống kê tổng số Like, Comment, View theo Topic' })
    @ApiQuery({ name: 'topic', required: false, type: String, description: 'Tìm theo tên chủ đề' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Ngày bắt đầu xuất bản' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Ngày kết thúc xuất bản' })
    @ApiQuery({ name: 'sort', required: false, type: String, description: 'Sắp xếp dạng JSON (VD: {"totalNews": -1}). 1: ASC, -1: DESC' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Trường sắp xếp (topicName, totalNews, totalViews, totalComments, totalLikes)' })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
    async getSummaryByTopic(@Query() query: any, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        try {
            const result = await this.newsStatisticsService.getSummaryByTopic(query, userId, ipAddress);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Thống kê: Truy cập thống kê theo chủ đề`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_TOPIC',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi: Thống kê: Truy cập thống kê theo chủ đề - ${error.message}`,
                method: 'GET',
                status: 'ERROR',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_TOPIC',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    @Get('summary-by-department')
    @ApiOperation({ summary: 'Thống kê theo phòng ban (số tin, đã duyệt, chờ duyệt, từ chối, view, tỉ lệ)' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Ngày bắt đầu xuất bản' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Ngày kết thúc xuất bản' })
    @ApiQuery({ name: 'authorDepartment', required: false, type: String, description: 'ID phòng ban của tác giả' })
    @ApiQuery({ name: 'time', required: false, enum: ['month', 'year'], description: 'Lọc theo tháng/năm hiện tại' })
    @ApiQuery({ name: 'sort', required: false, type: String, description: 'Sắp xếp dạng JSON (VD: {"approvalRate": -1}). 1: ASC, -1: DESC' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Trường sắp xếp (departmentName, totalNews, approvedCount, waitingCount, rejectedCount, totalViews, approvalRate)' })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
    async getSummaryByDepartment(@Query() query: any, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        try {
            const result = await this.newsStatisticsService.getSummaryByDepartment(query, userId, ipAddress);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Thống kê: Truy cập thống kê theo phòng ban`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_DEPARTMENT',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi: Thống kê: Truy cập thống kê theo phòng ban - ${error.message}`,
                method: 'GET',
                status: 'ERROR',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_DEPARTMENT',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    // @Public()
    @Get('export')
    @ApiOperation({ summary: 'Xuất danh sách thống kê tin tức ra Excel/PDF' })
    @ApiQuery({ name: 'exportType', required: false, enum: ['excel', 'pdf'], default: 'excel' })
    async exportAll(@Query() query: any, @Res() res: Response, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        const { exportType = 'excel', fileName } = query;

        try {
            const result = await this.newsStatisticsService.exportAll(query, userId, ipAddress, exportType, fileName);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Thống kê: Xuất báo cáo danh sách tin tức (${exportType})`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_EXPORT',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });

            res.setHeader('Content-Type', result.contentType);
            res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(result.filename)}`);
            return res.send(result.buffer);
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi: Thống kê: Xuất báo cáo danh sách tin tức (${exportType}) - ${error.message}`,
                method: 'GET',
                status: 'ERROR',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_EXPORT',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    // @Public()
    @Get('summary-by-topic/export')
    @ApiOperation({ summary: 'Xuất thống kê theo chủ đề ra Excel/PDF' })
    @ApiQuery({ name: 'exportType', required: false, enum: ['excel', 'pdf'], default: 'excel' })
    async exportSummaryByTopic(@Query() query: any, @Res() res: Response, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        const { exportType = 'excel' } = query;

        try {
            const result = await this.newsStatisticsService.exportSummaryByTopic(query, userId, ipAddress, exportType);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Thống kê: Xuất báo cáo theo chủ đề (${exportType})`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_TOPIC_EXPORT',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });

            res.setHeader('Content-Type', result.contentType);
            res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(result.filename)}`);
            return res.send(result.buffer);
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi: Thống kê: Xuất báo cáo theo chủ đề (${exportType}) - ${error.message}`,
                method: 'GET',
                status: 'ERROR',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_TOPIC_EXPORT',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    // @Public()
    @Get('summary-by-department/export')
    @ApiOperation({ summary: 'Xuất thống kê theo phòng ban ra Excel/PDF' })
    @ApiQuery({ name: 'exportType', required: false, enum: ['excel', 'pdf'], default: 'excel' })
    @ApiQuery({ name: 'time', required: false, enum: ['month', 'year'], description: 'Lọc theo tháng/năm hiện tại' })
    async exportSummaryByDepartment(@Query() query: any, @Res() res: Response, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        const { exportType = 'excel' } = query;

        try {
            const result = await this.newsStatisticsService.exportSummaryByDepartment(query, userId, ipAddress, exportType);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Thống kê: Xuất báo cáo theo phòng ban (${exportType})`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_DEPARTMENT_EXPORT',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });

            res.setHeader('Content-Type', result.contentType);
            res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(result.filename)}`);
            return res.send(result.buffer);
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi: Thống kê: Xuất báo cáo theo phòng ban (${exportType}) - ${error.message}`,
                method: 'GET',
                status: 'ERROR',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_DEPARTMENT_EXPORT',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    // --- CÁC BÁO CÁO MỚI (7.1 ĐẾN 7.5) ---

    @Get('time')
    @ApiOperation({ summary: 'Báo cáo 7.1: Thống kê tin tức theo thời gian' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Từ ngày (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Đến ngày (YYYY-MM-DD)' })
    @ApiQuery({ name: 'topicId', required: false, type: String, description: 'Chủ đề ID' })
    @ApiQuery({ name: 'departmentId', required: false, type: String, description: 'Phòng ban đăng ID' })
    @ApiQuery({ name: 'status', required: false, type: Number, description: 'Trạng thái (1: Đã duyệt, 2: Chờ duyệt, 0: Nháp)' })
    async getStatsByTime(@Query() query: any, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        try {
            const result = await this.newsStatisticsService.getStatsByTime(query, userId, ipAddress);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Thống kê: Báo cáo tin tức theo thời gian`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_TIME',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi: Thống kê: Báo cáo tin tức theo thời gian - ${error.message}`,
                method: 'GET',
                status: 'ERROR',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_TIME',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    @Get('top-viewed')
    @ApiOperation({ summary: 'Báo cáo 7.2: Top tin tức được xem nhiều nhất' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Từ ngày' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Đến ngày' })
    @ApiQuery({ name: 'topicId', required: false, type: String, description: 'Chủ đề ID' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Top N tin (mặc định 10)' })
    async getTopViewedNews(@Query() query: any, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        try {
            const result = await this.newsStatisticsService.getTopViewedNews(query, userId, ipAddress);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Thống kê: Báo cáo top tin tức xem nhiều nhất`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_TOP_VIEWED',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi: Thống kê: Báo cáo top tin tức xem nhiều nhất - ${error.message}`,
                method: 'GET',
                status: 'ERROR',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_TOP_VIEWED',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    @Get('topic')
    @ApiOperation({ summary: 'Báo cáo 7.3: Thống kê tin tức theo chủ đề' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Từ ngày' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Đến ngày' })
    async getStatsByTopic(@Query() query: any, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        try {
            const result = await this.newsStatisticsService.getStatsByTopic(query, userId, ipAddress);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Thống kê: Báo cáo tin tức theo chủ đề (7.3)`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_BY_TOPIC',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi: Thống kê: Báo cáo tin tức theo chủ đề (7.3) - ${error.message}`,
                method: 'GET',
                status: 'ERROR',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_BY_TOPIC',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    @Get('workflow')
    @ApiOperation({ summary: 'Báo cáo 7.4: Theo dõi quy trình duyệt tin' })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Từ ngày' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Đến ngày' })
    @ApiQuery({ name: 'departmentId', required: false, type: String, description: 'Phòng ban ID' })
    async getWorkflowStats(@Query() query: any, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        try {
            const result = await this.newsStatisticsService.getWorkflowStats(query, userId, ipAddress);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Thống kê: Báo cáo quy trình duyệt tin (7.4)`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_WORKFLOW',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi: Thống kê: Báo cáo quy trình duyệt tin (7.4) - ${error.message}`,
                method: 'GET',
                status: 'ERROR',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_WORKFLOW',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    @Get('department')
    @ApiOperation({ summary: 'Báo cáo 7.5: Thống kê hoạt động đăng tin theo phòng ban' })
    @ApiQuery({ name: 'month', required: false, type: Number, description: 'Tháng' })
    @ApiQuery({ name: 'year', required: false, type: Number, description: 'Năm' })
    @ApiQuery({ name: 'departmentId', required: false, type: String, description: 'Phòng ban ID' })
    async getStatsByDepartment(@Query() query: any, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        try {
            const result = await this.newsStatisticsService.getStatsByDepartment(query, userId, ipAddress);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Thống kê: Báo cáo đăng tin theo phòng ban (7.5)`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_BY_DEPARTMENT',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi: Thống kê: Báo cáo đăng tin theo phòng ban (7.5) - ${error.message}`,
                method: 'GET',
                status: 'ERROR',
                type: 'NEWS',
                subType: 'NEWS_STATISTICS_BY_DEPARTMENT',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }
}
