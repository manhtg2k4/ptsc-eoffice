import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StatusInfoDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  note: string;
}
