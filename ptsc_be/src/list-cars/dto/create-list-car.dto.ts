import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateListCarDto {
  @ApiProperty({ description: 'Biển số xe', example: '51A-123.45' })
  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @ApiProperty({ description: 'Loại xe', example: '7 chỗ' })
  @IsString()
  @IsNotEmpty()
  carType: string;

  @ApiProperty({ description: 'Hãng xe', example: 'TOYOTA INNOVA' })
  @IsString()
  @IsNotEmpty()
  brand: string;

  @ApiPropertyOptional({ description: 'Số chỗ ngồi', example: 7 })
  @IsNumber()
  @IsOptional()
  seatCount?: number;

  @ApiProperty({ description: 'Người quản lý', example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  manager: string;

  @ApiProperty({ description: 'Trạng thái', example: 'Sẵn sàng' })
  @IsString()
  @IsNotEmpty()
  statusCar: string;

  @ApiPropertyOptional({ description: 'Ghi chú', example: 'Ghi chú' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: 'Bảo dưỡng định kỳ', example: 'co' })
  @IsString()
  @IsOptional()
  maintenance?: string;
}
