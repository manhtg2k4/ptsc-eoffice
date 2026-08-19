import { Injectable, BadRequestException } from '@nestjs/common';
import { validateAndParseSortParam } from 'src/utils/sort-validator.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Brackets } from 'typeorm';
import { QueryParams } from 'src/interfaces';
import { areFiltersValid } from 'src/utils/util';
import { STATUS } from 'src/variables/CONST_STATUS';
import { DynamicForm } from './dynamic-form.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DynamicFormService {
  constructor(
    @InjectRepository(DynamicForm, 'mssqlConnection')
    private readonly dynamicFormRepository: Repository<DynamicForm>,
  ) { }

  async create(data: Partial<DynamicForm>) {
    // Check if code already exists
    if (data.code) {
      const existingRecord = await this.dynamicFormRepository.findOneBy({
        code: data.code,
      });
      if (existingRecord) {
        throw new Error(`Code "${data.code}" already exists in the database`);
      }
    }

    const entity = this.dynamicFormRepository.create(data);
    const saved = await this.dynamicFormRepository.save(entity);

    // Map id to _id
    const { id, ...rest } = saved;
    return {
      ...rest,
      _id: id,
    };
  }

  async findAll(queryParams: QueryParams) {
    const {
      page = 1,
      limit = 25,
      sort = '-created',
      codes,
      ...filters
    } = queryParams;

    if (!areFiltersValid(filters)) {
      return {
        success: false,
        message: 'Tìm kiếm không được chứa ký tự đặc biệt',
      };
    }

    // Xử lý OR search cho code và name
    const searchTerm = filters.code as string;
    let hasOrCondition = false;

    if (searchTerm && filters.name && searchTerm === filters.name) {
      hasOrCondition = true;
      delete filters.code;
      delete filters.name;
    }

    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit as string, 10) || 25, 1);
    const skip = (pageNum - 1) * limitNum;

    // Dùng QueryBuilder để kiểm soát where và OR chính xác
    const qb = this.dynamicFormRepository.createQueryBuilder('df');

    // Điều kiện mặc định: status active
    qb.where('df.status = :status', { status: STATUS.ACTIVED });

    if (codes && typeof codes === 'string') {
      const codeList = codes.split(',').map((c) => c.trim()).filter((c) => c);
      if (codeList.length > 0) {
        qb.andWhere('df.code IN (:...codeList)', { codeList });
      }
    }

    // Thêm các filter AND còn lại (LIKE %value%)
    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        qb.andWhere(`df.${key} LIKE :${key}`, { [key]: `%${filters[key]}%` });
      }
    });

    // Thêm OR condition nếu cần (case-insensitive)
    if (hasOrCondition && searchTerm) {
      qb.andWhere(
        new Brackets((innerQb) => {
          innerQb
            .orWhere('UPPER(df.code) LIKE UPPER(:searchTerm)', {
              searchTerm: `%${searchTerm}%`,
            })
            .orWhere('UPPER(df.name) LIKE UPPER(:searchTerm)', {
              searchTerm: `%${searchTerm}%`,
            });
        }),
      );
    }

    // Đếm tổng
    const totalRecords = await qb.getCount();

    // Secure sorting (dùng shared utility)
    const sortResult = validateAndParseSortParam(sort);

    if (Object.keys(sortResult).length > 0) {
      (Object.entries(sortResult) as [string, 'ASC' | 'DESC'][]).forEach(([key, order]) => {
        qb.addOrderBy(`df.${key}`, order);
      });
    } else {
      qb.orderBy('df.created', 'DESC');
    }
    qb.skip(skip).take(limitNum);

    const data = await qb.getMany();

    const totalPages = Math.ceil(totalRecords / limitNum);

    return {
      total: totalRecords,
      page: pageNum,
      limit: limitNum,
      totalPages,
      data,
    };
  }

  async findById(id: number) {
    if (!id || isNaN(id)) {
      throw new Error('Invalid ID: must be a valid number');
    }
    return this.dynamicFormRepository.findOneBy({ id });
  }

  async update(id: number, data: Partial<DynamicForm>) {
    if (!id || isNaN(id)) {
      throw new Error('Invalid ID: must be a valid number');
    }
    delete (data as any).id;
    await this.dynamicFormRepository.update(id, data);
    return this.findById(id);
  }

  async delete(id: number) {
    if (!id || isNaN(id)) {
      throw new Error('Invalid ID: must be a valid number');
    }
    const entity = await this.findById(id);
    if (entity) {
      await this.dynamicFormRepository.remove(entity);
    }
    return entity;
  }
}