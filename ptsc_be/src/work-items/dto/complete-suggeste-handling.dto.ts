import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { WorkItemDto } from './work-item.dto';

export class SuggesteHandlingItemDto {
  @ApiProperty({ description: 'Sub action code for suggested handling', required: true })
  @IsString()
  subActionCode: string;

  @ApiProperty({ description: 'User IDs for this sub action', required: true })
  @IsArray()
  users: (string | object)[];

  @ApiProperty({ description: 'Organization unit IDs for this sub action', required: true })
  @IsArray()
  organizationUnits: (string | object)[];
}

export class CompleteSuggesteHandlingDto extends WorkItemDto {
  @ApiPropertyOptional({
    description: 'Suggested handling matrix',
    type: 'array',
  })
  @IsArray()
  @IsOptional()
  suggesteHandling?: SuggesteHandlingItemDto[];
}
