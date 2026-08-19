import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LikeVideoDto {
    @ApiProperty({ example: 'uuid-of-video' })
    @IsString()
    @IsNotEmpty()
    videoId: string;

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    isLike?: boolean; // true = like, false = dislike
}
