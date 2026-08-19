import { IsOptional, IsInt, Min, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TopicFilterDto {
  @IsOptional()
  @IsString({ message: 'Tên tìm kiếm phải là chuỗi' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Đường dẫn tìm kiếm phải là chuỗi' })
  href?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ each: true, message: 'Trạng thái không hợp lệ' })
  status?: number | number[];

  @IsOptional()
  requiresApproval?: string | boolean;
}

export class ListTopicDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên' })
  @Min(1, { message: 'Trang phải lớn hơn hoặc bằng 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit phải là số nguyên' })
  @Min(1, { message: 'Limit phải lớn hơn hoặc bằng 1' })
  limit?: number = 10;

  @IsOptional()
  @ValidateNested()
  @Type(() => TopicFilterDto)
  filter?: TopicFilterDto;

  @IsOptional()
  @IsString({ message: 'isExport phải là chuỗi' })
  isExport?: string;

  @IsOptional()
  @IsString({ message: 'Tên tìm kiếm phải là chuỗi' })
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ each: true, message: 'Trạng thái không hợp lệ' })
  status?: number | number[];

  @IsOptional()
  @IsString({ message: 'Đường dẫn tìm kiếm phải là chuỗi' })
  href?: string;

  @IsOptional()
  requiresApproval?: string | boolean;
}
