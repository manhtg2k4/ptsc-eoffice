// src/task-document-link/entities/task-document-link.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity('task_document_links')
export class TaskDocumentLinkEntity {
  /** ID tự tăng */
  @PrimaryGeneratedColumn('increment')
  id: number;

  /** ID công việc liên kết */
  @Column({ name: 'taskId', type: 'nvarchar', length: 255 })
  @Index()
  taskId: string;

  /** Loại đối tượng (task, project, meeting, document...) để phân biệt */
  @Column({ name: 'objectType', type: 'nvarchar', length: 100, nullable: true })
  @Index()
  objectType: string;

  /** Tên tài liệu */
  @Column({ name: 'documentName', type: 'nvarchar', length: 500 })
  documentName: string;

  /** Đường dẫn tài liệu */
  @Column({ name: 'documentUrl', type: 'nvarchar', length: 2000 })
  documentUrl: string;

  /** Mô tả tài liệu (tùy chọn) */
  @Column({ name: 'description', type: 'nvarchar', length: 'MAX', nullable: true })
  description: string;

  /** ID người tạo link */
  @Column({ name: 'createdById', type: 'nvarchar', length: 100 })
  createdById: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  creator?: UserEntity;

  /** Tên người tạo link */
  @Column({ name: 'createdByName', type: 'nvarchar', length: 255, nullable: true })
  createdByName: string;

  /** Ngày tạo bản ghi */
  @CreateDateColumn({ name: 'createdAt', type: 'datetime' })
  createdAt: Date;

  /** Ngày cập nhật cuối cùng */
  @UpdateDateColumn({ name: 'updatedAt', type: 'datetime' })
  updatedAt: Date;
}
