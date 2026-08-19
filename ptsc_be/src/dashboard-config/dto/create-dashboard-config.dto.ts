import { IsArray, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateDashboardConfigDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  columnLeft?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  columnRight?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  statOrder?: string[];
}

export class UpdateDashboardConfigDto extends PartialType(CreateDashboardConfigDto) {}
