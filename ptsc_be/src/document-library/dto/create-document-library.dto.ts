import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, IsNumber } from 'class-validator';

export class CreateDocumentLibraryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['folder', 'file'])
  @IsNotEmpty()
  type: string;

  @IsNumber()
  @IsOptional()
  parentId?: number;

  @IsString()
  @IsOptional()
  fileType?: string;

  @IsString()
  @IsOptional()
  editOrganizationUnit?: string;

  @IsArray()
  @IsOptional()
  viewPermissions?: string[];

  @IsArray()
  @IsOptional()
  editPermissions?: string[];

  @IsArray()
  @IsOptional()
  viewUserPermissions?: string[];
}
