// src/task-document-link/task-document-link.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Req,
  BadRequestException,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TaskDocumentLinkService } from './task-document-link.service';
import { CreateTaskDocumentLinkDto } from './dto/create-task-document-link.dto';
import { UpdateTaskDocumentLinkDto } from './dto/update-task-document-link.dto';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { SystemLogTaskServiceSql } from 'src/task/dto/system-log-service-sql';
import { UseGuards } from '@nestjs/common';
import { TaskDocumentLinkPermissionGuard } from './guards/task-document-link-permission.guard';
import { RequireTaskDocumentLinkPermission } from './decorators/task-document-link-permission.decorator';
import { TaskDocumentLinkAction } from './task-document-link-permission.service';

@ApiTags('Gắn link tài liệu công việc')
@Controller('task-document-links')
@UseGuards(TaskDocumentLinkPermissionGuard)
export class TaskDocumentLinkController {
  constructor(
    private readonly taskDocumentLinkService: TaskDocumentLinkService,
    private readonly systemLogService: SystemLogServiceSql,
    private readonly systemLogTaskServiceSql: SystemLogTaskServiceSql,
  ) { }

  // ========== THÊM MỚI LINK TÀI LIỆU ==========

  @ApiOperation({
    summary: 'Gắn link tài liệu vào công việc',
    description: 'Thêm mới link tài liệu vào công việc. Chỉ cần nhập tên tài liệu và đường dẫn.',
  })
  @ApiBody({ type: CreateTaskDocumentLinkDto })
  @ApiResponse({ status: 201, description: 'Gắn link tài liệu thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @RequireTaskDocumentLinkPermission(TaskDocumentLinkAction.CREATE)
  @Post()
  async create(@Body() dto: CreateTaskDocumentLinkDto, @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.user || req?.user?.sub || req?.user?.id || 'UnknownUser';
    const userName = req?.user?.name || req?.user?.username || '';
    const ipAddress = req?.socket?.remoteAddress || 'Unknown';

    if (!userId || userId === 'UnknownUser') {
      throw new BadRequestException('Không tìm thấy thông tin người dùng.');
    }

    try {
      const data = await this.taskDocumentLinkService.create(dto, userId, userName);

      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Tài liệu công việc: Gắn link tài liệu "${dto.documentName}" vào công việc ${dto.taskId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: 'TASK_DOCUMENT_LINK',
          subType: 'CREATE',
          userInfo: userId || "",
          ipAddress,
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi khi ghi log (CREATE):', logError.message);
      }

      try {
        let details = '';
        if (dto.objectType === 'taskdocuments') {
          details = 'Thêm mới link công việc';
        } else if (dto.objectType === 'finaldocuments') {
          details = 'Thêm mới link kết quả công việc';
        }

        await this.systemLogTaskServiceSql.create({
          actions: 'POST',
          details,
          userInfo: userId,
          timestamps: new Date().toISOString(),
          taskId: String(dto.taskId),
        });
      } catch (logError) {
        console.error('Lỗi khi ghi log task SQL (CREATE):', logError.message);
      }

      return {
        status: 1,
        message: 'Gắn link tài liệu thành công.',
        data,
      };
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lỗi: Tài liệu công việc: Gắn link tài liệu "${dto.documentName}" vào công việc ${dto.taskId} - ${error.message}`,
          method: 'POST',
          status: 'ERROR',
          type: 'TASK_DOCUMENT_LINK',
          subType: 'CREATE',
          userInfo: userId || "",
          ipAddress,
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi khi ghi log ERROR (CREATE):', logError.message);
      }
      throw error;
    }
  }

  // ========== LẤY DANH SÁCH LINK TÀI LIỆU THEO CÔNG VIỆC ==========

  @ApiOperation({
    summary: 'Lấy danh sách link tài liệu theo công việc',
    description: 'Lấy tất cả link tài liệu đã gắn vào một công việc.',
  })
  @ApiQuery({ name: 'taskId', description: 'ID công việc', required: true, type: String })
  @ApiQuery({ name: 'objectType', description: 'Loại đối tượng (task, project, meeting, document...)', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  @RequireTaskDocumentLinkPermission(TaskDocumentLinkAction.VIEW)
  @Get()
  async findByTaskId(
    @Query('taskId') taskId: string,
    @Query('objectType') objectType?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Req() req?: any,
  ) {
    if (!taskId) {
      throw new BadRequestException('ID công việc không được để trống.');
    }

    const userId = req?.user?.userId || req?.user?.user || req?.user?.sub || req?.user?.id || 'UnknownUser';
    const ipAddress = req?.socket?.remoteAddress || 'Unknown';

    try {
      const result = await this.taskDocumentLinkService.findByTaskId(
        taskId,
        page,
        limit,
        objectType,
        userId,
      );

      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Tài liệu công việc: Lấy danh sách link tài liệu của công việc ${taskId}`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'TASK_DOCUMENT_LINK',
          subType: 'LIST',
          userInfo: userId,
          ipAddress,
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi khi ghi log (LIST):', logError.message);
      }

      return { status: 1, ...result };
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Tài liệu công việc: Lấy danh sách link tài liệu của công việc ${taskId} - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'TASK_DOCUMENT_LINK',
          subType: 'LIST',
          userInfo: userId,
          ipAddress,
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi khi ghi log ERROR (LIST):', logError.message);
      }
      throw error;
    }
  }

  // ========== LẤY CHI TIẾT LINK TÀI LIỆU ==========

  /*
  @ApiOperation({ summary: 'Lấy chi tiết link tài liệu' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  @RequireTaskDocumentLinkPermission(TaskDocumentLinkAction.VIEW)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.user || req?.user?.sub || req?.user?.id || 'UnknownUser';
    const ipAddress = req?.socket?.remoteAddress || 'Unknown';

    try {
      const data = await this.taskDocumentLinkService.findOne(id);

      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Tài liệu công việc: Xem chi tiết link tài liệu ID ${id}`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'TASK_DOCUMENT_LINK',
          subType: 'DETAIL',
          userInfo: userId,
          ipAddress,
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi khi ghi log (DETAIL):', logError.message);
      }

      return { status: 1, data };
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Tài liệu công việc: Xem chi tiết link tài liệu ID ${id} - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'TASK_DOCUMENT_LINK',
          subType: 'DETAIL',
          userInfo: userId,
          ipAddress,
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi khi ghi log ERROR (DETAIL):', logError.message);
      }
      throw error;
    }
  }
  */

  // ========== CẬP NHẬT LINK TÀI LIỆU ==========

  @ApiOperation({ summary: 'Cập nhật link tài liệu' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateTaskDocumentLinkDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  @RequireTaskDocumentLinkPermission(TaskDocumentLinkAction.UPDATE)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDocumentLinkDto,
    @Req() req: any,
  ) {
    const userId = req?.user?.userId || req?.user?.user || req?.user?.sub || req?.user?.id || 'UnknownUser';
    const ipAddress = req?.socket?.remoteAddress || 'Unknown';

    try {
      const data = await this.taskDocumentLinkService.update(id, dto);

      try {
        await this.systemLogService.createLogFromSystem({
          action: 'PATCH',
          details: `Tài liệu công việc: Cập nhật link tài liệu ID ${id}`,
          method: 'PATCH',
          status: 'SUCCESS',
          type: 'TASK_DOCUMENT_LINK',
          subType: 'UPDATE',
          userInfo: userId,
          ipAddress,
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi khi ghi log (UPDATE):', logError.message);
      }

      return { status: 1, message: 'Cập nhật link tài liệu thành công.', data };
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'PATCH',
          details: `Lỗi: Tài liệu công việc: Cập nhật link tài liệu ID ${id} - ${error.message}`,
          method: 'PATCH',
          status: 'ERROR',
          type: 'TASK_DOCUMENT_LINK',
          subType: 'UPDATE',
          userInfo: userId,
          ipAddress,
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi khi ghi log ERROR (UPDATE):', logError.message);
      }
      throw error;
    }
  }

  // ========== XÓA LINK TÀI LIỆU ==========

  @ApiOperation({ summary: 'Xóa nhiều link tài liệu' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { ids: { type: 'array', items: { type: 'number' }, example: [1, 2, 3] } },
      required: ['ids'],
    },
  })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @RequireTaskDocumentLinkPermission(TaskDocumentLinkAction.DELETE)
  @Delete('bulk/remove')
  async removeMany(@Body('ids') ids: number[], @Req() req: any) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Danh sách ID không được để trống.');
    }

    const userId = req?.user?.userId || req?.user?.user || req?.user?.sub || req?.user?.id || 'UnknownUser';
    const ipAddress = req?.socket?.remoteAddress || 'Unknown';

    try {
      const result = await this.taskDocumentLinkService.removeMany(ids);

      try {
        await this.systemLogService.createLogFromSystem({
          action: 'DELETE',
          details: `Tài liệu công việc: Xóa nhiều link tài liệu [${ids.join(', ')}]`,
          method: 'DELETE',
          status: 'SUCCESS',
          type: 'TASK_DOCUMENT_LINK',
          subType: 'BULK_DELETE',
          userInfo: userId,
          ipAddress,
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi khi ghi log (BULK_DELETE):', logError.message);
      }

      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'DELETE',
          details: `Lỗi: Tài liệu công việc: Xóa nhiều link tài liệu [${ids.join(', ')}] - ${error.message}`,
          method: 'DELETE',
          status: 'ERROR',
          type: 'TASK_DOCUMENT_LINK',
          subType: 'BULK_DELETE',
          userInfo: userId,
          ipAddress,
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi khi ghi log ERROR (BULK_DELETE):', logError.message);
      }
      throw error;
    }
  }

  @ApiOperation({ summary: 'Xóa link tài liệu khỏi công việc' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  @RequireTaskDocumentLinkPermission(TaskDocumentLinkAction.DELETE)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.user || req?.user?.sub || req?.user?.id || 'UnknownUser';
    const ipAddress = req?.socket?.remoteAddress || 'Unknown';

    try {
      const linkEntity = await this.taskDocumentLinkService.findOne(id);
      const result = await this.taskDocumentLinkService.remove(id);

      try {
        await this.systemLogService.createLogFromSystem({
          action: 'DELETE',
          details: `Tài liệu công việc: Xóa link tài liệu ID ${id}`,
          method: 'DELETE',
          status: 'SUCCESS',
          type: 'TASK_DOCUMENT_LINK',
          subType: 'DELETE',
          userInfo: userId,
          ipAddress,
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi khi ghi log (DELETE):', logError.message);
      }

      try {
        let details = '';
        if (linkEntity.objectType === 'taskdocuments') {
          details = 'Xóa link công việc';
        } else if (linkEntity.objectType === 'finaldocuments') {
          details = 'Xóa link kết quả công việc';
        }

        await this.systemLogTaskServiceSql.create({
          actions: 'DELETE',
          details,
          userInfo: userId,
          timestamps: new Date().toISOString(),
          taskId: String(linkEntity.taskId),
        });
      } catch (logError) {
        console.error('Lỗi khi ghi log task SQL (DELETE):', logError.message);
      }

      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'DELETE',
          details: `Lỗi: Tài liệu công việc: Xóa link tài liệu ID ${id} - ${error.message}`,
          method: 'DELETE',
          status: 'ERROR',
          type: 'TASK_DOCUMENT_LINK',
          subType: 'DELETE',
          userInfo: userId,
          ipAddress,
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi khi ghi log ERROR (DELETE):', logError.message);
      }
      throw error;
    }
  }
}
