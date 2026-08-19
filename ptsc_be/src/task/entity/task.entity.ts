import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  DeleteDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { TaskUserEntity } from './task-user.entity';
import { ProjectEntity } from '../../project/entities/project.entity';

@Entity('task')
export class TaskEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  name: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  code: string | null;

  @Column({ name: 'start_date', type: 'datetime', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'datetime', nullable: true })
  endDate: Date;

  @Column({ name: 'bpmn_id', type: 'nvarchar', length: 100, nullable: true })
  bpmnId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  priority: string;

  @Column({ type: 'varchar', name: 'type_task', length: 100 })
  typeTask: string;

  @Column({ type: 'int', name: 'recurring_from_id', nullable: true })
  recurringFromId: number | null;

  @Column({ name: 'template_id', type: 'nvarchar', length: 500, nullable: true })
  templateId: string | null;

  @Column({
    name: 'reminder_time',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  reminderTime: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  topic: string;

  @Column({ type: 'varchar', length: 5000, nullable: true })
  note: string;

  @Column({
    name: 'repetitive_task',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  repetitiveTask: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  month: string;

  @Column({ name: 'week_days', type: 'varchar', length: 100, nullable: true })
  weekDays: string;

  @Column({ name: 'repetitive_start', type: 'datetime', nullable: true })
  repetitiveStart: Date;

  @Column({ name: 'repetitive_end', type: 'datetime', nullable: true })
  repetitiveEnd: Date;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  path: string;

  @Column({
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
  })
  progress: string;

  @Column({ type: 'int', nullable: true })
  status: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  createdBy: UserEntity;

  @Column({ name: 'created_by', type: 'nvarchar', length: 100, nullable: true })
  createdById: string;
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'updated_by' })
  updatedBy: UserEntity;

  @Column({ name: 'updated_by', type: 'nvarchar', length: 100, nullable: true })
  updatedById: string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_at' })
  updatedAt: Date;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => TaskUserEntity, (taskUser) => taskUser.task)
  taskUsers: TaskUserEntity[];

  @Column({ type: 'int' })
  parent: number;

  @Column({
    name: 'process_status',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  processStatus: string;

  @Column({
    name: 'doc_id',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  docId: string | null;

  @Column({
    name: 'meeting_id',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  meetingId: string | null;

  @Column({
    name: 'meeting_conclusion_id',
    type: 'bigint',
    nullable: true,
    transformer: {
      to: (value?: string) => value === undefined ? null : value,
      from: (value?: string) => value === null ? null : value,
    },
  })
  meetingConclusionId?: string;

  @Column({
    name: 'type_task_meeting',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  typeTaskMeeting?: string;

  @Column({ name: 'project_id', type: 'int', nullable: true })
  projectId: number | null;

  @ManyToOne(() => ProjectEntity)
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @Column({ name: 'dependent_task_id', type: 'int', nullable: true })
  dependentTaskId: number | null;

  @Column({ name: 'is_confidential', type: 'bit', default: false, nullable: true })
  isConfidential: boolean;

  @Column({
    name: 'is_approval_required',
    type: 'bit',
    default: 0,
    nullable: true,
  })
  isApprovalRequired: boolean;
}
