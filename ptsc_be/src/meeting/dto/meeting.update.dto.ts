/* src/meeting/dto/update-meeting.dto.ts */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsArray, ValidateNested, IsDateString, IsBoolean } from 'class-validator';
import { WorkItemDto } from './meeting-participants.dto';

/* ================= RECURRENCE DTO ================= */
export class RecurrenceDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  form?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endMonth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endYear?: string;

  // ✅ thêm các property service đang dùng
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  daysOfWeek?: string[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  daysOfMonth?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  monthInQuarter?: number[];
}

/* ================= ROOM DTO ================= */
export class RoomDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  status?: number;

  @ApiPropertyOptional()
  @IsOptional()
  stage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  availableFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  createdAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  updatedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  hasAssigned?: boolean;
}

/* ================= TASK DTO ================= */
export class TaskDto {
  @ApiPropertyOptional()      // optional because new tasks may not have an ID yet
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsString()
  content: string;
}

/* ================= PARTICIPANT DTO ================= */
export class ParticipantDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  userName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seatNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ type: RoomDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RoomDto)
  room?: RoomDto;

  @ApiPropertyOptional({ type: [TaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks?: TaskDto[];

  @ApiPropertyOptional()
  @IsOptional()
  isAssigned?: boolean;
}

/* ================= UNIT DTO ================= */
export class UnitDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  unitName: string;

  @ApiProperty()
  @IsString()
  unitId: string;

  @ApiPropertyOptional({ type: [TaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks?: TaskDto[];

  @ApiPropertyOptional({ type: [ParticipantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants?: ParticipantDto[];
}

/* ================= ONLINE MEETING DTO ================= */
export class OnlineMeetingDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  platform: string;

  @ApiProperty()
  @IsString()
  meetingLink: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passcode?: string;
}

/* ================= UPDATE MEETING DTO ================= */
export class UpdateMeetingDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  meetingType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ type: RecurrenceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceDto)
  recurrence?: RecurrenceDto;

  @ApiProperty()
  @IsDateString()
  meetingDate: string;

  @ApiProperty()
  @IsString()
  meetingTime: string;

  @ApiProperty()
  @IsString()
  meetingMode: string;

  @ApiPropertyOptional({ type: [RoomDto] })
  @IsOptional()
  @IsArray()
  @Type(() => RoomDto)
  roomIds?: RoomDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bpmnVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: 'Phòng họp số 1' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chairmanId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secretaryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  directCommand?: string;

  @ApiPropertyOptional({ type: OnlineMeetingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OnlineMeetingDto)
  onlineMeeting?: OnlineMeetingDto;

  @ApiPropertyOptional({ type: [TaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks?: TaskDto[];

  @ApiPropertyOptional({ type: [UnitDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnitDto)
  units?: UnitDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFollow?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedAt?: string;
}

export class UpdateMeetingProcessingStateDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  meetingId: string;

  @IsBoolean()
  @IsOptional()
  acceptJoin?: boolean;

  @IsBoolean()
  @IsOptional()
  assignParticipants?: boolean;

  @IsBoolean()
  @IsOptional()
  prepareDocuments?: boolean;

  
  @IsString()
  actionCode: string;

  @IsString()
  unitId: string;

  @ValidateNested()
  @Type(() => WorkItemDto)
  workItem: WorkItemDto;
}