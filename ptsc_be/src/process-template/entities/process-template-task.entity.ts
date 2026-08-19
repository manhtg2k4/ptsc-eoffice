import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ProcessTemplateEntity } from './process-template.entity';

@Entity('process_template_tasks')
export class ProcessTemplateTaskEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'name', type: 'nvarchar', length: 255 })
    name: string;

    @Column({ name: 'description', type: 'nvarchar', length: 'max', nullable: true })
    description?: string;

    @Column({ name: 'execution_time', type: 'nvarchar', length: 255, nullable: true }) // Đổi sang nvarchar để nhận "SDXS"
    executionTime: string;

    @Column({ name: 'unit', type: 'nvarchar', length: 50, nullable: true })
    unit: string;

    @Column({ name: 'priority', type: 'nvarchar', length: 50, nullable: true, default: 'binhthuong' })
    priority: string;

    @Column({ name: 'deadline_reminder', type: 'nvarchar', length: 255, nullable: true }) // Đổi sang nvarchar để nhận chuỗi rỗng từ FE
    deadlineReminder: string;

    @Column({ name: 'display_order', type: 'int', default: 0 })
    displayOrder: number;

    @Column({ name: 'note', type: 'nvarchar', length: 'max', nullable: true }) // Thêm trường Note
    note: string;

    @Column({ name: 'dependency', type: 'nvarchar', length: 255, nullable: true }) // Thêm trường Dependency
    dependency: string;

    @Column({ name: 'reminder_time', type: 'nvarchar', length: 255, nullable: true }) // Thêm trường reminderTime
    reminderTime: string;

    @Column({
        name: 'files',
        type: 'nvarchar',
        length: 'max',
        nullable: true,
        transformer: {
            to: (value: any) => value ? JSON.stringify(value) : null,
            from: (value: string) => value ? JSON.parse(value) : []
        }
    }) // Thêm trường files lưu dạng JSON
    files: any[];

    @Column({ name: 'process_template_id', type: 'uniqueidentifier', nullable: true })
    processTemplateId: string;

    @ManyToOne(() => ProcessTemplateEntity, (template) => template.tasks, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'process_template_id' })
    processTemplate: ProcessTemplateEntity;

    @Column({ name: 'parent_id', type: 'uniqueidentifier', nullable: true })
    parentId: string;

    @ManyToOne(() => ProcessTemplateTaskEntity, (task) => task.children, { onDelete: 'NO ACTION' })
    @JoinColumn({ name: 'parent_id' })
    parent: ProcessTemplateTaskEntity;

    @OneToMany(() => ProcessTemplateTaskEntity, (task) => task.parent, { cascade: true })
    children: ProcessTemplateTaskEntity[];

    @Column({ name: 'path', type: 'nvarchar', length: 'max', nullable: true })
    path: string;

    @Column({
        name: 'is_approval_required',
        type: 'bit',
        default: 0,
        nullable: true,
    })
    isApprovalRequired: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
    updatedAt: Date;
}
