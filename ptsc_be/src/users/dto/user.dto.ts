import { Type, Transform } from 'class-transformer';
import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsEmail, IsDate, ValidateNested, Matches, MinLength } from 'class-validator';
// export class CreateUserDto {
//   @IsString()
//   username: string;
//   @IsString()
//   name: string;

//   @IsString()
//   emailUser: string;

//   @IsOptional()
//   @IsString()
//   password?: string;

//   @IsOptional()
//   @IsString()
//   parent?: string;

//   @IsOptional()
//   @IsArray()
//   GroupUser?: string[];

//   @IsOptional()
//   @IsBoolean()
//   isManager?: boolean;

//   @IsOptional()
//   @IsNumber()
//   status?: number;

//   @IsOptional()
//   @IsString()
//   codeND?: string;



//   @IsOptional()
//   avatar?: Record<string, any>[];

// }

export class RoleDto {
  @IsString()
  roleCode: string;

  @IsString()
  name: string;
}

export class RolesByProcessDto {
  @IsString()
  processKey: string;

  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleDto)
  roles: RoleDto[];
}

export class CreateUserDto {
  @IsOptional()
  // @IsString()
  // @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
  //   message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số',
  // })
  password?: string;

  @IsString()
  name: string;

  @IsOptional()
  avatar?: Record<string, any>[];

  @IsOptional()
  profileImage?: any;

  @IsString()
  codeND: string;

  @IsString()
  username: string;

  @IsEmail()
  emailUser: string;

  @IsOptional()
  @IsString()
  phoneNumberUser?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  leader?: string;

  @IsOptional()
  @IsString()
  addressUser?: string;

  @IsOptional()
  @IsString()
  personalSecretary?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  organizationCode?: string;

  @IsOptional()
  @IsString()
  organizationType?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthday?: Date;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  identificationCard?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  contactTime?: Date;

  @IsOptional()
  //@IsMongoId()
  parent?: string;

  // @IsOptional()
  // @IsString()
  // organizationUnit?: string; // Đã xóa cột organization_unit_id

  @IsOptional()
  @Transform(({ value }) => {
    // Ensure value is always an array of strings
    if (value === null || value === undefined) return undefined;
    if (Array.isArray(value)) {
      return value.map(v => String(v));
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.map(v => String(v));
        }
        return [String(value)];
      } catch {
        return [String(value)];
      }
    }
    return [String(value)];
  }, { toClassOnly: true })
  @IsArray({ message: 'GroupUser must be an array' })
  @IsString({ each: true, message: 'Each item in GroupUser must be a string' })
  GroupUser?: string[];

  // @IsOptional()
  // @ValidateNested()
  // @Type(() => UserTokenDto)
  // user?: UserTokenDto;

  @IsOptional()
  @IsNumber()
  status?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolesByProcessDto)
  rolesByProcess: RolesByProcessDto[];
}
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  codeND?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthday?: Date;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  contactTime?: Date;

  @IsOptional()
  @IsString()
  addressUser?: string;

  @IsOptional()
  @IsString()
  personalSecretary?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @Transform(
    ({ value }) => {
      // Ensure value is always an array of strings
      if (value === null || value === undefined) return undefined;
      if (Array.isArray(value)) {
        return value.map((v) => String(v));
      }
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed.map((v) => String(v));
          }
          return [String(value)];
        } catch {
          return [String(value)];
        }
      }
      return [String(value)];
    },
    { toClassOnly: true },
  )
  @IsArray({ message: 'GroupUser must be an array' })
  @IsString({ each: true, message: 'Each item in GroupUser must be a string' })
  GroupUser?: string[];

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  emailUser?: string;

  @IsOptional()
  @IsString()
  phoneNumberUser?: string;

  @IsOptional()
  @IsString()
  identificationCard?: string;

  @IsOptional()
  //@IsMongoId()
  parent?: string;

  // @IsOptional()
  // @IsString()
  // organizationUnit?: string; // Đã xóa cột organization_unit_id

  @IsOptional()
  @IsNumber()
  status?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  avatar?: Record<string, any>[];

  @IsOptional()
  profileImage?: any;

  @IsOptional()
  @IsBoolean()
  isManager?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolesByProcessDto)
  rolesByProcess: RolesByProcessDto[];

  @IsOptional()
  @IsString()
  paraphSignImage?: string;

  @IsOptional()
  @IsString()
  contentSignImage?: string;

  @IsOptional()
  @IsString()
  contentSignTransparentImage?: string;

  @IsOptional()
  @IsString()
  paraphSignTransparentImage?: string;

  @IsOptional()
  @IsString()
  stampSignImage?: string;
} export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  oldPassword?: string;

  @IsString()
  newPassword: string;
}

export class BlockUserDto {
  @IsOptional()
  @IsNumber()
  status?: number;
}
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  avatar?: Record<string, any>[];

  @IsOptional()
  profileImage?: any;

  @IsOptional()
  @IsString()
  phoneNumberUser?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthday?: Date;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  addressUser?: string;

  @IsOptional()
  @IsString()
  identificationCard?: string;

  @IsOptional()
  @IsString()
  paraphSignImage?: string;

  @IsOptional()
  @IsString()
  contentSignImage?: string;

  @IsOptional()
  @IsString()
  contentSignTransparentImage?: string;

  @IsOptional()
  @IsString()
  paraphSignTransparentImage?: string;

  @IsOptional()
  @IsString()
  stampSignImage?: string;
}
