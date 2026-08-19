import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, ILike } from 'typeorm';
import {
  CreateAgencyDto,
  UpdateAgencyDto,
  FindAgenciesDto,
} from './agencies.dto';
import { AgencyEntity } from './agencies.entity';

@Injectable()
export class AgenciesService {
  constructor(
    @InjectRepository(AgencyEntity, 'mssqlConnection')
    private readonly agencyRepository: Repository<AgencyEntity>,
  ) {}

  async create(createAgencyDto: CreateAgencyDto) {
    if (!createAgencyDto.code || createAgencyDto.code.trim() === '') {
      throw new BadRequestException('Mã đơn vị (code) không được để trống.');
    }

    // Check for duplicate code
    const existing = await this.agencyRepository.findOne({
      where: {
        code: createAgencyDto.code,
        status: Not(3), // Not deleted
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Mã đơn vị '${createAgencyDto.code}' đã tồn tại.`,
      );
    }

    const newAgency = this.agencyRepository.create({
      ...createAgencyDto,
      status: 1, // Active
    });

    return this.agencyRepository.save(newAgency);
  }

  async findAll(query: FindAgenciesDto) {
    const { search, page = 1, limit = 10, industryType, tranStatus, lgsp } =
      query;
    const where: any = { status: Not(3) }; // Exclude deleted

    // Kiểm tra xem thuộc tính có được định nghĩa không, thay vì kiểm tra truthiness
    if (industryType !== undefined) {
      where.industryType = industryType;
    }

    if (tranStatus !== undefined) {
      where.tranStatus = tranStatus;
    }

    if (lgsp !== undefined) {
      where.lgsp = lgsp;
    }

    if (search) {
      const searchPattern = ILike(`%${search}%`);
      where._or = [
        { name: searchPattern },
        { code: searchPattern },
        { email: searchPattern },
        { phoneNumber: searchPattern },
      ];
    }

    const skip = (page - 1) * limit;

    // TypeORM không có _or, chúng ta cần xử lý nó một cách đặc biệt
    const queryBuilder = this.agencyRepository.createQueryBuilder('agency');
    queryBuilder.where({ status: Not(3) });

    if (industryType !== undefined) queryBuilder.andWhere('agency.industryType = :industryType', { industryType });
    if (tranStatus !== undefined) queryBuilder.andWhere('agency.tranStatus = :tranStatus', { tranStatus });
    if (lgsp !== undefined) queryBuilder.andWhere('agency.lgsp = :lgsp', { lgsp });

    if (search) {
      queryBuilder.andWhere(
        '(agency.name LIKE :search OR agency.code LIKE :search OR agency.email LIKE :search OR agency.phoneNumber LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('agency.updatedAt', 'DESC')
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const agency = await this.agencyRepository.findOne({
      where: { id, status: Not(3) },
    });
    if (!agency) {
      throw new NotFoundException(`Đơn vị với ID "${id}" không tồn tại.`);
    }
    return agency;
  }

  async update(id: string, updateAgencyDto: UpdateAgencyDto) {
    const agency = await this.findOne(id); // Ensure it exists and get current data

    // Optional: Check for duplicate code if it's being changed
    if (updateAgencyDto.code && updateAgencyDto.code !== agency.code) {
      const existing = await this.agencyRepository.findOne({
        where: {
          code: updateAgencyDto.code,
          id: Not(id), // Exclude the current document
          status: Not(3),
        },
      });
      if (existing) {
        throw new BadRequestException(
          `Mã đơn vị '${updateAgencyDto.code}' đã tồn tại.`,
        );
      }
    }

    await this.agencyRepository.update(id, updateAgencyDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id); // Ensure it exists
    const result = await this.agencyRepository.update(id, { status: 3 });

    if (result.affected === 0) {
      throw new NotFoundException(`Không thể xóa đơn vị với ID "${id}".`);
    }
    return { message: `Đã xóa thành công đơn vị.` };
  }
}