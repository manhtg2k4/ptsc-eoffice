import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MeetingUnitEntity } from './meeting-unit.entity';
export enum UserType {
  USER = 'USER', // Người dùng thực
  UNIT = 'UNIT', // Đại diện phòng/đơn vị
}
export enum AssignmentType {
  INITIAL = 'INITIAL', // Được gán từ đầu
  REPLACED = 'REPLACED', // Được văn thư gán
  DELEGATED = 'DELEGATED' // Được ủy quyền
}
export enum DelegationState {
  NONE = 'NONE', // Không
  PENDING = 'PENDING', // Chờ
  ACCEPTED = 'ACCEPTED', // Xác nhận
  REJECTED = 'REJECTED', // Từ chối
  NOT_PARTICIPATE = 'NOT_PARTICIPATE', // Không tham gia
}

export enum ParticipantState {
  PENDING = 'PENDING', // Chờ
  RECEIVED = 'RECEIVED', // Đã nhận
  PROCESSING = 'PROCESSING', // Đang xử lý
  CONFIRMED = 'CONFIRMED', // Xác nhận tham gia
  DONE = 'DONE', // Hoàn thành
  NOT_PARTICIPATE = 'NOT_PARTICIPATE', // Không tham gia
  DELEGATED = 'DELEGATED' // Không tham gia
}

@Entity('meeting_participants')
export class MeetingParticipantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ===== BASIC INFO =====

  @Column({ name: 'user_id', type: 'nvarchar', length: 100 })
  userId: string;

  @Column({ name: 'seat_number', type: 'nvarchar', length: 50, nullable: true })
  seatNumber: string | null;

  @Column({ name: 'room_id', type: 'nvarchar', length: 100, nullable: true })
  roomId: string | null;

  @Column({
    name: 'participant_role',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  participantRole: string | null;

  // ===== STATE =====

  @Column({
    name: 'participant_state',
    type: 'varchar',
    length: 30,
    default: ParticipantState.PENDING,
  })
  participantState: ParticipantState;

  @Column({
    name: 'attendance_state',
    type: 'varchar',
    length: 30,
    default: 'RECEIVED', // ✅ fix đúng DB
  })
  attendanceState: string;

  // ===== ASSIGNMENT =====

  @Column({
    name: 'assignment_type',
    type: 'varchar',
    length: 30,
    default: AssignmentType.INITIAL,
    nullable: true,
  })
  assignmentType: AssignmentType;

  // ===== DELEGATION =====

  @Column({
    name: 'delegated_to_user_id',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  delegatedToUserId: string | null;

  @Column({
    name: 'delegated_from_user_id',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  delegatedFromUserId: string | null;

  @Column({
    name: 'delegated_at',
    type: 'datetime2',
    nullable: true,
  })
  delegatedAt: Date | null;

  // ===== ATTENDANCE =====

  @Column({
    name: 'attendance_at',
    type: 'datetime2',
    nullable: true,
  })
  attendanceAt: Date | null;

  @Column({
    name: 'not_check',
    type: 'bit',
    default: false,
    nullable: true,
  })
  notCheck: boolean | null;

  @Column({
    name: 'accept_join',
    type: 'bit',
    default: false,
  })
  acceptJoin: boolean;

  @Column({
    name: 'prepare_documents',
    type: 'bit',
    default: false,
  })
  prepareDocuments: boolean;

  // ===== RELATION =====

  @Column({
    name: 'meeting_unit_id',
    type: 'uniqueidentifier',
    nullable: true,
  })
  meetingUnitId: string | null;
  @Column({
    name: 'unit_id',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  unitId: string | null;
  // ===== DELEGATION =====
  @Column({
    name: 'user_type',
    type: 'varchar',
    length: 10,
    default: UserType.USER, // mặc định là USER
  })
  userType: UserType;

  @Column({
    name: 'delegation_state',
    type: 'varchar',
    length: 30,
    default: DelegationState.NONE,
  })
  delegationState: DelegationState;
  
  @Column({ name: 'reject_reason', type: 'nvarchar', length: 1000, nullable: true })
  rejectReason?: string;

  // ===== GOOGLE CALENDAR SYNC =====
  // Địa chỉ email Google của người tham gia (dùng để đồng bộ lịch cá nhân)
  @Column({
    name: 'google_email',
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  googleEmail: string | null;

  // ID của event trên Google Calendar của người dùng này
  @Column({
    name: 'google_calendar_event_id',
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  googleCalendarEventId: string | null;

  // Trạng thái đồng bộ: PENDING | SYNCED | FAILED
  @Column({
    name: 'google_calendar_sync_status',
    type: 'nvarchar',
    length: 50,
    default: 'PENDING',
    nullable: true,
  })
  googleCalendarSyncStatus: 'PENDING' | 'SYNCED' | 'FAILED' | 'SKIPPED' | null;

  // Lỗi khi đồng bộ (nếu có)
  @Column({
    name: 'google_calendar_sync_error',
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
  })
  googleCalendarSyncError: string | null;

  // Thời gian đồng bộ cuối cùng
  @Column({
    name: 'google_calendar_sync_at',
    type: 'datetime2',
    nullable: true,
  })
  googleCalendarSyncAt: Date | null;

  // Flag: đã được đồng bộ lên GG Calendar hay chưa
  @Column({
    name: 'google_calendar_synced',
    type: 'bit',
    default: false,
  })
  googleCalendarSynced: boolean;

  // Flag: ẩn trên GG Calendar hay không (khi bị xóa khỏi danh sách hoặc lịch bị hủy)
  @Column({
    name: 'google_calendar_hidden',
    type: 'bit',
    default: false,
  })
  googleCalendarHidden: boolean;

  @ManyToOne(() => MeetingUnitEntity, u => u.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meeting_unit_id' })
  unit: MeetingUnitEntity | null;

  @Column({ name: 'node_id', type: 'nvarchar', length: 100, nullable: true })
  nodeId: string | null;

  @Column({ name: 'bpmn_role', type: 'nvarchar', length: 100, nullable: true })
  bpmnRole: string | null;

  @Column({ name: 'google_event_id', type: 'nvarchar', length: 255, nullable: true })
  googleEventId: string | null;
}
