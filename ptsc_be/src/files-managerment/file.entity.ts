import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('files')
@Index(['parent_id', 'status'])
export class FileEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'nvarchar', length: 255 })
  file_name: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  file_path: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  mime_type: string;

  @Column({ type: 'bigint', nullable: true })
  file_size: number;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  description: string;

  @Column({ type: 'bit', default: false })
  is_directory: boolean;

  @Column({ type: 'bigint', nullable: true })
  parent_id: number;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  file_type: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  typeSize: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  created_by: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  version: string;

  @Column({ type: 'bit', default: false })
  is_signed_file: boolean;
  
  @Column({ type: 'bit', default: false })
  is_important: boolean;

  @Column({ type: 'bit', default: false, name: 'is_recall' })
  isRecall: boolean;

  @Column({ type: 'bigint', default: 0 })
  number_of_signed_file: number;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  storage_type: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  storage_path: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true, unique: true })
  example_key: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true, default: 'template' })
  example_type: string;

  @Column({ type: 'int', default: 1 })
  status: number;

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;
}