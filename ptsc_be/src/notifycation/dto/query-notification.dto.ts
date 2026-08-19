import { IsOptional, IsString } from 'class-validator';

export class QueryNotificationDto {
  @IsOptional()
  page?: string | number;

  @IsOptional()
  limit?: string | number;

  @IsOptional()
  excludeHidden?: boolean | string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  filter?: {
    category?: string;
    toBook?: string;
    abstractNote?: string;
    key?: string | string[];
    content?: string;
    group?: string;
    hidden?: boolean | string;
  };
}