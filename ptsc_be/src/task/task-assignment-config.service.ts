import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TaskAssignmentConfigEntity } from './entity/task-assignment-config.entity';
import { CreateTaskAssignmentConfigDto } from './dto/create-task-assignment-config.dto';
import { UpdateTaskAssignmentConfigDto } from './dto/update-task-assignment-config.dto';
import { UserEntity } from 'src/users/entities/user.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';

@Injectable()
export class TaskAssignmentConfigService {
  constructor(
    @InjectRepository(TaskAssignmentConfigEntity, 'mssqlConnection')
    private readonly configRepository: Repository<TaskAssignmentConfigEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly unitRepository: Repository<OrganizationUnitEntity>,
  ) { }

  async create(createDto: CreateTaskAssignmentConfigDto, userId: string): Promise<TaskAssignmentConfigEntity[]> {
    const { unitId, userIds, status = 1 } = createDto;

    // 1. Deactivate old active configs for this unit (status: 1 -> 2)
    if (status === 1) {
      await this.configRepository.update({ unitId, status: 1 }, { status: 2, updatedById: userId });
    }

    // 2. Create new configs for each user provided
    const newConfigs = userIds.map(uid => this.configRepository.create({
      unitId,
      userId: uid,
      status,
      createdById: userId,
      updatedById: userId,
    }));

    return this.configRepository.save(newConfigs);
  }

  async findAll(userId: string): Promise<any[]> {
    this.configRepository.query(`PRINT 'DEBUG: Finding configs for user: ${userId}'`);

    // 1. Get user with their unit (parent)
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['parent'],
      select: {
        id: true,
        name: true,
        organizationCode: true,
        organizationName: true,
        parent: {
          id: true,
          name: true,
        },
      },
    });

    if (!user) {
      return [];
    }

    let unitId = user.parent?.id;
    let unit = user.parent;

    // Fallback if parent is null
    if (!unitId && user.organizationCode) {
      const fallbackUnit = await this.unitRepository.findOne({
        where: { code: user.organizationCode, status: 1 }
      });
      if (fallbackUnit) {
        unitId = fallbackUnit.id;
        unit = fallbackUnit;
      }
    }

    if (!unitId) {
      return [];
    }


    // 2. Find configs for this unit
    const configs = await this.configRepository.find({
      where: { unitId, status: 1 },
      relations: ['unit', 'user'],
    });

    if (configs.length > 0) {
      return configs;
    }

    // 3. If no config, return department info with empty user
    return [
      {
        id: null,
        unitId: unitId,
        unit: unit,
        userId: null,
        user: null,
        status: 1,
      },
    ];
  }

  async findByUnitId(unitId: string): Promise<TaskAssignmentConfigEntity[]> {
    return this.configRepository.find({
      where: { unitId, status: 1 },
      relations: ['user', 'unit'],
    });
  }

  /**
   * Tìm tất cả đơn vị mà user được cấu hình là người nhận việc (uỷ quyền nhận)
   */
  async findUnitIdsByUserId(userId: string): Promise<string[]> {
    const configs = await this.configRepository.find({
      where: { userId, status: 1 },
      select: ['unitId'],
    });
    return configs.map(c => c.unitId).filter(Boolean);
  }

  /**
   * Tìm tất cả cấu hình (cả active và inactive) của user để phục vụ xem lịch sử công việc
   */
  async findAllConfigsByUserId(userId: string): Promise<TaskAssignmentConfigEntity[]> {
    return this.configRepository.find({
      where: { userId, status: In([1, 2]) },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: number, updateDto: UpdateTaskAssignmentConfigDto, userId: string): Promise<any> {
    const config = await this.configRepository.findOne({
      where: { id },
      relations: ['unit']
    });

    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }

    const { userIds, status, ...rest } = updateDto;
    const unitId = config.unitId || (config.unit ? config.unit.id : undefined);

    // If userIds is provided (even if empty array), we sync the user list for this unit
    if (Array.isArray(userIds)) {
      // 1. Deactivate all existing active configs for this unit
      await this.configRepository.update(
        { unitId, status: 1 },
        { status: 2, updatedById: userId }
      );

      // 2. If there are new userIds, create them
      if (userIds.length > 0) {
        const newConfigs = userIds.map(uid => this.configRepository.create({
          unitId,
          userId: uid,
          status: status !== undefined ? status : 1,

          createdById: userId,
          updatedById: userId,
        }));
        return this.configRepository.save(newConfigs);
      }

      // 3. If userIds is empty, we've already deactivated them above.
      // Return something indicating success
      return { success: true, message: `All configs for unit ${unitId} have been deactivated.` };
    }

    // Standard update for other fields (like status) if userIds is not provided
    if (status === 1) {
      await this.configRepository.update(
        { unitId, status: 1 },
        { status: 2, updatedById: userId }
      );
    }

    Object.assign(config, rest);
    if (status !== undefined) config.status = status;
    config.updatedById = userId;
    return this.configRepository.save(config);
  }

  async remove(id: number): Promise<void> {
    const config = await this.configRepository.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException(`Config with ID ${id} not found`);
    }
    // Soft delete by setting status to 2 (inactive)
    config.status = 2;
    await this.configRepository.save(config);
  }
}
