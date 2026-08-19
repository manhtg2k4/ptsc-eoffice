import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { STATUS } from '../variables/CONST_STATUS';
import { Type } from 'class-transformer';

export class RolePermissionDto {
  @IsNotEmpty({ message: 'functionName là bắt buộc' })
  @IsString()
  functionName: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsArray({ message: 'permissions phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi quyền trong permissions phải là chuỗi' })
  permissions: string[];
}
export class CreatelistRoleDto {
  @IsNotEmpty({ message: 'Tên chức năng là bắt buộc' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Mã chức năng là bắt buộc' })
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  describe?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionDto)
  roles?: RolePermissionDto[];
}

export class UpdatelistRoleDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsString()
  code?: string;
  @IsOptional()
  @IsString()
  describe?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionDto)
  roles?: RolePermissionDto[];
  @IsOptional()
  @IsNumber()
  @IsEnum(STATUS)
  status?: number;
}

export class ColumnConfigDto {
  @IsString()
  @IsNotEmpty()
  row: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  visible: boolean;

  @IsString()
  @IsOptional()
  width?: string;
}

export class UpdateUserColumnConfigDto {
  @IsString()
  @IsNotEmpty()
  codeModule: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnConfigDto)
  columns: ColumnConfigDto[];
}
