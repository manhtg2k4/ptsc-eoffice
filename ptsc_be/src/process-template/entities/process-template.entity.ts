import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ProcessTemplateTaskEntity } from '../entities/process-template-task.entity';

@Entity('process_templates')
export class ProcessTemplateEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'code', type: 'nvarchar', length: 255, unique: true })
    code: string;

    @Column({ name: 'name', type: 'nvarchar', length: 255 })
    name: string;

    @Column({ name: 'total_execution_time', type: 'nvarchar', length: 255, nullable: true })
    totalExecutionTime: string;

    @Column({ name: 'updated_by', type: 'nvarchar', length: 255, nullable: true })
    updatedBy: string;

    @Column({ name: 'description', type: 'nvarchar', length: 'max', nullable: true })
    description?: string;

    @Column({ name: 'status', type: 'int', default: 1 })
    status: number;

    @OneToMany(() => ProcessTemplateTaskEntity, (task) => task.processTemplate, {
        cascade: true,
        // orphanRemoval: true // Bật tùy chọn này để TypeORM tự động xóa task cũ không còn trong danh sách
    })
    tasks: ProcessTemplateTaskEntity[];

    @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
    updatedAt: Date;
}
