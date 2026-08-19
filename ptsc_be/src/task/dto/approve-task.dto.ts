import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class ApproveTaskDto {
  @ApiProperty({ description: 'ID công việc' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsNotEmpty()
  taskId: number;

  @ApiProperty({ description: 'ID của work item cần xử lý' })
  @IsString()
  @IsNotEmpty()
  workItemId: string;

  @ApiProperty({ description: 'Mã hành động (VD: DONG_Y, TU_CHOI)' })
  @IsString()
  @IsNotEmpty()
  actionCode: string;

  @ApiPropertyOptional({ description: 'Ghi chú phê duyệt' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Người được giao xử lý tiếp theo (nếu có)' })
  @IsOptional()
  @IsString()
  assigneeUserId?: string;
}