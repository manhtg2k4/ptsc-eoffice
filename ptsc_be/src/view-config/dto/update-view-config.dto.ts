// src/configuration/dto/update-configuration.dto.ts
import { IsOptional, IsString, IsArray, IsIn, IsNumber } from 'class-validator';

export class UpdateConfigurationDto {
    @IsOptional()
    @IsString()
    code?: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsArray()
    field?: any[];

    @IsOptional()
    @IsNumber()
    @IsIn([0, 1, 2, 3])
    status?: 0 | 1 | 2 | 3;

    @IsOptional()
    @IsIn(['form', 'attribute', 'listTable'])
    type?: string;

    @IsOptional()
    @IsString()
    note?: string;

    @IsString()
    @IsOptional()
    processID?: string;

    
      @IsOptional()
  @IsString()
  viewConfigId?: string;

}
