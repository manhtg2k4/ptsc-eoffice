import {
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
  IsArray,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmptyIfPresent } from '../../common-source/validators/not-empty-if-present.validator';
import { IsSafeInt } from '../../common-source/validators/safe-int.validator';
import { IsDateStringNotEmpty } from '../../common-source/validators/date-string-not-empty.validator';

// DTO cho cập nhật danh mục tài liệu
export class UpdateDocumentIndexDto {
  @ApiPropertyOptional({ description: 'ID của tài liệu (nếu có và tồn tại trong DB thì cập nhật, không có hoặc không tồn tại thì tạo mới)' })
  @IsOptional()
  id?: number; // Không validate INT range vì FE có thể gửi ID tạm (timestamp), service sẽ kiểm tra tồn tại trong DB

  @ApiProperty({ description: 'Tên tài liệu' })
  @IsNotEmpty({ message: 'Tên tài liệu không được để trống' })
  @IsString({ message: 'Tên tài liệu phải là chuỗi' })
  @MaxLength(255, { message: 'Tên tài liệu không được vượt quá 255 ký tự' })
  nameDoc!: string;
}

// DTO cho cập nhật hồ sơ + danh mục tài liệu
export class UpdateArchivesDto {
  @ApiPropertyOptional({ description: 'ID hồ sơ nguồn (Tiêu đề hồ sơ - SELECT từ source_storage_documents)' })
  @IsSafeInt({ message: 'Tiêu đề hồ sơ không hợp lệ' })
  @Min(1, { message: 'Tiêu đề hồ sơ không được để trống' })
  @IsOptional()
  @Type(() => Number)
  archivesName?: number;

  @ApiPropertyOptional({ description: 'Loại hồ sơ' })
  @IsNotEmptyIfPresent({ message: 'Loại hồ sơ không được để trống' })
  @IsString({ message: 'Loại hồ sơ phải là chuỗi' })
  @MaxLength(255, { message: 'Loại hồ sơ không được vượt quá 255 ký tự' })
  @IsOptional()
  archivesType?: string;

  @ApiPropertyOptional({ description: 'Thời hạn bảo quản' })
  @IsNotEmptyIfPresent({ message: 'Thời hạn bảo quản không được để trống' })
  @IsString({ message: 'Thời hạn bảo quản phải là chuỗi' })
  @MaxLength(255, { message: 'Thời hạn bảo quản không được vượt quá 255 ký tự' })
  @IsOptional()
  archivesDeadline?: string;

  @ApiPropertyOptional({ description: 'Chế độ sử dụng' })
  @IsNotEmptyIfPresent({ message: 'Chế độ sử dụng không được để trống' })
  @IsString({ message: 'Chế độ sử dụng phải là chuỗi' })
  @MaxLength(100, { message: 'Chế độ sử dụng không được vượt quá 100 ký tự' })
  @IsOptional()
  archivesMode?: string;

  @ApiPropertyOptional({ description: 'Năm hình thành hồ sơ (ISO date string)' })
  @IsDateStringNotEmpty({
    emptyMessage: 'Năm hình thành hồ sơ không được để trống',
    formatMessage: 'Năm hình thành hồ sơ không hợp lệ. Vui lòng sử dụng định dạng ISO (YYYY-MM-DDTHH:mm:ss.sssZ)',
  })
  @IsOptional()
  archivesYear?: string;

  @ApiPropertyOptional({ description: 'Phòng ban/Đơn vị chịu trách nhiệm' })
  @IsNotEmptyIfPresent({ message: 'Phòng ban/Đơn vị chịu trách nhiệm không được để trống' })
  @IsString({ message: 'Phòng ban/Đơn vị chịu trách nhiệm phải là chuỗi' })
  @MaxLength(100, { message: 'Phòng ban/Đơn vị chịu trách nhiệm không được vượt quá 100 ký tự' })
  @IsOptional()
  archivesOrganizationUnit?: string;

  @ApiPropertyOptional({ description: 'Ngôn ngữ' })
  @IsNotEmptyIfPresent({ message: 'Ngôn ngữ không được để trống' })
  @IsString({ message: 'Ngôn ngữ phải là chuỗi' })
  @MaxLength(100, { message: 'Ngôn ngữ không được vượt quá 100 ký tự' })
  @IsOptional()
  archivesLanguage?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString({ message: 'Ghi chú phải là chuỗi' })
  @MaxLength(255, { message: 'Ghi chú không được vượt quá 255 ký tự' })
  @IsOptional()
  archivesNote?: string | null;

  @ApiPropertyOptional({ description: 'Danh mục tài liệu' })
  @IsOptional()
  @IsArray({ message: 'Danh mục tài liệu phải là mảng' })
  @ValidateNested({ each: true })
  @Type(() => UpdateDocumentIndexDto)
  listDocIndex?: UpdateDocumentIndexDto[];
}
