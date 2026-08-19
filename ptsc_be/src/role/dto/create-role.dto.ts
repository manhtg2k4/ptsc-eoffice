import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { RoleFunctionDto } from './role-function.dto';
import { Type } from 'class-transformer';

export class CreateRoleDto {
  @IsString()
  clientId: string;

  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleFunctionDto)
  roles: RoleFunctionDto[];
}
