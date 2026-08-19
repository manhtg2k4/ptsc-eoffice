import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AuthorityGuard, AuthorityStages, CheckAuthority } from 'src/authority-documents';
import { AmenitiesService } from './amenities.service';
import { CreateAmenitiesDto } from './dto/create-amenities.dto';
import { UpdateAmenitiesDto } from './dto/update-amenities.dto';
import { DeleteAmenitiesDto } from './dto/delete-amenities.dto';
import { ListAmenitiesDto } from './dto/list-amenities.dto';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { AmenitiesPermissionAction, RequireAmenitiesPermission } from './decorators/amenities-permission.decorator';
import { AmenitiesPermissionGuard } from './guard/amenities-permission.guard';

/**
 * Controller: CRUD cho amenities master data
 * Không còn assign/unassign vì logic đã chuyển sang meeting-rooms
 */
@ApiTags('Tiện nghi Phòng họp (Dữ liệu Chính)')
@UseGuards(AuthorityGuard)
@UseGuards(AmenitiesPermissionGuard)
@Controller('amenities')
export class AmenitiesController {
  constructor(
    private readonly service: AmenitiesService,
    private readonly systemLogService: SystemLogServiceSql,
  ) { }

  @Get('list')
  @ApiOperation({ summary: 'Danh sách thiết bị (master data)' })
  // @RequireAmenitiesPermission(AmenitiesPermissionAction.VIEW)
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  async list(@Query() dto: ListAmenitiesDto, @Req() req: any) {
    // Ghi log truy cập màn danh sách Quản lý thiết bị
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách Quản lý thiết bị, trang: ${dto.page || 1}, limit: ${dto.limit || 20}`,
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

    const result = await this.service.list(dto);
    const limit = dto.limit || 20;
    const page = dto.page || 1;
    return {
      success: true,
      items: result.items,
      total: result.total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết thiết bị' })
  // @RequireAmenitiesPermission(AmenitiesPermissionAction.VIEW)
  @ApiParam({ name: 'id', description: 'ID thiết bị' })
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  async getDetail(@Param('id') id: string) {
    const amenity = await this.service.getDetail(id);
    return {
      status: HttpStatus.OK,
      data: amenity
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo thiết bị mới' })
  @RequireAmenitiesPermission(AmenitiesPermissionAction.CREATE)
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  async create(@Body() dto: CreateAmenitiesDto) {
    const data = await this.service.create(dto);
    return {
      status: HttpStatus.CREATED,
      message: 'Tạo thiết bị thành công',
      data,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thiết bị' })
  @RequireAmenitiesPermission(AmenitiesPermissionAction.UPDATE)
  @ApiParam({ name: 'id', description: 'ID thiết bị' })
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAmenitiesDto,
  ) {
    const data = await this.service.update(id, dto);
    return {
      status: HttpStatus.OK,
      message: 'Cập nhật thiết bị thành công',
      data,
    };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @RequireAmenitiesPermission(AmenitiesPermissionAction.DELETE)
  @ApiOperation({ summary: 'Xóa một hoặc nhiều thiết bị' })
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  async delete(@Body() dto: DeleteAmenitiesDto) {
    const result = await this.service.delete(dto);
    return {
      status: HttpStatus.OK,
      message: result.message,
      data: result,
    };
  }
}