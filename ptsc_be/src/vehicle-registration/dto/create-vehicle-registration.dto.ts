import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, IsObject, IsBooleanString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { WorkItemDto } from 'src/meeting/dto/meeting-participants.dto';
import { IsPositiveIntString, IsValidSort } from './list-type.map';
import { IsPagedLimit, clampLimit } from '../../utils/pagination.validator';
export class CoordinationInformationDto {
  @IsString()
  carId: string;

  @IsString()
  driverId?: string;
}
export class CreateVehicleRegistrationDto {
  @ApiProperty({ example: 'Đi thành phố' })
  @IsString()
  @IsNotEmpty()
  requestType: string;

  @ApiProperty({ example: 'Bình thường', required: false })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiProperty({ example: 'Có', required: false })
  @IsString()
  @IsOptional()
  isImportantGuest?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  passengerCount: number;

  @ApiProperty({ example: '2026-02-10T08:00:00Z' })
  @IsDateString()
  departureTime: string;

  @ApiProperty({ example: '2026-02-10T17:00:00Z' })
  @IsDateString()
  returnTime: string;

  @ApiProperty({ example: 'Số 1 Đại học Bách Khoa' })
  @IsString()
  @IsNotEmpty()
  departurePoint: string;

  @ApiProperty({ example: 'Số 102 Trần Phú' })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  contactPerson: string;

  @ApiProperty({ example: '0987654321' })
  @IsString()
  @IsNotEmpty()
  contactPhone: string;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  totalPeople?: number;

  @ApiProperty({ example: 'Công tác tại chi nhánh', required: false })
  @IsString()
  @IsOptional()
  purpose?: string;

  @ApiProperty({ example: 'Ghi chú thêm', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusCode?: string;

  @ApiPropertyOptional({ example: 'v1.0' })
  @IsOptional()
  bpmnVersion?: string;

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
  actionCode?: string;

  
  @IsOptional()
  @IsString()
  flowConfig?: string;

  
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkItemDto)
  workItem?: WorkItemDto;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  isExport?: string;

  @ApiPropertyOptional({
    description: 'Thông tin điều phối xe',
    type: CoordinationInformationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinationInformationDto)
  coordinationInformation?: CoordinationInformationDto[]

  @ApiPropertyOptional({ example: 'Đổi xe xịn hơn đi' })
  @IsOptional()
  @IsString()
  noteDetail?: string;
}
