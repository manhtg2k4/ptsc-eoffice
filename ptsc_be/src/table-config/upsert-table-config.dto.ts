import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class UpsertTableConfigDto {
  @IsNotEmpty()
  @IsString()
  module: string;

  @IsArray()
  columns: Record<string, any>[];
}