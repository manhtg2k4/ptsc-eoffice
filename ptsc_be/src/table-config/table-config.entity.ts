import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({
  name: 'table_configs',
  schema: 'dbo',
})
@Index(['owner', 'module'], { unique: true })
export class TableConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'nvarchar', length: 255 })
  owner: string; // userId

  @Column({ type: 'nvarchar', length: 255 })
  module: string;

  @Column({ type: 'simple-json' })
  columns: Record<string, any>[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}