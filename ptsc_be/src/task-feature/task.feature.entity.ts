import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('task_features') // Tên bảng vẫn giữ nguyên
export class TaskFeatureEntity {
  @PrimaryColumn({ type: 'nvarchar', length: 100 })
  id: string;  // id (chuỗi, nvarchar(100))

  @Column({ name: 'process_id', type: 'nvarchar', length: 100 })
  processId: string;  // process_id (snake_case)

  @Column({ name: 'task_id', type: 'nvarchar', length: 100 })
  taskId: string;  // task_id (snake_case)

  @Column({ name: 'task_name', type: 'nvarchar', length: 255, nullable: true })
  taskName: string;  // task_name (snake_case)

  @Column({ name: 'feature_code', type: 'nvarchar', length: 100, nullable: true })
  featureCode: string;  // feature_code (snake_case)

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;  // created_at (snake_case)

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;  // updated_at (snake_case)
}
