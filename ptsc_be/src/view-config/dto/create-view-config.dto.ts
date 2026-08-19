import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray } from 'class-validator';

export class CreateConfigurationDto {
    @IsString()
    @IsNotEmpty()
    code: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsArray()
    @IsOptional()
    field?: any[];

    @IsEnum([0, 1, 2, 3])
    @IsOptional()
    status?: 0 | 1 | 2 | 3;

    @IsString()
    @IsOptional()
    note?: string;

    @IsString()
    @IsOptional()
    type?: string;

    @IsString()
    @IsOptional()
    processID?: string;

      @IsOptional()
  @IsString()
  viewConfigId?: string;
}