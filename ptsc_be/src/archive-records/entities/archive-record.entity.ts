import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ArchiveRecordItem } from './archive-record-item.entity';
import { RecordExploitationArchiveRecord } from 'src/record-exploitation/entities/record-exploitation-archive-record.entity';
import { ArchiveAccessLog } from './archive-access-logs.entity';

@Entity({ name: 'archive_records' })
export class ArchiveRecord {
  // ID hồ sơ (khóa chính, tự sinh UUID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Tiêu đề / tên hồ sơ lưu trữ
  @Column({ type: 'nvarchar', length: 500 })
  title: string;

  // Danh mục / loại hồ sơ (nhân sự, tài chính, dự án…)
  @Column({ type: 'nvarchar', length: 255, nullable: true })
  category?: string;

  // Mã hồ sơ / số ký hiệu hồ sơ nội bộ
  @Column({ name: 'file_code', type: 'nvarchar', length: 100, nullable: true })
  fileCode?: string;

  // Phòng ban / đơn vị liên quan tới hồ sơ
  @Column({
    name: 'related_department',
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  relatedDepartment?: string;

  // Năm hình thành hồ sơ
  @Column({ name: 'formation_year', type: 'nvarchar', length: 255, nullable: true })
  formationYear?: string;

  // Thời hạn bảo quản (5 năm, 10 năm, vĩnh viễn…)
  @Column({
    name: 'retention_period',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  retentionPeriod?: string;

  // Chế độ sử dụng (nội bộ, công khai, hạn chế…)
  @Column({ name: 'usage_mode', type: 'nvarchar', length: 100, nullable: true })
  usageMode?: string;

  // Ngôn ngữ tài liệu (VI, EN…)
  @Column({ type: 'nvarchar', length: 100, nullable: true })
  language?: string;

  // Ngày bắt đầu hồ sơ
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: Date;

  // Ngày kết thúc hồ sơ
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: Date;

  // Ghi chú thêm
  @Column({ type: 'nvarchar', nullable: true })
  notes?: string;

  // Trạng thái xóa mềm: 1 = hoạt động, 0 = đã xóa
  @Column({ type: 'int', default: 1 })
  status: number;

  // Người tạo hồ sơ
  @Column({ name: 'created_by', type: 'nvarchar', length: 50, nullable: true })
  createdBy?: string;
  // Trạng thái nghiệp vụ hồ sơ: 1 = mở, 2 = đang thu thập, 3 = đã đóng
  @Column({ name: 'record_state', type: 'int', default: 1 })
  recordState: number;

  // Thời gian tạo bản ghi
  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  // Thời gian cập nhật gần nhất
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  // Danh sách tài liệu/file thuộc hồ sơ
  @OneToMany(() => ArchiveRecordItem, (item) => item.archiveRecord)
  items: ArchiveRecordItem[];

  @OneToMany(
    () => RecordExploitationArchiveRecord,
    (rear) => rear.archiveRecord,
  )
  recordExploitationArchiveRecords: RecordExploitationArchiveRecord[];


  // LOG truy cập hồ sơ
  @OneToMany(() => ArchiveAccessLog, (log) => log.archiveRecord)
  accessLogs: ArchiveAccessLog[];

  // ======================
  // 🔥 COUNT FIELD (NOT PHYSICAL COLUMN)
  // ======================
  @Column({ name: 'total_documents', type: 'int', nullable: true, select: false })
  totalDocuments?: number;

  @Column({ name: 'total_files', type: 'int', nullable: true, select: false })
  totalFiles?: number;

  @Column({ name: 'expiry_date', type: 'datetime', nullable: true })
  expiryDate?: Date | null;

  static calculateExpiryDate(
    endDate: Date | string | null | undefined,
    retentionPeriod: string | null | undefined,
  ): Date | null {
    if (!endDate || !retentionPeriod) return null;
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return null;

    const period = retentionPeriod.toString().trim().toLowerCase();

    if (
      period.includes('vĩnh viễn') ||
      period.includes('vinh vien') ||
      period === 'vv' ||
      period === 'vinh_vien' ||
      period.includes('forever')
    ) {
      return null;
    }

    const matches = period.match(/\d+/);
    if (!matches) return null;

    const value = parseInt(matches[0], 10);
    if (isNaN(value) || value <= 0) return null;

    const expiry = new Date(end);
    if (
      period.includes('giây') ||
      period.includes('giay') ||
      period.includes('second')
    ) {
      expiry.setSeconds(expiry.getSeconds() + value);
    } else if (
      period.includes('phút') ||
      period.includes('phut') ||
      period.includes('minute')
    ) {
      expiry.setMinutes(expiry.getMinutes() + value);
    } else if (
      period.includes('giờ') ||
      period.includes('gio') ||
      period.includes('hour')
    ) {
      expiry.setHours(expiry.getHours() + value);
    } else if (
      period.includes('ngày') ||
      period.includes('ngay') ||
      period.includes('day')
    ) {
      expiry.setDate(expiry.getDate() + value);
    } else if (
      period.includes('tháng') ||
      period.includes('thang') ||
      period.includes('month')
    ) {
      expiry.setMonth(expiry.getMonth() + value);
    } else if (
      period.includes('năm') ||
      period.includes('nam') ||
      period.includes('year')
    ) {
      expiry.setFullYear(expiry.getFullYear() + value);
    } else {
      expiry.setFullYear(expiry.getFullYear() + value);
    }
    return expiry;
  }

  @BeforeInsert()
  @BeforeUpdate()
  updateExpiryDate() {
    this.expiryDate = ArchiveRecord.calculateExpiryDate(
      this.endDate,
      this.retentionPeriod,
    );
  }
}
