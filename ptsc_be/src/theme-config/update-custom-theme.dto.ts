import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class UpdateCustomThemeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Tên cấu hình theme không được để trống' })
  name?: string;

  @IsOptional()
  @IsObject()
  @IsNotEmpty({ message: 'Cấu hình theme không được để trống' })
  options?: Record<string, any>;
}