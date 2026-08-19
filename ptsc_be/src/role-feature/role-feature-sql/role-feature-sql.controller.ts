import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { RoleFeatureSqlService } from './role-feature-sql.service';
import {
  CreateRoleFeatureSqlDto,
  GetRoleFeatureActionsQueryDto,
  UpdateRoleFeatureSqlDto,
} from './role-feature-sql.dto';
import { UpdateRoleFeatureDto } from '../dto/update-role-feature.dto';

import { JwtAuthGuard } from 'src/oauth/jwt.guard';
import { AdminGuard } from 'src/users/guards/admin.guard';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';

@ApiTags('Quản lý Quyền - Tính năng (SQL)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('role-feature')
export class RoleFeatureSqlController {
  constructor(
    private readonly roleFeatureSqlService: RoleFeatureSqlService,
    private readonly systemLogService: SystemLogServiceSql,
  ) { }

  private async writeSystemLog(
    req: any,
    action: string,
    status: 'SUCCESS' | 'ERROR',
    details: string,
  ): Promise<void> {
    await this.systemLogService.createLogFromSystem({
      action,
      details,
      method: action,
      status,
      type: 'FEATURE_MANAGEMENT',
      subType: 'ROLE_FEATURE',
      userInfo: req?.user?.userId || '',
      ipAddress: req?.socket?.remoteAddress || 'Unknown',
      timestamp: new Date().toISOString(),
    });
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo mới quyền tính năng',
    description: 'Tạo mới một bản ghi quyền tính năng với thông tin về quy trình và danh sách các vai trò có quyền truy cập',
  })
  @ApiBody({
    type: CreateRoleFeatureSqlDto,
    description: 'Dữ liệu tạo mới quyền tính năng',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  async create(@Body() createRoleFeatureDto: CreateRoleFeatureSqlDto, @Req() req: any) {
    try {
      const result = await this.roleFeatureSqlService.create(createRoleFeatureDto);
      await this.writeSystemLog(req, 'POST', 'SUCCESS', `Phân quyền chức năng: Tạo mới [${createRoleFeatureDto.processKey}]`);
      return result;
    } catch (error) {
      await this.writeSystemLog(req, 'POST', 'ERROR', `Lỗi: Phân quyền chức năng: Tạo mới [${createRoleFeatureDto.processKey}] - ${error.message}`);
      throw error;
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách quyền tính năng',
    description: 'Lấy danh sách tất cả các quyền tính năng với hỗ trợ phân trang và tìm kiếm',
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
  findAll(@Query() queryParams: any) {
    return this.roleFeatureSqlService.findAll(queryParams);
  }

  @Get('related-processes')
  @ApiOperation({
    summary: 'Lấy danh sách quyền tính năng theo các quy trình liên quan',
    description: 'Lấy danh sách quyền tính năng có hỗ trợ bộ lọc quy trình liên quan (relatedProcesses), ID nhóm người dùng (groupId), ID người dùng (userId) và ID đơn vị (orgUnitId)',
  })
  @ApiQuery({
    name: 'relatedProcesses',
    type: String,
    required: false,
    description: 'Danh sách quy trình liên quan (phân tách bằng dấu phẩy hoặc dạng mảng)',
  })
  @ApiQuery({
    name: 'groupId',
    type: String,
    required: false,
    description: 'ID của nhóm người dùng',
  })
  @ApiQuery({
    name: 'userId',
    type: String,
    required: false,
    description: 'ID của người dùng',
  })
  @ApiQuery({
    name: 'orgUnitId',
    type: String,
    required: false,
    description: 'ID của đơn vị/khối',
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
  @ApiQuery({
    name: 'showInPermissionDetail',
    type: Boolean,
    required: false,
    description: 'Lọc các luồng quy trình hiển thị trong chi tiết phân quyền (true/false)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  findByRelatedProcesses(@Query() queryParams: any) {
    return this.roleFeatureSqlService.findByRelatedProcesses(queryParams);
  }

  @Get('actions-by-feature')
  @ApiOperation({
    summary: 'Lay danh sach userTask BPMN theo chuc nang va user/group',
    description: 'Truyen featureId hoac processKey, kem userId hoac groupId de lay cac userTask BPMN trong lane cua role co trong group_users.roles_dynamic. Neu co featureId thi loc role duoc tick chuc nang', 
  })
  @ApiQuery({
    name: 'featureId',
    type: String,
    required: false,
    description: 'ID cua chuc nang trong feature_management. Dung de loc role duoc tick chuc nang',
  })
  @ApiQuery({
    name: 'processKey',
    type: String,
    required: false,
    description: 'Ma quy trinh BPMN. Dung khi khong truyen featureId hoac de validate process cua feature',
  })
  @ApiQuery({
    name: 'userId',
    type: String,
    required: false,
    description: 'ID nguoi dung. API lay role tu cac nhom cua user trong group_users.roles_dynamic',
  })
  @ApiQuery({
    name: 'groupId',
    type: String,
    required: false,
    description: 'ID nhom nguoi dung. Dung khi khong truyen userId',
  })
  @ApiResponse({
    status: 200,
    description: 'Lay danh sach userTask thanh cong',
  })
  getActionsByFeature(@Query() query: GetRoleFeatureActionsQueryDto) {
    return this.roleFeatureSqlService.getActionsByFeature(query);
  }


  @Get('process/:processKey')
  @ApiOperation({
    summary: 'Lấy quyền tính năng theo khóa quy trình',
    description: 'Lấy thông tin quyền tính năng theo khóa quy trình (processKey)',
  })
  @ApiParam({
    name: 'processKey',
    type: String,
    description: 'Khóa định danh của quy trình',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy quy trình',
  })
  findOneByProcessKey(@Param('processKey') processKey: string) {
    return this.roleFeatureSqlService.findOneByProcessKey(processKey);
  }

  @Get(':processKey')
  @ApiOperation({
    summary: 'Lấy chi tiết quyền tính năng',
    description: 'Lấy thông tin chi tiết của một quyền tính năng theo khóa quy trình',
  })
  @ApiParam({
    name: 'processKey',
    type: String,
    description: 'Khóa định danh của quy trình',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy quy trình',
  })
  findOne(@Param('processKey') processKey: string) {
    return this.roleFeatureSqlService.findOneByProcessKey(processKey);
  }

  @Patch(':processKey')
  @ApiOperation({
    summary: 'Cập nhật quyền tính năng',
    description: 'Cập nhật thông tin của một quyền tính năng theo khóa quy trình',
  })
  @ApiParam({
    name: 'processKey',
    type: String,
    description: 'Khóa định danh của quy trình cần cập nhật',
  })
  @ApiBody({
    type: UpdateRoleFeatureSqlDto,
    description: 'Dữ liệu cập nhật',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy quy trình',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  async update(
    @Param('processKey') processKey: string,
    @Body() updateRoleFeatureDto: UpdateRoleFeatureSqlDto,
    @Req() req: any,
  ) {
    try {
      const result = await this.roleFeatureSqlService.update(processKey, updateRoleFeatureDto);
      await this.writeSystemLog(req, 'PATCH', 'SUCCESS', `Phân quyền chức năng: Cập nhật [${processKey}]`);
      return result;
    } catch (error) {
      await this.writeSystemLog(req, 'PATCH', 'ERROR', `Lỗi: Phân quyền chức năng: Cập nhật [${processKey}] - ${error.message}`);
      throw error;
    }
  }

  @Patch('old/:processKey')
  @ApiOperation({
    summary: 'Cập nhật quyền tính năng',
    description: 'Cập nhật thông tin của một quyền tính năng theo khóa quy trình',
  })
  @ApiParam({
    name: 'processKey',
    type: String,
    description: 'Khóa định danh của quy trình cần cập nhật',
  })
  @ApiBody({
    type: UpdateRoleFeatureSqlDto,
    description: 'Dữ liệu cập nhật',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy quy trình',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  async updateOld(
    @Param('processKey') processKey: string,
    @Body() updateRoleFeatureDto: UpdateRoleFeatureSqlDto,
    @Req() req: any,
  ) {
    try {
      const result = await this.roleFeatureSqlService.updateOld(processKey, updateRoleFeatureDto);
      await this.writeSystemLog(req, 'PATCH', 'SUCCESS', `Phân quyền chức năng: Cập nhật dữ liệu cũ [${processKey}]`);
      return result;
    } catch (error) {
      await this.writeSystemLog(req, 'PATCH', 'ERROR', `Lỗi: Phân quyền chức năng: Cập nhật dữ liệu cũ [${processKey}] - ${error.message}`);
      throw error;
    }
  }

  @Delete(':processKey')
  @ApiOperation({
    summary: 'Xóa quyền tính năng',
    description: 'Xóa một quyền tính năng theo khóa quy trình',
  })
  @ApiParam({
    name: 'processKey',
    type: String,
    description: 'Khóa định danh của quy trình cần xóa',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy quy trình',
  })
  async remove(@Param('processKey') processKey: string, @Req() req: any) {
    try {
      const result = await this.roleFeatureSqlService.remove(processKey);
      await this.writeSystemLog(req, 'DELETE', 'SUCCESS', `Phân quyền chức năng: Xóa [${processKey}]`);
      return result;
    } catch (error) {
      await this.writeSystemLog(req, 'DELETE', 'ERROR', `Lỗi: Phân quyền chức năng: Xóa [${processKey}] - ${error.message}`);
      throw error;
    }
  }

  // @Post('sync-from-mongo')
  // @HttpCode(200) // Đặt mã trạng thái thành công là 200 cho POST
  // async syncFromMongo() {
  //   const result = await this.roleFeatureSqlService.syncFromMongo();
  //   return { success: true, data: result };
  // }



  @Patch('roles-info/:id')
  @ApiOperation({
    summary: 'Cập nhật thông tin vai trò',
    description: 'Cập nhật và tải lại thông tin vai trò cho quyền tính năng',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID của quyền tính năng',
  })
  @ApiBody({
    type: UpdateRoleFeatureDto,
    description: 'Dữ liệu cập nhật thông tin vai trò',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật và tải lại thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy quyền tính năng',
  })
  async updateRolesInfo(@Param('id') id: string, @Body() updateRoleFeatureDto: UpdateRoleFeatureDto, @Req() req: any) {
    updateRoleFeatureDto.processKey = updateRoleFeatureDto.processKey || id;
    try {
      const result = await this.roleFeatureSqlService.reloadRoleInfo(id, updateRoleFeatureDto as UpdateRoleFeatureSqlDto);
      await this.writeSystemLog(req, 'PATCH', 'SUCCESS', `Phân quyền chức năng: Cập nhật thông tin vai trò [${id}]`);
      return result;
    } catch (error) {
      await this.writeSystemLog(req, 'PATCH', 'ERROR', `Lỗi: Phân quyền chức năng: Cập nhật thông tin vai trò [${id}] - ${error.message}`);
      throw error;
    }
  }

}
