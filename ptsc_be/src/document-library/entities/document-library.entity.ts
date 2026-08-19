import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('document_library')
export class DocumentLibraryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 550 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  type: string; // 'folder' | 'file'

  @Column({ type: 'int', name: 'parent_id', nullable: true })
  parentId: number;

  @Column({ type: 'nvarchar', length: 800, nullable: true })
  path: string;

  @Column({ type: 'varchar', length: 50, name: 'file_type', nullable: true })
  fileType: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  owner: string;

  @Column({ type: 'bigint', name: 'file_id', nullable: true })
  fileId: number;

  @Column({ type: 'nvarchar', name: 'view_permissions', length: 'max', nullable: true })
  viewPermissions: string; // Store as JSON string

  @Column({ type: 'nvarchar', name: 'edit_permissions', length: 'max', nullable: true })
  editPermissions: string; // Store as JSON string

  @Column({ type: 'nvarchar', name: 'view_user_permissions', length: 'max', nullable: true })
  viewUserPermissions: string; // Store as JSON string
  
  @Column({ type: 'nvarchar', name: 'edit_organization_unit', length: 100, nullable: true })
  editOrganizationUnit: string;

   @Column({ type: 'bit', default: false })
  folderLockStatus: boolean;

  @Column({ type: 'int', default: 1 })
  status: number; // 1: active, 3: deleted

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updated_at' })
  updatedAt: Date;
}
