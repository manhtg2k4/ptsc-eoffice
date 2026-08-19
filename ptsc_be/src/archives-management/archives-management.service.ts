import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { validateAndParseSortParam, getDtoKeys } from 'src/utils/sort-validator.util';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { ArchivesEntity } from './entities/archives.entity';
import { ArchivesDocumentIndexEntity } from './entities/archives-document-index.entity';
import { SourceStorageEntity } from '../profile-storage/entities/source-storage.entity';
import { CreateArchivesDto, CreateDocumentIndexDto } from './dto/create-archives.dto';
import { UpdateArchivesDto, UpdateDocumentIndexDto } from './dto/update-archives.dto';
import { ListArchivesDto } from './dto/list-archives.dto';
import {
  ARCHIVES_TYPE_MAP,
  ARCHIVES_DEADLINE_MAP,
  ARCHIVES_MODE_MAP,
  ARCHIVES_LANGUAGE_MAP,
  ARCHIVES_ORGANIZATION_UNIT_MAP,
} from './dto/create-archives.dto';

// Format date thành DD/MM/YYYY
function formatDateOnly(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  } catch {
    return null;
  }
}

// Map SELECT field sang object {value, title}
function mapSelectField(value: string | null | undefined, map: Record<string, string>): { value: string; title: string } | null {
  if (!value) return null;
  return {
    value: value,
    title: map[value] || value,
  };
}

@Injectable()
export class ArchivesManagementService {
  constructor(
    @InjectRepository(ArchivesEntity, 'mssqlConnection')
    private readonly archivesRepo: Repository<ArchivesEntity>,
    @InjectRepository(ArchivesDocumentIndexEntity, 'mssqlConnection')
    private readonly docIndexRepo: Repository<ArchivesDocumentIndexEntity>,
    @InjectRepository(SourceStorageEntity, 'mssqlConnection')
    private readonly sourceStorageRepo: Repository<SourceStorageEntity>,
    @InjectDataSource('mssqlConnection')
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Sinh số và ký hiệu hồ sơ theo đợt (năm hiện tại)
   * Format: HS-YYYY-XXXX (ví dụ: HS-2025-0001)
   */
  private async generateArchivesNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `HS-${currentYear}-`;

    const lastArchives = await this.archivesRepo
      .createQueryBuilder('archives')
      .where('archives.archives_number LIKE :prefix', { prefix: `${prefix}%` })
      .andWhere('archives.status = 1')
      .orderBy('archives.archives_number', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastArchives) {
      const lastNumber = parseInt(lastArchives.archivesNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  // ========== API LẤY DANH SÁCH HỒ SƠ NGUỒN CHO SELECT ==========

  /**
   * Lấy danh sách hồ sơ nguồn để hiển thị trong SELECT (Tiêu đề hồ sơ)
   */
  async getSourceStorages() {
    try {
      const sourceStorages = await this.sourceStorageRepo.find({
        where: { status: 1 },
        order: { createdAt: 'DESC' },
        select: ['id', 'title', 'textSymbol'],
      });

      return {
        success: true,
        message: 'Lấy danh sách hồ sơ nguồn thành công',
        data: sourceStorages.map((item) => ({
          id: item.id,
          title: item.title,
          value: item.textSymbol,
        })),
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: 'Lấy danh sách hồ sơ nguồn thất bại',
        errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
      });
    }
  }

  /**
   * Lấy chi tiết hồ sơ nguồn theo ID
   */
  async getSourceStorageById(id: number) {
    try {
      const sourceStorage = await this.sourceStorageRepo.findOne({
        where: { id, status: 1 },
      });

      if (!sourceStorage) {
        throw new NotFoundException({
          success: false,
          message: 'Không tìm thấy hồ sơ nguồn',
          errors: [{ field: 'id', message: 'Hồ sơ nguồn không tồn tại' }],
        });
      }

      return {
        success: true,
        message: 'Lấy chi tiết hồ sơ nguồn thành công',
        data: {
          id: sourceStorage.id,
          title: sourceStorage.title,
          value: sourceStorage.textSymbol,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException({
        success: false,
        message: 'Lấy chi tiết hồ sơ nguồn thất bại',
        errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
      });
    }
  }

  /**
   * Tạo bản draft - lưu vào DB với archivesName = null
   * FE dùng id và archivesNumber để hiển thị
   * Khi user thoát không lưu, FE gọi API deleteDraft để xóa hẳn
   */
  async createDraft(userId?: string | number | null) {
    try {
      const archivesNumber = await this.generateArchivesNumber();

      const draft = this.archivesRepo.create({
        archivesNumber,
        archivesName: null, // NULL vì chưa chọn hồ sơ nguồn
        archivesType: '',
        archivesDeadline: '',
        archivesMode: '',
        archivesYear: new Date(),
        archivesOrganizationUnit: '',
        archivesLanguage: '',
        archivesNote: null,
        archivesStatus: 'Chưa phê duyệt danh mục',
        isDraft: true,
        status: 1,
        createdBy: userId ? String(userId) : null,
      });

      const savedDraft = await this.archivesRepo.save(draft);

      return {
        success: true,
        message: 'Tạo bản nháp thành công',
        data: {
          id: savedDraft.id,
          archivesNumber: savedDraft.archivesNumber,
        },
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: 'Tạo bản nháp thất bại',
        errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
      });
    }
  }

  /**
   * Xóa bản draft - xóa hẳn khỏi DB (hard delete)
   * Gọi khi user thoát form mà không lưu
   */
  async deleteDraft(id: number) {
    try {
      const draft = await this.archivesRepo.findOne({
        where: { id, isDraft: true, status: 1 },
      });

      if (!draft) {
        throw new NotFoundException({
          success: false,
          message: 'Không tìm thấy bản nháp',
          errors: [{ field: 'id', message: 'Bản nháp không tồn tại hoặc đã được lưu' }],
        });
      }

      // Xóa hẳn khỏi DB (hard delete)
      await this.archivesRepo.remove(draft);

      return {
        success: true,
        message: 'Xóa bản nháp thành công',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException({
        success: false,
        message: 'Xóa bản nháp thất bại',
        errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
      });
    }
  }


  /**
   * Tạo mới hồ sơ + danh mục tài liệu (1 request)
   * Nếu có archivesNumber từ draft, sẽ cập nhật draft thành chính thức
   */
  async create(dto: CreateArchivesDto, userId?: string | number | null) {
    return await this.dataSource.transaction(async (manager) => {
      try {
        // Kiểm tra hồ sơ nguồn tồn tại
        const sourceStorage = await manager.findOne(SourceStorageEntity, {
          where: { id: dto.archivesName, status: 1 },
        });

        if (!sourceStorage) {
          throw new BadRequestException({
            success: false,
            message: 'Hồ sơ nguồn không tồn tại',
            errors: [{ field: 'archivesName', message: 'Hồ sơ nguồn không tồn tại hoặc đã bị xóa' }],
          });
        }

        const finalUserId = userId ? String(userId) : null;
        let savedArchives: ArchivesEntity;

        // Kiểm tra xem có draft với archivesNumber này không - BẮT BUỘC phải có draft
        const existingDraft = await manager.findOne(ArchivesEntity, {
          where: { archivesNumber: dto.archivesNumber, isDraft: true, status: 1 },
        });

        if (!existingDraft) {
          throw new BadRequestException({
            success: false,
            message: 'Số và ký hiệu hồ sơ không hợp lệ',
            errors: [{ field: 'archivesNumber', message: 'Số và ký hiệu hồ sơ không tồn tại trong bản nháp. Vui lòng tạo bản nháp trước.' }],
          });
        }

        // Cập nhật draft thành chính thức
        existingDraft.archivesName = dto.archivesName;
        existingDraft.archivesType = dto.archivesType;
        existingDraft.archivesDeadline = dto.archivesDeadline;
        existingDraft.archivesMode = dto.archivesMode;
        existingDraft.archivesYear = new Date(dto.archivesYear);
        existingDraft.archivesOrganizationUnit = dto.archivesOrganizationUnit;
        existingDraft.archivesLanguage = dto.archivesLanguage;
        existingDraft.archivesNote = dto.archivesNote || null;
        existingDraft.archivesStatus = 'Chưa phê duyệt danh mục';
        existingDraft.isDraft = false;
        if (finalUserId) existingDraft.createdBy = finalUserId;

        savedArchives = await manager.save(ArchivesEntity, existingDraft);

        const docIndexes = await this.saveDocumentIndexes(manager, savedArchives.id, dto.listDocIndex || [], finalUserId);

        return this.formatArchivesResponse(savedArchives, sourceStorage, docIndexes, 'Tạo mới hồ sơ thành công');
      } catch (error) {
        if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
        throw new BadRequestException({
          success: false,
          message: 'Tạo mới hồ sơ thất bại',
          errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
        });
      }
    });
  }

  private async saveDocumentIndexes(
    manager: any,
    archivesId: number,
    listDocIndex: CreateDocumentIndexDto[],
    userId: string | null,
  ): Promise<ArchivesDocumentIndexEntity[]> {
    if (!listDocIndex || listDocIndex.length === 0) return [];

    const docEntities = listDocIndex.map((doc) =>
      manager.create(ArchivesDocumentIndexEntity, {
        nameDoc: doc.nameDoc,
        archivesId,
        status: 1,
        createdBy: userId,
      }),
    );

    return await manager.save(ArchivesDocumentIndexEntity, docEntities);
  }

  /**
   * Format response với object cho các trường SELECT + thông tin hồ sơ nguồn
   * Response trả về archivesName là object chứa thông tin từ source_storage_documents
   */
  private formatArchivesResponse(
    archives: ArchivesEntity,
    sourceStorage: SourceStorageEntity | null,
    docIndexes: ArchivesDocumentIndexEntity[],
    message: string,
  ) {
    return {
      success: true,
      message,
      data: {
        id: archives.id,
        archivesNumber: archives.archivesNumber,
        archivesName: sourceStorage ? {
          id: sourceStorage.id,
          title: sourceStorage.title,
          value: sourceStorage.textSymbol,
        } : null,
        archivesType: mapSelectField(archives.archivesType, ARCHIVES_TYPE_MAP),
        archivesDeadline: mapSelectField(archives.archivesDeadline, ARCHIVES_DEADLINE_MAP),
        archivesMode: mapSelectField(archives.archivesMode, ARCHIVES_MODE_MAP),
        archivesYear: formatDateOnly(archives.archivesYear),
        archivesOrganizationUnit: mapSelectField(archives.archivesOrganizationUnit, ARCHIVES_ORGANIZATION_UNIT_MAP),
        archivesLanguage: mapSelectField(archives.archivesLanguage, ARCHIVES_LANGUAGE_MAP),
        archivesNote: archives.archivesNote,
        archivesStatus: archives.archivesStatus,
        isDraft: archives.isDraft,
        status: archives.status,
        createdBy: archives.createdBy,
        createdAt: formatDateOnly(archives.createdAt),
        updatedAt: formatDateOnly(archives.updatedAt),
        destroyBatchCode: archives.destroyBatchCode,
        listDocIndex: docIndexes.map((doc) => ({
          id: doc.id,
          nameDoc: doc.nameDoc,
          createdAt: formatDateOnly(doc.createdAt),
          updatedAt: formatDateOnly(doc.updatedAt),
        })),
      },
    };
  }


  /**
   * Lấy danh sách hồ sơ với phân trang và filter
   */
  async findAll(query: ListArchivesDto) {
    try {
      const { page = '1', limit = '25', sort, filter } = query;

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 25, 1);
      const skip = (pageNum - 1) * limitNum;

      const qb = this.archivesRepo.createQueryBuilder('archives');

      qb.where('archives.status = 1');
      qb.andWhere('archives.is_draft = 0');

      // Xử lý filter
      if (filter && typeof filter === 'object') {
        Object.entries(filter).forEach(([key, value]) => {
          if (!value) return;

          // Map field name từ code sang DB column name
          const fieldMap: Record<string, string> = {
            archivesNumber: 'archives.archives_number',
            archivesName: 'archives.source_storage_id', // archivesName trong code -> source_storage_id trong DB
            archivesType: 'archives.archives_type',
            archivesDeadline: 'archives.archives_deadline',
            archivesMode: 'archives.archives_mode',
            archivesYear: 'archives.archives_year',
            archivesOrganizationUnit: 'archives.archives_organization_unit',
            archivesLanguage: 'archives.archives_language',
            archivesStatus: 'archives.archives_status',
          };

          const dbField = fieldMap[key] || `archives.${key}`;

          if (typeof value === 'object' && (value.startDate || value.endDate)) {
            if (value.startDate && value.endDate) {
              qb.andWhere(`${dbField} >= :${key}Start AND ${dbField} < DATEADD(DAY, 1, :${key}End)`, {
                [`${key}Start`]: value.startDate,
                [`${key}End`]: value.endDate,
              });
            } else if (value.startDate) {
              qb.andWhere(`${dbField} >= :${key}Start`, { [`${key}Start`]: value.startDate });
            } else if (value.endDate) {
              qb.andWhere(`${dbField} < DATEADD(DAY, 1, :${key}End)`, { [`${key}End`]: value.endDate });
            }
            return;
          }

          if (typeof value === 'string') {
            qb.andWhere(`${dbField} LIKE :${key}`, { [key]: `%${value}%` });
          }

          if (typeof value === 'number') {
            qb.andWhere(`${dbField} = :${key}`, { [key]: value });
          }
        });
      }

      // Xử lý sort (dùng DTO làm whitelist)
      const allowedSortFields = [
        ...getDtoKeys(CreateArchivesDto),
        'archivesStatus', 'createdAt', 'updatedAt'
      ];
      const sortResult = validateAndParseSortParam(sort, allowedSortFields);

      if (Object.keys(sortResult).length > 0) {
        (Object.entries(sortResult) as [string, 'ASC' | 'DESC'][]).forEach(([key, order]) => {
          qb.addOrderBy(`archives.${key}`, order);
        });
      } else {
        qb.orderBy('archives.created_at', 'DESC');
      }

      qb.skip(skip).take(limitNum);

      const [items, total] = await qb.getManyAndCount();

      // Lấy thông tin hồ sơ nguồn cho tất cả items
      const sourceStorageIds = [...new Set(items.map((item) => item.archivesName).filter((id): id is number => id !== null && id !== undefined))];
      const sourceStorages = sourceStorageIds.length > 0
        ? await this.sourceStorageRepo.find({ where: { id: In(sourceStorageIds) } })
        : [];
      const sourceStorageMap = new Map(sourceStorages.map((s) => [s.id, s]));

      const formattedItems = items.map((item) => {
        const sourceStorage = item.archivesName ? sourceStorageMap.get(item.archivesName) : null;
        return {
          id: item.id,
          archivesNumber: item.archivesNumber,
          archivesName: sourceStorage?.title || null,
          archivesType: ARCHIVES_TYPE_MAP[item.archivesType] || item.archivesType || null,
          archivesDeadline: ARCHIVES_DEADLINE_MAP[item.archivesDeadline] || item.archivesDeadline || null,
          archivesMode: ARCHIVES_MODE_MAP[item.archivesMode] || item.archivesMode || null,
          archivesYear: formatDateOnly(item.archivesYear),
          archivesOrganizationUnit: ARCHIVES_ORGANIZATION_UNIT_MAP[item.archivesOrganizationUnit] || item.archivesOrganizationUnit || null,
          archivesLanguage: ARCHIVES_LANGUAGE_MAP[item.archivesLanguage] || item.archivesLanguage || null,
          archivesNote: item.archivesNote,
          archivesStatus: item.archivesStatus,
          createdAt: formatDateOnly(item.createdAt),
          updatedAt: formatDateOnly(item.updatedAt),
          destroyBatchCode: item.destroyBatchCode,
        };
      });

      return {
        success: true,
        message: 'Lấy danh sách hồ sơ thành công',
        data: formattedItems,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: 'Lấy danh sách hồ sơ thất bại',
        errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
      });
    }
  }

  /**
   * Lấy chi tiết hồ sơ theo ID (kèm danh mục tài liệu)
   */
  async findOne(id: number) {
    try {
      const archives = await this.archivesRepo.findOne({
        where: { id, status: 1, isDraft: false },
      });

      if (!archives) {
        throw new NotFoundException({
          success: false,
          message: 'Không tìm thấy hồ sơ',
          errors: [{ field: 'id', message: 'Hồ sơ không tồn tại' }],
        });
      }

      // Lấy thông tin hồ sơ nguồn (chỉ query nếu archivesName không null)
      const sourceStorage = archives.archivesName
        ? await this.sourceStorageRepo.findOne({
            where: { id: archives.archivesName },
          })
        : null;

      // Lấy danh mục tài liệu
      const docIndexes = await this.docIndexRepo.find({
        where: { archivesId: id, status: 1 },
        order: { createdAt: 'ASC' },
      });

      return this.formatArchivesResponse(archives, sourceStorage ?? null, docIndexes, 'Lấy chi tiết hồ sơ thành công');
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException({
        success: false,
        message: 'Lấy chi tiết hồ sơ thất bại',
        errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
      });
    }
  }


  /**
   * Cập nhật hồ sơ + danh mục tài liệu
   */
  async update(id: number, dto: UpdateArchivesDto, userId?: string | number | null) {
    return await this.dataSource.transaction(async (manager) => {
      try {
        const archives = await manager.findOne(ArchivesEntity, {
          where: { id, status: 1, isDraft: false },
        });

        if (!archives) {
          throw new NotFoundException({
            success: false,
            message: 'Không tìm thấy hồ sơ',
            errors: [{ field: 'id', message: 'Hồ sơ không tồn tại' }],
          });
        }

        // Kiểm tra hồ sơ nguồn nếu có cập nhật
        let sourceStorage: SourceStorageEntity | null = null;
        if (dto.archivesName !== undefined) {
          sourceStorage = await manager.findOne(SourceStorageEntity, {
            where: { id: dto.archivesName, status: 1 },
          });

          if (!sourceStorage) {
            throw new BadRequestException({
              success: false,
              message: 'Hồ sơ nguồn không tồn tại',
              errors: [{ field: 'archivesName', message: 'Hồ sơ nguồn không tồn tại hoặc đã bị xóa' }],
            });
          }
          archives.archivesName = dto.archivesName;
        } else if (archives.archivesName) {
          // Chỉ query nếu archivesName không null
          sourceStorage = await manager.findOne(SourceStorageEntity, {
            where: { id: archives.archivesName },
          });
        }

        if (dto.archivesType !== undefined) archives.archivesType = dto.archivesType;
        if (dto.archivesDeadline !== undefined) archives.archivesDeadline = dto.archivesDeadline;
        if (dto.archivesMode !== undefined) archives.archivesMode = dto.archivesMode;
        if (dto.archivesYear !== undefined) archives.archivesYear = new Date(dto.archivesYear);
        if (dto.archivesOrganizationUnit !== undefined) archives.archivesOrganizationUnit = dto.archivesOrganizationUnit;
        if (dto.archivesLanguage !== undefined) archives.archivesLanguage = dto.archivesLanguage;
        if (dto.archivesNote !== undefined) archives.archivesNote = dto.archivesNote;

        const savedArchives = await manager.save(ArchivesEntity, archives);

        let docIndexes: ArchivesDocumentIndexEntity[] = [];
        if (dto.listDocIndex !== undefined) {
          docIndexes = await this.updateDocumentIndexes(manager, id, dto.listDocIndex, userId ? String(userId) : null);
        } else {
          docIndexes = await manager.find(ArchivesDocumentIndexEntity, {
            where: { archivesId: id, status: 1 },
          });
        }

        return this.formatArchivesResponse(savedArchives, sourceStorage, docIndexes, 'Cập nhật hồ sơ thành công');
      } catch (error) {
        if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
        throw new BadRequestException({
          success: false,
          message: 'Cập nhật hồ sơ thất bại',
          errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
        });
      }
    });
  }

  private async updateDocumentIndexes(
    manager: any,
    archivesId: number,
    listDocIndex: UpdateDocumentIndexDto[],
    userId: string | null,
  ): Promise<ArchivesDocumentIndexEntity[]> {
    const existingDocs = await manager.find(ArchivesDocumentIndexEntity, {
      where: { archivesId, status: 1 },
    });
    const existingIds = existingDocs.map((d: ArchivesDocumentIndexEntity) => d.id);

    const requestIds = listDocIndex.filter((d) => d.id && existingIds.includes(d.id)).map((d) => d.id);

    const idsToDelete = existingIds.filter((id: number) => !requestIds.includes(id));
    if (idsToDelete.length > 0) {
      await manager.update(ArchivesDocumentIndexEntity, { id: In(idsToDelete) }, { status: 0 });
    }

    const result: ArchivesDocumentIndexEntity[] = [];
    for (const doc of listDocIndex) {
      if (doc.id && existingIds.includes(doc.id)) {
        await manager.update(ArchivesDocumentIndexEntity, { id: doc.id }, { nameDoc: doc.nameDoc });
        const updated = await manager.findOne(ArchivesDocumentIndexEntity, { where: { id: doc.id } });
        if (updated) result.push(updated);
      } else {
        const newDoc = manager.create(ArchivesDocumentIndexEntity, {
          nameDoc: doc.nameDoc,
          archivesId,
          status: 1,
          createdBy: userId,
        });
        const saved = await manager.save(ArchivesDocumentIndexEntity, newDoc);
        result.push(saved);
      }
    }

    return result;
  }

  /**
   * Xóa hồ sơ (soft delete)
   */
  async delete(id: number) {
    return await this.dataSource.transaction(async (manager) => {
      try {
        const archives = await manager.findOne(ArchivesEntity, {
          where: { id, status: 1 },
        });

        if (!archives) {
          throw new NotFoundException({
            success: false,
            message: 'Không tìm thấy hồ sơ',
            errors: [{ field: 'id', message: 'Hồ sơ không tồn tại' }],
          });
        }

        archives.status = 0;
        await manager.save(ArchivesEntity, archives);
        await manager.update(ArchivesDocumentIndexEntity, { archivesId: id }, { status: 0 });

        return {
          success: true,
          message: 'Xóa hồ sơ thành công',
        };
      } catch (error) {
        if (error instanceof NotFoundException) throw error;
        throw new BadRequestException({
          success: false,
          message: 'Xóa hồ sơ thất bại',
          errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
        });
      }
    });
  }

  /**
   * Xóa nhiều hồ sơ (soft delete)
   */
  async deleteMany(ids: number[]) {
    return await this.dataSource.transaction(async (manager) => {
      try {
        const archives = await manager.find(ArchivesEntity, {
          where: { id: In(ids), status: 1 },
        });

        if (archives.length === 0) {
          throw new NotFoundException({
            success: false,
            message: 'Không tìm thấy hồ sơ nào',
            errors: [{ field: 'ids', message: 'Không có hồ sơ nào tồn tại' }],
          });
        }

        const foundIds = archives.map((a) => a.id);
        await manager.update(ArchivesEntity, { id: In(foundIds) }, { status: 0 });
        await manager.update(ArchivesDocumentIndexEntity, { archivesId: In(foundIds) }, { status: 0 });

        return {
          success: true,
          message: `Xóa thành công ${foundIds.length} hồ sơ`,
          data: { deletedIds: foundIds },
        };
      } catch (error) {
        if (error instanceof NotFoundException) throw error;
        throw new BadRequestException({
          success: false,
          message: 'Xóa hồ sơ thất bại',
          errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
        });
      }
    });
  }

  /**
   * Xóa vĩnh viễn hồ sơ (hard delete - xóa hẳn khỏi DB)
   */
  async hardDelete(id: number) {
    return await this.dataSource.transaction(async (manager) => {
      try {
        const archives = await manager.findOne(ArchivesEntity, {
          where: { id },
        });

        if (!archives) {
          throw new NotFoundException({
            success: false,
            message: 'Không tìm thấy hồ sơ',
            errors: [{ field: 'id', message: 'Hồ sơ không tồn tại' }],
          });
        }

        // Xóa danh mục tài liệu trước (do FK constraint)
        await manager.delete(ArchivesDocumentIndexEntity, { archivesId: id });
        // Xóa hồ sơ
        await manager.delete(ArchivesEntity, { id });

        return {
          success: true,
          message: 'Xóa vĩnh viễn hồ sơ thành công',
        };
      } catch (error) {
        if (error instanceof NotFoundException) throw error;
        throw new BadRequestException({
          success: false,
          message: 'Xóa vĩnh viễn hồ sơ thất bại',
          errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
        });
      }
    });
  }

  /**
   * Xóa vĩnh viễn nhiều hồ sơ (hard delete - xóa hẳn khỏi DB)
   */
  async hardDeleteMany(ids: number[]) {
    return await this.dataSource.transaction(async (manager) => {
      try {
        const archives = await manager.find(ArchivesEntity, {
          where: { id: In(ids) },
        });

        if (archives.length === 0) {
          throw new NotFoundException({
            success: false,
            message: 'Không tìm thấy hồ sơ nào',
            errors: [{ field: 'ids', message: 'Không có hồ sơ nào tồn tại' }],
          });
        }

        const foundIds = archives.map((a) => a.id);
        
        // Xóa danh mục tài liệu trước (do FK constraint)
        await manager.delete(ArchivesDocumentIndexEntity, { archivesId: In(foundIds) });
        // Xóa hồ sơ
        await manager.delete(ArchivesEntity, { id: In(foundIds) });

        return {
          success: true,
          message: `Xóa vĩnh viễn thành công ${foundIds.length} hồ sơ`,
          data: { deletedIds: foundIds },
        };
      } catch (error) {
        if (error instanceof NotFoundException) throw error;
        throw new BadRequestException({
          success: false,
          message: 'Xóa vĩnh viễn hồ sơ thất bại',
          errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
        });
      }
    });
  }


  // ========== API QUẢN LÝ DANH MỤC TÀI LIỆU RIÊNG ==========

  async addDocumentIndex(archivesId: number, dto: CreateDocumentIndexDto, userId?: string | number | null) {
    try {
      const archives = await this.archivesRepo.findOne({
        where: { id: archivesId, status: 1 },
      });

      if (!archives) {
        throw new NotFoundException({
          success: false,
          message: 'Không tìm thấy hồ sơ',
          errors: [{ field: 'archivesId', message: 'Hồ sơ không tồn tại' }],
        });
      }

      const docIndex = this.docIndexRepo.create({
        nameDoc: dto.nameDoc,
        archivesId,
        status: 1,
        createdBy: userId ? String(userId) : null,
      });

      const saved = await this.docIndexRepo.save(docIndex);

      return {
        success: true,
        message: 'Thêm danh mục tài liệu thành công',
        data: {
          id: saved.id,
          nameDoc: saved.nameDoc,
          archivesId: saved.archivesId,
          createdAt: formatDateOnly(saved.createdAt),
          updatedAt: formatDateOnly(saved.updatedAt),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException({
        success: false,
        message: 'Thêm danh mục tài liệu thất bại',
        errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
      });
    }
  }

  async getDocumentIndexes(archivesId: number) {
    try {
      const archives = await this.archivesRepo.findOne({
        where: { id: archivesId, status: 1 },
      });

      if (!archives) {
        throw new NotFoundException({
          success: false,
          message: 'Không tìm thấy hồ sơ',
          errors: [{ field: 'archivesId', message: 'Hồ sơ không tồn tại' }],
        });
      }

      const docIndexes = await this.docIndexRepo.find({
        where: { archivesId, status: 1 },
        order: { createdAt: 'ASC' },
      });

      return {
        success: true,
        message: 'Lấy danh sách danh mục tài liệu thành công',
        data: docIndexes.map((doc) => ({
          id: doc.id,
          nameDoc: doc.nameDoc,
          archivesId: doc.archivesId,
          createdAt: formatDateOnly(doc.createdAt),
          updatedAt: formatDateOnly(doc.updatedAt),
        })),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException({
        success: false,
        message: 'Lấy danh sách danh mục tài liệu thất bại',
        errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
      });
    }
  }

  async updateDocumentIndex(archivesId: number, docId: number, dto: UpdateDocumentIndexDto) {
    try {
      const docIndex = await this.docIndexRepo.findOne({
        where: { id: docId, archivesId, status: 1 },
      });

      if (!docIndex) {
        throw new NotFoundException({
          success: false,
          message: 'Không tìm thấy danh mục tài liệu',
          errors: [{ field: 'docId', message: 'Danh mục tài liệu không tồn tại' }],
        });
      }

      docIndex.nameDoc = dto.nameDoc;
      const saved = await this.docIndexRepo.save(docIndex);

      return {
        success: true,
        message: 'Cập nhật danh mục tài liệu thành công',
        data: {
          id: saved.id,
          nameDoc: saved.nameDoc,
          archivesId: saved.archivesId,
          createdAt: formatDateOnly(saved.createdAt),
          updatedAt: formatDateOnly(saved.updatedAt),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException({
        success: false,
        message: 'Cập nhật danh mục tài liệu thất bại',
        errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
      });
    }
  }

  async deleteDocumentIndex(archivesId: number, docId: number) {
    try {
      const docIndex = await this.docIndexRepo.findOne({
        where: { id: docId, archivesId, status: 1 },
      });

      if (!docIndex) {
        throw new NotFoundException({
          success: false,
          message: 'Không tìm thấy danh mục tài liệu',
          errors: [{ field: 'docId', message: 'Danh mục tài liệu không tồn tại' }],
        });
      }

      docIndex.status = 0;
      await this.docIndexRepo.save(docIndex);

      return {
        success: true,
        message: 'Xóa danh mục tài liệu thành công',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException({
        success: false,
        message: 'Xóa danh mục tài liệu thất bại',
        errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
      });
    }
  }
}
