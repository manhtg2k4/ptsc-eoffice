import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('entity_role_groups')
@Unique(['unitId', 'entityType', 'clientId'])
export class EntityRoleGroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'unit_id', type: 'nvarchar', length: 255 })
  unitId: string;

  @Column({ name: 'entity_type', type: 'nvarchar', length: 50 })
  entityType: string; // 'organization', 'group', 'user'

  @Column({ name: 'role_group_id', type: 'nvarchar', length: 255 })
  roleGroupId: string;

  @Column({ name: 'client_id', type: 'nvarchar', length: 255 })
  clientId: string;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;
}

