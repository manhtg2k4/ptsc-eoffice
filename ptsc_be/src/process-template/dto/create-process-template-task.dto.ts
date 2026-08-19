import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreateProcessTemplateTaskDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  executionTime?: string; // Đổi sang string để nhận "SDXS"

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  deadlineReminder?: string; // Đổi sang string để nhận chuỗi rỗng

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  displayOrder?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  dependency?: string;

  @IsOptional()
  @IsString()
  reminderTime?: string;

  @IsOptional()
  @IsArray()
  files?: any[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProcessTemplateTaskDto)
  children?: CreateProcessTemplateTaskDto[];
  @IsOptional()
  @IsBoolean()
  isApprovalRequired?: boolean;
}
