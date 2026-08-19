import {
  Controller,
  Get,
  Query,
  Post,
  Res,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { SystemLogServiceSql } from './system-log-service-sql';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QueryParams } from 'src/interfaces';
import { UserLogHelper } from 'src/documents/helpers/user-log.helper';
import { ReturnError } from 'src/utils/util';
import { FindSystemLogDto } from './find-system-log.dto';
import { JwtAuthGuard } from 'src/oauth/jwt.guard';
import { AdminGuard } from 'src/users/guards/admin.guard';

@ApiTags('System Logs (SQL)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('system-logs-sql')
export class SystemLogControllerSql {
  constructor(
    private readonly systemLogService: SystemLogServiceSql,
    private readonly userLogHelper: UserLogHelper,
  ) { }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách system log (phân trang, lọc, sắp xếp)' })
  async list(
    @Query() queryParams: FindSystemLogDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      try {
        const userInfo = req?.user?.userId;
        const ipAddress = req?.socket?.remoteAddress || 'Unknown';
        // const userInfo = await this.userLogHelper.getUserLogInfo(req.user?.userId, req);
        this.logAction(userInfo, ipAddress, 'GET', `Truy cập danh sách log hệ thống`);
      } catch (error) {
        // Bỏ qua lỗi ghi log để không ảnh hưởng đến chức năng chính
      }
      const data = await this.systemLogService.findAll(queryParams);
      return res.status(HttpStatus.OK).json({
        success: true,
        ...data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  @Get('log-form-task')
  @ApiOperation({ summary: 'Lấy danh sách system log (phân trang, lọc, sắp xếp)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng trên một trang' })
  @ApiQuery({ name: 'filter', required: false, type: String, description: 'Lọc theo các trường, ví dụ: `{"userName": "phogiamdoc"}`' })
  @ApiQuery({ name: 'sort', required: false, type: String, description: 'Sắp xếp theo trường, ví dụ: timestamp,DESC' })
  async listTask(
    @Query() queryParams: QueryParams,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      try {
        const userInfo = req?.user?.userId;
        const ipAddress = req?.socket?.remoteAddress || 'Unknown';
        // const userInfo = await this.userLogHelper.getUserLogInfo(req.user?.userId, req);
        this.logAction(userInfo, ipAddress, 'GET', `Truy cập danh sách log hệ thống`);
      } catch (error) {
        // Bỏ qua lỗi ghi log để không ảnh hưởng đến chức năng chính
      }
      const data = await this.systemLogService.findAllLogTask(queryParams);
      return res.status(HttpStatus.OK).json({
        success: true,
        ...data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }


  // @Post('sync-from-mongo')
  // @ApiOperation({ summary: 'Đồng bộ dữ liệu system log từ MongoDB sang SQL' })
  // @ApiResponse({
  //   status: 200, description: 'Đồng bộ thành công.', schema: {
  //     properties: {
  //       success: { type: 'boolean', example: true },
  //       message: { type: 'string', example: 'Đồng bộ hoàn tất.' },
  //       data: { type: 'object', properties: { total: { type: 'number' }, synced: { type: 'number' }, errors: { type: 'array', items: { type: 'object' } } } }
  //     }
  //   }
  // })
  // @ApiResponse({ status: 500, description: 'Lỗi server khi đồng bộ.' })
  // async syncFromMongo(@Res() res: Response) {
  //   try {
  //     const result = await this.systemLogService.syncFromMongo();
  //     return res.status(HttpStatus.OK).json({
  //       success: true,
  //       message: 'Đồng bộ hoàn tất.',
  //       data: result,
  //     });
  //   } catch (error) {
  //     const errorResponse = ReturnError(error);
  //     return res.status(errorResponse.status).json(errorResponse.body);
  //   }
  // }

  private async logAction(
    userInfo: any,
    ipAddress: string,
    action: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    details: string,
  ) {
    try {
      await this.systemLogService.createLogFromSystem({
        action,
        details,
        method: action,
        status: 'SUCCESS',
        type: 'SYSTEM_LOG_ADMIN',
        subType: 'SYSTEM_LOG_ADMIN',
        userInfo,
        ipAddress,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to log admin action: ${details}`, error);
    }
  }
}