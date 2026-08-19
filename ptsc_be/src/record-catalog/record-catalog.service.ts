import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as moment from 'moment';
import * as ExcelJS from 'exceljs';
import { PDFDocument, rgb, PDFPage, PDFFont } from 'pdf-lib';
import * as fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs';
import axios from 'axios';
import * as os from 'os';
import * as path from 'path';
import * as FormData from 'form-data';
import { DocumentsPdfBuilder, PdfColumnDef } from 'src/documents/helpers/documents-pdf.builder';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { YearCategoryEntity } from './entities/year-category.entity';
import { FileRecordEntity, FileRecordStatus } from './entities/file-record.entity';
import { DocumentStatus, RecordDocumentEntity } from './entities/record-document.entity';
import { FolderDetailEntity } from './entities/folder-detail.entity';
import { CreateYearCategoryDto } from './dto/create-year-category.dto';
import { UpdateYearCategoryDto } from './dto/update-year-category.dto';
import { CreateFileRecordDto } from './dto/create-file-record.dto';
import { CreateRecordDocumentDto } from './dto/create-record-document.dto';
import { UpdateFileRecordDto } from './dto/update-file-record.dto';
import { SearchFileRecordDto } from './dto/search-file-record.dto';
import { SearchYearDto } from './dto/search-year.dto';
import { UpdateRecordDocumentDto } from './dto/update-record-document.dto';
import { SearchRecordDocumentDto } from './dto/search-record-document.dto';
import { CreateFolderDetailDto } from './dto/create-folder-detail.dto';
import { UpdateFolderDetailDto } from './dto/update-folder-detail.dto';
import { SearchFolderDetailDto } from './dto/search-folder-detail.dto';
import { SearchDocumentProfileDto } from './dto/search-document-profile.dto';
import { ArchiveRecord } from 'src/archive-records/entities/archive-record.entity';
import { ArchiveRecordItemFile } from 'src/archive-records/entities/archive-record-item-flie.entity';
import { mapArchiveRecordState, mapArchiveRecordStateExport } from 'src/archive-records/helper/builder.query';
import { ARCHIVES_DEADLINE_MAP } from 'src/archives-management/dto/create-archives.dto';


@Injectable()
export class RecordCatalogService {
  constructor(
    @InjectRepository(YearCategoryEntity, 'mssqlConnection')
    private readonly yearRepository: Repository<YearCategoryEntity>,
    @InjectRepository(FileRecordEntity, 'mssqlConnection')
    private readonly fileRepository: Repository<FileRecordEntity>,
    @InjectRepository(RecordDocumentEntity, 'mssqlConnection')
    private readonly docRepository: Repository<RecordDocumentEntity>,
    @InjectRepository(FolderDetailEntity, 'mssqlConnection')
    private readonly folderDetailRepository: Repository<FolderDetailEntity>,
    @InjectRepository(ArchiveRecordItemFile, 'mssqlConnection')
    private readonly itemFileRepo: Repository<ArchiveRecordItemFile>,
    @InjectRepository(ArchiveRecord, 'mssqlConnection')
    private readonly archiveRecordRepository: Repository<ArchiveRecord>,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Cập nhật số lượng văn bản và số lượng file cho FileRecord và FolderDetail tương ứng
   */
  async updateCounts(fileRecordId?: string | null, folderDetailId?: string | null, yearCategoryId?: string | null) {
    if (!fileRecordId && !folderDetailId && !yearCategoryId) return;

    let targetFolderDetailId: string | undefined = folderDetailId || undefined;
    let targetYearCategoryId: string | undefined = yearCategoryId || undefined;

    if (fileRecordId) {
      // 1. Đếm số lượng document trong FileRecord
      const docCount = await this.docRepository.count({ where: { fileRecordId } });

      // 2. Đếm số lượng file đính kèm trong các ArchiveRecord của các document này
      const fileCountRes = await this.fileRepository.createQueryBuilder('file')
        .leftJoin('file.documents', 'doc')
        .leftJoin(ArchiveRecord, 'ar', 'ar.category = CAST(doc.id AS NVARCHAR(36))')
        .leftJoin('ar.items', 'ari')
        .leftJoin('ari.files', 'arif')
        .select('COUNT(DISTINCT arif.id)', 'count')
        .where('file.id = :fileRecordId', { fileRecordId })
        .getRawOne();

      const fileCount = Number(fileCountRes?.count || 0);

      // 3. Cập nhật FileRecord
      const fileRecord = await this.fileRepository.findOne({ where: { id: fileRecordId } });
      if (fileRecord) {
        fileRecord.totalDocuments = docCount;
        fileRecord.totalFiles = fileCount;
        await this.fileRepository.save(fileRecord);
        if (!targetFolderDetailId) targetFolderDetailId = fileRecord.folderDetailId || undefined;
      }
    }

    if (targetFolderDetailId) {
      // 1. Đếm số lượng document trong FolderDetail
      const docCountRes = await this.folderDetailRepository.createQueryBuilder('fd')
        .leftJoin('fd.departmentRecords', 'dr')
        .leftJoin('dr.documents', 'doc')
        .select('COUNT(DISTINCT doc.id)', 'count')
        .where('fd.id = :folderDetailId', { folderDetailId: targetFolderDetailId })
        .getRawOne();

      // 2. Đếm số lượng file đính kèm
      const fileCountRes = await this.folderDetailRepository.createQueryBuilder('fd')
        .leftJoin('fd.departmentRecords', 'dr')
        .leftJoin('dr.documents', 'doc')
        .leftJoin(ArchiveRecord, 'ar', 'ar.category = CAST(doc.id AS NVARCHAR(36))')
        .leftJoin('ar.items', 'ari')
        .leftJoin('ari.files', 'arif')
        .select('COUNT(DISTINCT arif.id)', 'count')
        .where('fd.id = :folderDetailId', { folderDetailId: targetFolderDetailId })
        .getRawOne();

      // 3. Cập nhật FolderDetail
      const folder = await this.folderDetailRepository.findOne({ where: { id: targetFolderDetailId } });
      if (folder) {
        folder.totalDocuments = Number(docCountRes?.count || 0);
        folder.totalFiles = Number(fileCountRes?.count || 0);
        await this.folderDetailRepository.save(folder);
        if (!targetYearCategoryId) targetYearCategoryId = folder.yearCategoryId;
      }
    }

    if (targetYearCategoryId) {
      // 1. Đếm số lượng document trong YearCategory
      const docCountRes = await this.yearRepository.createQueryBuilder('y')
        .leftJoin('y.documents', 'doc')
        .select('COUNT(DISTINCT doc.id)', 'count')
        .where('y.id = :yearCategoryId', { yearCategoryId: targetYearCategoryId })
        .getRawOne();

      // 2. Đếm số lượng file đính kèm
      const fileCountRes = await this.yearRepository.createQueryBuilder('y')
        .leftJoin('y.documents', 'doc')
        .leftJoin(ArchiveRecord, 'ar', 'ar.category = CAST(doc.id AS NVARCHAR(36))')
        .leftJoin('ar.items', 'ari')
        .leftJoin('ari.files', 'arif')
        .select('COUNT(DISTINCT arif.id)', 'count')
        .where('y.id = :yearCategoryId', { yearCategoryId: targetYearCategoryId })
        .getRawOne();

      // 3. Cập nhật YearCategory
      await this.yearRepository.update(targetYearCategoryId, {
        totalDocuments: Number(docCountRes?.count || 0),
        totalFiles: Number(fileCountRes?.count || 0),
      });
    }
  }

  // ATTENTION: Helper method for Status Label
  private getStatusLabel(status: string) {
    const statusConfig = {
      '0': { text: 'Chưa mở', color: '#6B7280', bgColor: '#f1ebebff' },
      '1': { text: 'Đã mở', color: '#059669', bgColor: '#D1FAE5' },
      '2': { text: 'Đã lưu trữ', color: '#2563EB', bgColor: '#DBEAFE' }
    };
    const config = statusConfig[status] || { text: 'Không xác định', color: '#6B7280', bgColor: '#F3F4F6' };
    return `<div style="display: flex; width: 100%; justify-content: center; align-items: center; padding: 4px 12px; border-radius: 16px; background-color: ${config.bgColor}; color: ${config.color}; font-size: 13px; font-weight: 500;">${config.text}</div>`;
  }

  // =========================================================
  // FOLDER DETAIL METHODS (Level 1 - Tiêu đề mục hồ sơ)
  // =========================================================

  async createFolderDetail(dto: CreateFolderDetailDto) {
    const year = await this.yearRepository.findOne({ where: { id: dto.yearCategoryId } });
    if (!year) throw new NotFoundException('Danh mục năm không tồn tại.');

    const duplicate = await this.folderDetailRepository.findOne({
      where: { title: dto.title, yearCategoryId: dto.yearCategoryId },
    });
    if (duplicate) {
      throw new BadRequestException(`Tiêu đề "${dto.title}" đã tồn tại trong danh mục năm này.`);
    }

    const entity = this.folderDetailRepository.create(dto);
    return this.folderDetailRepository.save(entity);
  }

  async findAllFolderDetails(searchDto: SearchFolderDetailDto) {
    const { yearCategoryId, keyword, page = 1, limit = 25, filter, sort } = searchDto;

    const query = this.folderDetailRepository
      .createQueryBuilder('fd')
      .select('fd.id', 'id')
      .addSelect('fd.title', 'title')
      .addSelect('fd.yearCategoryId', 'yearCategoryId')
      .addSelect('fd.createdAt', 'createdAt')
      .addSelect('fd.totalDocuments', 'totalDocuments')
      .addSelect('fd.totalFiles', 'totalFiles');

    // ===== FILTER =====
    if (yearCategoryId) {
      query.andWhere('fd.yearCategoryId = :yearCategoryId', { yearCategoryId });
    }

    if (keyword) {
      query.andWhere('fd.title LIKE :keyword', { keyword: `%${keyword}%` });
    }

    if (filter) {
      const orConditions: string[] = [];
      const params: any = {};

      if (filter.title) {
        orConditions.push('fd.title LIKE :filterTitle');
        params.filterTitle = `%${filter.title}%`;
      }
      if (filter.totalDocuments !== undefined && filter.totalDocuments !== '') {
        orConditions.push('CAST(fd.totalDocuments AS NVARCHAR) LIKE :filterTotalDocs');
        params.filterTotalDocs = `%${filter.totalDocuments}%`;
      }
      if (filter.totalFiles !== undefined && filter.totalFiles !== '') {
        orConditions.push('CAST(fd.totalFiles AS NVARCHAR) LIKE :filterTotalFiles');
        params.filterTotalFiles = `%${filter.totalFiles}%`;
      }

      if (orConditions.length > 0) {
        query.andWhere(`(${orConditions.join(' OR ')})`, params);
      }
    }

    // ===== SORT =====
    if (sort) {
      if (sort.title) {
        query.addOrderBy('fd.title', sort.title === 1 ? 'ASC' : 'DESC');
      }
      if (sort.totalDocuments) {
        query.addOrderBy('fd.totalDocuments', sort.totalDocuments === 1 ? 'ASC' : 'DESC');
      }
      if (sort.totalFiles) {
        query.addOrderBy('fd.totalFiles', sort.totalFiles === 1 ? 'ASC' : 'DESC');
      }
      if (sort.createdAt) {
        query.addOrderBy('fd.createdAt', sort.createdAt === 1 ? 'ASC' : 'DESC');
      }
    } else {
      query.orderBy('fd.createdAt', 'ASC');
    }

    // =========================
    // ===== COUNT QUERY =======
    // =========================
    const total = await query.getCount();
    const take = parseInt(String(limit)) || 25;
    const skip = (parseInt(String(page)) - 1) * take;

    const rawResult = await query
      .skip(skip)
      .take(take)
      .getRawMany();

    // =========================
    // ===== RETURN ============
    // =========================
    return {
      data: rawResult.map(item => ({
        ...item,
        totalDocuments: Number(item.totalDocuments || 0),
        totalFiles: Number(item.totalFiles || 0),
        titleDisplay: item.title,
        createdAtFormatted: item.createdAt ? moment(item.createdAt).format('DD/MM/YYYY') : null,
      })),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    };
  }

  private async findFolderDetailEntity(id: string) {
    const entity = await this.folderDetailRepository.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Đề mục hồ sơ không tồn tại');
    return entity;
  }

  async findOneFolderDetail(id: string) {
    const entity = await this.findFolderDetailEntity(id);
    return {
      ...entity,
      profileHeading: entity.title
    };
  }

  async updateFolderDetail(id: string, dto: UpdateFolderDetailDto) {
    const entity = await this.findFolderDetailEntity(id);

    if (dto.title && dto.title !== entity.title) {
      const duplicate = await this.folderDetailRepository.findOne({
        where: { title: dto.title, yearCategoryId: entity.yearCategoryId },
      });
      if (duplicate) {
        throw new BadRequestException(`Tiêu đề "${dto.title}" đã tồn tại trong danh mục năm này.`);
      }
    }

    Object.assign(entity, dto);
    return this.folderDetailRepository.save(entity);
  }

  async removeFolderDetail(id: string) {
    const entity = await this.findFolderDetailEntity(id);
    return this.folderDetailRepository.remove(entity);
  }

  // =========================================================
  // YEAR CATEGORY METHODS
  // =========================================================

  async createYear(createYearDto: CreateYearCategoryDto) {
    const existing = await this.yearRepository.findOne({ where: { year: createYearDto.year } });
    if (existing) {
      throw new BadRequestException(`Năm ${createYearDto.year} đã tồn tại.`);
    }
    const year = this.yearRepository.create(createYearDto);
    return this.yearRepository.save(year);
  }
  async findAllYears(searchDto: SearchYearDto) {
    const { page = 1, limit = 10, filter, sort, keyword } = searchDto;

    const query = this.yearRepository.createQueryBuilder('year');
    // ================= KEYWORD SEARCH =================
    if (keyword) {
      query.andWhere(
        '(year.description LIKE :keyword OR CAST(year.year AS NVARCHAR) LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    // ================= FILTER =================
    if (filter) {
      const orConditions: string[] = [];
      const params: any = {};

      if (filter.description) {
        orConditions.push('year.description LIKE :desc');
        params.desc = `%${filter.description}%`;
      }

      if (filter.year) {
        orConditions.push('CAST(year.year AS NVARCHAR) LIKE :fYear');
        params.fYear = `%${filter.year}%`;
      }

      if (filter.totalDocuments !== undefined && filter.totalDocuments !== '') {
        orConditions.push('CAST(year.totalDocuments AS NVARCHAR) LIKE :totalDocs');
        params.totalDocs = `%${filter.totalDocuments}%`;
      }

      if (filter.totalFiles !== undefined && filter.totalFiles !== '') {
        orConditions.push('CAST(year.totalFiles AS NVARCHAR) LIKE :totalFiles');
        params.totalFiles = `%${filter.totalFiles}%`;
      }

      if (orConditions.length > 0) {
        query.andWhere(`(${orConditions.join(' OR ')})`, params);
      }

      if (filter.createdAt) {
        const { startDate, endDate } = filter.createdAt;

        if (startDate) {
          query.andWhere('year.createdAt >= :startDate', {
            startDate: moment(startDate).startOf('day').toDate(),
          });
        }

        if (endDate) {
          query.andWhere('year.createdAt <= :endDate', {
            endDate: moment(endDate).endOf('day').toDate(),
          });
        }
      }
    }

    // ================= SORT =================
    let sortObj: Record<string, any> | null = null;

    if (sort) {
      try {
        sortObj = typeof sort === 'string' ? JSON.parse(sort) : sort;
      } catch (e) {
        sortObj = null;
      }
    }

    const allowedSortFields = [
      'year',
      'createdAt',
      'totalDocuments',
      'totalFiles',
    ];

    if (sortObj && Object.keys(sortObj).length > 0) {
      Object.entries(sortObj).forEach(([key, direction]) => {
        if (!allowedSortFields.includes(key)) return;

        const dir = Number(direction) === 1 ? 'ASC' : 'DESC';
        query.addOrderBy(`year.${key}`, dir);
      });
    } else {
      query.orderBy('year.year', 'DESC');
    }

    // ================= PAGINATION =================
    const take = Number(limit) > 0 ? Number(limit) : 10;
    const skip = (Number(page) > 0 ? Number(page) - 1 : 0) * take;

    // SQL Server bắt buộc có ORDER BY khi dùng OFFSET
    if (!query.expressionMap.orderBys || Object.keys(query.expressionMap.orderBys).length === 0) {
      query.orderBy('year.year', 'DESC');
    }

    const [data, total] = await query
      .skip(skip)   // dùng skip/take chuẩn của TypeORM
      .take(take)
      .getManyAndCount();

    // ================= MAP RESULT =================
    const result = data.map(item => ({
      ...item,
      description: `Năm ${item.year}`,
      createdAt: item.createdAt
        ? moment(item.createdAt).format('DD/MM/YYYY')
        : null,
      totalFiles: Number(item.totalFiles || 0),
      totalDocuments: Number(item.totalDocuments || 0),
    }));

    return {
      data: result,
      total,
      page: Number(page),
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  private async findYearEntity(id: string) {
    const year = await this.yearRepository.findOne({ where: { id } });
    if (!year) throw new NotFoundException('Danh mục năm không tồn tại');
    return year;
  }

  async findOneYear(id: string) {
    const item = await this.yearRepository.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Danh mục năm không tồn tại');

    return {
      ...item,
      totalFiles: Number(item.totalFiles || 0),
      totalDocuments: Number(item.totalDocuments || 0),
      descriptionOriginal: item.description,
      description: ` Năm ${item.year}`,
      createdAtFormatted: item.createdAt ? moment(item.createdAt).format('DD/MM/YYYY') : null
    };
  }

  async updateYear(id: string, updateYearDto: UpdateYearCategoryDto) {
    const year = await this.findYearEntity(id);

    if (updateYearDto.year && updateYearDto.year !== year.year) {
      const existing = await this.yearRepository.findOne({ where: { year: updateYearDto.year } });
      if (existing) {
        throw new BadRequestException(`Năm ${updateYearDto.year} đã tồn tại.`);
      }
    }

    Object.assign(year, updateYearDto);
    return this.yearRepository.save(year);
  }

  async removeYear(id: string) {
    const year = await this.findYearEntity(id);
    return this.yearRepository.remove(year);
  }

  // FILE RECORD METHODS

  async createFile(createFileDto: CreateFileRecordDto) {
    // Check duplicate fileSymbol
    const duplicate = await this.fileRepository.findOne({
      where: {
        fileSymbol: createFileDto.fileSymbol
        // If uniqueness is scoped to year, add: yearCategoryId: createFileDto.yearCategoryId 
        // But usually file symbols are unique system wide or at least imply uniqueness.
        // I will assume global uniqueness for now as per "Check trùng" usually implies strict check.
      }
    });

    if (duplicate) {
      throw new BadRequestException(`Số và ký hiệu hồ sơ "${createFileDto.fileSymbol}" đã tồn tại.`);
    }

    const file = this.fileRepository.create(createFileDto);
    return this.fileRepository.save(file);
  }

  async findAllFiles(searchDto: SearchFileRecordDto) {
    const { yearCategoryId, folderDetailId, keyword, status, page = 1, limit = 25, filter, sort } = searchDto;

    const query = this.fileRepository.createQueryBuilder('file')
      .leftJoinAndSelect('file.yearCategory', 'year')
      .leftJoinAndSelect('file.folderDetail', 'fd')
      .select('file.id', 'id')
      .addSelect('file.fileSymbol', 'fileSymbol')
      .addSelect('file.title', 'title')
      .addSelect('file.status', 'status')
      .addSelect('file.createdAt', 'createdAt')
      .addSelect('file.yearCategoryId', 'yearCategoryId')
      .addSelect('file.folderDetailId', 'folderDetailId')
      .addSelect('file.totalDocuments', 'totalDocuments')
      .addSelect('file.totalFiles', 'totalFiles');

    if (yearCategoryId) {
      query.andWhere('file.yearCategoryId = :yearCategoryId', { yearCategoryId });
    }

    if (folderDetailId) {
      query.andWhere('file.folderDetailId = :folderDetailId', { folderDetailId });
    }

    if (status !== undefined && status !== null) {
      query.andWhere('file.status = :status', { status });
    }

    if (keyword) {
      query.andWhere(
        '(file.fileSymbol LIKE :keyword OR file.title LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    if (filter) {
      const orConditions: string[] = [];
      const params: any = {};

      if (filter.title) {
        orConditions.push('file.title LIKE :filterTitle');
        params.filterTitle = `%${filter.title}%`;
      }
      if (filter.fileSymbol) {
        orConditions.push('file.fileSymbol LIKE :filterSymbol');
        params.filterSymbol = `%${filter.fileSymbol}%`;
      }
      if (filter.totalDocuments !== undefined && filter.totalDocuments !== '') {
        orConditions.push('CAST(file.totalDocuments AS NVARCHAR) LIKE :filterTotalDocs');
        params.filterTotalDocs = `%${filter.totalDocuments}%`;
      }
      if (filter.totalFiles !== undefined && filter.totalFiles !== '') {
        orConditions.push('CAST(file.totalFiles AS NVARCHAR) LIKE :filterTotalFiles');
        params.filterTotalFiles = `%${filter.totalFiles}%`;
      }

      if (orConditions.length > 0) {
        query.andWhere(`(${orConditions.join(' OR ')})`, params);
      }

      // Process status filter separately (AND)
      if (filter.status !== undefined && filter.status !== null) {
        query.andWhere('file.status = :filterStatus', { filterStatus: filter.status });
      }
    }

    if (sort) {
      if (sort.title) {
        query.addOrderBy('file.title', sort.title === 1 ? 'ASC' : 'DESC');
      }
      if (sort.fileSymbol) {
        query.addOrderBy('file.fileSymbol', sort.fileSymbol === 1 ? 'ASC' : 'DESC');
      }
      if (sort.totalDocuments) {
        query.addOrderBy('file.totalDocuments', sort.totalDocuments === 1 ? 'ASC' : 'DESC');
      }
      if (sort.totalFiles) {
        query.addOrderBy('file.totalFiles', sort.totalFiles === 1 ? 'ASC' : 'DESC');
      }
      if (sort.createdAt) {
        query.addOrderBy('file.createdAt', sort.createdAt === 1 ? 'ASC' : 'DESC');
      }
    } else {
      query.orderBy('file.createdAt', 'DESC');
    }

    const total = await query.getCount();
    const take = parseInt(String(limit)) || 25;
    const skip = (parseInt(String(page)) - 1) * take;

    const rawResult = await query
      .skip(skip)
      .take(take)
      .getRawMany();

    return {
      data: rawResult.map(item => ({
        ...item,
        statusLabel: this.getStatusLabel(item.status),
        title: item.title,
        description: `${item.fileSymbol} - ${item.title}`,
        createdAtFormatted: item.createdAt ? moment(item.createdAt).format('DD/MM/YYYY') : null,
        totalDocuments: Number(item.totalDocuments || 0),
        totalFiles: Number(item.totalFiles || 0)
      })),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    };
  }


  private async findFileEntity(id: string) {
    const file = await this.fileRepository.findOne({ where: { id }, relations: ['yearCategory'] });
    if (!file) throw new NotFoundException('Hồ sơ không tồn tại');
    return file;
  }

  async findOneFile(id: string) {
    const file = await this.findFileEntity(id);

    return {
      ...file,
      statusLabel: this.getStatusLabel(file.status),
      titleOriginal: file.title,
      title: file.title,
      createdAtFormatted: file.createdAt ? moment(file.createdAt).format('DD/MM/YYYY') : null
    };
  }

  async updateFile(id: string, updateFileDto: UpdateFileRecordDto) {
    const file = await this.findFileEntity(id);

    if (updateFileDto.fileSymbol && updateFileDto.fileSymbol !== file.fileSymbol) {
      // Check duplicate if changing symbol
      const duplicate = await this.fileRepository.findOne({ where: { fileSymbol: updateFileDto.fileSymbol } });
      if (duplicate) throw new BadRequestException(`Số và ký hiệu hồ sơ "${updateFileDto.fileSymbol}" đã tồn tại.`);
    }

    const oldFolderDetailId = file.folderDetailId;
    Object.assign(file, updateFileDto);
    const savedFile = await this.fileRepository.save(file);

    if (savedFile.folderDetailId) {
      await this.updateCounts(undefined, savedFile.folderDetailId);
    }
    if (oldFolderDetailId && oldFolderDetailId !== savedFile.folderDetailId) {
      await this.updateCounts(undefined, oldFolderDetailId);
    }

    return savedFile;
  }

  async removeFile(id: string) {
    const file = await this.findFileEntity(id);
    const folderDetailId = file.folderDetailId;
    const removed = await this.fileRepository.remove(file);
    if (folderDetailId) {
      await this.updateCounts(undefined, folderDetailId);
    }
    return removed;
  }
  async createDocument(createDocDto: CreateRecordDocumentDto) {

    let yearCategoryId: string | undefined = createDocDto.yearCategoryId;

    // ===== fallback từ file =====
    if (!yearCategoryId && createDocDto.fileRecordId) {
      const fileRecord = await this.fileRepository.findOne({
        where: { id: createDocDto.fileRecordId },
        relations: ['folderDetail']
      });

      if (!fileRecord) {
        throw new NotFoundException('Hồ sơ không tồn tại.');
      }

      yearCategoryId =
        fileRecord.yearCategoryId ||
        fileRecord.folderDetail?.yearCategoryId;
    }

    // ===== validate yearCategoryId =====
    if (!yearCategoryId) {
      throw new BadRequestException('Thiếu yearCategoryId');
    }

    // ===== validate year tồn tại =====
    const year = await this.yearRepository.findOne({
      where: { id: yearCategoryId }
    });

    if (!year) {
      throw new NotFoundException('Danh mục năm không tồn tại.');
    }

    // ===== check duplicate =====
    if (createDocDto.documentSymbol) {
      const duplicate = await this.docRepository.findOne({
        where: { documentSymbol: createDocDto.documentSymbol }
      });

      if (duplicate) {
        throw new BadRequestException(
          `Số ký hiệu văn bản "${createDocDto.documentSymbol}" đã tồn tại.`
        );
      }
    }

    // ===== create =====
    const doc = this.docRepository.create({
      ...createDocDto,
      yearCategoryId // lúc này chắc chắn là string
    });

    const savedDoc = await this.docRepository.save(doc);
    if (savedDoc.fileRecordId) {
      await this.updateCounts(savedDoc.fileRecordId);
    }
    return savedDoc;
  }


  async getTreeByDocumentId(documentId: string) {
    if (!documentId) {
      throw new BadRequestException('Thiếu documentId');
    }

    // ===== 1. DOCUMENT =====
    const doc = await this.docRepository.createQueryBuilder('doc')
      .leftJoinAndSelect('doc.fileRecord', 'file')
      .leftJoinAndMapOne('doc.archiveRecord', ArchiveRecord, 'ar', 'ar.category = doc.id')
      .where('doc.id = :id', { id: documentId })
      .getOne();

    if (!doc) {
      throw new NotFoundException('Văn bản không tồn tại');
    }

    // ===== 2. FILE =====
    let file = doc.fileRecord;

    if (!file && doc.fileRecordId) {
      file = await this.fileRepository.findOne({
        where: { id: doc.fileRecordId },
        relations: ['folderDetail'],
      });
    }

    // ===== 3. FOLDER =====
    let folder = file?.folderDetail;

    if (!folder && file?.folderDetailId) {
      folder = await this.folderDetailRepository.findOne({
        where: { id: file.folderDetailId },
      });
    }

    // ===== 4. YEAR =====
    const yearId =
      doc.yearCategoryId ||
      file?.yearCategoryId ||
      folder?.yearCategoryId;

    if (!yearId) {
      throw new BadRequestException('Không xác định được yearCategory');
    }

    const year = await this.yearRepository.findOne({
      where: { id: yearId },
    });

    if (!year) {
      throw new NotFoundException('Danh mục năm không tồn tại');
    }

    // ===== 5. BUILD CLEAN TREE =====
    return {
      id: year.id,
      year: year.year,
      description: year.description,
      type: 'year',

      folders: folder
        ? [
          {
            id: folder.id,
            profileHeading: folder.title,
            type: 'folder',

            files: file
              ? [
                {
                  id: file.id,
                  fileSymbol: file.fileSymbol,
                  archivesOrganizationUnit: file.title,
                  status: file.status,
                  type: 'file',

                  // FIX NULL year
                  yearCategoryId:
                    file.yearCategoryId ||
                    folder.yearCategoryId,

                  documents: [
                    {
                      id: doc.id,
                      archivesNumber:
                        doc.documentSymbol,
                      archivesName:
                        doc.documentTitle || '',
                      status: doc.status,
                      type: 'document',
                      archiveRecord: (doc as RecordDocumentEntity & { archiveRecord?: ArchiveRecord }).archiveRecord || null,

                      createdAt: doc.createdAt,
                      createdAtFormatted:
                        doc.createdAt
                          ? moment(
                            doc.createdAt,
                          ).format('DD/MM/YYYY')
                          : null,
                    },
                  ],
                },
              ]
              : [],
          },
        ]
        : [],
    };
  }
  async findAllDocuments(searchDto: SearchRecordDocumentDto) {
    const { fileRecordId, yearCategoryId, keyword, status, page = 1, limit = 10, filter, sort } = searchDto;

    const query = this.docRepository.createQueryBuilder('doc')
      .leftJoinAndSelect('doc.fileRecord', 'file')
      .leftJoinAndSelect('doc.yearCategory', 'year')
      .leftJoinAndMapOne('doc.archiveRecord', ArchiveRecord, 'ar', 'ar.category = doc.id');

    if (fileRecordId) {
      query.andWhere('doc.fileRecordId = :fileRecordId', { fileRecordId });
    }

    if (yearCategoryId) {
      query.andWhere('doc.yearCategoryId = :yearCategoryId', { yearCategoryId });
    }

    if (status !== undefined && status !== null) {
      query.andWhere('doc.status = :status', { status });
    }

    if (keyword) {
      query.andWhere(
        '(doc.documentSymbol LIKE :keyword OR doc.documentTitle LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    if (filter) {
      const orConditions: string[] = [];
      const params: any = {};

      if (filter.documentTitle) {
        orConditions.push('doc.documentTitle LIKE :fTitle');
        params.fTitle = `%${filter.documentTitle}%`;
      }
      if (filter.documentSymbol) {
        orConditions.push('doc.documentSymbol LIKE :fSymbol');
        params.fSymbol = `%${filter.documentSymbol}%`;
      }

      if (orConditions.length > 0) {
        query.andWhere(`(${orConditions.join(' OR ')})`, params);
      }

      // Process status filter separately (AND)
      if (filter.status !== undefined && filter.status !== null) {
        query.andWhere('doc.status = :filterStatus', { filterStatus: filter.status });
      }

      // Process date filters (AND)
      const dateFilter = filter.createdAt || (filter as any).createdAtFormatted;
      if (dateFilter) {
        const { startDate, endDate } = dateFilter;
        if (startDate) {
          const start = moment(startDate, 'YYYY-MM-DD').startOf('day').toDate();
          query.andWhere('doc.createdAt >= :startDate', { startDate: start });
        }
        if (endDate) {
          const end = moment(endDate, 'YYYY-MM-DD').endOf('day').toDate();
          query.andWhere('doc.createdAt <= :endDate', { endDate: end });
        }
      }
    }

    if (sort) {
      if (sort.documentTitle) {
        query.addOrderBy('doc.documentTitle', sort.documentTitle === 1 ? 'ASC' : 'DESC');
      }
      if (sort.documentSymbol) {
        query.addOrderBy('doc.documentSymbol', sort.documentSymbol === 1 ? 'ASC' : 'DESC');
      }
      if (sort.createdAt) {
        query.addOrderBy('doc.createdAt', sort.createdAt === 1 ? 'ASC' : 'DESC');
      }
    } else {
      query.orderBy('doc.createdAt', 'DESC');
    }

    const take = parseInt(String(limit)) || 10;
    const skip = (parseInt(String(page)) - 1) * take;
    query.skip(skip).take(take);

    const [data, total] = await query.getManyAndCount();

    return {
      data: data.map(item => ({
        ...item,
        statusLabel: searchDto.exportType
          ? mapArchiveRecordStateExport(item.status)
          : mapArchiveRecordState(item.status),
        documentTitleOriginal: item.documentTitle, // Keep original for export
        documentTitle: item.documentTitle,
        description: `${item.documentSymbol} - ${item.documentTitle || ''}`,
        createdAtFormatted: item.createdAt ? moment(item.createdAt).format('DD/MM/YYYY') : null,
        archiveRecordId: (item as RecordDocumentEntity & { archiveRecord?: ArchiveRecord }).archiveRecord?.id || null,
        canDelete: item.status === DocumentStatus.NOT_OPEN,
        canOpen: item.status === DocumentStatus.NOT_OPEN,
        canView: item.status === DocumentStatus.OPENED || item.status === DocumentStatus.ARCHIVED,
      })),

      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    };
  }

  async getUnopenedDocumentProfiles(searchDto: SearchDocumentProfileDto) {
    const { keyword, searchColumns, filter, sort, page = 1, limit = 10 } = searchDto;

    const query = this.docRepository.createQueryBuilder('doc')
      .leftJoin('doc.fileRecord', 'file')
      .leftJoin('file.folderDetail', 'folder')
      .leftJoin(YearCategoryEntity, 'y1', 'y1.id = doc.yearCategoryId')
      .leftJoin(YearCategoryEntity, 'y2', 'y2.id = file.yearCategoryId')
      .leftJoin(YearCategoryEntity, 'y3', 'y3.id = folder.yearCategoryId')
      .leftJoin(ArchiveRecord, 'ar', 'ar.category = doc.id')
      .select('doc.id', 'id')
      .addSelect('COALESCE(y1.year, y2.year, y3.year)', 'year')
      .addSelect('folder.title', 'folderTitle')
      .addSelect('file.title', 'fileTitle')
      .addSelect('doc.documentSymbol', 'documentSymbol')
      .addSelect('doc.documentTitle', 'documentTitle')
      .addSelect('doc.status', 'status')
      .addSelect('ar.retentionPeriod', 'retentionPeriod')
      .where('doc.status = :status', { status: '0' }); // 0: Chưa mở

    // Handle Keyword Search using searchColumns
    if (keyword) {
      // Default to searching all text columns if searchColumns is not provided or empty
      const defaultColumns = ['year', 'folderTitle', 'fileTitle', 'documentSymbol', 'documentTitle'];
      const columns = (searchColumns && searchColumns.length > 0) ? searchColumns : defaultColumns;

      const parts: string[] = [];
      if (columns.includes('year') || columns.includes('Danh mục năm')) {
        parts.push(`CAST(COALESCE(y1.year, y2.year, y3.year) AS NVARCHAR) LIKE :keyword`);
      }
      if (columns.includes('folderTitle') || columns.includes('Đề mục hồ sơ')) {
        parts.push(`folder.title LIKE :keyword`);
      }
      if (columns.includes('fileTitle') || columns.includes('Tên hồ sơ phòng')) {
        parts.push(`file.title LIKE :keyword`);
      }
      if (columns.includes('documentSymbol') || columns.includes('Số ký hiệu hồ sơ') || columns.includes('Số và ký hiệu hồ sơ')) {
        parts.push(`doc.documentSymbol LIKE :keyword`);
      }
      if (columns.includes('documentTitle') || columns.includes('Tiêu đề hồ sơ')) {
        parts.push(`doc.documentTitle LIKE :keyword`);
      }

      if (parts.length > 0) {
        query.andWhere(`(${parts.join(' OR ')})`, { keyword: `%${keyword}%` });
      }
    }

    // Handle separate column filters with OR logic for same values
    if (filter) {
      const textValueGroups: Record<string, string[]> = {};

      Object.entries(filter).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        const valStr = String(value);
        (textValueGroups[valStr] ||= []).push(key);
      });

      Object.entries(textValueGroups).forEach(([val, fields], groupIndex) => {
        const subParts: string[] = [];
        const paramName = `valGroup_${groupIndex}`;

        fields.forEach(field => {
          if (field === 'year') {
            subParts.push(`CAST(COALESCE(y1.year, y2.year, y3.year) AS NVARCHAR) LIKE :${paramName}`);
          } else if (field === 'folderTitle') {
            subParts.push(`folder.title LIKE :${paramName}`);
          } else if (field === 'fileTitle') {
            subParts.push(`file.title LIKE :${paramName}`);
          } else if (field === 'documentSymbol') {
            subParts.push(`doc.documentSymbol LIKE :${paramName}`);
          } else if (field === 'documentTitle') {
            subParts.push(`doc.documentTitle LIKE :${paramName}`);
          }
        });

        if (subParts.length > 0) {
          query.andWhere(`(${subParts.join(' OR ')})`, { [paramName]: `%${val}%` });
        }
      });
    }

    // Calculate total using TypeORM built-in getCount()
    const total = await query.getCount();

    // Handle sort (using the mapped aliases)
    if (sort && Object.keys(sort).length > 0) {
      Object.entries(sort).forEach(([key, direction]) => {
        const d = direction === 1 ? 'ASC' : 'DESC';
        if (key === 'year') {
          query.addOrderBy('COALESCE(y1.year, y2.year, y3.year)', d);
        } else if (key === 'folderTitle') {
          query.addOrderBy('folder.title', d);
        } else if (key === 'fileTitle') {
          query.addOrderBy('file.title', d);
        } else if (key === 'documentSymbol') {
          query.addOrderBy('doc.documentSymbol', d);
        } else if (key === 'documentTitle') {
          query.addOrderBy('doc.documentTitle', d);
        }
      });
    } else {
      query.orderBy('doc.createdAt', 'DESC');
    }

    const take = parseInt(String(limit)) || 10;
    const skip = (parseInt(String(page)) - 1) * take;

    const rawResult = await query
      .skip(skip)
      .take(take)
      .getRawMany();

    const data = rawResult.map(item => ({
      id: item.id,
      year: item.year,
      folderTitle: item.folderTitle,
      fileTitle: item.fileTitle,
      documentSymbol: item.documentSymbol,
      documentTitle: item.documentTitle,
      status: item.status,
      statusLabel: this.getStatusLabel(item.status),
    }));

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    };
  }

  private async findDocumentEntity(id: string) {
    const doc = await this.docRepository.findOne({ where: { id }, relations: ['fileRecord', 'yearCategory'] });
    if (!doc) throw new NotFoundException('Văn bản không tồn tại');
    return doc;
  }

  async findOneDocument(id: string) {
    const doc = await this.docRepository.createQueryBuilder('doc')
      .leftJoinAndSelect('doc.fileRecord', 'file')
      .leftJoinAndSelect('doc.yearCategory', 'year')
      .leftJoinAndMapOne('doc.archiveRecord', ArchiveRecord, 'ar', 'ar.category = doc.id')
      .where('doc.id = :id', { id })
      .getOne();

    if (!doc) throw new NotFoundException('Văn bản không tồn tại');

    return {
      id: doc.id,
      documentSymbol: doc.documentSymbol,
      documentTitle: doc.documentTitle,
      fileRecordId: doc.fileRecordId,
      fileRecord: doc.fileRecord,
      yearCategoryId: doc.yearCategoryId,
      yearCategory: doc.yearCategory,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      statusLabel: this.getStatusLabel(doc.status),
      documentTitleOriginal: doc.documentTitle,
      description: `${doc.documentSymbol} - ${doc.documentTitle || ''}`,
      createdAtFormatted: doc.createdAt ? moment(doc.createdAt).format('DD/MM/YYYY') : null,
      archiveRecord: (doc as RecordDocumentEntity & { archiveRecord?: ArchiveRecord }).archiveRecord || null
    };
  }

  async updateDocument(id: string, updateDocDto: UpdateRecordDocumentDto) {
    const doc = await this.findDocumentEntity(id);

    if (updateDocDto.documentSymbol && updateDocDto.documentSymbol !== doc.documentSymbol) {
      const duplicate = await this.docRepository.findOne({ where: { documentSymbol: updateDocDto.documentSymbol } });
      if (duplicate) throw new BadRequestException(`Số ký hiệu văn bản "${updateDocDto.documentSymbol}" đã tồn tại.`);
    }

    const oldFileRecordId = doc.fileRecordId;
    Object.assign(doc, updateDocDto);
    const savedDoc = await this.docRepository.save(doc);

    if (savedDoc.fileRecordId) {
      await this.updateCounts(savedDoc.fileRecordId);
    }
    if (oldFileRecordId && oldFileRecordId !== savedDoc.fileRecordId) {
      await this.updateCounts(oldFileRecordId);
    }

    return savedDoc;
  }

  async removeDocument(id: string) {
    const doc = await this.findDocumentEntity(id);
    const fileRecordId = doc.fileRecordId;
    const removed = await this.docRepository.remove(doc);
    if (fileRecordId) {
      await this.updateCounts(fileRecordId);
    }
    return removed;
  }

  async removeMultipleDocuments(ids: string[]) {
    // Validate all documents exist
    const documents = await this.docRepository.findByIds(ids);

    if (documents.length !== ids.length) {
      const foundIds = documents.map(d => d.id);
      const notFoundIds = ids.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Không tìm thấy văn bản với ID: ${notFoundIds.join(', ')}`);
    }

    // Delete all documents
    await this.docRepository.remove(documents);

    return {
      success: true,
      message: `Đã xóa ${documents.length} văn bản thành công`,
      deletedCount: documents.length
    };
  }

  async exportFolderDetails(searchDto: SearchFolderDetailDto): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    searchDto.limit = 10000;
    searchDto.page = 1;

    const result = await this.findAllFolderDetails(searchDto);
    const data = result.data;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh mục đề mục hồ sơ');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 10 },
      { header: 'Tên đề mục hồ sơ', key: 'title', width: 60 },
      { header: 'Tổng số hồ sơ', key: 'totalDocuments', width: 20 },
      { header: 'Tổng số tài liệu', key: 'totalFiles', width: 20 },
    ];

    const lastColumnLetter = worksheet.getColumn(worksheet.columnCount).letter;
    worksheet.insertRow(1, ['DANH SÁCH ĐỀ MỤC HỒ SƠ']);
    worksheet.mergeCells(`A1:${lastColumnLetter}1`);
    worksheet.getRow(1).font = { bold: true, size: 14, name: 'Times New Roman' };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 34;

    worksheet.insertRow(2, [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`]);
    worksheet.mergeCells(`A2:${lastColumnLetter}2`);
    worksheet.getRow(2).font = { italic: true, size: 11, name: 'Times New Roman' };
    worksheet.getRow(2).alignment = { horizontal: 'right', vertical: 'middle' };

    const headerRowIndex = 3;
    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.font = { bold: true, size: 12, name: 'Times New Roman' };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    data.forEach((item, index) => {
      worksheet.addRow({
        stt: index + 1,
        title: item.title,
        totalDocuments: item.totalDocuments,
        totalFiles: item.totalFiles,
      });
    });

    this.applyStandardExcelStyles(worksheet, headerRowIndex);

    const excelBuffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
    const excelFilename = `danh-sach-de-muc-ho-so-${moment().format('DD-MM-YYYY')}.xlsx`;

    if (searchDto.exportType === 'pdf') {
      return await this.convertExcelToPdf({ buffer: excelBuffer, filename: excelFilename });
    }

    return {
      buffer: excelBuffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: excelFilename,
    };
  }

  async exportFileRecords(searchDto: SearchFileRecordDto): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    searchDto.limit = 10000;
    searchDto.page = 1;

    const result = await this.findAllFiles(searchDto);
    const data = result.data;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh mục hồ sơ phòng');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 10 },
      { header: 'Số và ký hiệu phòng', key: 'fileSymbol', width: 25 },
      { header: 'Tên hồ sơ phòng', key: 'title', width: 60 },
      { header: 'Tổng số hồ sơ', key: 'totalDocuments', width: 20 },
      { header: 'Tổng số tài liệu', key: 'totalFiles', width: 20 },
    ];

    const lastColumnLetter = worksheet.getColumn(worksheet.columnCount).letter;
    worksheet.insertRow(1, ['DANH SÁCH HỒ SƠ PHÒNG']);
    worksheet.mergeCells(`A1:${lastColumnLetter}1`);
    worksheet.getRow(1).font = { bold: true, size: 14, name: 'Times New Roman' };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 34;

    worksheet.insertRow(2, [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`]);
    worksheet.mergeCells(`A2:${lastColumnLetter}2`);
    worksheet.getRow(2).font = { italic: true, size: 11, name: 'Times New Roman' };
    worksheet.getRow(2).alignment = { horizontal: 'right', vertical: 'middle' };

    const headerRowIndex = 3;
    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.font = { bold: true, size: 12, name: 'Times New Roman' };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    data.forEach((item, index) => {
      worksheet.addRow({
        stt: index + 1,
        fileSymbol: item.fileSymbol,
        title: item.title,
        totalDocuments: item.totalDocuments,
        totalFiles: item.totalFiles,
      });
    });

    this.applyStandardExcelStyles(worksheet, headerRowIndex);

    const excelBuffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
    const excelFilename = `danh-sach-ho-so-phong-${moment().format('DD-MM-YYYY')}.xlsx`;

    if (searchDto.exportType === 'pdf') {
      return await this.convertExcelToPdf({ buffer: excelBuffer, filename: excelFilename });
    }

    return {
      buffer: excelBuffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: excelFilename,
    };
  }

  private applyStandardExcelStyles(worksheet: ExcelJS.Worksheet, headerRowIndex: number) {
    // Cấu hình trang để khi chuyển sang PDF sẽ tự động căn vừa khổ giấy
    worksheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'landscape', // Chuyển sang khổ ngang để chứa được nhiều cột hơn
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0, // Tự động điều chỉnh theo chiều rộng
      horizontalCentered: true, // Căn giữa bảng theo chiều ngang của trang
      margins: {
        left: 0.5, right: 0.5,
        top: 0.5, bottom: 0.5,
        header: 0.3, footer: 0.3
      }
    };

    const lastColumnLetter = worksheet.getColumn(worksheet.columnCount).letter;
    worksheet.eachRow((row, rowNumber) => {
      row.font = {
        name: 'Times New Roman',
        size: rowNumber <= headerRowIndex ? 12 : 11,
        bold: rowNumber === headerRowIndex,
      };
      
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };

        if (rowNumber > headerRowIndex) {
          // Căn chỉnh nội dung các ô dữ liệu
          cell.alignment = { 
            wrapText: true, // Vẫn giữ wrapText để xem đủ nội dung nhưng sẽ tự động căn theo fitToWidth
            vertical: 'middle',
            horizontal: (colNumber === 1 || colNumber === worksheet.columnCount) ? 'center' : 'left'
          };
        } else if (rowNumber === headerRowIndex) {
          // Căn chỉnh tiêu đề cột
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEFEFEF' },
          };
        }
      });
    });
  }

  async exportDocuments(searchDto: SearchRecordDocumentDto): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    searchDto.limit = 10000;
    searchDto.page = 1;

    const result = await this.findAllDocuments(searchDto);
    const data = result.data;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách văn bản');

    // Headers according to requested layout
    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Số và ký hiệu hồ sơ', key: 'documentSymbol', width: 25 },
      { header: 'Tiêu đề hồ sơ', key: 'documentTitle', width: 60 },
      { header: 'Trạng thái', key: 'statusLabel', width: 15 },
    ];

    // ===== TITLE ROW =====
    const lastColumnLetter = worksheet.getColumn(worksheet.columnCount).letter;
    worksheet.insertRow(1, ['DANH SÁCH VĂN BẢN']);
    worksheet.mergeCells(`A1:${lastColumnLetter}1`);
    worksheet.getRow(1).font = { bold: true, size: 14, name: 'Times New Roman' };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 34;

    // ===== DATE ROW =====
    worksheet.insertRow(2, [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`]);
    worksheet.mergeCells(`A2:${lastColumnLetter}2`);
    worksheet.getRow(2).font = { italic: true, size: 11, name: 'Times New Roman' };
    worksheet.getRow(2).alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getRow(2).height = 22;

    // ===== HEADER ROW =====
    const headerRowIndex = 3;
    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.height = 28;
    headerRow.font = { bold: true, size: 12, name: 'Times New Roman' };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEFEFEF' },
      };
    });

    // ===== DATA ROWS =====
    data.forEach((item, index) => {
      worksheet.addRow({
        stt: index + 1,
        documentSymbol: item.documentSymbol,
        documentTitle: item.documentTitleOriginal || '',
        statusLabel: this.getStatusLabelText(item.status),
      });
    });

    this.applyStandardExcelStyles(worksheet, headerRowIndex);

    const excelBuffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
    const excelFilename = `danh-sach-van-ban-${moment().format('DD-MM-YYYY')}.xlsx`;

    if (searchDto.exportType === 'excel') {
      return {
        buffer: excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: excelFilename,
      };
    }

    if (searchDto.exportType === 'pdf') {
      return await this.convertExcelToPdf({ buffer: excelBuffer, filename: excelFilename });
    }

    throw new BadRequestException('Unsupported export type');
  }

  async convertExcelToPdf(excel: { buffer: Buffer; filename: string }) {
    const tempFilePath = os.tmpdir() + '/temp.xlsx';
    fs.writeFileSync(tempFilePath, excel.buffer);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempFilePath));

    let responseData: Buffer | null = null;

    try {
      const response = await axios.post(
        `${process.env.APP_CONVERT_URL}/file-to-pdf`,
        formData,
        {
          headers: formData.getHeaders(),
          responseType: 'arraybuffer',
          maxBodyLength: Infinity,
          timeout: 30000, // 30 seconds timeout
        },
      );
      responseData = Buffer.from(response.data);
    } catch (err: any) {
      console.error('Error converting Excel to PDF:', err.message);
      console.error('Convert service URL:', process.env.APP_CONVERT_URL);

      // Cleanup temp file
      try {
        fs.unlinkSync(tempFilePath);
      } catch { }

      // Throw error với thông tin chi tiết
      throw new InternalServerErrorException(
        `Không thể chuyển đổi file sang PDF. Vui lòng kiểm tra service convert tại ${process.env.APP_CONVERT_URL}. Lỗi: ${err.message}`
      );
    }

    // Cleanup temp file
    try {
      fs.unlinkSync(tempFilePath);
    } catch { }

    const pdfFilename = excel.filename.endsWith('.xlsx')
      ? excel.filename.replace(/\.xlsx$/, '.pdf')
      : excel.filename + '.pdf';

    return {
      buffer: responseData!,
      filename: pdfFilename,
      contentType: 'application/pdf',
    };
  }

  private getStatusLabelText(status: string) {
    switch (status) {
      case '0': return 'Chưa mở';
      case '1': return 'Đã mở';
      case '2': return 'Đã lưu trữ';
      default: return 'Không xác định';
    }
  }
  async importFolderDetails(data: any[], userId: string) {
    if (!data || data.length === 0) return;

    const fileCodeSet = new Set<string>();
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row.relatedDepartment && row.fileCode) {
        const key = `${row.relatedDepartment}-${row.fileCode}`;
        if (fileCodeSet.has(key)) {
          throw new BadRequestException(`Lỗi tại dòng ${i + 2}: Số và ký hiệu hồ sơ "${row.fileCode}" bị trùng lặp trong cùng Số và ký hiệu phòng "${row.relatedDepartment}".`);
        }
        fileCodeSet.add(key);
      }
    }

    const validData = data.filter(row => 
      row.formationYear && row.folderTitle && row.relatedDepartment && 
      row.fileTitle && row.fileCode && row.title && row.retentionPeriod && 
      !isNaN(parseInt(row.formationYear))
    );
    if (validData.length === 0) return;

    const fileRecordIdsToUpdate = new Set<string>();

    await this.yearRepository.manager.transaction(async (manager) => {
      // 1. YearCategory
      const yearVals = [...new Set(validData.map(r => parseInt(r.formationYear)))];
      const existingYears = await manager.find(YearCategoryEntity, { where: { year: In(yearVals) } });
      const yearMap = new Map<number, YearCategoryEntity>(existingYears.map(y => [y.year, y]));
      
      const newYears: YearCategoryEntity[] = [];
      for (const y of yearVals) {
        if (!yearMap.has(y)) {
          const yearCat = manager.create(YearCategoryEntity, { id: uuidv4(), year: y });
          newYears.push(yearCat);
          yearMap.set(y, yearCat);
        }
      }
      if (newYears.length > 0) await manager.save(YearCategoryEntity, newYears);

      // 2. FolderDetail
      const yearCategoryIds = Array.from(yearMap.values()).map(y => y.id);
      const existingFolders = await manager.find(FolderDetailEntity, { where: { yearCategoryId: In(yearCategoryIds) } });
      const folderMap = new Map<string, FolderDetailEntity>(existingFolders.map(f => [`${f.title}-${f.yearCategoryId}`, f]));
      
      const newFolders: FolderDetailEntity[] = [];
      for (const row of validData) {
        const yearCat = yearMap.get(parseInt(row.formationYear))!;
        const key = `${row.folderTitle}-${yearCat.id}`;
        if (!folderMap.has(key)) {
          const folder = manager.create(FolderDetailEntity, { 
            id: uuidv4(), 
            title: row.folderTitle, 
            yearCategoryId: yearCat.id,
            createdAt: new Date(Date.now() + newFolders.length * 1000)
          });
          newFolders.push(folder);
          folderMap.set(key, folder);
        }
      }
      if (newFolders.length > 0) await manager.save(FolderDetailEntity, newFolders);

      // 3. FileRecord
      const folderIds = Array.from(folderMap.values()).map(f => f.id);
      const existingFiles = await manager.find(FileRecordEntity, { where: { folderDetailId: In(folderIds) } });
      const fileMap = new Map<string, FileRecordEntity>(existingFiles.map(f => [`${f.fileSymbol}-${f.title}-${f.folderDetailId}`, f]));
      
      const newFiles: FileRecordEntity[] = [];
      for (const row of validData) {
        const yearCat = yearMap.get(parseInt(row.formationYear))!;
        const folder = folderMap.get(`${row.folderTitle}-${yearCat.id}`)!;
        const key = `${row.relatedDepartment}-${row.fileTitle}-${folder.id}`;
        if (!fileMap.has(key)) {
          const fileRecord = manager.create(FileRecordEntity, { 
            id: uuidv4(),
            fileSymbol: row.relatedDepartment, 
            title: row.fileTitle, 
            yearCategoryId: yearCat.id, 
            folderDetailId: folder.id,
            status: FileRecordStatus.NOT_OPEN,
            createdAt: new Date(Date.now() + newFiles.length * 1000)
          });
          newFiles.push(fileRecord);
          fileMap.set(key, fileRecord);
        }
      }
      if (newFiles.length > 0) await manager.save(FileRecordEntity, newFiles);

      // 4. RecordDocument
      const fileIds = Array.from(fileMap.values()).map(f => f.id);
      const existingDocs = await manager.find(RecordDocumentEntity, { where: { fileRecordId: In(fileIds) } });
      const docMap = new Map<string, RecordDocumentEntity>(existingDocs.map(d => [`${d.documentSymbol}-${d.documentTitle}-${d.fileRecordId}`, d]));
      
      const newDocs: RecordDocumentEntity[] = [];
      for (const row of validData) {
        const yearCat = yearMap.get(parseInt(row.formationYear))!;
        const folder = folderMap.get(`${row.folderTitle}-${yearCat.id}`)!;
        const fileRecord = fileMap.get(`${row.relatedDepartment}-${row.fileTitle}-${folder.id}`)!;
        
        fileRecordIdsToUpdate.add(fileRecord.id);

        const key = `${row.fileCode}-${row.title}-${fileRecord.id}`;
        if (!docMap.has(key)) {
          const recordDoc = manager.create(RecordDocumentEntity, { 
            id: uuidv4(),
            documentSymbol: row.fileCode, 
            documentTitle: row.title, 
            fileRecordId: fileRecord.id, 
            yearCategoryId: yearCat.id,
            status: DocumentStatus.NOT_OPEN,
            createdAt: new Date(Date.now() + newDocs.length * 1000)
          });
          newDocs.push(recordDoc);
          docMap.set(key, recordDoc);
        }
      }
      if (newDocs.length > 0) await manager.save(RecordDocumentEntity, newDocs);

      // 5. ArchiveRecord
      const docIds = Array.from(docMap.values()).map(d => d.id);
      const existingArchives = await manager.find(ArchiveRecord, { where: { category: In(docIds) } });
      const archiveMap = new Map<string, ArchiveRecord>(existingArchives.map(a => [`${a.category}-${a.fileCode}`, a]));
      
      const newArchives: ArchiveRecord[] = [];
      for (const row of validData) {
        const yearCat = yearMap.get(parseInt(row.formationYear))!;
        const folder = folderMap.get(`${row.folderTitle}-${yearCat.id}`)!;
        const fileRecord = fileMap.get(`${row.relatedDepartment}-${row.fileTitle}-${folder.id}`)!;
        const recordDoc = docMap.get(`${row.fileCode}-${row.title}-${fileRecord.id}`)!;
        
        const key = `${recordDoc.id}-${row.fileCode}`;
        if (!archiveMap.has(key)) {
          let mappedRetentionPeriod = row.retentionPeriod;
          if (mappedRetentionPeriod) {
            const rawRetention = mappedRetentionPeriod.toString().trim().toLowerCase();
            for (const [mapKey, label] of Object.entries(ARCHIVES_DEADLINE_MAP)) {
              if (label.toLowerCase() === rawRetention) {
                mappedRetentionPeriod = mapKey;
                break;
              }
            }
          }

          const archive = manager.create(ArchiveRecord, {
            id: uuidv4(),
            title: row.title,
            category: recordDoc.id,
            fileCode: row.fileCode,
            relatedDepartment: row.relatedDepartment,
            formationYear: row.formationYear,
            retentionPeriod: mappedRetentionPeriod,
            usageMode: "public",
            recordState: 1,
            status: 1,
            createdBy: userId,
          });
          newArchives.push(archive);
          archiveMap.set(key, archive);
        }
      }
      if (newArchives.length > 0) await manager.save(ArchiveRecord, newArchives);
    });

    for (const fileRecordId of fileRecordIdsToUpdate) {
      await this.updateCounts(fileRecordId);
    }
  }
}
