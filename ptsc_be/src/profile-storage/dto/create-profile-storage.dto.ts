import {
  IsNotEmpty,
  IsString,
  IsDateString,
  MaxLength,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

// DTO cho từng hồ sơ cần lưu trữ (nguồn hồ sơ)
export class CreateSourceStorageDto {
  @IsNotEmpty({ message: 'Số và ký hiệu hồ sơ không được để trống' })
  @IsString({ message: 'Số và ký hiệu hồ sơ phải là chuỗi' })
  @MaxLength(255, { message: 'Số và ký hiệu hồ sơ không được vượt quá 255 ký tự' })
  textSymbol!: string;

  @IsNotEmpty({ message: 'Tiêu đề hồ sơ không được để trống' })
  @IsString({ message: 'Tiêu đề hồ sơ phải là chuỗi' })
  @MaxLength(255, { message: 'Tiêu đề hồ sơ không được vượt quá 255 ký tự' })
  title!: string;

  @IsNotEmpty({ message: 'Loại hồ sơ không được để trống' })
  @IsString({ message: 'Loại hồ sơ phải là chuỗi' })
  @MaxLength(255, { message: 'Loại hồ sơ không được vượt quá 255 ký tự' })
  type!: string;

  @IsOptional()
  status?: number; // 1: hoạt động, 0: đã xóa (mặc định 1 nếu không truyền)

  @IsOptional()
  @IsString({ message: 'Người tạo hồ sơ phải là chuỗi' })
  @MaxLength(100, { message: 'Người tạo hồ sơ không được vượt quá 100 ký tự' })
  createdBy?: string; // Tự động lấy từ tài khoản đăng nhập nếu không gửi
}

// DTO cho đợt lưu trữ + danh mục hồ sơ cần lưu trữ
export class CreateStorageBatchDto {
  @IsNotEmpty({ message: 'Tên đợt lưu trữ không được để trống' })
  @IsString({ message: 'Tên đợt lưu trữ phải là chuỗi' })
  @MaxLength(255, { message: 'Tên đợt lưu trữ không được vượt quá 255 ký tự' })
  name!: string;

  @IsNotEmpty({ message: 'Mã đợt lưu trữ không được để trống' })
  @IsString({ message: 'Mã đợt lưu trữ phải là chuỗi' })
  @MaxLength(255, { message: 'Mã đợt lưu trữ không được vượt quá 255 ký tự' })
  code!: string;

  @IsNotEmpty({ message: 'Phạm vi đợt lưu trữ không được để trống' })
  @IsString({ message: 'Phạm vi đợt lưu trữ phải là chuỗi' })
  @MaxLength(100, { message: 'Phạm vi đợt lưu trữ không được vượt quá 100 ký tự' })
  scope!: string;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu không hợp lệ' })
  storageStartDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc không hợp lệ' })
  storageEndDate?: string;

  @IsOptional()
  @IsString({ message: 'Lý do/căn cứ phải là chuỗi' })
  @MaxLength(255, { message: 'Lý do/căn cứ không được vượt quá 255 ký tự' })
  createReason?: string | null;

  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi' })
  @MaxLength(255, { message: 'Ghi chú không được vượt quá 255 ký tự' })
  note?: string | null;

  @IsOptional()
  @IsArray({ message: 'File đính kèm phải là mảng' })
  attachmentFile?: (string | { name?: string; [key: string]: any })[] | null; // Mảng file: ["file1.pdf"] hoặc [{name: "file1.pdf"}]

  @IsOptional()
  @IsString({ message: 'Mã trạng thái phải là chuỗi' })
  @MaxLength(100, { message: 'Mã trạng thái không được vượt quá 100 ký tự' })
  statusCode?: string | null;

  @IsOptional()
  @IsString({ message: 'Người tạo phải là chuỗi' })
  @MaxLength(100, { message: 'Người tạo không được vượt quá 100 ký tự' })
  createdBy?: string | null; // Có thể bỏ trống, lấy từ tài khoản đăng nhập

  @IsArray({ message: 'Danh mục hồ sơ phải là mảng' })
  @ArrayMinSize(1, { message: 'Cần ít nhất 1 hồ sơ trong danh mục' })
  @ValidateNested({ each: true })
  @Type(() => CreateSourceStorageDto)
  sources!: CreateSourceStorageDto[];
}

