import {
  IsString,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class SystemLogDto {
  @IsString()
  actions: string;

  @IsString()
  details: string;

  @IsString()
  userInfo: string;

  @IsDateString()
  timestamps: string;

  @IsString()
  taskId: string;

  @IsOptional()
  @IsString()
  note?: string;
}