import { Entity, PrimaryColumn, Column } from 'typeorm';
import { StorageType } from './update-storage-config.dto';

@Entity('storage_config')
export class StorageConfigEntity {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({
    type: 'nvarchar',
    length: 50,
    enum: StorageType,
    default: StorageType.FILESYSTEM,
  })
  active_type: StorageType;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  fs_base_path?: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  minio_endpoint?: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  minio_access_key?: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  minio_secret_key?: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  minio_bucket?: string;
}