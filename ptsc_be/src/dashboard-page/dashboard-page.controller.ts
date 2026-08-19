/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, Get, Param, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardPageNormalService } from './dashboard-page-normal.service';
import { DashboardPageMediumService } from './dashboard-page-medium.service';
import { DashboardPagePremiumService } from './dashboard-page-premium.service';
import { ListTaskDto } from '../task/dto/list-task.dto';
import { ListDocumentsDto } from '../documents/dto/list-documents.dto';



@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardPageController {
  constructor(
    private readonly dashboardPageNormalService: DashboardPageNormalService,
    private readonly dashboardPageMediumService: DashboardPageMediumService,
    private readonly dashboardPagePremiumService: DashboardPagePremiumService,
  ) { }

  // Hàm xử lý chung để luôn trả về 200 với cấu trúc dữ liệu thống nhất
  private async handleResponse(fn: () => any | Promise<any>, defaultData: any) {
    try {
      const data = await fn();
      return {
        success: true,
        data: data ?? defaultData,
        message: 'OK',
      };
    } catch (error: any) {
      return {
        success: false,
        data: defaultData,
        message: error?.message || 'Có lỗi xảy ra',
      };
    }
  }

  @Get(':type/stats')
  @ApiOperation({ summary: 'Lấy chỉ số thống kê tổng hợp theo loại (normal, medium, premium)' })
  @ApiParam({ name: 'type', description: 'Loại thống kê', enum: ['normal', 'medium', 'premium'] })
  @ApiResponse({ status: 200, description: 'Lấy thống kê thành công' })
  async getStats(
    @Param('type') type: string,
    @Req() req: any
  ) {
    const userId = req.user.userId;
    switch (type) {
      case 'normal':
        return this.handleResponse(
          () => this.dashboardPageNormalService.getStatsNormal(userId),
          {},
        );

      case 'medium':

        return this.handleResponse(
          () => this.dashboardPageMediumService.getStatsMedium(userId),
          {},
        );

      case 'premium':
        return this.handleResponse(
          () => this.dashboardPagePremiumService.getStatsPremium(userId),
          {},
        );

      default:
        return {
          success: false,
          data: {},
          message: 'Invalid type',
        };
    }
  }

  @Get('premium/company-tasks')
  @ApiOperation({ summary: 'Dashboard Premium: Danh sách công việc toàn công ty trong tháng' })
  async getPremiumCompanyTasks(
    @Query() queryParams: ListTaskDto,
    @Req() req: any
  ) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPagePremiumService.getCompanyTasks(userId, queryParams),
      { data: [], total: 0 }
    );
  }

  @Get('premium/company-documents')
  @ApiOperation({ summary: 'Dashboard Premium: Danh sách văn bản toàn công ty trong tháng' })
  async getPremiumCompanyDocuments(
    @Query() queryParams: any,
    @Req() req: any
  ) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPagePremiumService.getCompanyDocuments(userId, queryParams),
      { data: [], total: 0 }
    );
  }

  @Get('normal/incoming-documents-list')
  @ApiOperation({ summary: 'Dashboard Normal: Danh sách Văn bản đến của Cán bộ (Popup Văn bản đến)' })
  async getNormalIncomingDocumentsList(
    @Query() queryParams: any,
    @Req() req: any
  ) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPageNormalService.getNormalIncomingDocumentsList(userId, queryParams),
      { data: [], total: 0 }
    );
  }

  @Get('normal/outgoing-documents-list')
  @ApiOperation({ summary: 'Dashboard Normal: Danh sách Văn bản đi của Cán bộ (Popup Văn bản đi)' })
  async getNormalOutgoingDocumentsList(
    @Query() queryParams: any,
    @Req() req: any
  ) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPageNormalService.getNormalOutgoingDocumentsList(userId, queryParams),
      { data: [], total: 0 }
    );
  }

  @Get('normal/tasks-list')
  @ApiOperation({ summary: 'Dashboard Normal: Danh sách Công việc của Cán bộ (Popup Công việc)' })
  async getNormalTasksList(
    @Query() queryParams: any,
    @Req() req: any
  ) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPageNormalService.getNormalTasksList(userId, queryParams),
      { data: [], total: 0 }
    );
  }

  @Get('normal/projects')
  @ApiOperation({ summary: 'Dashboard Normal: Danh sách dự án' })
  async getNormalProjects(
    @Req() req: any
  ) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPageNormalService.getNormalProjects(userId),
      [],
    );
  }

  @Get('normal/quickActions')
  @ApiOperation({ summary: 'Dashboard Normal: Hành động nhanh' })
  async getNormalQuickActions(
    @Req() req: any
  ) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPageNormalService.getNormalQuickActions(userId),
      [],
    );
  }

  @Get('normal/meetings')
  @ApiOperation({ summary: 'Dashboard Normal: Lịch họp' })
  async getNormalMeetings(
    @Req() req: any
  ) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPageNormalService.getNormalMeetings(userId),
      [],
    );
  }

  @Get('normal/events')
  @ApiOperation({ summary: 'Dashboard Normal: Sự kiện' })
  async getNormalEvents() {
    return this.handleResponse(
      () => this.dashboardPageNormalService.getNormalEvents(),
      [],
    );
  }

  @Get('normal/news')
  @ApiOperation({ summary: 'Dashboard Normal: Tin tức' })
  async getNormalNews() {
    return this.handleResponse(
      () => this.dashboardPageNormalService.getNormalNews(),
      [],
    );
  }

  @Get('medium/alerts')
  @ApiOperation({ summary: 'Dashboard Medium: Cảnh báo' })
  async getMediumAlerts(@Req() req: any) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPageMediumService.getMediumAlerts(userId),
      [],
    );
  }

  @Get('medium/employeeStatus')
  @ApiOperation({ summary: 'Dashboard Medium: Trạng thái nhân sự' })
  async getMediumEmployeeStatus(@Req() req: any) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPageMediumService.getMediumEmployeeStatus(userId),
      [],
    );
  }

  @Get('medium/approvals')
  @ApiOperation({ summary: 'Dashboard Medium: Phê duyệt (Tổng quan)' })
  async getMediumApprovals(@Req() req: any) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPageMediumService.getMediumApprovalsOverview(userId),
      {},
    );
  }

  @Get('medium/approvals-list')
  @ApiOperation({ summary: 'Dashboard Medium: Phê duyệt (Danh sách phân trang)' })
  async getMediumApprovalsList(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const userId = req.user.userId;
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    return this.handleResponse(
      () => this.dashboardPageMediumService.getMediumApprovalsList(userId, pageNum, limitNum),
      { total: 0, list: [], page: pageNum, limit: limitNum },
    );
  }

  @Get('medium/tasks-room-list')
  @ApiOperation({ summary: 'Dashboard Medium: Danh sách công việc phòng ban (Popup Công việc phòng)' })
  async getMediumTasksRoomList(
    @Query() queryParams: ListTaskDto & { filter?: string },
    @Req() req: any
  ) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPageMediumService.getMediumTasksRoomList(userId, queryParams),
      { data: [], total: 0 }
    );
  }

  @Get('medium/documents-list')
  @ApiOperation({ summary: 'Dashboard Medium: Danh sách Văn bản phòng ban (Popup Văn bản tháng này)' })
  async getMediumDocumentsList(
    @Query() queryParams: any,
    @Req() req: any
  ) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPageMediumService.getMediumDocumentsList(userId, queryParams),
      { data: [], total: 0 }
    );
  }

  @Get('medium/documents')
  @ApiOperation({ summary: 'Dashboard Medium: Hồ sơ/Văn bản' })
  async getMediumDocuments(@Req() req: any) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPageMediumService.getMediumDocuments(userId),
      [],
    );
  }

  @Get('medium/heatmap')
  @ApiOperation({ summary: 'Dashboard Medium: Biểu đồ Heatmap' })
  async getMediumHeatmap(@Req() req: any) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPageMediumService.getMediumHeatmap(userId),
      [],
    );
  }

  @Get('medium/projects')
  @ApiOperation({ summary: 'Dashboard Medium: Dự án' })
  async getMediumProjects(@Req() req: any) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPageMediumService.getMediumProjects(userId),
      [],
    );
  }

  @Get('medium/meetings')
  @ApiOperation({ summary: 'Dashboard Medium: Lịch họp' })
  async getMediumMeetings(@Req() req: any) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPageMediumService.getMediumMeetings(userId),
      [],
    );
  }

  @Get('medium/upcomingEvents')
  @ApiOperation({ summary: 'Dashboard Medium: Sự kiện sắp tới' })
  async getMediumUpcomingEvents() {
    return this.handleResponse(
      () => this.dashboardPageMediumService.getMediumUpcomingEvents(),
      [],
    );
  }

  @Get('medium/utilityRequests')
  @ApiOperation({ summary: 'Dashboard Medium: Yêu cầu tiện ích' })
  async getMediumUtilityRequests(@Req() req: any) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPageMediumService.getMediumUtilityRequests(userId),
      [],
    );
  }

  @Get('medium/news')
  @ApiOperation({ summary: 'Dashboard Medium: Tin tức' })
  async getMediumNews() {
    return this.handleResponse(
      () => this.dashboardPageMediumService.getMediumNews(),
      [],
    );
  }

  @Get('premium/notificationsText')
  @ApiOperation({ summary: 'Dashboard Premium: Văn bản thông báo' })
  async getPremiumNotificationText(@Req() req: any) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPagePremiumService.getPremiumNotificationText(userId),
      {},
    );
  }

  @Get('premium/departmentPerformance')
  @ApiOperation({ summary: 'Dashboard Premium: Hiệu suất phòng ban' })
  async getPremiumDepartmentPerformance() {
    return this.handleResponse(
      () => this.dashboardPagePremiumService.getDepartmentPerformance(),
      [],
    );
  }

  @Get('premium/workload-projects')
  @ApiOperation({ summary: 'Dashboard Premium: Khối lượng công việc dự án' })
  async getPremiumWorkloadProjects() {
    return this.handleResponse(
      () => this.dashboardPagePremiumService.getWorkloadProjects(),
      {},
    );
  }

  @Get('premium/ceo-approvals')
  @ApiOperation({ summary: 'Dashboard Premium: Danh sách chờ CEO duyệt' })
  async getPremiumCeoApprovals(@Req() req: any) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPagePremiumService.getCeoApprovals(userId),
      {},
    );
  }

  @Get('premium/ceo-approvals-list')
  @ApiOperation({ summary: 'Dashboard Premium: Danh sách chờ CEO duyệt (Phân trang)' })
  async getPremiumCeoApprovalsList(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const userId = req.user.userId;
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    return this.handleResponse(
      () => this.dashboardPagePremiumService.getCeoApprovalsList(userId, pageNum, limitNum),
      { total: 0, list: [], page: pageNum, limit: limitNum },
    );
  }

  @Get('premium/documents')
  @ApiOperation({ summary: 'Dashboard Premium: Hồ sơ/Văn bản' })
  async getPremiumDocuments() {
    return this.handleResponse(
      () => this.dashboardPagePremiumService.getPremiumDocuments(),
      {},
    );
  }

  @Get('premium/department-tasks')
  @ApiOperation({ summary: 'Dashboard Premium: Công việc phòng ban' })
  async getPremiumDepartmentTasks() {
    return this.handleResponse(
      () => this.dashboardPagePremiumService.getPremiumDepartmentTasks(),
      {},
    );
  }

  @Get('premium/utilities')
  @ApiOperation({ summary: 'Dashboard Premium: Tiện ích' })
  async getPremiumUtilities() {
    return this.handleResponse(
      () => this.dashboardPagePremiumService.getPremiumUtilities(),
      {},
    );
  }

  @Get('premium/hr-stats')
  @ApiOperation({ summary: 'Dashboard Premium: Thống kê HR' })
  async getPremiumHRStats() {
    return this.handleResponse(
      () => this.dashboardPagePremiumService.getPremiumHRStats(),
      {},
    );
  }

  @Get('premium/meetings')
  @ApiOperation({ summary: 'Dashboard Premium: Lịch họp' })
  async getPremiumMeetings(@Req() req: any) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPagePremiumService.getPremiumMeetings(userId),
      {},
    );
  }

  @Get('premium/news')
  @ApiOperation({ summary: 'Dashboard Premium: Tin tức' })
  async getPremiumNews() {
    return this.handleResponse(
      () => this.dashboardPagePremiumService.getPremiumNews(),
      {},
    );
  }

  @Get('premium/events')
  @ApiOperation({ summary: 'Dashboard Premium: Sự kiện' })
  async getPremiumEvents() {
    return this.handleResponse(
      () => this.dashboardPagePremiumService.getPremiumEvents(),
      {},
    );
  }

  @Get('document-task-count')
  @ApiOperation({ summary: 'Đếm số lượng Văn bản đến, Văn bản đi, Công việc QLCV' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getDocumentTaskCount(
    @Req() req: any,
    @Query('authorId') authorId?: string,
    @Query('authority') authority?: string,
  ) {
    const userId = req.user.userId;
    return this.handleResponse(
      () => this.dashboardPageMediumService.getDocumentTaskCount(userId, authorId, authority),
      {
        incomingDocuments: {
          totalWaiting: 0,
          waitingDirective: 0,
          waitingProcessLeader: 0,
          coordinationLeader: 0,
          receiveToKnowLeader: 0,
          waitingProcessOther: 0,
          coordinationOther: 0,
          receiveToKnowOther: 0,
        },
        outgoingDocuments: {
          totalWaiting: 0,
          waitingPublish: 0,
          waitingStamp: 0,
          waitingFormatCheck: 0,
        },
        tasks: {
          commonTasks: 0,
          taskFromDocument: 0,
          taskFromMeeting: 0,
          taskFromProject: 0,
        },
      },
    );
  }
}
