import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { StorageBatchEntity } from './entities/storage-batch.entity';
import { SourceStorageEntity } from './entities/source-storage.entity';
import { Audit } from '../database/schema-sql/audit.entity';
import { CreateStorageBatchDto, CreateSourceStorageDto } from './dto/create-profile-storage.dto';
import { UpdateStorageBatchDto, UpdateSourceStorageDto } from './dto/update-profile-storage.dto';
import { ListStorageBatchDto } from './dto/list-storage-batch.dto';
import { QueryParams } from '../interfaces';
import { ActionProfileStorageDto } from './dto/action-profile-storage.dto';
import { ConfigService } from '@nestjs/config';
import { ConnectionPool } from 'mssql';

// Map trạng thái (status_code) sang text hiển thị cho FE
// Hỗ trợ cả số, tiếng Anh và tiếng Việt
function mapStatusText(code?: string | number | null) {
  if (!code) return 'Chưa trình';
  const c = String(code).trim();
  
  // Kiểm tra tiếng Việt trước
  if (c === 'Chưa trình' || c === 'CHƯA TRÌNH') return 'Chưa trình';
  if (c === 'Chờ phê duyệt' || c === 'CHỜ PHÊ DUYỆT') return 'Chờ phê duyệt';
  if (c === 'Đã phê duyệt' || c === 'ĐÃ PHÊ DUYỆT') return 'Đã phê duyệt';
  if (c === 'Trả lại' || c === 'TRẢ LẠI') return 'Trả lại';
  
  // Kiểm tra số và tiếng Anh
  switch (c.toUpperCase()) {
    case '1':
    case 'DRAFT':
    case 'PENDING':
      return 'Chưa trình';
    case '2':
    case 'SUBMITTED':
      return 'Chờ phê duyệt';
    case '3':
    case 'APPROVED':
      return 'Đã phê duyệt';
    case '4':
    case 'REJECTED':
      return 'Trả lại';
    default:
      return 'Chưa trình';
  }
}

// Format date thành DD/MM/YYYY (ngày/tháng/năm, không có giờ phút giây)
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

// Parse JSON string thành mảng file (khi đọc từ DB)
function parseAttachmentFiles(attachmentFile: string | null | undefined): string[] | null {
  if (!attachmentFile) return null;
  try {
    const parsed = JSON.parse(attachmentFile);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    // Nếu không phải JSON, có thể là string đơn (backward compatibility)
    return attachmentFile ? [attachmentFile] : null;
  }
}

// Convert mảng file thành JSON string (khi lưu vào DB)
// Hỗ trợ cả string và object {name: "..."}
function stringifyAttachmentFiles(files: (string | { name?: string; [key: string]: any })[] | null | undefined): string | null {
  if (!files || files.length === 0) return null;
  try {
    // Extract name từ object hoặc dùng string trực tiếp
    const fileNames = files.map(file => {
      if (typeof file === 'string') {
        return file;
      } else if (file && typeof file === 'object' && file.name) {
        return file.name;
      } else {
        return String(file);
      }
    }).filter(name => name); // Loại bỏ giá trị null/undefined/empty
    
    return fileNames.length > 0 ? JSON.stringify(fileNames) : null;
  } catch {
    return null;
  }
}

// Kiểm tra trùng lặp textSymbol và title trong mảng sources
// KHÔNG check trùng trong cùng 1 đợt lưu trữ nữa
// Chỉ check trùng giữa các đợt lưu trữ khác nhau (sẽ check ở DB level)
function validateDuplicateSources(sources: Array<{ textSymbol?: string; title?: string }>, sourcePrefix: string = 'sources'): Array<{ field: string; message: string }> {
  // Không check trùng trong cùng 1 đợt lưu trữ nữa
  // Việc check trùng giữa các đợt lưu trữ sẽ được thực hiện khi query DB
  return [];
}

// Kiểm tra trùng lặp textSymbol và title với các đợt lưu trữ KHÁC
// existingSources: danh sách sources từ các đợt lưu trữ khác (không bao gồm đợt hiện tại)
// newSources: danh sách sources mới cần kiểm tra
async function validateDuplicateAcrossBatches(
  existingSources: Array<{ textSymbol?: string | null; title?: string | null }>,
  newSources: Array<{ textSymbol?: string; title?: string }>,
  sourcePrefix: string = 'sources'
): Promise<Array<{ field: string; message: string }>> {
  const errors: Array<{ field: string; message: string }> = [];
  
  if (!newSources || newSources.length === 0) return errors;
  if (!existingSources || existingSources.length === 0) return errors;
  
  // Tạo Set các giá trị đã tồn tại (lowercase)
  const existingTextSymbols = new Set<string>();
  const existingTitles = new Set<string>();
  
  existingSources.forEach(source => {
    if (source.textSymbol?.trim()) {
      existingTextSymbols.add(source.textSymbol.trim().toLowerCase());
    }
    if (source.title?.trim()) {
      existingTitles.add(source.title.trim().toLowerCase());
    }
  });
  
  // Kiểm tra từng source mới
  newSources.forEach((source, index) => {
    const textSymbol = source.textSymbol?.trim();
    const title = source.title?.trim();
    
    // Check textSymbol trùng với textSymbol của đợt khác
    if (textSymbol && existingTextSymbols.has(textSymbol.toLowerCase())) {
      errors.push({
        field: `${sourcePrefix}[${index}].textSymbol`,
        message: `Số và ký hiệu hồ sơ "${textSymbol}" đã tồn tại trong đợt lưu trữ khác`,
      });
    }
    
    // Check textSymbol trùng với title của đợt khác
    if (textSymbol && existingTitles.has(textSymbol.toLowerCase())) {
      errors.push({
        field: `${sourcePrefix}[${index}].textSymbol`,
        message: `Số và ký hiệu hồ sơ "${textSymbol}" đã bị trùng với tiêu đề hồ sơ của đợt lưu trữ khác`,
      });
    }
    
    // Check title trùng với title của đợt khác
    if (title && existingTitles.has(title.toLowerCase())) {
      errors.push({
        field: `${sourcePrefix}[${index}].title`,
        message: `Tiêu đề hồ sơ "${title}" đã tồn tại trong đợt lưu trữ khác`,
      });
    }
    
    // Check title trùng với textSymbol của đợt khác
    if (title && existingTextSymbols.has(title.toLowerCase())) {
      errors.push({
        field: `${sourcePrefix}[${index}].title`,
        message: `Tiêu đề hồ sơ "${title}" đã bị trùng với số và ký hiệu hồ sơ của đợt lưu trữ khác`,
      });
    }
  });
  
  return errors;
}

@Injectable()
export class ProfileStorageService {
  private pool: ConnectionPool;
  private dbname: string;
  constructor(
    @Inject('MSSQL_POOL')
    private readonly injectedPool: ConnectionPool,
    @InjectRepository(StorageBatchEntity, 'mssqlConnection')
    private readonly batchRepo: Repository<StorageBatchEntity>,
    @InjectRepository(SourceStorageEntity, 'mssqlConnection')
    private readonly sourceRepo: Repository<SourceStorageEntity>,
    @InjectRepository(Audit, 'mssqlConnection')
    private readonly auditRepo: Repository<Audit>,
    @InjectDataSource('mssqlConnection')
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.pool = this.injectedPool;
    this.dbname = this.configService.get<string>('SQLSERVER_DATABASE')|| '';
  }

  /**
   * Tạo mới đợt lưu trữ kèm danh mục hồ sơ cần lưu trữ (1 request)
   * @param dto DTO chứa thông tin đợt lưu trữ và danh mục hồ sơ
   * @param userId ID của user đăng nhập (tự động lấy từ request)
   */
  async createBatchWithSources(dto: CreateStorageBatchDto, userId?: string | number | null) {
    try {

      return await this.dataSource.transaction(async (manager) => {
        // Validate ngày: start <= end nếu cả hai có
        if (dto.storageStartDate && dto.storageEndDate) {
          const start = new Date(dto.storageStartDate);
          const end = new Date(dto.storageEndDate);
          if (start > end) {
            throw new BadRequestException({
              success: false,
              message: 'Ngày bắt đầu không được lớn hơn ngày kết thúc',
              errors: [
                {
                  field: 'storageStartDate',
                  message: 'Ngày bắt đầu không được lớn hơn ngày kết thúc',
                },
              ],
            });
          }
        }

        // Kiểm tra code đã tồn tại chưa
        const existingBatch = await manager.findOne(StorageBatchEntity, {
          where: { code: dto.code, status: 1 },
        });
        if (existingBatch) {
        throw new BadRequestException({
          success: false,
            message: 'Mã đợt lưu trữ đã tồn tại',
            errors: [
              {
                field: 'code',
                message: 'Mã đợt lưu trữ đã tồn tại trong hệ thống',
              },
            ],
          });
        }

        // Lấy userId từ tham số hoặc từ DTO, ưu tiên userId từ request
        const finalUserId = userId ? String(userId) : (dto.createdBy ?? null);
        
        // Batch có thể không có createdBy (theo doc là nullable)
        // Nhưng sources phải có createdBy (theo doc là NOT NULL)
        
        // Validate: Kiểm tra sources có createdBy không
        if (dto.sources && dto.sources.length > 0) {
          const sourcesWithoutCreatedBy = dto.sources.filter((s) => !s.createdBy);
          if (sourcesWithoutCreatedBy.length > 0 && !finalUserId) {
            throw new BadRequestException({
              success: false,
              message: 'Không thể xác định người tạo cho hồ sơ',
              errors: [
                {
                  field: 'sources',
                  message: 'Vui lòng đăng nhập hoặc cung cấp createdBy cho từng hồ sơ trong sources',
                },
              ],
            });
          }
          
          // Kiểm tra trùng lặp textSymbol và title trong mảng sources (trong cùng đợt - đã bỏ)
          const duplicateErrors = validateDuplicateSources(dto.sources, 'sources');
          if (duplicateErrors.length > 0) {
            throw new BadRequestException({
              success: false,
              message: 'Danh mục hồ sơ có dữ liệu trùng lặp',
              errors: duplicateErrors,
            });
          }
          
          // Kiểm tra trùng lặp với các đợt lưu trữ KHÁC
          const allExistingSources = await manager.find(SourceStorageEntity, {
            where: { status: 1 },
            select: ['textSymbol', 'title'],
          });
          const crossBatchErrors = await validateDuplicateAcrossBatches(allExistingSources, dto.sources, 'sources');
          if (crossBatchErrors.length > 0) {
            throw new BadRequestException({
              success: false,
              message: 'Danh mục hồ sơ bị trùng với đợt lưu trữ khác',
              errors: crossBatchErrors,
            });
          }
        }

        // Tạo đợt lưu trữ (createdBy có thể null)
        const batch = manager.create(StorageBatchEntity, {
          name: dto.name,
          code: dto.code,
          scope: dto.scope,
          storageStartDate: dto.storageStartDate ? new Date(dto.storageStartDate) : null,
          storageEndDate: dto.storageEndDate ? new Date(dto.storageEndDate) : null,
          createReason: dto.createReason ?? null,
          // Lưu mảng file dưới dạng JSON string
          attachmentFile: stringifyAttachmentFiles(dto.attachmentFile),
          note: dto.note ?? null,
          statusCode: dto.statusCode ?? null,
          status: 1, // 1: hoạt động
          createdBy: finalUserId, // Có thể null nếu không đăng nhập
        });
        const savedBatch = await manager.save(StorageBatchEntity, batch);

        // Tạo danh mục hồ sơ cần lưu trữ (createdBy là bắt buộc)
        const sourcesPayload: SourceStorageEntity[] = (dto.sources || []).map((s: CreateSourceStorageDto) => {
          const sourceCreatedBy = s.createdBy || finalUserId;
          if (!sourceCreatedBy) {
        throw new BadRequestException({
          success: false,
              message: 'Không thể xác định người tạo cho hồ sơ',
              errors: [
                {
                  field: `sources[${dto.sources.indexOf(s)}].createdBy`,
                  message: 'Người tạo hồ sơ không được để trống. Vui lòng đăng nhập hoặc cung cấp createdBy',
                },
              ],
            });
          }
          
          return manager.create(SourceStorageEntity, {
            textSymbol: s.textSymbol,
            title: s.title,
            type: s.type,
            storageBatchId: savedBatch.id,
            status: s.status ?? 1,
            createdBy: sourceCreatedBy, // Bắt buộc phải có
          });
        });

        const savedSources = await manager.save(SourceStorageEntity, sourcesPayload);



        // Format datetime fields và parse attachmentFile
        const formattedBatch = {
          ...savedBatch,
          storageStartDate: formatDateOnly(savedBatch.storageStartDate),
          storageEndDate: formatDateOnly(savedBatch.storageEndDate),
          createdAt: formatDateOnly(savedBatch.createdAt),
          updatedAt: formatDateOnly(savedBatch.updatedAt),
          attachmentFile: parseAttachmentFiles(savedBatch.attachmentFile),
        };

        const formattedSources = savedSources.map(s => ({
          ...s,
          createdAt: formatDateOnly(s.createdAt),
          updatedAt: formatDateOnly(s.updatedAt),
        }));

        return {
          success: true,
          message: 'Tạo mới đợt lưu trữ thành công',
          data: {
            ...savedBatch,
            sources: savedSources,
          },
        };
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Xử lý lỗi database/validation chi tiết
      let errorDetails: any[] = [];
      let errorMessage = 'Tạo mới đợt lưu trữ thất bại';
      
      if (error.message) {
        const errorMsg = error.message.toLowerCase();
        
        // Lỗi duplicate code (mã đợt lưu trữ đã tồn tại)
        if (errorMsg.includes('duplicate key') || errorMsg.includes('unique') || errorMsg.includes('violation of unique key')) {
          // Tìm xem lỗi ở field nào
          if (errorMsg.includes('code') || errorMsg.includes('storage_batch_documents.code')) {
            errorDetails.push({
              field: 'code',
              message: 'Mã đợt lưu trữ đã tồn tại. Vui lòng sử dụng mã khác',
            });
            errorMessage = 'Dữ liệu không hợp lệ: Mã đợt lưu trữ đã tồn tại';
          } else if (errorMsg.includes('text_symbol') || errorMsg.includes('source_storage_documents.text_symbol')) {
            errorDetails.push({
              field: 'sources',
              message: 'Số và ký hiệu hồ sơ đã tồn tại trong đợt lưu trữ này',
            });
            errorMessage = 'Dữ liệu không hợp lệ: Số và ký hiệu hồ sơ đã tồn tại';
          } else {
            errorDetails.push({
              field: 'code',
              message: 'Dữ liệu trùng lặp. Vui lòng kiểm tra lại',
            });
            errorMessage = 'Dữ liệu không hợp lệ: Dữ liệu trùng lặp';
          }
        }
        // Lỗi foreign key (khóa ngoại không hợp lệ)
        else if (errorMsg.includes('foreign key') || errorMsg.includes('fk_') || errorMsg.includes('reference constraint')) {
          if (errorMsg.includes('storage_batch_id') || errorMsg.includes('storagebatchid')) {
            errorDetails.push({
              field: 'storageBatchId',
              message: 'Đợt lưu trữ không tồn tại',
            });
            errorMessage = 'Dữ liệu không hợp lệ: Đợt lưu trữ không tồn tại';
          } else {
            errorDetails.push({
              field: 'general',
              message: 'Dữ liệu tham chiếu không hợp lệ',
            });
            errorMessage = 'Dữ liệu không hợp lệ: Dữ liệu tham chiếu không tồn tại';
          }
        }
        // Lỗi ngày tháng không hợp lệ
        else if (errorMsg.includes('invalid date') || errorMsg.includes('date') || errorMsg.includes('datetime')) {
          if (errorMsg.includes('storage_start_date') || errorMsg.includes('storagestartdate')) {
            errorDetails.push({
              field: 'storageStartDate',
              message: 'Ngày bắt đầu không hợp lệ. Vui lòng kiểm tra định dạng (YYYY-MM-DD)',
            });
            errorMessage = 'Dữ liệu không hợp lệ: Ngày bắt đầu không đúng định dạng';
          } else if (errorMsg.includes('storage_end_date') || errorMsg.includes('storageenddate')) {
            errorDetails.push({
              field: 'storageEndDate',
              message: 'Ngày kết thúc không hợp lệ. Vui lòng kiểm tra định dạng (YYYY-MM-DD)',
            });
            errorMessage = 'Dữ liệu không hợp lệ: Ngày kết thúc không đúng định dạng';
          } else {
            errorDetails.push({
              field: 'storageStartDate',
              message: 'Ngày không hợp lệ. Vui lòng kiểm tra định dạng (YYYY-MM-DD)',
            });
            errorMessage = 'Dữ liệu không hợp lệ: Ngày không đúng định dạng';
          }
        }
        // Lỗi NOT NULL constraint
        else if (errorMsg.includes('cannot insert null') || errorMsg.includes('not null') || errorMsg.includes('required')) {
          if (errorMsg.includes('name')) {
            errorDetails.push({
              field: 'name',
              message: 'Tên đợt lưu trữ không được để trống',
            });
            errorMessage = 'Dữ liệu không hợp lệ: Tên đợt lưu trữ là bắt buộc';
          } else if (errorMsg.includes('code')) {
            errorDetails.push({
              field: 'code',
              message: 'Mã đợt lưu trữ không được để trống',
            });
            errorMessage = 'Dữ liệu không hợp lệ: Mã đợt lưu trữ là bắt buộc';
          } else if (errorMsg.includes('scope')) {
            errorDetails.push({
              field: 'scope',
              message: 'Phạm vi đợt lưu trữ không được để trống',
            });
            errorMessage = 'Dữ liệu không hợp lệ: Phạm vi đợt lưu trữ là bắt buộc';
          } else if (errorMsg.includes('text_symbol') || errorMsg.includes('textsymbol')) {
            errorDetails.push({
              field: 'sources',
              message: 'Số và ký hiệu hồ sơ không được để trống',
            });
            errorMessage = 'Dữ liệu không hợp lệ: Số và ký hiệu hồ sơ là bắt buộc';
          } else if (errorMsg.includes('title')) {
            errorDetails.push({
              field: 'sources',
              message: 'Tiêu đề hồ sơ không được để trống',
            });
            errorMessage = 'Dữ liệu không hợp lệ: Tiêu đề hồ sơ là bắt buộc';
          } else if (errorMsg.includes('type')) {
            errorDetails.push({
              field: 'sources',
              message: 'Loại hồ sơ không được để trống',
            });
            errorMessage = 'Dữ liệu không hợp lệ: Loại hồ sơ là bắt buộc';
          } else if (errorMsg.includes('created_by') || errorMsg.includes('createdby')) {
            if (errorMsg.includes('source_storage') || errorMsg.includes('source_storage_documents')) {
            errorDetails.push({
              field: 'sources',
              message: 'Người tạo hồ sơ không được để trống. Vui lòng đăng nhập hoặc cung cấp createdBy',
            });
            errorMessage = 'Dữ liệu không hợp lệ: Người tạo hồ sơ là bắt buộc';
          } else {
            errorDetails.push({
                field: 'createdBy',
                message: 'Người tạo không được để trống. Vui lòng đăng nhập hoặc cung cấp createdBy',
              });
              errorMessage = 'Dữ liệu không hợp lệ: Người tạo là bắt buộc';
            }
          } else if (errorMsg.includes('storage_start_date') || errorMsg.includes('storagestartdate')) {
            errorDetails.push({
              field: 'sources',
              message: 'Người tạo hồ sơ không được để trống. Vui lòng đăng nhập hoặc cung cấp createdBy',
            });
            errorMessage = 'Dữ liệu không hợp lệ: Người tạo hồ sơ là bắt buộc';
          } else {
            errorDetails.push({
              field: 'general',
              message: `Trường bắt buộc bị thiếu: ${error.message}`,
            });
            errorMessage = 'Dữ liệu không hợp lệ: Có trường bắt buộc bị thiếu';
          }
        }
        // Lỗi độ dài vượt quá
        else if (errorMsg.includes('string or binary data would be truncated') || errorMsg.includes('too long') || errorMsg.includes('exceeds')) {
          // Parse field name từ error message
          let fieldName = 'general';
          if (errorMsg.includes('name') || errorMsg.includes('storage_batch_documents.name')) {
            fieldName = 'name';
          } else if (errorMsg.includes('code') || errorMsg.includes('storage_batch_documents.code')) {
            fieldName = 'code';
          } else if (errorMsg.includes('scope') || errorMsg.includes('storage_batch_documents.scope')) {
            fieldName = 'scope';
          } else if (errorMsg.includes('text_symbol') || errorMsg.includes('textsymbol') || errorMsg.includes('source_storage_documents.text_symbol')) {
            fieldName = 'sources';
          } else if (errorMsg.includes('title') || errorMsg.includes('source_storage_documents.title')) {
            fieldName = 'sources';
          } else if (errorMsg.includes('type') || errorMsg.includes('source_storage_documents.type')) {
            fieldName = 'sources';
          } else if (errorMsg.includes('create_reason') || errorMsg.includes('createreason')) {
            fieldName = 'createReason';
          } else if (errorMsg.includes('note') || errorMsg.includes('storage_batch_documents.note')) {
            fieldName = 'note';
          } else if (errorMsg.includes('attachment_file') || errorMsg.includes('attachmentfile')) {
            fieldName = 'attachmentFile';
          } else if (errorMsg.includes('created_by') || errorMsg.includes('createdby')) {
            fieldName = 'createdBy';
          }
          
          const fieldMessages: Record<string, string> = {
            name: 'Tên đợt lưu trữ vượt quá độ dài cho phép (tối đa 255 ký tự)',
            code: 'Mã đợt lưu trữ vượt quá độ dài cho phép (tối đa 255 ký tự)',
            scope: 'Phạm vi đợt lưu trữ vượt quá độ dài cho phép (tối đa 100 ký tự)',
            sources: 'Một trong các trường của danh mục hồ sơ vượt quá độ dài cho phép',
            createReason: 'Lý do/căn cứ vượt quá độ dài cho phép (tối đa 255 ký tự)',
            note: 'Ghi chú vượt quá độ dài cho phép (tối đa 255 ký tự)',
            attachmentFile: 'File đính kèm không hợp lệ',
            createdBy: 'Người tạo vượt quá độ dài cho phép (tối đa 100 ký tự)',
            general: 'Dữ liệu quá dài. Vui lòng kiểm tra độ dài các trường',
          };
          
          errorDetails.push({
            field: 'general',
            message: 'Dữ liệu quá dài. Vui lòng kiểm tra độ dài các trường',
          });
          errorMessage = 'Dữ liệu không hợp lệ: Dữ liệu vượt quá độ dài cho phép';
        }
        // Lỗi khác - trả về message gốc
        else {
          errorDetails.push({
            field: 'general',
            message: error.message,
          });
          errorMessage = `Lỗi: ${error.message}`;
        }
      }
      
      throw new BadRequestException({
        success: false,
        message: errorMessage,
        errors: errorDetails.length > 0 ? errorDetails : [
          {
            field: 'general',
            message: 'Có lỗi xảy ra khi tạo mới đợt lưu trữ',
          },
        ],
      });
    }
  }

  /**
   * Lấy danh sách đợt lưu trữ với phân trang và filter (format chung)
   */
  async findAll(query: ListStorageBatchDto) {
    try {
      const {
        page = '1',
        limit = '25',
        sort,
        filter,
      } = query;

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 25, 1);
      const skip = (pageNum - 1) * limitNum;

      const qb = this.batchRepo.createQueryBuilder('batch');

      // Trạng thái: mặc định lấy tất cả trạng thái khác 0 (kể cả null)
      const statusFilter = filter?.status;
      if (statusFilter === undefined || statusFilter === null) {
        qb.where('(batch.status IS NULL OR batch.status <> 0)');
      } else {
        qb.where('batch.status = :status', { status: statusFilter });
      }

      // Map field names (camelCase -> entity property names)
      const fieldMap: Record<string, string> = {
        name: 'name',
        code: 'code',
        scope: 'scope',
        storageStartDate: 'storageStartDate',
        storageEndDate: 'storageEndDate',
        createReason: 'createReason',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        statusCode: 'statusCode',
        status: 'status',
        createdBy: 'createdBy',
        note: 'note',
      };

      // Xử lý filter object
      if (filter && typeof filter === 'object') {
        Object.entries(filter).forEach(([key, value]) => {
          if (!value || key === 'status') return; // status đã xử lý ở trên

          // Map key sang entity property name
          const fieldName = fieldMap[key] || key;
          const paramKey = key.replace(/([A-Z])/g, '_$1').toLowerCase(); // camelCase -> snake_case cho param

          // Date range filter
          if (typeof value === 'object' && (value.startDate || value.endDate)) {
            const val = value as { startDate?: string; endDate?: string };
            if (val.startDate && val.endDate) {
              qb.andWhere(`batch.${fieldName} >= :${paramKey}Start AND batch.${fieldName} < DATEADD(DAY, 1, :${paramKey}End)`, {
                [`${paramKey}Start`]: val.startDate,
                [`${paramKey}End`]: val.endDate,
              });
            } else if (val.startDate) {
              qb.andWhere(`batch.${fieldName} >= :${paramKey}Start`, {
                [`${paramKey}Start`]: val.startDate,
              });
            } else if (val.endDate) {
              qb.andWhere(`batch.${fieldName} < DATEADD(DAY, 1, :${paramKey}End)`, {
                [`${paramKey}End`]: val.endDate,
              });
            }
            return;
      }

          // Object với value property (text search) - giống màn tiếp nhận
          if (typeof value === 'object' && value.value !== undefined && value.value !== null) {
            const val = value as { value?: string };
            if (val.value && typeof val.value === 'string' && val.value.trim()) {
              qb.andWhere(`batch.${fieldName} LIKE :${paramKey}`, { [paramKey]: `%${val.value.trim()}%` });
            }
            return;
      }

          // String value - mặc định LIKE (giống màn tiếp nhận)
          // Nhưng statusCode luôn dùng exact match
          if (typeof value === 'string' && value.trim()) {
            if (fieldName === 'statusCode') {
              // statusCode luôn exact match
              qb.andWhere(`batch.${fieldName} = :${paramKey}`, { [paramKey]: value.trim() });
            } else {
              // Các field khác dùng LIKE
              qb.andWhere(`batch.${fieldName} LIKE :${paramKey}`, { [paramKey]: `%${value.trim()}%` });
            }
            return;
      }

          // Number hoặc boolean - exact match
          if (typeof value === 'number' || typeof value === 'boolean') {
            qb.andWhere(`batch.${fieldName} = :${paramKey}`, { [paramKey]: value });
            return;
          }

          // Các giá trị khác - exact match (fallback)
          if (fieldName === 'statusCode' || fieldName === 'status') {
            qb.andWhere(`batch.${fieldName} = :${paramKey}`, { [paramKey]: String(value) });
          }
        });
      }

      // Sort - hỗ trợ object format: {"fieldName": 1} hoặc {"fieldName": -1}
      const sortMap: Record<string, string> = {
        name: 'batch.name',
        code: 'batch.code',
        scope: 'batch.scope',
        storageStartDate: 'batch.storageStartDate',
        storageEndDate: 'batch.storageEndDate',
        statusCode: 'batch.statusCode',
        createdAt: 'batch.createdAt',
        updatedAt: 'batch.updatedAt',
        createReason: 'batch.createReason',
      };

      let sortField = 'batch.createdAt';
      let sortOrder: 'ASC' | 'DESC' = 'DESC';

      if (sort) {
        if (typeof sort === 'object' && !Array.isArray(sort)) {
          const keys = Object.keys(sort);
          if (keys.length > 0) {
            const field = keys[0];
            const dir = sort[field];
            sortField = sortMap[field] || sortField;
            sortOrder = (dir === 1 || dir === '1' || String(dir).toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
          }
        } else if (typeof sort === 'string' && sort.trim()) {
          // Hỗ trợ format cũ: "-createdAt" hoặc "name,ASC"
          const sortStr = sort.trim();
          if (sortStr.startsWith('-')) {
            const field = sortStr.substring(1);
          sortField = sortMap[field] || sortField;
          sortOrder = 'DESC';
          } else if (sortStr.includes(',')) {
            const [field, order] = sortStr.split(',');
          sortField = sortMap[field] || sortField;
          sortOrder = order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        } else {
            sortField = sortMap[sortStr] || sortField;
          sortOrder = 'ASC';
          }
        }
      }

      qb.orderBy(sortField, sortOrder).skip(skip).take(limitNum);

      const [batches, totalRecords] = await qb.getManyAndCount();
      const totalPages = Math.ceil(totalRecords / limitNum);

      // Lấy đầy đủ thông tin chi tiết cho mỗi batch
      const batchIds = batches.map(b => String(b.id));

      const filesMap = await this.getFilesByArchiveStorageIds(batchIds);
      // Query tất cả sources cho tất cả batch IDs cùng lúc (tối ưu performance)
      const allSources = batchIds.length > 0 
        ? await this.sourceRepo.find({
            where: { 
              storageBatchId: In(batchIds),
              status: 1 
            },
            order: { createdAt: 'DESC' },
          })
        : [];

      // Query tất cả histories cho tất cả batch IDs cùng lúc (tối ưu performance)
      const allAuditRecords = batchIds.length > 0
        ? await this.auditRepo.find({
            where: {
              documentId: In(batchIds.map(id => String(id))),
              typeDocument: 'StorageBatch',
            },
            order: { createdAt: 'DESC' },
          })
        : [];

      // Map sources và histories theo batch ID
      const sourcesMap = new Map<number, SourceStorageEntity[]>();
      const historiesMap = new Map<number, any[]>();

      // Group sources by batchId
      allSources.forEach(source => {
        const batchId = source.storageBatchId;
        if (!sourcesMap.has(batchId)) {
          sourcesMap.set(batchId, []);
        }
        sourcesMap.get(batchId)!.push(source);
      });

      // Group histories by batchId và map sang format hiển thị
      const actionNameMap: { [key: string]: string } = {
        'SUBMIT': 'Trình phê duyệt',
        'APPROVE': 'Phê duyệt',
        'REJECT': 'Trả lại',
        'EDIT': 'Chỉnh sửa',
        'DELETE': 'Xóa',
        'CREATE': 'Tạo mới',
      };

      allAuditRecords.forEach(audit => {
        const batchIdStr = audit.documentId; // documentId vốn là string

        if (batchIdStr && batchIds.includes(batchIdStr)) {
          const batchIdNum = parseInt(batchIdStr, 10);

          if (!historiesMap.has(batchIdNum)) {
            historiesMap.set(batchIdNum, []);
          }

          const histories = historiesMap.get(batchIdNum)!;

          histories.push({
            stt: histories.length + 1,
            id: audit.id,
            storageBatchId: batchIdNum,
            action: audit.actionCode,
            actionName:
              actionNameMap[audit.actionCode?.toUpperCase() || ''] ||
              audit.actionCode ||
              'Khác',
            statusCode: audit.stageStatus,
            comment: audit.action,
            actedBy: audit.userId || audit.createdBy,
            processor: audit.displayName || audit.processedBy || audit.actingAs || audit.userId || audit.createdBy || 'Hệ thống',
            actedAt: formatDateOnly(audit.createdAt || audit.time),
            createdAt: formatDateOnly(audit.createdAt || audit.time),
          });
        }
      });


      // Map batches với đầy đủ thông tin chi tiết
      // const data = batches.map(batch => {
      //   const sources = sourcesMap.get(batch.id) || [];
      //   const histories = historiesMap.get(batch.id) || [];
      //   const availableActions = this.getAvailableActions(batch.statusCode);

      //   console.log(`📦 [GET LIST] Batch ID ${batch.id}:`, {
      //     name: batch.name,
      //     code: batch.code,
      //     statusCode: batch.statusCode,
      //     sourcesCount: sources.length,
      //     historiesCount: histories.length,
      //     availableActions,
      //   });

      //   return {
      //     batch,
      //     availableActions,
      //   };
      // });
      const data = batches.map(batch => {
        const availableActions = this.getAvailableActions(batch.statusCode);
        const attachmentFiles = filesMap[String(batch.id)] || [];
        return {
          id: batch.id,
          name: batch.name,
          code: batch.code,
          scope: batch.scope,
          storageStartDate: formatDateOnly(batch.storageStartDate),
          storageEndDate: formatDateOnly(batch.storageEndDate),
          createReason: batch.createReason,
          note: batch.note,
          attachmentFile: attachmentFiles,
          statusCode: batch.statusCode,
          status: batch.status,
          createdBy: batch.createdBy,
          createdAt: formatDateOnly(batch.createdAt),
          updatedAt: formatDateOnly(batch.updatedAt),
          availableActions,
        };
      });
    

      return {
        items: data,
        total: totalRecords,
        page: pageNum,
        limit: limitNum,
        totalPages,
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: 'Lỗi khi lấy danh sách đợt lưu trữ',
        error: error,
      });
    }
  }

  /**
   * Lấy chi tiết đợt lưu trữ theo ID (kèm danh sách hồ sơ)
   */
  async findOne(id: number) {
    try {
      
      const batch = await this.batchRepo
        .createQueryBuilder('batch')
        .where('batch.id = :id', { id })
        .andWhere('(batch.status IS NULL OR batch.status <> 0)')
        .getOne();

      if (!batch) {
        console.error(`❌ [GET DETAIL] Không tìm thấy đợt lưu trữ với ID: ${id}`);
      throw new NotFoundException({
        success: false,
          message: 'Không tìm thấy đợt lưu trữ',
          errors: [
            {
              field: 'id',
              message: `Không tìm thấy đợt lưu trữ với ID: ${id}`,
            },
          ],
        });
      }
      const filesMap = await this.getFilesByArchiveStorageIds([String(id)]);
      const attachmentFiles = filesMap[String(id)] || [];


      // Lấy danh sách hồ sơ liên quan
      const sources = await this.sourceRepo.find({
        where: { storageBatchId: id, status: 1 },
        order: { createdAt: 'DESC' },
      });

      // Lịch sử xử lý từ bảng audit
      let histories: any[] = [];
      try {
        const auditRecords = await this.auditRepo.find({
      where: {
            documentId: String(id),
            typeDocument: 'StorageBatch',
          },
          order: { createdAt: 'DESC' },
        });
        
        // Map từ Audit sang format hiển thị cho bảng "THÔNG TIN XỬ LÝ"
        histories = auditRecords.map((audit, index) => {
          // Map actionCode sang tên hành động tiếng Việt
          const actionNameMap: { [key: string]: string } = {
            'SUBMIT': 'Trình phê duyệt',
            'APPROVE': 'Phê duyệt',
            'REJECT': 'Trả lại',
            'EDIT': 'Chỉnh sửa',
            'DELETE': 'Xóa',
            'CREATE': 'Tạo mới',
          };
          
          return {
            stt: index + 1, // Số thứ tự
            id: audit.id,
            storageBatchId: audit.documentId ? parseInt(audit.documentId, 10) : 0,
            action: audit.actionCode, // submit, approve, reject, edit, delete (tiếng Anh)
            actionName: actionNameMap[audit.actionCode?.toUpperCase() || ''] || audit.actionCode || 'Khác', // Tên hành động tiếng Việt
            statusCode: audit.stageStatus,
            comment: audit.action, // Ý kiến xử lý (VARCHAR 255)
            actedBy: audit.userId || audit.createdBy, // ID người xử lý
            processor: audit.displayName || audit.processedBy || audit.actingAs || audit.userId || audit.createdBy || 'Hệ thống', // Tên người xử lý (hiển thị)
            actedAt: formatDateOnly(audit.createdAt), // Ngày ý kiến (DD/MM/YYYY)
            createdAt: formatDateOnly(audit.createdAt), // Alias cho actedAt
          };
        });
      } catch (e) {
        histories = [];
      }

      const availableActions = this.getAvailableActions(batch.statusCode);


      return {
        id: batch.id,
        name: batch.name,
        code: batch.code,
        scope: batch.scope,
        storageStartDate: formatDateOnly(batch.storageStartDate),
        storageEndDate: formatDateOnly(batch.storageEndDate),
        createReason: batch.createReason,
        attachmentFile: attachmentFiles,
        note: batch.note,
        statusCode: batch.statusCode,
        statusCodeText: mapStatusText(batch.statusCode),
        status: batch.status,
        createdBy: batch.createdBy,
        createdAt: formatDateOnly(batch.createdAt),
        updatedAt: formatDateOnly(batch.updatedAt),
        availableActions,
        sources,
        histories
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: 'Lỗi khi lấy chi tiết đợt lưu trữ',
        error: error.message,
      });
    }
  }

  async getFilesByArchiveStorageIds(
    batchIds: string[],
  ): Promise<Record<string, any[]>> {
    if (!batchIds || batchIds.length === 0) return {};

    const request = this.pool.request();

    const docPlaceholders = batchIds
      .map((id, i) => {
        request.input(`docId${i}`, id);
        return `@docId${i}`;
      })
      .join(',');

    request.input('objectType', 'archivestorage');

    const sql = `
      SELECT
        fr.object_id       AS documentId,
        f.id               AS fileId,
        f.file_name        AS fileName,
        f.file_size        AS fileSize,
        f.mime_type        AS mimeType,
        f.file_path        AS filePath,
        f.is_directory     AS isDirectory,
        f.parent_id        AS parentId,
        f.created_at       AS createdAt,
        f.created_by       AS createdBy
      FROM ${this.dbname}.dbo.file_relations fr
      JOIN ${this.dbname}.dbo.files f ON fr.file_id = f.id
      WHERE fr.object_id IN (${docPlaceholders})
        AND fr.object_type = @objectType
        AND f.status = 1
      ORDER BY f.created_at
    `;

    const result = await request.query(sql);

    const filesMap: Record<string, any[]> = {};
    for (const row of result.recordset) {
      if (!filesMap[row.documentId]) {
        filesMap[row.documentId] = [];
      }
      filesMap[row.documentId].push(row);
    }

    return filesMap;
  }



  /**
   * Cập nhật đợt lưu trữ và danh mục hồ sơ
   */
  async update(id: number, dto: UpdateStorageBatchDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Kiểm tra đợt lưu trữ có tồn tại không
        const existingBatch = await manager
          .createQueryBuilder(StorageBatchEntity, 'batch')
          .where('batch.id = :id', { id })
          .andWhere('(batch.status IS NULL OR batch.status <> 0)')
          .getOne();

        if (!existingBatch) {
          throw new NotFoundException({
            success: false,
            message: 'Không tìm thấy đợt lưu trữ',
            errors: [
              {
                field: 'id',
                message: `Không tìm thấy đợt lưu trữ với ID: ${id}`,
              },
            ],
          });
        }

        // Validate ngày nếu có cập nhật
        if (dto.storageStartDate && dto.storageEndDate) {
          const start = new Date(dto.storageStartDate);
          const end = new Date(dto.storageEndDate);
          if (start > end) {
            throw new BadRequestException({
              success: false,
              message: 'Ngày bắt đầu không được lớn hơn ngày kết thúc',
              errors: [
                {
                  field: 'storageStartDate',
                  message: 'Ngày bắt đầu không được lớn hơn ngày kết thúc',
                },
              ],
            });
          }
        }

        // Kiểm tra code trùng (nếu có cập nhật code)
        if (dto.code && dto.code !== existingBatch.code) {
          const codeExists = await manager
            .createQueryBuilder(StorageBatchEntity, 'batch')
            .where('batch.code = :code', { code: dto.code })
            .andWhere('(batch.status IS NULL OR batch.status <> 0)')
            .getOne();
          if (codeExists) {
            throw new BadRequestException({
              success: false,
              message: 'Mã đợt lưu trữ đã tồn tại',
              errors: [
                {
                  field: 'code',
                  message: 'Mã đợt lưu trữ đã tồn tại trong hệ thống',
                },
              ],
            });
          }
        }

        // Cập nhật đợt lưu trữ
        const updateData: Partial<StorageBatchEntity> = {};
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.code !== undefined) updateData.code = dto.code;
        if (dto.scope !== undefined) updateData.scope = dto.scope;
        if (dto.storageStartDate !== undefined) updateData.storageStartDate = new Date(dto.storageStartDate);
        if (dto.storageEndDate !== undefined) updateData.storageEndDate = new Date(dto.storageEndDate);
        if (dto.createReason !== undefined) updateData.createReason = dto.createReason;
        if (dto.attachmentFile !== undefined) updateData.attachmentFile = stringifyAttachmentFiles(dto.attachmentFile);
        if (dto.note !== undefined) updateData.note = dto.note;
        if (dto.statusCode !== undefined) updateData.statusCode = dto.statusCode;
        if (dto.createdBy !== undefined) updateData.createdBy = dto.createdBy;

        await manager.update(StorageBatchEntity, { id }, updateData);
        const updatedBatch = await manager.findOne(StorageBatchEntity, { where: { id } });

        // Cập nhật danh mục hồ sơ nếu có
        if (dto.sources && Array.isArray(dto.sources) && dto.sources.length > 0) {
          // Xóa các hồ sơ cũ (soft delete)
          await manager.update(SourceStorageEntity, { storageBatchId: id }, { status: 0 });

          // Tạo mới các hồ sơ
          const sourcesPayload: SourceStorageEntity[] = dto.sources.map((s: UpdateSourceStorageDto) =>
            manager.create(SourceStorageEntity, {
              textSymbol: s.textSymbol || '',
              title: s.title || '',
              type: s.type || '',
              storageBatchId: id,
              status: s.status ?? 1,
              createdBy: s.createdBy || existingBatch.createdBy || 'system', // Fallback nếu cả hai đều null
            }),
          );

          await manager.save(SourceStorageEntity, sourcesPayload);
        }

        // Lấy lại danh sách hồ sơ sau khi cập nhật
        const sources = await manager.find(SourceStorageEntity, {
          where: { storageBatchId: id, status: 1 },
          order: { createdAt: 'DESC' },
        });

        const availableActions = this.getAvailableActions(updatedBatch?.statusCode);

        await this.tryLogHistory(
          manager,
          id,
          'edit',
          dto.createdBy ?? existingBatch.createdBy ?? 'system',
          dto.note ?? undefined,
        );

        return {
          success: true,
          message: 'Cập nhật đợt lưu trữ thành công',
          data: {
            id: updatedBatch?.id,
            name: updatedBatch?.name,
            code: updatedBatch?.code,
            scope: updatedBatch?.scope,
            storageStartDate: formatDateOnly(updatedBatch?.storageStartDate),
            storageEndDate: formatDateOnly(updatedBatch?.storageEndDate),
            createReason: updatedBatch?.createReason,
            attachmentFile: parseAttachmentFiles(updatedBatch?.attachmentFile),
            note: updatedBatch?.note,
            statusCode: updatedBatch?.statusCode,
            statusCodeText: mapStatusText(updatedBatch?.statusCode),
            status: updatedBatch?.status,
            createdBy: updatedBatch?.createdBy,
            createdAt: formatDateOnly(updatedBatch?.createdAt),
            updatedAt: formatDateOnly(updatedBatch?.updatedAt),
            availableActions,
            sources,
          },
        };
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: 'Cập nhật đợt lưu trữ thất bại',
        error: error.message,
      });
    }
  }

  /**
   * Xóa đợt lưu trữ (soft delete)
   */
  async delete(id: number) {
    try {
      
      // Tìm batch không filter status để debug
      const batchWithoutFilter = await this.batchRepo.findOne({ where: { id } });

      const batch = await this.batchRepo
        .createQueryBuilder('batch')
        .where('batch.id = :id', { id })
        .andWhere('(batch.status IS NULL OR batch.status <> 0)')
        .getOne();


      if (!batch) {
        console.error(`❌ [DELETE] Không tìm thấy đợt lưu trữ với ID: ${id}. Batch có thể đã bị xóa (status = 0) hoặc không tồn tại.`);
        throw new NotFoundException({
          success: false,
          message: 'Không tìm thấy đợt lưu trữ',
          errors: [
            {
              field: 'id',
              message: `Không tìm thấy đợt lưu trữ với ID: ${id}. Batch có thể đã bị xóa (status = 0) hoặc không tồn tại.`,
            },
          ],
        });
      }

      // Kiểm tra trạng thái cho phép xóa
      const allowedStatusForDelete = ['DRAFT', 'PENDING', 'RETURNED', ''];
      const statusCode = (batch.statusCode || '').toUpperCase();
      
      if (!allowedStatusForDelete.includes(statusCode)) {
        const currentStatusText = mapStatusText(batch.statusCode);
        throw new BadRequestException({
          success: false,
          message: 'Không thể xóa đợt lưu trữ',
          errors: [
            {
              field: 'statusCode',
              message: `Chỉ có thể xóa đợt lưu trữ ở trạng thái "Chưa trình" hoặc "Trả lại". Trạng thái hiện tại: "${currentStatusText}"`,
            },
          ],
        });
      }
      
      // Soft delete: cập nhật status = 0
      await this.batchRepo.update({ id }, { status: 0 });

      // Soft delete các hồ sơ liên quan
      const sourceUpdateResult = await this.sourceRepo.update({ storageBatchId: id }, { status: 0 });

      const result = {
        success: true,
        message: 'Xóa đợt lưu trữ thành công',
      };
      await this.tryLogHistory(this.dataSource.manager, id, 'delete', batch.createdBy || 'system', 'Soft delete batch');
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: 'Xóa đợt lưu trữ thất bại',
        error: error.message,
      });
    }
  }

  /**
   * Xóa nhiều đợt lưu trữ (soft delete)
   */
  async deleteMany(ids: number[]) {
    try {
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new BadRequestException({
          success: false,
          message: 'Danh sách ID không hợp lệ',
          errors: [
            {
              field: 'ids',
              message: 'Danh sách ID không được để trống',
            },
          ],
        });
      }

      // Kiểm tra các ID có tồn tại không
      const batches = await this.batchRepo
        .createQueryBuilder('batch')
        .where('batch.id IN (:...ids)', { ids })
        .andWhere('(batch.status IS NULL OR batch.status <> 0)')
        .getMany();

      if (batches.length === 0) {
        throw new NotFoundException({
          success: false,
          message: 'Không tìm thấy đợt lưu trữ nào để xóa',
          errors: [
            {
              field: 'ids',
              message: 'Không tìm thấy đợt lưu trữ nào với các ID đã cung cấp',
            },
          ],
        });
      }

      const foundIds = batches.map((b) => b.id);

      // Soft delete các đợt lưu trữ
      await this.batchRepo.update({ id: In(foundIds) }, { status: 0 });

      // Soft delete các hồ sơ liên quan
      await this.sourceRepo.update({ storageBatchId: In(foundIds) }, { status: 0 });

      // Log lịch sử (best-effort)
      for (const b of batches) {
        await this.tryLogHistory(this.dataSource.manager, b.id, 'delete', b.createdBy || 'system', 'Soft delete batch (bulk)');
      }

      return {
        success: true,
        message: `Đã xóa ${foundIds.length} đợt lưu trữ thành công`,
        deletedCount: foundIds.length,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: 'Xóa đợt lưu trữ thất bại',
        error: error.message,
      });
    }
  }

  // ====== Workflow actions ======
  async submit(id: number, dto: ActionProfileStorageDto) {
    return this.changeStatus(id, 'SUBMITTED', 'submit', dto);
  }

  async approve(id: number, dto: ActionProfileStorageDto) {
    return this.changeStatus(id, 'APPROVED', 'approve', dto);
  }

  async reject(id: number, dto: ActionProfileStorageDto) {
    return this.changeStatus(id, 'REJECTED', 'reject', dto);
  }

  private async changeStatus(
    id: number,
    newStatusCode: string,
    action: 'submit' | 'approve' | 'reject',
    dto: ActionProfileStorageDto,
  ) {
    try {

      
      const transactionResult = await this.dataSource.transaction(async (manager) => {
        // Kiểm tra xem record có tồn tại không (kể cả khi status = 0)
        const batchExists = await manager.findOne(StorageBatchEntity, { 
          where: { id },
          select: ['id', 'status', 'name', 'statusCode'],
        });
        


        // Nếu record không tồn tại
        if (!batchExists) {
          console.error(`❌ [${action.toUpperCase()}] Không tìm thấy đợt lưu trữ với ID: ${id} (record không tồn tại trong database)`);
          throw new NotFoundException({
            success: false,
            message: 'Không tìm thấy đợt lưu trữ',
            errors: [
              {
                field: 'id',
                message: `Không tìm thấy đợt lưu trữ với ID: ${id}`,
              },
            ],
          });
        }

        // Nếu record đã bị soft delete (status = 0)
        if (batchExists.status === 0) {
          console.error(`❌ [${action.toUpperCase()}] Đợt lưu trữ với ID: ${id} đã bị xóa (status = 0)`);
          throw new NotFoundException({
            success: false,
            message: 'Đợt lưu trữ đã bị xóa',
            errors: [
              {
                field: 'id',
                message: `Đợt lưu trữ với ID: ${id} đã bị xóa`,
              },
            ],
          });
        }

        // Lấy đầy đủ thông tin batch
        const batch = await manager
          .createQueryBuilder(StorageBatchEntity, 'batch')
          .where('batch.id = :id', { id })
          .andWhere('(batch.status IS NULL OR batch.status <> 0)')
          .getOne();


        if (!batch) {
          console.error(`❌ [${action.toUpperCase()}] Không tìm thấy đợt lưu trữ với ID: ${id} (có thể do filter status)`);
          throw new NotFoundException({
            success: false,
            message: 'Không tìm thấy đợt lưu trữ',
            errors: [
              {
                field: 'id',
                message: `Không tìm thấy đợt lưu trữ với ID: ${id}`,
              },
            ],
          });
        }

        await manager.update(StorageBatchEntity, { id }, { statusCode: newStatusCode });

        await this.tryLogHistory(
          manager,
          id,
          action,
          dto.actedBy || batch.createdBy || 'system',
          dto.comment,
          newStatusCode,
        );

        // Lấy dữ liệu sau khi transaction commit
        const refreshed = await manager.findOne(StorageBatchEntity, { where: { id } });
        const sources = await manager.find(SourceStorageEntity, {
          where: { storageBatchId: id, status: 1 },
          order: { createdAt: 'DESC' },
        });
        
        // Trả về dữ liệu cơ bản, histories sẽ lấy sau khi transaction commit
        return {
          batch: refreshed,
          sources,
          newStatusCode,
        };
      });

      // Sau khi transaction commit, lấy histories (tránh timeout do lock)
      // Thêm delay nhỏ để đảm bảo audit record đã được commit
      await new Promise(resolve => setTimeout(resolve, 100));
      const histories = await this.safeGetHistories(id);

      // Format batch datetime fields và parse attachmentFile
      const formattedBatch = transactionResult.batch ? {
        ...transactionResult.batch,
        storageStartDate: formatDateOnly(transactionResult.batch.storageStartDate),
        storageEndDate: formatDateOnly(transactionResult.batch.storageEndDate),
        createdAt: formatDateOnly(transactionResult.batch.createdAt),
        updatedAt: formatDateOnly(transactionResult.batch.updatedAt),
        attachmentFile: parseAttachmentFiles(transactionResult.batch.attachmentFile),
      } : null;

      const result = {
        success: true,
        message: 'Cập nhật trạng thái đợt lưu trữ thành công',
        data: {
          batch: transactionResult.batch,
          sources: transactionResult.sources,
          histories,
          availableActions: this.getAvailableActions(transactionResult.newStatusCode),
        },
      };
      

      
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: 'Cập nhật trạng thái đợt lưu trữ thất bại',
        error: error.message,
      });
    }
  }

  private getAvailableActions(statusCode?: string | null) {
    const code = (statusCode || '').toUpperCase();
    if (!code || code === 'DRAFT' || code === 'PENDING') {
      return ['submit', 'edit', 'exit'];
    }
    if (code === 'SUBMITTED') {
      return ['approve', 'reject', 'edit', 'exit'];
    }
    if (code === 'REJECTED') {
      return ['submit', 'edit', 'exit'];
    }
    if (code === 'APPROVED') {
      return ['exit'];
    }
    return ['edit', 'exit'];
  }

  private async tryLogHistory(
    manager: any,
    storageBatchId: number,
    action: string,
    actedBy: string,
    comment?: string,
    statusCode?: string,
  ) {
    try {
      // Validate các trường bắt buộc
      if (!storageBatchId) {
        throw new Error('storageBatchId is required');
      }
      if (!action) {
        throw new Error('action is required');
      }
      if (!actedBy) {
        throw new Error('actedBy is required');
      }
      
      // Map action sang action_code
      const actionCodeMap: Record<string, string> = {
        submit: 'SUBMIT',
        approve: 'APPROVE',
        reject: 'REJECT',
        edit: 'EDIT',
        delete: 'DELETE',
      };
      
      const documentIdStr = String(storageBatchId);
      if (documentIdStr.length > 100) {
        throw new Error(`documentId length exceeds 100 characters: ${documentIdStr.length}`);
      }
      
      if (actedBy.length > 100) {
        throw new Error(`actedBy length exceeds 100 characters: ${actedBy.length}`);
      }
      
      if (comment && comment.length > 255) {
        throw new Error(`comment length exceeds 255 characters: ${comment.length}`);
      }
      
      const audit = manager.create(Audit, {
        // id sẽ tự động được generate bởi @PrimaryGeneratedColumn
        documentId: documentIdStr, // document_id: VARCHAR(100) - lưu storage_batch_id dạng string (BẮT BUỘC)
        userId: actedBy || null, // user_id: VARCHAR(100) - Người ý kiến
        actionCode: actionCodeMap[action] || action.toUpperCase(), // action_code: VARCHAR(100) - Mã hành động
        action: comment || null, // action: VARCHAR(255) - Ý kiến xử lý
        stageStatus: statusCode || null, // stage_status: VARCHAR(100) - Trạng thái (status_code)
        typeDocument: 'StorageBatch', // type_document: VARCHAR(100) - Phân biệt loại document
        // createdAt sẽ tự động được set bởi @CreateDateColumn
      });
      
   
      
      const savedAudit = await manager.save(Audit, audit);
    } catch (e: any) {
      // Log lỗi chi tiết để debug
      console.error('Error logging to audit table:', {
        error: e.message,
        storageBatchId,
        action,
        actedBy,
        comment: comment?.substring(0, 50),
        statusCode,
      });
      // Không throw để không làm gián đoạn luồng chính
    }
  }

  private async safeGetHistories(storageBatchId: number) {
    try {
      
      // Dùng query builder với timeout và limit để tránh timeout
      const queryBuilder = this.auditRepo
        .createQueryBuilder('audit')
        .where('audit.documentId = :documentId', { documentId: String(storageBatchId) })
        .andWhere('audit.typeDocument = :typeDocument', { typeDocument: 'StorageBatch' })
        .orderBy('audit.createdAt', 'DESC')
        .limit(100); // Giới hạn 100 records để tránh query quá lâu
      
      // Thêm timeout cho query (5 giây)
      const auditRecords = await Promise.race([
        queryBuilder.getMany(),
        new Promise<Audit[]>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000)
        ),
      ]) as Audit[];
      

      // Map từ Audit sang format hiển thị cho bảng "THÔNG TIN XỬ LÝ"
      const mapped = auditRecords.map((audit: Audit, index: number) => {
        // Map actionCode sang tên hành động tiếng Việt
        const actionNameMap: { [key: string]: string } = {
          'SUBMIT': 'Trình phê duyệt',
          'APPROVE': 'Phê duyệt',
          'REJECT': 'Trả lại',
          'EDIT': 'Chỉnh sửa',
          'DELETE': 'Xóa',
          'CREATE': 'Tạo mới',
        };
        
        return {
          stt: index + 1, // Số thứ tự
          id: audit.id,
          storageBatchId: audit.documentId ? parseInt(audit.documentId, 10) : 0,
          action: audit.actionCode, // submit, approve, reject, edit, delete (tiếng Anh)
          actionName: actionNameMap[audit.actionCode?.toUpperCase() || ''] || audit.actionCode || 'Khác', // Tên hành động tiếng Việt
          statusCode: audit.stageStatus,
          comment: audit.action, // Ý kiến xử lý
          actedBy: audit.userId || audit.createdBy, // ID người xử lý
          processor: audit.displayName || audit.processedBy ||audit.actingAs || audit.userId || audit.createdBy || 'Hệ thống', // Tên người xử lý (hiển thị)
          actedAt: formatDateOnly(audit.createdAt || audit.time), // Ngày ý kiến (DD/MM/YYYY)
          createdAt: formatDateOnly(audit.createdAt || audit.time), // Alias cho act
        };
      });
      
      return mapped;
    } catch (e: any) {
      console.error(`❌ [HISTORIES] Lỗi khi lấy lịch sử:`, e.message || e);
      // Trả về mảng rỗng thay vì throw error để không làm gián đoạn flow chính
      return [];
    }
  }

  // ====== API quản lý danh mục hồ sơ ======

  /**
   * Cập nhật danh mục hồ sơ (không cần cập nhật đợt lưu trữ)
   */
  async updateSources(batchId: number, sources: UpdateSourceStorageDto[], userId?: string) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Kiểm tra đợt lưu trữ có tồn tại không
        const batch = await manager
          .createQueryBuilder(StorageBatchEntity, 'batch')
          .where('batch.id = :id', { id: batchId })
          .andWhere('(batch.status IS NULL OR batch.status <> 0)')
          .getOne();

        if (!batch) {
          throw new NotFoundException({
            success: false,
            message: 'Không tìm thấy đợt lưu trữ',
            errors: [
              {
                field: 'batchId',
                message: `Không tìm thấy đợt lưu trữ với ID: ${batchId}`,
              },
            ],
          });
        }

        if (!sources || !Array.isArray(sources) || sources.length === 0) {
          throw new BadRequestException({
            success: false,
            message: 'Danh mục hồ sơ không được để trống',
            errors: [
              {
                field: 'sources',
                message: 'Cần ít nhất 1 hồ sơ trong danh mục',
              },
            ],
          });
        }

        // Kiểm tra trùng lặp textSymbol và title trong mảng sources (trong cùng đợt - đã bỏ)
        const duplicateErrors = validateDuplicateSources(sources, 'sources');
        if (duplicateErrors.length > 0) {
          throw new BadRequestException({
            success: false,
            message: 'Danh mục hồ sơ có dữ liệu trùng lặp',
            errors: duplicateErrors,
          });
        }
        
        // Kiểm tra trùng lặp với các đợt lưu trữ KHÁC
        const allExistingSources = await manager.find(SourceStorageEntity, {
          where: { status: 1 },
          select: ['textSymbol', 'title', 'storageBatchId'],
        });
        // Lọc bỏ sources của đợt hiện tại
        const otherBatchSources = allExistingSources.filter(s => s.storageBatchId !== batchId);
        const crossBatchErrors = await validateDuplicateAcrossBatches(otherBatchSources, sources, 'sources');
        if (crossBatchErrors.length > 0) {
          throw new BadRequestException({
            success: false,
            message: 'Danh mục hồ sơ bị trùng với đợt lưu trữ khác',
            errors: crossBatchErrors,
          });
        }

        // Soft delete các hồ sơ cũ: chỉ cập nhật status từ 1 (hoạt động) thành 0 (đã xóa)
        // Không xóa record trên SQL Server, chỉ ẩn trên giao diện
        await manager.update(SourceStorageEntity, { storageBatchId: batchId }, { status: 0 });

        // Tạo mới các hồ sơ
        const sourcesPayload: SourceStorageEntity[] = sources.map((s: UpdateSourceStorageDto) =>
          manager.create(SourceStorageEntity, {
            textSymbol: s.textSymbol || '',
            title: s.title || '',
            type: s.type || '',
            storageBatchId: batchId,
            status: 1, // Mặc định là hoạt động
            createdBy: userId || batch.createdBy || 'system', // Lấy từ userId hoặc batch
          }),
        );

        const savedSources = await manager.save(SourceStorageEntity, sourcesPayload);

        // Log history
        await this.tryLogHistory(
          manager,
          batchId,
          'edit',
          userId || batch.createdBy || 'system',
          'Cập nhật danh mục hồ sơ',
        );

        // Format giống với API danh sách đợt lưu trữ
        const mappedSources = savedSources.map((s) => ({
          id: s.id,
          textSymbol: s.textSymbol,
          title: s.title,
          type: s.type,
          status: s.status,
          storageBatchId: s.storageBatchId,
          createdBy: s.createdBy,
          createdAt: formatDateOnly(s.createdAt),
          updatedAt: formatDateOnly(s.updatedAt),
        }));

        return {
          items: mappedSources,
          total: mappedSources.length,
        };
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: 'Cập nhật danh mục hồ sơ thất bại',
        error: error.message,
      });
    }
  }

  /**
   * Cập nhật từng hồ sơ riêng lẻ
   */
  async updateSource(batchId: number, sourceId: number, dto: UpdateSourceStorageDto, userId?: string) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Kiểm tra đợt lưu trữ có tồn tại không
        const batch = await manager
          .createQueryBuilder(StorageBatchEntity, 'batch')
          .where('batch.id = :id', { id: batchId })
          .andWhere('(batch.status IS NULL OR batch.status <> 0)')
          .getOne();

        if (!batch) {
          throw new NotFoundException({
            success: false,
            message: 'Không tìm thấy đợt lưu trữ',
            errors: [
              {
                field: 'batchId',
                message: `Không tìm thấy đợt lưu trữ với ID: ${batchId}`,
              },
            ],
          });
        }

        // Kiểm tra hồ sơ có tồn tại không
        const source = await manager.findOne(SourceStorageEntity, {
          where: { id: sourceId, storageBatchId: batchId, status: 1 },
        });

        if (!source) {
          throw new NotFoundException({
            success: false,
            message: 'Không tìm thấy hồ sơ',
            errors: [
              {
                field: 'sourceId',
                message: `Không tìm thấy hồ sơ với ID: ${sourceId} trong đợt lưu trữ ${batchId}`,
              },
            ],
          });
        }

        // Kiểm tra trùng lặp với các hồ sơ của đợt lưu trữ KHÁC (không check trong cùng đợt nữa)
        const sourcesFromOtherBatches = await manager.find(SourceStorageEntity, {
          where: { status: 1 },
        });
        // Lọc bỏ các sources của đợt hiện tại
        const otherBatchSources = sourcesFromOtherBatches.filter(s => s.storageBatchId !== batchId);

        const errors: Array<{ field: string; message: string }> = [];
        
        // Lấy giá trị textSymbol và title sau khi cập nhật (nếu có thay đổi thì dùng giá trị mới, không thì dùng giá trị cũ)
        const finalTextSymbol = dto.textSymbol !== undefined ? dto.textSymbol.trim() : source.textSymbol?.trim();
        const finalTitle = dto.title !== undefined ? dto.title.trim() : source.title?.trim();
        
        // Kiểm tra textSymbol trùng với textSymbol của đợt khác (nếu có thay đổi)
        if (dto.textSymbol !== undefined && finalTextSymbol) {
          const duplicateTextSymbol = otherBatchSources.find(
            s => s.textSymbol?.trim().toLowerCase() === finalTextSymbol.toLowerCase()
          );
          if (duplicateTextSymbol) {
            errors.push({
              field: 'textSymbol',
              message: `Số và ký hiệu hồ sơ "${finalTextSymbol}" đã tồn tại trong đợt lưu trữ khác`,
            });
          }
        }

        // Kiểm tra textSymbol trùng với title của đợt khác (nếu có thay đổi)
        if (dto.textSymbol !== undefined && finalTextSymbol) {
          const duplicateWithTitle = otherBatchSources.find(
            s => s.title?.trim().toLowerCase() === finalTextSymbol.toLowerCase()
          );
          if (duplicateWithTitle) {
            errors.push({
              field: 'textSymbol',
              message: `Số và ký hiệu hồ sơ "${finalTextSymbol}" đã bị trùng với tiêu đề hồ sơ của đợt lưu trữ khác`,
            });
          }
        }

        // Kiểm tra title trùng với title của đợt khác (nếu có thay đổi)
        if (dto.title !== undefined && finalTitle) {
          const duplicateTitle = otherBatchSources.find(
            s => s.title?.trim().toLowerCase() === finalTitle.toLowerCase()
          );
          if (duplicateTitle) {
            errors.push({
              field: 'title',
              message: `Tiêu đề hồ sơ "${finalTitle}" đã tồn tại trong đợt lưu trữ khác`,
            });
          }
        }

        // Kiểm tra title trùng với textSymbol của đợt khác (nếu có thay đổi)
        if (dto.title !== undefined && finalTitle) {
          const duplicateWithTextSymbol = otherBatchSources.find(
            s => s.textSymbol?.trim().toLowerCase() === finalTitle.toLowerCase()
          );
          if (duplicateWithTextSymbol) {
            errors.push({
              field: 'title',
              message: `Tiêu đề hồ sơ "${finalTitle}" đã bị trùng với số và ký hiệu hồ sơ của đợt lưu trữ khác`,
            });
          }
        }

        if (errors.length > 0) {
          throw new BadRequestException({
            success: false,
            message: 'Hồ sơ bị trùng lặp với đợt lưu trữ khác',
            errors,
          });
        }

        // Cập nhật hồ sơ - chỉ cho phép sửa 3 trường: textSymbol, title, type
        const updateData: Partial<SourceStorageEntity> = {};
        if (dto.textSymbol !== undefined) updateData.textSymbol = dto.textSymbol;
        if (dto.title !== undefined) updateData.title = dto.title;
        if (dto.type !== undefined) updateData.type = dto.type;
        // Không cho phép sửa status và createdBy

        await manager.update(SourceStorageEntity, { id: sourceId }, updateData);
        const updatedSource = await manager.findOne(SourceStorageEntity, { where: { id: sourceId } });

        if (!updatedSource) {
          throw new NotFoundException({
            success: false,
            message: 'Không tìm thấy hồ sơ sau khi cập nhật',
            errors: [
              {
                field: 'sourceId',
                message: `Không tìm thấy hồ sơ với ID: ${sourceId}`,
              },
            ],
          });
        }

        // Log history
        await this.tryLogHistory(
          manager,
          batchId,
          'edit',
          userId || batch.createdBy || 'system',
          `Cập nhật hồ sơ: ${updatedSource.title || sourceId}`,
        );

        // Format giống với API danh sách đợt lưu trữ
        return {
          id: updatedSource.id,
          textSymbol: updatedSource.textSymbol,
          title: updatedSource.title,
          type: updatedSource.type,
          status: updatedSource.status,
          storageBatchId: updatedSource.storageBatchId,
          createdBy: updatedSource.createdBy,
          createdAt: formatDateOnly(updatedSource.createdAt),
          updatedAt: formatDateOnly(updatedSource.updatedAt),
        };
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: 'Cập nhật hồ sơ thất bại',
        error: error.message,
      });
    }
  }

  /**
   * Lấy chi tiết một hồ sơ theo ID
   */
  async findOneSource(batchId: number, sourceId: number) {
    try {
      // Kiểm tra đợt lưu trữ có tồn tại không
      const batch = await this.batchRepo
        .createQueryBuilder('batch')
        .where('batch.id = :id', { id: batchId })
        .andWhere('(batch.status IS NULL OR batch.status <> 0)')
        .getOne();

      if (!batch) {
        throw new NotFoundException({
          success: false,
          message: 'Không tìm thấy đợt lưu trữ',
          errors: [
            {
              field: 'batchId',
              message: `Không tìm thấy đợt lưu trữ với ID: ${batchId}`,
            },
          ],
        });
      }

      // Kiểm tra hồ sơ có tồn tại không
      const source = await this.sourceRepo.findOne({
        where: { id: sourceId, storageBatchId: batchId, status: 1 },
      });

      if (!source) {
        throw new NotFoundException({
          success: false,
          message: 'Không tìm thấy hồ sơ',
          errors: [
            {
              field: 'sourceId',
              message: `Không tìm thấy hồ sơ với ID: ${sourceId} trong đợt lưu trữ ${batchId}`,
            },
          ],
        });
      }

      // Format giống với API danh sách đợt lưu trữ
      return {
        id: source.id,
        textSymbol: source.textSymbol,
        title: source.title,
        type: source.type,
        status: source.status,
        storageBatchId: source.storageBatchId,
        createdBy: source.createdBy,
        createdAt: formatDateOnly(source.createdAt),
        updatedAt: formatDateOnly(source.updatedAt),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: 'Lỗi khi lấy chi tiết hồ sơ',
        error: error.message,
      });
    }
  }

  /**
   * Thêm hồ sơ mới vào đợt lưu trữ
   */
  async addSource(batchId: number, dto: CreateSourceStorageDto, userId?: string) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Kiểm tra đợt lưu trữ có tồn tại không
        const batch = await manager
          .createQueryBuilder(StorageBatchEntity, 'batch')
          .where('batch.id = :id', { id: batchId })
          .andWhere('(batch.status IS NULL OR batch.status <> 0)')
          .getOne();

        if (!batch) {
          throw new NotFoundException({
            success: false,
            message: 'Không tìm thấy đợt lưu trữ',
            errors: [
              {
                field: 'batchId',
                message: `Không tìm thấy đợt lưu trữ với ID: ${batchId}`,
              },
            ],
          });
        }

        // Kiểm tra trùng lặp với các đợt lưu trữ KHÁC (không check trong cùng đợt nữa)
        const errors: Array<{ field: string; message: string }> = [];
        const textSymbolTrimmed = dto.textSymbol?.trim();
        const titleTrimmed = dto.title?.trim();
        
        // Lấy tất cả sources từ các đợt lưu trữ KHÁC
        const allExistingSources = await manager.find(SourceStorageEntity, {
          where: { status: 1 },
        });
        // Lọc bỏ sources của đợt hiện tại
        const otherBatchSources = allExistingSources.filter(s => s.storageBatchId !== batchId);
        
        // Kiểm tra textSymbol trùng với textSymbol của đợt khác
        if (textSymbolTrimmed) {
          const duplicateTextSymbol = otherBatchSources.find(
            s => s.textSymbol?.trim().toLowerCase() === textSymbolTrimmed.toLowerCase()
          );
          if (duplicateTextSymbol) {
            errors.push({
              field: 'textSymbol',
              message: `Số và ký hiệu hồ sơ "${textSymbolTrimmed}" đã tồn tại trong đợt lưu trữ khác`,
            });
          }
        }

        // Kiểm tra textSymbol trùng với title của đợt khác
        if (textSymbolTrimmed) {
          const duplicateWithTitle = otherBatchSources.find(
            s => s.title?.trim().toLowerCase() === textSymbolTrimmed.toLowerCase()
          );
          if (duplicateWithTitle) {
            errors.push({
              field: 'textSymbol',
              message: `Số và ký hiệu hồ sơ "${textSymbolTrimmed}" đã bị trùng với tiêu đề hồ sơ của đợt lưu trữ khác`,
            });
          }
        }

        // Kiểm tra title trùng với title của đợt khác
        if (titleTrimmed) {
          const duplicateTitle = otherBatchSources.find(
            s => s.title?.trim().toLowerCase() === titleTrimmed.toLowerCase()
          );
          if (duplicateTitle) {
            errors.push({
              field: 'title',
              message: `Tiêu đề hồ sơ "${titleTrimmed}" đã tồn tại trong đợt lưu trữ khác`,
            });
          }
        }

        // Kiểm tra title trùng với textSymbol của đợt khác
        if (titleTrimmed) {
          const duplicateWithTextSymbol = otherBatchSources.find(
            s => s.textSymbol?.trim().toLowerCase() === titleTrimmed.toLowerCase()
          );
          if (duplicateWithTextSymbol) {
            errors.push({
              field: 'title',
              message: `Tiêu đề hồ sơ "${titleTrimmed}" đã bị trùng với số và ký hiệu hồ sơ của đợt lưu trữ khác`,
            });
          }
        }

        if (errors.length > 0) {
          throw new BadRequestException({
            success: false,
            message: 'Hồ sơ bị trùng lặp với đợt lưu trữ khác',
            errors,
          });
        }

        // Tạo hồ sơ mới
        const source = manager.create(SourceStorageEntity, {
          textSymbol: dto.textSymbol,
          title: dto.title,
          type: dto.type,
          storageBatchId: batchId,
          status: dto.status ?? 1,
          createdBy: dto.createdBy || userId || batch.createdBy || 'system',
        });

        const savedSource = await manager.save(SourceStorageEntity, source);

        // Log history
        await this.tryLogHistory(
          manager,
          batchId,
          'edit',
          userId || batch.createdBy || 'system',
          `Thêm hồ sơ mới: ${savedSource.title}`,
        );

        // Format datetime fields
        const formattedSource = {
          ...savedSource,
          createdAt: formatDateOnly(savedSource.createdAt),
          updatedAt: formatDateOnly(savedSource.updatedAt),
        };

        return {
          success: true,
          message: 'Thêm hồ sơ thành công',
          data: {
            source: formattedSource,
          },
        };
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: 'Thêm hồ sơ thất bại',
        error: error.message,
      });
    }
  }

  /**
   * Xóa một hồ sơ (soft delete)
   */
  async deleteSource(batchId: number, sourceId: number, userId?: string) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Kiểm tra đợt lưu trữ có tồn tại không
        const batch = await manager
          .createQueryBuilder(StorageBatchEntity, 'batch')
          .where('batch.id = :id', { id: batchId })
          .andWhere('(batch.status IS NULL OR batch.status <> 0)')
          .getOne();

        if (!batch) {
          throw new NotFoundException({
            success: false,
            message: 'Không tìm thấy đợt lưu trữ',
            errors: [
              {
                field: 'batchId',
                message: `Không tìm thấy đợt lưu trữ với ID: ${batchId}`,
              },
            ],
          });
        }

        // Kiểm tra hồ sơ có tồn tại không
        const source = await manager.findOne(SourceStorageEntity, {
          where: { id: sourceId, storageBatchId: batchId, status: 1 },
        });

        if (!source) {
          throw new NotFoundException({
            success: false,
            message: 'Không tìm thấy hồ sơ',
            errors: [
              {
                field: 'sourceId',
                message: `Không tìm thấy hồ sơ với ID: ${sourceId} trong đợt lưu trữ ${batchId}`,
              },
            ],
          });
        }

        // Soft delete: chỉ cập nhật status từ 1 (hoạt động) thành 0 (đã xóa)
        // Không xóa record trên SQL Server, chỉ ẩn trên giao diện
        await manager.update(SourceStorageEntity, { id: sourceId }, { status: 0 });

        // Log history
        await this.tryLogHistory(
          manager,
          batchId,
          'delete',
          userId || batch.createdBy || 'system',
          `Xóa hồ sơ: ${source.title}`,
        );

        return {
          success: true,
          message: 'Xóa hồ sơ thành công',
        };
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        success: false,
        message: 'Xóa hồ sơ thất bại',
        error: error.message,
      });
    }
  }
}
