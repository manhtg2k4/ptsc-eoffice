import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ArchivesEntity } from './archives.entity';

@Entity('archives_document_index')
export class ArchivesDocumentIndexEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number; // ID duy nhất, tự tăng

  @Column({ type: 'nvarchar', length: 255, nullable: false, name: 'name_doc' })
  nameDoc: string; // Tên tài liệu

  @ManyToOne(() => ArchivesEntity, { nullable: false })
  @JoinColumn({ name: 'archives_id' })
  archives: ArchivesEntity; // Relationship với archives_documents

  @Column({ type: 'int', name: 'archives_id', nullable: false })
  archivesId: number; // FK -> archives_documents.id

  @Column({ type: 'int', nullable: false, default: 1 })
  status: number; // 1: hoạt động, 0: đã xóa

  @Column({ type: 'nvarchar', length: 100, nullable: true, name: 'created_by' })
  createdBy?: string | null; // Người tạo

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
