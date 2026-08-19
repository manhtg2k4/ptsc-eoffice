import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpException,
  HttpStatus,
  Res,
  Req,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { BpmnDesignsService } from './bpmn-designs.service';
import { CreateBpmnDesignDto } from './dto/create-bpmn-design.dto';
import { FieldDto, UpdateBpmnDesignDto } from './dto/update-bpmn-design.dto';
import { Response } from 'express';
import { AdminGuard } from 'src/users/guards/admin.guard';

import { QueryParams } from '../interfaces/index'; // Adjust path as needed
import { FileInterceptor } from '@nestjs/platform-express';
import { BpmnDesignEntity } from './bpmn-design.entity';
import { JwtAuthGuard } from 'src/auth-sso/jwt.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiOperation } from '@nestjs/swagger';
import { ReturnError } from 'src/utils/util';
import { validateFileSecurity, sanitizeFileContent } from 'src/utils/file-security.util';
@Controller('bpmn-designs')
export class BpmnDesignsController {
  constructor(
    @InjectRepository(BpmnDesignEntity, 'mssqlConnection')
    private readonly bpmnDesignRepo: Repository<BpmnDesignEntity>,
    private readonly bpmnDesignsService: BpmnDesignsService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  @Get('process-instances')
  async getProcessInstances(
    @Query('maxResults') maxResults = '10',
    @Query('firstResult') firstResult = '0',
    @Res() res: Response,
  ) {
    try {
      const data = await this.bpmnDesignsService.getProcessInstances(
        +maxResults,
        +firstResult,
      );
      res.json(data);
    } catch (error) {
      console.error('Lỗi khi gọi Camunda API:', error.message);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
      }
    }
  }
  @Get('/tasks')
  async getTasks(@Query() query: Record<string, string>) {
    return this.bpmnDesignsService.getTasksByQuery(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async create(@Body() createBpmnDesignDto: CreateBpmnDesignDto) {
    // console.log("createBpmnDesignDto", createBpmnDesignDto);
    try {
      return await this.bpmnDesignsService.create(createBpmnDesignDto);
    } catch (error) {
      if (error.code === 11000) {
        // Lỗi trùng lặp key
        throw new HttpException(
          {
            success: false,
            message: 'Mã quy trình đã tồn tại. Vui lòng nhập mã khác.',
          },
          HttpStatus.BAD_REQUEST,
        );
      } else {
        // Lỗi khác
        console.error(error);
        throw new HttpException(
          {
            success: false,
            message: 'Lỗi khi tạo BpmnDesign'
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  @Get()
  async findAll(@Query() queryParams: QueryParams) {
    try {
      return await this.bpmnDesignsService.findAll(queryParams);
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Lỗi khi lấy danh sách BpmnDesign',
          errors: error.cause || [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('with-start-form')
  // @UsePipes(new ValidationPipe({ transform: true })) // tự động validate & chuyển kiểu query params
  async getDesignsWithStartForm(@Query() queryParams: any) {
    return await this.bpmnDesignsService.getDesignsWithStartForm(queryParams);
  }
  @Get('task-info')
  async getTaskInfo(
    @Query('processKey') processKey: string,
    @Query('activityId') activityId: string,
  ) {
    return this.bpmnDesignsService.getTaskInfo(processKey, activityId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mềm quy trình BPMN' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  async softDelete(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const design = await this.bpmnDesignRepo.findOne({ where: { id } });
      if (!design) {
        throw new HttpException(
          {
            success: false,
            message: 'Không tìm thấy quy trình',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Soft delete: set status = 3 (đã xóa)
      design.status = 3;
      await this.bpmnDesignRepo.save(design);

      return {
        success: true,
        message: 'Xóa mềm quy trình thành công!',
        data: { id },
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Lỗi khi xóa quy trình',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.bpmnDesignsService.findOne(id);
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Không tìm thấy BpmnDesign với id ${id}`,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() updateBpmnDesignDto: UpdateBpmnDesignDto,
  ) {
    try {
      const result = await this.bpmnDesignsService.update(
        id,
        updateBpmnDesignDto,
      );

      // 🔄 Nếu có base64File (file BPMN được cập nhật), clear cache BPMN
      // if (updateBpmnDesignDto.base64File && result?.id) {
      const cacheKey = `bpmn_engine:${result.id}`;
      await this.cacheManager.del(cacheKey);
      // }

      return result;
    } catch (error) {
      console.error('❌ Error in update:', error);
      throw new HttpException(
        {
          success: false,
          message: `Không thể cập nhật BpmnDesign với id ${id}`,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Post(':id/fields')
  async addField(@Param('id') id: string, @Body() fieldsDto: FieldDto[]) {
    try {
      return await this.bpmnDesignsService.addField(id, fieldsDto);
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Không thể thêm các trường vào BpmnDesign với id ${id}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(':id/fields')
  async updateField(@Param('id') id: string, @Body() fieldsDto: FieldDto[]) {
    try {
      return await this.bpmnDesignsService.updateField(id, fieldsDto);
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Không thể cập nhật các trường trong BpmnDesign ${id}`,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get(':id/fields')
  async getFields(@Param('id') id: string) {
    try {
      return await this.bpmnDesignsService.getFields(id);
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Không thể lấy danh sách trường của BpmnDesign với id ${id}`,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  // 2) Hoặc linh hoạt: processKey do FE truyền vào đường dẫn
  @Post('create-process')
  @UseInterceptors(FileInterceptor('data'))
  async deployProcess(
    @UploadedFile() data: Express.Multer.File,
    @Body('deploymentName') deploymentName: string,
    @Body('processID') processID: string,
  ) {
    if (!data) {
      throw new Error('File BPMN là bắt buộc!');
    }

    // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
    await validateFileSecurity(data);
    await sanitizeFileContent(data);
    return this.bpmnDesignsService.deployProcess(
      data,
      deploymentName || data.originalname,
      processID,
    );
  }
  @Post('start/:processKey')
  async startByKey(
    @Param('processKey') processKey: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    return this.bpmnDesignsService.startProcessForward(
      processKey,
      body,
      req.headers as any,
    );
  }
  @Post('complete/:taskId')
  async completeByKey(
    @Param('taskId') taskId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    return this.bpmnDesignsService.completeProcessForward(
      taskId,
      body,
      req.headers as any,
    );
  }

  @Get('/engine-rest/tasks/:processInstanceId')
  async getTasksByProcessInstanceId(
    @Param('processInstanceId') processInstanceId: string,
  ) {
    try {
      const tasks = await this.bpmnDesignsService.getTasks(processInstanceId);
      return tasks;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Error calling Camunda API',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Get('/engine-rest/:processInstanceId/activity-instances')
  async getStatusProcess(
    @Param('processInstanceId') processInstanceId: string,
  ) {
    try {
      const tasks =
        await this.bpmnDesignsService.getStatusProcess(processInstanceId);
      return tasks;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Error calling Camunda API',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Get('/engine-rest/task/:taskId/form-variables')
  async getValueUserTask(@Param('taskId') taskId: string) {
    try {
      const tasks = await this.bpmnDesignsService.getValueUserTask(taskId);
      return tasks;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Error calling Camunda API',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Get('/engine-rest/task/:taskId')
  async getDetailTask(@Param('taskId') taskId: string) {
    try {
      const tasks = await this.bpmnDesignsService.getDetailTask(taskId);
      return tasks;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Error calling Camunda API',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Get('history/:processInstanceId')
  async getActivityInstances(@Param('processInstanceId') id: string) {
    return this.bpmnDesignsService.getActivityInstances(id);
  }
  // 🧠 GET /camunda-tasks/:id

  @UseGuards(JwtAuthGuard)
  @Post('/process/:processInstanceId/submit-form')
  async submitFormByProcess(
    @Param('processInstanceId') processInstanceId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const currentUserId = req.user?.userId;
    return this.bpmnDesignsService.submitFormByProcess(
      processInstanceId,
      body,
      currentUserId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('tasks/get-completed-tasks-for-current-user')
  async getTasksForCurrentUser(@Req() req: any, @Query() query: any) {
    const currentUserId = req.user?.userId || req.user?.id || req.user?._id;
    if (!currentUserId) {
      throw new HttpException(
        'Không xác định được user hiện tại',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;

    // Parse sort
    const sort: Record<string, 'asc' | 'desc'> = {};
    Object.keys(query).forEach((key) => {
      const match = key.match(/^sort\[(.+)\]$/);
      if (match) {
        sort[match[1]] = query[key] === '-1' ? 'desc' : 'asc';
      }
    });

    // Parse userFilters
    const userFilters: Record<string, string> = {};
    Object.keys(query).forEach((key) => {
      const match = key.match(/^userFilters\[(.+)\]$/);
      if (match) {
        userFilters[match[1]] = query[key];
      }
    });


    return this.bpmnDesignsService.getTasksBySender(
      currentUserId,
      page,
      limit,
      userFilters, // <--- truyền search xuống service
      sort,
    );
  }

  @Post('/process/:processInstanceId/submit-form-gateway')
  async submitFormWithGateway(
    @Param('processInstanceId') processInstanceId: string,
    @Body() body: any,
  ) {
    return this.bpmnDesignsService.submitFormWithGateway(
      processInstanceId,
      body,
    );
  }
  @Get('diagram/:id')
  async getDiagram(@Param('id') processInstanceId: string) {
    return this.bpmnDesignsService.getDiagramByProcessInstanceId(
      processInstanceId,
    );
  }
  @Get('logs/:id')
  async getLogs(@Param('id') processInstanceId: string) {
    return this.bpmnDesignsService.getTaskLogs(processInstanceId);
  }

  @Post('sync-from-mongo')
  @ApiOperation({ summary: 'Sync data from MongoDB to SQL Server' })
  async syncFromMongo(@Res() res: Response) {
    try {
      const result = await this.bpmnDesignsService.syncBpmnDesignFromMongo();
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Sync process started.',
        data: result,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  // ...existing code...

  @Get('process/:relatedProcess')
  async findByRelatedProcess(
    @Param('relatedProcess') relatedProcess: string,
    @Query() queryParams: QueryParams,
  ) {
    try {
      return await this.bpmnDesignsService.findByRelatedProcess(
        relatedProcess,
        queryParams,
      );
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Lỗi khi lấy danh sách BpmnDesign theo related process',
          errors: error.cause || [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ...existing code...
}
