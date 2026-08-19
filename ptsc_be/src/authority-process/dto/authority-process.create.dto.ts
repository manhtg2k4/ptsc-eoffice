import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsArray } from 'class-validator';

export class CreateAuthorityProcessDto {
  @ApiProperty({ description: 'ID người được ủy quyền' })
  @IsString()
  @IsNotEmpty()
  authorized: string;

  @ApiProperty({ description: 'Ngày bắt đầu ủy quyền', example: '2025-12-01T00:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Ngày kết thúc ủy quyền', example: '2025-12-31T23:59:59Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'Danh sách file kèm', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  files?: string[];
}
