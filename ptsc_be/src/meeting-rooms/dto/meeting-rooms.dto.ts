import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Min, IsObject, IsInt, IsString, IsBooleanString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { IsValidDateRangeFilter } from 'src/documents/dto/list-type.map';

export class ListMeetingRoomsDto {
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

  @ApiPropertyOptional({ description: 'Filter object' })
  @IsOptional()
  @IsObject()
  @IsValidDateRangeFilter()
  filter?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Trang hiện tại', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số bản ghi trên mỗi trang', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sắp xếp kết quả, ví dụ: {"capacity":1}' })
  @IsOptional()
  @IsObject()
  sort?: Record<string, 1 | -1>;

  @ApiProperty({ description: 'Mã danh sách (process function)' })
  @IsNotEmpty()
  @IsString()
  processFn: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  authority?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  isExport?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  isListDynamic?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  view?: string;
}
export class RoomAvailabilityResponseDto {
  @ApiProperty({ description: 'Phòng có sẵn hay không' })
  available: boolean;

  @ApiProperty({ description: 'Thông báo' })
  message: string;

  @ApiProperty({ description: 'Danh sách lịch họp đang diễn ra', required: false })
  activeMeetings?: {
    id: string;
    title: string;
    meetingDate: string;
    meetingTime: string;
    statusCode: string;
  }[];
}