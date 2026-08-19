import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { StorageBatchEntity } from './storage-batch.entity';

@Entity('source_storage_documents')
export class SourceStorageEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number; // ID duy nhất, tự tăng

  @Column({ type: 'nvarchar', length: 255, nullable: false, name: 'text_symbol' })
  textSymbol: string; // Số và ký hiệu hồ sơ

  @Column({ type: 'nvarchar', length: 255, nullable: false })
  title: string; // Tiêu đề hồ sơ

  @Column({ type: 'nvarchar', length: 255, nullable: false })
  type: string; // Loại hồ sơ

  @ManyToOne(() => StorageBatchEntity, { nullable: false })
  @JoinColumn({ name: 'storage_batch_id' })
  storageBatch: StorageBatchEntity; // Relationship với storage_batch_documents

  @Column({ type: 'int', name: 'storage_batch_id', nullable: false })
  storageBatchId: number; // FK -> storage_batch_documents.id

  @Column({ type: 'int', nullable: false, default: 1 })
  status: number; // 1: hoạt động, 0: đã xóa

  @Column({ type: 'nvarchar', length: 100, nullable: false, name: 'created_by' })
  createdBy: string; // Người tạo (FK users.id)

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
