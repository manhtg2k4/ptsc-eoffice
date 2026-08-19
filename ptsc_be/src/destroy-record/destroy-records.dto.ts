import { IsNotEmpty, IsString, IsOptional, IsInt, MaxLength, ValidateNested, IsDateString, IsObject, IsBooleanString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { WorkItemDto } from 'src/meeting/dto/meeting-participants.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsPositiveIntString } from 'src/documents/dto/list-type.map';
import { IsPagedLimit, clampLimit } from '../utils/pagination.validator';

export class CreateDestroyRecordDto {
  @IsNotEmpty({ message: 'Mã đợt hủy là bắt buộc' })
  @IsString()
  @MaxLength(100, { message: 'Mã đợt hủy không được quá 100 ký tự' })
  @Transform(({ value }) => value?.trim())
  destroyBatchCode: string;

  @IsNotEmpty({ message: 'Tên đợt hủy là bắt buộc' })
  @IsString()
  @MaxLength(255, { message: 'Tên đợt hủy không được quá 255 ký tự' })
  @Transform(({ value }) => value?.trim())
  destroyBatchName: string;

  @IsOptional()
  @IsString()
  destroyReason?: string;

  @IsOptional()
  @IsInt({ message: 'Tổng số hồ sơ hủy phải là số nguyên' })
  totalDestroyedRecords?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  profileIds?: string[];
}

export class UpdateDestroyRecordDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  destroyBatchCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  destroyBatchName?: string;

  @IsOptional()
  @IsString()
  destroyReason?: string;

  @IsOptional()
  @IsInt()
  totalDestroyedRecords?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  profileIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  statusCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  miningState?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  createdBy?: string;

  @IsOptional()
  @IsString()
  actionCode?: string;

  @IsOptional()
  @IsString()
  flowConfig?: string;

  @IsOptional()
  @IsString()
  assigneeUserId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkItemDto)
  workItem?: WorkItemDto;

  @IsOptional()
  @IsDateString()
  deadline: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  noteDetail?: string;

  @ApiPropertyOptional({ description: 'Filter object' })
  @IsOptional()
  @IsObject()
  filter?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Trang hiện tại', default: '1' })
  @IsOptional()
  @IsPositiveIntString(1, { message: 'Page phải là số nguyên >= 1.' })
  page?: string = '1';

  @ApiPropertyOptional({
    description: 'Số bản ghi trên mỗi trang',
    default: '20',
  })
  @IsOptional()
  @IsPagedLimit({ message: 'Limit phải là số nguyên trong khoảng [1, 100].' })
  limit?: string = '20';

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
  workstate?: string;

  @IsOptional()
  @IsString()
  substate?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  isExport?: string;
}
