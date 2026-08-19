import { Injectable, ConflictException } from '@nestjs/common';
import { CreateEntityRoleGroupDto } from './entity-rolegroup.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityRoleGroupEntity } from './entity-rolegroup.entity';
import { Repository } from 'typeorm';

@Injectable()
export class EntityRoleGroupService {
  constructor(
    @InjectRepository(EntityRoleGroupEntity, 'mssqlConnection')
    private entityRoleMappingRepo: Repository<EntityRoleGroupEntity>,
  ) { }
  async create(dto: CreateEntityRoleGroupDto): Promise<EntityRoleGroupEntity> {
    // Kiểm tra xem đã tồn tại bản ghi với cùng unitId, entityType, clientId chưa
    const existing = await this.entityRoleMappingRepo.findOne({
      where: {
        unitId: dto.unitId,
        entityType: dto.entityType,
        clientId: dto.clientId,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Mapping already exists for this unitId, entityType, and clientId',
      );
    }

    // Tạo entity mới từ DTO
    const newMapping = this.entityRoleMappingRepo.create(dto);

    // Lưu vào database và trả về entity đã được lưu (có id, createdAt, updatedAt, v.v.)
    return await this.entityRoleMappingRepo.save(newMapping);
  }

  async findByUnitId(
    unitId: string,
    clientId: string,
  ): Promise<EntityRoleGroupEntity | null> {
    return await this.entityRoleMappingRepo.findOne({
      where: {
        unitId,
        clientId,
        isActive: true, // nếu entity có field isActive, nếu không có thì bỏ dòng này
      },
    });
  }
}