import {
  IsString
} from 'class-validator';

export class FindSystemLogDto {
  @IsString()
  method: string;

  @IsString()
  type: string;

  @IsString()
  status: string;

  @IsString()
  fullName: string;

  @IsString()
  details: string;

  @IsString()
  ipAddress: string;

  @IsString()
  page: string;

  @IsString()
  limit: string;

  @IsString()
  sort: string;

}