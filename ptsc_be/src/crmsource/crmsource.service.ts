import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike, DataSource, Brackets } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { CrmSourceEntity } from './entities/crmsource.entity';

import { CreateCrmsourceDto } from './dto/create-crmsource.dto';
import { UpdateCrmsourceDto } from './dto/update-crmsource.dto';
import { CreateCrmSourceDataDto } from './dto/create-crmsource-data.dto';
import { UpdateCrmSourceDataDto } from './dto/update-crmsource-data.dto';
import { CrmSourceDataEntity } from './entities/crmsource-data.entity';

@Injectable()
export class CrmSourcesService {
  private readonly logger = new Logger(CrmSourcesService.name);
  private readonly findByCodesCache = new Map<string, { value: any[]; expires: number }>();
  private readonly FIND_BY_CODES_TTL_MS = 5 * 60 * 1000;

  constructor(
    @InjectRepository(CrmSourceEntity, 'mssqlConnection')
    private readonly crmSourceRepo: Repository<CrmSourceEntity>,

    @InjectRepository(CrmSourceDataEntity, 'mssqlConnection')
    private readonly crmSourceDataRepo: Repository<CrmSourceDataEntity>,
    @InjectDataSource('mssqlConnection')
    private readonly dataSource: DataSource,
  ) { }

	  async findByCode(code: string): Promise<any> {
    const crm = await this.crmSourceRepo.findOne({ where: { code: code as any, status: 1 } });
    const data = await this.findDataItemsBySourceId(crm?.id || '', {});
    return data;
  }

  async findByCodes(codes: string[]): Promise<any[]> {
    if (!codes || codes.length === 0) return [];
    const cacheKey = [...codes].map((code) => String(code).trim()).filter(Boolean).sort().join('|');
    const now = Date.now();
    const cached = this.findByCodesCache.get(cacheKey);
    if (cached && cached.expires > now) {
      return JSON.parse(JSON.stringify(cached.value));
    }
    const sources = await this.crmSourceRepo.find({
      where: { code: In(codes) as any, status: 1 }
    });
    const result = await Promise.all(
      sources.map(async (source) => {
        const data = await this.crmSourceDataRepo.find({
          where: { source_id: source.id as any },
          order: { createdAt: 'ASC' },
        });
        return {
          ...source,
          data: data.map(d => ({ id: d.id, title: d.title, value: d.value })),
        };
      })
    );
    this.findByCodesCache.set(cacheKey, {
      value: result,
      expires: now + this.FIND_BY_CODES_TTL_MS,
    });
    return JSON.parse(JSON.stringify(result));
  }

  // Helper: kiểm tra code tồn tại (loại trừ id khi update)
  private async codeExists(code: string, excludeId?: string): Promise<boolean> {
    const qb = this.crmSourceRepo.createQueryBuilder('s')
      .where('s.code = :code', { code })
      .andWhere('s.status = 1');

    if (excludeId) {
      qb.andWhere('s.id != :excludeId', { excludeId });
    }

    return await qb.getExists();
  }

  // Helper: Trích xuất danh sách giá trị từ moduleCategory (hỗ trợ dạng chuỗi, mảng chuỗi hoặc mảng object)
  private extractModuleCategories(modules: any): string[] | null {
    if (!modules) return null;
    const moduleArray = Array.isArray(modules) ? modules : [modules];
    const parsedModules = moduleArray.map(m => typeof m === 'object' && m !== null ? m.value : m).filter(v => v);
    return parsedModules.length > 0 ? parsedModules : null;
  }

  // Helper: Chuyển đổi từ mảng string sang mảng object {value, title} khi trả về cho client
  private mapModuleCategory(moduleCategoryData: any, categories: any): Array<{value: string, title: string}> | null {
    if (!moduleCategoryData) return null;
    const moduleArray = Array.isArray(moduleCategoryData) ? moduleCategoryData : [moduleCategoryData];
    
    return moduleArray.map(val => {
      const v = typeof val === 'object' && val !== null ? val.value : val;
      const cat = categories?.items?.find((c: any) => c.value === v);
      return cat ? { value: cat.value, title: cat.title } : { value: v, title: v };
    });
  }

  // CREATE CRM Source + data items
  async create(createDto: CreateCrmsourceDto): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (await this.codeExists(createDto.code)) {
        throw new BadRequestException(`Mã nguồn CRM "${createDto.code}" đã tồn tại`);
      }

      const sourceId = uuidv4();

      const source = this.crmSourceRepo.create({
        id: sourceId,
        code: createDto.code,
        title: createDto.title,
        originalName: createDto.originalName,
        canDragDrop: createDto.canDragDrop ? 1 : 0,
        canDelete: createDto.canDelete ? 1 : 0,
        status: createDto.status != null ? Number(createDto.status) : 1,
        state: createDto.state,
        type: createDto.type,
        moduleCategory: this.extractModuleCategories(createDto.moduleCategory),
      });

      await queryRunner.manager.save(source);

      let dataItems: CrmSourceDataEntity[] = [];
      if (createDto.data && createDto.data.length > 0) {
        dataItems = createDto.data.map(item =>
          this.crmSourceDataRepo.create({
            id: uuidv4(),
            source_id: sourceId,
            title: item.title,
            value: item.value,
          }),
        );

        await queryRunner.manager.save(dataItems);
      }

      await queryRunner.commitTransaction();

      return this.findOne(sourceId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // CREATE DRAFT
  async createDraft(): Promise<any> {
    // const draftCode = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const draft = this.crmSourceRepo.create({
      id: uuidv4(),
      code: "",
      title: "",
      originalName: "",
      // code: draftCode,
      // title: 'Bản nháp mới',
      // originalName: 'New Draft',
      canDragDrop: 0,
      canDelete: 1,
      status: 2, // status riêng cho draft
      state: null,
      type: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.crmSourceRepo.save(draft);
    return this.findOne(draft.id!);
  }

  // FIND ALL với phân trang, filter, sort
  async findAll(queryParams: any) {
    const { page = 1, limit = 20, sort, filter } = queryParams;
    
    // Ưu tiên lấy từ filter object nếu có (tương thích với React Admin/Frontend gửi filter[key])
    const code = filter?.code || queryParams.code;
    const title = filter?.title || queryParams.title;
    const status = filter?.status !== undefined ? filter.status : queryParams.status;
    const state = filter?.state || queryParams.state;

    const skip = (page - 1) * limit;

    const qb = this.crmSourceRepo.createQueryBuilder('s')
      .where('s.status != 3'); // loại bỏ soft delete

    if (status !== undefined) qb.andWhere('s.status = :status', { status: Number(status) });
    if (state) qb.andWhere('s.state = :state', { state });

    if (code || title) {
      qb.andWhere(new Brackets(orQb => {
        if (code) orQb.where('s.code LIKE :code', { code: `%${code}%` });
        if (title) {
          if (code) orQb.orWhere('s.title LIKE :title', { title: `%${title}%` });
          else orQb.where('s.title LIKE :title', { title: `%${title}%` });
        }
      }));
    }

    // Sort
    let sortField = 's.updatedAt';
    let sortOrder: 'ASC' | 'DESC' = 'DESC';

    if (sort) {
      try {
        const sortObj = typeof sort === 'string' ? JSON.parse(sort) : sort;
        const field = Object.keys(sortObj)[0];
        if (['id', 'code', 'title', 'createdAt', 'updatedAt', 'status'].includes(field)) {
          sortField = `s.${field}`;
          sortOrder = Number(sortObj[field]) === -1 || sortObj[field] === 'DESC' ? 'DESC' : 'ASC';
        }
      } catch { }
    }

    const [sources, total] = await qb
      .orderBy(sortField, sortOrder)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // const categories = await this.findByCode('moduleCategory');

    const result = await Promise.all(
      sources.map(async (source) => {
        const data = source.id ? await this.crmSourceDataRepo.find({
          where: { source_id: source.id as any },
          order: { createdAt: 'ASC' },
        }) : [];
        return {
          ...source,
          // moduleCategory: this.mapModuleCategory(source.moduleCategory, categories),
          data: data.map(d => ({ id: d.id, title: d.title, value: d.value })),
        };
      }),
    );

    return { items: result, total };
  }

  /**
   * Lấy danh sách CRM Source có moduleCategory là 'documentModule'
   * Hỗ trợ tìm kiếm, sắp xếp và phân trang tương tự findAll
   */
  async getAllDataByCodeDoc(queryParams: any) {
    const { page = 1, limit = 20, sort, filter } = queryParams;

    // Ưu tiên lấy từ filter object nếu có
    const code = filter?.code || queryParams.code;
    const title = filter?.title || queryParams.title;
    const status = filter?.status !== undefined ? filter.status : queryParams.status;
    const state = filter?.state || queryParams.state;

    const skip = (page - 1) * limit;

    const qb = this.crmSourceRepo.createQueryBuilder('s')
      .where('s.status != 3') // loại bỏ soft delete
      .andWhere('s.moduleCategory LIKE :moduleCategory', { moduleCategory: '%"documentModule"%' });

    if (status !== undefined) qb.andWhere('s.status = :status', { status: Number(status) });
    if (state) qb.andWhere('s.state = :state', { state });

    if (code || title) {
      qb.andWhere(new Brackets(orQb => {
        if (code) orQb.where('s.code LIKE :code', { code: `%${code}%` });
        if (title) {
          if (code) orQb.orWhere('s.title LIKE :title', { title: `%${title}%` });
          else orQb.where('s.title LIKE :title', { title: `%${title}%` });
        }
      }));
    }

    // Sort logic
    let sortField = 's.updatedAt';
    let sortOrder: 'ASC' | 'DESC' = 'DESC';

    if (sort) {
      try {
        const sortObj = typeof sort === 'string' ? JSON.parse(sort) : sort;
        const field = Object.keys(sortObj)[0];
        if (['id', 'code', 'title', 'createdAt', 'updatedAt', 'status'].includes(field)) {
          sortField = `s.${field}`;
          sortOrder = Number(sortObj[field]) === -1 || sortObj[field] === 'DESC' ? 'DESC' : 'ASC';
        }
      } catch (error) { 
      }
    }

    const [sources, total] = await qb
      .orderBy(sortField, sortOrder)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // const categories = await this.findByCode('moduleCategory');

    const result = await Promise.all(
      sources.map(async (source) => {
        const data = source.id ? await this.crmSourceDataRepo.find({
          where: { source_id: source.id as any },
          order: { createdAt: 'ASC' },
        }) : [];
        return {
          ...source,
          // moduleCategory: this.mapModuleCategory(source.moduleCategory, categories),
          data: data.map(d => ({ id: d.id, title: d.title, value: d.value })),
        };
      }),
    );

    return { items: result, total };
  }

  // FIND ONE + data items
  async findOne(id: string) {
    const source = await this.crmSourceRepo.findOne({ where: { id: id as any } });
    if (!source) throw new NotFoundException(`Không tìm thấy CRM Source với ID: ${id}`);

    const [data, categories] = await Promise.all([
      this.crmSourceDataRepo.find({
        where: { source_id: id as any },
        order: { createdAt: 'ASC' },
      }),
      source.moduleCategory ? this.findByCode('moduleCategory') : Promise.resolve(null),
    ]);

    return {
      ...source,
      moduleCategory: this.mapModuleCategory(source.moduleCategory, categories),
      data: data.map(d => ({ id: d.id, title: d.title, value: d.value })),
    };
  }

  // FIND TITLES BY VALUES (crm_source_data)
  async findTitlesByValues(values: string[]): Promise<string[]> {
    if (!Array.isArray(values) || values.length === 0) {
      return [];
    }
    const uniqueValues = Array.from(new Set(values));
    const rows = await this.crmSourceDataRepo.find({
      select: ['value', 'title'],
      where: {
        value: In(uniqueValues),
      },
    });
    const valueTitleMap = new Map<string, string>();
    for (const row of rows) {
      if (row.value && row.title) {
        valueTitleMap.set(row.value, row.title);
      }
    }
    return values.map((v) => valueTitleMap.get(v) ?? v);
  }


  // UPDATE
  async update(id: string, updateDto: UpdateCrmsourceDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const source = await this.crmSourceRepo.findOne({ where: { id: id as any } });
      if (!source) throw new NotFoundException(`Không tìm thấy CRM Source với ID: ${id}`);

      if (updateDto.code && updateDto.code !== source.code) {
        if (await this.codeExists(updateDto.code, id)) {
          throw new BadRequestException(`Mã "${updateDto.code}" đã được sử dụng`);
        }
      }

      Object.assign(source, {
        code: updateDto.code ?? source.code,
        title: updateDto.title ?? source.title,
        originalName: updateDto.originalName ?? source.originalName,
        canDragDrop: updateDto.canDragDrop !== undefined ? (updateDto.canDragDrop ? 1 : 0) : source.canDragDrop,
        canDelete: updateDto.canDelete !== undefined ? (updateDto.canDelete ? 1 : 0) : source.canDelete,
        status: updateDto.status != null ? Number(updateDto.status) : source.status,
        state: updateDto.state ?? source.state,
        type: updateDto.type ?? source.type,
        moduleCategory: updateDto.moduleCategory !== undefined ? this.extractModuleCategories(updateDto.moduleCategory) : source.moduleCategory,
      });

      await queryRunner.manager.save(source);

      if (updateDto.data !== undefined) {
        await queryRunner.manager.delete(CrmSourceDataEntity, { source_id: id });

        if (updateDto.data.length > 0) {
          const newItems = updateDto.data.map(item =>
            this.crmSourceDataRepo.create({
              id: uuidv4(),
              source_id: id,
              title: item.title,
              value: item.value,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          );
          await queryRunner.manager.save(newItems);
        }
      }

      await queryRunner.commitTransaction();
      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // SOFT DELETE
  async softDelete(id: string) {
    const result = await this.crmSourceRepo.update(id, { status: 3 });
    if (result.affected === 0) throw new NotFoundException(`Không tìm thấy CRM Source với ID: ${id}`);
    return { message: 'Xóa mềm thành công' };
  }

  // SOFT DELETE MANY
  async softDeleteMany(ids: string[]) {
    if (!ids.length) throw new BadRequestException('Mảng IDs không được rỗng');
    const result = await this.crmSourceRepo.update({ id: In(ids) }, { status: 3 });
    return { deletedCount: result.affected || 0 };
  }

  // HARD DELETE (xóa vĩnh viễn)
  async hardDelete(id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.delete(CrmSourceDataEntity, { source_id: id });
      const result = await queryRunner.manager.delete(CrmSourceEntity, { id });
      if (result.affected === 0) throw new NotFoundException(`Không tìm thấy CRM Source với ID: ${id}`);

      await queryRunner.commitTransaction();
      return { message: 'Xóa vĩnh viễn thành công' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ADD DATA ITEM
  async addDataItem(sourceId: string, dto: CreateCrmSourceDataDto) {
    const source = await this.crmSourceRepo.findOne({ where: { id: sourceId as any } });
    if (!source) throw new NotFoundException(`Không tìm thấy source ${sourceId}`);

    const exists = await this.crmSourceDataRepo.findOne({
      where: { source_id: sourceId as any, value: dto.value },
    });
    if (exists) throw new BadRequestException(`Giá trị "${dto.value}" đã tồn tại`);

    const item = this.crmSourceDataRepo.create({
      id: uuidv4(),
      source_id: sourceId,
      title: dto.title,
      value: dto.value,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.crmSourceDataRepo.save(item);
  }

  // FIND DATA ITEMS BY SOURCE ID (with pagination, filter, sort)
  async findDataItemsBySourceId(sourceId: string, queryParams: any) {
    const { page = 1, limit = 200, sort, title, value } = queryParams;
    const skip = (page - 1) * limit;

    const qb = this.crmSourceDataRepo.createQueryBuilder('d')
      .where('d.source_id = :sourceId', { sourceId });

    if (title || value) {
      qb.andWhere(new Brackets(orQb => {
        if (title) orQb.where('d.title LIKE :title', { title: `%${title}%` });
        if (value) {
          if (title) orQb.orWhere('d.value LIKE :value', { value: `%${value}%` });
          else orQb.where('d.value LIKE :value', { value: `%${value}%` });
        }
      }));
    }

    let order: any = { 'd.createdAt': 'ASC' };
    if (sort) {
      const allowed = ['title', 'value', 'createdAt'];
      try {
        const sortObj = typeof sort === 'string' ? JSON.parse(sort) : sort;
        const field = Object.keys(sortObj)[0];
        const dir = sortObj[field] === -1 ? 'DESC' : 'ASC';
        if (allowed.includes(field)) order = { [`d.${field}`]: dir };
      } catch { }
    }

    const [items, total] = await qb
      .orderBy(order)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(i => ({ id: i.id, title: i.title, value: i.value })),
      total,
    };
  }

  // FIND DATA ITEM BY ID
  async findDataItemById(id: string) {
    const item = await this.crmSourceDataRepo.findOne({ where: { id: id as any } });
    if (!item) throw new NotFoundException(`Không tìm thấy data item ${id}`);
    return { id: item.id, title: item.title, value: item.value };
  }

  // UPDATE DATA ITEM
  async updateDataItem(id: string, dto: UpdateCrmSourceDataDto) {
    const item = await this.crmSourceDataRepo.findOne({ where: { id: id as any } });
    if (!item) throw new NotFoundException(`Không tìm thấy data item ${id}`);

    if (dto.value && dto.value !== item.value) {
      if (item.source_id) {
        const exists = await this.crmSourceDataRepo.findOne({
          where: { source_id: item.source_id as any, value: dto.value },
        });
        if (exists) throw new BadRequestException(`Giá trị "${dto.value}" đã tồn tại`);
      }
    }

    Object.assign(item, {
      title: dto.title ?? item.title,
      value: dto.value ?? item.value,
    });

    return this.crmSourceDataRepo.save(item);
  }

  // DELETE DATA ITEM
  async deleteDataItem(id: string) {
    const result = await this.crmSourceDataRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Không tìm thấy data item ${id}`);
    return { message: 'Xóa thành công' };
  }

  // DELETE MANY DATA ITEMS
  async deleteDataItems(ids: string[]) {
    if (!ids.length) throw new BadRequestException('Mảng IDs không được rỗng');
    const result = await this.crmSourceDataRepo.delete({ id: In(ids) });
    return { deletedCount: result.affected || 0 };
  }

  // async findByCode(code: string): Promise<any> {
  //   const crm = await this.crmSourceRepo.findOne({ where: { code: code as any, status: 1 } });
  //   const data = await this.findDataItemsBySourceId(crm?.id || '', {});
  //   return data;
  // }
}
