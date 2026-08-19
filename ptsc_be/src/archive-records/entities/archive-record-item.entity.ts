import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ArchiveRecord } from './archive-record.entity';
import { ArchiveRecordItemFile } from './archive-record-item-flie.entity';

@Entity({ name: 'archive_record_items' })
export class ArchiveRecordItem {
  // ID dòng tài liệu trong hồ sơ (UUID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ID hồ sơ cha
  @Column({ name: 'archive_record_id', type: 'uniqueidentifier' })
  archiveRecordId: string;

  // Thứ tự sắp xếp
  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;

  // Tên nhóm / mục lục
  @Column({ name: 'group_name', type: 'nvarchar', length: 500 })
  groupName: string;

  // Ghi chú
  @Column({ type: 'nvarchar', nullable: true })
  notes?: string;

  // Thời gian tạo
  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  // Trạng thái: 1 = hoạt động, 0 = đã xóa
  @Column({ type: 'int', default: 1 })
  status: number;

  // Quan hệ tới hồ sơ
  @ManyToOne(() => ArchiveRecord, (record) => record.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'archive_record_id' })
  archiveRecord: ArchiveRecord;

  // 🔥 MỘT ITEM – N FILE
  @OneToMany(() => ArchiveRecordItemFile, (f) => f.item, {
    cascade: true,
  })
  files: ArchiveRecordItemFile[];
}
