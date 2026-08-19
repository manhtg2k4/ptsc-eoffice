import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { DriverHealthChecksService } from './driver-health-checks.service';
import { CreateDriverHealthCheckDto, UpdateDriverHealthCheckDto } from './dto/driver-health-check.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { VehicleRegistrationPermissionAction, RequireVehiclePermission } from 'src/vehicle-registration/decorators/vehicle-registration-permission.decorator';
import { VehicleRegistrationPermissionGuard } from 'src/vehicle-registration/guards/vehicle-registration-permission.guard';
import { AuthorityStages, CheckAuthority } from 'src/authority-documents';

@ApiTags('Lịch khám sức khỏe tài xế')
@Controller('driver-health-check')
@UseGuards(VehicleRegistrationPermissionGuard)
@RequireVehiclePermission(VehicleRegistrationPermissionAction.MANAGE, 'DANHSACHTAIXE')
export class DriverHealthChecksController {
  constructor(private readonly service: DriverHealthChecksService) {}

  @Post()
  @ApiOperation({ summary: 'Thêm mới/Lưu lịch khám sức khỏe' })
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  create(@Body() dto: CreateDriverHealthCheckDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách lịch khám' })
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'driverId', required: false, type: String })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('driverId') driverId?: string,
  ) {
    return this.service.findAll({
      page: page ? +page : 1,
      limit: limit ? +limit : 25,
      driverId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết lịch khám' })
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật lịch khám' })
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDriverHealthCheckDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa lịch khám' })
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
