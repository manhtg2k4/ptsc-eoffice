import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { RolesProcessEntity } from 'src/role-feature/role-feature-sql/roles-process.entity';
import { v4 as uuidv4 } from 'uuid';

export class RoleItem {
  @Column({ name: 'role_code' })
  roleCode: string;

  @Column({ nullable: true, name: 'name' })
  name: string;
}

export class RolesByProcess {
  @Column({ name: 'process_key' })
  processKey: string;

  @Column({ nullable: true, name: 'name' })
  name: string;

  @Column('simple-json', { default: [], name: 'roles' })
  roles: RoleItem[];
}

@Entity('users')
export class UserEntity {
  @PrimaryColumn({
    type: 'nvarchar',
    length: 100,
    default: () => `'${uuidv4()}'`,
    name: 'id',
  })
  // @PrimaryColumn({ type: 'nvarchar', length: 100, name: 'id' })
  id: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true, name: 'password', select: false })
  password?: string | null;

  @Column({ type: 'nvarchar', length: 255, name: 'name' })
  name: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true, name: 'FullName' })
  fullName: string | null;

  @Column({
    type: 'nvarchar',
    length: 'MAX',
    default: '[]',
    transformer: {
      to: (value: any[]) => JSON.stringify(value),
      from: (value: string) => {
        try {
          if (!value || value === 'null' || value === 'undefined') return [];
          return JSON.parse(value);
        } catch {
          return [];
        }
      },
    },
    name: 'avatar',
  })
  avatar: Record<string, any>[];

  @Column({
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
    transformer: {
      to: (value: any) => (value ? JSON.stringify(value) : null),
      from: (value: string) => {
        try {
          return value ? JSON.parse(value) : null;
        } catch {
          return null;
        }
      },
    },
    name: 'profile_image',
  })
  profileImage: Record<string, any> | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true, name: 'code_nd' })
  codeND: string | null;

  @Column({ type: 'nvarchar', length: 255, name: 'username', unique: true })
  username: string;

  @Index()
  @Column({ type: 'nvarchar', length: 255, nullable: true, name: 'email_user' })
  emailUser: string | null;

  @Column({
    type: 'nvarchar',
    length: 50,
    nullable: true,
    name: 'phone_number_user',
  })
  phoneNumberUser: string | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true, name: 'position' })
  position: string | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true, name: 'leader' })
  leader: string | null;

  @Column({
    type: 'nvarchar',
    length: 255,
    nullable: true,
    name: 'address_user',
  })
  addressUser: string | null;

  @Column({
    type: 'nvarchar',
    length: 255,
    nullable: true,
    name: 'personal_secretary',
  })
  personalSecretary: string | null;

  @Column({
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
    name: 'description',
  })
  description: string | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true, name: 'role' })
  role: string | null;

  @Column({
    type: 'nvarchar',
    length: 'MAX',
    default: '[]',
    transformer: {
      to: (value: RolesByProcess[]) => JSON.stringify(value),
      from: (value: string) => {
        try {
          if (!value || value === 'null' || value === 'undefined') return [];
          return JSON.parse(value);
        } catch {
          return [];
        }
      },
    },
    name: 'roles_by_process',
  })
  rolesByProcess: RolesByProcess[];

  @Column({
    type: 'nvarchar',
    length: 255,
    nullable: true,
    name: 'organization_name',
  })
  organizationName: string | null;

  @Column({
    type: 'nvarchar',
    length: 255,
    nullable: true,
    name: 'organization_code',
  })
  organizationCode: string | null;

  @Column({
    type: 'nvarchar',
    length: 255,
    nullable: true,
    name: 'organization_type',
  })
  organizationType: string | null;

  @Column({ type: 'int', nullable: true, name: 'orders' })
  orders: number | null;

  @Column({ type: 'date', nullable: true, name: 'birthday' })
  birthday: Date | null;

  @Column({ type: 'nvarchar', length: 50, nullable: true, name: 'gender' })
  gender: string | null;

  @Column({
    type: 'nvarchar',
    length: 255,
    nullable: true,
    name: 'identification_card',
  })
  identificationCard: string | null;

  @Column({ type: 'datetime', nullable: true, name: 'contact_time' })
  contactTime: Date | null;

  @ManyToOne(() => OrganizationUnitEntity, { nullable: true })
  @JoinColumn({ name: 'parent' })
  parent: OrganizationUnitEntity | null;

  // /** Quan hệ 1-nhiều: 1 user có 1 phòng ban */
  // @ManyToOne(() => OrganizationUnitEntity, { nullable: true })
  // @JoinColumn({ name: 'organization_unit_id' })
  // organizationUnit: OrganizationUnitEntity | null;

  @ManyToMany(() => GroupUserEntity, (groupUser) => groupUser.users)
  @JoinTable({
    name: 'user_group_users',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'group_user_id' },
  })
  groupUsers: GroupUserEntity[];

  @ManyToMany(() => RolesProcessEntity, (roleProcess) => roleProcess.users)
  rolesProcess: RolesProcessEntity[];

  @Column({
    type: 'nvarchar',
    length: 255,
    nullable: true,
    name: 'wso2_user_id',
  })
  wso2UserId: string | null;

  @Column({
    type: 'nvarchar',
    length: 255,
    nullable: true,
    name: 'keycloak_user_id',
  })
  keycloakUserId: string | null;

  @Column({ type: 'int', default: 1, name: 'status' })
  status: number;

  @Column({
    type: 'nvarchar',
    length: 255,
    default: '',
    name: 'name_authorized',
  })
  nameAuthorized: string;

  @Column({
    type: 'nvarchar',
    length: 255,
    default: '',
    name: 'role_group_source_authorized',
  })
  roleGroupSourceAuthorized: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt: Date;

  @ManyToMany(() => FeatureManagementEntity, (f) => f.executor)
  features?: FeatureManagementEntity[];

  @Column({ type: 'nvarchar', length: 50, name: 'contentSignImage', nullable: true })
  contentSignImage: string;

  @Column({ type: 'nvarchar', length: 50, name: 'paraphSignImage', nullable: true })
  paraphSignImage: string;

  @Column({ type: 'nvarchar', length: 50, name: 'contentSignTransparentImage', nullable: true })
  contentSignTransparentImage: string;

  @Column({ type: 'nvarchar', length: 50, name: 'paraphSignTransparentImage', nullable: true })
  paraphSignTransparentImage: string;

  @Column({ type: 'nvarchar', length: 50, name: 'stampSignImage', nullable: true })
  stampSignImage: string;

  /** Họ tên tiếng Anh */
  @Column({ type: 'nvarchar', length: 255, nullable: true, name: 'name_en' })
  nameEn: string | null;

  /** ID chức danh */
  @Column({ type: 'int', nullable: true, name: 'job_id' })
  jobId: number | null;

  /** ID loại biên chế */
  @Column({ type: 'int', nullable: true, name: 'worker_type_id' })
  workerTypeId: number | null;

  /** ID quân hàm */
  @Column({ type: 'int', nullable: true, name: 'army_rank_id' })
  armyRankId: number | null;

  /** Số hộ chiếu */
  @Column({ type: 'nvarchar', length: 100, nullable: true, name: 'passport_number' })
  passportNumber: string | null;

  /** Ngày hết hạn hộ chiếu */
  @Column({ type: 'date', nullable: true, name: 'passport_expire_date' })
  passportExpireDate: Date | null;

  /** Ngày vào cơ quan */
  @Column({ type: 'date', nullable: true, name: 'join_date_state' })
  joinDateState: Date | null;

  /** Ngày vào cảng */
  @Column({ type: 'date', nullable: true, name: 'ngay_vao_cang' })
  ngayVaoCang: Date | null;

  /** Ngày nghỉ việc có hiệu lực */
  @Column({ type: 'date', nullable: true, name: 'termination_date' })
  terminationDate: Date | null;

  /** Lý do nghỉ việc */
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true, name: 'termination_reason' })
  terminationReason: string | null;

  /** Ghi chú HRM */
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true, name: 'remark' })
  remark: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true, name: 'google_access_token', select: false })
  googleAccessToken: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true, name: 'google_refresh_token', select: false })
  googleRefreshToken: string | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true, name: 'google_email' })
  googleEmail: string | null;

  @Column({
    type: 'bit',
    default: 0,
    name: 'is_google_calendar_verified',
  })
  isGoogleCalendarVerified: boolean;
}
