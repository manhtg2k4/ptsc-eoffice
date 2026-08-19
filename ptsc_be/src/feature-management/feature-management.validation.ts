import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  Matches,
  IsInt,
  Min,
  IsIn,
  IsArray,
  IsObject,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CriteriaItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  operator: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsOptional()
  processId?: string;
}
export class CreateFeatureManagementDto {
  @IsNotEmpty({ message: 'Mã chức năng là trường bắt buộc!' })
  @IsString({ message: 'Mã chức năng phải là chuỗi!' })
  @MaxLength(20, { message: 'Độ dài Mã chức năng không được quá 20 ký tự!' })
  @Matches(/^\S+(\s\S+)*$/, {
    message:
      'Mã chức năng không được có khoảng trắng ở đầu, cuối hoặc nhiều hơn một khoảng trắng.',
  })
  @Transform(({ value }) => value.trim())
  code: string;

  @IsString()
  formCode: string;
  @IsNotEmpty({ message: 'Tên chức năng là trường bắt buộc!' })
  @IsString({ message: 'Tên chức năng phải là chuỗi!' })
  @MaxLength(100, { message: 'Độ dài tên chức năng không được quá 100 ký tự!' })
  @Matches(/^\S+(\s\S+)*$/, {
    message:
      'Tên chức năng không được có khoảng trắng ở đầu, cuối hoặc nhiều hơn một khoảng trắng.',
  })
  @Transform(({ value }) => value.trim())
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriteriaItemDto)
  criteria: CriteriaItemDto[];

  @IsOptional()
  @IsString({ message: 'Giữ liệu cấp cha không hợp lê !' })
  parentId?: string;

  @IsOptional()
  @Type(() => Boolean) // ép "true"/"false" string thành boolean
  @IsBoolean({ message: 'Dữ liệu không hợp lệ!' })
  isFollowAssignee?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'Dữ liệu không hợp lệ!' })
  isAuthorized?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'Dữ liệu không hợp lệ!' })
  isHideTitle?: boolean;

  @IsOptional()
  @IsString()
  authorizedFunction?: string;

  @IsOptional()
  @IsString()
  inheritSubTabFunction?: string;

  @IsOptional()
  @IsBoolean({ message: 'Dữ liệu không hợp lệ!' })
  isInheritSubTab?: boolean;

  @IsOptional()
  @IsString()
  customComponent?: string;

  @IsOptional()
  @IsString()
  processID?: string;

  @IsOptional()
  @IsString({ message: 'URL phải là chuỗi!' })
  @Transform(({ value }) => value?.trim())
  url?: string;

  @IsOptional()
  @IsString({ message: 'API URL phải là chuỗi!' })
  @Transform(({ value }) => value?.trim())
  apiUrl?: string;

  @IsOptional()
  @IsString({ message: 'API URL children phải là chuỗi!' })
  @Transform(({ value }) => value?.trim())
  apiUrlChildren?: string;

  // @IsOptional()
  // @IsInt({ message: 'Số thứ tự phải là số nguyên!' })
  // @Min(1, { message: 'Số thứ tự phải lớn hơn hoặc bằng 1!' })
  // order?: number;

  @IsOptional()
  @IsIn(['0', '1'], {
    message: 'Trạng thái không hợp lệ! (chỉ chấp nhận "0" hoặc "1")',
  })
  statusFeature?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  updatedBy?: string;

  @IsOptional()
  @IsString()
  featureType?: string;

  @IsOptional()
  @IsInt()
  status?: number;

  @IsOptional()
  @IsString()
  processId?: string;

  @IsOptional()
  @IsArray({ message: 'fields phải là array hợp lệ!' })
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return value;
    }
  })
  fields?: any[];

  @IsOptional()
  @IsObject({ message: 'value phải là object hợp lệ!' })
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return value;
    }
  })
  valueField?: Record<string, any>;

  @IsOptional()
  @IsArray({ message: 'countList phải là array hợp lệ!' })
  @Transform(({ value }) => {
    try {
      if (typeof value === 'string') {
        const cleaned = value.trim().replace(/^'|'$/g, '');
        return JSON.parse(cleaned);
      }
      return value;
    } catch {
      return value;
    }
  })
  countList?: any[];
}

export class updateFeatureManagementDto {
  @IsNotEmpty({ message: 'Mã chức năng là trường bắt buộc!' })
  @IsString({ message: 'Mã chức năng phải là chuỗi!' })
  @MaxLength(20, { message: 'Độ dài Mã chức năng không được quá 20 ký tự!' })
  @Matches(/^\S+(\s\S+)*$/, {
    message:
      'Mã chức năng không được có khoảng trắng ở đầu, cuối hoặc nhiều hơn một khoảng trắng.',
  })
  @Transform(({ value }) => value.trim())
  code: string;

  @IsOptional()
  @IsString()
  customComponent?: string;
  @IsNotEmpty({ message: 'Tên chức năng là trường bắt buộc!' })
  @IsString({ message: 'Tên chức năng phải là chuỗi!' })
  @MaxLength(100, { message: 'Độ dài tên chức năng không được quá 100 ký tự!' })
  @Matches(/^\S+(\s\S+)*$/, {
    message:
      'Tên chức năng không được có khoảng trắng ở đầu, cuối hoặc nhiều hơn một khoảng trắng.',
  })
  @Transform(({ value }) => value.trim())
  name: string;

  @IsString()
  formCode: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriteriaItemDto)
  criteria: CriteriaItemDto[];

  @IsOptional()
  @IsString({ message: 'Giữ liệu cấp cha không hợp lê !' })
  parentId?: string;

  @IsOptional()
  @Type(() => Boolean) // ép "true"/"false" string thành boolean
  @IsBoolean({ message: 'Dữ liệu không hợp lệ!' })
  isFollowAssignee?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'Dữ liệu không hợp lệ!' })
  isHideTitle?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'Dữ liệu không hợp lệ!' })
  isAuthorized?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'Dữ liệu không hợp lệ!' })
  isCount?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'Dữ liệu không hợp lệ!' })
  isParentChild?: boolean;

  @IsOptional()
  @IsString()
  authorizedFunction?: string;

  @IsOptional()
  @IsString()
  inheritSubTabFunction?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'Dữ liệu không hợp lệ!' })
  isInheritSubTab?: boolean;

  @IsOptional()
  @IsString({ message: 'URL phải là chuỗi!' })
  @Transform(({ value }) => value?.trim())
  url?: string;

  @IsOptional()
  @IsString({ message: 'API URL phải là chuỗi!' })
  @Transform(({ value }) => value?.trim())
  apiUrl?: string;

  @IsOptional()
  @IsString({ message: 'API URL children phải là chuỗi!' })
  @Transform(({ value }) => value?.trim())
  apiUrlChildren?: string;

  @IsOptional()
  @IsString()
  processID?: string;

  // @IsOptional()
  // @IsInt({ message: 'Số thứ tự phải là số nguyên!' })
  // @Min(1, { message: 'Số thứ tự phải lớn hơn hoặc bằng 1!' })
  // order?: number;

  @IsOptional()
  @IsIn(['0', '1'], {
    message: 'Trạng thái không hợp lệ! (chỉ chấp nhận "0" hoặc "1")',
  })
  statusFeature?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  updatedBy?: string;

  @IsOptional()
  @IsInt()
  status?: number;

  @IsOptional()
  @IsIn(['list', 'form', 'popup', 'fullList', 'completeList', 'automatic', 'custom'], {
    message: 'featureType không hợp lệ!',
  })
  featureType?: string;

  @IsOptional()
  @IsArray({ message: 'fields phải là array hợp lệ!' })
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return value;
    }
  })
  fields?: any[];

  @IsOptional()
  @IsObject({ message: 'value phải là object hợp lệ!' })
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return value;
    }
  })
  valueField?: Record<string, any>;

  @IsOptional()
  @IsArray({ message: 'countList phải là array hợp lệ!' })
  @Transform(({ value }) => {
    try {
      if (typeof value === 'string') {
        const cleaned = value.trim().replace(/^'|'$/g, '');
        return JSON.parse(cleaned);
      }
      return value;
    } catch {
      return value;
    }
  })
  countList?: any[];
}
