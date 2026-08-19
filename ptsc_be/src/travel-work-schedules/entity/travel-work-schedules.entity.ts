import {
  Entity,
  Column,
  PrimaryColumn,
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
} from 'typeorm';

/**
 * Entity: TravelWorkScheduleEntity
 * Bảng quản lý lịch công tác với thiết kế trải phẳng
 * Hỗ trợ 3 loại:
 * 1. Trong ngày - Theo buổi (singleDay + session)
 * 2. Trong ngày - Cả ngày (singleDay + fullDay)
 * 3. Nhiều ngày (multiDay)
 */
@Entity({ name: 'travel_work_schedules', schema: 'dbo' })
@Check(`"schedule_type" IN ('singleDay', 'multiDay')`)
@Check(`"calendar_format" IN ('session', 'fullDay') OR "calendar_format" IS NULL`)
@Check(`"status" IN ('1', '2', '3')`)
export class TravelWorkScheduleEntity {
  // ===== PRIMARY KEY =====
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  // ===== COMMON FIELDS =====
  @Column({ type: 'varchar', length: 50, nullable: false })
  leader: string;

  @Column({
    name: 'schedule_type',
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  scheduleType: 'singleDay' | 'multiDay';

  @Column({
    name: 'calendar_format',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  calendarFormat?: 'session' | 'fullDay';

  @Column({
    name: 'travel_schedule',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  travelSchedule?: string | null;

  // ===== DATE FIELDS =====
  @Column({
    name: 'work_date',
    type: 'datetime2',
    nullable: true,
  })
  workDate?: Date | null;

  @Column({
    name: 'from_date',
    type: 'datetime2',
    nullable: true,
  })
  fromDate?: Date | null;

  @Column({
    name: 'to_date',
    type: 'datetime2',
    nullable: true,
  })
  toDate?: Date | null;

  // ===== LOCATION & CONTENT (Full Day & Multi Day) =====
  @Column({
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  location?: string | null;

  @Column({
    type: 'nvarchar',
    nullable: true,
  })
  content?: string | null;

  // ===== SESSION FIELDS (Morning & Afternoon) =====
  @Column({
    name: 'morning_location',
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  morningLocation?: string | null;

  @Column({
    name: 'morning_content',
    type: 'nvarchar',
    nullable: true,
  })
  morningContent?: string | null;

  @Column({
    name: 'afternoon_location',
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  afternoonLocation?: string | null;

  @Column({
    name: 'afternoon_content',
    type: 'nvarchar',
    nullable: true,
  })
  afternoonContent?: string | null;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  schedules?: any[] | null;

  // ===== SYSTEM FIELDS =====
  @Column({
    type: 'varchar',
    length: 30,
    default: '1',
  })
  status: string;

  @Column({
    name: 'created_by',
    type: 'varchar',
    length: 50,
  })
  createdBy: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime2',
    default: () => 'SYSDATETIME()',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime2',
    default: () => 'SYSDATETIME()',
  })
  updatedAt: Date;

  // ===== HOOKS =====
  @BeforeInsert()
  generateId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    this.id = `TWS_${timestamp}_${random}`;
  }

  @BeforeInsert()
  validateScheduleType() {
    // Validate single day
    if (this.scheduleType === 'singleDay') {
      if (!this.workDate) {
        throw new Error('workDate is required for singleDay schedule');
      }
      if (!this.calendarFormat) {
        throw new Error('calendarFormat is required for singleDay schedule');
      }
    }

    // Validate multi day
    if (this.scheduleType === 'multiDay') {
      if (!this.fromDate || !this.toDate) {
        throw new Error('fromDate and toDate are required for multiDay schedule');
      }
      if (this.fromDate > this.toDate) {
        throw new Error('fromDate must be less than or equal to toDate');
      }
    }
  }
}