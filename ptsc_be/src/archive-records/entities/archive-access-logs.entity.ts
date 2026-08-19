import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ArchiveRecord } from './archive-record.entity';

@Entity({ name: 'archive_access_logs' })
export class ArchiveAccessLog {
  // ID log (UUID tự sinh)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ID hồ sơ bị truy cập
  @Column({ name: 'archive_record_id', type: 'uniqueidentifier' })
  archiveRecordId: string;

  // ID user truy cập
  @Column({ name: 'user_id', type: 'nvarchar', length: 100, nullable: true })
  userId?: string;

  // Tên user truy cập
  @Column({ name: 'user_name', type: 'nvarchar', length: 255, nullable: true })
  userName?: string;

  // Phòng ban user
  @Column({ type: 'nvarchar', length: 255, nullable: true })
  department?: string;

  // Hành động: VIEW / DOWNLOAD / PRINT / EDIT / DELETE...
  @Column({ name: 'action_type', type: 'nvarchar', length: 50 })
  actionType: string;

  // Thời gian truy cập
  @CreateDateColumn({ name: 'access_time', type: 'datetime' })
  accessTime: Date;

  @ManyToOne(() => ArchiveRecord, (record) => record.accessLogs, {
    onDelete: 'NO ACTION', // hoặc SET NULL nếu cho phép
  })
  @JoinColumn({ name: 'archive_record_id' })
  archiveRecord: ArchiveRecord;
}