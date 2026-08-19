import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
  ArrayMinSize,
  IsObject,
  IsBooleanString,
  IsNotEmpty,
  ArrayNotEmpty,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import {
  IsValidDateRangeFilter,
  IsValidMeetingMode,
  IsValidMeetingTime,
  IsValidRecurrence,
  IsValidSort,
  IsValidTaskDeadline,
} from './meeting.validate';
import { IsPagedLimit, clampLimit } from '../../utils/pagination.validator';
import { IsPositiveIntString } from 'src/documents/dto/list-type.map';
import { WorkItemDto } from './meeting-participants.dto';
import { RecurrenceType } from '../entities/meeting-recurrence.entity';
import { ParticipantType } from '../entities/meeting.entity';

/* ================= TASK ================= */
export class TaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string; // 👈 THÊM
  
  @ApiProperty({ example: 'Prepare meeting slides' })
  @IsString()
  content: string;

  @ApiProperty({ example: 'agenda.pdf' })
  @IsString()
  documentName: string;

  @ApiProperty({ example: '2026-01-10' })
  @IsDateString()
  deadline: string;

  @ApiProperty({ example: '2026-01-10' })
  @IsString()
  attachableRole: string;
}

// Dto khách mời
export class CreateMeetingGuestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string; // 👈 THÊM'

  @ApiProperty({ example: 'John Doe', description: 'Tên khách mời' })
  @IsString()
  guestName: string;  // Tên khách mời

  @ApiProperty({ example: 'CEO', description: 'Chức danh của khách mời' })
  @IsOptional()
  @IsString()
  guestTitle?: string;  // Chức danh khách mời (tuỳ chọn)
  
  @ApiProperty({ example: 'A01', description: 'Số ghế' })
  @IsOptional()
  @IsString()
  seatNumber?: string;

  @ApiProperty({ example: 'ROOM_01', description: 'Phòng' })
  @IsOptional()
  @IsString()
  roomId?: string;
}
/* ================= PARTICIPANT ================= */
export class ParticipantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string; // 👈 THÊM

  @ApiProperty({ example: 'user_123' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ example: 'A-5' })
  @IsOptional()
  @IsString()
  seatNumber?: string;

  @ApiProperty({ example: 'user_123' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ type: [TaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks?: TaskDto[];
}

export class SittingPositionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string; // 👈 THÊM

  @ApiProperty({
    example: '20260115045841-ZV1YBAOI',
    description: 'ID phòng họp',
  })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({
    example: ['A-1', 'A-2'],
    description: 'Danh sách số ghế trong phòng',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  seatNumber: string[];
}

/* ================= UNIT ================= */
export class UnitDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string; // 👈 THÊM

  @ApiProperty({ example: 'unit_01' })
  @IsString()
  unitId: string;
  
  @ApiProperty({ example: 'unit_01' })
  @IsBoolean()
  isRoomSelected: boolean;

  @ApiPropertyOptional({ type: [TaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks?: TaskDto[];

  @ApiPropertyOptional({
    type: [SittingPositionDto],
    description: 'Danh sách vị trí ngồi theo phòng',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SittingPositionDto)
  sittingPosition?: SittingPositionDto[];

  @ApiPropertyOptional({ type: [ParticipantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants?: ParticipantDto[];
}

export class RecurrenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string; // 👈 THÊM

  @ApiProperty({
    example: 'TUAN',
    enum: ['KHONG', 'NGAY', 'TUAN', 'THANG', 'NAM', 'TUY_CHINH'],
  })
  @IsString()
  @IsIn(['KHONG', 'NGAY', 'TUAN', 'THANG', 'NAM', 'TUY_CHINH'])
  type: RecurrenceType;

  @ApiPropertyOptional({
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  // ===== TUAN =====
  @ApiPropertyOptional({
    example: 'MON,WED,FRI',
  })
  @IsOptional()
  @IsString()
  daysOfWeek?: string;

  // ===== THANG =====
  @ApiPropertyOptional({
    example: '2026-04',
  })
  @IsOptional()
  @IsString()
  endMonth?: string;

  // ===== NAM =====
  @ApiPropertyOptional({
    example: '2027',
  })
  @IsOptional()
  @IsString()
  endYear?: string;

  // ===== TUY_CHINH =====
  @ApiPropertyOptional({
    example: '3',
  })
  @IsOptional()
  @IsString()
  intervalValue?: string;
}
// ================= ONLINE MEETING DTO =================
export class OnlineMeetingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string; // 👈 THÊM

  @ApiProperty({ example: 'Zoom', description: 'Nền tảng họp online' })
  @IsString()
  platform?: string;

  @ApiProperty({ example: 'https://zoom.us/j/123456789' })
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @ApiProperty({
    example: '123456789',
    description: 'ID cuộc họp trên nền tảng',
  })
  @IsString()
  meetingId?: string;

  @ApiPropertyOptional({
    example: '2025',
    description: 'Mật khẩu tham gia (nếu có)',
  })
  @IsOptional()
  @IsString()
  passcode?: string;
}

/* ================= ROLE (CHAIRMAN / SECRETARY) ================= */
export class RoleTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string; // 👈 THÊM

  @ApiProperty({ example: 'USER_001' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({ example: 'A-5', description: 'Số ghế (nếu có)' })
  @IsOptional()
  @IsString()
  seatNumber?: string | null;

  @ApiPropertyOptional({
    example: 'PHONG_HOP_LON',
    description: 'Phòng họp được chỉ định',
  })
  @IsOptional()
  @IsString()
  roomId?: string | null;

  @ApiPropertyOptional({ type: [TaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks?: TaskDto[];
  
  @ApiPropertyOptional({ example: 'USER' })
  @IsOptional()
  @IsString()
  secretaryType?: string;

  @ApiPropertyOptional({ example: 'USER' })
  @IsOptional()
  @IsString()
  chairmanType?: string;
}

// ================= CREATE MEETING =================
export class CreateMeetingDto {
  @ApiProperty({
    example: '123456789',
    description: 'ID cuộc họp trên nền tảng',
  })
  @IsOptional()
  @IsString()
  meetingId?: string;

  @ApiProperty({ example: 'Weekly Planning' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'company' })
  @IsString()
  meetingType: string;

  @ApiPropertyOptional({ example: 'high' })
  @IsOptional()
  priority?: string;

  @ApiProperty({ example: '2026-01-10' })
  @IsDateString()
  meetingDate: string;

  @ApiProperty({ example: '09:00-12:00' })
  @IsString()
  @IsValidMeetingTime()
  meetingTime: string;

  @ApiProperty({ example: 'offline' })
  @IsString()
  @IsValidMeetingMode()
  meetingMode: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['PHONG_HOP_LON', 'PHONG_CNTT', 'PHONG_KE_HOACH'],
    description:
      'Danh sách ID các phòng họp vật lý được sử dụng cho cuộc họp (bắt buộc với OFFLINE/HYBRID)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: 'Mỗi roomId phải là chuỗi' })
  roomIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  roomId?: string;

  @ApiPropertyOptional({ example: '1', default: '1' })
  @IsOptional()
  @IsString()
  status?: string = '1';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusCode?: string;

  @ApiPropertyOptional({ example: 'v1.0' })
  @IsOptional()
  bpmnVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ example: 'Phòng họp số 1' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  chairmanId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  secretaryId?: string;

  @ApiPropertyOptional({ type: RoleTaskDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RoleTaskDto)
  chairman?: RoleTaskDto;

  @ApiPropertyOptional({ type: RoleTaskDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RoleTaskDto)
  secretary?: RoleTaskDto;

  @ApiPropertyOptional({ type: [RoleTaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleTaskDto)
  secretaries?: RoleTaskDto[];

  @ApiPropertyOptional()
  @IsOptional()
  directCommand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCompany?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  needConfirmation?: boolean = true;
  
  // ONLINE MEETING - ĐÚNG
  @ApiPropertyOptional({ type: OnlineMeetingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OnlineMeetingDto)
  onlineMeeting?: OnlineMeetingDto;

  // RECURRENCE - SỬA LẠI CHO ĐÚNG
  @ApiPropertyOptional({ type: RecurrenceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceDto) // ← Phải là RecurrenceDto, không phải OnlineMeetingDto
  @IsValidRecurrence()
  recurrence?: RecurrenceDto;

  // TASKS
  @ApiPropertyOptional({ type: [TaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  @IsValidTaskDeadline()
  tasks?: TaskDto[];

  // UNITS
  @ApiPropertyOptional({ type: [UnitDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnitDto)
  units?: UnitDto[];

  @ApiPropertyOptional({ type: [CreateMeetingGuestDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMeetingGuestDto)
  guests?: CreateMeetingGuestDto[];

  @ApiPropertyOptional({ description: 'Filter object' })
  @IsOptional()
  @IsObject()
  // @IsValidDateRangeFilter()
  filter?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Trang hiện tại', default: '1' })
  @IsOptional()
  page?: string = '1';

  @ApiPropertyOptional({
    description: 'Số bản ghi trên mỗi trang',
    default: '20',
  })
  @IsOptional()
  @IsPagedLimit({ message: 'Limit phải là số nguyên trong khoảng [1, 100].' })
  limit?: string = '20';

  @ApiPropertyOptional({
    description: 'Sắp xếp kết quả, ví dụ: {"userDeadline":1}',
  })
  @IsOptional()
  @IsObject()
  @IsValidSort()
  sort?: Record<string, any>;

  @ApiProperty({ description: 'Mã danh sách (process function)' })
  @IsString()
  processFn?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  authority?: string;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  room?: string = 'false';

  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  workstate?: string;
  
  @IsOptional()
  @IsString()
  substate?: string;

  @IsOptional()
  @IsString()
  year?: string;

  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsString()
  selectweek?: string;

  @IsOptional()
  @IsString()
  actionCode?: string;

  
  @IsOptional()
  @IsString()
  flowConfig?: string;

  
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkItemDto)
  workItem?: WorkItemDto;

  @IsOptional()
  @IsString()
  @IsBooleanString()
  isExport?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isToday?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isNextDay?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOverrideInstance?: boolean;
}

/* ================= UPDATE ================= */
export class UpdateMeetingDto extends PartialType(CreateMeetingDto) {}

export class DeleteMeetingsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}
export class SyncMeetingParticipantsDto {
  @ApiProperty({ example: 'BD6291B6-ECE9-412E-B7FD-17B18B4BB0F9' })
  meetingUnitId: string;

  @ApiProperty({ example: '68afc41fcb36081f0bbef554' })
  unitId: string;

  @ApiProperty({
    type: [Object],
    example: [{ userId: 'user_1' }, { userId: 'user_2' }],
  })
  members: {
    userId: string;
  }[];
}

export interface WorkItem {
  id?: string; // ID của WorkItem, ví dụ: "wi_1769583860670"
  documentId?: string; // ID tài liệu liên quan, ví dụ: "F55BA633-A1AB-466C-BB31-6B424BF72A82"
  nodeId?: string; // ID của node trong BPMN, ví dụ: "Gateway_0e4cy59"
  assigneeUserId?: string; // ID của người được giao công việc, ví dụ: "693631e9018821f01f83d3b3"
  nodeType?: string; // Kiểu node (ví dụ: "bpmn:ExclusiveGateway")
  state?: string; // Trạng thái của WorkItem, ví dụ: "open"
  created_at?: string; // Thời gian tạo WorkItem, ví dụ: "2026-01-28T07:04:20.670Z"
  bpmn_version?: string; // Phiên bản BPMN, ví dụ: "QUY_TRINH_LICH_HOP"
}


export interface DelegateMeetingPayload {
  meetingId: string;
  userId: string; // Người nhận ủy quyền
  delegatedFromUserId?: string; // Người ủy quyền
  actionCode: string;
  assigneeUserId?: string;
  workItem?: WorkItem
}


export interface UserRejectMeetingPayload {
  meetingId: string;
  actionCode: string;
  assigneeUserId?: string;
  workItem?: WorkItem
}

