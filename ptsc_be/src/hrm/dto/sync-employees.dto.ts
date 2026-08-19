import { IsArray, IsInt, IsOptional } from 'class-validator';
import { HrmSyncEmployeeDto } from './hrm-sync.dto';

export class SyncEmployeesDto {
  @IsOptional()
  @IsArray()
  employees?: HrmSyncEmployeeDto[];

  @IsOptional()
  @IsArray()
  data?: HrmSyncEmployeeDto[];

  @IsOptional()
  @IsArray()
  payload?: HrmSyncEmployeeDto[];

  @IsOptional()
  @IsArray()
  items?: HrmSyncEmployeeDto[];

  @IsOptional()
  @IsArray()
  result?: HrmSyncEmployeeDto[];

  @IsOptional()
  @IsInt()
  status?: number;

  @IsOptional()
  userIds?: string[];

  @IsOptional()
  source?: string;
}
