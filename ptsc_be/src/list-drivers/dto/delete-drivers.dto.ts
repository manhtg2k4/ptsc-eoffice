import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class DeleteDriversDto {
  @ApiProperty({ example: ['DR-20260316155843-677JPXEN'], description: 'Danh sách ID tài xế cần xóa' })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
