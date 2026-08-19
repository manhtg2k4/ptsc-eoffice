import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { EnumGroup, ModuleType } from '../notification.enum';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity('notifications_config')
@Index(['code', 'userId'], { unique: true }) // Mỗi user có duy nhất 1 cấu hình cho 1 code loại thông báo
export class NotificationConfigEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'nvarchar', length: 100 })
  userId: string; // ID người dùng cấu hình

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity; // Liên kết tới UserEntity

  @Column({ type: 'nvarchar', length: 1000 })
  name: string; // Tên loại thông báo (VD: Văn bản đi được duyệt)

  @Column({ type: 'nvarchar', length: 100 })
  code: string; // Mã loại thông báo (VD: OUTGOING_DOC_APPROVED)

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  module: ModuleType; // Tên module liên quan (VD: VIEW_INCOMING_DOC, VIEW_OUTCOMING_DOC...)

  @Column({ type: 'simple-array', nullable: true })
  groups: EnumGroup[]; // Nhóm thông báo (Xử lý, Nhận)
}
