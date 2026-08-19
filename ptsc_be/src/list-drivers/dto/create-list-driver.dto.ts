import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsDateString } from 'class-validator';

export class CreateListDriverDto {
  @ApiProperty({ description: 'Họ và tên tài xế', example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Số điện thoại', example: '0987654321' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: 'Số CMND/CCCD', example: '012345678901' })
  @IsString()
  @IsNotEmpty()
  idCard: string;

  @ApiPropertyOptional({ description: 'Email', example: 'taixe123@gmail.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ', example: 'Hà Nội' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'Số bằng lái', example: 'GZX123456' })
  @IsString()
  @IsNotEmpty()
  licenseNumber: string;

  @ApiProperty({ description: 'Hạng bằng', example: 'B2' })
  @IsString()
  @IsNotEmpty()
  licenseClass: string;

  @ApiProperty({ description: 'Ngày cấp bằng', example: '2020-01-01' })
  @IsDateString()
  @IsNotEmpty()
  licenseIssuedDate: string;

  @ApiPropertyOptional({ description: 'Ghi chú', example: 'Ghi chú' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: 'Trạng thái tài xế (1: Đang hoạt động, 2: Ngừng hoạt động)', example: '1' })
  @IsString()
  @IsOptional()
  statusDriver?: string;
}

