import { IsDefined, IsString, MaxLength, IsInt, Min, IsIn, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTopicDto {
  @IsDefined({ message: 'Tên chủ đề là trường bắt buộc' })
  @IsString({ message: 'Tên chủ đề phải là chuỗi' })
  @MaxLength(255, { message: 'Tên chủ đề không dài quá 255 ký tự' })
  name: string;

  @IsDefined({ message: 'Đường dẫn (href) là trường bắt buộc' })
  @IsString({ message: 'Đường dẫn phải là chuỗi' })
  @MaxLength(255, { message: 'Đường dẫn không dài quá 255 ký tự' })
  href: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Thứ tự hiển thị phải là số nguyên' })
  @Min(0, { message: 'Thứ tự hiển thị phải lớn hơn hoặc bằng 0' })
  displayOrder?: number;

  @IsDefined({ message: 'Trạng thái là trường bắt buộc' })
  @Type(() => Number)
  @IsInt({ message: 'Trạng thái không hợp lệ' })
  @IsIn([1, 2], { message: 'Trạng thái phải là 0 (ẩn), 1 (hiển thị), hoặc 2 (không hoạt động)' })
  status: number;

  @IsOptional()
  @IsBoolean({ message: 'Cần phê duyệt phải là giá trị boolean' })
  @Type(() => Boolean)
  requiresApproval?: boolean = false;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  @MaxLength(4000, { message: 'Mô tả không dài quá 4000 ký tự' })
  description?: string;
}
