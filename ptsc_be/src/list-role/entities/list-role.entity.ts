import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { STATUS } from '../../variables/CONST_STATUS';

export interface RolePermissionEntity {
  functionName: string;
  name?: string;
  permissions: string[];
}

@Entity('list_roles')
@Index(['code', 'status'], { unique: true })
export class ListRoleEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  describe?: string;

  // Lưu danh sách quyền theo dạng JSON đơn giản
  @Column({ type: 'simple-json', nullable: true })
  roles?: RolePermissionEntity[];

  @Column({ type: 'int', default: STATUS.ACTIVED })
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
