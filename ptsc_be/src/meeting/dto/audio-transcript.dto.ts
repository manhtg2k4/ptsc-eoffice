// audio-transcript.dto.ts
import { IsNotEmpty, IsString, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAudioTranscriptDto {
  @ApiProperty({ description: 'ID của cuộc họp' })
  @IsNotEmpty()
  @IsString()
  meetingId: string;

  @ApiProperty({ description: 'Độ dài file audio (giây)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @ApiProperty({ description: 'Nội dung văn bản transcript', required: false })
  @IsOptional()
  @IsString()
  transcriptText?: string;
}

export class UpdateTranscriptTextDto {
  @ApiProperty({ description: 'Nội dung văn bản transcript' })
  @IsString()
  @IsNotEmpty()
  transcriptText: string;
}

export class AudioTranscriptResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message?: string;

  @ApiProperty()
  data?: any;
}

export class AudioFilesResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  total: number;

  @ApiProperty()
  items: any[];
}