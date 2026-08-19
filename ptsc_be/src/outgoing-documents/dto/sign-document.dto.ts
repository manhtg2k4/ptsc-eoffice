import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignDocumentDto {
  @ApiProperty({
    description: 'ID của văn bản cần ký',
    example: 'doc_12345',
  })
  @IsString()
  @IsNotEmpty()
  docIds: string;

  @ApiProperty({
    description: 'Mã hành động (action code)',
    example: 'APPROVE',
  })
  @IsString()
  @IsNotEmpty()
  actionCode: string;

}
