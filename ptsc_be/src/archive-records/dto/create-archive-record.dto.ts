import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  IsDate,
  IsUUID,
  IsObject,
  IsBooleanString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsPositiveIntString, IsValidSort } from 'src/documents/dto/list-type.map';
import { IsPagedLimit, clampLimit } from '../../utils/pagination.validator';

class CreateArchiveRecordItemDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @Type(() => Number)
  @IsInt()
  sortOrder: number;

  @IsString()
  groupName: string;

  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  fileIds: number[];

  @IsOptional()
  @IsString()
  notes?: string;
}


export class CreateArchiveRecordDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  fileCode?: string;

  @IsOptional()
  @IsString()
  relatedDepartment?: string;

  @IsOptional()
  @IsString()
  formationYear?: string;

  @IsOptional()
  @IsString()
  retentionPeriod?: string;

  @IsOptional()
  @IsString()
  usageMode?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  recordState?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateArchiveRecordItemDto)
  items?: CreateArchiveRecordItemDto[];
}



export class listArchiveRecordDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  fileCode?: string;

  @IsOptional()
  @IsString()
  relatedDepartment?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  formationYear?: number;

  @IsOptional()
  @IsString()
  retentionPeriod?: string;

  @IsOptional()
  @IsString()
  usageMode?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  recordState?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateArchiveRecordItemDto)
  items?: CreateArchiveRecordItemDto[];


  @ApiPropertyOptional({ description: 'Filter object' })
  @IsOptional()
  @IsObject()
  // @IsValidDateRangeFilter()
  filter?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Trang hiện tại', default: '1' })
  @IsOptional()
  @IsPositiveIntString(1, { message: 'Page phải là số nguyên >= 1.' })
  page?: string = '1';

  @ApiPropertyOptional({
    description: 'Số bản ghi trên mỗi trang',
    default: '100',
  })
  @IsOptional()
  @IsPagedLimit({ message: 'Limit phải là số nguyên trong khoảng [1, 100].' })
  limit?: string = '100';

  @ApiPropertyOptional({
    description: 'Sắp xếp kết quả, ví dụ: {"userDeadline":1}',
  })
  @IsOptional()
  @IsObject()
  sort?: Record<string, any>;

  @ApiProperty({ description: 'Mã danh sách (process function)' })
  @IsString()
  processFn?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  authority?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  room?: string = 'false';

  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  workstate?: string;

  @IsOptional()
  @IsString()
  substate?: string;

  @IsOptional()
  @IsString()
  isExport?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  isExpired?: string;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsString()
  bpmnVersion?: string;

  @IsOptional()
  @IsString()
  destroyRecordId?: string;
}
export class UpdateRecordStateDto {
  recordState?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}