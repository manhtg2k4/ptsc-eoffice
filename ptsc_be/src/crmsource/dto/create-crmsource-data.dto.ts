// src/crmsource/dto/create-crmsource-data.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCrmSourceDataDto {
  @ApiProperty({ description: 'Tiêu đề của mục dữ liệu', example: 'Khách hàng tiềm năng' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Giá trị của mục dữ liệu', example: 'lead' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  value: string;
}
