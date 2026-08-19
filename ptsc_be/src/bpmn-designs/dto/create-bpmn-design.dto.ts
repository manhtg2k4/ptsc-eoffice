import { IsString, IsNotEmpty, IsArray, IsEnum, IsOptional, Validate, IsBoolean } from 'class-validator';
import { hasVietnameseDiacritics, isValidName } from 'src/utils/util';
import { STATUS } from 'src/variables/CONST_STATUS';

export class FieldDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsEnum(['string', 'text', 'number', 'date', 'boolean', 'enum', 'long'])
  type: 'string' | 'text' | 'number' | 'date' | 'boolean' | 'enum' | 'long';

  defaultValue?: string | number | Date;
}

export class CreateBpmnDesignDto {
  @IsString()
  @IsNotEmpty()
  @Validate(hasVietnameseDiacritics, {
    message: 'Mã form không được chứa ký tự đặc biệt và phải không dấu',
  })
  id: string;

  @IsString()
  @IsNotEmpty()
  @Validate(isValidName, {
    message: 'Tên form không được chứa ký tự đặc biệt',
  })
  name: string;

  @IsArray()
  @IsOptional()
  fields?: FieldDto[]; // ✅ thêm lại đây

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

  @IsString()
  @IsOptional()
  processKey?: string;
}
