import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  Matches,
  IsEmail,
  ValidateIf,
} from 'class-validator';

export class CreateIssuingAgencyDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã cơ quan ban hành không được để trống' })
  @MaxLength(20, { message: 'Mã cơ quan không được vượt quá 20 ký tự' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên cơ quan ban hành không được để trống' })
  @MaxLength(200, { message: 'Tên cơ quan không được vượt quá 200 ký tự' })
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Địa chỉ không được vượt quá 500 ký tự' })
  address?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9\s-()]*$/, { message: 'Số điện thoại không hợp lệ' })
  @MaxLength(20, { message: 'Số điện thoại không được vượt quá 20 ký tự' })
  phone?: string;

  // Chỉ validate khi email không phải là null, undefined, hoặc chuỗi rỗng.
  // Nếu có giá trị, nó phải là một email hợp lệ.
  @ValidateIf((o) => o.email !== null && o.email !== undefined && o.email !== '')
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(100, { message: 'Email không được vượt quá 100 ký tự' })
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000, { message: 'Mô tả không được vượt quá 2000 ký tự' })
  description?: string;
}