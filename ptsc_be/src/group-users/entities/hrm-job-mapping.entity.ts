import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { GroupUserEntity } from './group-users.entity';

@Entity('hrm_job_mappings')
export class HrmJobMappingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'group_user_id', type: 'nvarchar', length: 100 })
  groupUserId: string;

  @Index()
  @Column({ name: 'hrm_job_code', type: 'nvarchar', length: 255 })
  hrmJobCode: string;

  @Column({ name: 'hrm_job_name', type: 'nvarchar', length: 255, nullable: true })
  hrmJobName: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => GroupUserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_user_id' })
  groupUser: GroupUserEntity;
}
