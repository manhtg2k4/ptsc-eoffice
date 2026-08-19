import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { RoleFeatureService } from './role-feature.service';
import { CreateRoleFeatureDto } from './dto/create-role-feature.dto';
import { UpdateRoleFeatureDto } from './dto/update-role-feature.dto';
import { JwtAuthGuard } from 'src/oauth/jwt.guard';
import { AdminGuard } from 'src/users/guards/admin.guard';

@ApiTags('Quản lý Quyền - Tính năng')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('role-feature-sql')
export class RoleFeatureController {
  constructor(private readonly roleFeatureService: RoleFeatureService) { }

  @Post()
  @ApiOperation({
    summary: 'Tạo mới quyền tính năng',
    description: 'Tạo mới một bản ghi quyền tính năng với thông tin về quy trình và danh sách các vai trò có quyền truy cập',
  })
  @ApiBody({
    type: CreateRoleFeatureDto,
    description: 'Dữ liệu tạo mới quyền tính năng',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công',
    schema: {
      example: {
        id: '507f1f77bcf86cd799439011',
        processKey: 'PROCESS_001',
        roles: [],
        createdAt: '2026-03-10T00:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  create(@Body() createRoleFeatureDto: CreateRoleFeatureDto) {
    return this.roleFeatureService.create(createRoleFeatureDto);
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
    description: 'Số trang (mặc định: 1)',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Số bản ghi trên một trang (mặc định: 10)',
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: false,
    description: 'Từ khóa tìm kiếm',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
    schema: {
      example: {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      },
    },
  })
  findAll(@Query() queryParams: any) {
    return this.roleFeatureService.findAll(queryParams);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết quyền tính năng',
    description: 'Lấy thông tin chi tiết của một quyền tính năng theo ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID của quyền tính năng',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết thành công',
    schema: {
      example: {
        id: '507f1f77bcf86cd799439011',
        processKey: 'PROCESS_001',
        roles: [],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy quyền tính năng',
  })
  findOne(@Param('id') id: string) {
    return this.roleFeatureService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Cập nhật quyền tính năng',
    description: 'Cập nhật thông tin của một quyền tính năng theo ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID của quyền tính năng cần cập nhật',
  })
  @ApiBody({
    type: UpdateRoleFeatureDto,
    description: 'Dữ liệu cập nhật',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy quyền tính năng',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  update(@Param('id') id: string, @Body() updateRoleFeatureDto: UpdateRoleFeatureDto) {
    return this.roleFeatureService.update(id, updateRoleFeatureDto);
  }

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
    description: 'Cập nhật và tải lại thống công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy quyền tính năng',
  })
  updateRolesInfo(@Param('id') id: string, @Body() updateRoleFeatureDto: UpdateRoleFeatureDto) {
    return this.roleFeatureService.reloadRoleInfo(id, updateRoleFeatureDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa quyền tính năng',
    description: 'Xóa một quyền tính năng theo ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID của quyền tính năng cần xóa',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy quyền tính năng',
  })
  remove(@Param('id') id: string) {
    return this.roleFeatureService.remove(id);
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
    schema: {
      example: {
        id: '507f1f77bcf86cd799439011',
        processKey: 'PROCESS_001',
        roles: [],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy quy trình',
  })
  async findOneByProcessKey(@Param('processKey') processKey: string) {
    return this.roleFeatureService.findOneByProcessKey(processKey);
  }
}
