import { Body, Controller, Get, Post, Query, Req, Logger, Param } from '@nestjs/common';
import { Request } from 'express';
import { HrmSyncServiceNew } from './hrm-sync.service';
import { HrmEmployeeQueryDto } from './dto/hrm-employee-query.dto';
import { SyncEmployeesDto } from './dto/sync-employees.dto';

@Controller('hrm')
export class HrmController {
  private readonly logger = new Logger(HrmController.name);

  constructor(private readonly hrmSyncService: HrmSyncServiceNew) {}


  @Post('sync')
  async sync(
    @Body() body: SyncEmployeesDto,
    @Req() req: Request,
  ) {
    try {
      
      // Nếu body trống nhưng có trong req.body (phòng trường hợp body parser/header issue)
      const syncDto = (body && typeof body === 'object' && Object.keys(body).length > 0) ? body : (req as any).body;

      if (!syncDto) {
        this.logger.warn('[HRM_SYNC] Empty request body received');
        return {
          success: false,
          message: 'Dữ liệu gửi lên không hợp lệ hoặc trống'
        };
      }

      return await this.hrmSyncService.syncEmployees(syncDto);
    } catch (error) {
      this.logger.error(`[HRM_SYNC] Error in sync endpoint: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Đã xảy ra lỗi hệ thống khi đồng bộ dữ liệu',
        error: error.message
      };
    }
  }

  @Get('dashboard')
  async dashboard() {
    return this.hrmSyncService.getDashboard();
  }

  @Get('employees')
  async employees(@Query() query: HrmEmployeeQueryDto) {
    return this.hrmSyncService.getEmployees(query);
  }

  @Get(':id/employee-detail')
  async employeeDetail(@Param('id') id: string) {
    return this.hrmSyncService.getEmployeeDetail(id);
  }

  
}




