import { IsOptional } from "class-validator";

export class CreateFolderDto {
  @IsOptional()
  folder_name: string;
  @IsOptional()
  parent_id?: number;
  @IsOptional()
  description?: string;
  @IsOptional()
  is_directory?: boolean;
  @IsOptional()
  object_type?: string;
  @IsOptional()
  object_id?: string;
}
