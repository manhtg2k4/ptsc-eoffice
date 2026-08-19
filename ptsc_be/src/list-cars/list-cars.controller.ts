import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { ListCarsService } from './list-cars.service';
import { CreateListCarDto } from './dto/create-list-car.dto';
import { UpdateListCarDto } from './dto/update-list-car.dto';
import { DeleteListCarDto } from './dto/delete-list-car.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ListCarQueryDto } from './dto/list-car-query.dto';
import { AuthorityStages, CheckAuthority, EffectiveUser } from 'src/authority-documents';
import { UseGuards } from '@nestjs/common';
import { VehicleRegistrationPermissionAction, RequireVehiclePermission } from 'src/vehicle-registration/decorators/vehicle-registration-permission.decorator';
import { VehicleRegistrationPermissionGuard } from 'src/vehicle-registration/guards/vehicle-registration-permission.guard';

@ApiTags('Danh sách xe')
@Controller('list-car')
@UseGuards(VehicleRegistrationPermissionGuard)
@RequireVehiclePermission(VehicleRegistrationPermissionAction.MANAGE, 'DANHSACHXE')
export class ListCarsController {
  constructor(private readonly listCarsService: ListCarsService) {}

  @Post()
  @ApiOperation({ summary: 'Thêm mới xe' })
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  create(
    @Body() createListCarDto: CreateListCarDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.listCarsService.create(createListCarDto, req, effectiveUserId);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách xe' })
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isExport', required: false, type: String })
  findAll(
    @Query() query: ListCarQueryDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.listCarsService.findAll(query, req, effectiveUserId);
  }


  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết xe' })
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  findOne(
    @Param('id') id: string,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.listCarsService.findOne(id, req, effectiveUserId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin xe' })
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  update(
    @Param('id') id: string,
    @Body() updateListCarDto: UpdateListCarDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.listCarsService.update(id, updateListCarDto, req, effectiveUserId);
  }

  @Delete()
  @ApiOperation({ summary: 'Xóa nhiều xe' })
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  removeMultiple(
    @Body() deleteListCarDto: DeleteListCarDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.listCarsService.removeMultiple(deleteListCarDto.ids, req, effectiveUserId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa xe' })
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  remove(
    @Param('id') id: string,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    return this.listCarsService.remove(id, req, effectiveUserId);
  }
}
