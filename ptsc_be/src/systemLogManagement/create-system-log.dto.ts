// import { Type } from 'class-transformer';
import {
  IsString,
  // IsObject,
  // ValidateNested,
  IsDateString,
  // IsNotEmpty,
} from 'class-validator';

// export class UserInfoDto {
//   @IsString()
//   @IsNotEmpty()
//   fullName: string;

//   @IsString()
//   @IsNotEmpty()
//   userName: string;

//   @IsString()
//   organization: string;

//   @IsString()
//   @IsNotEmpty()
//   ipAddress: string;
// }

export class CreateSystemLogDto {
  @IsString()
  action: string;

  @IsString()
  details: string;

  @IsString()
  method: string;

  @IsString()
  status: string;

  @IsString()
  type: string;

  @IsString()
  subType: string;

  // @IsObject()
  // @ValidateNested()
  // @Type(() => UserInfoDto)
  // userInfo: UserInfoDto;

  @IsString()
  userInfo: string;

  @IsDateString()
  timestamp: string;

  @IsString()
  ipAddress: string;
}