import { IsString, IsNotEmpty, IsEnum, IsMongoId, IsBoolean, IsOptional } from 'class-validator';

export class CreateEntityRoleGroupDto {
  @IsString()
  @IsNotEmpty()
  unitId: string;

  @IsEnum(['organization', 'group', 'user'])
  entityType: string;

  @IsMongoId()
  roleGroupId: string;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}