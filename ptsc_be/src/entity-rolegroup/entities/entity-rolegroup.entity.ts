import { RoleGroupEntity } from 'src/role-group/role-group.entity';
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

export type EntityType = 'organization' | 'group' | 'user';

@Entity({ name: 'entity_role_group' })
@Index(['unitId', 'entityType', 'clientId'], { unique: true })
export class EntityRoleGroupEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ type: 'nvarchar', nullable: false, name: 'unit_id' })
  unitId: string; // ID của đơn vị, nhóm, hoặc người dùng

  @Column({ type: 'nvarchar', nullable: false, name: 'entity_type' })
  entityType: EntityType; // "organization", "group", "user"

  @Column({ type: 'uniqueidentifier', name: 'role_group_id' })
  roleGroupId: string; // FK sang RoleGroup

  @ManyToOne(() => RoleGroupEntity, { eager: false })
  @JoinColumn({ name: 'role_group_id' })
  roleGroup: RoleGroupEntity;
  
  @Column({ type: 'nvarchar', nullable: false, name: 'client_id' })
  clientId: string; // Tenant ID

  @Column({ type: 'bit', default: 1, name: 'is_active' })
  isActive: boolean; // Trạng thái hoạt động

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;
}
