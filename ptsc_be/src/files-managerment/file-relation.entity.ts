import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('file_relations')
@Index(['object_type', 'object_id', 'status'])
export class FileRelationEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'nvarchar', length: 100 })
  object_type: string;

  @Column({ type: 'nvarchar', length: 100 })
  object_id: string;

  @Column({ type: 'bigint' })
  file_id: number;

  @Column({ type: 'int', default: 1 })
  status: number;

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;
}