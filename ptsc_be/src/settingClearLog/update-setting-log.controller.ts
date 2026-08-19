import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { SettingClearLogService } from './update-setting-log.service';
import { UpdateSettingClearLogDto } from './update-setting-log.dto';

@ApiTags('Cài đặt Xóa Nhật ký')
@Controller('setting-clear-log')
export class SettingClearLogController {
  constructor(private settingService: SettingClearLogService) { }

  @Get('detail-config')
  @ApiOperation({
    summary: 'Lấy cấu hình xóa nhật ký',
    description: 'Lấy thông tin chi tiết về cấu hình xóa nhật ký của hệ thống',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy cấu hình thành công',
  })
  getSetting() {
    return this.settingService.getSettingClearLog();
  }

  @Get('detail-config/:type')
  @ApiOperation({
    summary: 'Lấy cấu hình theo loại',
    description: 'Lấy chi tiết cấu hình xóa nhật ký theo loại cụ thể',
  })
  @ApiParam({
    name: 'type',
    type: String,
    description: 'Loại cấu hình (ví dụ: daily, weekly, monthly)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy cấu hình thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy loại cấu hình',
  })
  getDetail(@Param('type') type: string) {
    return this.settingService.getDetailByType(type);
  }

  @Put('update')
  @ApiOperation({
    summary: 'Cập nhật cấu hình xóa nhật ký',
    description: 'Cập nhật thông tin cấu hình xóa nhật ký của hệ thống',
  })
  @ApiBody({
    type: UpdateSettingClearLogDto,
    description: 'Dữ liệu cập nhật cấu hình',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  updateSetting(@Body() dto: UpdateSettingClearLogDto) {
    return this.settingService.updateSettingClearLog(dto);
  }
}
