import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity('task_assignment_configs')
export class TaskAssignmentConfigEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'unit_id', type: 'nvarchar', length: 100 })
  unitId: string;

  @ManyToOne(() => OrganizationUnitEntity)
  @JoinColumn({ name: 'unit_id' })
  unit: OrganizationUnitEntity;

  @Column({ name: 'user_id', type: 'nvarchar', length: 100 })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ default: 1 })
  status: number;

  @Column({ name: 'created_by_id', type: 'nvarchar', length: 100, nullable: true })
  createdById: string;

  @Column({ name: 'updated_by_id', type: 'nvarchar', length: 100, nullable: true })
  updatedById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
