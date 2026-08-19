import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { NotificationType } from './notification.enum';

@Entity('notifications')
@Index(['recipientId', 'isRead', 'createdAt']) // Tối ưu query
export class NotificationEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'nvarchar', length: 255 })
  recipientId: string; // ID người nhận

  @Column({ type: 'nvarchar', length: 255 })
  senderId: string; // ID người gửi (người thực hiện hành động)

  @Column({ type: 'nvarchar', length: 'max' })
  content: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  title?: string; // Tiêu đề thông báo

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  link?: string; // Đường dẫn khi click vào thông báo

  @Column({ type: 'bit', default: false })
  isRead: boolean; // Trạng thái đã đọc hay chưa

  @Column({ type: 'bit',name: 'is_hidden', default: false })
  isHidden: boolean; // Cờ ẩn thông báo

  @Column({ type: 'nvarchar', length: 100 })
  key: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  type?: NotificationType; // Loại thông báo chi tiết

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  recordId?: string; // ID của văn bản/đối tượng liên quan

  @Column({ type: 'int', default: 1 })
  status: number;

  @CreateDateColumn({ type: 'datetime2', name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updatedAt' })
  updatedAt: Date;
}