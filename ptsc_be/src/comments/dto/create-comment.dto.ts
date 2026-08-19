// src/comments/dto/create-comment.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { escapeHtml } from '../../utils/html-sanitize.util';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    userName: string;

    @ApiProperty()
    @Transform(({ value }) => (typeof value === 'string' ? escapeHtml(value) : value))
    @IsString()
    // @IsNotEmpty()
    content: string;

    @ApiProperty({
        type: 'array',
        required: false,
        description: 'Mảng object hỗn hợp (mixed object array)',
        example: [
            { id: 'file123', name: 'a.png' },
            { id: 'file456', size: 200, type: 'pdf' },
        ],
    })
    @IsOptional()
    @IsArray()
    fileId?: any[]; // 👈 Cho phép mảng object bất kỳ

    @IsOptional()
    @IsArray()
    mentionIds: string[]

    @ApiProperty()
    @IsString()
    type: string;
}
