import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

export class Role {
  id?: string;
  name: string;
  roleCode: string;
  permissions: string[];
  users: string[]; // Mảng các userId
  groups?: string[]; // Mảng các groupId
}

@Entity({
  name: 'role_feature',   // tên bảng
  schema: 'dbo',          // schema
})
export class RoleFeatureEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ name: 'process_key', unique: true })
  @Index()
  processKey: string;

  @Column({ type: 'simple-json' })
  roles: Role[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
