import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class CreateDriverHealthCheckDto {
  @ApiProperty({ example: 'DR-20260303014836-2SR5BF6L' })
  @IsNotEmpty()
  @IsString()
  driverId: string;

  @ApiProperty({ example: '2026-03-03' })
  @IsNotEmpty()
  checkupDate: string;

  @ApiProperty({ example: [], required: false })
  @IsOptional()
  @IsArray()
  attachments?: any[];

  @ApiProperty({ example: 'Ghi chú khám sức khỏe', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateDriverHealthCheckDto extends CreateDriverHealthCheckDto {}
