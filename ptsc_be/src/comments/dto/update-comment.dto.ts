// src/comments/dto/update-comment.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { escapeHtml } from '../../utils/html-sanitize.util';

export class UpdateCommentDto {
    @ApiProperty({ description: 'Nội dung mới của comment' })
    @Transform(({ value }) => (typeof value === 'string' ? escapeHtml(value) : value))
    @IsString()
    @IsNotEmpty()
    content: string;
}
