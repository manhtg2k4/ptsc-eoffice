import { IsString, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DocumentFiles } from './DocumentFiles.dto';

export class DataResponseDto {
  @ApiProperty({ type: DocumentFiles })
  @ValidateNested()
  @Type(() => DocumentFiles)
  documentFiles: DocumentFiles[];

  @ApiProperty()
  @IsString()
  abstractNote: string;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  docSend: string;

}
