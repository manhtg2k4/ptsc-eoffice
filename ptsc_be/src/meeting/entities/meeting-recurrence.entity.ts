import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { MeetingEntity } from './meeting.entity';

export enum RecurrenceType {
  KHONG = 'KHONG',
  NGAY = 'NGAY',
  TUAN = 'TUAN',
  THANG = 'THANG',
  NAM = 'NAM',
  TUY_CHINH = 'TUY_CHINH',
}

@Entity('meeting_recurrences')
export class MeetingRecurrenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'nvarchar', length: 20 })
  type: RecurrenceType;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  // TUAN: MON,WED,FRI
  @Column({ name: 'days_of_week', type: 'nvarchar', length: 50, nullable: true })
  daysOfWeek: string | null;

  // THANG: 1,15,28
  @Column({ name: 'day_of_month', type: 'nvarchar', length: 10, nullable: true })
  dayOfMonth: string | null;

  // NAM: 02-01 (MM-DD)
  @Column({ name: 'day_of_year', type: 'nvarchar', length: 10, nullable: true })
  dayOfYear: string | null;

  // TUY_CHINH: 1,2,3 (mỗi N ngày)
  @Column({ name: 'interval_value', type: 'nvarchar', length: 10, nullable: true })
  intervalValue: string | null;

  @OneToOne(() => MeetingEntity, (m) => m.recurrence, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meeting_id' })
  meeting: MeetingEntity;
}