import { Controller, Get, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { FeedbackSuggestionsReportService } from './feedback-suggestions-report.service';
import { FeedbackReportFilterDto, FeedbackTypeReportFilterDto, FeedbackUnitReportFilterDto, FeedbackOverdueReportFilterDto, FeedbackSatisfactionReportFilterDto } from './dto/report-filters.dto';
import { JwtAuthGuard } from '../oauth/jwt.guard';
import { AdminGuard } from '../users/guards/admin.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('feedback-suggestions-reports')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard, AdminGuard)
@Controller('feedback-suggestions/reports')
export class FeedbackSuggestionsReportController {
    constructor(private readonly reportService: FeedbackSuggestionsReportService) { }

    @ApiOperation({ summary: 'BÁO CÁO 10.1: DANH SÁCH PHẢN ÁNH, KIẾN NGHỊ THEO THỜI GIAN' })
    @Get('list-by-time')
    async getListByTime(@Query() filters: FeedbackReportFilterDto, @Req() req: Request) {
        const userId = (req as any)?.user?.userId || '';
        const canAccess = await this.reportService.canAccessListByTimeReport(userId);
        if (!canAccess) {
            throw new ForbiddenException('Bạn không có quyền xuất báo cáo này');
        }
        return this.reportService.getListReport(filters, userId);
    }

    @ApiOperation({ summary: 'BÁO CÁO 10.2: THỐNG KÊ PHẢN ÁNH THEO LOẠI' })
    @Get('statistics-by-type')
    async getStatisticsByType(@Query() filters: FeedbackTypeReportFilterDto, @Req() req: Request) {
        const userId = (req as any)?.user?.userId || '';
        return this.reportService.getTypeStatisticsReport(filters, userId);
    }

    @ApiOperation({ summary: 'BÁO CÁO 10.3: DANH SÁCH PHẢN ÁNH QUÁ HẠN XỬ LÝ' })
    @Get('overdue-list')
    async getOverdueList(@Query() filters: FeedbackOverdueReportFilterDto, @Req() req: Request) {
        const userId = (req as any)?.user?.userId || '';
        return this.reportService.getOverdueListReport(filters, userId);
    }

    @ApiOperation({ summary: 'BÁO CÁO 10.4: THỐNG KÊ PHẢN ÁNH THEO ĐƠN VỊ XỬ LÝ' })
    @Get('statistics-by-unit')
    async getStatisticsByUnit(@Query() filters: FeedbackUnitReportFilterDto, @Req() req: Request) {
        const userId = (req as any)?.user?.userId || '';
        return this.reportService.getUnitStatisticsReport(filters, userId);
    }

    @ApiOperation({ summary: 'BÁO CÁO 10.5: ĐÁNH GIÁ MỨC ĐỘ HÀI LÒNG' })
    @Get('satisfaction-evaluation')
    async getSatisfactionEvaluation(@Query() filters: FeedbackSatisfactionReportFilterDto, @Req() req: Request) {
        const userId = (req as any)?.user?.userId || '';
        return this.reportService.getSatisfactionReport(filters, userId);
    }
}
