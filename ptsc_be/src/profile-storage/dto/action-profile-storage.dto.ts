import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ActionProfileStorageDto {
  @IsOptional()
  @IsString({ message: 'Ghi chú/ý kiến phải là chuỗi' })
  @MaxLength(500, { message: 'Ghi chú/ý kiến không được vượt quá 500 ký tự' })
  comment?: string;

  @IsOptional()
  @IsString({ message: 'Người thực hiện phải là chuỗi' })
  @MaxLength(100, { message: 'Người thực hiện không được vượt quá 100 ký tự' })
  actedBy?: string;
}

