import {
  Controller,
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
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { OrganizationUnitService } from './organization-unit.service';
import {
  CreateOrganizationUnitDto,
  UpdateOrganizationUnitDto,
} from './organization-unit.dto';
import { ReturnError } from '../utils/util';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { UserLogHelper } from 'src/documents/helpers/user-log.helper';

@ApiTags('Quản lý Đơn vị Tổ chức')
@Controller('organization-units-mg')
export class OrganizationUnitController {
  constructor(
    private readonly organizationService: OrganizationUnitService,
    private readonly systemLogService: SystemLogServiceSql,
    private readonly userLogHelper: UserLogHelper,
  ) { }

  @Post()
  @ApiOperation({
    summary: 'Tạo mới đơn vị tổ chức',
    description: 'Tạo mới một đơn vị tổ chức trong hệ thống',
  })
  @ApiBody({
    type: CreateOrganizationUnitDto,
    description: 'Dữ liệu đơn vị tổ chức',
  })
  @ApiResponse({
    status: 200,
    description: 'Tạo thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  async create(
    @Body() createDto: CreateOrganizationUnitDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Tạo mới đơn vị ${createDto.name} (${createDto.code})`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'ORGANIZATION_UNIT',
        subType: 'ORGANIZATION_UNIT',
        userInfo: req?.user?.userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      const data = await this.organizationService.create(createDto);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      if (data.success === false) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: data.message,
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
  @ApiOperation({
    summary: 'Lấy danh sách đơn vị tổ chức',
    description: 'Lấy danh sách tất cả đơn vị tổ chức với hỗ trợ phân trang và tìm kiếm',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Số trang',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Số bản ghi trên một trang',
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: false,
    description: 'Từ khóa tìm kiếm',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  async list(
    @Req() req: any,
    @Query() queryParams: Record<string, string>,
    @Res() res: Response,
  ) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách đơn vị`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'ORGANIZATION_UNIT',
        subType: 'ORGANIZATION_UNIT',
        userInfo: req?.user?.userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      const data = await this.organizationService.findAll(queryParams);
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

  @Get('all')
  async listAll(
    @Req() req: any,
    @Query() queryParams: Record<string, string>,
    @Res() res: Response,
  ) {
    try {
      const data = await this.organizationService.findAllActive(queryParams);
      return res.status(HttpStatus.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Đã xảy ra lỗi khi lấy danh sách phòng ban.',
        error: error.message,
      });
    }
  }

  @Post('delete-multiple')
  async deleteMultiple(
    @Body('ids') ids: string[],
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Danh sách ID không hợp lệ',
        });
      }

      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Xóa nhiều đơn vị: [${ids.join(', ')}]`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'ORGANIZATION_UNIT',
        subType: 'ORGANIZATION_UNIT',
        userInfo: req?.user?.userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      const isDeleted = await this.organizationService.deleteManyByIds(ids);
      return res.status(HttpStatus.OK).json({
        success: isDeleted,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Xem chi tiết đơn vị ID: [${id}]`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'ORGANIZATION_UNIT',
        subType: 'ORGANIZATION_UNIT',
        userInfo: req?.user?.userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      const data = await this.organizationService.findById(id);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Không tìm thấy đơn vị hoặc đơn vị không hoạt động.',
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data: data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  @Get('update/:id')
  async findByIdUpdate(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const data = await this.organizationService.findByIdUpdate(id);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Không tìm thấy đơn vị hoặc đơn vị không hoạt động.',
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data: data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrganizationUnitDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Cập nhật đơn vị ID: [${id}]`,
        method: 'PATCH',
        status: 'SUCCESS',
        type: 'ORGANIZATION_UNIT',
        subType: 'ORGANIZATION_UNIT',
        userInfo: req?.user?.userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      const data = await this.organizationService.update(id, updateDto);
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
  async remove(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Xóa đơn vị ID: [${id}]`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: 'ORGANIZATION_UNIT',
        subType: 'ORGANIZATION_UNIT',
        userInfo: req?.user?.userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      await this.organizationService.delete(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Đơn vị với ID ${id} đã được xóa`,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Lỗi server',
      });
    }
  }
}