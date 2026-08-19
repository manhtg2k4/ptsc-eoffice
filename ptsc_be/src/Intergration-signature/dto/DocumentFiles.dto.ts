import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';

class FileDto {

  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  isSigned: string;

  @ApiProperty()
  @IsString()
  file_name: string;

  @ApiProperty()
  @IsString()
  file_url: string;

  @ApiProperty()
  @IsString()
  storage_type: string;

  @ApiProperty()
  @IsString()
  file_path: string;
  
  @ApiProperty()
  @IsString()
  object_type: string;
}

export class DocumentFiles {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ type: FileDto })
  @ValidateNested()
  @Type(() => FileDto)
  fileList: any;
}
