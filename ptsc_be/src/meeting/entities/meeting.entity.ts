import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MeetingUnitEntity } from './meeting-unit.entity';
import { OnlineMeetingEntity } from './online-meeting.entity';
import { MeetingRecurrenceEntity } from './meeting-recurrence.entity';
import { MeetingGuest } from './meeting-guest.entity';
import { ASSIGNING_SEAT_STATUS } from '../helper/meeting.mapper';
export enum ParticipantType {
  USER = 'USER',
  UNIT = 'UNIT',
}
export enum AssigningSeatStatus {
  NOT_ASSIGN = 'NOT_ASSIGN',
  ASSIGNING = 'ASSIGNING',
  ASSIGNED = 'ASSIGNED',
  LOCKED = 'LOCKED',
}
@Entity('meetings')
export class MeetingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'title', type: 'nvarchar', length: 255 })
  title: string;

  @Column({ name: 'meeting_type' })
  meetingType: string;

  @Column({ name: 'priority', type: 'nvarchar', length: 10, nullable: true })
  priority: string;

  @Column({ name: 'meeting_date', type: 'date' })
  meetingDate: string;

  @Column({ name: 'meeting_time', type: 'varchar', length: 11 })
  meetingTime: string;

  @Column({ name: 'meeting_mode', type: 'varchar', length: 30 })
  meetingMode: string;

  @Column({ name: 'room_ids', type: 'nvarchar', length: 500, nullable: true, })
  roomIds: string;

  @Column({ name: 'status', type: 'char', length: 1, nullable: true,  default: '1' })
  status: string;

  @Column({name: 'status_code', type: 'varchar', length: 5, nullable: true })
  statusCode?: string;

  @Column({ name: 'bpmn_version', nullable: true })
  bpmnVersion: string;

  @Column({ type:'bit', name: 'is_company', default: false })
  isCompany: boolean;
  
  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ name: 'location', type: 'text', nullable: true })
  location: string | null;

  // Người chủ trì
  @Column({ name: 'chairman_id', type: 'varchar', length: 64, nullable: true })
  chairmanId: string | null;

  @Column({ name: 'secretary_id', type: 'varchar', length: 64, nullable: true })
  secretaryId: string | null;

  // Trực chỉ huy
  @Column({ name: 'direct_command', nullable: true })
  directCommand: string;

  @Column({ name: 'conclusion', type: 'nvarchar', length: 'MAX', nullable: true })
  conclusion: string | null;
  
  @Column({
    name: 'attendance_locked',
    type: 'bit',
    default: false,
  })
  attendanceLocked: boolean;

  @OneToOne(() => OnlineMeetingEntity, o => o.meeting, {
    cascade: true,
    nullable: true,
  })
  @JoinColumn({ name: 'online_meeting_id' })
  onlineMeeting?: OnlineMeetingEntity;

  @OneToOne(() => MeetingRecurrenceEntity, r => r.meeting, {
    cascade: true,
    nullable: true,
  })
  recurrence?: MeetingRecurrenceEntity;

  @OneToMany(() => MeetingUnitEntity, u => u.meeting, {
    cascade: true,
  })
  units: MeetingUnitEntity[];

  
  @OneToMany(() => MeetingGuest, u => u.meeting, {
    cascade: true,
  })
  guests: MeetingGuest[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({
    name: 'meeting_state',
    type: 'varchar',
    length: 15,
  })
  meetingState: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'nvarchar', length: 100, nullable: true })
  createdBy: string | null;

  @Column({ name: 'started_at', type: 'datetime2', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'ended_at', type: 'datetime2', nullable: true })
  endedAt: Date | null;
  
  @Column({
    name: 'timezone',
    type: 'varchar',
    length: 30,
    default: () => "'Asia/Ho_Chi_Minh'",
  })
  timezone: string;

  // Thêm cột "organization_unit"
  @Column({ name: 'organizational_unit', type: 'nvarchar', length: 255, nullable: true })
  organizationalUnit: string | null;

  @Column({ name: 'stage_status', type: 'varchar', length: 30, nullable: true })
  stageStatus: string | null;

  @Column({
    type: 'varchar',
    length: 15,
    name: 'is_assigning_seat',
    default: ASSIGNING_SEAT_STATUS.NOT_ASSIGN,
  })
  isAssigningSeat: AssigningSeatStatus;
  
  @Column({
    name: 'cancelled_by',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  cancelledBy: string | null;

  @Column({
    name: 'cancelled_at',
    type: 'datetime2',
    nullable: true,
  })
  cancelledAt: Date | null;

  @Column({
    name: 'cancelled_reason',
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
  })
  cancelledReason: string | null;

  // Template hay instance
  @Column({ name: 'is_template', type: 'bit', default: false })
  isTemplate: boolean;

  // Nếu là instance → trỏ về template
  @Column({ name: 'parent_id', type: 'uniqueidentifier', nullable: true })
  parentId: string | null;

  // ID chung của cả chuỗi lặp
  @Column({ name: 'recurrence_group_id', type: 'uniqueidentifier', nullable: true })
  recurrenceGroupId: string | null;

  // Hủy 1 phiên (không delete)
  @Column({ name: 'is_cancelled', type: 'bit', default: false })
  isCancelled: boolean;

  @Column({ name: 'is_override_instance', type: 'bit', default: false })
  isOverrideInstance: boolean;
  
  // Người gán vị trí 
  @Column({ name: 'assigned_seat_by', type: 'nvarchar', nullable: true ,length: 100,})
  assignedSeatBy : string;

  @Column({ name: 'recurrence_id', type: 'uniqueidentifier', nullable: true })
  recurrenceId: string | null;


  @Column({
    name: 'chairman_type',
    type: 'varchar',
    length: 10,
    default: 'USER'
  })
  chairmanType: ParticipantType;

  @Column({
    name: 'secretary_type',
    type: 'varchar',
    length: 10,
    default: 'USER'
  })
  secretaryType: ParticipantType;

  @Column({
    name: 'google_calendar_processed_by_cron',
    type: 'bit',
    default: false,
  })
  googleCalendarProcessedByCron: boolean;

  @Column({
    name: 'need_confirmation',
    type: 'bit',
    default: true,
  })
  needConfirmation: boolean;

  /**
   * Đánh dấu phiên lặp này đã được dùng để sinh ra phiên tiếp theo.
   * Ngăn cron sinh trùng phiên sau khi phiên hiện tại kết thúc.
   */
  @Column({
    name: 'next_instance_scheduled',
    type: 'bit',
    default: false,
  })
  nextInstanceScheduled: boolean;

  @Column({
    name: 'is_recalled_files_deleted',
    type: 'bit',
    default: false,
  })
  isRecalledFilesDeleted: boolean;

  @Column({
    name: 'warning_24h_sent',
    type: 'bit',
    default: false,
  })
  warning24hSent: boolean;

  @Column({
    name: 'pending_delegation_count',
    type: 'int',
    default: 0,
  })
  pendingDelegationCount: number;

  @Column({
    name: 'id_str',
    type: 'varchar',
    length: 36,
    insert: false,
    update: false,
    nullable: true,
  })
  idStr: string;
}

