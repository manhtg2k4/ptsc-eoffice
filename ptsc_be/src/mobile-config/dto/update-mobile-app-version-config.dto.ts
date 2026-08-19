import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateMobileAppVersionConfigDto {
  @ApiPropertyOptional({ example: '1.3.2', nullable: true })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  version?: string | null;

  @ApiPropertyOptional({ example: 21, nullable: true })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  buildNumber?: number | null;

  @ApiPropertyOptional({
    example:
      'https://play.google.com/store/apps/details?id=com.saigonnewport.doffice',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  updateUrl?: string | null;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  forceUpdate?: boolean;
}
