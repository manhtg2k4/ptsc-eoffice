import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { RoleFunctionDto } from '../../role/dto/role-function.dto';

export class CreateRoleGroupDto {
  @IsString()
  clientId: string;

  @IsString()
  name: string;

  @IsString()  
  code: string;

  @IsOptional()
  @IsString()
  description?: string;
    
  @IsMongoId()
  @IsOptional()
  unitId?: string;

  @IsString()
  entityType: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleFunctionDto)
  roles: RoleFunctionDto[];

  @IsOptional()
  @IsBoolean()
  applyToModule?: boolean;
}
