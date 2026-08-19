import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { STATUS } from '../../variables/CONST_STATUS';
import { v4 as uuidv4 } from 'uuid';

@Entity('menu_managers')
@Index(['code', 'status'], { unique: true })
export class MenuManagerEntity {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 100 })
  _id: string = uuidv4();

  @Column({ type: 'nvarchar', length: 255 })
  name: string;//

  @Column({ type: 'varchar', length: 255, nullable: true })
  code: string;

  @Column({ type: 'nvarchar', length: 4000, nullable: true })
  settingIcon?: string;

  @Column({ type: 'bit', default: 0 })
  hidden: boolean;

  @Column({ type: 'bit', default: 0 })
  collapsed: boolean;

  @Column({ type: 'bit', default: 1 })
  dynamicMenu: boolean;

  @Column({ type: 'int', nullable: true })
  order?: number;

  @ManyToOne(() => MenuManagerEntity, (mm) => mm.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: MenuManagerEntity;

  @OneToMany(() => MenuManagerEntity, (mm) => mm.parent)
  children?: MenuManagerEntity[];

  // function code reference to FeatureManagement
  @Column({ name: 'function_code', type: 'varchar', length: 255, nullable: true })
  function?: string;
  @Column({ name: 'code_router', type: 'varchar', length: 255, nullable: true })
  codeRouter?: string;

  @Column({ name: 'code_app', type: 'nvarchar', length: 255, nullable: true })
  codeApp?: string;


  @Column({ type: 'int', default: STATUS.ACTIVED })
  status: number;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  path?: string;

  // Store managers & groupUsers as array<string> in JSON
  @Column({ type: 'simple-json', nullable: true })
  managers?: string[];

  @Column({ type: 'simple-json', nullable: true })
  groupUsers?: string[];

  @Column({ type: 'simple-json', nullable: true })
  roleGroupIds?: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
