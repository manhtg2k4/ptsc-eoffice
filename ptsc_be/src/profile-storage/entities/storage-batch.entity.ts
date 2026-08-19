import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('storage_batch_documents')
export class StorageBatchEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number; // ID duy nhất, tự tăng

  @Column({ type: 'nvarchar', length: 255, nullable: false })
  name: string; // Tên đợt lưu trữ

  @Column({ type: 'nvarchar', length: 255, nullable: false })
  code: string; // Mã đợt lưu trữ

  @Column({ type: 'nvarchar', length: 100, nullable: false })
  scope: string; // Phạm vi đợt lưu trữ (year, quarter, option)

  @Column({ type: 'datetime', nullable: true, name: 'storage_start_date' })
  storageStartDate?: Date | null; // Ngày bắt đầu

  @Column({ type: 'datetime', nullable: true, name: 'storage_end_date' })
  storageEndDate?: Date | null; // Ngày kết thúc

  @Column({ type: 'nvarchar', length: 255, nullable: true, name: 'create_reason' })
  createReason?: string | null; // Lý do/căn cứ

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true, name: 'attachment_file' })
  attachmentFile?: string | null; // File đính kèm (JSON string: ["file1.pdf", "file2.pdf"])

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  note?: string | null; // Ghi chú

  @Column({ type: 'nvarchar', length: 100, nullable: true, name: 'status_code' })
  statusCode?: string | null; // Mã trạng thái

  @Column({ type: 'int', nullable: false, default: 1 })
  status: number; // 1: hoạt động, 0: đã xóa

  @Column({ type: 'nvarchar', length: 100, nullable: true, name: 'created_by' })
  createdBy?: string | null; // Người tạo (FK users.id) - có thể bỏ trống

  @CreateDateColumn({ type: 'datetime', name: 'created_at', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at', nullable: true })
  updatedAt?: Date | null;
}
