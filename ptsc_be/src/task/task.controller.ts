import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  Query,
  Req,
  ParseIntPipe,
  BadRequestException,
  Res,
  UnauthorizedException,
  Logger,
  UseGuards,
  MethodNotAllowedException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthorityStages, CheckAuthority, EffectiveUser } from 'src/authority-documents';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { QueryParams } from '../interfaces';
import { RemoveManyTaskDto } from './dto/delete-task.dto';
import { Response } from 'express';
import { SystemLogTaskServiceSql } from './dto/system-log-service-sql';
import { ListTaskDto } from './dto/list-task.dto';
import { TaskReminderService } from './task-reminder/task-reminder.service';
import { SendApprovalDto } from './dto/send-approval.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../file-manager/multer.config';
import { validateFileSecurity, sanitizeFileContent } from 'src/utils/file-security.util';
import { defaultFilterStartDateToThisYear } from 'src/utils/util';

import { TaskPermissionGuard } from './guards/task-permission.guard';
import { RequireTaskPermission, TaskPermissionAction } from './decorators/task-permission.decorator';

@ApiTags('Task')
@Controller('tasks') 
@UseGuards(TaskPermissionGuard)
// @UseGuards(JwtAuthGuard) // Protect all routes in this controller
// @ApiBearerAuth()
export class TaskController {
  private readonly logger = new Logger(TaskController.name);
  constructor(
    private readonly taskService: TaskService,
    private readonly systemLogServiceSql: SystemLogTaskServiceSql,
    private readonly taskReminderService: TaskReminderService,
    private readonly SystemLogServiceSql: SystemLogServiceSql,
  ) { }

  @Post('import-project-task-excel')
  @ApiOperation({ summary: 'Import và validate file Excel dự án/công việc' })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async importProjectTaskExcel(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || 'system-user-for-testing';
    try {
      const importRows = Array.isArray(body) ? body : (body?.rows ?? body?.data);
      if (!file && (!Array.isArray(importRows) || importRows.length === 0)) {
        throw new BadRequestException('Vui lòng upload file Excel hoặc gửi JSON dữ liệu import.');
      }
      // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
      if (file) {
        await validateFileSecurity(file);
        await sanitizeFileContent(file);
      }
      return this.taskService.importProjectTaskExcel(file, userId, importRows);
    } catch (error: any) {
      this.logger.error(
        `[import-project-task-excel] failed | userId=${userId} | file=${file?.originalname || 'N/A'} | message=${error?.message}`,
        error?.stack,
      );
      throw error;
    }
  }

  @Get('select-form-doc')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({
    summary: 'Lấy danh sách công việc từ văn bản cho văn bản đến chọn',
  })
  async findAllSelectFormDoc(
    @Query() queryParams: ListTaskDto,
    @EffectiveUser() userId: string,
    @Req() req: any,
  ) {
    const effectiveUserId = userId || req.user?.userId || 'system-user-for-testing';
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Lấy danh sách công việc từ văn bản cho văn bản đến chọn`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.findAllSelectFormDoc(queryParams, effectiveUserId);
  }

  @Get('select-form-doc/:id')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({
    summary: 'Lấy danh sách công việc từ văn bản đến (có phân trang)',
  })
  async findOneSelectFormDoc(
    @Param('id') id: string,
    @EffectiveUser() userId: string,
    @Req() req: any,
    @Query() query: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const effectiveUserId = userId || req.user?.userId || 'system-user-for-testing';
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Tìm kiếm công việc vói id: ${id}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    const name = query.filter?.name || query['filter[name]'];

    // Giới hạn max limit để bảo vệ DoS (CWE-400)
    const maxLimit = parseInt(process.env.MAX_PAGE_LIMIT || '100', 10);
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), maxLimit);

    return this.taskService.findOneSelectFormDoc(
      id,
      safePage,
      safeLimit,
      effectiveUserId,
      name,
    );
  }

  @Get('sent/:id')
  @RequireTaskPermission(TaskPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy chi tiết công việc đã gửi' })
  async findOneSent(@Param('id') id: string, @Query('auditId') auditId: string, @Req() req: any) {
    const userId = req.user?.userId;
    try {
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Lấy chi tiết công việc đã gửi với id: ${id}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.findOneSent(Number(id), userId, auditId ? Number(auditId) : undefined);
  }

  @Patch('select-form-doc')
  @RequireTaskPermission(TaskPermissionAction.UPDATE)
  @ApiOperation({ summary: 'Gán văn bản đến cho các công việc' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        docId: { type: 'string', description: 'ID của văn bản đến' },
        taskIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Mảng ID của các công việc',
        },
      },
      required: ['docId', 'taskIds'],
    },
  })
  patchSelectFormDoc(
    @Body() body: { docId: string; taskIds: number[] },
    @Req() req: any,
  ) {
    const userId = req.user?.userId || 'system-user-for-testing';
    if (
      !body.docId ||
      !body.taskIds ||
      !Array.isArray(body.taskIds) ||
      body.taskIds.length === 0
    ) {
      throw new BadRequestException(
        'docId và taskIds là bắt buộc và taskIds phải là một mảng không rỗng.',
      );
    }
    return this.taskService.patchSelectFormDoc(
      body.docId,
      body.taskIds,
      userId,
    );
  }

  @Get('check-create-permission')
  @ApiOperation({ summary: 'Kiểm tra quyền tạo công việc (chọn phòng ban/cá nhân)' })
  async checkCreatePermission(@Req() req, @Query('leaderId') leaderId?: string) {
    const userId = req.user?.userId || 'system-user-for-testing';
    return this.taskService.checkCreatePermission(userId, leaderId);
  }
  @Get('check-create-permission-for-meeting')
  @ApiOperation({ summary: 'Kiểm tra quyền tạo công việc (chọn phòng ban/cá nhân)' })
  async checkCreatePermissionForMeeting(@Req() req, @Query('leaderId') leaderId?: string) {
    const userId = req.user?.userId || 'system-user-for-testing';
    return this.taskService.checkCreatePermissionForMeeting(userId, leaderId);
  }

  @Post()
  @RequireTaskPermission(TaskPermissionAction.CREATE)
  @ApiOperation({ summary: 'Tạo công việc mới' })
  async create(@Body() createTaskDto: CreateTaskDto, @Req() req) {
    // Assuming user ID is available on the request object after authentication
    const userId = req.user?.userId || 'system-user-for-testing'; // Fallback for testing
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'POST',
        details: `Tạo công việc chung mới`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.create(createTaskDto, userId);
  }
  @Post('create-from-project')
  @ApiOperation({ summary: 'Tạo công việc mới từ dự án' })
  async createFromProject(@Body() createTaskDto: CreateTaskDto, @Req() req) {
    // Assuming user ID is available on the request object after authentication
    const userId = req.user?.userId || 'system-user-for-testing'; // Fallback for testing
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'POST',
        details: `Tạo công việc chung mới`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.createTaskforProject(createTaskDto, userId);
  }
  @Post('child')
  @RequireTaskPermission(TaskPermissionAction.CREATE)
  @ApiOperation({ summary: 'Tạo công việc con' })
  async createChild(@Body() createTaskDto: CreateTaskDto, @Req() req) {
    // Assuming user ID is available on the request object after authentication
    const userId = req.user?.userId || 'system-user-for-testing'; // Fallback for testing
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'POST',
        details: `Tạo công việc chung mới`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.createChild(createTaskDto, userId);
  }

  @Post('child-from-project')
  @ApiOperation({ summary: 'Tạo công việc con từ dự án' })
  async createChildFromProject(@Body() createTaskDto: CreateTaskDto, @Req() req) {
    const userId = req.user?.userId || 'system-user-for-testing';
    try {
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'POST',
        details: `Tạo công việc con từ dự án`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.createChildForProject(createTaskDto, userId);
  }

  @Post('form-doc')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @RequireTaskPermission(TaskPermissionAction.CREATE)
  @ApiOperation({ summary: 'Tạo công việc mới( từ văn bản)' })
  @ApiResponse({
    status: 201,
    description: 'Tạo công việc từ văn bản thành công',
  })
  async createFormDoc(
    @Body() createTaskDto: CreateTaskDto,
    @Req() req,
    @EffectiveUser() userId: string
  ) {
    // Assuming user ID is available on the request object after authentication
    // const userId = req.user?.userId || 'system-user-for-testing'; // Fallback for testing
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'POST',
        details: `Tạo hồ sơ công việc từ văn bản`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.createFormDocTask(createTaskDto, userId);
  }

  @Post('form-meeting')
  @RequireTaskPermission(TaskPermissionAction.CREATE)
  @ApiOperation({ summary: 'Tạo công việc mới ( từ cuộc họp)' })
  @ApiResponse({
    status: 201,
    description: 'Tạo công việc từ cuộc họp thành công',
  })
  async createFormMetting(@Body() createTaskDto: CreateTaskDto, @Req() req) {
    // Assuming user ID is available on the request object after authentication
    const userId = req.user?.userId || 'system-user-for-testing'; // Fallback for testing
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'POST',
        details: `Tạo công việc từ cuộc họp`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.createFormMettingTask(createTaskDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách công việc' })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Filter by task name',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (e.g., 1 for active)',
  })
  async findAll(@Query() queryParams: ListTaskDto, @Req() req: any) {
    defaultFilterStartDateToThisYear(queryParams, false);
    const userId = req.user?.userId || 'system-user-for-testing';
    if (req.body && Object.keys(req.body).length > 0) {
      throw new MethodNotAllowedException(
        'GET method does not allow request body',
      );
    }
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Lấy danh sách công việc chung`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.findAll(queryParams, userId);
  }

  @Get('child')
  @ApiOperation({ summary: 'Lấy danh sách công việc con ' })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Filter by task name',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (e.g., 1 for active)',
  })
  async findAllChild(@Query() queryParams: QueryParams, @Req() req: any) {
    const userId = req.user?.userId || 'system-user-for-testing';
    if (req.body && Object.keys(req.body).length > 0) {
      throw new MethodNotAllowedException(
        'GET method does not allow request body',
      );
    }
    try {
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Lấy danh sách công việc con`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.findAllChild(queryParams, userId);
  }
  @Get('all-log-task/:taskId')
  @ApiOperation({ summary: 'Lấy tất cả log của một công việc' })
  async findAllLogTask(
    @Req() req,
    @Param('taskId', ParseIntPipe) taskId: number,
  ) {
    const userId = req.user?.userId;

    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Lấy lịch sử thao tác trên task: ${taskId}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.systemLogServiceSql.findAll({ filter: { taskId } });
  }

  @Get('count')
  async countGeneral(@Req() req) {
    const userId = req.user?.userId;
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Thống kê số lượng công việc theo loại`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.countTask(userId);
  }

  @Get('statistics') //thống kê nhân sự / task
  @ApiResponse({
    status: 200,
    description: 'Thống kê nhân sự / task thành công',
  })
  @ApiOperation({ summary: 'Thống kê nhân sự / task' })
  async getStatistics(@Req() req) {
    const userId = req.user?.userId;
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Thống kê nhân sự/ task với userId: ${req?.user?.userId || ''}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.statisticBasic(userId);
  }

  @Get('statistics/organization') //thống kê phòng ban / task
  @ApiResponse({
    status: 200,
    description: 'Thống kê phòng ban / task thành công',
  })
  @ApiOperation({ summary: 'Thống kê phòng ban / task' })
  async getStatisticsOrganization(@Req() req) {
    const userId = req.user?.userId;
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Thống kê phòng ban / task với name: ${req?.user?.name || ''}, username: ${req?.user?.username || ''}, userId: ${req?.user?.userId || ''}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.statisticBasicOrg(userId);
  }

  @Get('statistics/user/task') //thống kê nhân sự / task theo trạng thái
  async getStatisticsTask(@Query() queryParams: ListTaskDto, @Req() req) {
    const userId = req.user?.userId;
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Thống kê nhân sự/ task  theo trạng thái với userId: ${req?.user?.userId || ''}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.statisticListTask(queryParams, userId);
  }

  @Get('statistics/all-personal-performance') //thống kê hiệu suất cá nhân( tất cả - - role lãnh đạo)
  @ApiResponse({
    status: 200,
    description: 'Thống kê hiệu suất cá nhân thành công(lãnh đạo)',
  })
  @ApiOperation({ summary: 'Thống kê hiệu suất cá nhân' })
  async statisticPersonalPerformanceByMonthAll(
    @Query() query: any,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedException();
    }

    const fromMonth = query.fromMonth ? Number(query.fromMonth) : undefined;
    const fromYear = query.fromYear ? Number(query.fromYear) : undefined;
    const toMonth = query.toMonth ? Number(query.toMonth) : undefined;
    const toYear = query.toYear ? Number(query.toYear) : undefined;

    // ❗ Validate sớm – chặn request ngu
    if (
      !fromMonth ||
      !fromYear ||
      !toMonth ||
      !toYear ||
      fromMonth < 1 ||
      fromMonth > 12 ||
      toMonth < 1 ||
      toMonth > 12
    ) {
      throw new BadRequestException(
        'fromMonth, fromYear, toMonth, toYear are required and must be valid',
      );
    }
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Thống kê hiệu suất cá nhân (lãnh đạo) với fromMonth: ${query.fromMonth || ''}, fromYear: ${query.fromYear || ''}, toMonth: ${query.toMonth || ''}, toYear: ${query.toYear || ''}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }

    return this.taskService.statisticPersonalPerformanceByMonthAll({
      fromMonth,
      fromYear,
      toMonth,
      toYear,
      creatorId: query.creatorId,
    });
  }

  @Get('statistics/personal-performance') //thống kê hiệu suất cá nhân
  @ApiResponse({ status: 200, description: 'Thống kê hiệu suất thành công' })
  @ApiOperation({ summary: 'Thống kê hiệu suất' })
  async statisticPersonalPerformanceByMonth(
    @Query() query: any,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const fromMonth = query.fromMonth ? Number(query.fromMonth) : undefined;
    const fromYear = query.fromYear ? Number(query.fromYear) : undefined;
    const toMonth = query.toMonth ? Number(query.toMonth) : undefined;
    const toYear = query.toYear ? Number(query.toYear) : undefined;

    // ❗ Validate sớm – chặn request ngu
    if (
      !fromMonth ||
      !fromYear ||
      !toMonth ||
      !toYear ||
      fromMonth < 1 ||
      fromMonth > 12 ||
      toMonth < 1 ||
      toMonth > 12
    ) {
      throw new BadRequestException(
        'fromMonth, fromYear, toMonth, toYear are required and must be valid',
      );
    }
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Thống kê hiệu suất công viêc cá nhân`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }

    return this.taskService.statisticPersonalPerformanceByMonth(
      {
        fromMonth,
        fromYear,
        toMonth,
        toYear,
        creatorId: query.creatorId,
      },
      userId,
    );
  }

  @Get('statistics/overdue') // thống kê task quá hạn
  @ApiResponse({ status: 200, description: 'Thống kê task quá hạn thành công' })
  @ApiOperation({ summary: 'Thống kê task quá hạn' })
  async getOverdueTasks(
    @Req() req: any,
    @Query('fromMonth') fromMonth: number,
    @Query('fromYear') fromYear: number,
    @Query('toMonth') toMonth: number,
    @Query('toYear') toYear: number,
    @Query('creatorId') creatorId?: string,
  ) {
    // ép kiểu số
    const params = {
      fromMonth: Number(fromMonth),
      fromYear: Number(fromYear),
      toMonth: Number(toMonth),
      toYear: Number(toYear),
      creatorId,
    };
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Thống kê công việc quá hạn với querry:  fromMonth: ${params.fromMonth || ''}, fromYear: ${params.fromYear || ''}, toMonth: ${params.toMonth || ''}, toYear: ${params.toYear || ''}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }

    return this.taskService.getOverdueTasks(params);
  }

  @Get('overdue-reason-requests')
  @ApiOperation({ summary: 'Danh sách công việc trễ hạn phải nhập lại lý do trong đợt tháng' })
  getMyOverdueReasonRequests(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '25',
  ) {
    return this.taskService.getMyOverdueReasonRequests(req.user?.userId, page, limit);
  }

  @Get('statistics/recurring')
  @ApiResponse({ status: 200, description: 'Thống kê task lặp lại thành công' })
  @ApiOperation({ summary: 'Thống kê task lắp lại' })
  async statisticRecurringByCycle(
    @Query()
    query: {
      fromDate?: string;
      toDate?: string;
      recurringType?: string;
      scope?: 'me' | 'all';
    },
    @Req() req: any,
  ) {
    const userId = req.user?.id;


    const result = await this.taskService.statisticRecurringByCycle(
      query,
      userId,
    );
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Thống kê công việc lặp lại`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }

    return {
      success: true,
      message: 'Statistic recurring tasks by cycle',
      data: result,
    };
  }

  @Get('statistics/creator')
  @ApiResponse({
    status: 200,
    description: 'Thống kê nguồn công việc thành công',
  })
  @ApiOperation({ summary: 'Thống kê nguồn công việc thành công' })
  async statisticByCreator(@Req() req: any, @Query() queryParams: ListTaskDto) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Thống kê nguồn công việc`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.statisticTaskByCreator(queryParams);
  }

  @Get('statistics/completed-by-duration')
  @ApiResponse({
    status: 200,
    description: 'Thống kê công việc theo tgian thành công',
  })
  @ApiOperation({ summary: 'Thống kê công việc theo thời gian hoàn thành' })
  async statisticCompletedTaskByDuration(
    @Req() req: any,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('scope') scope: 'me' | 'all' = 'me',
  ) {
    const userId = req.user.id;
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Thống kê công việc theo thời gian hoàn thành`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }

    return this.taskService.statisticCompletedTaskByDuration(
      {
        fromDate,
        toDate,
        scope,
      },
      userId,
    );
  }

  // @Get('task-notifications')
  // async getNotifications(
  //   @Query('recipientId') recipientId: string,
  //   @Query('isRead') isRead?: string,
  // ) {
  //   if (!recipientId) {
  //     throw new BadRequestException('recipientId is required');
  //   }

  //   let isReadBool: boolean | undefined;
  //   if (isRead === 'true' || isRead === '1') {
  //     isReadBool = true;
  //   } else if (isRead === 'false' || isRead === '0') {
  //     isReadBool = false;
  //   }

  //   return this.taskReminderService.getNotifications(recipientId, isReadBool);
  // }

  @Post('sendadjust')
  // @RequireTaskPermission(TaskPermissionAction.SEND_ADJUST)
  @ApiOperation({ summary: 'Gửi điều chỉnh công việc chung' })
  sendAdjust(@Body() dto: SendApprovalDto, @Req() req) {
    const userId = req.user?.userId || 'system-user-for-testing';
    return this.taskService.sendAdjust(userId, dto, req);
  }

  @Post('confirm-adjust')
  // @RequireTaskPermission(TaskPermissionAction.SEND_ADJUST)
  @ApiOperation({ summary: 'Xác nhận điều chỉnh công việc chung' })
  @ApiBody({
    schema: { type: 'object', properties: { id: { type: 'number' } } },
  })
  confirmAdjust(@Body() body: { id: number }, @Req() req) {
    const userId = req.user?.userId || 'system-user-for-testing';
    if (!body || !body.id) {
      throw new BadRequestException('Trường id là bắt buộc trong body');
    }
    return this.taskService.confirmAdjust(body.id, userId);
  }

  @Post('confirm-adjust-form-doc')
  // @RequireTaskPermission(TaskPermissionAction.SEND_ADJUST)
  @ApiOperation({ summary: 'Xác nhận điều chỉnh công việc từ văn bản' })
  @ApiBody({
    schema: { type: 'object', properties: { id: { type: 'number' } } },
  })
  confirmAdjustFormDoc(@Body() body: { id: number }, @Req() req) {
    const userId = req.user?.userId || 'system-user-for-testing';
    if (!body || !body.id) {
      throw new BadRequestException('Trường id là bắt buộc trong body');
    }
    return this.taskService.confirmAdjustFormDoc(body.id, userId);
  }
  // api dùng chung cho gửi phê duyệt, gửi điều chỉnh, đồng ý, từ chối
  @Post('send-approval')
  // @RequireTaskPermission(TaskPermissionAction.SEND_APPROVAL)
  @ApiOperation({ summary: 'Gửi phê duyệt công việc chung' })
  sendApproval(@Body() dto: SendApprovalDto, @Req() req) {
    const userId = req.user?.userId || 'system-user-for-testing';
    return this.logApprovalAction(req, dto.actionCode, () => this.taskService.sendApproval(userId, dto));
  }

  @Post('send-approval-form-meeting')
  // @RequireTaskPermission(TaskPermissionAction.SEND_APPROVAL)
  @ApiOperation({ summary: 'Gửi phê duyệt công việc từ cuộc họp' })
  sendApprovalFormMeeting(@Body() dto: SendApprovalDto, @Req() req) {
    const userId = req.user?.userId || 'system-user-for-testing';
    return this.logApprovalAction(req, dto.actionCode, () => this.taskService.sendApproval(userId, dto));
  }

  // api dùng chung cho gửi phê duyệt, gửi điều chỉnh, đồng ý, từ chối từ văn bản
  @Post('send-approval-form-doc')
  // @RequireTaskPermission(TaskPermissionAction.SEND_APPROVAL)
  @ApiOperation({ summary: 'Gửi phê duyệt công việc từ văn bản' })
  sendApprovalFormDoc(@Body() dto: SendApprovalDto, @Req() req) {
    const userId = req.user?.userId || 'system-user-for-testing';
    return this.logApprovalAction(req, dto.actionCode, () => this.taskService.sendApprovalFormDoc(userId, dto));
  }

  @Get('form-doc')
  @ApiOperation({ summary: 'Danh sách công việc từ văn bản' })
  async findAllFormDoc(@Query() queryParams: ListTaskDto, @Req() req: any) {
    defaultFilterStartDateToThisYear(queryParams, false);
    const userId = req.user?.userId || 'system-user-for-testing';
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Lấy danh sách công việc từ văn bản`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.findAllFormDoc(queryParams, userId);
  }

  @Get('form-meeting')
  @ApiOperation({ summary: 'Công việc từ cuộc họp' })
  async findAllMeeting(@Query() queryParams: ListTaskDto, @Req() req: any) {
    defaultFilterStartDateToThisYear(queryParams, false);
    const userId = req.user?.userId || 'system-user-for-testing';
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Lấy danh sách công việc từ cuộc họp`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.findAllMeeting(queryParams, userId);
  }

  @Get('form-meeting/:meetingId/conclusions/:meetingConclusionId/tasks')
  @ApiOperation({ summary: 'Danh sách công việc theo kết luận trong cuộc họp' })
  findTasksByMeetingRecord(
    @Param('meetingId') meetingId: string,
    @Param('meetingConclusionId') meetingConclusionId: string,
    @Query() query: ListTaskDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || 'system-user-for-testing';

    return this.taskService.findTasksByMeetingRecord(
      {
        ...query,
        meetingId,
        meetingConclusionId,
      },
      userId,
    );
  }

  @Get('form-meeting/tasks-by-conclusion/:meetingConclusionId')
  @ApiOperation({ summary: 'Danh sách công việc theo kết luận trong cuộc họp' })
  findTasksByConclusion(
    @Query('meetingId') meetingId: string,
    @Param('meetingConclusionId') meetingConclusionId: string,
    @Query() query: ListTaskDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || 'system-user-for-testing';

    return this.taskService.findTasksByConclusion(
      {
        ...query,
        meetingId,
        meetingConclusionId,
        userId
      },
    );
  }

  @Get('form-meeting/:meetingId/tasks')
  @ApiOperation({ summary: 'Danh sách công việc theo cuộc họp' })
  findTasksByMeeting(
    @Param('meetingId') meetingId: string,
    @Query() query: ListTaskDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || 'system-user-for-testing';

    return this.taskService.findTasksByMeeting(
      {
        ...query,
        meetingId,
      },
      userId,
    );
  }

  @Get('approve')
  @ApiOperation({ summary: 'Danh sách Phê duyệt/Từ chối công việc công việc chung' })
  async findAllApprove(@Query() queryParams: ListTaskDto, @Req() req: any) {
    const userId = req.user?.userId || 'system-user-for-testing';
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: queryParams.type === 'sent' ? `Lấy danh sách yêu cầu tôi đã gửi` : "Lấy danh sách chờ tôi phê duyệt",
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.findAllApprove(queryParams, userId);
  }
  @Get('history')
  @ApiOperation({ summary: 'Danh sách lịch sử xử lý công việc (đồng ý/từ chối)' })
  @ApiQuery({
    name: 'resultType',
    required: false,
    enum: ['accepted', 'rejected', 'all'],
    description: 'Lọc theo kết quả xử lý: accepted (đồng ý), rejected (từ chối), all (tất cả)',
  })
  historyApprove(@Query() queryParams: ListTaskDto, @Req() req: any) {
    const userId = req.user?.userId || 'system-user-for-testing';
    return this.taskService.historyApprove(queryParams, userId);
  }

  @Post('approve')
  // @RequireTaskPermission(TaskPermissionAction.APPROVE)
  @ApiOperation({ summary: 'Phê duyệt/Từ chối công việc công việc chung' })
  approveTask(@Body() dto: SendApprovalDto, @Req() req) {
    const userId = req.user?.userId || 'system-user-for-testing';
    return this.taskService.approveTask(userId, dto);
  }

  @Get('form-doc/:id')
  @RequireTaskPermission(TaskPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy chi tiết một công việc từ văn bản' })
  findOneFormDoc(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.userId;
    return this.taskService.findOneFormDoc(id, userId);
  }

  @Get('form-meeting/:id')
  @RequireTaskPermission(TaskPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy chi tiết một công việc từ cuộc họp' })
  findOneFormMeeting(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.userId;
    return this.taskService.findOneFormMeeting(id, userId);
  }
  @Get('info-workflow')
  @ApiOperation({ summary: 'Lấy danh sách quy trình mẫu' })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Filter by task name',
  })
  async getInfoWorkflow(@Query('name') name: string) {
    return this.taskService.getInfoWorkflow(name);
  }

  @Get('recurring')
  @ApiOperation({ summary: 'Lấy danh sách cấu hình công việc lặp lại' })
  async getRecurringConfigs(@Query() query: ListTaskDto, @Req() req) {
    const userId = req.user?.userId || 'system-user-for-testing';
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Lấy danh sách công việc lặp lại`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.findAllRecurringConfigs(query, userId);
  }

  @Post('recurring')
  @ApiOperation({ summary: 'Thêm mới công việc lặp lại' })
  async createRecurring(@Body() dto: CreateTaskDto, @Req() req) {
    const userId = req.user?.userId || 'system-user-for-testing';
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'POST',
        details: `Thêm mới công việc lặp lại`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.createRecurring(dto, userId);
  }

  @Get('recurring/:id')
  @ApiOperation({ summary: 'Lấy chi tiết cấu hình công việc lặp lại' })
  async getRecurringConfig(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Lấy chi tiết cấu hình công việc lặp lại`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.taskService.findRecurringConfig(id);
  }

  @Get('recurring/instances')
  @ApiOperation({ summary: 'Lấy danh sách các công việc được tạo từ cấu hình lặp lại (của người dùng)' })
  async getRecurringInstances(@Req() req) {
    const userId = req.user?.userId || 'system-user-for-testing';
    return this.taskService.findRecurringInstances(userId);
  }

  @Get('approve/:id')
  @RequireTaskPermission(TaskPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy chi tiết một công việc ở phê duyệt' })
  findOneApprove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.userId;
    return this.taskService.findOneApprove(id, userId);
  }

  @Get(':id')
  @RequireTaskPermission(TaskPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy chi tiết một công việc' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.userId;
    return this.taskService.findOne(id, userId);
  }

  @Patch('update-status-job/:id')
  @RequireTaskPermission(TaskPermissionAction.UPDATE)
  @ApiOperation({ summary: 'Cập nhật trạng thái công việc' })
  updateStatusJob(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskStatusDto,
    @Req() req,
  ) {
    const userId = req.user?.userId || 'system-user-for-testing';
    return this.taskService.updateStatusJob(id, dto.processStatus, userId);
  }


  @Patch('form-meeting/:id')
  @RequireTaskPermission(TaskPermissionAction.UPDATE)
  @ApiOperation({ summary: 'Cập nhật một công việc từ cuộc họp' })
  updateFormMeeting(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req,
  ) {
    const userId = req.user?.userId || 'system-user-for-testing'; // Fallback for testing

    return this.taskService.update(id, updateTaskDto, userId);
  }

  @Patch('form-doc/:id')
  @RequireTaskPermission(TaskPermissionAction.UPDATE)
  @ApiOperation({ summary: 'Cập nhật một công việc từ văn bản' })
  updateFormDoc(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req,
  ) {
    const userId = req.user?.userId || 'system-user-for-testing'; // Fallback for testing
    return this.taskService.updateFormDoc(id, updateTaskDto, userId);
  }

  @Patch(':id')
  @RequireTaskPermission(TaskPermissionAction.UPDATE)
  @ApiOperation({ summary: 'Cập nhật một công việc' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req,
    // @Query('isTaskProject') isTaskProject: string,
  ) {
    const userId = req.user?.userId || 'system-user-for-testing'; // Fallback for testing
    return this.taskService.update(id, updateTaskDto, userId, req);
  }

  @Delete()
  @ApiOperation({ summary: 'Xóa nhiều công việc' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  // removeMany(@Body() body: RemoveManyTaskDto, @Req() req) {
  //   if (!req.user?.userId || !body.ids || body.ids.length === 0 || !body.type || (body.type !== 'parent' && body.type !== 'chill')) {
  //     throw new BadRequestException('Thông tin người dùng, nội dung(ids, type ) gửi lên không hợp lệ');
  //   }
  //   return this.taskService.removeMany(body.ids, body.type);
  // }
  @Delete()
  @RequireTaskPermission(TaskPermissionAction.DELETE)
  async removeMany(@Body() body: RemoveManyTaskDto, @Req() req) {
    const userId = req.user?.userId;
    const ids = body.ids;

    if (!userId || !ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException(
        'Thông tin người dùng hoặc danh sách ids gửi lên không hợp lệ',
      );
    }
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'DELETE',
        details: `Xóa task với ids: ${ids}`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }

    // Gọi service, chỉ truyền ids và userId
    return this.taskService.removeMany(ids, userId);
  }

  @Get('export/excel')
  @ApiOperation({ summary: 'Tải danh sách công việc (Excel)' })
  async exportExcel(@Query() queryParams: QueryParams, @Res() res: Response) {
    const workbook = await this.taskService.buildExcel(queryParams);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=task-list.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  }

  @Get('export/excel/form-doc')
  @ApiOperation({ summary: 'Tải danh sách công việc (Excel)' })
  async exportExcelv1(@Query() queryParams: QueryParams, @Res() res: Response) {
    const workbook = await this.taskService.buildExcelTaskFormDoc(queryParams);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=task-list.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  }

  @Get('export/excel-dynamic')
  @ApiOperation({ summary: 'Tải danh sách công việc (Excel động theo viewConfig)' })
  async exportExcelDynamic(
    @Query() queryParams: ListTaskDto,
    @Res() res: Response,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    const workbook = await this.taskService.buildExcelDynamic(queryParams, userId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=task-list-dynamic.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  }

  @Get('export/dynamic')
  @ApiOperation({ summary: 'Xuất danh sách công việc linh hoạt (Excel/PDF + Đa loại dữ liệu)' })
  @ApiQuery({ name: 'exportType', required: false, enum: ['excel', 'pdf'], description: 'Định dạng xuất (mặc định excel)' })
  @ApiQuery({ name: 'processFn', required: false, description: 'Mã viewConfig (quanlycv hoặc quanlycvvb)' })
  async exportDynamic(
    @Query() queryParams: ListTaskDto & { exportType?: string; processFn?: string },
    @Res() res: Response,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    const result = await this.taskService.exportDynamic(queryParams, userId);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
    );

    if (queryParams.exportType === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
    } else {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    }
    res.send(result.buffer);
  }

  @Put('recurring/:id')
  // @RequireTaskPermission(TaskPermissionAction.UPDATE)
  @ApiOperation({ summary: 'Cập nhật cấu hình công việc lặp lại' })
  async updateRecurringConfig(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    return this.taskService.updateRecurringConfig(+id, dto, userId);
  }

  @Delete('recurring/:id')
  @RequireTaskPermission(TaskPermissionAction.DELETE)
  @ApiOperation({ summary: 'Xóa cấu hình công việc lặp lại (soft delete)' })
  async removeRecurringConfig(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || 'system-user-for-testing';
    return this.taskService.removeRecurringConfig(id, userId);
  }

  @Delete('recurring')
  @RequireTaskPermission(TaskPermissionAction.DELETE)
  @ApiOperation({ summary: 'Xóa nhiều cấu hình công việc lặp lại (soft delete)' })
  async removeManyRecurringConfigs(
    @Body() body: { ids: number[] },
    @Req() req: any,
  ) {
    const userId = req.user?.userId || 'system-user-for-testing';
    return this.taskService.removeManyRecurringConfigs(body.ids, userId);
  }

  @Get(':id/children')
  @RequireTaskPermission(TaskPermissionAction.VIEW)
  @ApiOperation({
    summary: 'Lấy danh sách công việc con trực tiếp theo từng cấp (lazy-load tree)',
    description:
      'Trả về các công việc có parent = id truyền vào. ' +
      'Mỗi item có trường flags.hasChildren = true/false để frontend biết còn cấp con hay không. ' +
      'Kèm theo thông tin thời hạn của công việc cha: deadlineStartParent, deadlineEndParent.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Trang hiện tại (mặc định: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Số bản ghi mỗi trang (mặc định: 100)' })
  @ApiQuery({ name: 'name', required: false, description: 'Tìm kiếm theo tên công việc' })
  @ApiQuery({ name: 'isSortStart', required: false, description: 'Cờ sắp xếp mặc định ngày bắt đầu lên trên' })
  async getChildrenByParentId(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('name') name?: string,
    @Query('isSortStart') isSortStart?: string | boolean,
    @Query('filter') filter?: any,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId || 'system-user-for-testing';
    try {
      await this.SystemLogServiceSql.createLogFromSystem({
        action: 'GET',
        details: `Lấy danh sách công việc con cấp con của công việc id: ${id}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    // Giới hạn max limit để bảo vệ DoS (CWE-400)
    const maxLimit = parseInt(process.env.MAX_PAGE_LIMIT || '100', 10);
    const safePage = Math.max(page ? Number(page) : 1, 1);
    const safeLimit = Math.min(Math.max(limit ? Number(limit) : 100, 1), maxLimit);

    return this.taskService.getChildrenByParentId(id, userId, {
      page: safePage,
      limit: safeLimit,
      name,
      isSortStart,
      filter,
    });
  }

  private async logApprovalAction(req: any, actionCode: string, operation: () => Promise<any>) {
    const logData = {
      action: actionCode || 'APPROVE',
      details: `Thực hiện hành động phê duyệt: ${actionCode}`,
      method: req.method,
      status: 'SUCCESS',
      type: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
      subType: process.env.CLIENT_LOG || 'TASK_MANAGEMENT',
      userInfo: req?.user?.userId || '',
      ipAddress: req?.socket?.remoteAddress || 'Unknown',
      timestamp: new Date().toISOString(),
    };

    try {
      const result = await operation();
      this.SystemLogServiceSql.createLogFromSystem(logData).catch(err => console.error('Lỗi ghi log:', err));
      return result;
    } catch (error) {
      logData.status = 'FAILED';
      logData.details = `${logData.details} - Thất bại: ${error.message}`;
      this.SystemLogServiceSql.createLogFromSystem(logData).catch(err => console.error('Lỗi ghi log:', err));
      throw error;
    }
  }
}
