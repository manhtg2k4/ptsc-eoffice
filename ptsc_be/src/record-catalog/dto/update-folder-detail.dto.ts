import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFolderDetailDto {
    @ApiPropertyOptional({ description: 'Tiêu đề mục hồ sơ mới' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    title?: string;
}
