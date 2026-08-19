import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateFileLocationDto {
  @ApiPropertyOptional({ description: "Loại đối tượng liên quan. Ví dụ: 'document', 'user_profile'", default: 'default' })
  @IsString()
  @IsOptional()
  object_type?: string;

  @ApiPropertyOptional({ description: 'ID của đối tượng mà file này liên quan', default: '0' })
  @IsString()
  @IsOptional()
  object_id?: string;

  @ApiPropertyOptional({
    type: 'number',
    description: "Tùy chọn: ID của thư mục cha trong bảng 'files'",
  })
  @IsNumber()
  @IsOptional()
  parent_id?: number;
}
