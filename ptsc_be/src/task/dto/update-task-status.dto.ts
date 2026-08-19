import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateTaskStatusDto {
  @ApiProperty({
    description:
      'Trạng thái mới của công việc (vd: 1 = hoạt động, 0 = vô hiệu)',
    example: 'processing',
  })
  @IsString()
  processStatus: string;
}
