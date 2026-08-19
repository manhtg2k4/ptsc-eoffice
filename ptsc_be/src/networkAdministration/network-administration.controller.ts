import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth, ApiExcludeController } from '@nestjs/swagger';
import { NetworkAdministrationService } from './network-administration.service';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { UserLogHelper } from 'src/documents/helpers/user-log.helper';
import { JwtAuthGuard } from 'src/oauth/jwt.guard';
import { AdminGuard } from 'src/users/guards/admin.guard';

@ApiTags('Quản trị Mạng')
@ApiExcludeController()
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('network-administration')
export class NetworkAdministrationController {
  constructor(
    private readonly networkAdministrationService: NetworkAdministrationService,
    private readonly systemLogService: SystemLogServiceSql,
    private readonly userLogHelper: UserLogHelper,
  ) { }

  /*
  @ApiOperation({
    summary: 'Thêm địa chỉ IP',
    description: 'Thêm mới danh sách địa chỉ IP vào hệ thống quản trị mạng',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ips: {
          type: 'array',
          items: { type: 'string' },
          description: 'Danh sách địa chỉ IP',
        },
        type: {
          type: 'string',
          description: 'Loại địa chỉ IP',
        },
      },
      required: ['ips', 'type'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Thêm địa chỉ IP thành công',
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ValidationPipe({ transform: true })) body: { ips: string[], type: string },
    @Req() req: any,
  ) {
    // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
    await this.systemLogService.createLogFromSystem({
      action: 'POST',
      details: `Thêm mới địa chỉ IP: [${body.ips.join(', ')}] với loại ${body.type}`,
      method: 'POST',
      status: 'SUCCESS',
      type: 'NETWORK_ADMINISTRATION',
      subType: 'NETWORK_ADMINISTRATION',
      userInfo: req?.user?.userId,
      ipAddress: req?.socket?.remoteAddress || 'Unknown',
      timestamp: new Date().toISOString(),
    });
    return this.networkAdministrationService.create(
      body,
    );
  }

  @ApiOperation({
    summary: 'Lấy danh sách địa chỉ IP',
    description: 'Lấy danh sách tất cả địa chỉ IP trong hệ thống quản trị mạng',
  })
  @ApiQuery({
    name: 'page',
    description: 'Trang hiện tại (mặc định: 1)',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Số lượng kết quả trên trang (mặc định: 25)',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'ip',
    description: 'Lọc theo địa chỉ IP',
    required: false,
  })
  @ApiQuery({
    name: 'type',
    description: 'Lọc theo loại địa chỉ IP',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  @Get()
  async findAll(
    @Query() query: { page?: string; limit?: string; ip?: string, type?: string },
    @Req() req: any,
  ) {
    // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
    await this.systemLogService.createLogFromSystem({
      action: 'GET',
      details: `Truy cập danh sách quản trị mạng`,
      method: 'GET',
      status: 'SUCCESS',
      type: 'NETWORK_ADMINISTRATION',
      subType: 'NETWORK_ADMINISTRATION',
      userInfo: req?.user?.userId,
      ipAddress: req?.socket?.remoteAddress || 'Unknown',
      timestamp: new Date().toISOString(),
    });
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '25', 10);
    const ip = query.ip;
    const type = query.type;
    return this.networkAdministrationService.findAll({ page, limit, ip, type });
  }

  @ApiOperation({
    summary: 'Lấy chi tiết địa chỉ IP',
    description: 'Lấy thông tin chi tiết của một địa chỉ IP theo ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của địa chỉ IP',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy địa chỉ IP',
  })
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
    await this.systemLogService.createLogFromSystem({
      action: 'GET',
      details: `Xem chi tiết quản trị mạng ID: [${id}]`,
      method: 'GET',
      status: 'SUCCESS',
      type: 'NETWORK_ADMINISTRATION',
      subType: 'NETWORK_ADMINISTRATION',
      userInfo: req?.user?.userId,
      ipAddress: req?.socket?.remoteAddress || 'Unknown',
      timestamp: new Date().toISOString(),
    });
    return this.networkAdministrationService.findOne(id);
  }

  @ApiOperation({
    summary: 'Cập nhật địa chỉ IP',
    description: 'Cập nhật địa chỉ IP từ giá trị cũ sang giá trị mới',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        oldIp: {
          type: 'string',
          description: 'Địa chỉ IP cũ',
        },
        newIp: {
          type: 'string',
          description: 'Địa chỉ IP mới',
        },
        type: {
          type: 'string',
          description: 'Loại địa chỉ IP',
        },
      },
      required: ['oldIp', 'newIp', 'type'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @Patch()
  async update(
    @Body() body: { oldIp: string; newIp: string; type: string },
    @Req() req: any,
  ) {
    const { oldIp, newIp, type } = body;
    // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
    await this.systemLogService.createLogFromSystem({
      action: 'PATCH',
      details: `Cập nhật địa chỉ IP từ [${oldIp}] thành [${newIp}]`,
      method: 'PATCH',
      status: 'SUCCESS',
      type: 'NETWORK_ADMINISTRATION',
      subType: 'NETWORK_ADMINISTRATION',
      userInfo: req?.user?.userId,
      ipAddress: req?.socket?.remoteAddress || 'Unknown',
      timestamp: new Date().toISOString(),
    });
    return this.networkAdministrationService.update(oldIp, {
      ip: newIp, type
    });
  }

  @ApiOperation({
    summary: 'Xóa địa chỉ IP',
    description: 'Xóa nhiều địa chỉ IP khỏi hệ thống quản trị mạng',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Danh sách ID cần xóa',
        },
      },
      required: ['ids'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  @Delete()
  @HttpCode(HttpStatus.OK)
  async remove(@Body() body: { ids: string[] }, @Req() req: any) {
    // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
    await this.systemLogService.createLogFromSystem({
      action: 'DELETE',
      details: `Xóa địa chỉ IP: [${body.ids.join(', ')}]`,
      method: 'DELETE',
      status: 'SUCCESS',
      type: 'NETWORK_ADMINISTRATION',
      subType: 'NETWORK_ADMINISTRATION',
      userInfo: req?.user?.userId,
      ipAddress: req?.socket?.remoteAddress || 'Unknown',
      timestamp: new Date().toISOString(),
    });
    return this.networkAdministrationService.remove(body.ids);
  }
  */
}