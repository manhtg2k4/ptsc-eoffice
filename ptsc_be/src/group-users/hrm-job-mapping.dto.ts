import { IsString, IsArray, IsOptional, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHrmJobMappingDto {
  @IsNotEmpty()
  @IsString()
  groupUserId: string;

  @IsArray()
  @IsString({ each: true })
  jobCodes: string[];

  @IsOptional()
  @IsArray()
  jobNames?: string[];
}

export class HrmJobMappingResponseDto {
  id: number;
  groupUserId: string;
  hrmJobCode: string;
  hrmJobName?: string;
  createdAt: Date;
}

export class GroupMappingItemDto {
  @IsNotEmpty()
  @IsString()
  groupUserId: string;

  @IsArray()
  @IsString({ each: true })
  hrmJobCodes: string[];
}

export class BatchUpdateMappingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupMappingItemDto)
  mappings: GroupMappingItemDto[];
}
