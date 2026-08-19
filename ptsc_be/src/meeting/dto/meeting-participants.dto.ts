import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsObject,
  IsBooleanString,
} from 'class-validator';
import { IsValidDateRangeFilter } from 'src/documents/dto/list-type.map';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
type AssignmentType = 'INITIAL' | 'REPLACED';

export class MeetingParticipantSeatItemDto {
  @ApiProperty({ example: 'USER_001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  userId: string;

  @ApiProperty({ example: 'A1', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  seatNumber?: string;

  @ApiProperty({ example: 'CHAIRMAN', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  participantRole?: string;

  @ApiProperty({
    example: 'INITIAL',
    required: false,
    enum: ['INITIAL', 'REPLACED'],
    description: 'Phân biệt gán từ đầu hay gán lại (backend có thể tự set)',
  })
  @IsOptional()
  @IsString()
  @IsIn(['INITIAL', 'REPLACED'])
  assignmentType?: 'INITIAL' | 'REPLACED';
}

export class ReplaceRoomParticipantsDto {
  @ApiProperty({ type: [MeetingParticipantSeatItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeetingParticipantSeatItemDto)
  participants: MeetingParticipantSeatItemDto[];
}

export class GetMeetingParticipantsQueryDto {
  @ApiPropertyOptional({ description: 'Include delegated participants' })
  @IsOptional()
  @IsBooleanString()
  includeDelegated?: string;

  @ApiPropertyOptional({ description: 'Filter object' })
  @IsOptional()
  @IsObject()
  @IsValidDateRangeFilter()
  filter?: Record<string, any>;
}
export class MeetingParticipantSeatItemAllRoomDto {
  @ApiProperty({ example: 'USER_001' })
  @IsString()
  @IsNotEmpty()
  userId?: string;

  @ApiProperty({ example: 'GUEST_001' })
  @IsString()
  @IsNotEmpty()
  guestId?: string;

  
  @ApiProperty({ example: 'GUEST_001' })
  @IsString()
  @IsNotEmpty()
  guestName?: string;
  
  @ApiProperty({ example: 'GUEST_001' })
  @IsString()
  @IsNotEmpty()
  guestTitle?: string;

  @ApiProperty({ example: 'A1' })
  @IsString()
  @IsNotEmpty()
  seatNumber?: string;

  @ApiProperty({ example: 'room-1' })
  @IsString()
  @IsNotEmpty()
  roomId: string;
}

export class WorkItemDto {
  @IsString()
  assigneeUserId?: string;

  @IsNotEmpty()
  id: any;

  @IsString()
  nodeId?: string;

  @IsString()
  nodeType?: string;

  @IsString()
  role?: string;

  @IsString()
  state?: string;
}

export class ReplaceRoomActionDto {
  @IsString()
  actionCode: string;

  @ValidateNested()
  @Type(() => WorkItemDto)
  workItem: WorkItemDto;
}

export class ReplaceRoomParticipantsAllRoomDto {
  @ApiProperty({ type: [MeetingParticipantSeatItemAllRoomDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeetingParticipantSeatItemAllRoomDto)
  participants: MeetingParticipantSeatItemAllRoomDto[];

  @ApiProperty({ required: false, type: ReplaceRoomActionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReplaceRoomActionDto)
  action?: ReplaceRoomActionDto;

  @IsOptional()
  roomIds?: any;
}
export class UnitProcessActionDto {
  @IsString()
  actionCode: string;

  @IsString()
  unitId: string;

  @ValidateNested()
  @Type(() => WorkItemDto)
  workItem: WorkItemDto;

  @IsOptional()
  roomIds?: any;
}
