import { PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAgencyDto {
  @IsString({ message: 'Tên đơn vị phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên đơn vị không được để trống' })
  name: string;

  @IsString({ message: 'Mã đơn vị phải là chuỗi' })
  @IsNotEmpty({ message: 'Mã đơn vị không được để trống' })
  code: string;

  @IsOptional()
  @IsString()
  oldCode?: string;

  @IsOptional()
  @Type(() => Number)
  industryType?: number = 1;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tranStatus?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lgsp?: number;
}

export class UpdateAgencyDto extends PartialType(CreateAgencyDto) {}

export class FindAgenciesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  industryType?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tranStatus?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lgsp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}