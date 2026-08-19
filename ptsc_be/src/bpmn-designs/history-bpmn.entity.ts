import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('HistoryBpmn')
export class HistoryBpmnEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  processInstanceId: string;

  @Column({ nullable: true })
  processDefinitionId: string;

  @Column({ nullable: false })
  taskId: string;

  @Column({ nullable: true })
  taskName: string;

  @Column({ nullable: true })
  assignee: string;

  @Column({ type: 'nvarchar', nullable: true })
  assigneeName: string | null;

  @Column({ type: 'nvarchar', nullable: true })
  senderName: string | null;

  @Column({ nullable: true })
  sender: string;

  // Lưu JSON → nvarchar(max)
  @Column({ type: 'nvarchar', nullable: true })
  variablesSubmitted: string | null; // JSON.stringify

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
