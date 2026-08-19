// src/crm-sources/dto/create-crm-source.dto.ts
import { IsString, IsBoolean, IsArray, ValidateNested, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class CreateDataItemDto {
    @IsString()
    title: string;

    @IsString()
    value: string;
}

export class CreateCrmsourceDto {
    @IsString()
    code: string;

    @IsString()
    title: string;

    @IsString()
    @IsOptional()
    originalName?: string;

    @IsOptional()
    canDragDrop?: any;

    @IsOptional()
    canDelete?: any;

    @Type(() => Number)
    @IsInt()
    @IsOptional()
    status?: number;

    @IsString()
    @IsOptional()
    state?: string;

    @IsString()
    @IsOptional()
    type?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateDataItemDto)
    @IsOptional()
    data?: CreateDataItemDto[];

    @IsArray()
    @IsOptional()
    extraFields?: string[];

    @IsArray()
    @IsOptional()
    originalData?: any[];

    @IsOptional()
    moduleCategory?: any;
}