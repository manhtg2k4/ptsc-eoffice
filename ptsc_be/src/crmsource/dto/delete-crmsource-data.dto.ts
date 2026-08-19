// src/crmsource/dto/delete-crmsource-data.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class DeleteCrmSourceDataDto {
  @ApiProperty({ description: 'Mảng các ID của mục dữ liệu cần xóa', type: [String] })
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  ids: string[];
}
