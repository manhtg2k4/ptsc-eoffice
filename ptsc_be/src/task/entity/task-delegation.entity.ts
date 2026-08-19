import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity('task_delegations')
export class TaskDelegationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'from_user_id', type: 'nvarchar', length: 100 })
  fromUserId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'from_user_id' })
  fromUser: UserEntity;

  @Column({ name: 'to_user_id', type: 'nvarchar', length: 100 })
  toUserId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'to_user_id' })
  toUser: UserEntity;

  @Column({ type: 'datetime' })
  startDate: Date;

  @Column({ type: 'datetime' })
  endDate: Date;

  @Column({ default: 1 })
  status: number; // 1: Active, 0: Inactive/Deleted

  @Column({ name: 'created_by_id', type: 'nvarchar', length: 100, nullable: true })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
