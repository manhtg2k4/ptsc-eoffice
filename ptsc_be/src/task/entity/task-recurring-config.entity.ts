import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('task_recurring_config')
export class TaskRecurringConfigEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'task_id', type: 'int', nullable: true })
    taskId: number;

    /**
     * ID của recurring config cha (để tạo cấu trúc cây task config)
     */
    @Column({ name: 'parent_id', type: 'int', nullable: true })
    parentId: number;

    @Column({ type: 'nvarchar', length: 500 })
    name: string;

    @Column({ type: 'nvarchar', length: 50, nullable: true })
    priority: string;

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    topic: string;

    @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    note: string;

    @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    code: string;

    @Column({ name: 'reminder_time', type: 'nvarchar', length: 50, nullable: true })
    reminderTime: string;

    /**
     * Tần suất lặp: weekly, monthly, quarterly
     */
    @Column({ name: 'repetitive_task', type: 'varchar', length: 50 })
    repetitiveTask: string;

    /**
     * Thứ trong tuần (dùng cho weekly): '1,3,5' (T2, T4, T6)
     */
    @Column({ name: 'days_of_week', type: 'varchar', length: 100, nullable: true })
    daysOfWeek: string;

    /**
     * Tháng trong quý (dùng cho quarterly): 1, 2, 3
     */
    @Column({ name: 'month_in_quarter', type: 'int', nullable: true })
    monthInQuarter: number;

    /**
     * Cách thức lặp trong tháng: specific_day, relative_day, last_day
     */
    @Column({ name: 'execution_type', type: 'varchar', length: 50, nullable: true })
    executionType: string;

    /**
     * Ngày cụ thể trong tháng (1-31)
     */
    @Column({ name: 'day_of_month', type: 'int', nullable: true })
    dayOfMonth: number;

    /**
     * Tuần tương đối: first, second, third, fourth, last
     */
    @Column({ name: 'relative_week', type: 'varchar', length: 50, nullable: true })
    relativeWeek: string;

    /**
     * Thứ tương đối: 0-6 (CN-T7)
     */
    @Column({ name: 'relative_day', type: 'int', nullable: true })
    relativeDay: number;

    /**
     * Giờ lặp hàng ngày: HH:mm (ví dụ 09:00)
     */
    @Column({ name: 'start_time', type: 'varchar', length: 5, nullable: true })
    startTime: string;

    /**
     * Số ngày thực hiện công việc (để tính toán endDate cho task sinh ra)
     */
    @Column({ name: 'duration_days', type: 'int', default: 1 })
    durationDays: number;

    /**
     * Ngày bắt đầu vòng lặp
     */
    @Column({ name: 'start_date', type: 'datetime' })
    startDate: Date;

    /**
     * Ngày kết thúc vòng lặp
     */
    @Column({ name: 'end_date', type: 'datetime' })
    endDate: Date;

    @Column({ name: 'pause_reason', type: 'nvarchar', length: 'MAX', nullable: true })
    pauseReason: string;

    @Column({ name: 'pause_start_date', type: 'datetime', nullable: true })
    pauseStartDate: Date | null;

    @Column({ name: 'pause_end_date', type: 'datetime', nullable: true })
    pauseEndDate: Date | null;

    @Column({ name: 'pause_indefinitely', type: 'bit', default: 0 })
    pauseIndefinitely: boolean;

    /**
     * Dữ liệu thô để tạo task (JSON: assigners, directors, note, priority, etc.)
     */
    @Column({ name: 'task_data', type: 'nvarchar', length: 'MAX' })
    taskData: string;

    /**
     * ID của quy trình mẫu (template) được áp dụng cho recurring task
     */
    @Column({ name: 'template_id', type: 'nvarchar', length: 100, nullable: true })
    templateId: string;

    // Metadata cho BPMN
    @Column({ name: 'bpmn_id', type: 'nvarchar', length: 100, nullable: true })
    bpmnId: string;

    @Column({ name: 'bpmn_xml', type: 'nvarchar', length: 'MAX', nullable: true })
    bpmnXml: string;

    @Column({ name: 'flow_id', type: 'nvarchar', length: 100, nullable: true })
    flowId: string;

    @Column({ name: 'doc_type', type: 'nvarchar', length: 100, nullable: true })
    docType: string;

    @Column({ name: 'routing_key', type: 'nvarchar', length: 100, nullable: true })
    routingKey: string;

    @Column({ type: 'int', default: 1 })
    status: number;

    @Column({ name: 'last_executed_at', type: 'datetime', nullable: true })
    lastExecutedAt: Date;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'created_by' })
    createdBy: UserEntity;

    @Column({ name: 'created_by', type: 'nvarchar', length: 100 })
    createdById: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'updated_by' })
    updatedBy: UserEntity;

    @Column({ name: 'updated_by', type: 'nvarchar', length: 100, nullable: true })
    updatedById: string;

    @Column({
    name: 'is_approval_required',
    type: 'bit',
    default: 0,
    nullable: true,
  })
  isApprovalRequired: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
