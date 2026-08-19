import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  Max,
  MaxLength,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LayoutItemInputDto } from './create-meeting-rooms.dto';

class AmenityInputDto {
  @IsString()
  @IsNotEmpty()
  amenityId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class UpdateMeetingRoomDto {
  @ApiPropertyOptional({ example: 'Phòng họp Beta' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Tòa B - Tầng 3' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  capacity?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  @Type(() => Number)
  status?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  @Type(() => Number)
  stage?: number;

  @ApiPropertyOptional({ example: '2026-01-01T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @ApiPropertyOptional({ example: 'BOARDROOM' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  layoutType?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  layoutRows?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  layoutCols?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsInt()
  @Min(1)
  layoutSeats?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  layoutBlocks?: number;

  @ApiPropertyOptional({ example: 100 })
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
    description: 'Nếu gửi field này, sẽ replace toàn bộ amenities cũ',
    example: [
      { amenityId: '20260105100000-PROJ01', quantity: 3 },
      { amenityId: '20260105100000-WHITEBOARD01', quantity: 1 }
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
    description: 'Danh sách các vật thể bố trí trong phòng họp (sẽ thay thế toàn bộ danh sách cũ)'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LayoutItemInputDto)
  layoutItems?: LayoutItemInputDto[];
}