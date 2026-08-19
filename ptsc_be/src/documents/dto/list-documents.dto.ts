import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject, IsNotEmpty, IsDefined, IsArray, ValidateNested, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { IsBooleanString, IsPositiveIntString, IsPagedLimit, IsValidDateRangeFilter, IsValidSort, IsValidType } from './list-type.map';
/**
 * DTO cho API list documents
 * Hỗ trợ nested filter object, paging, sort, và các field filter cơ bản
 */
export class ListDocumentsDto {
  @ApiPropertyOptional({
    description: 'Đường dẫn file BPMN (mặc định dùng LuongGhepGiaoDien.bpmn)',
  })
  @IsOptional()
  @IsString()
  bpmn?: string;

  @ApiPropertyOptional({
    description: 'ID người dùng hiện tại (tự động lấy từ token nếu có)',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Danh sách vai trò của người dùng, phân tách bằng dấu phẩy',
  })
  @IsOptional()
  @IsString()
  roles?: string;

  @ApiPropertyOptional({
    description:
      'Loại văn bản (urgent, deadline, other, waiting, processed, receive, incompleted, completed)',
  })

  @IsDefined({ message: 'Type là bắt buộc.' })
  @IsString()
  @IsNotEmpty({ message: 'Type không được để trống.' })
  @IsValidType()
  type: string;

  @ApiPropertyOptional({
    description: 'Filter object (JSON string)',
    type: 'string',
    example: '{"field":"value"}',
  })
  @IsOptional()
  @IsObject()
  @IsValidDateRangeFilter()
  filter?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Trang hiện tại', default: '1' })
  @IsOptional()
  @IsPositiveIntString(1, { message: 'Page phải là số nguyên >= 1.' })
  page?: string = '1';

  @ApiPropertyOptional({ description: 'Số bản ghi trên mỗi trang', default: '20' })
  @IsOptional()
  @IsPagedLimit({ message: 'Limit phải là số nguyên trong khoảng [1, ${getMaxPageLimit()}].' })
  limit?: string = '20';

  @ApiPropertyOptional({
    description: 'Sắp xếp kết quả, ví dụ: {"userDeadline":1}',
  })
  @IsOptional()
  @IsValidSort()
  sort?: Record<string, any>;

  @ApiProperty({ description: 'Mã danh sách (process function)' })
  @IsString()
  processFn?: string;

  @ApiPropertyOptional({ description: 'Các processFn kết hợp (ví dụ: tiepnhanVT,tracuuVT)' })
  @IsOptional()
  @IsString()
  processFnAll?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  authority?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  room?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  isExport?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  countOnly?: string;
}

export class ListMeetingExportDto {
  @ApiPropertyOptional({
    description: 'Đường dẫn file BPMN (mặc định dùng LuongGhepGiaoDien.bpmn)',
  })
  @IsOptional()
  @IsString()
  bpmn?: string;

  @ApiPropertyOptional({
    description: 'ID người dùng hiện tại (tự động lấy từ token nếu có)',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Danh sách vai trò của người dùng, phân tách bằng dấu phẩy',
  })
  @IsOptional()
  @IsString()
  roles?: string;

  @ApiPropertyOptional({
    description:
      'Loại văn bản (urgent, deadline, other, waiting, processed, receive, incompleted, completed)',
  })

  @IsString()
  @IsOptional()
  @IsValidType()
  type?: string;

  @IsDefined({ message: 'Workstate là bắt buộc.' })
  @IsString()
  @IsNotEmpty({ message: 'Workstate không được để trống.' })
  @IsValidType()
  workstate: string;

  @ApiPropertyOptional({
    description: 'Filter object (JSON string)',
    type: 'string',
    example: '{"field":"value"}',
  })
  @IsOptional()
  @IsObject()
  @IsValidDateRangeFilter()
  filter?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Trang hiện tại', default: '1' })
  @IsOptional()
  @IsPositiveIntString(1, { message: 'Page phải là số nguyên >= 1.' })
  page?: string = '1';

  @ApiPropertyOptional({ description: 'Số bản ghi trên mỗi trang', default: '20' })
  @IsOptional()
  @IsPagedLimit({ message: 'Limit phải là số nguyên trong khoảng [1, ${getMaxPageLimit()}].' })
  limit?: string = '20';

  @ApiPropertyOptional({
    description: 'Sắp xếp kết quả, ví dụ: {"userDeadline":1}',
  })
  @IsOptional()
  @IsValidSort()
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
  room?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  isExport?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  countOnly?: string;
}
export class ListDocumentsOverDueDto {
  @ApiPropertyOptional({
    description: 'Đường dẫn file BPMN (mặc định dùng LuongGhepGiaoDien.bpmn)',
  })
  @IsOptional()
  @IsString()
  bpmn?: string;

  @ApiPropertyOptional({
    description: 'ID người dùng hiện tại (tự động lấy từ token nếu có)',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Danh sách vai trò của người dùng, phân tách bằng dấu phẩy',
  })
  @IsOptional()
  @IsString()
  roles?: string;

  @ApiPropertyOptional({
    description:
      'Loại văn bản (urgent, deadline, other, waiting, processed, receive, incompleted, completed)',
  })


  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter object' })
  @IsOptional()
  @IsObject()
  filter?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Trang hiện tại', default: '1' })
  @IsOptional()
  @IsPositiveIntString(1, { message: 'Page phải là số nguyên >= 1.' })
  page?: string = '1';

  @ApiPropertyOptional({ description: 'Số bản ghi trên mỗi trang', default: '20' })
  @IsOptional()
  @IsPagedLimit({ message: 'Limit phải là số nguyên trong khoảng [1, ${getMaxPageLimit()}].' })
  limit?: string = '20';

  @ApiPropertyOptional({
    description: 'Sắp xếp kết quả, ví dụ: {"userDeadline":1}',
  })
  @IsOptional()
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
  room?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  isExport?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  countOnly?: string;
}
export class ExtendDeadlineItemDto {
  @ApiProperty({ description: 'ID của bản ghi audit cần gia hạn', type: Number })
  @IsNotEmpty({ message: 'auditId không được để trống.' })
  @IsNumber({}, { message: 'auditId phải là một số.' })
  auditId: number;

  @ApiProperty({
    description: 'Hạn xử lý mới',
    example: '2026-12-31T17:00:00.000Z',
  })
  @IsNotEmpty({ message: 'newDeadline không được để trống.' })
  @IsDateString({}, { message: 'newDeadline phải là một chuỗi ngày tháng hợp lệ.' })
  newDeadline: string;
}

export class ExtendDeadlineDto {
  @ApiProperty({
    description: 'Danh sách các mục cần gia hạn',
    type: [ExtendDeadlineItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtendDeadlineItemDto)
  items: ExtendDeadlineItemDto[];
}


export class IncomingStatisticsByTimeDto {
  @ApiPropertyOptional({
    description: 'Từ khoá tìm kiếm (lọc tìm kiếm)'
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Các trường áp dụng tìm kiếm, dạng chuỗi phân tách dấu phẩy: all,toBook,note. Ví dụ: "toBook,note"',
  })
  @IsOptional()
  @IsString()
  searchFields?: string;

  @ApiPropertyOptional({
    description: 'Filter object (JSON string)',
    type: 'string',
    example: '{"field":"value"}',
  })
  @IsOptional()
  @IsObject()
  @IsValidDateRangeFilter()
  filter?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Trang hiện tại', default: '1' })
  @IsOptional()
  @IsPositiveIntString(1, { message: 'Page phải là số nguyên >= 1.' })
  page?: string = '1';

  @ApiPropertyOptional({ description: 'Số bản ghi trên mỗi trang', default: '20' })
  @IsOptional()
  @IsPagedLimit({ message: 'Limit phải là số nguyên trong khoảng [1, ${getMaxPageLimit()}].' })
  limit?: string = '20';

  @ApiPropertyOptional({
    description: 'Sắp xếp kết quả, ví dụ: {"receiveDate":1}',
  })
  @IsOptional()
  @IsValidSort()
  sort?: Record<string, any>;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  isExport?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  countOnly?: string;
}

export class ListDocumentsNoTypeDto {
  @ApiPropertyOptional({
    description: 'Đường dẫn file BPMN (mặc định dùng LuongGhepGiaoDien.bpmn)',
  })
  @IsOptional()
  @IsString()
  bpmn?: string;

  @ApiPropertyOptional({
    description: 'ID người dùng hiện tại (tự động lấy từ token nếu có)',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Danh sách vai trò của người dùng, phân tách bằng dấu phẩy',
  })
  @IsOptional()
  @IsString()
  roles?: string;

  @ApiPropertyOptional({
    description:
      'Loại văn bản (urgent, deadline, other, waiting, processed, receive, incompleted, completed)',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Filter object (JSON string)',
    type: 'string',
    example: '{"field":"value"}',
  })
  @IsOptional()
  @IsObject()
  @IsValidDateRangeFilter()
  filter?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Trang hiện tại', default: '1' })
  @IsOptional()
  @IsPositiveIntString(1, { message: 'Page phải là số nguyên >= 1.' })
  page?: string = '1';

  @ApiPropertyOptional({ description: 'Số bản ghi trên mỗi trang', default: '20' })
  @IsOptional()
  @IsPagedLimit({ message: 'Limit phải là số nguyên trong khoảng [1, ${getMaxPageLimit()}].' })
  limit?: string = '20';

  @ApiPropertyOptional({
    description: 'Sắp xếp kết quả, ví dụ: {"userDeadline":1}',
  })
  @IsOptional()
  @IsValidSort()
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

  @IsOptional()
  @IsString()
  @IsBooleanString()
  isExport?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  countOnly?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  outgoingId?: string;

  @ApiPropertyOptional({
    description: 'Mã hoặc tên luồng quy trình BPMN, dùng để lọc văn bản theo quy trình (VD: VAN_BAN_DI hoặc Quy trình văn bản đi)',
  })
  @IsOptional()
  @IsString()
  bpmnVersion?: string;
}
