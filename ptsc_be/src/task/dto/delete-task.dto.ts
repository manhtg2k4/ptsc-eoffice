import {
  IsArray,
  IsNotEmpty,
  IsEnum,
  IsString,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum RemoveTaskType {
  SOFT = 'soft',
  STATUS = 'status',
  PARENT = 'parent',
  CHILL = 'chill',
}

export class RemoveManyTaskDto {
  @IsArray()
  @Type(() => Number)
  ids: number[];

  @IsNotEmpty()
  @IsEnum(RemoveTaskType)
  type: RemoveTaskType;

  @IsOptional()
  @IsString()
  parentId: string; // dùng khi xóa cv con trong chi tiết
}