import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class CreateCustomThemeDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên cấu hình theme không được để trống' })
  name: string;

  @IsObject()
  @IsNotEmpty({ message: 'Cấu hình theme không được để trống' })
  options: Record<string, any>;

  // userId sẽ được lấy từ request (ví dụ: req.user.userId)
  // và không cần truyền trực tiếp từ client
}