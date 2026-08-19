import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { ListDriversService } from './list-drivers.service';
import { CreateListDriverDto } from './dto/create-list-driver.dto';
import { UpdateListDriverDto } from './dto/update-list-driver.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { ListDriverQueryDto } from './dto/list-driver-query.dto';
import { DeleteDriversDto } from './dto/delete-drivers.dto';
import { AuthorityStages, CheckAuthority, EffectiveUser } from 'src/authority-documents';
import { UseGuards } from '@nestjs/common';
import { VehicleRegistrationPermissionAction, RequireVehiclePermission } from 'src/vehicle-registration/decorators/vehicle-registration-permission.decorator';
import { VehicleRegistrationPermissionGuard } from 'src/vehicle-registration/guards/vehicle-registration-permission.guard';

@ApiTags('Danh sách tài xế')
@Controller('list-driver')
@UseGuards(VehicleRegistrationPermissionGuard)
@RequireVehiclePermission(VehicleRegistrationPermissionAction.MANAGE, 'DANHSACHTAIXE')
export class ListDriversController {
  constructor(private readonly listDriversService: ListDriversService) {}

  @Post()
  @ApiOperation({ summary: 'Thêm mới tài xế' })
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  create(
    @Body() createListDriverDto: CreateListDriverDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.listDriversService.create(createListDriverDto, req, effectiveUserId);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tài xế' })
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  // @ApiQuery({ name: 'page', required: false, type: Number })
  // @ApiQuery({ name: 'limit', required: false, type: Number })
  // @ApiQuery({ name: 'search', required: false, type: String })
  // @ApiQuery({ name: 'isExport', required: false, type: String })
  @ApiQuery({ type: ListDriverQueryDto, style: 'deepObject', explode: true })
  findAll(
    @Query() query: ListDriverQueryDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.listDriversService.findAll(query, req, effectiveUserId);
  }


  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết tài xế' })
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  findOne(
    @Param('id') id: string,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.listDriversService.findOne(id, req, effectiveUserId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin tài xế' })
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  update(
    @Param('id') id: string,
    @Body() updateListDriverDto: UpdateListDriverDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.listDriversService.update(id, updateListDriverDto, req, effectiveUserId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tài xế' })
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  remove(
    @Param('id') id: string,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.listDriversService.remove(id, req, effectiveUserId);
  }

  @Delete()
  @ApiOperation({ summary: 'Xóa nhiều tài xế' })
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  removeMany(
    @Body() deleteDriversDto: DeleteDriversDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.listDriversService.removeMany(deleteDriversDto.ids, req, effectiveUserId);
  }
}
