import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('archives_documents')
export class ArchivesEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number; // ID duy nhất, tự tăng

  @Column({ type: 'nvarchar', length: 255, nullable: false, name: 'archives_number' })
  archivesNumber: string; // Số và ký hiệu hồ sơ (tự sinh)

  @Column({ type: 'int', nullable: true, name: 'source_storage_id' })
  archivesName: number | null; // FK liên kết với source_storage_documents.id (Tiêu đề hồ sơ - SELECT từ hồ sơ nguồn)

  @Column({ type: 'nvarchar', length: 100, nullable: false, name: 'archives_type' })
  archivesType: string; // Loại hồ sơ (lưu ID: projectPolice, projectHospital, projectCntt)

  @Column({ type: 'nvarchar', length: 100, nullable: false, name: 'archives_deadline' })
  archivesDeadline: string; // Thời hạn bảo quản (lưu ID: forever, 30year, 20year, 10year)

  @Column({ type: 'nvarchar', length: 100, nullable: false, name: 'archives_mode' })
  archivesMode: string; // Chế độ sử dụng (lưu ID: private, public)

  @Column({ type: 'datetime', nullable: false, name: 'archives_year' })
  archivesYear: Date; // Năm hình thành hồ sơ

  @Column({ type: 'nvarchar', length: 100, nullable: false, name: 'archives_organization_unit' })
  archivesOrganizationUnit: string; // Phòng ban/Đơn vị chịu trách nhiệm (lưu ID: 001, 002, 003, 004)

  @Column({ type: 'nvarchar', length: 100, nullable: false, name: 'archives_language' })
  archivesLanguage: string; // Ngôn ngữ (lưu ID: Japan, america, dongLao, vn)

  @Column({ type: 'nvarchar', length: 500, nullable: true, name: 'archives_note' })
  archivesNote?: string | null; // Ghi chú

  @Column({ type: 'nvarchar', length: 100, nullable: true, name: 'archives_status' })
  archivesStatus?: string | null; // Trạng thái hồ sơ (Chưa phê duyệt danh mục, Đã phê duyệt...)

  @Column({ type: 'bit', nullable: false, default: 1, name: 'is_draft' })
  isDraft: boolean; // 1: draft, 0: đã lưu chính thức

  @Column({ type: 'int', nullable: false, default: 1 })
  status: number; // 1: hoạt động, 0: đã xóa

  @Column({ type: 'nvarchar', length: 100, nullable: true, name: 'created_by' })
  createdBy?: string | null; // Người tạo

  @CreateDateColumn({ type: 'datetime', name: 'created_at', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at', nullable: true })
  updatedAt?: Date | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true, name: 'destroy_batch_code' })
  destroyBatchCode?: string | null;
}
