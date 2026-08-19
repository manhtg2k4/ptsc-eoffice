import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProcessTemplateTaskDto } from './create-process-template-task.dto';

export class CreateProcessTemplateDto {
    @IsOptional()
    @IsString()
    code?: string;

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    totalExecutionTime?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    status?: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateProcessTemplateTaskDto)
    tasks?: CreateProcessTemplateTaskDto[];
}
