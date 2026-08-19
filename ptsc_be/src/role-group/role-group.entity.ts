import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('role_groups')
export class RoleGroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'client_id', type: 'nvarchar', length: 255 })
  clientId: string;

  @Column({ name: 'name', type: 'nvarchar', length: 500 })
  name: string;

  @Column({ name: 'code', type: 'nvarchar', length: 255, unique: true })
  code: string;

  @Column({ name: 'description', type: 'nvarchar', length: 'max', nullable: true })
  description?: string;

  @Column({ name: 'entity_type', type: 'nvarchar', length: 255 })
  entityType: string;

  @Column({
    name: 'roles',
    type: 'nvarchar',
    length: 'max',
    nullable: true,
    transformer: {
      to: (value: any) => (value ? JSON.stringify(value) : null),
      from: (value: any) => {
        try {
          return value ? JSON.parse(value) : [];
        } catch {
          return [];
        }
      },
    },
  })
  roles: any[];

  @Column({ name: 'apply_to_module', type: 'bit', default: false })
  applyToModule: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;
}
