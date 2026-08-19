import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { TaskReportService } from './task-report.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../oauth/jwt.guard';
import { DepartmentWorkStatsDto } from './dto/department-work-stats.dto';

@ApiTags('Task Report')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('task-report')
export class TaskReportController {
  constructor(private readonly taskReportService: TaskReportService) { }

  @Get('personal-tasks')
  @ApiOperation({ summary: 'Báo cáo 4.1: Danh sách công việc cá nhân theo trạng thái' })
  async getPersonalTasks(
    @Req() req: any,
    @Query() query: any,
  ) {
    return this.taskReportService.getPersonalTaskReport({
      ...query,
      user: req.user,
    });
  }

  @Get('performance')
  @ApiOperation({ summary: 'Báo cáo 4.2: Thống kê hiệu suất công việc cá nhân' })
  async getPerformance(
    @Req() req: any,
    @Query() query: any,
  ) {
    return this.taskReportService.getPersonalPerformanceReport({
      ...query,
      user: req.user,
    });
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Báo cáo 4.3: Danh sách công việc quá hạn' })
  async getOverdueTasks(
    @Req() req: any,
    @Query() query: any,
  ) {
    return this.taskReportService.getOverdueTaskReport({
      ...query,
      user: req.user,
    });
  }

  @Get('recurring')
  @ApiOperation({ summary: 'Báo cáo 4.4: Công việc lặp lại theo chu kỳ' })
  async getRecurringTasks(
    @Req() req: any,
    @Query() query: any,
  ) {
    return this.taskReportService.getRecurringTaskReport({
      ...query,
      user: req.user,
    });
  }

  @Get('workload-source')
  @ApiOperation({ summary: 'Báo cáo 4.5: Phân tích khối lượng công việc theo nguồn' })
  async getWorkloadSource(
    @Req() req: any,
    @Query() query: any,
  ) {
    return this.taskReportService.getWorkloadBySourceReport({
      ...query,
      user: req.user,
    });
  }

  @Get('topic-task-list')
  @ApiOperation({ summary: 'Báo cáo 4.6: Danh sách công việc theo chủ đề' })
  async getTopicTaskList(
    @Req() req: any,
    @Query() query: any,
  ) {
    return this.taskReportService.getTopicTaskListReport({
      ...query,
      user: req.user,
    });
  }

  /** Kiểm tra người dùng có phải lãnh đạo không (để ẩn/hiện nút trên giao diện) */
  @Get('is-leader')
  @ApiOperation({ summary: 'Kiểm tra quyền lãnh đạo của người dùng hiện tại' })
  async checkIsLeader(@Req() req: any) {
    const userId = typeof req.user === 'string' ? req.user : req.user?.userId;
    return this.taskReportService.checkIsLeader(userId);
  }

  /** Thống kê hiệu suất tổng hợp theo từng phòng ban (dành cho Giám đốc / Trưởng phòng) */
  @Get('dept-performance')
  @ApiOperation({ summary: 'Thống kê hiệu suất công việc theo phòng ban' })
  async getDeptPerformance(
    @Req() req: any,
    @Query() query: any,
  ) {
    return this.taskReportService.getDeptPerformanceReport({ ...query, user: req.user });
  }

  /** Chi tiết danh sách công việc của 1 phòng ban (click vào 1 dòng phòng ban) */
  @Get('dept-task-detail')
  @ApiOperation({ summary: 'Danh sách công việc chi tiết của 1 phòng ban' })
  async getDeptTaskDetail(
    @Req() req: any,
    @Query() query: any,
  ) {
    return this.taskReportService.getDeptTaskDetailReport({ ...query, user: req.user });
  }

  @Get('longest-processing-time')
  @ApiOperation({ summary: 'Báo cáo công việc có thời gian xử lý lâu nhất' })
  async getLongestProcessingTimeTasks(
    @Req() req: any,
    @Query() query: any,
  ) {
    return this.taskReportService.getLongestProcessingTimeTasksReport({
      ...query,
      user: req.user,
    });
  }

  @Get('dept-work-stats')
  @ApiOperation({ summary: 'Báo cáo: Thống kê công việc của phòng' })
  async getDeptWorkStats(
    @Req() req: any,
    @Query() query: DepartmentWorkStatsDto,
  ) {
    return this.taskReportService.getDeptWorkStatsReport({
      ...req.query,
      ...query,
      user: req.user,
    });
  }
}
