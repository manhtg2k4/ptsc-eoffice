import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateMenuManagerDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string; // Tên menu

  @IsOptional()
  @IsString()
  @MaxLength(255)
  code?: string; // Mã menu

  @IsOptional()
  @IsNumber()
  order?: number; // Thứ tự sắp xếp

  @IsOptional()
  @IsString()
  parent?: string; // ID cha

  @IsOptional()
  @IsString()
  @MaxLength(255)
  function?: string; // code feature//

  @IsOptional()
  @IsString()
  // @MaxLength(255)
  settingIcon?: string;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean; // Ẩn/hiện

  @IsOptional()
  @IsBoolean()
  collapsed?: boolean;

  @IsOptional()
  @IsString({ each: true })
  roleGroupIds?: string[]; // IDs nhóm quyền

  @IsOptional()
  @IsString()
  @MaxLength(255)
  codeRouter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  codeApp?: string;
}


export class UpdateMenuManagerDto extends CreateMenuManagerDto {
  @IsOptional()
  @IsBoolean()
  dynamicMenu?: boolean;
}
