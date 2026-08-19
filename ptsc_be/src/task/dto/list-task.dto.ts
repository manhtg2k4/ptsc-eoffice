import { IsBooleanString, IsEnum, IsNumberString, IsOptional, IsString } from "class-validator";
import { IsPagedLimit } from '../../utils/pagination.validator';

export enum TaskTab {
  GENERAL = 'general',//chung
  DOCUMENT = 'document',//từ văn bản
  MEETING = 'meeting',//từ cuộc họp
  REPEAT = 'repeat',//công việc lặp lại
}

export enum HistoryResultType {
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  ALL = 'all',
}

/**
 * Enum cho loại yêu cầu trong lịch sử phê duyệt
 * FE gửi mã tương ứng, BE lọc theo action_code trong audit
 */
export enum HistoryRequestType {
  GUI_PHE_DUYET = 'GUI_PHE_DUYET',     // Phê duyệt kết quả
  DIEU_CHINH = 'DIEU_CHINH',           // Điều chỉnh thông tin
  ALL = 'all',                          // Tất cả
}

export class ListTaskDto {
  @IsOptional()
  @IsEnum(TaskTab)
  tab?: TaskTab;

  @IsOptional()
  page?: number;

  @IsOptional()
  @IsPagedLimit({ message: 'Limit phải là số nguyên trong khoảng [1, 100].' })
  limit?: string | number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  exportType?: string;

  @IsOptional()
  @IsString()
  processFn?: string;

  @IsOptional()
  @IsString()
  typeTask?: string;
  // 🔹 tìm theo tên công việc
  @IsOptional()
  @IsString()
  name?: string;

  // 🔹 trạng thái công việc
  @IsOptional()
  status?: any;

  @IsOptional()
  filter?: any;

  @IsOptional()
  sort?: any;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  isExport?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  isSortStart?: string | boolean;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  countOnly?: string;

  @IsOptional()
  @IsString()
  meetingId?: string;

  @IsOptional()
  @IsString()
  meetingConclusionId?: string;

  @IsOptional()
  @IsEnum(HistoryResultType)
  resultType?: HistoryResultType;

  // =============================
  // FILTER NÂNG CAO CHO HISTORY API
  // =============================

  /**
   * Loại yêu cầu: GUI_PHE_DUYET (Phê duyệt kết quả), DIEU_CHINH (Điều chỉnh thông tin)
   */
  @IsOptional()
  @IsString()
  typeRequest?: string;

  /**
   * ID của người gửi (user_id trong audit)
   */
  @IsOptional()
  @IsString()
  senderId?: string;

  /**
   * Ngày gửi - từ ngày (format: YYYY-MM-DD hoặc DD/MM/YYYY)
   */
  @IsOptional()
  @IsString()
  sentDateFrom?: string;

  /**
   * Ngày gửi - đến ngày (format: YYYY-MM-DD hoặc DD/MM/YYYY)
   */
  @IsOptional()
  @IsString()
  sentDateTo?: string;

  /**
   * Ngày phê duyệt - từ ngày (format: YYYY-MM-DD hoặc DD/MM/YYYY)
   */
  @IsOptional()
  @IsString()
  processedDateFrom?: string;

  /**
   * Ngày phê duyệt - đến ngày (format: YYYY-MM-DD hoặc DD/MM/YYYY)
   */
  @IsOptional()
  @IsString()
  processedDateTo?: string;

  @IsOptional()
  @IsString()
  timeType?: string;
  
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  viewMode?: string;
}