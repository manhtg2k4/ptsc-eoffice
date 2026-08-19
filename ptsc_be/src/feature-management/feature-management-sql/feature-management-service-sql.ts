import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { Repository, TreeRepository, In } from 'typeorm';
import { FeatureManagementEntity } from './feature-management.entity';
import {
  CreateFeatureManagementDto,
  updateFeatureManagementDto,
} from '../feature-management.validation';
import { QueryParams } from '../../interfaces';
import { v4 as uuidv4 } from 'uuid';
import { STATUS, POSITION_LEVEL } from '../../variables/CONST_STATUS';
import { UserEntity } from 'src/users/entities/user.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';

@Injectable()
export class FeatureManagementServiceSql {
  private treeRepository: TreeRepository<FeatureManagementEntity>;

  constructor(
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureRepository: Repository<FeatureManagementEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RoleFeatureEntity, 'mssqlConnection')
    private readonly roleFeatureRepository: Repository<RoleFeatureEntity>,
  ) {
    this.treeRepository =
      this.featureRepository.manager.getTreeRepository(FeatureManagementEntity);
  }

  async create(
    createDto: CreateFeatureManagementDto,
  ): Promise<FeatureManagementEntity> {
    const existing = await this.featureRepository.findOneBy({
      code: createDto.code,
      status: STATUS.ACTIVED,
    });
    if (existing) {
      throw new BadRequestException(
        `Feature with code ${createDto.code} already exists.`,
      );
    }

    let parent: FeatureManagementEntity | null = null;
    if (createDto.parentId) {
      parent = await this.featureRepository.findOneBy({
        id: createDto.parentId,
        status: STATUS.ACTIVED,
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent feature with ID ${createDto.parentId} not found.`,
        );
      }
    }

    const newFeature = this.featureRepository.create({
      ...createDto,
      id: uuidv4(),
      status: STATUS.ACTIVED,
      parent: parent || undefined,
    });

    return this.featureRepository.save(newFeature);
  }

  async findAll(queryParams: QueryParams, userId?: string) {
    const { page = 1, limit = 25, sort = 'name,ASC', ...filters } = queryParams;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const queryBuilder = this.featureRepository.createQueryBuilder('feature');

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        queryBuilder.andWhere(`feature.${key} LIKE :${key}`, {
          [key]: `%${value}%`,
        });
      }
    });

    queryBuilder.andWhere('feature.status = :status', {
      status: STATUS.ACTIVED,
    });

    if (userId) {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        select: ['id', 'role', 'position', 'rolesByProcess'],
      });

      let isAdmin = false;
      if (user) {
        if (user.position && POSITION_LEVEL[user.position] === POSITION_LEVEL.Admin) {
          isAdmin = true;
        }
        if (user.role) {
          const roleLower = user.role.toLowerCase();
          isAdmin = isAdmin || roleLower.includes('admin') || roleLower.includes('quản trị') || roleLower.includes('administrator') || roleLower.includes('super admin');
        }
      }

      if (user && !isAdmin) {
        const rolesByProcess = Array.isArray(user.rolesByProcess) ? user.rolesByProcess : [];
        const permSet = new Set<string>();

        if (rolesByProcess.length > 0) {
          const processKeys = [...new Set(rolesByProcess.map((p) => p.processKey).filter(Boolean))];
          
          const roleFeatures: any[] = [];
          const chunkSize = 2000;
          for (let i = 0; i < processKeys.length; i += chunkSize) {
            const chunk = processKeys.slice(i, i + chunkSize);
            const chunkFeatures = await this.roleFeatureRepository.find({
              where: { processKey: In(chunk) },
              select: ['processKey', 'roles'],
            });
            roleFeatures.push(...chunkFeatures);
          }

          for (const proc of rolesByProcess) {
            const rf = roleFeatures.find((r: any) => r.processKey === proc.processKey);
            if (!rf) continue;

            for (const roleObject of proc.roles || []) {
              const roleCode = roleObject.roleCode;
              const role = (rf as any).roles?.find((r: any) => r.roleCode === roleCode);
              if (!role) continue;

              for (const perm of role.permissions || []) {
                permSet.add(perm);
              }
            }
          }
        }

        const userRoles = Array.from(permSet);
        if (userRoles.length > 0) {
          const chunkSize = 2000;
          const chunks: string[][] = [];
          for (let i = 0; i < userRoles.length; i += chunkSize) {
            chunks.push(userRoles.slice(i, i + chunkSize));
          }

          const inConditions: string[] = [];
          const parameters: Record<string, any> = {};

          chunks.forEach((chunk, index) => {
            const paramKey = `userRoles${index}`;
            inConditions.push(`feature.code IN (:...${paramKey})`);
            parameters[paramKey] = chunk;
          });

          queryBuilder.andWhere(`(${inConditions.join(' OR ')})`, parameters);
        } else {
          queryBuilder.andWhere('1 = 0');
        }
      }
    }

    if (sort) {
      const [field, order] = (sort as string).split(',');
      queryBuilder.orderBy(
        `feature.${field}`,
        order.toUpperCase() as 'ASC' | 'DESC',
      );
    }

    queryBuilder.skip((pageNum - 1) * limitNum).take(limitNum);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async findById(id: string): Promise<FeatureManagementEntity> {
    const feature = await this.featureRepository.findOne({
      where: { id, status: STATUS.ACTIVED },
      relations: ['parent'],
    });
    if (!feature) {
      throw new NotFoundException(`Feature with ID ${id} not found.`);
    }
    return feature;
  }

  async update(
    id: string,
    updateDto: updateFeatureManagementDto,
  ): Promise<FeatureManagementEntity> {
    const feature = await this.featureRepository.findOne({
      where: { id },
    });
    if (!feature) {
      throw new NotFoundException(`Feature with ID ${id} not found.`);
    }

    this.featureRepository.merge(feature, updateDto);

    return this.featureRepository.save(feature);
  }

  async delete(id: string): Promise<void> {
    const feature = await this.featureRepository.findOneBy({ id });
    if (!feature) {
      throw new NotFoundException(`Feature with ID ${id} not found.`);
    }

    const tree = await this.treeRepository.findDescendantsTree(feature);
    const idsToDelete: string[] = [];

    function collectIds(node: FeatureManagementEntity) {
      idsToDelete.push(node.id);
      if (node.children) {
        node.children.forEach(collectIds);
      }
    }
    collectIds(tree);

    if (idsToDelete.length > 0) {
      await this.featureRepository.update(
        { id: In(idsToDelete) },
        { status: STATUS.DELETED },
      );
    }
  }

  async deleteManyByIds(ids: string[]): Promise<{ affected: number }> {
    if (!ids || ids.length === 0) {
      return { affected: 0 };
    }
    const result = await this.featureRepository.update(
      { id: In(ids) },
      { status: STATUS.DELETED },
    );
    return { affected: result.affected || 0 };
  }

  // async syncFromMongo(): Promise<{
  //   total: number;
  //   synced: number;
  //   errors: any[];
  // }> {
  //   const mongoFeatures: FeatureManagementDocument[] = await this.featureManagementModel
  //     .find({ status: { $ne: STATUS.DELETED } }) // Chỉ lấy các bản ghi không bị xóa
  //     .exec();

  //   if (!mongoFeatures || mongoFeatures.length === 0) {
  //     return { total: 0, synced: 0, errors: [] };
  //   }

  //   const total = mongoFeatures.length;
  //   const errors: any[] = [];
  //   let syncedCount = 0;

  //   // Bước 1: Lấy tất cả các code từ Mongo và tìm các bản ghi tương ứng trong SQL
  //   const mongoCodes = mongoFeatures.map((f) => f.code);
  //   const existingSqlFeatures = await this.featureRepository.find({
  //     where: { code: In(mongoCodes) },
  //   });
  //   const sqlFeatureMap = new Map(
  //     existingSqlFeatures.map((f) => [f.code, f]),
  //   );

  //   // Bước 2: Tạo map từ mongo _id sang code để xử lý parentId
  //   const mongoIdToCodeMap = new Map(mongoFeatures.map((f) => [(f._id as any).toString(), f.code]));
  //   const codeToSqlIdMap = new Map(existingSqlFeatures.map(f => [f.code, f.id]));

  //   for (const mongoFeature of mongoFeatures) {
  //     try {
  //       const existingEntity = sqlFeatureMap.get(mongoFeature.code);

  //       const entityData: Partial<FeatureManagementEntity> = {
  //         code: mongoFeature.code,
  //         name: mongoFeature.name,
  //         formCode: mongoFeature.formCode,
  //         isFollowAssignee: mongoFeature.isFollowAssignee,
  //         isAuthorized: mongoFeature.isAuthorized,
  //         isCount: mongoFeature.isCount,
  //         authorizedFunction: mongoFeature.authorizedFunction,
  //         url: mongoFeature.url,
  //         apiUrl: mongoFeature.apiUrl,
  //         processID: mongoFeature.processID,
  //         statusFeature: mongoFeature.statusFeature,
  //         description: mongoFeature.description,
  //         fields: mongoFeature.fields as any[],
  //         valueField: mongoFeature.valueField,
  //         featureType: mongoFeature.featureType,
  //         status: mongoFeature.status,
  //         criteria: mongoFeature.criteria,
  //       };

  //       if (existingEntity) {
  //         // Cập nhật bản ghi đã có
  //         this.featureRepository.merge(existingEntity, entityData);
  //         await this.featureRepository.save(existingEntity);
  //       } else {
  //         // Tạo bản ghi mới
  //         const newEntity = this.featureRepository.create({
  //           ...entityData,
  //           id: uuidv4(), // Tạo id mới cho bản ghi mới
  //         });
  //         const savedEntity = await this.featureRepository.save(newEntity);
  //         // Cập nhật map để xử lý parent cho các vòng lặp sau
  //         sqlFeatureMap.set(savedEntity.code, savedEntity);
  //         codeToSqlIdMap.set(savedEntity.code, savedEntity.id);
  //       }
  //       syncedCount++;
  //     } catch (e) {
  //       errors.push({ id: (mongoFeature as any)._id, code: mongoFeature.code, error: e.message });
  //     }
  //   }

  //   // Bước 3: Cập nhật lại quan hệ cha-con sau khi tất cả các bản ghi đã được upsert
  //   for (const mongoFeature of mongoFeatures) {
  //     if (mongoFeature.parentId) {
  //       try {
  //         const childCode = mongoFeature.code;
  //         const parentCode = mongoIdToCodeMap.get(mongoFeature.parentId.toString());

  //         if (childCode && parentCode) {
  //           const childEntity = sqlFeatureMap.get(childCode);
  //           const parentEntity = sqlFeatureMap.get(parentCode);

  //           if (childEntity && parentEntity) {
  //             childEntity.parent = parentEntity;
  //             await this.featureRepository.save(childEntity);
  //           }
  //         }
  //       } catch (e) {
  //          errors.push({ id: (mongoFeature as any)._id, code: mongoFeature.code, error: `Failed to set parent: ${e.message}` });
  //       }
  //     }
  //   }

  //   return {
  //     total,
  //     synced: syncedCount,
  //     errors,
  //   };
  // }
}