import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../file-manager/multer.config';
import { validateFileSecurity, sanitizeFileContent } from 'src/utils/file-security.util';
import {
  AuthorityGuard,
  AuthorityStages,
  CheckAuthority,
  EffectiveUser,
  OriginalUser,
} from 'src/authority-documents';

import { TravelWorkSchedulesService } from './travel-work-schedules.service';
import { CreateTravelWorkScheduleDto } from './dto/create-travel-work-schedule.dto';
import { UpdateTravelWorkScheduleDto } from './dto/update-travel-work-schedule.dto';
import { DeleteMultipleTravelWorkSchedulesDto } from './dto/delete-multiple-travel-work-schedules.dto';
import { ListTravelWorkSchedulesDto } from './dto/list-travel-work-schedules.dto';
import { RequireTravelSchedulePermission, TravelSchedulePermissionAction } from './decorators/travel-schedule-permission.decorator';
import { TravelWorkSchedulePermissionGuard } from './guards/travel-work-schedule-permission.guard';

/**
 * Controller: Travel Work Schedules
 * Quản lý lịch công tác với 3 loại:
 * - Trong ngày - Theo buổi (singleDay + session)
 * - Trong ngày - Cả ngày (singleDay + fullDay)
 * - Nhiều ngày (multiDay)
 */
@ApiTags('Travel Work Schedules')
@Controller('travel-work-schedules')
@UseGuards(AuthorityGuard)
@UseGuards(TravelWorkSchedulePermissionGuard)

export class TravelWorkSchedulesController {
  constructor(private readonly service: TravelWorkSchedulesService) {}

  /**
   * List travel work schedules with filtering and pagination
   */
  @Get('list')
  @RequireTravelSchedulePermission(TravelSchedulePermissionAction.VIEW)
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách lịch công tác' })
  @ApiQuery({ type: ListTravelWorkSchedulesDto, style: 'deepObject', explode: true })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  async list(
    @Query() dto: ListTravelWorkSchedulesDto,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
  ) {
    const result = await this.service.list(
      dto,
      originalUserId,
      effectiveUserId,
    );

    const limit = dto.limit || 20;
    const page = dto.page || 1;

    return {
      success: true,
      items: result.items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  @Get('list/notes')
  @RequireTravelSchedulePermission(TravelSchedulePermissionAction.VIEW)
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách ghi chú lịch công tác (text)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách ghi chú thành công' })
  @ApiQuery({ type: ListTravelWorkSchedulesDto, style: 'deepObject', explode: true })
  async listNotes(
    @Query() dto: ListTravelWorkSchedulesDto,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
  ) {
    const limit = dto.limit || 20;
    const page = dto.page || 1;

    const result = await this.service.listNotes(
      dto,
      originalUserId,
      effectiveUserId,
    );

    return {
      success: true,
      items: result.items, // string[]
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  /**
   * Create new travel work schedule
   */
  @Post()
  @RequireTravelSchedulePermission(TravelSchedulePermissionAction.CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo lịch công tác mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo lịch công tác thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  async create(
    @Body() dto: CreateTravelWorkScheduleDto,
    @EffectiveUser() userId: string,
  ) {
    const data = await this.service.create(dto, userId);
    return {
      status: HttpStatus.CREATED,
      data,
      message: 'Tạo lịch công tác thành công',
    };
  }

  @Post('import')
  @RequireTravelSchedulePermission(TravelSchedulePermissionAction.CREATE)
  @ApiOperation({ summary: 'Import lịch công tác từ file Excel hoặc JSON' })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiResponse({
    status: 200,
    description: 'Import thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu file import không hợp lệ',
  })
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
  /**
   * Delete multiple travel work schedules (soft delete)
   */
  @Delete()
  @RequireTravelSchedulePermission(TravelSchedulePermissionAction.DELETE)
  @ApiOperation({ summary: 'Xóa nhiều lịch công tác' })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy lịch công tác',
  })
  async deleteMultiple(
    @Body() dto: DeleteMultipleTravelWorkSchedulesDto,
    @EffectiveUser() userId: string,
  ) {
    const result = await this.service.deleteMultiple(dto, userId);
    return {
      status: HttpStatus.OK,
      ...result,
      message: 'Xóa lịch công tác thành công',
    };
  }

  /**
   * Get detail of travel work schedule
   */
  @Get(':id')
  @RequireTravelSchedulePermission(TravelSchedulePermissionAction.VIEW)
  @ApiOperation({ summary: 'Chi tiết lịch công tác' })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy lịch công tác',
  })
  async getDetail(@Param('id') id: string, @EffectiveUser() userId: string) {
    const data = await this.service.getDetail(id, userId);
    return {
      status: HttpStatus.OK,
      data,
    };
  }

  /**
   * Update travel work schedule
   */
  @Put(':id')
  @RequireTravelSchedulePermission(TravelSchedulePermissionAction.UPDATE)
  @ApiOperation({ summary: 'Cập nhật lịch công tác' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy lịch công tác',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTravelWorkScheduleDto,
    @EffectiveUser() userId: string,
  ) {
    const data = await this.service.update(id, dto, userId);
    return {
      status: HttpStatus.OK,
      data,
      message: 'Cập nhật lịch công tác thành công',
    };
  }

}