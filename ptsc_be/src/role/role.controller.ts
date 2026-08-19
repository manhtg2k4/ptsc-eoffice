import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AdminGuard } from 'src/users/guards/admin.guard';

@ApiTags('Quản lý Vai trò')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách vai trò',
    description: 'Lấy danh sách tất cả các vai trò, hỗ trợ lọc theo code',
  })
  @ApiQuery({
    name: 'code',
    type: String,
    required: false,
    description: 'Lọc theo code vai trò',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  async findAll(@Query('code') code: string) {
    return this.roleService.findAll(code);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết vai trò',
    description: 'Lấy thông tin chi tiết của một vai trò theo ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID của vai trò',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy vai trò',
  })
  async findById(@Param('id') id: string) {
    return this.roleService.findById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo mới vai trò',
    description: 'Tạo mới một vai trò với tên, mã vai trò và các quyền',
  })
  @ApiBody({
    type: CreateRoleDto,
    description: 'Dữ liệu tạo vai trò',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  async create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }
}
