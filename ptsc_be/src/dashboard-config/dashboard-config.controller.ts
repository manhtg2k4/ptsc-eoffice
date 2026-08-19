import { Controller, Get, Body, Patch, Req, UseGuards } from '@nestjs/common';
import { DashboardConfigService } from './dashboard-config.service';
import { UpdateDashboardConfigDto } from './dto/create-dashboard-config.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth-sso/jwt.guard';

@ApiTags('Dashboard Config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard-config')
export class DashboardConfigController {
  constructor(private readonly dashboardConfigService: DashboardConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy cấu hình dashboard của người dùng' })
  async findOne(@Req() req) {
    const userId = req.user.userId;
    return this.dashboardConfigService.findByUserId(userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Cập nhật cấu hình dashboard' })
  async update(@Req() req, @Body() updateDashboardConfigDto: UpdateDashboardConfigDto) {
    const userId = req.user.userId;
    return this.dashboardConfigService.update(userId, updateDashboardConfigDto);
  }
}
