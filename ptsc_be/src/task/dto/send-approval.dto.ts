import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class SendApprovalDto {
  @ApiProperty({ description: 'ID công việc' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsNotEmpty()
  taskId: number;

  @ApiProperty({ description: 'Mã hành động (VD: GUI_PHE_DUYET)' })
  @IsString()
  @IsNotEmpty()
  actionCode: string;

  @ApiPropertyOptional({ description: 'Ghi chú phê duyệt' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Danh sách ID file đính kèm' })
  @IsOptional()
  @IsArray()
  files?: string[];

  @ApiPropertyOptional({ description: 'Người được giao xử lý tiếp theo (nếu có)' })
  @IsOptional()
  @IsString()
  assigneeUserId?: string;
}