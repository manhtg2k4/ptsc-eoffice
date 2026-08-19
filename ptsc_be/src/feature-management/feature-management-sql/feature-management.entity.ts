import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Tree,
  TreeChildren,
  TreeParent,
  Index,
  JoinColumn,
} from 'typeorm';
import { STATUS } from '../../variables/CONST_STATUS';

@Entity('feature_management')
@Tree('materialized-path')
@Index(['code', 'status'], { unique: true })
@Index(['url', 'status'], { unique: true, where: "url IS NOT NULL AND url != ''" })
export class FeatureManagementEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  name: string;

  @Column({ name: 'form_code', nullable: true })
  formCode: string;

  @Column({ name: 'is_follow_assignee', type: 'bit', default: 0 })
  isFollowAssignee: boolean;

  @Column({ name: 'is_hide_title', type: 'bit', default: 0 })
  isHideTitle: boolean;

  @Column({ name: 'is_authorized', type: 'bit', default: 0 })
  isAuthorized: boolean;

  @Column({ name: 'is_inherit_sub_tab', type: 'bit', default: 0 })
  isInheritSubTab: boolean;

  @Column({ name: 'is_count', type: 'bit', default: 0 })
  isCount: boolean;

  @Column({ name: 'authorized_function', nullable: true })
  authorizedFunction: string;

  @Column({ name: 'inherit_sub_tab_function', nullable: true })
  inheritSubTabFunction: string;

  @Column({ type: 'simple-json', nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  criteria?: any[];

  @Column({ nullable: true })
  url: string;

  @Column({ name: 'api_url', nullable: true })
  apiUrl: string;

  @Column({ name: 'api_url_children', nullable: true })
  apiUrlChildren: string;

  @Column({ name: 'process_id', nullable: true, comment: 'processID from mongo' })
  processID: string;

  @Column({
    name: 'status_feature',
    type: 'varchar',
    length: 1,
    default: '1',
  })
  statusFeature: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'simple-json', nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fields?: any[];

  @Column({ type: 'simple-json', name: 'value_field', nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  valueField?: Record<string, any>;

  @Column({
    name: 'feature_type',
    type: 'varchar',
    default: 'list',
  })
  featureType: string;

  @Column({ default: STATUS.ACTIVED })
  status: number;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string;

  @TreeChildren()
  children: FeatureManagementEntity[];

  @TreeParent()
  @JoinColumn({ name: 'parent_id' })
  parent?: FeatureManagementEntity;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}