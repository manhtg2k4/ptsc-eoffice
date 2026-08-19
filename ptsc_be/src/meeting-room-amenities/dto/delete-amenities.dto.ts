import { IsArray, ArrayNotEmpty, ArrayMaxSize, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAmenitiesDto {
  @ApiProperty({
    example: ['20260105073051-1HSX632M'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids: string[];
}