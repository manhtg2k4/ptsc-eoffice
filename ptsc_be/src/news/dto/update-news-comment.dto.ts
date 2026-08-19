import { IsNotEmpty, IsString, MaxLength, MinLength, IsArray, IsOptional } from 'class-validator';

export class UpdateNewsCommentDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(1000)
    content: string;

    @IsArray()
    @IsOptional()
    file?: any[];
}
