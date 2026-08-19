import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';

@Entity({
  name: 'roles_process',
  schema: 'dbo',
})
export class RolesProcessEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ name: 'role_code', type: 'nvarchar', length: 100 })
  roleCode: string;

  @Column({ name: 'role_name', type: 'nvarchar', length: 200 })
  roleName: string;

  @Column({ name: 'process_key', type: 'nvarchar', length: 100 })
  @Index()
  processKey: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'bit', default: 1 })
  isActive: boolean;

  @ManyToMany(() => UserEntity, (user) => user.rolesProcess, { cascade: true })
  @JoinTable({
    name: 'roles_process_users',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  users: UserEntity[];

  @ManyToMany(() => GroupUserEntity, (group) => group.rolesProcess, { cascade: true })
  @JoinTable({
    name: 'roles_process_groups',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'group_id', referencedColumnName: 'id' },
  })
  groups: GroupUserEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
