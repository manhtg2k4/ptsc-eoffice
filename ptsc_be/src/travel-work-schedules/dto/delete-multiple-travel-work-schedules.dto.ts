import {
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for deleting multiple travel work schedules
 */
export class DeleteMultipleTravelWorkSchedulesDto {
  @ApiProperty({
    example: ['TWS_1705632000000_A1B2C3D4', 'TWS_1705718400000_E5F6G7H8'],
    description: 'Danh sách ID các lịch công tác cần xóa',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  ids: string[];
}