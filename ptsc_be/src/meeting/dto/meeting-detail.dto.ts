import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Import các DTO con để tái sử dụng (đã có sẵn)
import {
  TaskDto,
  ParticipantDto,
  UnitDto,
  RecurrenceDto,
  OnlineMeetingDto,
} from './meeting.dto'; // hoặc đường dẫn phù hợp

// DTO cho Participant trong response (kèm tasks)
class ParticipantDetailDto {
  @ApiProperty({ example: 'user_123' })
  id?: string;

  @ApiProperty({ example: 'user_123' })
  userId: string;

  @ApiPropertyOptional({ example: "5" })
  seatNumber?: string;

  @ApiPropertyOptional({ example: "5 "})
  roomId?: string;

  @ApiPropertyOptional({ type: [TaskDto] })
  tasks?: TaskDto[];
}

// DTO cho Unit trong response (kèm participants và tasks)
class UnitDetailDto {
  @ApiProperty({ example: 'unit_01' })
  id?: string;

  @ApiProperty({ example: 'unit_01' })
  unitId: string;

  @ApiPropertyOptional({ type: [TaskDto] })
  tasks?: TaskDto[];

  @ApiPropertyOptional({ type: [ParticipantDetailDto] })
  @Type(() => ParticipantDetailDto)
  participants?: ParticipantDetailDto[];
}
export class RoleTaskDto {
  @ApiProperty({ example: 'USER_001' })
  userId: string;

  
  @ApiProperty({ example: 'USER_001' })
  userName: string;
  
  @ApiPropertyOptional({ type: [TaskDto] })
  @Type(() => TaskDto)
  tasks?: TaskDto[];
}
// DTO chính trả về chi tiết meeting
export class MeetingDetailDto {
  @ApiProperty({ example: 'meet_123' })
  id: string;

  @ApiProperty({ example: 'Weekly Planning' })
  title: string;

  @ApiProperty({ example: 'company' })
  meetingType: string;

  @ApiPropertyOptional({ example: 'high' })
  priority?: string;

  @ApiProperty({ example: '2026-01-10' })
  meetingDate: string;

  @ApiProperty({ example: '09:00-12:00' })
  meetingTime: string;

  @ApiProperty({ example: 'offline' })
  meetingMode: string;

  // Quan trọng: roomIds là mảng string[]
  @ApiProperty({
    type: [String],
    example: ['PHONG_HOP_LON', 'PHONG_CNTT'],
    description: 'Danh sách ID phòng họp vật lý',
  })
  roomIds: string[];

  @ApiPropertyOptional({ example: '1' })
  status?: string;

  @ApiPropertyOptional()
  statusCode?: string;

  @ApiPropertyOptional({ example: 'v1.0' })
  bpmnVersion?: string;

  @ApiPropertyOptional()
  content?: string;

  @ApiPropertyOptional({ example: 'Phòng họp số 1' })
  location?: string | null;

  @ApiPropertyOptional()
  chairmanId?: string;

  @ApiPropertyOptional()
  secretaryId?: string;

  @ApiPropertyOptional()
  directCommand?: string;

  @ApiPropertyOptional({ type: OnlineMeetingDto })
  @Type(() => OnlineMeetingDto)
  onlineMeeting?: OnlineMeetingDto | null;

  @ApiPropertyOptional({ type: RecurrenceDto })
  @Type(() => RecurrenceDto)
  recurrence?: RecurrenceDto | null;

  // Tasks trực tiếp của meeting
  @ApiPropertyOptional({ type: [TaskDto] })
  @Type(() => TaskDto)
  tasks?: TaskDto[];

  // Các đơn vị tham gia
  @ApiPropertyOptional({ type: [UnitDetailDto] })
  @Type(() => UnitDetailDto)
  units?: UnitDetailDto[];

  // Tasks trực tiếp của meeting
  @ApiPropertyOptional({ type: [RoleTaskDto] })
  @Type(() => RoleTaskDto)
  chairman?: RoleTaskDto[];

  // Tasks trực tiếp của meeting
  @ApiPropertyOptional({ type: [RoleTaskDto] })
  @Type(() => RoleTaskDto)
  secretary?: RoleTaskDto[];

  // Optional: thêm createdAt, updatedAt nếu cần
  @ApiPropertyOptional()
  createdAt?: string;

  @ApiPropertyOptional()
  updatedAt?: string;

  @ApiPropertyOptional()
  createdBy?: string | null;

  @ApiPropertyOptional()
  listparammeeting?: string; // Đơn vị
}