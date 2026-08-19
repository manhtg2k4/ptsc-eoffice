import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsArray, IsBoolean } from 'class-validator';

export class UpdateAuthorityProcessDto {
  @ApiProperty({ description: 'ID người được ủy quyền', required: false })
  @IsOptional()
  @IsString()
  authorized?: string;

  @ApiProperty({ description: 'Ngày bắt đầu ủy quyền', required: false, example: '2025-12-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'Ngày kết thúc ủy quyền', required: false, example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Danh sách file kèm', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  files?: string[];

  @ApiProperty({ description: 'Cập nhật này có kết thúc ủy quyền ngay lập tức hay không', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isForceEnd?: boolean;
}
