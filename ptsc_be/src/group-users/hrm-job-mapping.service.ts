import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { HrmJobMappingEntity } from './entities/hrm-job-mapping.entity';
import { CreateHrmJobMappingDto, BatchUpdateMappingDto } from './hrm-job-mapping.dto';

@Injectable()
export class HrmJobMappingService {
  constructor(
    @InjectRepository(HrmJobMappingEntity, 'mssqlConnection')
    private readonly mappingRepo: Repository<HrmJobMappingEntity>,
  ) {}

  async findByGroup(groupUserId: string): Promise<HrmJobMappingEntity[]> {
    return this.mappingRepo.find({
      where: { groupUserId },
    });
  }

  async findAll(): Promise<HrmJobMappingEntity[]> {
    return this.mappingRepo.find();
  }

  async updateMappings(dto: CreateHrmJobMappingDto): Promise<{ success: boolean }> {
    const { groupUserId, jobCodes, jobNames } = dto;

    // Delete existing mappings for this group
    await this.mappingRepo.delete({ groupUserId });

    // Create new mappings
    const mappingsToCreate = jobCodes.map((code, index) => {
      const mapping = new HrmJobMappingEntity();
      mapping.groupUserId = groupUserId;
      mapping.hrmJobCode = code;
      mapping.hrmJobName = jobNames?.[index] || null;
      return mapping;
    });

    if (mappingsToCreate.length > 0) {
      await this.mappingRepo.save(mappingsToCreate);
    }

    return { success: true };
  }

  async batchUpdateMappings(dto: BatchUpdateMappingDto): Promise<{ success: boolean }> {
    const { mappings } = dto;
    if (!mappings || mappings.length === 0) return { success: true };

    const groupUserIds = mappings.map(m => m.groupUserId);

    // 1. Delete all existing mappings for these groups in one query
    await this.mappingRepo.delete({ groupUserId: In(groupUserIds) });

    // 2. Prepare all new mapping entities
    const allEntities: HrmJobMappingEntity[] = [];
    mappings.forEach(item => {
      if (item.hrmJobCodes && Array.isArray(item.hrmJobCodes)) {
        item.hrmJobCodes.forEach(code => {
          const entity = new HrmJobMappingEntity();
          entity.groupUserId = item.groupUserId;
          entity.hrmJobCode = code;
          allEntities.push(entity);
        });
      }
    });

    // 3. Save all at once (large batch)
    if (allEntities.length > 0) {
      await this.mappingRepo.save(allEntities, { chunk: 500 });
    }

    return { success: true };
  }
}
