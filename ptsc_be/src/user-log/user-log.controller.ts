// src/user-log/user-log.controller.ts
import { Body, Controller, Get, Post, Query, Req, Res, HttpStatus, HttpException, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { UserLogService } from './user-log.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Response } from 'express';

@ApiTags('Quản lý Nhật ký người dùng')
@Controller('user-logs')
export class UserLogController {
  private readonly URL_CONFIG_TIME = process.env.URL_CONFIG_TIME;

  constructor(
    private readonly userLogService: UserLogService,
    private readonly httpService: HttpService,
  ) {
    if (!this.URL_CONFIG_TIME) throw new Error("Biến môi trường 'URL_CONFIG_TIME' chưa được cấu hình.");
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách nhật ký người dùng',
    description: 'Lấy danh sách nhật ký hoạt động của người dùng với hỗ trợ phân trang và lọc',
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
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  async getLogs(@Query() query: any) {
    return this.userLogService.findAllLogs(query);
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo mới nhật ký người dùng',
    description: 'Ghi lại hoạt động của người dùng vào nhật ký',
  })
  @ApiBody({
    type: Object,
    description: 'Dữ liệu nhật ký',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  async createLog(@Body() body: any, @Req() req: Request) {
    const ip = req.socket.remoteAddress;

    return this.userLogService.createLog({
      ...body,
      ip,
    });
  }

  @Get('cleanup/configuration')
  @ApiOperation({
    summary: 'Lấy cấu hình dọn dẹp nhật ký',
    description: 'Lấy thông tin cấu hình về thời gian và cách thức dọn dẹp nhật ký cũ',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy cấu hình thành công',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi máy chủ',
  })
  async getCleanupConfiguration() {
    if (!this.URL_CONFIG_TIME) {
      throw new HttpException(
        "URL cấu hình dọn dẹp log chưa được thiết lập.",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.URL_CONFIG_TIME),
      );
      return response.data;
    } catch (error) {
      const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.response?.data || 'Lỗi khi gọi API cấu hình';
      throw new HttpException(message, status);
    }
  }

  @Put('cleanup')
  @ApiOperation({
    summary: 'Dọn dẹp nhật ký người dùng',
    description: 'Thực hiện dọn dẹp nhật ký cũ theo cấu hình được chỉ định',
  })
  @ApiBody({
    type: Object,
    description: 'Cấu hình dọn dẹp',
  })
  @ApiResponse({
    status: 200,
    description: 'Dọn dẹp thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi máy chủ',
  })
  async cleanupLogs(
    @Body() body: any,
  ) {
    if (!this.URL_CONFIG_TIME) {
      throw new HttpException(
        "URL cấu hình dọn dẹp log chưa được thiết lập.",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    try {
      const response = await firstValueFrom(
        this.httpService.put(this.URL_CONFIG_TIME, body),
      );
      return response.data;
    } catch (error) {
      const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.response?.data || 'Lỗi khi gọi API cấu hình';
      throw new HttpException(message, status);
    }
  }
}
