import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomSenderUnitDto {
  @ApiProperty({ description: 'Tên đơn vị gửi', example: 'Công ty ABC' })
  @IsNotEmpty({ message: 'Tên đơn vị không được để trống' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Mã đơn vị gửi', example: 'ABC' })
  @IsNotEmpty({ message: 'Mã đơn vị không được để trống' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'ID đơn vị cha', example: null })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Có phải đơn vị gửi hay không',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isSenderUnit?: boolean;
}
