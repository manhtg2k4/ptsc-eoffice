import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReservationStatus } from '../entities/document-number-reservation.entity';

export class CreateReservationDto {
  @ApiProperty({ description: 'ID sổ văn bản (book_document_id)' })
  @IsNotEmpty({ message: 'bookDocumentId không được để trống' })
  @IsNumber({}, { message: 'bookDocumentId phải là số' })
  bookDocumentId: number;

  @ApiPropertyOptional({ description: 'Số văn bản cần giữ (nếu trống hệ thống tự cấp)' })
  @IsOptional()
  @IsNumber({}, { message: 'reservedNumber phải là số' })
  reservedNumber?: number;

  @ApiPropertyOptional({ description: 'Ghi chú giữ số' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Danh sách ID người dùng giữ số (userId)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subscriberUserIds?: string[];
}

export class UpdateReservationDto {
  @ApiPropertyOptional({ description: 'Ghi chú giữ số' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái: 1 - Đang giữ, 2 - Đã sử dụng, 3 - Đã hủy',
    enum: ReservationStatus,
  })
  @IsOptional()
  @Type(() => Number)
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional({
    description: 'Danh sách ID người dùng giữ số (userId)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subscriberUserIds?: string[];
}

export class FilterReservationDto {
  @ApiPropertyOptional({ description: 'ID sổ văn bản' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bookDocumentId?: number;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái: 1 (Đang giữ), 2 (Đã dùng)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1, description: 'Trang hiện tại' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 20, description: 'Số lượng mục trên mỗi trang' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
