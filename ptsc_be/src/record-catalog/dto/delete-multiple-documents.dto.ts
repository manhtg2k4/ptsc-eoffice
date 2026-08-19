import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteMultipleDocumentsDto {
    @ApiProperty({
        example: ['id1', 'id2', 'id3'],
        description: 'Danh sách ID văn bản cần xóa',
        type: [String]
    })
    @IsArray()
    @IsNotEmpty()
    @IsString({ each: true })
    ids: string[];
}
