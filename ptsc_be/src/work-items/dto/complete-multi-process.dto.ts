import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CompleteMultiProcessItemDto {
  @ApiProperty({ description: 'ID của văn bản' })
  @IsString()
  docId: string;

  @ApiProperty({ description: 'ID của công việc' })
  @IsString()
  workItemId: string;
}

export class CompleteMultiProcessDto {
  @ApiProperty({ description: 'Action code (e.g., TRINH_LD, TRA_LAI)', required: true })
  @IsString()
  actionCode: string;

  @ApiProperty({ description: 'User ID performing the action', required: true })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Display name of the user' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ description: 'ID of the user to assign the next task to' })
  @IsString()
  @IsOptional()
  assignToUserId?: string;

  @ApiPropertyOptional({ description: 'Additional data for inclusive gateways or other logic' })
  @IsObject()
  @IsOptional()
  selections?: any[];

  @ApiPropertyOptional({ description: 'Additional data for inclusive gateways or other logic' })
  @IsArray()
  @IsOptional()
  assignments?: any[];

  @ApiPropertyOptional({ description: 'Deadline of employee in work' })
  @IsString()
  @IsOptional()
  deadline?: string;

  @ApiPropertyOptional({ description: 'Content of employee in work' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: 'roles of employee in work' })
  @IsString()
  @IsOptional()
  roles?: string;

  @ApiProperty({ description: 'Danh sách văn bản/công việc cần xử lý' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompleteMultiProcessItemDto)
  document: CompleteMultiProcessItemDto[];
}
