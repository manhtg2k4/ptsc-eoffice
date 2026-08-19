import { IsString, IsArray, IsOptional, IsNumber, ValidateNested, IsObject, IsBoolean, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class TextItemDto {
  @IsString()
  content: string;

  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  @IsOptional()
  fontSize?: number;

  @IsOptional()
  type?: any;
}

class AutoItemDto {
  @IsString()
  key: string;

  @IsString()
  value: string;
}

export class InsertTextDto {
  @IsNotEmpty()
  id: string | number;

  @IsObject()
  texts: Record<string, TextItemDto>; 
  
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutoItemDto)
  auto?: AutoItemDto[];

  @IsOptional()
  @IsBoolean()
  newFile?: boolean;

  @IsOptional()
  @IsString()
  assignment?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  signatureLevel?: string;
}