// src/meeting/dto/meeting-relation.dto.ts
import { IsArray, IsNotEmpty, IsUUID, ArrayMinSize, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMeetingRelationsDto {
  @ApiProperty({
    description: 'Danh sách ID các cuộc họp liên quan',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '987fcdeb-51a2-43d7-b890-123456789abc'
    ],
    type: [String],
  })
  @IsArray({ message: 'relatedMeetingIds phải là một mảng' })
  @ArrayMinSize(1, { message: 'Phải có ít nhất 1 cuộc họp liên quan' })
  @IsUUID('4', { each: true, message: 'Mỗi ID phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'relatedMeetingIds không được để trống' })
  relatedMeetingIds: string[];
}

export class MeetingRelationResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  meetingId: string;

  @ApiProperty({ example: '987fcdeb-51a2-43d7-b890-123456789abc' })
  relatedMeetingId: string;

  @ApiProperty({ example: 'reference' })
  relationType: string;

  @ApiProperty()
  createdAt: Date;
}

export class AddMeetingRelationsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    type: 'object',
    properties: {
      added: { type: 'number', example: 2 },
      skipped: { type: 'number', example: 0 },
      relations: { type: 'array', items: { type: 'object' } },
    },
  })
  data: {
    added: number;
    skipped: number;
    relations: MeetingRelationResponseDto[];
  };
}

export class RemoveMeetingRelationsDto {
  @ApiProperty({
    description: 'Danh sách ID các cuộc họp cần xóa liên kết',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  relatedMeetingIds: string[];
}