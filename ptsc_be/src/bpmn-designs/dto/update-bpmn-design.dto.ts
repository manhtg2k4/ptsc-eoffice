import { IsString, IsOptional, IsArray, IsEnum, Validate, IsBoolean } from 'class-validator'; import { isValidName } from 'src/utils/util';

import { STATUS } from 'src/variables/CONST_STATUS';

export class FieldDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsEnum(['string', 'text', 'number', 'date', 'boolean', 'enum', 'long'])
  @IsOptional()
  type?: 'string' | 'text' | 'number' | 'date' | 'boolean' | 'enum' | 'long';
  defaultValue?: string | number | Date;

}

export class UpdateBpmnDesignDto {
  @IsString()
  @IsOptional()
  @Validate(isValidName, {
    message: 'Tên form không được chứa ký tự đặc biệt',
  })
  name?: string;
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  processKey?: string;

  // @IsArray()
  // @IsOptional()
  // fields?: FieldDto[];

  // @IsEnum(STATUS)
  // @IsOptional()
  // status?: number;
  @IsString()
  base64File?: string;

  @IsString()
  description?: string;

  @IsBoolean()
  @IsOptional()
  hasStartForm?: boolean;

  @IsBoolean()
  @IsOptional()
  showInPermissionDetail?: boolean;

  @IsString()
  startFormId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  unit?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  relatedProcesses?: string[];

  @IsString()
  documentType?: string;

  @IsString()
  processSelect?: string;
}