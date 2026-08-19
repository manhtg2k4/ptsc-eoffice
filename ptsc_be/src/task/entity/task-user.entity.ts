import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TaskEntity } from './task.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { OrganizationUnitEntity } from '../../organization-unit/organization-unit_sql/organization-unit.entity';
import { TaskUserRole, TaskUserType } from './task.constants';

@Entity('task_users')
export class TaskUserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TaskEntity, (task) => task.taskUsers)
  @JoinColumn({ name: 'task_id' })
  task: TaskEntity;

  @Column({ name: 'task_id', type: 'int' })
  taskId: number;

  // process_id có thể là user hoặc department.
  // Đây là một cách để xử lý quan hệ đa hình.
  // Khi lưu, bạn sẽ chỉ định `process_id` và `type`.
  // Khi truy vấn, bạn có thể join với bảng tương ứng dựa trên `type`.
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'process_id', referencedColumnName: 'id' })
  user: UserEntity;

  @ManyToOne(() => OrganizationUnitEntity)
  @JoinColumn({ name: 'process_id', referencedColumnName: 'id' })
  organizationUnit: OrganizationUnitEntity;

  @Column({ name: 'process_id', type: 'nvarchar', length: 100 })
  processId: string;

  @Column({
    name: 'process_name',
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  processName: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  role: string;

  @Column({ type: 'int' })
  type: number;

  @UpdateDateColumn({ type: 'datetime', name: 'update_at' })
  updatedAt: Date;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;
}
