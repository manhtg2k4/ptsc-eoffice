import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleGroupEntity } from './role-group.entity';
import { EntityRoleGroupEntity } from 'src/entity-rolegroup/entity-rolegroup.entity';
import { CreateRoleGroupDto } from './dto/create-role-group.dto';

@Injectable()
export class RoleGroupService {
  constructor(
    @InjectRepository(RoleGroupEntity, 'mssqlConnection')
    private readonly roleGroupRepo: Repository<RoleGroupEntity>,
    @InjectRepository(EntityRoleGroupEntity, 'mssqlConnection')
    private readonly entityRoleGroupRepo: Repository<EntityRoleGroupEntity>,
  ) { }

  // Lấy nhóm quyền của một thực thể
  async findByEntity(
    entityId: string,
    entityType: string,
  ): Promise<RoleGroupEntity | null> {
    // Note: The original query searched by entityId in RoleGroup, 
    // but the schema doesn't have entityId. This may need adjustment.
    return null;
  }

  async findById(id: string): Promise<RoleGroupEntity | null> {
    return this.roleGroupRepo.findOne({ where: { id } });
  }

  // Tạo mới nhóm quyền
  async create(createRoleGroupDto: CreateRoleGroupDto): Promise<RoleGroupEntity> {
    const newRoleGroup = this.roleGroupRepo.create(createRoleGroupDto);
    const savedRoleGroup = await this.roleGroupRepo.save(newRoleGroup);

    // Tự động tạo ánh xạ
    const existingMapping = await this.entityRoleGroupRepo.findOne({
      where: {
        unitId: createRoleGroupDto.code,
        entityType: createRoleGroupDto.entityType,
        roleGroupId: savedRoleGroup.id,
        clientId: createRoleGroupDto.clientId,
      },
    });

    if (!existingMapping) {
      const newMapping = this.entityRoleGroupRepo.create({
        unitId: createRoleGroupDto.code,
        entityType: createRoleGroupDto.entityType,
        roleGroupId: savedRoleGroup.id,
        clientId: createRoleGroupDto.clientId,
        isActive: true,
      });
      await this.entityRoleGroupRepo.save(newMapping);
    }

    return savedRoleGroup;
  }

  // Cập nhật nhóm quyền
  async update(id: string, updateRoleGroupDto: CreateRoleGroupDto) {
    const existing = await this.roleGroupRepo.findOne({ where: { id } });
    if (!existing) {
      return null;
    }

    // Update only the allowed fields
    if (updateRoleGroupDto.name) existing.name = updateRoleGroupDto.name;
    if (updateRoleGroupDto.code) existing.code = updateRoleGroupDto.code;
    if (updateRoleGroupDto.description) existing.description = updateRoleGroupDto.description;
    if (updateRoleGroupDto.entityType) existing.entityType = updateRoleGroupDto.entityType;
    if (updateRoleGroupDto.clientId) existing.clientId = updateRoleGroupDto.clientId;
    if (updateRoleGroupDto.roles) existing.roles = updateRoleGroupDto.roles as any;
    if (typeof updateRoleGroupDto.applyToModule !== 'undefined') {
      existing.applyToModule = updateRoleGroupDto.applyToModule;
    }

    const updatedRoleGroup = await this.roleGroupRepo.save(existing);

    // Cập nhật ánh xạ
    await this.entityRoleGroupRepo.update(
      {
        unitId: updateRoleGroupDto.code,
        entityType: updateRoleGroupDto.entityType,
        roleGroupId: id,
        clientId: updateRoleGroupDto.clientId,
      },
      { isActive: true },
    );

    return updatedRoleGroup;
  }
}
