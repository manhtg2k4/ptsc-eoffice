import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  ValidateNested,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { STATUS } from '../variables/CONST_STATUS';

export class RolesDynamicDto {
  @IsString()
  processKey: string;

  @IsString()
  roleCode: string;

  @IsString()
  name: string;
}

export class RoleInGroupDto {
  @IsString()
  _id: string;

  @IsOptional()
  @IsString()
  processKey?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  roleCode?: string;

  @IsOptional()
  @IsString()
  originalId?: string;
}

export class CreateGroupUserDto {
  @IsString()
  name: string;

  @IsString()
  code: string; // Mã đơn vị

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  UserId?: string[];

  @IsOptional()
  @IsArray()
  organizationUnits?: string[]; // Mảng ID của OrganizationUnit

  @IsOptional()
  @IsString()
  roleType?: string;

  @IsOptional()
  roles?: string[];  
  
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolesDynamicDto)
  roles_dynamic?: RolesDynamicDto[];
}

export class CreateGroupUserInDocumentDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsArray()
  userId?: string[];

  @IsOptional()
  @IsBoolean()
  isDefaultIncoming?: boolean;

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class UpdateGroupUserDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolesDynamicDto)
  roles_dynamic?: RolesDynamicDto[];
  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  code?: string; // Mã đơn vị

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  userId?: string[];

  @IsOptional()
  @IsArray()
  UserId?: string[];

  @IsOptional()
  organizationUnits?: string[]; // Mảng ID của OrganizationUnit

  @IsOptional()
  @IsNumber()
  status?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  roleType?: string;

  @IsOptional()
  roles?: string[];
}

export class UpdateGroupUserInDocumentDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolesDynamicDto)
  roles_dynamic?: RolesDynamicDto[];
  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  code?: string; // Mã đơn vị

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  userId?: string[];

  @IsOptional()
  organizationUnits?: string[]; // Mảng ID của OrganizationUnit

  @IsOptional()
  @IsNumber()
  status?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  roleType?: string;

  @IsOptional()
  roles?: string[];

  @IsOptional()
  @IsBoolean()
  isDefaultIncoming?: boolean;
}
