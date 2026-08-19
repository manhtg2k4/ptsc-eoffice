import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('task_change_requests')
export class TaskChangeRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  taskId: number;

  @Column('json')
  changeData: any;

  @Column({ nullable: true })
  reason: string;

  @Column({ default: 'PENDING' })
  status: string;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
