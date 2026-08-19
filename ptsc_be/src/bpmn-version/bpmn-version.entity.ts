import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('bpmn_design_version')
export class BpmnVersionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'design_id', type: 'nvarchar', length: 255, nullable: true })
  designId?: string;

  @Column({ name: 'process_key', type: 'nvarchar', length: 255, nullable: true })
  processKey?: string;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @Column({ name: 'base64_file', type: 'nvarchar', length: 'max', nullable: true })
  base64File?: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;
}

