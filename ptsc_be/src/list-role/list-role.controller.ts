import { Controller, Put, UseGuards } from '@nestjs/common';
import {
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  Res,
  Query,
  Get,
  Req,
} from '@nestjs/common';
import { listRoleService } from './list-role.service';
import {
  CreatelistRoleDto,
  UpdateUserColumnConfigDto,
  UpdatelistRoleDto,
} from './list-role.dto';
import { ReturnError } from '../utils/util';
import { Response, Request } from 'express';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { UserLogHelper } from 'src/documents/helpers/user-log.helper';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/oauth/jwt.guard';
import { AdminGuard } from 'src/users/guards/admin.guard';

@ApiTags('Danh sách Vai trò')
@UseGuards(JwtAuthGuard)
@Controller('list-role')
export class listRoleController {
  constructor(
    private readonly listRoleService: listRoleService,
    private readonly systemLogService: SystemLogServiceSql,
    private readonly userLogHelper: UserLogHelper,
  ) { }

  @Post()
  @UseGuards(AdminGuard)
  async create(
    @Body() createlistRoleDto: CreatelistRoleDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(
      //   (req as any).user?.userId,
      //   req,
      // );
      const userInfo = (req as any)?.user?.userId;
      const ipAddress = (req as any)?.ip || (req as any)?.connection?.remoteAddress || 'Unknown';
      await this.logAction(
        userInfo,
        ipAddress,
        'POST',
        `Tạo mới vai trò: ${createlistRoleDto.name}`
      );

      const data = await this.listRoleService.create(createlistRoleDto);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get()
  @UseGuards(AdminGuard)
  async list(
    @Query() queryParams: Record<string, string>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(
      //   (req as any).user?.userId,
      //   req,
      // );
      const userInfo = (req as any)?.user?.userId;
      const ipAddress = (req as any)?.ip || (req as any)?.connection?.remoteAddress || 'Unknown';
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Truy cập danh sách vai trò`
      );

      const data = await this.listRoleService.findAll(queryParams);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        ...data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  async findById(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(
      //   (req as any).user?.userId,
      //   req,
      // );
      const userInfo = (req as any)?.user?.userId;
      const ipAddress = (req as any)?.ip || (req as any)?.connection?.remoteAddress || 'Unknown';
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Xem chi tiết vai trò ID: [${id}]`
      );

      const data = await this.listRoleService.findById(id);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data: data.data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatelistRoleDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(
      //   (req as any).user?.userId,
      //   req,
      // );
      const userInfo = (req as any)?.user?.userId;
      const ipAddress = (req as any)?.ip || (req as any)?.connection?.remoteAddress || 'Unknown';
      await this.logAction(
        userInfo,
        ipAddress,
        'PATCH',
        `Cập nhật vai trò ID: [${id}]`
      );

      const data = await this.listRoleService.update(id, updateDto);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  @Delete(':id')
  @UseGuards(AdminGuard)
  async removeById(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(
      //   (req as any).user?.userId,
      //   req,
      // );
      const userInfo = (req as any)?.user?.userId;
      const ipAddress = (req as any)?.ip || (req as any)?.connection?.remoteAddress || 'Unknown';
      await this.logAction(
        userInfo,
        ipAddress,
        'DELETE',
        `Xóa vai trò ID: [${id}]`
      );

      await this.listRoleService.delete(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Vai trò với ID ${id} đã được xóa.`,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Lỗi server.',
      });
    }
  }

  @Delete()
  @UseGuards(AdminGuard)
  async remove(@Body('ids') ids: string[], @Req() req: Request, @Res() res: Response) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(
      //   (req as any).user?.userId,
      //   req,
      // );
      const userInfo = (req as any)?.user?.userId;
      const ipAddress = (req as any)?.ip || (req as any)?.connection?.remoteAddress || 'Unknown';
      await this.logAction(
        userInfo,
        ipAddress,
        'DELETE',
        `Xóa nhiều vai trò: [${ids.join(', ')}]`
      );


      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Danh sách ID không hợp lệ',
        });
      }

      const isDeleted = await this.listRoleService.deleteManyByIds(ids);
      return res.status(HttpStatus.OK).json({
        success: isDeleted,
        message: isDeleted
          ? 'Các vai trò đã được xóa thành công.'
          : 'Xóa các vai trò không thành công.',
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  // API để lấy cấu hình cột
  @Get('config/columns')
  async getColumnConfig(
    @Query('codeModule') codeModule: string,
    @Req() req: Request, // Sử dụng @Req để lấy thông tin user từ token
    @Res() res: Response,
  ) {
    try {
      const userId = (req as any).user?._id;
      // const userInfo = await this.userLogHelper.getUserLogInfo(
      //   (req as any).user?.userId,
      //   req,
      // );
      const userInfo = (req as any)?.user?.userId;
      const ipAddress = (req as any)?.ip || (req as any)?.connection?.remoteAddress || 'Unknown';
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Lấy cấu hình cột cho module: ${codeModule}`
      );


      const data = await this.listRoleService.getColumnConfig(
        userId,
        codeModule,
      );
      return res.status(HttpStatus.OK).json({ success: true, data });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  // API để cập nhật cấu hình cột
  @Patch('config/columns')
  async updateColumnConfig(
    @Body() updateDto: UpdateUserColumnConfigDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = (req as any).user?._id;
      // const userInfo = await this.userLogHelper.getUserLogInfo(
      //   (req as any).user?.userId,
      //   req,
      // );
      const userInfo = (req as any)?.user?.userId;
      const ipAddress = (req as any)?.ip || (req as any)?.connection?.remoteAddress || 'Unknown';
      await this.logAction(
        userInfo,
        ipAddress,
        'PATCH',
        `Cập nhật cấu hình cột cho module: ${updateDto.codeModule}`
      );

      const data = await this.listRoleService.updateColumnConfig(userId, updateDto);
      return res.status(HttpStatus.OK).json({ success: true, data });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  private async logAction(userInfo: string, ipAddress: string, action: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', details: string) {
    try {
      await this.systemLogService.createLogFromSystem({
        action,
        details,
        method: action,
        status: 'SUCCESS',
        type: 'LIST_ROLE_MANAGEMENT',
        subType: 'LIST_ROLE_MANAGEMENT',
        userInfo,
        ipAddress,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to log action: ${details}`, error);
    }
  }
}
interface QueryParams {
  page?: string | number;
  limit?: string | number;
  sort?: string;
  [key: string]: any;
}

