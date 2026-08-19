import { IsArray, IsMongoId, ArrayNotEmpty } from 'class-validator';

export class DeleteMultipleDto {
  @IsArray({ message: 'ids phải là một mảng' })
  @ArrayNotEmpty({ message: 'Danh sách ids không được để trống' })
  @IsMongoId({ each: true, message: 'Mỗi ID trong danh sách phải là một MongoID hợp lệ' })
  ids: string[];
}