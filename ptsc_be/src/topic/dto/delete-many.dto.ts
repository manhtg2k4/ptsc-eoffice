import { IsArray, ArrayNotEmpty, IsUUID } from 'class-validator';

export class DeleteManyDto {
  @IsArray({ message: 'Danh sách ids phải là một mảng' })
  @ArrayNotEmpty({ message: 'Danh sách ids không được để trống' })
  @IsUUID('4', { each: true, message: 'Mỗi id phải là UUID hợp lệ' })
  ids: string[];
}
