import { IsNotEmpty, IsString, IsInt, MinLength, MaxLength, IsArray, IsOptional } from 'class-validator';

export class CreateNewsCommentDto {
  @IsInt()
  newsId: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @IsInt()
  parentId?: number;

  @IsArray()
  @IsOptional()
  file?: any[];

  @IsString()
  @IsOptional()
  type?: string;
}
