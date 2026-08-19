import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('work_items')
@Index(['documentId', 'state'])
export class WorkItem {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 50, name: 'document_id' })
  documentId: string;

  @Column({ type: 'varchar', length: 100, name: 'node_id' })
  nodeId: string;

  @Column({ type: 'varchar', length: 100 })
  role: string;

  @Index()
  @Column({ type: 'varchar', length: 50, name: 'assignee_user_id', nullable: true })
  assigneeUserId: string | null;

  @Column({ type: 'varchar', length: 100, name: 'node_type' })
  nodeType: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'open',
    comment: 'open, completed, cancelled',
  })
  state: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;
}

