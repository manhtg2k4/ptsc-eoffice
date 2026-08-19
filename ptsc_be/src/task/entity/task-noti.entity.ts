import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity('task_notifications')
export class TaskNotificationEntity {
  @PrimaryGeneratedColumn('increment') id: number;
  @Column({ type: 'nvarchar', length: 255 }) recipientId: string;
  @Column({ type: 'nvarchar', length: 255 }) senderId: string;
  // ID người gửi (người thực hiện hành động)
  @Column({ type: 'nvarchar', length: 'max' }) content: string;
  @Column({ type: 'nvarchar', length: 500, nullable: true }) link?: string;
  // Đường dẫn khi click vào thông báo
  @Column({ type: 'bit', default: false }) isRead: boolean;
  // // Trạng thái đã đọc hay chưa
  @Column({ type: 'int'}) taskId?: number;
  // ID task liên qua
  @Column({ type: 'int', default: 1 }) status: number;
  @Column({ type: 'nvarchar', length: 100 }) type: string;

  @CreateDateColumn({ type: 'datetime2', name: 'createdAt' }) createdAt: Date;
  @UpdateDateColumn({ type: 'datetime2', name: 'updatedAt' }) updatedAt: Date;
}
