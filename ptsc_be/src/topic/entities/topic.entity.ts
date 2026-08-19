import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('topics')
export class TopicEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'nvarchar', length: 255 })
  name: string;

  @Column({ name: 'href', type: 'nvarchar', length: 255, unique: true })
  href: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;


  @Column({ name: 'status', type: 'int', default: 1 })
  status: number;

  @Column({ name: 'requires_approval', type: 'bit', default: false })
  requiresApproval: boolean;

  @Column({ name: 'description', type: 'nvarchar', length: 'max', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;
}
