import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LikeAlbumImageDto {
    @ApiProperty({ example: 'uuid-of-album' })
    @IsString()
    @IsNotEmpty()
    albumId: string;

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    isLike?: boolean; // true = like, false = dislike
}
