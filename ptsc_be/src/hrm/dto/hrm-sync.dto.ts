import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class HrmSyncEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsEmail()
  emailUser?: string;

  @IsOptional()
  @IsString()
  phoneNumberUser?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsString()
  @IsNotEmpty()
  codeND: string;

  @IsOptional()
  @IsString()
  birthday?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  identificationCard?: string;

  @IsInt()
  status: number;

  @IsOptional()
  @IsString()
  leader?: string;

  @IsOptional()
  @IsString()
  department?: string;
}
