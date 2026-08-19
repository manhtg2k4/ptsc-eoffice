import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDelegationDto {
  @ApiProperty({ description: 'ID người uỷ quyền', required: false })
  @IsString()
  @IsOptional()
  fromUserId?: string;

  @ApiProperty({ description: 'ID người được uỷ quyền' })
  @IsString()
  @IsNotEmpty()
  toUserId: string;

  @ApiProperty({ description: 'Ngày bắt đầu' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'Ngày kết thúc' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ description: 'Trạng thái (1: Hoạt động, 0: Tắt)', default: 1 })
  @IsNumber()
  @IsOptional()
  status?: number;
}
