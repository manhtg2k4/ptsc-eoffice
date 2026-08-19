import {
  IsString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Min,
  Max,
  MaxLength,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  IsObject,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LayoutItemType } from '../meeting-rooms.enum';

class AmenityInputDto {
  @ApiProperty({ example: '20260105100000-AMENITY01' })
  @IsString()
  @IsNotEmpty()
  amenityId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class LayoutItemInputDto {
  @ApiProperty({ example: 'CHAIR', enum: LayoutItemType })
  @IsEnum(LayoutItemType)
  @IsNotEmpty()
  itemType: LayoutItemType;

  @ApiPropertyOptional({ example: 'VIP' })
  @IsString()
  @IsOptional()
  subType?: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  row: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  col: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  rowSpan?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  colSpan?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  rotation?: number;

  @ApiPropertyOptional({ example: 'A1' })
  @IsString()
  @IsOptional()
  seatNumber?: string;

  @ApiPropertyOptional({ example: 'Ghế đại biểu' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ example: { color: '#ffffff' } })
  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;
}

export class CreateMeetingRoomDto {
  @ApiProperty({ example: 'Phòng họp Alpha' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Tòa A - Tầng 5' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  location?: string;

  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  capacity: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(99)
  @Type(() => Number)
  status: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(99)
  @Type(() => Number)
  stage: number;

  @ApiPropertyOptional({ example: '2026-01-01T07:00:00Z' })
  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @ApiPropertyOptional({ example: 'THEATER' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  layoutType?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  layoutRows?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  layoutCols?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  layoutSeats?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  layoutBlocks?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  totalSeating?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  layoutColWing?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  layoutRowBottom?: number;

  @ApiPropertyOptional({ description: 'Thứ tự hiển thị', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  order?: number;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1497366216548-37526070297c',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  image?: string;

  @ApiPropertyOptional({
    example: [
      { amenityId: '20260105100000-PROJ01', quantity: 2 },
      { amenityId: '20260105100000-CHAIR01', quantity: 20 }
    ],
    type: [AmenityInputDto]
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AmenityInputDto)
  amenities?: AmenityInputDto[];

  @ApiPropertyOptional({
    type: [LayoutItemInputDto],
    description: 'Danh sách các vật thể bố trí trong phòng họp'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LayoutItemInputDto)
  layoutItems?: LayoutItemInputDto[];
}