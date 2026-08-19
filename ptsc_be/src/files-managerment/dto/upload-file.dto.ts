import { IsArray, IsNotEmpty, IsNumber } from "class-validator";

export class UploadFileDto {
  object_type: string;
  object_id: string;
  parent_id?: number;
  description?: string;
  edit_file_id?: number;
  signed_file_id?: string | number;
  typeSize?: string;
  is_important?: boolean | string;
  isImportant?: boolean | string;
  isCertifiedCopy?: boolean | string;
  isUpdate?: boolean;
}
export class DeleteFilesDto {
  @IsArray()
  @IsNotEmpty()
  @IsNumber({}, { each: true })
  ids: number[];
}
export class DownloadMultiDto {
  ids: number[];
}

