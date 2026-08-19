// src/crmsource/dto/update-crmsource-data.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCrmSourceDataDto {
  @ApiPropertyOptional({ description: 'Tiêu đề của mục dữ liệu', example: 'Khách hàng mới' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Giá trị của mục dữ liệu', example: 'new_customer' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  value?: string;
}
