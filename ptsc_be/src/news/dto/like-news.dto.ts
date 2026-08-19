import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LikeNewsDto {
  @IsString()
  @IsNotEmpty()
  type: string; // 'NEWS', 'COMMENT', etc.

  @IsInt()
  objectId: number; // ID của bài viết hoặc comment

  @IsOptional()
  isLike?: boolean; // true = like, false = dislike
}
