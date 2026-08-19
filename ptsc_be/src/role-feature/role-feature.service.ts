import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { RoleFeatureEntity } from './role-feature-sql/role-feature.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { UpdateRoleFeatureDto } from './dto/update-role-feature.dto';
import { v4 as uuidv4 } from 'uuid';

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunked: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
}

@Injectable()
export class RoleFeatureService {
  private readonly logger = new Logger(RoleFeatureService.name);
  constructor(
    @InjectRepository(RoleFeatureEntity, 'mssqlConnection')
    private readonly roleFeatureRepository: Repository<RoleFeatureEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
  ) { }

  async create(data: Partial<RoleFeatureEntity>): Promise<RoleFeatureEntity> {
    if (data.processKey) {
      const existing = await this.roleFeatureRepository.findOne({
        where: { processKey: data.processKey },
      });

      if (existing) {
        throw new BadRequestException(
          `processKey "${data.processKey}" đã tồn tại`
        );
      }
    }

    const newEntity = this.roleFeatureRepository.create({
      id: uuidv4(),
      ...data,
    });
    return this.roleFeatureRepository.save(newEntity);
  }

  async findAll(queryParams: any) {
    const {
      page = 1,
      limit = 25,
      sort,
      query,
      code,
      type,
      ...otherFilters
    } = queryParams;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 25;
    const skip = (pageNum - 1) * limitNum;

    const qb = this.roleFeatureRepository.createQueryBuilder('rf');

    // Apply filters - Chỉ cho phép các trường có trong entity để tránh SQL injection
    const allowedFilterFields = ['id', 'processKey', 'createdAt', 'updatedAt'];
    for (const key of Object.keys(otherFilters)) {
      if (otherFilters[key] !== undefined && otherFilters[key] !== '') {
        // Validate column name chỉ chứa alphanumeric và underscore
        const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');
        if (allowedFilterFields.includes(cleanKey)) {
          qb.andWhere(`rf.${cleanKey} LIKE :${cleanKey}`, { [cleanKey]: `%${otherFilters[key]}%` });
        }
      }
    }

    // Handle sort
    // Chỉ cho phép các trường thực sự tồn tại trong entity: id, processKey, createdAt, updatedAt
    const allowedSortFields = ['id', 'processKey', 'createdAt', 'updatedAt'];
    let sortField = 'rf.createdAt';
    let sortOrder: 'ASC' | 'DESC' = 'DESC';
    if (sort) {
      const cleanSort = sort.replace(/[^a-zA-Z0-9_]/g, '');
      if (allowedSortFields.includes(cleanSort)) {
        sortField = `rf.${cleanSort}`;
        sortOrder = sort.startsWith('-') ? 'DESC' : 'ASC';
      }
    }

    qb.orderBy(sortField, sortOrder);
    qb.skip(skip).take(limitNum);

    const [data, totalRecords] = await qb.getManyAndCount();
    const totalPages = Math.ceil(totalRecords / limitNum);

    // Filter roles by query if provided
    let filteredData = data;
    if (query) {
      filteredData = data.map(item => {
        if (item.roles && Array.isArray(item.roles)) {
          const filteredRoles = item.roles.filter(role =>
            role.name?.toLowerCase().includes(query.toLowerCase())
          );
          return { ...item, roles: filteredRoles };
        }
        return item;
      });
    }

    return {
      total: totalRecords,
      page: pageNum,
      limit: limitNum,
      totalPages,
      data: filteredData,
    };
  }

  async findOne(id: string): Promise<RoleFeatureEntity> {
    const roleFeature = await this.roleFeatureRepository.findOne({
      where: { id },
    });
    if (!roleFeature) {
      throw new NotFoundException(`RoleFeature with id "${id}" not found`);
    }
    return roleFeature;
  }

  async reloadRoleInfo(processKey: string, data: UpdateRoleFeatureDto): Promise<RoleFeatureEntity> {
    const oldRoleFeature = await this.roleFeatureRepository.findOne({
      where: { processKey },
    });

    if (!oldRoleFeature) {
      throw new NotFoundException(`RoleFeature with processKey "${processKey}" not found`);
    }

    const roleFeatureRoles = oldRoleFeature.roles || [];

    data.roles?.forEach(role => {
      const oldRoleAssignment = roleFeatureRoles.find(r => r.roleCode === role.roleCode);
      if (!oldRoleAssignment) return;
      role.permissions = oldRoleAssignment.permissions;
      role.users = oldRoleAssignment.users;
    });

    if (data.roles) {
      oldRoleFeature.roles = data.roles.map(r => ({
        id: uuidv4(),
        name: r.name,
        roleCode: r.roleCode,
        permissions: r.permissions || [],
        users: r.users || [],
      }));
    }

    return this.roleFeatureRepository.save(oldRoleFeature);
  }

  async update(processKey: string, data: UpdateRoleFeatureDto): Promise<RoleFeatureEntity> {
    // 1. Tìm RoleFeature trong MSSQL
    const roleFeature = await this.roleFeatureRepository.findOne({
      where: { processKey },
    });

    if (!roleFeature) {
      throw new NotFoundException(`RoleFeature with processKey "${processKey}" not found`);
    }

    // 2. Cập nhật RoleFeature với dữ liệu mới
    if (data.processKey) {
      roleFeature.processKey = data.processKey;
    }

    if (data.roles && Array.isArray(data.roles)) {
      roleFeature.roles = data.roles.map((roleDto) => ({
        id: uuidv4(),
        name: roleDto.name,
        roleCode: roleDto.roleCode,
        permissions: roleDto.permissions || [],
        users: (roleDto.users || []).filter((u) => u),
      }));
    }

    // 3. Lưu RoleFeature vào MSSQL
    const updated = await this.roleFeatureRepository.save(roleFeature);

    // 4. Cập nhật rolesByProcess cho các users trong MSSQL
    if (data.roles && Array.isArray(data.roles) && data.roles.length > 0) {
      const byUser = new Map<string, Set<{ name: string; roleCode: string }>>();

      for (const r of data.roles) {
        const roleCode = r.roleCode?.trim();
        const name = r.name?.trim();
        if (!roleCode) continue;

        const users = Array.isArray(r.users) ? r.users : [];
        for (const uid of users) {
          if (!uid) continue;
          const userRoles = byUser.get(uid) || new Set();
          userRoles.add({ name, roleCode });
          byUser.set(uid, userRoles);
        }
      }

      const userIds = Array.from(byUser.keys());
      if (userIds.length > 0) {
        const userChunks = chunkArray(userIds, 1000);
        const usersToUpdate: UserEntity[] = [];
        for (const chunk of userChunks) {
          const chunkUsers = await this.userRepository.find({
            where: { id: In(chunk) },
          });
          usersToUpdate.push(...chunkUsers);
        }

        for (const user of usersToUpdate) {
          const roleSet = byUser.get(user.id);
          if (!roleSet) continue;

          const roleObject = Array.from(roleSet);

          if (!user.rolesByProcess) {
            user.rolesByProcess = [];
          }

          const existingIndex = user.rolesByProcess.findIndex(
            (rp) => rp.processKey === processKey
          );

          if (existingIndex >= 0) {
            user.rolesByProcess[existingIndex].roles = roleObject.map(r => ({
              roleCode: r.roleCode,
              name: r.name,
            }));
          } else {
            user.rolesByProcess.push({
              processKey,
              name: roleFeature.processKey,
              roles: roleObject.map(r => ({
                roleCode: r.roleCode,
                name: r.name,
              })),
            });
          }

          await this.userRepository.save(user);
        }
      }
    }

    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.roleFeatureRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`RoleFeature with id "${id}" not found`);
    }
  }

  async findOneByProcessKey(processKey: string): Promise<RoleFeatureEntity | null> {
    try {
      const roleFeature = await this.roleFeatureRepository.findOne({
        where: { processKey },
      });

      if (!roleFeature) {
        return null;
      }

      // Thu thập tất cả user IDs từ các roles
      const userIds: string[] = [];
      if (roleFeature.roles && Array.isArray(roleFeature.roles)) {
        roleFeature.roles.forEach((role) => {
          if (role.users && Array.isArray(role.users)) {
            role.users.forEach((u: any) => {
              if (!u) return;
              if (typeof u === 'string') {
                userIds.push(u);
              } else if (typeof u === 'object') {
                const uId = u.id || u._id || u.userId;
                if (uId && typeof uId === 'string') {
                  userIds.push(uId);
                }
              }
            });
          }
        });
      }

      // Query UserEntity để lấy thông tin user
      let userMap = new Map<string, string>();
      if (userIds.length > 0) {
        const uniqueUserIds = [...new Set(userIds)];
        const userChunks = chunkArray(uniqueUserIds, 1000);
        const users: UserEntity[] = [];
        for (const chunk of userChunks) {
          const chunkUsers = await this.userRepository.find({
            where: { id: In(chunk) },
            select: ['id', 'name'],
          });
          users.push(...chunkUsers);
        }

        userMap = new Map(users.map((user) => [user.id, user.name]));
      }

      // Enrich roles với user names
      const enrichedRoleFeature = {
        ...roleFeature,
        roles: roleFeature.roles?.map((role) => ({
          ...role,
          users: role.users?.map((u: any) => {
            const uId = typeof u === 'string' ? u : (u?.id || u?._id || u?.userId);
            if (!uId) return u;
            const userName = userMap.get(uId);
            return userName ? { _id: uId, name: userName } : u;
          }) || [],
        })) || [],
      };

      return enrichedRoleFeature as RoleFeatureEntity;
    } catch (err: any) {
      this.logger.error(`Error in findOneByProcessKey for processKey=${processKey}: ${err?.message || err}`, err?.stack);
      throw err;
    }
  }

  async getUsersByRole(processDefinitionId: string, roleCode: string) {
    const roleFeature = await this.findOneByProcessKey(processDefinitionId);
    const role = roleFeature?.roles?.find(r => r.roleCode === roleCode);
    if (!role) return [];
    return role.users;
  }
}
