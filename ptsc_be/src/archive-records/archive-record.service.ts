import * as sql from 'mssql';
import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { safeQuery } from '../app.module';
import { ArchiveRecord } from './entities/archive-record.entity';
import { ArchiveRecordItem } from './entities/archive-record-item.entity';
import { CreateArchiveRecordDto, listArchiveRecordDto, UpdateRecordStateDto } from './dto/create-archive-record.dto';
import { DocumentStatus, RecordDocumentEntity } from 'src/record-catalog/entities/record-document.entity';
import { ConfigService } from '@nestjs/config';
import BpmnEngineService from 'src/bpmn/bpmn-engine.service';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { RuntimeDbService } from 'src/bpmn/runtime-dbmssql.service';
import { NotificationService } from 'src/notifycation/notification.service';
import { UsersService } from 'src/users/users.service';
import { FilesManagementService } from 'src/files-managerment/files-management-mssql.service';
import { ConfigurationService } from 'src/view-config/configuration.service';
import { getMssqlPool } from 'src/database/mssql.pool';
import { FeatureManagementEntity, StatusFeature } from 'src/feature-management/feature-management.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { buildArchiveRecordsCriteriaHelper, formatDMY, mapArchiveRecordState, mapArchiveRecordStateExport, parseSortArchiveRecord } from './helper/builder.query';
import { ArchiveRecordItemFile } from './entities/archive-record-item-flie.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { ArchiveAccessLog } from './entities/archive-access-logs.entity';
import { RecordCatalogService } from 'src/record-catalog/record-catalog.service';
import { ArchiveRecordPermissionService } from './archive-record-permission.service';
import { DestroyRecordsService } from 'src/destroy-record/destroy-records.service';

@Injectable()
export class ArchiveRecordService {
  private readonly logger = new Logger(ArchiveRecordService.name);
  private pool: sql.ConnectionPool | null = null;
  private dbname: string;
  private processKey: string;
  private crmCache = new Map<string, string>();
  constructor(
    private readonly configService: ConfigService,
    private readonly bpmnEngine: BpmnEngineService,
    private readonly sqlRepo: MSSQLRepository,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly runtimeDbService: RuntimeDbService,
    private readonly notificationService: NotificationService,
    private readonly userService: UsersService,
    private readonly fileService: FilesManagementService,
    private readonly configurationService: ConfigurationService,

    @InjectRepository(ArchiveRecord, 'mssqlConnection')
    private readonly recordRepo: Repository<ArchiveRecord>,

    @InjectRepository(ArchiveRecordItem, 'mssqlConnection')
    private readonly itemRepo: Repository<ArchiveRecordItem>,
    @InjectRepository(RecordDocumentEntity, 'mssqlConnection')
    private readonly recordDocumentRepo: Repository<RecordDocumentEntity>,
    @InjectRepository(ArchiveRecordItemFile, 'mssqlConnection')
    private readonly archiveRecordItemFileRepo: Repository<ArchiveRecordItemFile>,
    @InjectRepository(ArchiveAccessLog, 'mssqlConnection')
    private readonly archiveAccessLogRepo: Repository<ArchiveAccessLog>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly orgUnitRepo: Repository<OrganizationUnitEntity>,

    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userrepo: Repository<UserEntity>,
    @InjectDataSource('mssqlConnection')
    private readonly dataSource: DataSource,
    private readonly recordCatalogService: RecordCatalogService,

    private readonly archiveRecordPermissionService: ArchiveRecordPermissionService,
    private readonly destroyRecordService: DestroyRecordsService,
  ) { }

  private getDatabaseName(): string {
    const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
    if (!dbName) throw new Error('SQLSERVER_DATABASE not defined in .env');
    return dbName + '.dbo';
  }

  async onModuleInit() {
    this.dbname = this.getDatabaseName();
    await this.loadRecordExploitationCache();
    setInterval(() => {
      this.loadRecordExploitationCache();
    }, 5 * 60 * 1000);
  }

  private async getPool(): Promise<sql.ConnectionPool> {
    // Nếu đã có pool instance thì trả về luôn
    if (this.pool && this.pool.connected) return this.pool;

    // Nếu chưa có thì tạo pool 1 lần
    this.pool = await getMssqlPool(this.configService);

    if (!this.pool.connected) {
      throw new Error('MSSQL pool not connected');
    }

    return this.pool;
  }

  private async loadRecordExploitationCache() {
    const pool = await this.getPool();

    const [crmRes] = await Promise.all([
      pool.request().query(`
        SELECT s.code, d.value, d.title
        FROM ${this.dbname}.crm_sources s
        JOIN ${this.dbname}.crm_source_data d ON s.id = d.source_id
        WHERE s.status = 1 
          AND s.code IN ('MDKT', 'HTKT','S96','S95')
      `),
    ]);

    // crm
    this.crmCache.clear();
    crmRes.recordset.forEach((r) => {
      this.crmCache.set(r.value, r.title);
    });
  }
  async logArchiveAccess(
    archiveRecordId: string,
    userId: string,
    actionType: string = 'VIEW',
  ) {
    try {
      if (!archiveRecordId || !userId) return;

      // Lấy thông tin user
      const user = await this.userrepo.findOne({
        where: { id: userId },
        relations: ['parent'], // parent = phòng ban
        select: ['id', 'name'],
      });

      const log = this.archiveAccessLogRepo.create({
        archiveRecordId,
        userId,
        userName: user?.name || '',
        department: user?.parent?.name || '',
        actionType,
      });

      await this.archiveAccessLogRepo.save(log);
    } catch (err) {
      this.logger.error('logArchiveAccess error', err);
    }
  }
  async create(dto: CreateArchiveRecordDto, effectiveUserId?: string) {
    const { category, items, ...recordData } = dto;

    return this.dataSource.transaction(async (manager) => {
      const recordRepo = manager.getRepository(ArchiveRecord);
      const itemRepo = manager.getRepository(ArchiveRecordItem);
      const docRepo = manager.getRepository(RecordDocumentEntity);

      let fileCodeFromDocument: string | undefined = undefined;

      // Nếu có category (là id của record_document) → lấy document_symbol để gán vào fileCode
      if (category) {
        const document = await docRepo.findOne({
          where: { id: category },
          select: ['documentSymbol'], // chỉ lấy trường cần
        });

        if (document) {
          fileCodeFromDocument = document.documentSymbol || undefined;

          // Update status sang '1' (Opened)
          const updateResult = await docRepo.update(
            {
              id: category,
              status: DocumentStatus.NOT_OPEN,
            },
            { status: DocumentStatus.OPENED },
          );

          if (updateResult.affected === 0) {
            console.warn(
              `Không update status cho document id: ${category} (có thể đã mở hoặc không tồn tại)`,
            );
          }
        } else {
          // Optional: throw nếu category không tồn tại
          throw new NotFoundException(
            `Không tìm thấy record_document với id: ${category}`,
          );
        }
      }

      // Tạo record với fileCode được tự động lấy từ document_symbol (nếu có)
      const record = recordRepo.create({
        ...recordData,
        category, // vẫn lưu ID để liên kết
        fileCode: fileCodeFromDocument || recordData.fileCode, // ưu tiên từ document, fallback về DTO nếu có
        createdBy: effectiveUserId,
      });

      record.expiryDate = ArchiveRecord.calculateExpiryDate(
        record.endDate,
        record.retentionPeriod,
      ) ?? undefined;

      const savedRecord = await recordRepo.save(record);

      // Xử lý items
      if (items?.length) {
        for (const itemDto of items) {
          const item = itemRepo.create({
            sortOrder: itemDto.sortOrder,
            groupName: itemDto.groupName,
            notes: itemDto.notes,
            archiveRecordId: savedRecord.id,
          });
          const savedItem = await itemRepo.save(item);

          if (itemDto.fileIds?.length) {
            const fileRepo = manager.getRepository(ArchiveRecordItemFile);
            const fileLinks = itemDto.fileIds.map((fid) =>
              fileRepo.create({
                archiveRecordItemId: savedItem.id,
                fileId: fid,
              }),
            );
            await fileRepo.save(fileLinks);
          }
        }
      }

      // Cập nhật số lượng
      const finalRecord = await recordRepo.findOne({
        where: { id: savedRecord.id },
        relations: ['items', 'items.files'],
      });

      if (finalRecord?.category) {
        const doc = await docRepo.findOne({ where: { id: finalRecord.category } });
        if (doc?.fileRecordId) {
          await this.recordCatalogService.updateCounts(doc.fileRecordId);
        }
      }

      return finalRecord;
    });
  }

  async update(id: string, dto: CreateArchiveRecordDto) {
    return this.dataSource.transaction(async (manager) => {
      const recordRepo = manager.getRepository(ArchiveRecord);
      const itemRepo = manager.getRepository(ArchiveRecordItem);
      const fileRepo = manager.getRepository(ArchiveRecordItemFile);
      const docRepo = manager.getRepository(RecordDocumentEntity);

      const record = await recordRepo.findOne({
        where: { id },
        relations: ['items', 'items.files'],
      });

      if (!record) {
        throw new NotFoundException('ArchiveRecord not found');
      }

      const { items, ...recordData } = dto;

      // Update ArchiveRecord
      recordRepo.merge(record, recordData);
      record.expiryDate = ArchiveRecord.calculateExpiryDate(
        record.endDate,
        record.retentionPeriod,
      ) ?? undefined;
      const savedRecord = await recordRepo.save(record);

      // --- SYNC WITH RECORD DOCUMENT ---
      // Nếu record này liên kết với 1 document (qua trường category lưu docId)
      if (savedRecord.category) {
        const updateDocPayload: any = {};

        // Nếu tiêu đề hồ sơ thay đổi → cập nhật tiêu đề văn bản
        if (recordData.title) {
          updateDocPayload.documentTitle = recordData.title;
        }

        // Nếu mã hồ sơ thay đổi → cập nhật số ký hiệu văn bản
        if (recordData.fileCode) {
          updateDocPayload.documentSymbol = recordData.fileCode;
        }

        if (Object.keys(updateDocPayload).length > 0) {
          await docRepo.update({ id: savedRecord.category }, updateDocPayload);
        }
      }
      // --------------------------------

      if (!items) {
        return record;
      }

      const payloadItemIds = items.filter((i) => i.id).map((i) => i.id);
      const dbItemIds = record.items.map((i) => i.id);

      const deleteItemIds = dbItemIds.filter(
        (dbId) => !payloadItemIds.includes(dbId),
      );

      if (deleteItemIds.length) {
        await itemRepo.delete({
          id: In(deleteItemIds),
          archiveRecordId: id,
        });
      }

      for (const item of items) {
        let savedItem = item.id
          ? await itemRepo.findOne({
            where: { id: item.id, archiveRecordId: id },
            relations: ['files'],
          })
          : null;

        if (!savedItem) {
          savedItem = await itemRepo.save(
            itemRepo.create({
              archiveRecordId: id,
              sortOrder: item.sortOrder,
              groupName: item.groupName,
              notes: item.notes,
            }),
          );
          savedItem.files = [];
        } else {
          await itemRepo.update(savedItem.id, {
            sortOrder: item.sortOrder,
            groupName: item.groupName,
            notes: item.notes,
          });
        }
        const payloadFileIds = item.fileIds ?? [];
        const dbFileIds = savedItem.files.map((f) => f.fileId);

        const deleteFileIds = dbFileIds.filter(
          (fid) => !payloadFileIds.includes(fid),
        );

        if (deleteFileIds.length) {
          await fileRepo.delete({
            archiveRecordItemId: savedItem.id,
            fileId: In(deleteFileIds),
          });
        }

        const insertFileIds = payloadFileIds.filter(
          (fid) => !dbFileIds.includes(fid),
        );

        if (insertFileIds.length) {
          await fileRepo.save(
            insertFileIds.map((fid) =>
              fileRepo.create({
                archiveRecordItemId: savedItem.id,
                fileId: fid,
              }),
            ),
          );
        }
      }

      const finalRecord = await recordRepo.findOne({
        where: { id },
        relations: ['items', 'items.files'],
      });

      if (finalRecord?.category) {
        const doc = await docRepo.findOne({ where: { id: finalRecord.category } });
        if (doc?.fileRecordId) {
          await this.recordCatalogService.updateCounts(doc.fileRecordId);
        }
      }

      return finalRecord;
    });
  }

  async updateItemFiles(itemId: string, fileIds: number[] = []) {
    return this.dataSource.transaction(async (manager) => {
      const itemRepo = manager.getRepository(ArchiveRecordItem);
      const fileRepo = manager.getRepository(ArchiveRecordItemFile);

      // ==== TÌM ITEM ====
      const item = await itemRepo.findOne({
        where: { id: itemId },
        relations: { files: true },
      });

      if (!item) {
        throw new NotFoundException('ArchiveRecordItem not found');
      }

      // ==== CHUẨN HOÁ IDS ====
      const newFileIds = [...new Set(fileIds.map(Number).filter(Boolean))];
      const dbFileIds =
        item.files?.map((f) => Number(f.fileId)).filter(Boolean) || [];

      // ==== DELETE ====
      const deleteIds = dbFileIds.filter((id) => !newFileIds.includes(id));
      if (deleteIds.length) {
        await fileRepo.delete({
          archiveRecordItemId: itemId,
          fileId: In(deleteIds),
        });
      }

      // ==== INSERT ====
      const insertIds = newFileIds.filter((id) => !dbFileIds.includes(id));
      if (insertIds.length) {
        const rows = insertIds.map((fid) =>
          fileRepo.create({
            archiveRecordItemId: itemId,
            fileId: fid,
          }),
        );
        await fileRepo.save(rows);
      }

      // ==== LẤY LẠI ITEM ====
      const updatedItem = await itemRepo.findOne({
        where: { id: itemId },
        relations: { files: true },
      });

      if (!updatedItem || !updatedItem.files?.length) {
        return updatedItem;
      }

      const allFileIds = updatedItem.files
        .map((f) => Number(f.fileId))
        .filter(Boolean);

      // ==== QUERY FILE THẬT (SAFE PARAM) ====
      const fileDetails = await manager.query(
        `
          SELECT 
            id,
            file_name AS name,
            file_size AS size,
            mime_type AS mimeType,
            number_of_signed_file AS pages,
            created_at AS createdAt
          FROM ${this.dbname}.files
          WHERE id IN (${allFileIds.map((_, i) => `@${i}`).join(',')})
        `,
        allFileIds,
      );

      // ==== MAP DETAIL ====
      const detailMap = new Map<number, any>();
      fileDetails.forEach((f) => {
        detailMap.set(Number(f.id), f);
      });

      // ==== MERGE ====
      const filesWithDetails = updatedItem.files.map((f) => {
        const d = detailMap.get(Number(f.fileId));
        return {
          ...f,
          name: d?.name || null,
          size: d?.size || 0,
          mimeType: d?.mimeType || null,
          pages: d?.pages || 0,
          fileCreatedAt: d?.createdAt || null,
        };
      });

      // Cập nhật số lượng
      const archiveItem = await itemRepo.findOne({
        where: { id: itemId },
        relations: ['archiveRecord']
      });

      if (archiveItem?.archiveRecord?.category) {
        const doc = await manager.getRepository(RecordDocumentEntity).findOne({
          where: { id: archiveItem.archiveRecord.category }
        });
        if (doc?.fileRecordId) {
          await this.recordCatalogService.updateCounts(doc.fileRecordId);
        }
      }

      // không gán đè entity gốc
      return {
        ...updatedItem,
        files: filesWithDetails,
      };
    });
  }

  async findOne(id: string) {
    const record = await this.recordRepo.findOne({
      where: { id },
      relations: ['items', 'items.files'],
    });

    if (record && record.items) {
      record.items = record.items.filter(item => item.status !== 0);
    }

    if (!record) {
      throw new NotFoundException('Not found');
    }

    const isCollected = record.recordState === 2;
    const isDestroyed = record.recordState === 3;

    // 1. Tổng file + tổng trang
    const summaryRaw = await safeQuery(this.dataSource,
      `
      SELECT 
        COUNT(f.id) AS totalFiles,
        ISNULL(SUM(f.number_of_signed_file),0) AS totalPages
      FROM archive_record_items i
      LEFT JOIN archive_record_item_files rf 
        ON rf.archive_record_item_id = i.id
      LEFT JOIN ${this.dbname}.files f 
        ON f.id = rf.file_id
      WHERE i.archive_record_id = @0 AND (i.status IS NULL OR i.status != 0)
    `,
      [id],
    );

    const totalFiles = Number(summaryRaw?.[0]?.totalFiles || 0);
    const totalDocuments = totalFiles; // Thống nhất cách gọi tài liệu/file cho UI
    const totalPages = Number(summaryRaw?.[0]?.totalPages || 0);

    // 2. Danh sách file chi tiết
    const fileDetails = await safeQuery(this.dataSource,
      `
      SELECT 
        i.id              AS itemId,
        f.id              AS fileId,
        f.file_name       AS fileName,
        f.file_size       AS fileSize,
        f.mime_type       AS mimeType,
        f.number_of_signed_file AS pages,
        f.created_at      AS createdAt
      FROM archive_record_items i
      LEFT JOIN archive_record_item_files rf 
        ON rf.archive_record_item_id = i.id
      LEFT JOIN ${this.dbname}.files f 
        ON f.id = rf.file_id
      WHERE i.archive_record_id = @0 AND (i.status IS NULL OR i.status != 0)
    `,
      [id],
    );

    // 3. Map file theo itemId
    const fileMap = new Map<string, any[]>();

    fileDetails.forEach((f: any) => {
      if (!f?.fileId) return;

      const arr = fileMap.get(f.itemId) ?? [];

      arr.push({
        id: f.fileId,
        name: f.fileName,
        size: f.fileSize,
        mimeType: f.mimeType,
        pages: f.pages ?? 0,
        createdAt: f.createdAt,
      });

      fileMap.set(f.itemId, arr);
    });

    // 4. Gộp vào files
    const itemsWithFiles = (record.items || []).map((item: any) => {
      const detailFiles = fileMap.get(item.id) || [];

      const mergedFiles = (item.files || []).map((f: any) => {
        const d = detailFiles.find((x) => x.id == f.fileId);

        return {
          id: f.id,
          fileId: f.fileId,
          createdAt: f.createdAt,

          name: d?.name || null,
          size: d?.size || null,
          mimeType: d?.mimeType || null,
          pages: d?.pages || 0,
          fileCreatedAt: d?.createdAt || null,
        };
      });

      return {
        ...item,
        files: mergedFiles,
      };
    });
    const orgUnits = await safeQuery(this.dataSource, `
      SELECT id, name
      FROM ${this.dbname}.organization_units
      WHERE status = 1
    `, []);
    const orgUnitMap = orgUnits.reduce(
      (map: Record<string, string>, u: any) => {
        map[u.id] = u.name;
        map[u.name] = u.name;
        return map;
      },
      {},
    );
    let relatedDepartment = record.relatedDepartment;

    if (relatedDepartment) {
      const names = relatedDepartment.split(',').map((d: string) => d.trim());

      relatedDepartment = names
        .map((n: string) => orgUnitMap[n] || n)
        .join(', ');
    }
    let profileHeading = '';
    if (record.category) {
      const docWithFolder = await this.recordDocumentRepo.findOne({
        where: { id: record.category },
        relations: ['fileRecord', 'fileRecord.folderDetail']
      });
      profileHeading = docWithFolder?.fileRecord?.folderDetail?.title || '';
    }

    return {
      ...record,
      relatedDepartment,
      profileHeading,
      recordStateLabel: mapArchiveRecordState(record.recordState),
      items: itemsWithFiles,
      totalFiles,
      totalDocuments,
      totalPages,
      isCollected,
      isDestroyed,
    };
  }

  // Danh sách hồ sơ lưu trữ
  async listArchivedRecords(
    query: listArchiveRecordDto,
    userId: string,
    authorId?: string,
  ) {
    const {
      type,
      page = 1,
      limit = 20,
      filter,
      sort,
      processFn,
      authority,
      isExport,
      destroyRecordId,
      isExpired
    } = query;

    if (!this.dbname) {
      this.dbname = this.getDatabaseName();
    }
    let isFilterDelete = false;
    let ids;
    // Kiểm tra nếu KHÔNG CÓ destroyRecordId (hoặc chuỗi rỗng)
    if (!destroyRecordId) {
      await this.archiveRecordPermissionService.checkViewFolder(userId);
    } else {
      isFilterDelete = true;
      // Dùng toán tử ! ở đây để báo cho TypeScript biết destroyRecordId chắc chắn tồn tại ở nhánh else
      const destroyRecord = await this.destroyRecordService.findOne(destroyRecordId!);
      ids = destroyRecord?.profileIds || [];
      if (ids.length === 0) {
        return {
          success: true,
          items: [],
          total: 0,
          page: Math.max(Number(page) || 1, 1),
          limit: Math.min(Number(limit) || 20, 1000),
          totalPages: 0,
        };
      }
    }


    // get quyền
    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const [pool, featureManagement, userRes] = await Promise.all([
      this.getPool(),
      this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      }),
      this.userrepo.findOne({
        where: { id: userId },
        relations: ['parent'],
        select: ['id'],
      }),
    ]);

    const receiverUnit = userRes?.parent?.id ?? '';
    if (!receiverUnit) {
      throw new BadRequestException('User chưa thuộc đơn vị');
    }

    // ==========================================
    // ⚡ XỬ LÝ BỘ LỌC KHOẢNG NGÀY EXPIRYDATE TỪ FE
    // ==========================================
    const cleanFilter = filter ? JSON.parse(JSON.stringify(filter)) : {};
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // Regex bảo mật chống SQL Injection
    const expiryDateWhere: string[] = [];

    if (cleanFilter.expiryDate) {
      const { startDate, endDate } = cleanFilter.expiryDate;

      if (startDate && dateRegex.test(startDate)) {
        expiryDateWhere.push(`archive_records.expiry_date >= '${startDate} 00:00:00'`);
      }
      if (endDate && dateRegex.test(endDate)) {
        expiryDateWhere.push(`archive_records.expiry_date <= '${endDate} 23:59:59'`);
      }

      // Xóa để tránh buildCriteria xử lý trùng lặp
      delete cleanFilter.expiryDate;
    }

    const criteria = this.buildCriteria(cleanFilter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const {
      sql: filterFeature,
      joins: filterJoins,
      from,
    } = buildArchiveRecordsCriteriaHelper(
      [...featureCriteria, ...criteria],
      'archive_records',
      featureManagement,
    );


    const TYPES = ['all', 'collecting', 'archived', 'destroyed'] as const;
    if (!type || !TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }

    const where: string[] = [];
    where.push(`${from}.status = 1 AND ${from}.record_state != 3`);

    if (type === 'collecting') where.push(`${from}.record_state = 1`);
    if (type === 'archived') where.push(`${from}.record_state = 2`);
    if (type === 'destroyed') where.push(`${from}.record_state = 3`);
    if (filterFeature) where.push(`(${filterFeature})`);

    // Thêm điều kiện lọc khoảng ngày hết hạn của FE
    if (expiryDateWhere.length > 0) {
      where.push(...expiryDateWhere);
    }

    // ==========================================
    // ⚡ CHỈ CÒN ĐÚNG 2 DÒNG SIÊU GỌN VÀ NHANH
    // ==========================================
    if (isExpired === 'true') {
      where.push(`${from}.record_state = 2`);
      // Thay GETUTCDATE() bằng GETDATE() để khớp múi giờ địa phương lưu trong DB
      where.push(`${from}.expiry_date IS NOT NULL AND GETDATE() > ${from}.expiry_date`);
    }

    const whereClause = ` WHERE ${where.join(' AND ')}`;
    const joinClause = filterJoins ? ` ${filterJoins} ` : '';

    const limitNum = Math.min(Number(limit) || 20, 1000);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    const { dbKeys, aliases, allFilterFields } =
      await this.configurationService.buildFilterFieldsArchiveRecord(
        from,
        [],
        processFn,
      );

    ['groupName'].forEach((f) => {
      const snake = f.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allFilterFields.includes(f) || allFilterFields.includes(snake)) {
        aliases[f] = f;
      }
    });

    const cleanExpiryKey = `${from}.expiry_date`;
    if (!dbKeys.includes('expiry_date') && !dbKeys.includes(cleanExpiryKey)) {
      dbKeys.push(cleanExpiryKey);
    }
    aliases['expiryDate'] = 'expiryDate';
    aliases['expiry_date'] = 'expiryDate';

    const selectFields = dbKeys.map((c) => (c.includes('.') ? c : `${from}.${c}`)).join(', ');
    const orderBy =
      ' ORDER BY ' + parseSortArchiveRecord(sort, aliases, from, {});

    let totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    let dataSql = `
      SELECT ${selectFields}
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
      ${orderBy}
      OFFSET ${offsetNum} ROWS
      FETCH NEXT ${limitNum} ROWS ONLY
    `;

    let totalResult, rowsResult;
    if (isFilterDelete) {
      const quotedIds = ids.map((id: string) => `'${id.replace(/'/g, "''")}'`).join(',');
      totalSql = `
        SELECT COUNT(DISTINCT ${from}.id) AS total
        FROM ${this.dbname}.${from}
        ${joinClause}
        where ${from}.id IN (${quotedIds})
      `;

      dataSql = `
          SELECT ${selectFields}
          FROM ${this.dbname}.${from}
          ${joinClause}
          where ${from}.id IN (${quotedIds})
          ${orderBy}
          OFFSET ${offsetNum} ROWS
          FETCH NEXT ${limitNum} ROWS ONLY
        `;
    }
    try {
      [totalResult, rowsResult] = await Promise.all([
        pool.request().query(totalSql),
        pool.request().query(dataSql),
      ]);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn hồ sơ');
    }
    const total = totalResult.recordset[0]?.total ?? 0;
    const items = rowsResult.recordset ?? [];
    const mapped = await this.mapDocKeyArchiveRecord(items, aliases, isExport);

    // Định dạng trường ngày giờ hết hạn trả về cho FE
    const mappedWithExpiry = mapped.map((item: any) => ({
      ...item,
      expiryDate: this.formatExpiryDate(item.expiryDate || item.expiry_date),
    }));

    return {
      success: true,
      items: mappedWithExpiry,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }
  private formatExpiryDate(dbExpiry: any): string | null {
    if (!dbExpiry) return null;
    const dateObj = new Date(dbExpiry);
    if (isNaN(dateObj.getTime())) return null;

    const pad = (num: number) => String(num).padStart(2, '0');
    const d = pad(dateObj.getDate());
    const m = pad(dateObj.getMonth() + 1);
    const y = dateObj.getFullYear();
    const h = pad(dateObj.getHours());
    const min = pad(dateObj.getMinutes());
    const s = pad(dateObj.getSeconds());
    return `${d}-${m}-${y} ${h}:${min}:${s}`;
  }


  // Danh sách tra cứu hồ sơ lưu trữ cấp cha
  async getParentRecord(
    query: listArchiveRecordDto,
    userId: string,
    authorId?: string,
  ) {
    const {
      type,
      page = 1,
      limit = 20,
      filter,
      sort,
      processFn,
      authority,
      isExport,
    } = query;

    // Lấy docStart/docEnd từ filter object (client gửi filter[docStart], filter[docEnd])
    const docStart = filter?.docStart;
    const docEnd = filter?.docEnd;

    // Lấy createdAtStart/createdAtEnd từ filter object (client gửi filter[createdAtStart], filter[createdAtEnd])
    const createdAtStart = filter?.createdAtStart;
    const createdAtEnd = filter?.createdAtEnd;

    // Lấy fileSizeStart/fileSizeEnd từ filter object (client gửi filter[fileSizeStart], filter[fileSizeEnd])
    const fileSizeStart = filter?.fileSizeStart;
    const fileSizeEnd = filter?.fileSizeEnd;

    if (!this.dbname) {
      this.dbname = this.getDatabaseName();
    }

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const [pool, userRoleRes, featureManagement, userRes] = await Promise.all([
      this.getPool(),
      this.userService.getUserRole(userId),
      this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      }),
      this.userrepo.findOne({
        where: { id: userId },
        relations: ['parent'],
      }),
    ]);

    const receiverUnit = userRes?.parent?.id ?? '';
    const receiverUnitName = userRes?.parent?.name ?? '';
    if (!receiverUnit) {
      throw new BadRequestException('User chưa thuộc đơn vị');
    }

    // Resolve organization unit ID to name for relatedDepartment filter
    if (filter?.relatedDepartment) {
      const resolveId = async (id: string) => {
        if (typeof id === 'string' && (id.length === 24 || id.length === 36)) {
          try {
            const unit = await this.dataSource.getRepository(OrganizationUnitEntity).findOne({
              where: { id: id as any },
              select: ['name'],
            });
            if (unit?.name) {
              return unit.name;
            }
          } catch (e) {
            this.logger.error(`Error resolving unit ID ${id}: ${e.message}`);
          }
        }
        return id;
      };

      if (typeof filter.relatedDepartment === 'string') {
        filter.relatedDepartment = await resolveId(filter.relatedDepartment);
      } else if (typeof filter.relatedDepartment === 'object' && filter.relatedDepartment.value) {
        if (Array.isArray(filter.relatedDepartment.value)) {
          filter.relatedDepartment.value = await Promise.all(
            filter.relatedDepartment.value.map((v: any) => resolveId(String(v))),
          );
        } else {
          filter.relatedDepartment.value = await resolveId(String(filter.relatedDepartment.value));
        }
      }
    }

    const criteria = this.buildCriteria(filter);

    // Tự động filter theo đơn vị nếu không phải văn thư/admin
    const isArchivist = await this.userService.isUserInFlowQuick(userId, 'hosoluutru');
    if (!isArchivist && receiverUnitName) {
      criteria.push({
        name: 'related_department',
        operator: 'like',
        value: receiverUnitName,
      });
    }

    const featureCriteria = featureManagement?.criteria ?? [];

    const {
      sql: filterFeature,
      joins: filterJoins,
      from,
    } = buildArchiveRecordsCriteriaHelper(
      [...featureCriteria, ...criteria],
      'archive_records',
      featureManagement,
    );

    const TYPES = ['all', 'collecting', 'archived', 'destroyed'] as const;
    if (!type || !TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }

    const where: string[] = [];
    where.push(`${from}.status = 1`);

    if (type === 'collecting') where.push(`${from}.record_state = 1`);
    if (type === 'archived') where.push(`${from}.record_state = 2`);
    if (type === 'destroyed') where.push(`${from}.record_state = 3`);
    if (filterFeature) where.push(`(${filterFeature})`);

    // Filter theo số lượng tài liệu con (file trong groupFile)
    // Chỉ trả về folder nếu có ít nhất 1 groupFile có số lượng file thỏa điều kiện
    const docStartNum = docStart != null ? Number(docStart) : null;
    const docEndNum = docEnd != null ? Number(docEnd) : null;
    if (docStartNum != null || docEndNum != null) {
      let havingClause = '';
      if (docStartNum != null && docEndNum != null) {
        havingClause = `HAVING COUNT(*) BETWEEN ${docStartNum} AND ${docEndNum}`;
      } else if (docStartNum != null) {
        havingClause = `HAVING COUNT(*) >= ${docStartNum}`;
      } else {
        havingClause = `HAVING COUNT(*) <= ${docEndNum}`;
      }
      // Tìm folder có ít nhất 1 groupFile có số file thỏa điều kiện
      where.push(
        `${from}.id IN (
          SELECT DISTINCT _ari.archive_record_id 
          FROM archive_record_items _ari 
          WHERE _ari.archive_record_id = ${from}.id
          AND _ari.id IN (
            SELECT _arif.archive_record_item_id 
            FROM archive_record_item_files _arif 
            WHERE _arif.archive_record_item_id = _ari.id 
            GROUP BY _arif.archive_record_item_id 
            ${havingClause}
          )
        )`,
      );
    }

    // Filter theo khoảng thời gian created_at
    if (createdAtStart && createdAtEnd) {
      where.push(`${from}.created_at BETWEEN '${createdAtStart}' AND '${createdAtEnd}'`);
    } else if (createdAtStart) {
      where.push(`${from}.created_at >= '${createdAtStart}'`);
    } else if (createdAtEnd) {
      where.push(`${from}.created_at <= '${createdAtEnd}'`);
    }

    // Filter theo dung lượng file (tìm hồ sơ có ít nhất 1 file nằm trong khoảng)
    // Client gửi đơn vị MB → convert sang bytes (1 MB = 1024 * 1024 = 1048576 bytes)
    const MB_TO_BYTES = 1024 * 1024;
    const fileSizeStartNum = fileSizeStart != null ? Number(fileSizeStart) * MB_TO_BYTES : null;
    const fileSizeEndNum = fileSizeEnd != null ? Number(fileSizeEnd) * MB_TO_BYTES : null;
    if (fileSizeStartNum != null || fileSizeEndNum != null) {
      let sizeCondition = '';
      if (fileSizeStartNum != null && fileSizeEndNum != null) {
        sizeCondition = `AND _f.file_size BETWEEN ${fileSizeStartNum} AND ${fileSizeEndNum}`;
      } else if (fileSizeStartNum != null) {
        sizeCondition = `AND _f.file_size >= ${fileSizeStartNum}`;
      } else {
        sizeCondition = `AND _f.file_size <= ${fileSizeEndNum}`;
      }
      where.push(
        `${from}.id IN (SELECT _ari.archive_record_id FROM archive_record_items _ari JOIN archive_record_item_files _arif ON _arif.archive_record_item_id = _ari.id JOIN ${this.dbname}.files _f ON _f.id = _arif.file_id WHERE _ari.archive_record_id = ${from}.id ${sizeCondition})`,
      );
    }

    const whereClause = ` WHERE ${where.join(' AND ')}`;
    const joinClause = filterJoins ? ` ${filterJoins} ` : '';

    const limitNum = Math.min(Number(limit) || 20, 1000);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    const { dbKeys, aliases, allFilterFields } =
      await this.configurationService.buildFilterFieldsArchiveRecord(
        from,
        [],
        processFn,
      );

    ['groupName'].forEach((f) => {
      const snake = f.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allFilterFields.includes(f) || allFilterFields.includes(snake)) {
        aliases[f] = f;
      }
    });

    if (!dbKeys.includes('usage_mode')) dbKeys.push('usage_mode');
    // if (!dbKeys.includes('notes')) dbKeys.push('notes');
    aliases['usageMode'] = 'usageMode';
    aliases['notes'] = 'notes';

    const selectFields = dbKeys.join(', ');
    const orderBy =
      ' ORDER BY ' + parseSortArchiveRecord(sort, aliases, from, {});

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    const dataSql = `
      SELECT ${selectFields}
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
      ${orderBy}
      OFFSET ${offsetNum} ROWS
      FETCH NEXT ${limitNum} ROWS ONLY
    `;

    // this.logger.debug('[ARCHIVE] TOTAL SQL:', totalSql);
    // this.logger.debug('[ARCHIVE] DATA SQL:', dataSql);

    let totalResult, rowsResult;
    try {
      [totalResult, rowsResult] = await Promise.all([
        pool.request().query(totalSql),
        pool.request().query(dataSql),
      ]);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn hồ sơ');
    }

    const total = totalResult.recordset[0]?.total ?? 0;
    const items = rowsResult.recordset ?? [];
    const mapped = await this.mapDocKeyArchiveRecord(items, aliases, isExport);
    const data = mapped.map((item: any) => {
      return {
        ...item,
        parent: null,
        type: 'folder',
      };
    });
    return {
      success: true,
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  // Danh sách tra cứu hồ sơ lưu trữ cấp con (file + group file)
  async findOneChildParentRecord(
    id: string,
    page: number = 1,
    limit: number = 10,
    filter?: Record<string, string>, // Thêm filter parameter
  ) {
    const offset = (page - 1) * limit;

    // Lấy các filter params
    const docStart = filter?.docStart;
    const docEnd = filter?.docEnd;
    const fileSizeStart = filter?.fileSizeStart;
    const fileSizeEnd = filter?.fileSizeEnd;
    const createdAtStart = filter?.createdAtStart;
    const createdAtEnd = filter?.createdAtEnd;

    // Convert MB to bytes
    const MB_TO_BYTES = 1024 * 1024;
    const fileSizeStartNum = fileSizeStart != null ? Number(fileSizeStart) * MB_TO_BYTES : null;
    const fileSizeEndNum = fileSizeEnd != null ? Number(fileSizeEnd) * MB_TO_BYTES : null;
    const docStartNum = docStart != null ? Number(docStart) : null;
    const docEndNum = docEnd != null ? Number(docEnd) : null;

    // ============================
    // 🔵 CHECK RECORD
    // ============================
    const record = await this.recordRepo.findOne({
      where: { id },
      select: ['id'],
    });

    if (record) {
      // Build WHERE conditions cho groupFile
      const whereClauses: string[] = ['archive_record_id = @0'];
      const queryParams: (string | number)[] = [id];
      let paramIndex = 1;

      // Filter theo số lượng tài liệu trong groupFile
      if (docStartNum != null || docEndNum != null) {
        let havingClause = '';
        if (docStartNum != null && docEndNum != null) {
          havingClause = `HAVING COUNT(*) BETWEEN ${docStartNum} AND ${docEndNum}`;
        } else if (docStartNum != null) {
          havingClause = `HAVING COUNT(*) >= ${docStartNum}`;
        } else {
          havingClause = `HAVING COUNT(*) <= ${docEndNum}`;
        }

        whereClauses.push(
          `archive_record_items.id IN (SELECT arif.archive_record_item_id FROM archive_record_item_files arif WHERE arif.archive_record_item_id = archive_record_items.id GROUP BY arif.archive_record_item_id ${havingClause})`,
        );
      }

      // Filter theo file (dung lượng + thời gian) trong groupFile
      const fileWhereClauses: string[] = [];
      if (fileSizeStartNum != null || fileSizeEndNum != null) {
        if (fileSizeStartNum != null && fileSizeEndNum != null) {
          fileWhereClauses.push(`f.file_size BETWEEN ${fileSizeStartNum} AND ${fileSizeEndNum}`);
        } else if (fileSizeStartNum != null) {
          fileWhereClauses.push(`f.file_size >= ${fileSizeStartNum}`);
        } else {
          fileWhereClauses.push(`f.file_size <= ${fileSizeEndNum}`);
        }
      }

      if (createdAtStart && createdAtEnd) {
        fileWhereClauses.push(`f.created_at BETWEEN @${paramIndex} AND @${paramIndex + 1}`);
        queryParams.push(createdAtStart, createdAtEnd);
        paramIndex += 2;
      } else if (createdAtStart) {
        fileWhereClauses.push(`f.created_at >= @${paramIndex}`);
        queryParams.push(createdAtStart);
        paramIndex += 1;
      } else if (createdAtEnd) {
        fileWhereClauses.push(`f.created_at <= @${paramIndex}`);
        queryParams.push(createdAtEnd);
        paramIndex += 1;
      }

      if (fileWhereClauses.length) {
        whereClauses.push(`
        EXISTS (
          SELECT 1
          FROM archive_record_item_files arif
          JOIN ${this.dbname}.files f ON f.id = arif.file_id
          WHERE arif.archive_record_item_id = archive_record_items.id
          AND ${fileWhereClauses.join(' AND ')}
        )
      `);
      }

      const whereClause = whereClauses.join(' AND ');

      // tổng số item (có filter)
      const totalRaw = await this.dataSource.query(
        `
      SELECT COUNT(*) AS total
      FROM archive_record_items
      WHERE ${whereClause}
      `,
        queryParams,
      );

      const total = Number(totalRaw?.[0]?.total || 0);

      // Thêm offset và limit params
      queryParams.push(offset, limit);

      // lấy item có phân trang (có filter)
      const items = await this.dataSource.query(
        `
      SELECT *
      FROM archive_record_items
      WHERE ${whereClause}
      ORDER BY created_at DESC
      OFFSET @${paramIndex} ROWS FETCH NEXT @${paramIndex + 1} ROWS ONLY
      `,
        queryParams,
      );

      const mappedItems = items.map((item: any) => {
        const { group_name, groupName, ...rest } = item;

        return {
          ...rest,
          title: group_name ?? groupName,
          parent: id,
          // type: 'folder', // ✅ sửa lại đúng
          type: 'groupFile',
        };
      });

      return {
        data: mappedItems,
        total,
        page,
        limit,
      };
    }

    // ============================
    // 🟢 CHECK ITEM
    // ============================
    const itemCheck = await this.dataSource.query(
      `
    SELECT id
    FROM archive_record_items
    WHERE id = @0
    `,
      [id],
    );

    if (itemCheck?.length) {
      // Build WHERE conditions cho files
      const whereClauses: string[] = ['rf.archive_record_item_id = @0'];
      const queryParams: (string | number)[] = [id];
      let paramIndex = 1;

      // Filter theo dung lượng file
      if (fileSizeStartNum != null || fileSizeEndNum != null) {
        if (fileSizeStartNum != null && fileSizeEndNum != null) {
          whereClauses.push(`f.file_size BETWEEN ${fileSizeStartNum} AND ${fileSizeEndNum}`);
        } else if (fileSizeStartNum != null) {
          whereClauses.push(`f.file_size >= ${fileSizeStartNum}`);
        } else {
          whereClauses.push(`f.file_size <= ${fileSizeEndNum}`);
        }
      }

      // Filter theo created_at của file
      if (createdAtStart && createdAtEnd) {
        whereClauses.push(`f.created_at BETWEEN @${paramIndex} AND @${paramIndex + 1}`);
        queryParams.push(createdAtStart, createdAtEnd);
        paramIndex += 2;
      } else if (createdAtStart) {
        whereClauses.push(`f.created_at >= @${paramIndex}`);
        queryParams.push(createdAtStart);
        paramIndex += 1;
      } else if (createdAtEnd) {
        whereClauses.push(`f.created_at <= @${paramIndex}`);
        queryParams.push(createdAtEnd);
        paramIndex += 1;
      }

      const whereClause = whereClauses.join(' AND ');

      // tổng số file (có filter)
      const totalRaw = await this.dataSource.query(
        `
      SELECT COUNT(*) AS total
      FROM archive_record_item_files rf
      LEFT JOIN ${this.dbname}.files f 
        ON f.id = rf.file_id
      WHERE ${whereClause}
      `,
        queryParams,
      );

      const total = Number(totalRaw?.[0]?.total || 0);

      // Thêm offset và limit params
      queryParams.push(offset, limit);

      // lấy file có phân trang (có filter)
      const files = await this.dataSource.query(
        `
      SELECT 
        f.id,
        f.file_name       AS name,
        f.file_size       AS size,
        f.mime_type       AS mimeType,
        f.number_of_signed_file AS pages,
        f.created_at      AS createdAt
      FROM archive_record_item_files rf
      LEFT JOIN ${this.dbname}.files f 
        ON f.id = rf.file_id
      WHERE ${whereClause}
      ORDER BY f.created_at DESC
      OFFSET @${paramIndex} ROWS FETCH NEXT @${paramIndex + 1} ROWS ONLY
      `,
        queryParams,
      );

      return {
        data: files.map((file: any) => ({
          id: file.id,
          name: file.name,
          title: file.name,
          size: Number(file.size),
          mimeType: file.mimeType,
          pages: Number(file.pages ?? 0),
          createdAt: file.createdAt,
          parent: id,
          type: 'file', // ✅ file giữ nguyên
        })),
        total,
        page,
        limit,
      };
    }

    throw new NotFoundException('Not found');
  }

  // Danh sách văn bản theo hồ sơ lưu trữ (TRẢ DẠNG PHẲNG)
  async listDocumentsRecords(
    query: listArchiveRecordDto,
    userId: string,
    authorId?: string,
  ) {
    const { type, page = 1, limit = 200, filter, processFn, authority } = query;

    if (!this.dbname) {
      this.dbname = this.getDatabaseName();
    }

    if (authority === 'true' && authorId) {
      userId = authorId;
    }

    const pool = await this.getPool();

    // ===== USER + ĐƠN VỊ =====
    const userOrgRes = await pool.request().query(`
      SELECT 
        u.id,
        ou.code AS org_code,
        ou.mpath
      FROM ${this.dbname}.users u
      JOIN ${this.dbname}.organization_units ou ON ou.id = u.parent
      WHERE u.id = '${userId.replace(/'/g, "''")}'
    `);

    const userOrg = userOrgRes.recordset?.[0];
    if (!userOrg) {
      throw new BadRequestException('User chưa thuộc đơn vị');
    }

    const { org_code: orgCode, mpath } = userOrg;
    const mpathEscaped = mpath.replace(/'/g, "''");

    // ===== FEATURE MANAGEMENT =====
    const featureManagement = await this.featureManagementRepo.findOne({
      where: {
        code: processFn,
        status: 1,
        statusFeature: StatusFeature.ACTIVE,
      },
    });

    // ===== TYPE =====
    const TYPES = ['incoming', 'outgoing', 'work'] as const;
    if (!type || !TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }

    const DOCUMENT_TYPE_MAP = {
      work: ['taskdocuments', 'taskdocrecurring', 'finaldocuments'],
      incoming: ['incommingdocument'],
      outgoing: ['docDraft'],
    };

    // ===== BUILD CRITERIA =====
    const criteria = this.buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins } = buildArchiveRecordsCriteriaHelper(
      [...featureCriteria, ...criteria],
      'archive_records',
      featureManagement,
      ['ari', 'arif', 'fr', 'f'],
    );

    // ===== TYPE CONDITION =====
    const typeCondition =
      type === 'work'
        ? `fr.object_type IN (${DOCUMENT_TYPE_MAP.work.map((t) => `'${t}'`).join(',')})`
        : type === 'incoming'
          ? `fr.object_type IN (${DOCUMENT_TYPE_MAP.incoming.map((t) => `'${t}'`).join(',')})`
          : `fr.object_type NOT IN (${[
            ...DOCUMENT_TYPE_MAP.work,
            ...DOCUMENT_TYPE_MAP.incoming,
          ].map((t) => `'${t}'`).join(',')})`;

    // ===== WORK – RULE ĐƠN VỊ =====
    // const applyWorkOrgCondition = type === 'work' && orgCode !== 'TCT01';
    const applyWorkOrgCondition = false;

    // ===== PAGING =====
    const limitNum = Math.min(Number(limit) || 200, 1000);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    // ===== DATA QUERY =====
    const dataSql = `
      WITH FileInArchive AS (
        SELECT DISTINCT fr.file_id
        FROM ${this.dbname}.file_relations fr
        INNER JOIN ${this.dbname}.files f ON f.id = fr.file_id
        LEFT JOIN archive_record_item_files arif ON arif.file_id = fr.file_id
        LEFT JOIN archive_record_items ari ON ari.id = arif.archive_record_item_id
        LEFT JOIN archive_records archive_records ON archive_records.id = ari.archive_record_id
        ${filterJoins ?? ''}
        WHERE fr.status = 1
          AND ${typeCondition}
          ${filterFeature ? `AND (${filterFeature})` : ''}
      ),
      PaginatedRootFiles AS (
        SELECT f.id, f.created_at
        FROM ${this.dbname}.files f
        INNER JOIN FileInArchive fa ON fa.file_id = f.id
        ${applyWorkOrgCondition ? `
          INNER JOIN ${this.dbname}.users u ON u.id = f.created_by
          INNER JOIN ${this.dbname}.organization_units ou ON ou.id = u.parent
          WHERE ou.mpath LIKE '${mpathEscaped}%'
        ` : ''}
        ORDER BY f.created_at DESC, f.id DESC
        OFFSET ${offsetNum} ROWS
        FETCH NEXT ${limitNum} ROWS ONLY
      ),
      FileTree AS (
        SELECT f.*
        FROM ${this.dbname}.files f
        INNER JOIN PaginatedRootFiles prf ON prf.id = f.id

        UNION ALL

        SELECT child.*
        FROM ${this.dbname}.files child
        INNER JOIN FileTree parent ON parent.id = child.parent_id
      )
      SELECT DISTINCT
        f.id, f.file_name, f.file_path, f.mime_type, f.file_size, f.description,
        f.is_directory, f.parent_id, f.created_by, f.created_at, f.updated_at,
        f.status, f.version, f.is_signed_file, f.number_of_signed_file,
        f.storage_path, f.storage_type, f.isNumbered, f.typeSize, f.is_important
      FROM FileTree f
      ORDER BY f.created_at DESC, f.id DESC
    `;

    // ===== TOTAL THEO TAB (tab hiện tại) =====
    const totalSql = `
      SELECT COUNT(DISTINCT fr.file_id) AS total
      FROM ${this.dbname}.file_relations fr
      INNER JOIN ${this.dbname}.files f ON f.id = fr.file_id
      LEFT JOIN archive_record_item_files arif ON arif.file_id = fr.file_id
      LEFT JOIN archive_record_items ari ON ari.id = arif.archive_record_item_id
      LEFT JOIN archive_records archive_records ON archive_records.id = ari.archive_record_id
      ${filterJoins ?? ''}
      ${applyWorkOrgCondition ? `
        INNER JOIN ${this.dbname}.users u ON u.id = f.created_by
        INNER JOIN ${this.dbname}.organization_units ou ON ou.id = u.parent
      ` : ''}
      WHERE fr.status = 1
        AND ${typeCondition}
        ${filterFeature ? `AND (${filterFeature})` : ''}
        ${applyWorkOrgCondition ? `AND ou.mpath LIKE '${mpathEscaped}%'` : ''}
    `;

    // ===== TOTALS 3 TAB – luôn đếm đầy đủ, chỉ work bị lọc mpath =====
    const totalsSql = `
      SELECT 
        (SELECT COUNT(DISTINCT fr.file_id)
        FROM ${this.dbname}.file_relations fr
        INNER JOIN ${this.dbname}.files f ON f.id = fr.file_id
        LEFT JOIN archive_record_item_files arif ON arif.file_id = fr.file_id
        LEFT JOIN archive_record_items ari ON ari.id = arif.archive_record_item_id
        LEFT JOIN archive_records archive_records ON archive_records.id = ari.archive_record_id
        ${filterJoins ?? ''}
        WHERE fr.status = 1
          AND fr.object_type IN (${DOCUMENT_TYPE_MAP.incoming.map((t) => `'${t}'`).join(',')})
          ${filterFeature ? `AND (${filterFeature})` : ''}
        ) AS incoming,

        (SELECT COUNT(DISTINCT fr.file_id)
        FROM ${this.dbname}.file_relations fr
        INNER JOIN ${this.dbname}.files f ON f.id = fr.file_id
        ${applyWorkOrgCondition ? `
          INNER JOIN ${this.dbname}.users u ON u.id = f.created_by
          INNER JOIN ${this.dbname}.organization_units ou ON ou.id = u.parent
        ` : ''}
        LEFT JOIN archive_record_item_files arif ON arif.file_id = fr.file_id
        LEFT JOIN archive_record_items ari ON ari.id = arif.archive_record_item_id
        LEFT JOIN archive_records archive_records ON archive_records.id = ari.archive_record_id
        ${filterJoins ?? ''}
        WHERE fr.status = 1
          AND fr.object_type IN (${DOCUMENT_TYPE_MAP.work.map((t) => `'${t}'`).join(',')})
          ${applyWorkOrgCondition ? `AND ou.mpath LIKE '${mpathEscaped}%'` : ''}
          ${filterFeature ? `AND (${filterFeature})` : ''}
        ) AS work,

        (SELECT COUNT(DISTINCT fr.file_id)
        FROM ${this.dbname}.file_relations fr
        INNER JOIN ${this.dbname}.files f ON f.id = fr.file_id
        LEFT JOIN archive_record_item_files arif ON arif.file_id = fr.file_id
        LEFT JOIN archive_record_items ari ON ari.id = arif.archive_record_item_id
        LEFT JOIN archive_records archive_records ON archive_records.id = ari.archive_record_id
        ${filterJoins ?? ''}
        WHERE fr.status = 1
          AND fr.object_type NOT IN (
            ${[...DOCUMENT_TYPE_MAP.work, ...DOCUMENT_TYPE_MAP.incoming].map((t) => `'${t}'`).join(',')}
          )
          ${filterFeature ? `AND (${filterFeature})` : ''}
        ) AS outgoing
    `;

    const [dataRes, totalRes, totalsRes] = await Promise.all([
      pool.request().query(dataSql),
      pool.request().query(totalSql),
      pool.request().query(totalsSql),
    ]);

    // ===== MAP PHẲNG =====
    const items = (dataRes.recordset ?? []).map((f: any) => ({
      id: f.id,
      fileName: f.file_name,
      filePath: f.file_path,
      mimeType: f.mime_type,
      fileSize: f.file_size,
      description: f.description,

      isDirectory: !!f.is_directory,
      parentId: f.parent_id,

      createdBy: f.created_by,
      createdAt: f.created_at,
      updatedAt: f.updated_at,

      status: f.status,
      version: f.version,

      isSignedFile: f.is_signed_file,
      numberOfSignedFile: f.number_of_signed_file,

      storagePath: f.storage_path,
      storageType: f.storage_type,

      isNumbered: !!f.isNumbered,
      typeSize: f.typeSize,

      idBak: f.id_bak ?? null,
      tableBak: f.table_bak ?? null,
      typeDoc: f.type_doc ?? null,
      isBak: !!f.isBak,

      nguoiKyVanBan: f.nguoikyvanban ?? null,
      isImportant: !!f.is_important,

      type: f.is_directory ? 'folder' : 'file',
    }));

    const total = Number(totalRes.recordset?.[0]?.total ?? 0);

    return {
      success: true,
      items,
      total,
      totals: totalsRes.recordset?.[0] ?? { incoming: 0, work: 0, outgoing: 0 },
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async getFolderChildren(query: any, userId: string) {
    if (!this.dbname) {
      this.dbname = this.getDatabaseName();
    }

    const { page = 1, limit = 20, filter } = query;
    // Hỗ trợ lấy ID từ nhiều nguồn: filter.parentId, query.parentId, query.folderId
    const parentId = filter?.parentId || query?.parentId || query?.folderId || null;

    // LEVEL 0: ROOT => Gọi hàm listArchivedRecords (đã có sẵn filter, sort, paging)
    if (!parentId || parentId === 'null' || parentId === 'undefined') {
      // Ép kiểu về 'archived' để chỉ lấy hồ sơ đã lưu trữ
      const rootQuery = { ...query, type: 'archived' };
      const result = await this.listArchivedRecords(rootQuery, userId);

      // Fetch all files for each archive record
      const pool = await this.getPool();
      const recordIds = result.items.map((item: any) => item.id).filter(Boolean);

      const filesByRecordId = new Map<string, any[]>();

      if (recordIds.length > 0) {
        // Build parameterized query for files
        const filesQuery = `
          SELECT 
            ari.archive_record_id AS recordId,
            ari.group_name AS groupName,
            arif.id AS fileRelationId,
            arif.file_id AS fileId,
            arif.created_at AS fileRelationCreatedAt,
            f.file_name AS name,
            f.file_size AS size,
            f.mime_type AS mimeType,
            f.number_of_signed_file AS pages,
            f.created_at AS fileCreatedAt
          FROM archive_record_items ari
          LEFT JOIN archive_record_item_files arif ON arif.archive_record_item_id = ari.id
          LEFT JOIN ${this.dbname}.files f ON f.id = arif.file_id
          WHERE ari.archive_record_id IN (${recordIds.map((_, i) => `@param${i}`).join(',')})
            AND arif.file_id IS NOT NULL
          ORDER BY ari.archive_record_id, arif.created_at DESC
        `;

        const request = pool.request();
        recordIds.forEach((id, index) => {
          request.input(`param${index}`, sql.UniqueIdentifier, id);
        });

        const filesResult = await request.query(filesQuery);
        const filesData = filesResult.recordset ?? [];

        // Group files by recordId
        filesData.forEach((file: any) => {
          const recordId = file.recordId;
          if (!filesByRecordId.has(recordId)) {
            filesByRecordId.set(recordId, []);
          }
          filesByRecordId.get(recordId)!.push({
            id: file.fileRelationId,
            fileId: file.fileId,
            name: file.name,
            groupName: file.groupName,
            size: file.size ? Number(file.size) : 0,
            mimeType: file.mimeType,
            pages: file.pages ? Number(file.pages) : 0,
            createdAt: file.fileRelationCreatedAt,
            fileCreatedAt: file.fileCreatedAt,
            type: 'file',
            isDirectory: false,
          });
        });
      }

      return {
        success: true,
        folder: null,
        children: result.items.map((item) => ({
          id: item.id,
          name: item.title,
          type: 'folder',
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          isDirectory: true,
          fileCode: item.fileCode,
          recordState: item.recordState,
          children: filesByRecordId.get(item.id) || [], // Add files as children
        })),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      };
    }

    // LEVEL 1 & 2: Dùng hàm findOne (chi tiết hồ sơ) để lấy items và files
    // Lưu ý: Hàm findOne hiện tại trả về TOÀN BỘ items và files, chưa phân trang ở mức DB.
    // Nếu dữ liệu lớn, cần viết lại query phân trang cho items/files như yêu cầu trước.
    // Ở đây ta tận dụng lại findOne và map dữ liệu.

    // Kiểm tra xem ID là Hồ sơ hay Item
    const record = await this.recordRepo.findOne({ where: { id: parentId } });

    if (record) {
      // 1. Lấy danh sách Items thuộc hồ sơ này
      const offset = (Number(page) - 1) * Number(limit);
      const [items, total] = await Promise.all([
        this.itemRepo.find({
          where: { archiveRecordId: parentId },
          order: { sortOrder: 'ASC', createdAt: 'DESC' },
          skip: offset,
          take: Number(limit)
        }),
        this.itemRepo.count({ where: { archiveRecordId: parentId } })
      ]);

      // 2. Lấy danh sách Files cho các Items này (để hiển thị luôn con)
      let files = [];
      const itemIds = items.map(i => i.id);

      if (itemIds.length > 0) {
        // Query lấy file của các items trên
        // Cần đảm bảo convert UUID nếu cần, nhưng ở đây params @0 sẽ xử lý
        // Vì itemIds là array string (UUID), ta cần build query IN (...)

        // Cách an toàn với TypeORM parameters cho mảng
        const variables = itemIds.map((_, i) => `@${i}`).join(',');
        const queryFile = `
          SELECT 
            rf.archive_record_item_id AS itemId,
            ari.group_name    AS groupName,
            f.id,
            f.file_name       AS fileName,
            f.file_size       AS fileSize,
            f.mime_type       AS mimeType,
            f.created_at      AS createdAt,
            f.updated_at      AS updatedAt
          FROM archive_record_item_files rf
          JOIN archive_record_items ari ON ari.id = rf.archive_record_item_id
          JOIN ${this.dbname}.files f ON f.id = rf.file_id
          WHERE rf.archive_record_item_id IN (${variables})
          AND f.status = 1
          ORDER BY f.created_at DESC
        `;

        files = await this.dataSource.query(queryFile, itemIds);
      }

      // 3. Map Items và gán con (children = files)
      const children = items.map((i) => {
        // Lấy file thuộc item này
        const myFiles = files
          .filter((f: any) => f.itemId?.toLowerCase() === i.id?.toLowerCase())
          .map((f: any) => ({
            id: f.id,
            name: f.fileName,
            groupName: f.groupName,
            type: 'file',
            size: f.fileSize,
            mimeType: f.mimeType,
            createdAt: f.createdAt,
            updatedAt: f.updatedAt,
            isDirectory: false
          }));

        return {
          id: i.id,
          name: i.groupName || 'Nhóm tài liệu',
          type: 'folder',
          createdAt: i.createdAt,
          updatedAt: i.createdAt,
          isDirectory: true,
          notes: i.notes,
          children: myFiles // <--- Nested Files
        };
      });

      return {
        success: true,
        folder: {
          id: record.id,
          name: record.title,
          type: 'folder',
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
        children,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      };
    }

    // Nếu không phải record, check xem có phải Item không
    const item = await this.itemRepo.findOne({
      where: { id: parentId },
      relations: ['archiveRecord']
    });

    if (item) {
      // => Parent là Item => Trả về danh sách Files
      const offset = (Number(page) - 1) * Number(limit);

      // Query file có phân trang
      const totalRaw = await this.dataSource.query(
        `SELECT COUNT(*) as total FROM archive_record_item_files WHERE archive_record_item_id = @0`,
        [parentId]
      );
      const total = Number(totalRaw[0]?.total || 0);

      const files = await this.dataSource.query(
        `
        SELECT 
          f.id,
          f.file_name       AS fileName,
          f.file_size       AS fileSize,
          f.mime_type       AS mimeType,
          f.created_at      AS createdAt,
          f.updated_at      AS updatedAt,
          ari.group_name    AS groupName
        FROM archive_record_item_files rf
        JOIN ${this.dbname}.files f ON f.id = rf.file_id
        JOIN archive_record_items ari ON ari.id = rf.archive_record_item_id
        WHERE rf.archive_record_item_id = @0
        AND f.status = 1
        ORDER BY f.created_at DESC
        OFFSET @1 ROWS FETCH NEXT @2 ROWS ONLY
        `,
        [parentId, offset, Number(limit)]
      );

      const children = files.map((f: any) => ({
        id: f.id,
        name: f.fileName,
        groupName: f.groupName,
        type: 'file',
        size: f.fileSize,
        mimeType: f.mimeType,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        isDirectory: false,
      }));

      return {
        success: true,
        folder: {
          id: item.id,
          name: item.groupName,
          type: 'folder',
          createdAt: item.createdAt,
        },
        children,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      };
    }

    throw new NotFoundException('Không tìm thấy thư mục hoặc hồ sơ');
  }

  async updateRecordState(
    id: string,
    body: UpdateRecordStateDto, // Nhận toàn bộ object body
  ) {
    const state = body.recordState ?? 2;

    if (![1, 2, 3].includes(state)) {
      throw new BadRequestException('recordState không hợp lệ');
    }

    const record = await this.recordRepo.findOne({
      where: { id, status: 1 },
    });

    if (!record) {
      throw new NotFoundException('Hồ sơ không tồn tại');
    }

    if (record.recordState === 3 && state !== 3) {
      throw new BadRequestException('Hồ sơ đã lưu trữ, không thể chuyển ngược');
    }

    await this.recordDocumentRepo.update(
      { id: record.category, status: DocumentStatus.NOT_OPEN },
      { status: DocumentStatus.OPENED },
    );

    if (state === 2 && record.category) {
      await this.recordDocumentRepo.update(record.category, {
        status: DocumentStatus.ARCHIVED,
      });
    }

    // LOGIC CHÍNH Ở ĐÂY:
    // Nếu FE gửi endDate lên thì dùng, không thì lấy ngày hiện tại
    const updateData: Partial<ArchiveRecord> = { recordState: state };
    if (body.endDate) {
      updateData.endDate = body.endDate;
    } else {
      updateData.endDate = new Date();
    }
    updateData.expiryDate = ArchiveRecord.calculateExpiryDate(
      updateData.endDate,
      record.retentionPeriod,
    );

    await this.recordRepo
      .createQueryBuilder()
      .update(ArchiveRecord)
      .set(updateData)
      .where('id = :id', { id })
      .execute();

    return {
      success: true,
      message: 'Cập nhật trạng thái hồ sơ thành công',
      recordState: state,
    };
  }

  // Lấy các nút để hiển thị
  async getActionAvailableByUser(userId: string, roleCache?: Map<string, any>) {
    // 1️⃣ Initialize cache & fetch user/flow info
    const cache = roleCache || new Map();

    const userKey = `__user_${userId}`;
    let user = cache.get(userKey);
    if (!user) {
      user = await this.sqlsvRepo.getUserById(userId);
      if (user) cache.set(userKey, user);
    }
    if (!user?.parent?.id) return [];

    const unitId = String(user.parent.id);
    const flowKey = `__flow_${unitId}`;
    let flow = cache.get(flowKey);
    if (!flow) {
      flow = await this.sqlsvRepo.getFlowByUnit(unitId, 'MiningProcess');
      if (flow) cache.set(flowKey, flow);
    }
    if (!flow?.id) return [];

    this.processKey = flow.id;

    // 2️⃣ Get BPMN model
    const bpmnKey = `__bpmn_${flow.id}`;
    let model = cache.get(bpmnKey);
    if (!model) {
      const bpmnXML = await this.sqlRepo.getBpmnFile(flow.id);
      if (!bpmnXML) return [];
      model = await this.runtimeDbService.getModelFromXml(bpmnXML);
      cache.set(bpmnKey, model);
    }
    const { process, indexes } = model;

    // 3️⃣ Resolve roles for THIS user
    const userRolesKey = `__user_roles_${flow.id}_${userId}`;
    let userRoleCodes: string[] = cache.get(userRolesKey);

    if (!userRoleCodes) {
      const userProcessRoles = await this.userService.findProcessRoleInfoByIdActionStart(userId, flow.id);
      userRoleCodes = userProcessRoles.roleCodes || [];
      cache.set(userRolesKey, userRoleCodes);
    }

    if (!userRoleCodes.length) return [];

    // 4️⃣ Find Start Node matching user roles
    const matchedStart = Array.from(indexes.nodes.values()).find((n: any) => {
      if (n.$type !== 'bpmn:StartEvent') return false;
      const role = indexes.laneMap.get(n.id);
      return role && userRoleCodes.includes(role);
    });

    if (!matchedStart) return [];
    const laneRoleCode = indexes.laneMap.get((matchedStart as any).id);

    // Resolve the first interactive node after start event
    let startNode: any = null;
    for (const f of (matchedStart as any).outgoing || []) {
      const r = this.bpmnEngine.nextInteractiveFromFlow(f, indexes);
      if (r?.node) {
        startNode = r.node;
        break;
      }
    }
    if (!startNode) return [];

    const workItem = {
      id: 'preview',
      nodeId: startNode.id,
      assigneeUserId: userId,
      role: laneRoleCode,
      nodeType: startNode.$type,
    };

    // 5️⃣ Compute available actions with cached role-user lookups
    const res = await this.bpmnEngine.computeAvailableActions({
      process,
      indexes,
      currentNodeId: startNode.id,
      workItem,
      document: null,
      userId,
      userRoles: userRoleCodes,
      getUsersByRole: async (r: string) => {
        const key = `__role_users_${r}`;
        if (!cache.has(key)) {
          cache.set(key, await this.sqlsvRepo.getUsersByRoleMongoDB(r));
        }
        return cache.get(key);
      },
      audit: [],
    });

    return {
      availableActions: res.availableActions,
      flowConfig: flow,
      workItem,
    };
  }

  async mapDocKeyArchiveRecord(
    docs: any[],
    aliases: Record<string, string> = {},
    isExport?: string,
  ): Promise<any[]> {
    if (!Array.isArray(docs) || !docs.length) return [];

    const pool = await this.getPool();
    const camelToSnake = (str: string): string =>
      str.replace(/([A-Z])/g, (_, c) => `_${c.toLowerCase()}`);

    const getVal = (obj: any, key: string) => {
      const snake = camelToSnake(key);
      return obj[key] ?? obj[snake];
    };

    const deptIdsOrNames = new Set<string>();
    docs.forEach((item) => {
      const relatedDept = getVal(item, 'relatedDepartment') || getVal(item, 'related_department');
      if (relatedDept) {
        relatedDept.split(',').forEach((d: string) => {
          const trimmed = d.trim();
          if (trimmed) deptIdsOrNames.add(trimmed);
        });
      }
    });

    const deptList = Array.from(deptIdsOrNames);

    const [crmRes, organizationUnits] = await Promise.all([
      pool.request().query(`
        SELECT s.code, d.value, d.title
        FROM ${this.dbname}.crm_sources s
        JOIN ${this.dbname}.crm_source_data d ON s.id = d.source_id
        WHERE s.status = 1 
          AND s.code IN ('S96','S95')
      `),

      deptList.length > 0
        ? pool.request().query(`
            SELECT id, name
            FROM ${this.dbname}.organization_units
            WHERE status = 1 AND (id IN (${deptList.map(d => `'${d.replace(/'/g, "''")}'`).join(',')}) OR name IN (${deptList.map(d => `N'${d.replace(/'/g, "''")}'`).join(',')}))
          `)
        : Promise.resolve({ recordset: [] as any[] }),
    ]);
    const orgUnitMap = organizationUnits.recordset.reduce(
      (map: Record<string, string>, u: any) => {
        map[u.name] = u.id;   // name -> id
        map[u.id] = u.name;   // id -> name
        return map;
      },
      {},
    );
    const retentionMap: Record<string, string> = {};
    const languageMap: Record<string, string> = {};

    crmRes.recordset.forEach((r: any) => {
      if (r.code === 'S96') retentionMap[r.value] = r.title;
      if (r.code === 'S95') languageMap[r.value] = r.title;
    });

    const crmSouceMap = crmRes.recordset.reduce(
      (m: Record<string, string>, r: any) => {
        m[r.value] = r.title;
        return m;
      },
      {},
    );
    const SYSTEM_FIELDS = ['workItem', 'availableActions', 'flags'];

    const mappedDocs = docs.map((item) => {
      const mapped: Record<string, any> = {};

      for (const [sourceKey, targetKey] of Object.entries(aliases)) {
        const val = getVal(item, sourceKey);
        mapped[targetKey] = val ?? '-';
      }

      SYSTEM_FIELDS.forEach((key) => {
        if (item[key] !== undefined) mapped[key] = item[key];
      });

      mapped['retentionPeriod'] = retentionMap[item.retentionPeriod] || retentionMap[item.retention_period] || '-';
      const recordState = getVal(item, 'recordState') || getVal(item, 'record_state');

      mapped.recordState = mapArchiveRecordState(recordState);
      // Latest action_code theo document_id
      if (isExport === 'true') {
        mapped['recordState'] = mapArchiveRecordStateExport(recordState) || '-';
      } else {
        mapped['recordState'] = mapArchiveRecordState(recordState) || '-';
      }
      const lang = getVal(item, 'language');

      mapped.language = languageMap[lang] || lang || '-';
      mapped.startDate = formatDMY(getVal(item, 'startDate'));
      mapped.endDate = formatDMY(getVal(item, 'endDate'));

      const usageMode = getVal(item, 'usageMode') || getVal(item, 'usage_mode');
      const usageModeMap: Record<string, string> = {
        private: 'Hạn chế',
        public: 'Rộng rãi',
      };
      mapped.usageMode = usageModeMap[usageMode] || usageMode || '-';
      mapped.notes = getVal(item, 'notes') || '-';
      const relatedDept = getVal(item, 'relatedDepartment') || getVal(item, 'related_department');
      mapped.isNotDelete = (recordState === 1 || recordState === 0) ? false : true;
      if (relatedDept) {
        const deptNames = relatedDept.split(',').map((d: string) => d.trim());

        mapped.relatedDepartment = deptNames
          .map((name: string) => orgUnitMap[name] || name)
          .join(', ');
      } else {
        mapped.relatedDepartment = '-';
      }
      return mapped;
    });

    return mappedDocs;
  }

  // Xây dựng mảng tiêu chí lọc từ object filter
  private buildCriteria(
    filter: any,
  ): Array<{ name: string; operator: string; value: string | string[] }> {
    const criteria: Array<{
      name: string;
      operator: string;
      value: string | string[];
    }> = [];
    const SKIP_FILTER_KEYS = ['docStart', 'docEnd', 'createdAtStart', 'createdAtEnd', 'fileSizeStart', 'fileSizeEnd', 'startDate', 'endDate'];
    if (filter && typeof filter === 'object') {
      let start = filter.startDate || filter.createdAtStart;
      let end = filter.endDate || filter.createdAtEnd;
      if (start && String(start).length === 10) {
        start = `${start} 00:00:00.000`;
      }
      if (end && String(end).length === 10) {
        end = `${end} 23:59:59.999`;
      }
      if (start) {
        criteria.push({ name: 'startDate', operator: 'gte', value: String(start) });
      }
      if (end) {
        criteria.push({ name: 'endDate', operator: 'lte', value: String(end) });
      }

      Object.entries(filter).forEach(([key, value]) => {
        if (!value) return;
        if (SKIP_FILTER_KEYS.includes(key)) return;

        // Map 'name' to 'title' for ArchiveRecord
        const filterKey = key === 'name' ? 'title' : key;

        if (typeof value === 'object') {
          const val = value as {
            startDate?: string;
            endDate?: string;
            value?: string;
          };
          let nestedStart = val.startDate;
          let nestedEnd = val.endDate;
          if (nestedStart && String(nestedStart).length === 10) {
            nestedStart = `${nestedStart} 00:00:00.000`;
          }
          if (nestedEnd && String(nestedEnd).length === 10) {
            nestedEnd = `${nestedEnd} 23:59:59.999`;
          }

          if (nestedStart && nestedEnd)
            criteria.push({
              name: filterKey,
              operator: 'between',
              value: [String(nestedStart), String(nestedEnd)],
            });
          else if (nestedStart)
            criteria.push({
              name: filterKey,
              operator: 'gte',
              value: String(nestedStart),
            });
          else if (nestedEnd)
            criteria.push({
              name: filterKey,
              operator: 'lte',
              value: String(nestedEnd),
            });
          else if (val.value !== undefined && val.value !== null)
            criteria.push({
              name: filterKey,
              operator: 'like',
              value: String(val.value),
            });
        } else {
          const operator = typeof value === 'string' ? 'like' : 'eq';
          criteria.push({ name: filterKey, operator, value: String(value) });
        }
      });
    }
    return criteria;
  }

  async removeMany(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Danh sách ID trống');
    }
    await this.archiveAccessLogRepo.delete({
      archiveRecordId: In(ids),
    });

    const records = await this.recordRepo.find({
      where: { id: In(ids) },
    });

    if (!records || records.length === 0) {
      throw new NotFoundException('Không tìm thấy bản ghi nào để xóa');
    }

    // Lấy danh sách category (docId) trước khi xóa
    const categoryIds = records.map(r => r.category).filter(Boolean);

    await this.recordRepo.remove(records);

    if (categoryIds.length > 0) {
      const docs = await this.recordDocumentRepo.find({
        where: { id: In(categoryIds) },
        select: ['fileRecordId']
      });
      const fileRecordIds = [...new Set(docs.map(d => d.fileRecordId).filter(Boolean))];
      for (const frId of fileRecordIds) {
        if (frId) {
          await this.recordCatalogService.updateCounts(frId);
        }
      }
    }

    return { success: true, message: 'Xóa thành công các bản ghi đã chọn' };
  }
}
