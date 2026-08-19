import { IsString, IsArray, ValidateNested, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class RoleDto {
  @IsString()
  name: string;

  @IsString()
  roleCode: string;

  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @IsArray()
  users: string[]

  @IsArray()
  @IsMongoId({ each: true })
  usersId: string[]; // client gửi string ObjectId
}
  
export class CreateRoleFeatureDto {
  @IsString()
  processKey: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleDto)
  roles: RoleDto[];
}
