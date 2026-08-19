import { Optional } from '@nestjs/common';
import {
  IsString,
  IsDateString,
} from 'class-validator';

export class CreateSystemLogDto {
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

   @Optional()
  @IsString()
  note?: string;
}