import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateAmenitiesDto } from './dto/create-amenities.dto';
import { UpdateAmenitiesDto } from './dto/update-amenities.dto';
import { DeleteAmenitiesDto } from './dto/delete-amenities.dto';
import { ListAmenitiesDto } from './dto/list-amenities.dto';
import { AmenitiesQueryBuilder } from './helpers/amenities-query.builder';
import { AmenitiesMapper } from './helpers/amenities.mapper';
import { ConfigurationService } from 'src/view-config/configuration.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureManagementEntity, StatusFeature } from 'src/feature-management/feature-management.entity';
import { AmenitiesRepository } from './amenities.repository';

/**
 * Service: orchestrator cho amenities (master data)
 */
@Injectable()
export class AmenitiesService {
  private readonly logger = new Logger(AmenitiesService.name);

  constructor(
    private readonly amenitiesRepo: AmenitiesRepository,
    private readonly queryBuilder: AmenitiesQueryBuilder,
    private readonly mapper: AmenitiesMapper,
    private readonly configurationService: ConfigurationService,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
  ) {}

  async create(dto: CreateAmenitiesDto) {
    return this.amenitiesRepo.create(dto);
  }

  async getDetail(id: string) {
    const amenity = await this.amenitiesRepo.getDetail(id);
    if (!amenity) {
      throw new NotFoundException('Không tìm thấy thiết bị');
    }
    return {
      id: amenity.id,
      name: amenity.name,
      status: amenity.status,
      note: amenity.note,
      meetingRoom: amenity.roomLinks?.map(link => ({
        roomId: link.meetingRoom.id,
        roomName: link.meetingRoom.name,
        quantity: link.quantity,
      })) ?? [],
    };
  }

  async update(id: string, dto: UpdateAmenitiesDto) {
    return this.amenitiesRepo.update(id, dto);
  }

  async delete(dto: DeleteAmenitiesDto) {
    return this.amenitiesRepo.delete(dto);
  }

  /**
   * List amenities (master data)
   */
  async list(query: ListAmenitiesDto) {
    const { page = 1, limit = 20, filter, sort, processFn } = query;

    // Step 1: Get feature management
    const featureManagement = await this.featureManagementRepo.findOne({
      where: { code: processFn, status: 1, statusFeature: StatusFeature.ACTIVE },
    });

    // Step 2: Build criteria from filter
    const filterCriteria = this.queryBuilder.buildCriteriaFromFilter(filter);
    const featureCriteria = featureManagement?.criteria ?? [];
    const allCriteria = [...featureCriteria, ...filterCriteria];

    // Step 3: Build WHERE clause
    const { whereClause, joins } = this.queryBuilder.buildWhereClause(
      allCriteria,
      featureManagement,
    );

    // Step 4: Build SELECT fields
    const { selectFields, aliases } = await this.queryBuilder.buildSelectFields(
      processFn,
      this.configurationService,
    );

    // Step 5: Build pagination
    const pagination = this.queryBuilder.buildPagination(page, limit);

    // Step 6: Build ORDER BY
    const orderBy = this.queryBuilder.buildOrderBy(sort, aliases);

    // Step 7: Execute query
    const { items: rawItems, total } = await this.amenitiesRepo.executeListQuery({
      selectFields,
      whereClause,
      joins,
      orderBy,
      pagination,
    });

    // Step 8: Handle empty result
    if (!rawItems.length) {
      return { items: [], total: 0 };
    }

    // Step 9: Map raw data
    const mappedItems = this.mapper.mapListItems(rawItems, aliases);

    return { items: mappedItems, total };
  }
}