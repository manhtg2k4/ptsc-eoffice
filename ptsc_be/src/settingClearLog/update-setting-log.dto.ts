import { IsBoolean, IsInt, Min, Max, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSettingClearLogDto {
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  timeSave: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  newArticlesDays?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  mostViewedArticlesThreshold?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  favoriteArticlesThreshold?: number;

  @IsBoolean()
  @Type(() => Boolean)
  autoClean: boolean;

  @IsString()
  @IsOptional()
  updater: string | null;

  @IsString()
  @IsOptional()
  type: string | null;
}
