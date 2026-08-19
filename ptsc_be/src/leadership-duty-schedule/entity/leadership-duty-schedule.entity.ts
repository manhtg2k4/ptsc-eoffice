import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, BeforeInsert } from 'typeorm';
@Entity({ name: 'leadership_duty_schedules' })
export class LeadershipDutySchedule {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'nvarchar', length: 500 })
  title: string;

  @Column({ type: 'int' })
  week: number;

  @Column({ type: 'int' })
  year: number;

  @Column({ name: 'from_date', type: 'datetime' })
  fromDate: Date;
  
  @Column({ name: 'to_date', type: 'datetime' })
  toDate: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 50 })
  createdBy: string;

  @Column({ name: 'schedule_date', type: 'datetime' })
  scheduleDate: Date;

  @Column({ name: 'schedule_time', type: 'datetime' })
  scheduleTime: Date;

  @Column({ type: 'int', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @BeforeInsert()
  generateId() {
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
    this.id = `LDS_${ts}_${rand}`;
  }
}
@Entity({ name: 'leadership_duty_details' })
export class LeadershipDutyDetail {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ name: 'schedule_id', type: 'varchar', length: 50 })
  scheduleId: string;

  @Column({ name: 'duty_date', type: 'datetime' })
  dutyDate: Date;

  @Column({ name: 'day_of_week', type: 'int' })
  dayOfWeek: number;

  @Column({ name: 'leader_id', type: 'varchar', length: 50 })
  leaderId: string;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  notes?: string;

  @Column({ type: 'int', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @BeforeInsert()
  generateId() {
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
    this.id = `LDD_${ts}_${rand}`;
  }
}