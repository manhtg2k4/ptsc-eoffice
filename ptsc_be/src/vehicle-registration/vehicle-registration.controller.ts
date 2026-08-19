import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UnauthorizedException, Req, UseGuards } from '@nestjs/common';
import { VehicleRegistrationService } from './vehicle-registration.service';
import { CreateVehicleRegistrationDto } from './dto/create-vehicle-registration.dto';
import { UpdateVehicleRegistrationDto } from './dto/update-vehicle-registration.dto';
import { DeleteVehicleRegistrationDto } from './dto/delete-vehicle-registration.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthorityStages, CheckAuthority, EffectiveUser, OriginalUser } from 'src/authority-documents';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { VehicleRegistrationPermissionGuard } from './guards/vehicle-registration-permission.guard';
import { RequireVehiclePermission, VehicleRegistrationPermissionAction } from './decorators/vehicle-registration-permission.decorator';

@ApiTags('Đăng ký Phương tiện')
@Controller('vehicle-registration')
@UseGuards(VehicleRegistrationPermissionGuard)
export class VehicleRegistrationController {
  constructor(
    private readonly service: VehicleRegistrationService,
    private readonly systemLogService: SystemLogServiceSql
  ) {}

  @Post()
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.CREATE)
  @ApiOperation({ summary: 'Thêm mới yêu cầu đăng ký xe' })
  async create(
    @Body() createVehicleRegistrationDto: CreateVehicleRegistrationDto,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any
  ) {
    if (!originalUserId) {
      throw new UnauthorizedException('Không tìm thấy originalUserId từ token');
    }
    return await this.service.create(createVehicleRegistrationDto, { originalUserId, effectiveUserId }, req);
  }

  @Get('get-action')
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.VIEW)
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  async getActionAvailableByUser(
    @OriginalUser() originalUserId: string,
  ) {
    return this.service.getActionAvailableByUser(originalUserId);
  }

  @Get('list-registration')
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.VIEW)
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @ApiOperation({ summary: 'Lấy danh sách yêu cầu đăng ký xe' })
  @ApiQuery({ type: CreateVehicleRegistrationDto, style: 'deepObject', explode: true })
  async listVehiclesRegistration(
    
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: CreateVehicleRegistrationDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    const { authority } = query;
    return this.service.listVehiclesRegistration(
      query,
      originalUserId,
      effectiveUserId,
      authority === 'true' ? true : false,
      req
    );
  }

  
  @Get('list-assignment') 
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.VIEW)
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @ApiOperation({ summary: 'Lấy danh sách yêu cầu đăng ký xe' })
  @ApiQuery({ type: CreateVehicleRegistrationDto, style: 'deepObject', explode: true })
  async listVehiclesRegistrationAssignment(
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: CreateVehicleRegistrationDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    const { authority } = query;
    return this.service.listVehiclesRegistrationAssignment(
      query,
      originalUserId,
      effectiveUserId,
      authority === 'true' ? true : false,
      req
    );
  }
  
  
  
  @Get('list-driver-assignment') 
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.VIEW)
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @ApiQuery({ type: CreateVehicleRegistrationDto, style: 'deepObject', explode: true })
  @ApiOperation({ summary: 'Lấy danh sách yêu cầu đăng ký xe' })
  async listVehiclesRegistrationDriver(
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: CreateVehicleRegistrationDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    const { authority } = query;
    return this.service.listVehiclesRegistrationDriver(
      query,
      originalUserId,
      effectiveUserId,
      authority === 'true' ? true : false,
      req
    );
  }

  
  @Get('statistics-vehicle-registration-requests') 
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @ApiOperation({ summary: 'Lấy danh sách yêu cầu đăng ký xe' })
  @ApiQuery({ type: CreateVehicleRegistrationDto, style: 'deepObject', explode: true })
  async statisticsVehicleRegistrationRequests(
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: CreateVehicleRegistrationDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    
    const { authority } = query;
    return this.service.statisticsVehicleRegistrationRequests(
      query,
      originalUserId,
      effectiveUserId,
      authority === 'true' ? true : false,
      req
    );
  }

  
  
  @Get('vehicle-statistics-report') 
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @ApiOperation({ summary: 'Lấy danh sách yêu cầu đăng ký xe' })
  async vehicleUsageStatisticsReport(
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: CreateVehicleRegistrationDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    
    const { authority } = query;
    return this.service.vehicleUsageStatisticsReport(
      query,
      originalUserId,
      effectiveUserId,
      authority === 'true' ? true : false,
      req
    );
  }

  
  
  @Get('vehicle-registration-statistics-department') 
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @ApiOperation({ summary: 'Lấy danh sách yêu cầu đăng ký xe' })
  async vehicleRegistrationStatisticsByDepartment(
    
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: CreateVehicleRegistrationDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    
    const { authority } = query;
    return this.service.vehicleRegistrationStatisticsByDepartment(
      query,
      originalUserId,
      effectiveUserId,
      authority === 'true' ? true : false,
      req
    );
  }

  
  @Get('vehicle-most-dispatched-report') 
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @ApiOperation({ summary: 'Lấy danh sách yêu cầu đăng ký xe' })
  async vehicleMostDispatchedReport(
    
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: CreateVehicleRegistrationDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    
    const { authority } = query;
    return this.service.vehicleMostDispatchedReport(
      query,
      originalUserId,
      effectiveUserId,
      authority === 'true' ? true : false,
      req
    );
  }

  
  @Get('vehicle-borrow-return-history-report') 
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @ApiOperation({ summary: 'Lấy danh sách yêu cầu đăng ký xe' })
  @ApiQuery({ type: CreateVehicleRegistrationDto, style: 'deepObject', explode: true })
  async vehicleBorrowReturnHistoryReport(
    
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: CreateVehicleRegistrationDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    
    const { authority } = query;
    return this.service.vehicleBorrowReturnHistoryReport(
      query,
      originalUserId,
      effectiveUserId,
      authority === 'true' ? true : false,
      req
    );
  }
  @Get('car-list')
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.LIST_ACCESS)
  @ApiOperation({ summary: 'Lấy danh sách xe' })
  async getCarList(
    @OriginalUser() originalUserId: string,
    @Query('keyword') keyword?: string,
  ) {
    return await this.service.getCarList(keyword);
  }
  
  @Get('car-list-include-busy')
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.LIST_ACCESS)
  @ApiOperation({ summary: 'Lấy danh sách xe (bao gồm đang bận)' })
  async getCarListIncludeBusy(
    @OriginalUser() originalUserId: string,
    @Query('keyword') keyword?: string,
  ) {
    return await this.service.getCarListIncludeBusy(keyword);
  }
  
  @Post('cancel/:id')
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.PROCESS)
  @ApiOperation({ summary: 'Hủy yêu cầu đăng ký xe' })
  async cancelRequest(
    @Param('id') id: string,
    @Body() dto: CreateVehicleRegistrationDto,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ) {
    return await this.service.cancelVehicleRegistration(id, dto, originalUserId, req);
  }

  @Post('comfirm/:id')
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.VIEW)
  // @RequireVehiclePermission(VehicleRegistrationPermissionAction.PROCESS)
  @ApiOperation({ summary: 'Tài xế xác nhận yêu cầu đặt xe' })
  async comfirmRequest(
    @Param('id') id: string,
    @Body() dto: CreateVehicleRegistrationDto,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ) {
    return await this.service.comfirmVehicleRegistration(id, dto, originalUserId, req);
  }
  
  @Post('complete/:id')
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.PROCESS)
  @ApiOperation({ summary: 'Hoàn thành yêu cầu đăng ký xe' })
  async completeRequest(
    @Param('id') id: string,
    @Body() dto: CreateVehicleRegistrationDto,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ) {
    return await this.service.completeVehicleRegistration(id, dto, originalUserId, req);
  }

  @Get('driver-list')
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.LIST_ACCESS)
  @ApiOperation({ summary: 'Lấy danh sách tài xế' })
  async getDriverList(
    @OriginalUser() originalUserId: string,
    @Query('keyword') keyword?: string,
  ) {
    return await this.service.getDriverList(keyword);
  }
  @Get('driver-list-include-busy')
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.LIST_ACCESS)
  @ApiOperation({ summary: 'Lấy danh sách tài xế (bao gồm đang bận)' })
  async getDriverListIncludeBusy(
    @OriginalUser() originalUserId: string,
    @Query('keyword') keyword?: string,
  ) {
    return await this.service.getDriverListIncludeBusy(keyword);
  }

  @Post('reject/:id')
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.PROCESS)
  @ApiOperation({ summary: 'Từ chối yêu cầu đăng ký xe' })
  async rejectRequest(
    @Param('id') id: string,
    @Body() dto: CreateVehicleRegistrationDto,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ) {
    return await this.service.rejectRequest(id, dto, originalUserId, req);
  }
  
  @Get(':id/unconfirmed-drivers')
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.VIEW)
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @ApiOperation({ summary: 'Lấy danh sách tài xế chưa xác nhận' })
  getDriveNotAccept(@Param('id') id: string) {
    return this.service.getUnconfirmedDriversByRegistration(id);
  }
  @Post(':id/remind-drivers')
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.PROCESS)
  @ApiOperation({ summary: 'Nhắc nhở các tài xế chưa xác nhận' })
  remindDrivers(
    @Param('id') id: string,
    @OriginalUser() originalUserId: string,
    @Req() req: any,
    @Body() dto: {note?:string},
  ) {
    const { note } = dto;
    return this.service.remindDrivers(id, originalUserId, note, req);
  }

  @Get(':id/history-car')
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @ApiOperation({ summary: 'Lịch sử chi tiết xe' })
  async getHistoryCar(
    @Param('id') id: string,
    @Query() dto: CreateVehicleRegistrationDto,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ) {
    const { authority } = dto;
    return await this.service.getHistoryCar(id,dto,originalUserId,effectiveUserId, authority === 'true' ? true : false,);
  }

  @Get(':id/history-driver')
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @ApiOperation({ summary: 'Lịch sử chi tiết tài xế' })
  async getHistoryDriver(
    @Param('id') id: string,
    @Query() dto: CreateVehicleRegistrationDto,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ) {
    const { authority } = dto;
    return await this.service.getHistoryDriver(id,dto,originalUserId,effectiveUserId, authority === 'true' ? true : false,);
  }


  @Get(':id/history')
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.VIEW)
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @ApiOperation({ summary: 'Lấy lịch sử chi tiết' })
  async getWorkflowHistories(@Param('id') id: string) {
    return await this.service.getWorkflowHistories(id);
  }
  @Get(':id')
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy chi tiết yêu cầu' })
  @ApiQuery({ type: CreateVehicleRegistrationDto, style: 'deepObject', explode: true })
  async getDetail(
    @Param('id') id: string,
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: CreateVehicleRegistrationDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    const { authority } = query;
    if (authority === 'true') {
      originalUserId = effectiveUserId;
    }
    return await this.service.getDetail(id, originalUserId, req);
  }
  
  @Patch(':id/coordination-information')
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.PROCESS)
  @ApiOperation({ summary: 'Cập nhật yêu cầu' })
  async updateCoordination(
    @Param('id') id: string, 
    @Body() dto: CreateVehicleRegistrationDto,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ) {
    return this.service.coordinationInformation(id, dto, effectiveUserId, req);
  }

  @Patch(':id')
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.UPDATE)
  @ApiOperation({ summary: 'Cập nhật yêu cầu' })
  async update(
    @Param('id') id: string, 
    @Body() updateVehicleRegistrationDto: UpdateVehicleRegistrationDto,
    @Req() req: any,
    @OriginalUser() originalUserId: string,
  ) {
    return await this.service.update(id, updateVehicleRegistrationDto, originalUserId, req);
  }

  @Delete()
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.DELETE)
  @ApiOperation({ summary: 'Xóa nhiều yêu cầu' })
  removeMultiple(
    @OriginalUser() originalUserId: string,
    @Req() req: any,
    @Body() deleteVehicleRegistrationDto: DeleteVehicleRegistrationDto
  ) {
    return this.service.removeMultiple(deleteVehicleRegistrationDto.ids, originalUserId, req);
  }

  @Delete(':id')
  @CheckAuthority(AuthorityStages.VEHICLE_REGISTRATION)
  @RequireVehiclePermission(VehicleRegistrationPermissionAction.DELETE)
  @ApiOperation({ summary: 'Xóa yêu cầu' })
  remove(
    @OriginalUser() originalUserId: string,
    @Req() req: any,
    @Param('id') id: string
  ) {
    return this.service.remove(id, originalUserId, req);
  }
}
