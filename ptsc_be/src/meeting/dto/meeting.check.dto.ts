import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  Matches,
  ArrayNotEmpty,
} from 'class-validator';

export class CheckRoomConflictDto {
  @ApiProperty({
    example: '2026-01-16',
    description: 'Ngày họp (yyyy-MM-dd)',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'meetingDate phải có định dạng yyyy-MM-dd',
  })
  meetingDate: string;

  @ApiProperty({
    example: '01:00-02:00',
    description: 'Thời gian họp (HH:mm-HH:mm)',
  })
  @IsString()
  @Matches(/^\d{2}:\d{2}-\d{2}:\d{2}$/, {
    message: 'meetingTime phải có định dạng HH:mm-HH:mm',
  })
  meetingTime: string;

  @ApiProperty({
    type: [String],
    example: ['20260107090029-MR29'],
    description: 'Danh sách ID phòng họp',
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'roomIds không được rỗng' })
  @IsString({ each: true })
  roomIds: string[];

  @ApiPropertyOptional({
    example: '0711CA4D-96D4-4388-A8FF-6E0ED230F7C2',
    description: 'ID cuộc họp cần loại trừ (dùng khi update)',
  })
  @IsOptional()
  @IsString()
  excludeMeetingId?: string;
}


export class CheckUserConflictDto {
  @ApiProperty({
    example: '2026-01-13',
    description: 'Ngày họp (yyyy-MM-dd)',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  meetingDate: string;

  @ApiProperty({
    example: '01:00-02:00',
    description: 'Thời gian họp (HH:mm-HH:mm)',
  })
  @IsString()
  @Matches(/^\d{2}:\d{2}-\d{2}:\d{2}$/)
  meetingTime: string;

  @ApiProperty({
    type: [String],
    example: [
      '89045483-CDEB-4D9A-A0BE-66FCEA9A8F44',
      '351AA98C-9DBD-42A5-B87B-9369466373AB',
    ],
    description: 'Danh sách userId cần check trùng',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  userIds: string[];

  @ApiPropertyOptional({
    example: '0711CA4D-96D4-4388-A8FF-6E0ED230F7C2',
    description: 'ID cuộc họp cần loại trừ (chỉ dùng khi update)',
  })
  @IsOptional()
  @IsString()
  excludeMeetingId?: string;
}