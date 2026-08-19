import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ArchiveRecordItem } from './archive-record-item.entity';

@Entity({ name: 'archive_record_item_files' })
export class ArchiveRecordItemFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // FK sang archive_record_items.id
  @Column({ name: 'archive_record_item_id', type: 'uniqueidentifier' })
  archiveRecordItemId: string;

  // FK sang camunda.dbo.files
  @Column({ name: 'file_id', type: 'bigint' })
  fileId: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => ArchiveRecordItem, (item) => item.files, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'archive_record_item_id' })
  item: ArchiveRecordItem;
}
