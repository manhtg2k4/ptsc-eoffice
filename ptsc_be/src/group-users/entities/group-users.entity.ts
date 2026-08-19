import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { MenuManager } from 'src/menu-manager/menu-manager.schema';
import { MenuManagerEntity } from 'src/menu-manager/entities/menu-manager.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { RolesProcessEntity } from 'src/role-feature/role-feature-sql/roles-process.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity('group_users')
export class GroupUserEntity {
  @PrimaryColumn({ type: 'nvarchar', length: 100, name: 'id' })
  id: string; // MongoDB ObjectId format (24 hex characters)
  // @PrimaryColumn({ type: 'nvarchar', length: 100, default: () => `'${uuidv4()}'`, name: 'id' })
  // // @PrimaryColumn({ type: 'nvarchar', length: 100, name: 'id' })
  // id: string;
  @Column({ type: 'nvarchar', length: 255 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'nvarchar', length: 255 })
  code: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  type: string | null;

  @Column({
    type: 'nvarchar',
    length: 'max',
    nullable: true,
    transformer: {
      to: (value: string[] | null) => JSON.stringify(value ?? []),
      from: (value: string) => {
        try {
          return JSON.parse(value ?? '[]');
        } catch {
          return [];
        }
      },
    },
  })
  userId: string[] | null;

  /** ManyToMany với User */
  @ManyToMany(() => UserEntity, (user) => user.groupUsers)
  users: UserEntity[];

  @ManyToMany(() => RolesProcessEntity, (roleProcess) => roleProcess.groups)
  rolesProcess: RolesProcessEntity[];

  /** ManyToMany với OrganizationUnit */
  @ManyToMany(() => OrganizationUnitEntity, (org) => org.groupUsers)
  @JoinTable({
    name: 'group_user_organization_units',
    joinColumn: { name: 'group_user_id' },
    inverseJoinColumn: { name: 'organization_unit_id' },
  })
  organizationUnits: OrganizationUnitEntity[];

  @Column({ type: 'int', default: 1 })
  status: number;

  @Column({ type: 'int', default: 1 })
  order: number;

  @Column({ name: 'is_default_incoming', type: 'bit', nullable: true, default: 0 })
  isDefaultIncoming: boolean;

  @Column({ type: 'nvarchar', nullable: true })
  description: string | null;

  @ManyToOne(() => MenuManagerEntity, (menu) => menu.groupUsers, {
    nullable: true,
  })
  @JoinColumn({ name: 'permissionsId' }) // Hoặc tên cột đúng trong DB của bạn
  permissions: MenuManagerEntity | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  roleType: string | null;

 @Column({
    type: 'nvarchar',
    length: 'MAX',
    default: '[]',
    transformer: {
      to: (value: string[]) => JSON.stringify(value),
      from: (value: any) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value !== 'string') return [];
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      },
    },
  })
  roles: string[];

  /**
   * ✅ ROLES_DYNAMIC
   * Lưu đúng y hệt FE gửi
   */
  @Column({
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
    transformer: {
      to: (value: any[] | null) => JSON.stringify(value ?? []),
      from: (value: string) => {
        try {
          return JSON.parse(value ?? '[]');
        } catch {
          return [];
        }
      },
    },
  })
  roles_dynamic: {
    processKey: string;
    roleCode: string;
    name: string;
  }[];

  @Column({ type: 'int', nullable: true, name: 'hrm_job_id' })
  hrmJobId: number | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
