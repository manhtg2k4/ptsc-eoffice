import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskAssignmentConfigDto {
  @ApiProperty({ description: 'ID phòng ban' })
  @IsString()
  @IsNotEmpty()
  unitId: string;

  @ApiProperty({ description: 'Danh sách ID người nhận công việc' })
  @IsString({ each: true })
  @IsNotEmpty()
  userIds: string[];

  @ApiProperty({ description: 'Trạng thái (1: Hoạt động, 0: Tắt)', default: 1 })
  @IsNumber()
  @IsOptional()
  status?: number;
}
