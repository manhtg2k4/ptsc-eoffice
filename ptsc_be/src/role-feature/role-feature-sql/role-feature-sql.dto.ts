import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class RoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  roleCode: string;

  @IsArray()
  // @IsString({ each: true })
  permissions: string[];

  @IsArray()
  // @IsString({ each: true }) // Removed to allow null values in the array
  @IsOptional()
  users: string[]; // Mảng các userId
}

export class CreateRoleFeatureSqlDto {
  @IsString()
  @IsNotEmpty()
  processKey: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleDto)
  roles: RoleDto[];
}

export class UpdateRoleFeatureSqlDto extends CreateRoleFeatureSqlDto {}

export class GetRoleFeatureActionsQueryDto {
  @IsString()
  @IsOptional()
  featureId?: string;

  @IsString()
  @IsOptional()
  processKey?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  groupId?: string;
}
