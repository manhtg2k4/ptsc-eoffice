import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('custom_sender_units')
export class CustomSenderUnitEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  /** Tên đơn vị gửi */
  @Column({ type: 'nvarchar', length: 255 })
  name: string;

  /** Mã đơn vị gửi */
  @Column({ type: 'nvarchar', length: 100 })
  code: string;

  /** ID đơn vị cha (có thể null) */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'parent_id' })
  parentId: string | null;

  /** Materialized path: đường dẫn đầy đủ từ root (ví dụ: "id1.id2.id3") - dùng để tìm subtree nhanh */
  @Column({ type: 'nvarchar', length: 1000, nullable: true, name: 'mpath' })
  mpath: string | null;

  /** ID người tạo (từ JWT token) */
  @Column({ type: 'varchar', length: 100, name: 'created_by' })
  createdBy: string;

  /** Tên người tạo */
  @Column({ type: 'nvarchar', length: 255, nullable: true, name: 'created_by_name' })
  createdByName: string | null;

  /** Trạng thái: 1 = Active, 0 = Deleted */
  @Column({ type: 'int', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({
    type: 'bit',
    name: 'is_sender_unit',
    default: true,
  })
  isSenderUnit: boolean;
}
