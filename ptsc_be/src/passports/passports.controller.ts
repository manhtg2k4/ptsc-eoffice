import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
  Param,
  Req,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { PassportsService } from './passports.service';
import { CreatePassportDto } from './dto/create-passport.dto';
import { ListPassportDto } from './dto/list-passport.dto';
import { UpdatePassportDto } from './dto/update-passport.dto';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { PassportReminderService } from './passport-reminder.service';
import { ProcessKey } from 'src/oauth/decorator/process-key.decorator';
import { Roles } from 'src/oauth/decorator/roles.decorator';
import { JwtAuthGuard } from 'src/oauth/jwt.guard';
import { RoleFeatureGuard } from 'src/oauth/role-feature.guard';

@ApiTags('Quản lý Hộ chiếu')
@ApiBearerAuth()
@Controller('passports')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@UseGuards(JwtAuthGuard, RoleFeatureGuard)
@ProcessKey('QT_MTHC')
export class PassportsController {
  constructor(
    private readonly passportsService: PassportsService,
    private readonly systemLogService: SystemLogServiceSql,
    private readonly passportReminderService: PassportReminderService,
  ) { }

  /**
   * GET /api/passports/test-reminder
   * Test: Trigger thủ công cron nhắc hạn hộ chiếu
   */
  @Get('test-reminder')
  @Roles('canView')
  @ApiOperation({
    summary: 'Test nhắc hạn hộ chiếu',
    description: 'Chạy thủ công cron nhắc hạn hộ chiếu để kiểm tra',
  })
  @ApiQuery({
    name: 'force',
    type: Boolean,
    required: false,
    description: 'Bắt buộc chạy lại ngay cả khi đã chạy hôm nay',
  })
  @ApiResponse({
    status: 200,
    description: 'Đã chạy xong',
  })
  async testReminder(@Req() req: any, @Query('force') force: string) {
    const userId = req?.user?.userId || '';
    await this.passportReminderService.handlePassportExpiryReminder(userId, force === 'true');
    return { statusCode: 200, message: 'Đã chạy quét nhắc hạn hộ chiếu xong. Kiểm tra notifications.' };
  }

  @Get('test-return-reminder')
  @Roles('canView')
  @ApiOperation({
    summary: 'Test nhắc nhở trả hộ chiếu mượn',
    description: 'Chạy thủ công cron nhắc nhở trả hộ chiếu mượn cận hạn/quá hạn',
  })
  @ApiResponse({
    status: 200,
    description: 'Đã chạy xong',
  })
  async testReturnReminder(@Req() req: any) {
    await this.passportReminderService.handlePassportReturnReminder();
    return { statusCode: 200, message: 'Đã chạy quét nhắc nhở trả hộ chiếu xong. Kiểm tra notifications.' };
  }

  @Post('remind-expiry')
  @Roles('canEdit', 'canView')
  @ApiOperation({
    summary: 'NQLHC gửi thông báo/email nhắc nhở hộ chiếu sắp hết hạn hoặc hết hạn',
    description: 'Kiểm tra ID hộ chiếu (sắp hết hạn hoặc đã hết hạn) rồi gửi thông báo/email tới các thành viên nhóm BPCT001',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID của hộ chiếu cần gửi nhắc nhở' },
        passportId: { type: 'string', description: 'ID của hộ chiếu (fallback)' },
      },
    },
  })
  async sendManualExpiryReminder(
    @Req() req: any,
    @Body() body: { id?: string; passportId?: string },
  ) {
    const userId = req?.user?.userId || '';
    const targetPassportId = body?.id || body?.passportId || '';

    const result = await this.passportReminderService.sendManualExpiryReminder(targetPassportId, userId);

    try {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `NQLHC gửi nhắc nhở hộ chiếu (ID: ${targetPassportId}): ${result.message}`,
        method: 'POST',
        status: result.success ? 'SUCCESS' : 'FAILED',
        type: 'PASSPORT_REMINDER',
        subType: 'PASSPORT_REMINDER',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }

    return {
      statusCode: result.success ? 200 : 400,
      ...result,
    };
  }

  @Post(':id/remind-expiry')
  @Roles('canEdit', 'canView')
  @ApiOperation({
    summary: 'NQLHC gửi thông báo/email nhắc nhở hộ chiếu theo Param ID',
    description: 'Gửi thông báo nhắc nhở hộ chiếu sắp hết hạn/hết hạn cho các thành viên nhóm BPCT001 theo ID trên URL',
  })
  @ApiParam({ name: 'id', description: 'ID của hộ chiếu' })
  async sendManualExpiryReminderByParam(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const userId = req?.user?.userId || '';
    const result = await this.passportReminderService.sendManualExpiryReminder(id, userId);

    try {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `NQLHC gửi nhắc nhở hộ chiếu (ID: ${id}): ${result.message}`,
        method: 'POST',
        status: result.success ? 'SUCCESS' : 'FAILED',
        type: 'PASSPORT_REMINDER',
        subType: 'PASSPORT_REMINDER',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }

    return {
      statusCode: result.success ? 200 : 400,
      ...result,
    };
  }

  @Get('my-passports')
  @Roles('canView')
  @ApiOperation({
    summary: 'Lấy danh sách hộ chiếu cá nhân người dùng',
    description: 'Lấy danh sách tất cả hộ chiếu của tài khoản cá nhân đăng nhập (Bao gồm hộ chiếu sở hữu và hộ chiếu được phân quyền mượn)',
  })
  @ApiQuery({ name: 'q', type: String, required: false, description: 'Từ khóa tìm kiếm (Số HC, Họ tên)' })
  @ApiQuery({ name: 'usageStatus', type: String, required: false, description: 'Trạng thái lưu kho (STORING, IN_USE, ...)' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async findMyPassports(@Query() query: any, @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.id || req?.user?.username || '';
    return this.passportsService.findMyPassports(userId, query);
  }

  @Get()
  @Roles('canView')
  @ApiOperation({
    summary: 'Lấy danh sách hộ chiếu',
    description: 'Lấy danh sách tất cả hộ chiếu với hỗ trợ phân trang, tìm kiếm và lọc',
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
  async findAll(@Query() query: ListPassportDto, @Req() req: any) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách hộ chiếu, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.passportsService.findAll(query);
  }

  @Get('employees')
  @Roles('canView')
  async getAllEmployees(@Query() query: any, @Req() req: any) {
    return this.passportsService.getAllEmployees(query);
  }

  @Get('organization-units')
  @Roles('canView')
  async getAllOrganizationUnits(@Query() query: any, @Req() req: any) {
    return this.passportsService.getAllOrganizationUnits(query);
  }

  @Get('filter-units')
  @Roles('canView')
  async getFilterUnits(@Req() req: any) {
    return this.passportsService.getFilterUnits();
  }

  @Get('filter-departments')
  @Roles('canView')
  async getFilterDepartments(@Req() req: any) {
    return this.passportsService.getFilterDepartments();
  }

  @Get('departments')
  @Roles('canView')
  async getAllDepartments(@Query() query: any, @Req() req: any) {
    return this.passportsService.getAllDepartments(query);
  }

  @Get('worker-types')
  @Roles('canView')
  async getAllWorkerTypes(@Query() query: any, @Req() req: any) {
    return this.passportsService.getAllWorkerTypes(query);
  }

  @Get('positions')
  @Roles('canView')
  async getAllPositions(@Query() query: any, @Req() req: any) {
    return this.passportsService.getAllPositions(query);
  }

  @Get('jobs')
  @Roles('canView')
  async getAllJobs(@Query() query: any, @Req() req: any) {
    return this.passportsService.getAllJobs(query);
  }

  @Get('army-ranks')
  @Roles('canView')
  async getAllArmyRanks(@Query() query: any, @Req() req: any) {
    return this.passportsService.getAllArmyRanks(query);
  }

  @Get('employees/:id')
  @Roles('canView')
  async getEmployeeById(@Param('id') id: string, @Req() req: any) {
    return this.passportsService.getEmployeeById(id);
  }

  @Get('organization-units/:id')
  @Roles('canView')
  async getOrganizationUnitById(@Param('id') id: string, @Req() req: any) {
    return this.passportsService.getOrganizationUnitById(id);
  }

  @Get('worker-types/:id')
  @Roles('canView')
  async getWorkerTypeById(@Param('id') id: string, @Req() req: any) {
    return this.passportsService.getWorkerTypeById(id);
  }

  @Get('positions/:id')
  @Roles('canView')
  async getPositionById(@Param('id') id: string, @Req() req: any) {
    return this.passportsService.getPositionById(id);
  }

  @Get('jobs/:id')
  @Roles('canView')
  async getJobById(@Param('id') id: string, @Req() req: any) {
    return this.passportsService.getJobById(id);
  }

  @Get('army-ranks/:id')
  @Roles('canView')
  async getArmyRankById(@Param('id') id: string, @Req() req: any) {
    return this.passportsService.getArmyRankById(id);
  }

  @Get('monthly-report')
  @Roles('canView')
  async getMonthlyReport(@Req() req: any) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập báo cáo tháng hộ chiếu sắp/đã hết hạn`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.passportsService.getMonthlyReport();
  }

  @Get('countries')
  @Roles('canViewCountry')
  async getAllCountries(@Query() query: any, @Req() req: any) {
    return this.passportsService.getAllCountries(query);
  }

  /**
   * GET /api/passports/:id/borrow-history
   * Lịch sử mượn của một hộ chiếu
   */
  @Get(':id/borrow-history')
  @Roles('canView')
  @ApiOperation({
    summary: 'Lịch sử mượn hộ chiếu',
    description: 'Lấy danh sách các lần mượn/trả của hộ chiếu theo ID',
  })
  @ApiParam({ name: 'id', description: 'ID của hộ chiếu' })
  @ApiResponse({ status: 200, description: 'Lấy lịch sử mượn thành công' })
  async getBorrowHistory(@Param('id') id: string, @Req() req: any) {
    return this.passportsService.getPassportBorrowHistory(id);
  }

  @Get(':id')
  @Roles('canView')
  async findOne(@Param('id') id: string, @Req() req: any) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập chi tiết hộ chiếu: ${id}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    const currentUserId = req?.user?.userId || req?.user?.id || req?.user?.username;
    return this.passportsService.findOne(id, currentUserId);
  }

  @Post()
  @Roles('canCreate')
  async create(@Body() createDto: CreatePassportDto, @Req() req: any) {
    const userId = req?.user?.userId || '';
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Thêm mới hộ chiếu: ${createDto.passportNumber}`,
        method: 'POST',
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
    return this.passportsService.create(createDto, userId);
  }

  @Put(':id')
  @Roles('canUpdate')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePassportDto,
    @Req() req: any,
  ) {
    const userId = req?.user?.userId || '';
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'PUT',
        details: `Cập nhật hộ chiếu: ${id}`,
        method: 'PUT',
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
    return this.passportsService.update(id, updateDto, userId);
  }

  @Delete()
  @Roles('canDelete')
  async remove(
    @Body() body: { ids: string[] },
    @Req() req: any,
  ) {
    const userId = req?.user?.userId || '';
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Xóa hộ chiếu: ${body.ids?.join(', ')}`,
        method: 'DELETE',
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
    return this.passportsService.remove(body.ids, userId);
  }
}
