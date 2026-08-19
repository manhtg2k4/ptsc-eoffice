import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { RoleGroupService } from './role-group.service';
import { CreateRoleGroupDto } from './dto/create-role-group.dto';
import { AdminGuard } from 'src/users/guards/admin.guard';

@ApiTags('Quản lý Nhóm Vai trò')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('role-groups')
export class RoleGroupController {
  constructor(private readonly roleGroupService: RoleGroupService) {}

  @Get('entity/:entityId/:entityType')
  @ApiOperation({
    summary: 'Lấy nhóm vai trò theo thực thể',
    description: 'Lấy thông tin nhóm vai trò theo ID và loại của thực thể (entity)',
  })
  @ApiParam({
    name: 'entityId',
    type: String,
    description: 'ID của thực thể',
  })
  @ApiParam({
    name: 'entityType',
    type: String,
    description: 'Loại của thực thể',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thành công',
    schema: {
      example: {
        message: 'Success',
        data: {},
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy nhóm vai trò',
    schema: {
      example: {
        message: 'Role group not found',
        data: null,
      },
    },
  })
  async findByEntity(
    @Param('entityId') entityId: string,
    @Param('entityType') entityType: string,
  ) {
    const data = await this.roleGroupService.findByEntity(entityId, entityType);
  
    if (!data) {
      return {
        message: 'Role group not found',
        data: null,
      };
    }
  
    return {
      message: 'Success',
      data,
    };
  }
  

  @Post()
  @ApiOperation({
    summary: 'Tạo mới nhóm vai trò',
    description: 'Tạo mới một nhóm vai trò với thông tin vai trò, quyền hạn và các tùy chọn khác',
  })
  @ApiBody({
    type: CreateRoleGroupDto,
    description: 'Dữ liệu tạo mới nhóm vai trò',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  async create(@Body() createRoleGroupDto: CreateRoleGroupDto) {
    return this.roleGroupService.create(createRoleGroupDto);
  }
}