import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToMany,
  JoinTable,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { STATUS } from '../../variables/CONST_STATUS';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity('organization_units')
@Index(['code', 'status'], { unique: true, where: 'status = 1' })
export class OrganizationUnitEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column()
  name: string;

  @Column()
  code: string;

  @Column({ nullable: true })
  type: string;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  leader?: string;

  @Column({ nullable: true })
  position?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: STATUS.ACTIVED })
  status: number;

  @ManyToMany(() => GroupUserEntity, (groupUser) => groupUser.organizationUnits)
  groupUsers: GroupUserEntity[];

  /** Quan hệ 1-nhiều: 1 phòng ban có nhiều user */
  @OneToMany(() => UserEntity, (user) => user.parent)
  users: UserEntity[];

  @Column({ type: 'nvarchar', length: 500, default: '' })
  mpath: string;

  @OneToMany(() => OrganizationUnitEntity, (unit) => unit.parent)
  children: OrganizationUnitEntity[];

  // @ManyToOne(() => OrganizationUnitEntity, (unit) => unit.children, { nullable: true })
  // parent: OrganizationUnitEntity | null;
  @ManyToOne(() => OrganizationUnitEntity, (unit) => unit.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parentId' })   // 👈 RẤT QUAN TRỌNG
  parent: OrganizationUnitEntity | null;

  @Column({ type: 'nvarchar', nullable: true })
  parentId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date; 

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column()
  order: number; // Thứ tự sắp xếp

  /** Tên đơn vị bằng tiếng Anh */
  @Column({ type: 'nvarchar', length: 255, nullable: true, name: 'name_en' })
  nameEn: string | null;

  /** ID khối nghiệp vụ */
  @Column({ type: 'nvarchar', length: 100, nullable: true, name: 'block_id' })
  blockId: string | null;

  /** Ghi chú HRM */
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true, name: 'remark' })
  remark: string | null;
}
