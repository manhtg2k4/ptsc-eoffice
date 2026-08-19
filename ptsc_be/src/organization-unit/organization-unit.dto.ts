import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { RoleFunctionDto } from 'src/role/dto/role-function.dto';

export class CreateOrganizationUnitDto {
  @IsNotEmpty()
  @IsString()
  name: string; // Tên đơn vị

  @IsNotEmpty()
  @IsString()
  code: string; // Mã đơn vị

  @IsNotEmpty()
  @IsString()
  type: string; // Loại đơn vị

  @IsOptional()
  @IsString()
  phoneNumber?: string; // Số điện thoại

  @IsOptional()
  @IsString()
  email?: string; // Email liên hệ

  @IsOptional()
  @IsString()
  leader?: string; // Tên lãnh đạo

  @IsOptional()
  @IsString()
  position?: string; // Chức vụ lãnh đạo

  @IsOptional()
  @IsString()
  address?: string; // Địa chỉ

  @IsOptional()
  @IsString()
  description?: string; // Mô tả về đơn vị

  @IsOptional()
  @IsString()
  permissions?: string; // Phân quyền

  @IsOptional()
  @IsNumber()
  order?: number; // Thứ tự sắp xếp

  @IsOptional()
  @IsString()
  parent?: string; // Đơn vị cha (ID)

   @IsArray()
   @ValidateNested({ each: true })
   @Type(() => RoleFunctionDto)
   roleGroup: RoleFunctionDto[];
}

export class UpdateOrganizationUnitDto extends CreateOrganizationUnitDto {}
