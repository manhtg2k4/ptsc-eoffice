import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
} from 'class-validator';
import { NotificationType } from '../notification.enum';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @IsString()
  @IsNotEmpty()
  senderId: string;

  @IsOptional()
  @IsDateString()
  time?: Date;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsOptional()
  recordId: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsOptional()
  @IsNumber()
  status?: number;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;
}

// create-notification-bulk.dto.ts
export class CreateNotificationBulkDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  recipientIds: string[];

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsNotEmpty()
  senderId: string;

  @IsOptional()
  @IsDateString()
  time?: Date;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsOptional()
  recordId?: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsOptional()
  @IsNumber()
  status?: number;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;
}

export class DeleteNotificationBulkDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  ids: number[];
}
