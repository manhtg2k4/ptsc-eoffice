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
import { IsSafeInt } from '../../common-source/validators/safe-int.validator';
import { IsDateStringNotEmpty } from '../../common-source/validators/date-string-not-empty.validator';

// Danh sách giá trị hợp lệ cho các trường SELECT
export const VALID_ARCHIVES_TYPE = ['projectPolice', 'projectHospital', 'projectCntt'];
export const VALID_ARCHIVES_DEADLINE = [
  'forever',
  '30second',
  '70years',
  '69years',
  '68years',
  '67years',
  '66years',
  '65years',
  '64years',
  '63years',
  '62years',
  '61years',
  '60years',
  '59years',
  '58years',
  '57years',
  '56years',
  '55years',
  '54years',
  '53years',
  '52years',
  '51years',
  '50years',
  '49years',
  '48years',
  '47years',
  '46years',
  '45years',
  '44years',
  '43years',
  '42years',
  '41years',
  '40years',
  '39years',
  '38years',
  '37years',
  '36years',
  '35years',
  '34years',
  '33years',
  '32years',
  '31years',
  '30years',
  '29years',
  '28years',
  '27years',
  '26years',
  '25years',
  '24years',
  '23years',
  '22years',
  '21years',
  '20years',
  '19years',
  '18years',
  '17years',
  '16years',
  '15years',
  '14years',
  '13years',
  '12years',
  '11years',
  '10years',
  '9years',
  '8years',
  '7years',
  '6years',
  '5years',
  '4years',
  '3years',
  '2years',
  '1years'
];
export const VALID_ARCHIVES_MODE = ['private', 'public'];
export const VALID_ARCHIVES_LANGUAGE = ['Japan', 'america', 'dongLao', 'vn'];
export const VALID_ARCHIVES_ORGANIZATION_UNIT = ['001', '002', '003', '004'];

// Map giá trị ID sang label hiển thị
export const ARCHIVES_TYPE_MAP: Record<string, string> = {
  projectPolice: 'Hồ sơ dự án Bộ Công An',
  projectHospital: 'Hồ sơ dự án Bệnh viện',
  projectCntt: 'Hồ sơ dự án CNTT',
};

export const ARCHIVES_DEADLINE_MAP: Record<string, string> = {
  'forever': 'Vĩnh viễn',
  '30second': '30 giây',
  '70years': '70 năm',
  '69years': '69 năm',
  '68years': '68 năm',
  '67years': '67 năm',
  '66years': '66 năm',
  '65years': '65 năm',
  '64years': '64 năm',
  '63years': '63 năm',
  '62years': '62 năm',
  '61years': '61 năm',
  '60years': '60 năm',
  '59years': '59 năm',
  '58years': '58 năm',
  '57years': '57 năm',
  '56years': '56 năm',
  '55years': '55 năm',
  '54years': '54 năm',
  '53years': '53 năm',
  '52years': '52 năm',
  '51years': '51 năm',
  '50years': '50 năm',
  '49years': '49 năm',
  '48years': '48 năm',
  '47years': '47 năm',
  '46years': '46 năm',
  '45years': '45 năm',
  '44years': '44 năm',
  '43years': '43 năm',
  '42years': '42 năm',
  '41years': '41 năm',
  '40years': '40 năm',
  '39years': '39 năm',
  '38years': '38 năm',
  '37years': '37 năm',
  '36years': '36 năm',
  '35years': '35 năm',
  '34years': '34 năm',
  '33years': '33 năm',
  '32years': '32 năm',
  '31years': '31 năm',
  '30years': '30 năm',
  '29years': '29 năm',
  '28years': '28 năm',
  '27years': '27 năm',
  '26years': '26 năm',
  '25years': '25 năm',
  '24years': '24 năm',
  '23years': '23 năm',
  '22years': '22 năm',
  '21years': '21 năm',
  '20years': '20 năm',
  '19years': '19 năm',
  '18years': '18 năm',
  '17years': '17 năm',
  '16years': '16 năm',
  '15years': '15 năm',
  '14years': '14 năm',
  '13years': '13 năm',
  '12years': '12 năm',
  '11years': '11 năm',
  '10years': '10 năm',
  '9years': '9 năm',
  '8years': '8 năm',
  '7years': '7 năm',
  '6years': '6 năm',
  '5years': '5 năm',
  '4years': '4 năm',
  '3years': '3 năm',
  '2years': '2 năm',
  '1years': '1 năm',
};

export const ARCHIVES_MODE_MAP: Record<string, string> = {
  private: 'Hạn chế',
  public: 'Rộng rãi',
};

export const ARCHIVES_LANGUAGE_MAP: Record<string, string> = {
  Japan: 'Nhật bản',
  america: 'Mỹ',
  // dongLao: 'Đông Lào',
  vn: 'Việt Nam',
};

export const ARCHIVES_ORGANIZATION_UNIT_MAP: Record<string, string> = {
  '001': 'Phòng FE',
  '002': 'Phòng hệ thống',
  '003': 'Phòng Nhân sự',
  '004': 'Phòng BE',
};

// DTO cho danh mục tài liệu
export class CreateDocumentIndexDto {
  @ApiPropertyOptional({ description: 'ID tạm từ FE (sẽ bỏ qua, BE tự sinh)' })
  @IsOptional()
  id?: number; // Không validate vì BE sẽ bỏ qua ID này và tự sinh ID mới

  @ApiProperty({ description: 'Tên tài liệu' })
  @IsNotEmpty({ message: 'Tên tài liệu không được để trống' })
  @IsString({ message: 'Tên tài liệu phải là chuỗi' })
  @MaxLength(255, { message: 'Tên tài liệu không được vượt quá 255 ký tự' })
  nameDoc!: string;
}

// DTO cho tạo mới hồ sơ + danh mục tài liệu
export class CreateArchivesDto {
  @ApiProperty({ description: 'Số và ký hiệu hồ sơ (lấy từ draft)' })
  @IsNotEmpty({ message: 'Số và ký hiệu hồ sơ không được để trống' })
  @IsString({ message: 'Số và ký hiệu hồ sơ phải là chuỗi' })
  @MaxLength(255, { message: 'Số và ký hiệu hồ sơ không được vượt quá 255 ký tự' })
  archivesNumber!: string;

  @ApiProperty({ description: 'ID hồ sơ nguồn (Tiêu đề hồ sơ - SELECT từ source_storage_documents)' })
  @IsNotEmpty({ message: 'Tiêu đề hồ sơ không được để trống' })
  @IsSafeInt({ message: 'Tiêu đề hồ sơ không hợp lệ' })
  @Min(1, { message: 'Tiêu đề hồ sơ không được để trống' })
  @Type(() => Number)
  archivesName!: number;

  @ApiProperty({ description: 'Loại hồ sơ' })
  @IsNotEmpty({ message: 'Loại hồ sơ không được để trống' })
  @IsString({ message: 'Loại hồ sơ phải là chuỗi' })
  @MaxLength(255, { message: 'Loại hồ sơ không được vượt quá 255 ký tự' })
  archivesType!: string;

  @ApiProperty({ description: 'Thời hạn bảo quản' })
  @IsNotEmpty({ message: 'Thời hạn bảo quản không được để trống' })
  @IsString({ message: 'Thời hạn bảo quản phải là chuỗi' })
  @MaxLength(255, { message: 'Thời hạn bảo quản không được vượt quá 255 ký tự' })
  archivesDeadline!: string;

  @ApiProperty({ description: 'Chế độ sử dụng' })
  @IsNotEmpty({ message: 'Chế độ sử dụng không được để trống' })
  @IsString({ message: 'Chế độ sử dụng phải là chuỗi' })
  @MaxLength(100, { message: 'Chế độ sử dụng không được vượt quá 100 ký tự' })
  archivesMode!: string;

  @ApiProperty({ description: 'Năm hình thành hồ sơ (ISO date string)' })
  @IsDateStringNotEmpty({
    emptyMessage: 'Năm hình thành hồ sơ không được để trống',
    formatMessage: 'Năm hình thành hồ sơ không hợp lệ. Vui lòng sử dụng định dạng ISO (YYYY-MM-DDTHH:mm:ss.sssZ)',
  })
  archivesYear!: string;

  @ApiProperty({ description: 'Phòng ban/Đơn vị chịu trách nhiệm' })
  @IsNotEmpty({ message: 'Phòng ban/Đơn vị chịu trách nhiệm không được để trống' })
  @IsString({ message: 'Phòng ban/Đơn vị chịu trách nhiệm phải là chuỗi' })
  @MaxLength(100, { message: 'Phòng ban/Đơn vị chịu trách nhiệm không được vượt quá 100 ký tự' })
  archivesOrganizationUnit!: string;

  @ApiProperty({ description: 'Ngôn ngữ' })
  @IsNotEmpty({ message: 'Ngôn ngữ không được để trống' })
  @IsString({ message: 'Ngôn ngữ phải là chuỗi' })
  @MaxLength(100, { message: 'Ngôn ngữ không được vượt quá 100 ký tự' })
  archivesLanguage!: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi' })
  @MaxLength(255, { message: 'Ghi chú không được vượt quá 255 ký tự' })
  archivesNote?: string | null;

  @ApiPropertyOptional({ description: 'Danh mục tài liệu' })
  @IsOptional()
  @IsArray({ message: 'Danh mục tài liệu phải là mảng' })
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentIndexDto)
  listDocIndex?: CreateDocumentIndexDto[];
}
