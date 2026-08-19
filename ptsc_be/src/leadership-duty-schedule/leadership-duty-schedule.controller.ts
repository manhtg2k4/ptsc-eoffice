import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Logger,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../file-manager/multer.config';
import { validateFileSecurity, sanitizeFileContent } from 'src/utils/file-security.util';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LeadershipDutyScheduleService } from './leadership-duty-schedule.service';
import {
  CreateLeadershipDutyScheduleDto,
  UpdateLeadershipDutyScheduleDto,
  DeleteManyLeadershipDutySchedulesDto,
  ListLeadershipDutySchedulesDto,
} from './dto/leadership-duty-schedule.dto';
import { JwtAuthGuard } from 'src/auth-sso/jwt.guard';
import { OriginalUser } from 'src/authority-documents';
import { EffectiveUser } from 'src/authority-documents';
import { CheckAuthority } from 'src/authority-documents';
import { AuthorityStages } from 'src/authority-documents';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { LeadershipDutySchedulesPermissionGuard } from './guard/leadership-duty-schedules-permission.guard';
import { LeadershipDutySchedulesPermissionAction, RequireLeadershipDutySchedulesPermission } from './decorators/leadership-duty-schedules-permission.decorator';

@ApiTags('Lịch Trực Ban Lãnh Đạo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseGuards(LeadershipDutySchedulesPermissionGuard)
@Controller('leadership-duty-schedules')
export class LeadershipDutyScheduleController {
  private readonly logger = new Logger(LeadershipDutyScheduleController.name);

  constructor(
    private readonly service: LeadershipDutyScheduleService,
    private readonly systemLogService: SystemLogServiceSql,
  ) {}

  @Post()
  @RequireLeadershipDutySchedulesPermission(LeadershipDutySchedulesPermissionAction.CREATE)
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Tạo lịch trực ban lãnh đạo' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(
    @Body() dto: CreateLeadershipDutyScheduleDto,
    @OriginalUser() userId: string,
  ) {
    return this.service.create(dto, userId);
  }

  @Post('import')
  @RequireLeadershipDutySchedulesPermission(LeadershipDutySchedulesPermissionAction.CREATE)
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Import lịch trực ban lãnh đạo từ file Excel hoặc JSON' })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiResponse({ status: 200, description: 'Import thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu file import không hợp lệ' })
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || 'system-user-for-testing';

    // Đọc JSON rows từ body nếu FE gửi JSON thay vì file
    const importRows = Array.isArray(body) ? body : (body?.rows ?? body?.data);

    if (!file && (!Array.isArray(importRows) || importRows.length === 0)) {
      throw new BadRequestException('Vui lòng upload file Excel hoặc gửi JSON dữ liệu import.');
    }

    if (file) {
      await validateFileSecurity(file);
      await sanitizeFileContent(file);
    }

    return this.service.importExcel(file, userId, importRows);
  }

  @Get('list')
  @RequireLeadershipDutySchedulesPermission(LeadershipDutySchedulesPermissionAction.VIEW)
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách lịch trực ban lãnh đạo' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async list(
    @Query() dto: ListLeadershipDutySchedulesDto,
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
  ) {
    const limit = dto.limit || 20;
    const page = dto.page || 1;

    // Fire-and-forget: không block response
    this.systemLogService.createLogFromSystem({
      action: 'GET',
      details: `Truy cập Danh sách lịch trực ban lãnh đạo, trang: ${page}, limit: ${limit}`,
      method: 'GET',
      status: 'SUCCESS',
      type: process.env.CLIENT_LOG || 'DHVBTC',
      subType: process.env.CLIENT_LOG || 'DHVBTC',
      userInfo: req?.user?.userId || '',
      ipAddress: req?.socket?.remoteAddress || 'Unknown',
      timestamp: new Date().toISOString(),
    }).catch(err => this.logger.error('[list] Lỗi ghi log:', err));

    const result = await this.service.list(dto, originalUserId, effectiveUserId);

    return {
      success: true,
      items: result.items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  @Get('weeks')
  @RequireLeadershipDutySchedulesPermission(LeadershipDutySchedulesPermissionAction.VIEW)
  async getScheduledWeeks(@Query('year') year: number) {
    const weeks = await this.service.getScheduledWeeks(Number(year));
    return { success: true, data: weeks };
  }

  @Delete('delete-many')
  @RequireLeadershipDutySchedulesPermission(LeadershipDutySchedulesPermissionAction.DELETE)
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Xóa nhiều lịch trực' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async deleteMany(
    @Body() dto: DeleteManyLeadershipDutySchedulesDto,
    @OriginalUser() userId: string,
  ) {
    return this.service.deleteMany(dto, userId);
  }

  @Get('by-period/:year/:week')
  @RequireLeadershipDutySchedulesPermission(LeadershipDutySchedulesPermissionAction.VIEW)
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Lấy lịch trực theo tuần/tháng/năm' })
  @ApiResponse({ status: 200, description: 'Lấy thành công' })
  async getByPeriod(
    @Param('year') year: number,
    @Param('week') week: number,
  ) {
    const dto: ListLeadershipDutySchedulesDto = {
      filter: { year, week },
      limit: 1,
      page: 1,
    };

    const result = await this.service.list(dto, '', '');

    if (!result.items.length) {
      return { success: true, data: null, message: 'Không tìm thấy lịch trực' };
    }

    const data = await this.service.findById(result.items[0].id);
    return { success: true, data };
  }

  @Get(':id')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @RequireLeadershipDutySchedulesPermission(LeadershipDutySchedulesPermissionAction.VIEW)
  @ApiOperation({ summary: 'Chi tiết lịch trực' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  async findById(@Param('id') id: string) {
    const data = await this.service.findById(id);
    return { success: true, data };
  }

  @Put(':id')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @RequireLeadershipDutySchedulesPermission(LeadershipDutySchedulesPermissionAction.UPDATE)
  @ApiOperation({ summary: 'Cập nhật lịch trực' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadershipDutyScheduleDto,
    @OriginalUser() userId: string,
  ) {
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @RequireLeadershipDutySchedulesPermission(LeadershipDutySchedulesPermissionAction.DELETE)
  @ApiOperation({ summary: 'Xóa lịch trực' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  async delete(
    @Param('id') id: string,
    @OriginalUser() userId: string,
  ) {
    return this.service.delete(id, userId);
  }
}