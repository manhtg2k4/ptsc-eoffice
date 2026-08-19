import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ListBookDocumentsDto,
  UpdateBookDocumentDto,
  CreateBookDocumentDto,
} from './dto/book-documents.dto';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { BookDocumentEntity } from './entities/book-document.entity';
import { FindManyOptions, ILike, In, Not, Repository } from 'typeorm';
import { STATUS } from 'src/variables/CONST_STATUS';
import { GROUP_CODES } from 'src/variable/CONST_STATUS';
import { UserEntity } from '../users/entities/user.entity';
import { ConnectionPool } from 'mssql';
import { DataExportService } from 'src/data-export/data-export.service';
import { ExportType } from 'src/data-export/dtos/data-export.dto';
import { BookDocumentPermissionService } from './book-document-permission.service';
import { GroupUserService } from '../group-users/group-users.service';
import { DocumentNumberReservationEntity, ReservationStatus } from './entities/document-number-reservation.entity';
import { OutgoingDocumentEntity } from '../outgoing-documents/entities/outgoing-document.entity';

const TYPE_DOCUMENT_MAP: Record<string, string> = {
  IncommingDocument: 'Văn bản đến',
  OutGoingDocument: 'Văn bản đi',
};

const ACTIVE_MAP: Record<number, string> = {
  1: 'Hoạt động',
  0: 'Không hoạt động',
};

const TCT_SENDER_UNIT_KEYWORD = 'Tổng Công ty Tân Cảng Sài Gòn';

@Injectable()
export class BookDocumentsService {
  constructor(
    @Inject('MSSQL_POOL')
    private readonly pool: ConnectionPool,
    @Inject('MSSQL_REPO') private readonly repo: MSSQLRepository,
    @InjectRepository(BookDocumentEntity, 'mssqlConnection')
    private readonly bookDocumentRepo: Repository<BookDocumentEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(DocumentNumberReservationEntity, 'mssqlConnection')
    private readonly reservationRepo: Repository<DocumentNumberReservationEntity>,
    @InjectRepository(OutgoingDocumentEntity, 'mssqlConnection')
    private readonly outgoingDocRepo: Repository<OutgoingDocumentEntity>,
    private readonly dataExportService: DataExportService,
    private readonly permissionService: BookDocumentPermissionService,
    private readonly groupUserService: GroupUserService,
  ) { }
  async findAllV2(query: ListBookDocumentsDto, userId: string) {
    try {
      const {
        search,
        page,
        limit,
        sort,
        status,
        year,
        type_document,
        sender_unit,
        active = true,
        isDefault,
        document_field,
        manager_book,
        filter = {},
        isExport,
      } = query as any;

      const isCertifiedCopies = false;
      const currentYear = new Date().getFullYear();

      // ── VanThu / CanBo scope logic ──────────────────────────────
      const userGroupCodes = await this.getUserGroupCodes(userId);
      const isVanThu = userGroupCodes.some((code) =>
        [GROUP_CODES.VAN_THU, GROUP_CODES.VAN_THU_PHONG].includes(code)
      );

      let scopedUserId: string;
      if (isVanThu) {
        scopedUserId = userId;
      } else {
        const vanThuUserId = await this.getVanThuUserIdIfCanBo(userId);
        if (!vanThuUserId) {
          return {
            success: true,
            total: 0,
            page: +(page || '1'),
            data: [],
          };
        }
        scopedUserId = vanThuUserId;
      }

      const finalTypeDocument = type_document;

      const result = await this.repo.listBookDocument({
        search: search || '',
        page: +(page || '1'),
        limit: +(limit || '20'),
        sort: sort || { isDefault: -1 },
        status: status === undefined ? 1 : status,
        year: (year !== undefined && year !== null && year !== '' && String(year).toLowerCase() !== 'all') ? +year : (year === undefined ? currentYear : undefined),
        type_document: finalTypeDocument,
        sender_unit,
        active,
        isDefault,
        isCertifiedCopies,
        filter: {
          ...filter,
          ...(document_field && { document_field }),
          ...(manager_book && { manager_book }),
        },
        userId: scopedUserId,
        isExport,
      });

      return await this.adjustBookDocumentCounts(result);
    } catch (error) {
      console.error('Error fetching book documents:', error);
      throw new Error('Không thể lấy danh sách văn bản. Vui lòng thử lại.');
    }
  }
  async findAll(query: ListBookDocumentsDto, userId: string) {
    try {
      const {
        search,
        page,
        limit,
        sort,
        status,
        year,
        type_document,
        sender_unit,
        active,
        isDefault,
        document_field,
        manager_book,
        scope,
        filter = {},
        isExport,
      } = query as any;

      const scopedSenderUnit = scope === 'tct' ? undefined : sender_unit;

      // ── VanThu / CanBo scope logic ──────────────────────────────
      // Lấy danh sách group codes của user
      const userGroupCodes = await this.getUserGroupCodes(userId);
      const isVanThu = userGroupCodes.some((code) => GROUP_CODES.VAN_THU.includes(code));

      let scopedUserId: string;
      if (isVanThu) {
        // VanThu: chỉ thấy sổ của chính mình
        scopedUserId = userId;
      } else {
        // CanBo / user khác: tìm VanThu cùng phòng ban
        const vanThuUserId = await this.getVanThuUserIdIfCanBo(userId);
        if (!vanThuUserId) {
          // Không có VanThu nào cùng phòng → trả về rỗng
          return {
            success: true,
            total: 0,
            page: +(page || '1'),
            data: [],
          };
        }
        scopedUserId = vanThuUserId;
      }

      const finalTypeDocument = type_document;

      const result = await this.repo.listBookDocument({
        search: search || '',
        page: +(page || '1'),
        limit: +(limit || '20'),
        sort: sort || { isDefault: -1 },
        status: status === undefined ? 1 : status,
        year: (year !== undefined && year !== null && year !== '' && String(year).toLowerCase() !== 'all') ? +year : undefined,
        type_document: finalTypeDocument,
        sender_unit: scopedSenderUnit,
        active,
        isDefault,
        scope,
        filter: {
          ...filter,
          ...(document_field && { document_field }),
          ...(manager_book && { manager_book }),
        },
        userId: scopedUserId,
        isExport,
      });

      return await this.adjustBookDocumentCounts(result);
    } catch (error) {
      console.error('Error fetching book documents:', error);
      throw new Error('Không thể lấy danh sách văn bản. Vui lòng thử lại.');
    }
  }

  /**
   * Tự động điều chỉnh `count` của sổ văn bản khi lấy danh sách:
   * Nếu các số tiếp theo đã được giữ (RESERVED/USED) hoặc đã phát hành văn bản đi,
   * tự động bỏ qua các số đó để gợi ý/cấp phát số mới không bị trùng.
   */
  private async adjustBookDocumentCounts(result: any) {
    const items = result?.data || result?.items;
    if (!result || !Array.isArray(items) || items.length === 0) {
      return result;
    }

    await Promise.all(
      items.map(async (item: any) => {
        const bookDocId = item.book_document_id || item.bookDocumentId || item.id;
        if (!bookDocId) return;

        const currentCount = item.count ? Number(item.count) : 0;
        let nextSuggestedNumber = currentCount;
        let isTaken = true;

        while (isTaken) {
          const existingReservation = await this.reservationRepo.findOne({
            where: {
              bookDocumentId: Number(bookDocId),
              reservedNumber: nextSuggestedNumber,
              status: In([ReservationStatus.RESERVED, ReservationStatus.USED]),
            },
          });

          const existingOutgoing = await this.outgoingDocRepo.findOne({
            where: [
              { bookDocumentId: Number(bookDocId), toBook: nextSuggestedNumber },
              { bookDocumentId: Number(bookDocId), releaseNo: String(nextSuggestedNumber) },
            ],
          });

          if (existingReservation || existingOutgoing) {
            nextSuggestedNumber++;
          } else {
            isTaken = false;
          }
        }

        item.count = nextSuggestedNumber;
      }),
    );

    return result;
  }
  async generateToBookCode(bookDocumentId: string): Promise<string | null> {
    if (!bookDocumentId) return null;
    try {
      return await this.repo.generateToBookCode(bookDocumentId);
    } catch (error) {
      console.error('Error generating toBookCode for', bookDocumentId, error);
      return null;
    }
  }
  async create(createBookDocumentDto: CreateBookDocumentDto, userId: string) {
    // ❌ Không cho client gửi ID
    const { book_document_id, ...rest } = createBookDocumentDto as any;

    // 1️⃣ Các field bắt buộc
    const requiredFields = ['name', 'year'];

    const missingFields = requiredFields.filter((field) => {
      const value = rest[field];

      // null | undefined
      if (value === undefined || value === null) return true;

      // string nhưng rỗng hoặc chỉ có khoảng trắng
      if (typeof value === 'string' && value.trim() === '') return true;

      return false;
    });

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Thiếu hoặc rỗng trường bắt buộc khi tạo mới: ${missingFields.join(', ')}`,
      );
    }

    // 1.5️⃣ Xử lý isDefault (Chỉ 1 sổ được mặc định trong 1 năm cho 1 loại văn bản)
    if (this.isTrue(rest.isDefault)) {
      await this.handleIsDefaultConstraint(rest.year, rest.type_document, undefined, this.isTrue(rest.isCertifiedCopies));
    }

    // 1.6️⃣ Xử lý isCertifiedCopies (Mỗi năm chỉ có tối đa 1 sổ sao y)
    if (this.isTrue(rest.isCertifiedCopies)) {
      const existingCertifiedBook = await this.bookDocumentRepo.findOne({
        where: {
          year: rest.year,
          isCertifiedCopies: true,
          status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED]),
        },
      });

      if (existingCertifiedBook) {
        throw new BadRequestException(`Năm ${rest.year} đã có sổ sao y rồi.`);
      }
    }

    // 2️⃣ Tạo entity
    const newBook = this.bookDocumentRepo.create({
      ...rest,
      createdBy: userId,
    });

    // 3️⃣ Lưu DB
    return this.bookDocumentRepo.save(newBook);
  }

  async findOne(userId: string, id: number, skipViewPermissionCheck = false): Promise<any> {
    const book = await this.bookDocumentRepo.findOne({
      where: {
        book_document_id: id,
        status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED]),
      },
    });

    if (!book) {
      throw new NotFoundException(`Sổ văn bản với ID "${id}" không tồn tại.`);
    }

    if (!skipViewPermissionCheck) {
      try {
        await this.repo.assertCanViewDetail(userId, id, 'BookDocument');
      } catch (error) {
        const permissionResult = await this.permissionService.checkPermission(
          userId,
          book.type_document || '',
        );
        if (!permissionResult.allowed) {
          throw error;
        }
      }
    }

    const bookObject = { ...book };

    // 1. Map manager_book (user ids)
    if (book.manager_book && book.manager_book.length > 0) {
      const users = await this.userRepo.find({
        where: { id: In(book.manager_book) },
        select: ['id', 'name'],
      });
      bookObject.manager_book = users.map((u: any) => ({
        id: u.id,
        name: u.name,
      })) as any;
    }

    // 2. Map document_field (crm source values)
    if (book.document_field && book.document_field.length > 0) {
      // Sử dụng repo để truy vấn trực tiếp vào DB
      const pool = this.repo.getPool();
      let crmData: any[] = [];
      try {
        // Lấy source_id từ crm_sources, sau đó lấy data từ crm_source_data
        const sourceResult = await pool
          .request()
          .input('code', 'S26') // Bạn có thể thay đổi mã này nếu cần
          .query('SELECT id FROM crm_sources WHERE code = @code');

        const sourceId = sourceResult.recordset[0]?.id;

        if (sourceId) {
          const dataResult = await pool
            .request()
            .input('sourceId', sourceId)
            .query(
              'SELECT value, title FROM crm_source_data WHERE source_id = @sourceId',
            );
          crmData = dataResult.recordset;
        }
      } catch (sqlError) {
        console.error(`[SQL ERROR] Không thể truy vấn crm_sources:`, sqlError);
      }

      if (crmData.length > 0) {
        const sourceMap = new Map(
          crmData.map((item: any) => [item.value, item.title]),
        );
        bookObject.document_field = book.document_field.map((fieldValue) => ({
          value: fieldValue,
          name: sourceMap.get(fieldValue) || fieldValue,
        })) as any;
      } else {
        // Fallback if crmsource not found
        bookObject.document_field = book.document_field.map((fieldValue) => ({
          id: fieldValue,
          name: fieldValue,
        })) as any;
      }
    }
    /** MAP TYPE DOCUMENT → STRING */
    if (bookObject.type_document) {
      bookObject.type_document =
        TYPE_DOCUMENT_MAP[bookObject.type_document] || bookObject.type_document;
    }

    /** MAP ACTIVE → STRING */
    if (bookObject.active !== undefined && bookObject.active !== null) {
      (bookObject.active as any) =
        ACTIVE_MAP[bookObject.active as any] ?? 'Không xác định';
    }
    return bookObject;
  }

  async checkBookDocumentAccess(userId: string, bookDocumentId: number): Promise<boolean> {
    const pool = await this.repo.getPool();
    // Get the current database name from the connection
    const dbResult = await pool.request().query('SELECT DB_NAME() as dbname');
    const dbname = dbResult.recordset[0]?.dbname;

    const result = await pool.request()
      .input('bookDocumentId', bookDocumentId)
      .input('userId', userId)
      .query(`
        SELECT TOP 1 1
        FROM ${dbname}.dbo.book_documents b WITH (NOLOCK)
        WHERE b.book_document_id = @bookDocumentId
          AND b.status IN (1, 2)
          AND (b.created_by = @userId
               OR EXISTS (SELECT 1 FROM STRING_SPLIT(b.manager_book, ',') s
                          WHERE LTRIM(RTRIM(s.value)) = @userId))
      `);

    return result.recordset.length > 0;
  }

  async update(id: number, updateBookDocumentDto: UpdateBookDocumentDto) {
    // ❌ Không cho client gửi ID
    const { book_document_id, ...safeDto } = updateBookDocumentDto as any;

    // 1️⃣ Không cho update rỗng
    if (!safeDto || Object.keys(safeDto).length === 0) {
      throw new BadRequestException('Dữ liệu cập nhật không được để trống.');
    }

    // 2️⃣ Validate các field bắt buộc (không null, không rỗng)
    const requiredFields = ['name', 'year'];

    const invalidFields = requiredFields.filter((field) => {
      const value = safeDto[field];

      // null | undefined
      if (value === undefined || value === null) return true;

      // string rỗng hoặc chỉ có khoảng trắng
      if (typeof value === 'string' && value.trim() === '') return true;

      return false;
    });

    if (invalidFields.length > 0) {
      throw new BadRequestException(
        `Thiếu hoặc rỗng trường bắt buộc khi cập nhật: ${invalidFields.join(', ')}`,
      );
    }

    // 2.5️⃣ Xử lý isDefault (Chỉ 1 sổ được mặc định trong 1 năm cho 1 loại văn bản)
    if (this.isTrue(safeDto.isDefault)) {
      const existing = await this.bookDocumentRepo.findOneBy({ book_document_id: Number(id) });
      if (existing) {
        const year = safeDto.year || existing.year;
        const type = safeDto.type_document || existing.type_document;
        const isCertified = safeDto.isCertifiedCopies !== undefined ? this.isTrue(safeDto.isCertifiedCopies) : existing.isCertifiedCopies;
        await this.handleIsDefaultConstraint(year, type, Number(id), isCertified);
      }
    }

    // 2.6️⃣ Xử lý isCertifiedCopies (Mỗi năm chỉ có tối đa 1 sổ sao y)
    if (this.isTrue(safeDto.isCertifiedCopies)) {
      const existing = await this.bookDocumentRepo.findOneBy({ book_document_id: Number(id) });
      if (existing) {
        const year = safeDto.year || existing.year;
        const existingCertifiedBook = await this.bookDocumentRepo.findOne({
          where: {
            year,
            isCertifiedCopies: true,
            status: In([STATUS.ACTIVED, STATUS.NOT_ACTIVED]),
            book_document_id: Not(Number(id)),
          },
        });

        if (existingCertifiedBook) {
          throw new BadRequestException(`Năm ${year} đã có sổ sao y rồi.`);
        }
      }
    }

    // 3️⃣ Thực hiện update
    const result = await this.bookDocumentRepo.update(
      { book_document_id: Number(id) },
      safeDto,
    );

    // 4️⃣ Không tìm thấy bản ghi
    if (result.affected === 0) {
      throw new NotFoundException(`Sổ văn bản với ID "${id}" không tồn tại.`);
    }

    // 5️⃣ Trả về dữ liệu mới nhất
    return this.bookDocumentRepo.findOneBy({
      book_document_id: Number(id),
    });
  }

  async remove(userId: string, id: number) {
    await this.findOne(userId, id); // Check if exists
    const result = await this.bookDocumentRepo.update(id, {
      status: STATUS.DELETED,
    });
    if (result.affected === 0) {
      throw new NotFoundException(`Không thể xóa sổ văn bản với ID "${id}".`);
    }
    return { message: 'Xóa sổ văn bản thành công.', id };
  }

  async removeMany(ids: number[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Cần cung cấp danh sách ID để xóa.');
    }

    /* =========================
     * 1️⃣ KIỂM TRA TỒN TẠI
     * ========================= */
    const existed = await this.bookDocumentRepo.find({
      where: { book_document_id: In(ids) },
      select: ['book_document_id', 'status'],
    });

    if (!existed || existed.length === 0) {
      throw new NotFoundException(
        'Không tìm thấy sổ văn bản nào với danh sách ID đã cung cấp.',
      );
    }

    // Chỉ lấy những bản ghi CHƯA bị xoá
    const activeIds = existed
      .filter((item) => item.status !== STATUS.DELETED)
      .map((item) => item.book_document_id);

    if (activeIds.length === 0) {
      throw new BadRequestException(
        'Các sổ văn bản đã bị xoá hoặc không còn tồn tại.',
      );
    }

    const idsStr = activeIds.join(',');

    /* =========================
     * 2️⃣ CHECK INCOMING DOCUMENTS
     * ========================= */
    const incomingResult = await this.pool.request().query<{ total: number }>(`
    SELECT COUNT(1) AS total
    FROM incomming_documents
    WHERE book_document_id IN (${idsStr})
      AND status <> ${STATUS.DELETED}
  `);

    if ((incomingResult.recordset[0]?.total ?? 0) > 0) {
      throw new BadRequestException(
        'Không thể xóa sổ văn bản vì đang có văn bản đến sử dụng sổ này.',
      );
    }

    /* =========================
     * 3️⃣ CHECK OUTGOING DOCUMENTS
     * ========================= */
    const outgoingResult = await this.pool.request().query<{ total: number }>(`
    SELECT COUNT(1) AS total
    FROM outgoing_documents
    WHERE book_document_id IN (${idsStr})
      AND status <> ${STATUS.DELETED}
  `);

    if ((outgoingResult.recordset[0]?.total ?? 0) > 0) {
      throw new BadRequestException(
        'Không thể xóa sổ văn bản vì đang có văn bản đi sử dụng sổ này.',
      );
    }

    /* =========================
     * 4️⃣ XOÁ MỀM
     * ========================= */
    const result = await this.bookDocumentRepo.update(
      { book_document_id: In(activeIds) },
      { status: STATUS.DELETED },
    );

    if (!result.affected || result.affected === 0) {
      throw new NotFoundException('Không có sổ văn bản nào được xóa.');
    }

    return {
      message: `Đã xóa thành công ${result.affected} sổ văn bản.`,
    };
  }

  async findIncommingDocuments(
    id: string,
    page: number = 1,
    limit: number = 20,
    filters: Record<string, any> = {},
    sort: string = 'created_at DESC',
    userId?: string,
  ) {
    page = Number(page);
    limit = Number(limit);

    if (!Number.isInteger(page) || page <= 0) {
      throw new BadRequestException('page phải là số nguyên dương');
    }

    if (!Number.isInteger(limit) || limit <= 0) {
      throw new BadRequestException('limit phải là số nguyên dương');
    }
    return this.repo.listIncommingDocumentsByBookId(
      id,
      page,
      limit,
      filters,
      sort,
      userId,
    );
  }

  async findOutgoingDocuments(
    id: string,
    page: number = 1,
    limit: number = 20,
    filters: Record<string, any> = {},
    sort: string = 'created_at DESC',
    userId?: string,
  ) {
    page = Number(page);
    limit = Number(limit);

    if (!Number.isInteger(page) || page <= 0) {
      throw new BadRequestException('page phải là số nguyên dương');
    }

    if (!Number.isInteger(limit) || limit <= 0) {
      throw new BadRequestException('limit phải là số nguyên dương');
    }
    return this.repo.listOutgoingDocumentsByBookId(
      id,
      page,
      limit,
      filters,
      sort,
      userId,
    );
  }

  async exportIncommingDocuments(id: string, query: any, userId?: string) {
    const { page, limit, sort, exportType, ...filters } = query;
    // Lấy dữ liệu (limit lớn để lấy hết)
    const result = await this.repo.listIncommingDocumentsByBookId(
      id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 1000,
      filters,
      sort || 'created_at DESC',
      userId,
    );

    const data = result.items || [];

    // Lấy danh sách file đính kèm
    let filesMap: Record<string, any[]> = {};
    try {
      const documentIds = data.map((item) => item.documentId || item.document_id).filter(Boolean);
      if (documentIds.length > 0 && (this.repo as any).getFilesByDocumentIds) {
        filesMap = await (this.repo as any).getFilesByDocumentIds(documentIds);
      }
    } catch (error) {
      console.warn('Cannot fetch files for export:', error);
    }

    const exportColumns = [
      { header: 'Tệp đính kèm', key: 'attachments', width: 30, type: 'string' },
      { header: 'Số văn bản đến', key: 'bookDocumentId', width: 20, type: 'string' },
      { header: 'Ngày văn bản', key: 'document_date', width: 15, type: 'date' },
      { header: 'Trích yếu', key: 'abstract_note', width: 40, type: 'string' },
      { header: 'Cơ quan gửi', key: 'senderUnit', width: 25, type: 'string' },
      { header: 'Số đến', key: 'toBook', width: 15, type: 'string' },
      { header: 'Trạng thái', key: 'status_name', width: 20, type: 'string' },
    ];

    const exportData = data.map((item: any) => {
      const files = filesMap[item.documentId || item.document_id] || [];
      const fileNames = files.map((f: any) => f.fileName || f.name).join(', ');

      const statusRaw = item.statusCode || item.status_code || item.status;
      const cleanStatus = statusRaw
        ? String(statusRaw)
          .replace(/<[^>]+>/g, '')
          .replace(/&[a-z0-9]+;/ig, ' ')
          .replace(/[\u200B-\u200D\uFEFF]/g, '')
          .trim()
        : '';

      return {
        ...item,
        attachments: fileNames || '',
        status_name: cleanStatus,
      };
    });

    const type = exportType === 'pdf' ? ExportType.PDF : ExportType.EXCEL;
    return this.dataExportService.export(
      exportData,
      exportColumns,
      'Danh sách văn bản đến',
      type,
      userId || 'system'
    );
  }

  async exportOutgoingDocuments(id: string, query: any, userId?: string) {
    const { page, limit, sort, exportType, ...filters } = query;
    // Lấy dữ liệu (limit lớn để lấy hết)
    const result = await this.repo.listOutgoingDocumentsByBookId(
      id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 1000,
      filters,
      sort || 'created_at DESC',
      userId,
    );

    const data = result.items || [];

    // Lấy danh sách file đính kèm
    let filesMap: Record<string, any[]> = {};
    try {
      const documentIds = data.map((item) => item.documentId || item.document_id).filter(Boolean);
      if (documentIds.length > 0 && (this.repo as any).getFilesByDocumentIds) {
        filesMap = await (this.repo as any).getFilesByDocumentIds(documentIds);
      }
    } catch (error) {
      console.warn('Cannot fetch files for export:', error);
    }

    const exportColumns = [
      { header: 'Số, ký hiệu văn bản', key: 'release_no', width: 30, type: 'string' },
      { header: 'Trích yếu', key: 'abstract_note', width: 40, type: 'string' },
      { header: 'Loại văn bản', key: 'document_type', width: 20, type: 'string' },
      { header: 'Độ khẩn', key: 'urgency_level', width: 15, type: 'string' },
      { header: 'File đính kèm', key: 'files', width: 25, type: 'string' },
      { header: 'Người ký phát hành', key: 'report_signer', width: 15, type: 'string' },
      { header: 'Ngày soạn thảo', key: 'created_at', width: 15, type: 'date' },
      { header: 'Người soạn thảo', key: 'drafter', width: 15, type: 'string' },
      { header: 'Trạng thái', key: 'status_name', width: 20, type: 'string' },
    ];

    const exportData = data.map((item: any) => {
      const filesInfo = filesMap[item.documentId || item.document_id] || [];
      const fileNames = filesInfo.map((f: any) => f.fileName || f.name).join(', ');

      const statusRaw = item.statusCode || item.status_code || item.status;
      const cleanStatus = statusRaw
        ? String(statusRaw)
          .replace(/<[^>]+>/g, '')
          .replace(/&[a-z0-9]+;/ig, ' ')
          .replace(/[\u200B-\u200D\uFEFF]/g, '')
          .trim()
        : '';

      return {
        ...item,
        release_no: item.release_no ?? item.releaseNo ?? item.to_book_code ?? item.toBookCode ?? '',
        abstract_note: item.abstract_note ?? item.abstractNote ?? '',
        document_type: item.document_type ?? item.documentType ?? '',
        urgency_level: item.urgency_level ?? item.urgencyLevel ?? '',
        report_signer: item.report_signer ?? item.reportSigner ?? '',
        drafter: item.drafter ?? '',
        created_at: item.created_at ?? item.createdAt ?? '',
        files: fileNames || '',
        status_name: cleanStatus,
      };
    });

    const type = exportType === 'pdf' ? ExportType.PDF : ExportType.EXCEL;
    return this.dataExportService.export(
      exportData,
      exportColumns,
      'Danh sách văn bản đi',
      type,
      userId || 'system'
    );
  }

  private async handleIsDefaultConstraint(year: number, type_document: string, excludeId?: number, isCertifiedCopies?: boolean) {
    if (!year || !type_document) return;
    try {
      const query = this.bookDocumentRepo
        .createQueryBuilder()
        .update(BookDocumentEntity)
        .set({ isDefault: false })
        .where('year = :year', { year: Number(year) })
        .andWhere('type_document = :type_document', { type_document: type_document.trim() })
        .andWhere('isCertifiedCopies = :isCertifiedCopies', { isCertifiedCopies: !!isCertifiedCopies })
        .andWhere('status <> :deletedStatus', { deletedStatus: STATUS.DELETED });

      if (excludeId) {
        query.andWhere('book_document_id <> :excludeId', { excludeId: Number(excludeId) });
      }

      const result = await query.execute();
    } catch (error) {
      console.error('Error in handleIsDefaultConstraint:', error);
    }
  }

  private async getUserGroupCodes(userId: string): Promise<string[]> {
    const vanThuCodes = [GROUP_CODES.VAN_THU, GROUP_CODES.VAN_THU_PHONG];

    for (const code of vanThuCodes) {
      try {
        const groups = await this.groupUserService.findByCode(code);
        const users = groups?.data?.users || [];
        const vanThuUserIds = users.map((u: any) => u.id);
        if (vanThuUserIds.includes(userId)) {
          return [code];
        }
      } catch {}
    }

    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['groupUsers'],
        select: ['id'],
      });
      const codes = (user?.groupUsers || []).map((g: any) => g.code).filter(Boolean);
      return codes;
    } catch {
      return [];
    }
  }

  private async getVanThuUserIdIfCanBo(userId: string): Promise<string | null> {
    let userDeptId: string | null = null;
    try {
      const currentUser = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['parent'],
        select: ['id'],
      });
      userDeptId = currentUser?.parent?.id?.toString() || null;
    } catch {
      return null;
    }
    if (!userDeptId) return null;

    const vanThuCodes = [GROUP_CODES.VAN_THU, GROUP_CODES.VAN_THU_PHONG];

    for (const code of vanThuCodes) {
      try {
        const vanThuGroup = await this.groupUserService.findByCode(code);
        const vanThuUsers = (vanThuGroup?.data?.users || []) as any[];
        if (vanThuUsers.length === 0) continue;

        for (const vt of vanThuUsers) {
          const vtDeptId = vt?.parent?.id?.toString() || vt?.parent?.toString() || null;
          if (vtDeptId && vtDeptId === userDeptId) {
            return vt.id?.toString() || null;
          }
        }
      } catch {}
    }
    return null;
  }

  private isTrue(value: any): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }
}
