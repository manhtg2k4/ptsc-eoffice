import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  ParseIntPipe,
  Req,
  Put,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  CreateNotificationDto,
  DeleteNotificationBulkDto,
} from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { UserLogHelper } from 'src/documents/helpers/user-log.helper';
import { SavePushTokenDto } from './dto/save-push-token.dto';
import { OutMobilePushNotifyDto } from './dto/out-mobile-push-notify.dto';

@ApiTags('Quản lý Thông báo')
@ApiBearerAuth() // Yêu cầu xác thực cho tất cả các API trong controller này
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly systemLogService: SystemLogServiceSql,
    private readonly userLogHelper: UserLogHelper,
  ) { }

  private extractBearerToken(req: any): string {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      return '';
    }

    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }

    return authHeader.trim();
  }

  @ApiOperation({
    summary: 'Đánh dấu tất cả thông báo đã đọc',
    description: 'Đánh dấu tất cả thông báo của người dùng hiện tại là đã đọc',
  })
  @ApiResponse({
    status: 200,
    description: 'Đánh dấu thành công',
  })
  @Patch('mark-all-read')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user?.userId;
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'UPDATE',
        details: `Đánh dấu tất cả thông báo đã đọc cho người dùng: ${userId}`,
        method: 'PATCH',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    const result = await this.notificationService.markAllAsRead(userId);
    return result;
  }

  @ApiOperation({
    summary: 'Lưu push token mobile',
    description: 'Upsert push token cho user hiện tại sau khi mobile login thành công',
  })
  @ApiBody({
    type: SavePushTokenDto,
    description: 'Push token gửi từ mobile app',
  })
  @ApiResponse({
    status: 200,
    description: 'Lưu push token thành công',
  })
  @Post('save-push-token')
  async savePushToken(
    @Body(new ValidationPipe({ transform: true })) body: SavePushTokenDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    const authToken = this.extractBearerToken(req);
    return this.notificationService.savePushTokenFromLogin(userId, body, authToken);
  }

  @ApiOperation({
    summary: 'Disable push token khi logout',
    description: 'Tắt push token mobile hiện tại để không tiếp tục nhận push sau khi logout',
  })
  @ApiBody({
    type: OutMobilePushNotifyDto,
    description: 'Push token cần disable',
  })
  @ApiResponse({
    status: 200,
    description: 'Disable push token thành công',
  })
  @Post('out-mobile-push-notify')
  async outMobilePushNotify(
    @Body(new ValidationPipe({ transform: true })) body: OutMobilePushNotifyDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    return this.notificationService.disablePushTokenWhenLogout(userId, body.pushToken);
  }

  @ApiOperation({
    summary: 'Lấy trạng thái sử dụng push notification',
    description: 'Trả về user hiện tại có đang bật nhận thông báo đẩy hay không',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy trạng thái thành công',
  })
  @ApiQuery({
    name: 'pushToken',
    required: true,
    type: String,
    description: 'Push token can kiem tra trang thai',
  })
  @Get('out-mobile-push-notify')
  async getMobilePushNotifyStatus(
    @Req() req: any,
    @Query('pushToken') pushToken: string,
  ) {
    const userId = req.user?.userId;
    return this.notificationService.getPushNotifyStatus(userId, pushToken);
  }

  @Put('out-mobile-push-notify')
  async outMobilePushNotifyCompat(
    @Body(new ValidationPipe({ transform: true })) body: OutMobilePushNotifyDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    return this.notificationService.updatePushTokenUsage(userId, body.pushToken, body.inUse);
  }

  // @ApiOperation({
  //   summary: 'Tạo thông báo',
  //   description: 'Tạo mới một thông báo gửi tới người nhận',
  // })
  // @ApiBody({
  //   type: CreateNotificationDto,
  //   description: 'Dữ liệu thông báo',
  // })
  // @ApiResponse({
  //   status: 201,
  //   description: 'Tạo thông báo thành công',
  // })
  // @Post()
  // async create(
  //   @Body() createNotificationDto: CreateNotificationDto,
  //   @Req() req: any,
  // ) {
  //   const userId = req?.user?.userId;
  //   try {
  //     // const userInfo = await this.userLogHelper.getUserLogInfo(
  //     //   req?.user?.userId,
  //     //   req,
  //     // );
  //     await this.systemLogService.createLogFromSystem({
  //       action: 'CREATE',
  //       details: `Tạo thông báo mới cho người nhận: ${createNotificationDto.recipientId}`,
  //       method: 'POST',
  //       status: 'SUCCESS',
  //       type: process.env.CLIENT_LOG || 'DHVBTC',
  //       subType: process.env.CLIENT_LOG || 'DHVBTC',
  //       userInfo: userId,
  //       ipAddress: req?.socket?.remoteAddress || 'Unknown',
  //       timestamp: new Date().toISOString(),
  //     });
  //   } catch (error) {
  //     console.error('Lỗi ghi log:', error);
  //   }
  //   const result = await this.notificationService.create({
  //     ...createNotificationDto,
  //     senderId: userId,
  //   });
  //   return result;
  // }

  @ApiOperation({
    summary: 'Lấy danh sách thông báo',
    description: 'Lấy danh sách thông báo của người dùng hiện tại',
  })
  @ApiQuery({
    name: 'page',
    description: 'Trang hiện tại',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Số lượng kết quả trên trang',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'isRead',
    description: 'Bộ lọc đã đọc (true, false)',
    required: false,
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  @Get()
  async findAll(
    @Req() req, // Lấy request object
    @Query(new ValidationPipe({ transform: true })) query: QueryNotificationDto,
  ) {
    const userId = req.user?.userId;
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Xem danh sách thông báo`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    const result = await this.notificationService.findAll(userId, query);
    return result;
  }

  @ApiOperation({
    summary: 'Lấy chi tiết thông báo',
    description: 'Lấy thông tin chi tiết của một thông báo theo ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của thông báo',
    required: true,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy thông báo',
  })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req?.user?.userId;
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(
      //   req?.user?.userId,
      //   req,
      // );
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Xem chi tiết thông báo ID: ${id}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    const result = await this.notificationService.findOne(id, userId);
    return result;
  }


  @ApiOperation({
    summary: 'Cập nhật thông báo',
    description: 'Cập nhật thông tin thông báo',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của thông báo',
    required: true,
    type: Number,
  })
  @ApiBody({
    type: UpdateNotificationDto,
    description: 'Dữ liệu cập nhật thông báo',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy thông báo',
  })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNotificationDto: UpdateNotificationDto,
    @Req() req: any,
  ) {
    const userId = req?.user?.userId;
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(
      //   req?.user?.userId,
      //   req,
      // );
      await this.systemLogService.createLogFromSystem({
        action: 'UPDATE',
        details: `Cập nhật thông báo ID: ${id}`,
        method: 'PATCH',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    const result = await this.notificationService.update(
      id,
      updateNotificationDto,
      userId,
    );
    return result;
  }

  @ApiOperation({
    summary: 'Xóa nhiều thông báo',
    description: 'Xóa danh sách thông báo theo mảng ID',
  })
  @ApiBody({
    type: DeleteNotificationBulkDto,
    description: 'Danh sách ID thông báo cần xóa',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  @Delete('bulk')
  async removeBulk(@Body() deleteDto: DeleteNotificationBulkDto, @Req() req: any) {
    const userId = req.user?.userId;
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Xóa nhiều thông báo, số lượng: ${deleteDto.ids?.length}`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    const result = await this.notificationService.removeMultiple(deleteDto.ids, userId);
    return result;
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req?.user?.userId;
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(
      //   req?.user?.userId,
      //   req,
      // );

      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Xóa thông báo ID: ${id}`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    const result = await this.notificationService.remove(id, userId);
    return result;
  }

}
