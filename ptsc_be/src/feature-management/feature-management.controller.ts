import {
  Controller,
  Inject,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { FeatureManagementService } from './feature-management.service';
import { FeatureManagementEntity, FeatureType } from './feature-management.entity';
import { ReturnError } from '../utils/util';
import {
  CreateFeatureManagementDto,
  updateFeatureManagementDto,
} from './feature-management.validation';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { UserLogHelper } from 'src/documents/helpers/user-log.helper';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from 'src/users/guards/admin.guard';
import { JwtAuthGuard } from 'src/oauth/jwt.guard';
import { UseGuards } from '@nestjs/common';
import { checkAdminPermission } from 'src/common/guards/admin-check.helper';


@ApiTags('Quản lý Tính năng')
@Controller('feature-management')
@UseGuards(JwtAuthGuard)
export class FeatureManagementController {
  constructor(
    private readonly FeatureManagementService: FeatureManagementService,
    private readonly systemLogService: SystemLogServiceSql,
    private readonly userLogHelper: UserLogHelper,
  ) { }

  @Get()
  @UseGuards(AdminGuard)
  async list(
    @Req() req: any,
    @Query() queryParams: Record<string, string>,
    @Res() res: Response,
  ) {
    try {
      const result = await this.FeatureManagementService.findAll(queryParams, req?.user?.userId);

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: queryParams.processID
          ? `Truy cập danh sách quản lý tính năng theo quy trình [${queryParams.processID}]`
          : `Truy cập danh sách quản lý tính năng`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'FEATURE_MANAGEMENT',
        subType: 'FEATURE_MANAGEMENT',
        userInfo: req?.user?.userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Truy cập danh sách quản lý tính năng${queryParams.processID ? ` theo quy trình [${queryParams.processID}]` : ''} - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'FEATURE_MANAGEMENT',
        subType: 'FEATURE_MANAGEMENT',
        userInfo: req?.user?.userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('not-filter')
  @UseGuards(AdminGuard)
  async listNotFilter(
    @Res() res: Response, @Req() req: any,
  ) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách quản lý tính năng (không lọc)`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'FEATURE_MANAGEMENT',
        subType: 'FEATURE_MANAGEMENT',
        userInfo: req?.user?.userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      const result = await this.FeatureManagementService.findAllNotFilter();

      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  @Get('only-popup-and-form')
  @UseGuards(AdminGuard)
  async listOnlyPopupAndForm(
    @Req() req: any,
    @Query() queryParams: Record<string, string>,
    @Res() res: Response,
  ) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách tính năng (chỉ popup và form)`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'FEATURE_MANAGEMENT',
        subType: 'FEATURE_MANAGEMENT',
        userInfo: req?.user?.userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      const { data } = await this.FeatureManagementService.findOnlyPopupAndForm(queryParams);

      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('dynamicForm')
  @UseGuards(AdminGuard)
  async dynamicForm(
    @Req() req: any,
    @Query() queryParams: Record<string, string>,
    @Res() res: Response,
  ) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập dynamic form`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'FEATURE_MANAGEMENT',
        subType: 'FEATURE_MANAGEMENT',
        userInfo: req?.user?.userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      const result = await this.FeatureManagementService.findAllDynamicForm(queryParams);

      return res.status(HttpStatus.OK).json({
        success: true,
        ...result,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('listParent')
  @UseGuards(AdminGuard)
  async listParent(@Res() res: Response, @Req() req: any) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách tính năng cha`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'FEATURE_MANAGEMENT',
        subType: 'FEATURE_MANAGEMENT',
        userInfo: req?.user?.userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      const result = await this.FeatureManagementService.listParent()
      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  async detail(@Param('id') id: string, @Res() res: Response, @Req() req: any) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);

      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Xem chi tiết tính năng ID: [${id}]`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'FEATURE_MANAGEMENT',
        subType: 'FEATURE_MANAGEMENT',
        userInfo: req?.user?.userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      const result = await this.FeatureManagementService.findById(id);

      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  @Get('find-by-code/:code')
  // @UseGuards(AdminGuard)
  async detailByCode(
    @Param() param: any,
    @Req() req: Request,
    @Res() res: Response,
    @Query('checkSubtab') checkSubtab?: string,
  ) {
    try {
      const userId = (req as any).user?.userId;
      // const userInfo = await this.userLogHelper.getUserLogInfo(userId, req);
      // await this.systemLogService.createLogFromSystem({
      //   action: 'GET',
      //   details: `Xem chi tiết tính năng theo code: [${param.code}]`,
      //   method: 'GET',
      //   status: 'SUCCESS',
      //   type: 'FEATURE_MANAGEMENT',
      //   subType: 'FEATURE_MANAGEMENT',
      //   userInfo: userId,
      //   ipAddress: (req as any)?.ip || (req as any)?.connection?.remoteAddress || 'Unknown',
      //   timestamp: new Date().toISOString(),
      // });

      const result = await this.FeatureManagementService.findByCode(param.code, userId, undefined, Boolean(checkSubtab));

      const isAdmin = await checkAdminPermission(userId).catch(() => false);
      if (result && typeof result === 'object') {
        (result as any).isAdmin = isAdmin;
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Post()
  @UseGuards(AdminGuard)
  async create(@Body() data: CreateFeatureManagementDto, @Res() res: Response, @Req() req: any) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Tạo mới tính năng: ${data.name} (${data.code})`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'FEATURE_MANAGEMENT',
        subType: 'FEATURE_MANAGEMENT',
        userInfo: req?.user?.userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      const result = await this.FeatureManagementService.create(data);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async update(
    @Body() data: updateFeatureManagementDto,
    @Param('id') id: string,
    @Res() res: Response, @Req() req: any,
  ) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'PUT',
        details: `Cập nhật tính năng ID: [${id}]`,
        method: 'PUT',
        status: 'SUCCESS',
        type: 'FEATURE_MANAGEMENT',
        subType: 'FEATURE_MANAGEMENT',
        userInfo: req?.user?.userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      const result = await this.FeatureManagementService.updateById(id, data);

      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async delete(@Param('id') id: string, @Res() res: Response, @Req() req: any) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Xóa tính năng ID: [${id}]`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: 'FEATURE_MANAGEMENT',
        subType: 'FEATURE_MANAGEMENT',
        userInfo: req?.user?.userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      await this.FeatureManagementService.deleteById(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Xóa thành công!',
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Delete('')
  @UseGuards(AdminGuard)
  async deleteMany(
    @Body('ids') ids: Partial<FeatureManagementEntity>,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo((req.user as any).userId, req);

      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Xóa nhiều tính năng: [${(ids as any[]).join(', ')}]`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: 'FEATURE_MANAGEMENT',
        subType: 'FEATURE_MANAGEMENT',
        userInfo: (req as any)?.user?.userId,
        ipAddress: (req as any)?.ip || (req as any)?.connection?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Danh sách ID không hợp lệ',
        });
      }

      await this.FeatureManagementService.deleteManyByIds(ids);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Xóa thành công!',
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  // @Post('sync-from-mongo')
  // async syncFromMongo(@Res() res: Response, @Req() req: any) {
  //   try {
  //     // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
  //     await this.systemLogService.createLogFromSystem({
  //       action: 'POST',
  //       details: `Bắt đầu đồng bộ dữ liệu Feature Management từ MongoDB sang SQL Server`,
  //       method: 'POST',
  //       status: 'SUCCESS',
  //       type: 'FEATURE_MANAGEMENT_SYNC',
  //       subType: 'FEATURE_MANAGEMENT_SYNC',
  //       userInfo: req?.user?.userId,
  //       ipAddress: req?.socket?.remoteAddress || 'Unknown',
  //       timestamp: new Date().toISOString(),
  //     });

  //     const result = await this.FeatureManagementService.syncFromMongo();
  //     return res.status(HttpStatus.OK).json({ success: true, data: result });
  //   } catch (error) {
  //     const errorResponse = ReturnError(error);
  //     return res.status(errorResponse.status).json(errorResponse.body);
  //   }
  // }
}
