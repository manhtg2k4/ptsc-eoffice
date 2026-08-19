import { RoleGroup } from './../role-group/role-group.shema';
import { Controller, Post, Body, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { EntityRoleGroupService } from './entity-rolegroup.service';
import { CreateEntityRoleGroupDto } from './entity-rolegroup.dto';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { EntityRoleGroup } from './entity-rolegroup.schema';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleGroupEntity } from 'src/role-group/role-group.entity';
import { EntityRoleGroupEntity } from './entity-rolegroup.entity';

@ApiTags('Quản lý Nhóm Vai trò theo Thực thể')
@Controller('entity-rolegroup')
export class EntityRoleGroupController {
  public static RoleGroup: Repository<RoleGroupEntity>;
  public static EntityRoleGroup: Repository<EntityRoleGroupEntity>;
  constructor(
    @InjectRepository(RoleGroupEntity, 'mssqlConnection') private RoleGroupModel: Repository<RoleGroupEntity>,
    @InjectRepository(EntityRoleGroupEntity, 'mssqlConnection') private EntityRoleGroupModel: Repository<EntityRoleGroupEntity>,
    private readonly entityRoleGroupService: EntityRoleGroupService,
    //private readonly roleGroupService: RoleGroupService,
  ) {
    EntityRoleGroupController.RoleGroup = RoleGroupModel;
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo mới ánh xạ nhóm vai trò',
    description: 'Tạo mới một ánh xạ giữa thực thể và nhóm vai trò',
  })
  @ApiBody({
    type: CreateEntityRoleGroupDto,
    description: 'Dữ liệu ánh xạ',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công',
  })
  async create(@Body() dto: CreateEntityRoleGroupDto) {
    return this.entityRoleGroupService.create(dto);
  }

  @Get('unit/:unitId')
  @ApiOperation({
    summary: 'Lấy nhóm vai trò theo ID đơn vị',
    description: 'Lấy thông tin nhóm vai trò được ánh xạ cho một đơn vị cụ thể',
  })
  @ApiParam({
    name: 'unitId',
    type: String,
    description: 'ID của đơn vị',
  })
  @ApiQuery({
    name: 'clientId',
    type: String,
    required: false,
    description: 'ID của client',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ánh xạ',
  })
  async getRoleGroupByUnitId(@Param('unitId') unitId: string, @Query('clientId') clientId: string) {
    const mapping = await this.entityRoleGroupService.findByUnitId(unitId, clientId);
    if (!mapping) {
      throw new NotFoundException(`No mapping found for unitId: ${unitId}, clientId: ${clientId}`);
    }

    // Convert roleGroupId to string if it's ObjectId
    const roleGroupId = typeof mapping.roleGroupId === 'object' && (mapping.roleGroupId as any)?.toString()
      ? (mapping.roleGroupId as any).toString()
      : String(mapping.roleGroupId);

    const roleGroup = await EntityRoleGroupController.RoleGroup.findOne({
      where: { id: roleGroupId },
    });
    if (!roleGroup) {
      throw new NotFoundException(`Role group not found for roleGroupId: ${roleGroupId}`);
    }
    return roleGroup;
  }
}