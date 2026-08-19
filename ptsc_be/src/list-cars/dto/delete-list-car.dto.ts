import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class DeleteListCarDto {
  @ApiProperty({
    example: ['LC-20260303033628-DD8TZLAN'],
    description: 'Danh sách ID xe cần xóa',
  })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
