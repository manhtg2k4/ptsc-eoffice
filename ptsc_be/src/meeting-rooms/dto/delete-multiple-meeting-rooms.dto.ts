import { IsArray, ArrayNotEmpty, ArrayMaxSize, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteMeetingRoomDto {
  @ApiProperty({
    example: ['20260105100000-A1B2C3D4'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids: string[];
}