import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  // IsIn,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePassportDto {
  @IsNotEmpty({ message: 'Tài khoản eOffice không được để trống' })
  @IsString()
  @MaxLength(50, { message: 'Tài khoản eOffice không quá 50 ký tự' })
  @Transform(({ value }) => value?.trim())
  eofficeAccount: string;

  @IsNotEmpty({ message: 'Số hộ chiếu không được để trống' })
  @IsString()
  @MaxLength(20, { message: 'Số hộ chiếu không quá 20 ký tự' })
  @Transform(({ value }) => value?.trim()?.replace(/\s+/g, ''))
  passportNumber: string;

  @IsNotEmpty({ message: 'Loại hộ chiếu không được để trống' })
  @IsString()
  // @IsIn(
  //     ['Hộ chiếu ngoại giao', 'Hộ chiếu công vụ', 'Hộ chiếu phổ thông'],
  //     { message: 'Loại hộ chiếu phải là: Hộ chiếu ngoại giao, Hộ chiếu công vụ, hoặc Hộ chiếu phổ thông' },
  // )
  @Transform(({ value }) => value?.trim()?.replace(/\s+/g, ''))
  passportType: string;

  @IsNotEmpty({ message: 'Ngày cấp không được để trống' })
  @IsDateString(
    {},
    { message: 'Ngày cấp phải đúng định dạng ngày (YYYY-MM-DD)' },
  )
  issueDate: string;

  @IsNotEmpty({ message: 'Ngày hết hiệu lực không được để trống' })
  @IsDateString(
    {},
    { message: 'Ngày hết hiệu lực phải đúng định dạng ngày (YYYY-MM-DD)' },
  )
  expiryDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Nơi cấp không quá 255 ký tự' })
  issuePlace?: string;

  @IsOptional()
  scanFile?: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Các nước đã đi không quá 255 ký tự' })
  countriesVisited?: string;

  // Thông tin người dùng (thay vì query từ DB)
  @IsOptional()
  id?: any;

  // Hỗ trợ cả 2 tên field: từ FE mới và từ UserEntity cũ
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Họ tên không quá 255 ký tự' })
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Email không quá 255 ký tự' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Họ tên không quá 255 ký tự' })
  name?: string;

  @IsOptional()
  emailUser?: string;

  @IsOptional()
  position?: string;

  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined ? value : String(value).trim()))
  @IsString()
  @MaxLength(255, { message: 'Chức vụ không quá 255 ký tự' })
  positionTitle?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày sinh phải đúng định dạng ngày' })
  birthday?: string;

  @IsOptional()
  gender?: string;

  @IsOptional()
  identificationCard?: string;

  @IsOptional()
  phoneNumber?: string;

  @IsOptional()
	phoneNumberUser?: string;
	
  @IsOptional()
  organizationName?: string;

  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined ? value : String(value).trim()))
  @IsString()
  @MaxLength(255, { message: 'Tên tổ chức không quá 255 ký tự' })
  unitName?: string;

  @IsOptional()
  parent?: any;

  @IsOptional()
  addressUser?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Địa chỉ không quá 500 ký tự' })
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Quốc tịch không quá 100 ký tự' })
  nationality?: string;

  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined ? value : String(value).trim()))
  @IsString()
  @MaxLength(100, { message: 'Cấp bậc không quá 100 ký tự' })
  rank?: string;

  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined ? value : String(value).trim()))
  @IsString()
  @MaxLength(255, { message: 'Tên phòng ban không quá 255 ký tự' })
  departmentName?: string;

  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined ? value : String(value).trim()))
  @IsString()
  @MaxLength(255, { message: 'Tên ban không quá 255 ký tự' })
  divisionName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Nơi sinh không quá 255 ký tự' })
  placeOfBirth?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
