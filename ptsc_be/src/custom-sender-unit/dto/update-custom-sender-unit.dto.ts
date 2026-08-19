import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomSenderUnitDto {
  @ApiPropertyOptional({ description: 'Tên đơn vị gửi' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Mã đơn vị gửi' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'ID đơn vị cha' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
