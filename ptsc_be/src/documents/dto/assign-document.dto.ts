import { IsArray, ArrayNotEmpty, IsString } from 'class-validator';

export class AssignBookDto {
  @IsArray({ message: 'documentIds phải là mảng string' })
  @ArrayNotEmpty({ message: 'documentIds là mảng không được để trống' })
  @IsString({ each: true, message: 'Mỗi phần tử trong documentIds phải là string' })
  documentIds: string[];

  @IsString({ message: 'bookDocumentId phải là string' })
  bookDocumentId: string;
}
