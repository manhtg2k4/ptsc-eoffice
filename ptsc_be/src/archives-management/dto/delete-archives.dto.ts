import {
  IsNotEmpty,
  IsArray,
  IsInt,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO cho API xóa nhiều hồ sơ
 */
export class DeleteManyArchivesDto {
  @ApiProperty({
    description: 'Danh sách ID hồ sơ cần xóa',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsNotEmpty({ message: 'Danh sách ID không được để trống' })
  @IsArray({ message: 'Danh sách ID phải là mảng' })
  @ArrayMinSize(1, { message: 'Danh sách ID phải có ít nhất 1 phần tử' })
  @IsInt({ each: true, message: 'Mỗi ID phải là số nguyên' })
  @Min(1, { each: true, message: 'Mỗi ID phải lớn hơn 0' })
  @Type(() => Number)
  ids!: number[];
}
