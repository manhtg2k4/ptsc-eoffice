import { UserEntity } from 'src/users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToMany,
  JoinTable,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export enum StatusFeature {
  INACTIVE = '0',
  ACTIVE = '1',
}

export enum FeatureType {
  LIST = 'list',
  FORM = 'form',
  POPUP = 'popup',
  FULL_LIST = 'fullList',
  COMPLETE_LIST = 'completeList',
  AUTOMATIC = 'automatic',
}

const jsonTransformer = {
  to: (value: any) => (value == null ? null : JSON.stringify(value)),
  from: (value: string | null) => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  },
};

@Entity('feature_management')
export class FeatureManagementEntity {
  @PrimaryColumn({ type: 'nvarchar', length: 36 })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv4();
  }

  @Column({ type: 'nvarchar', length: 100, unique: true })
  code: string;

  @Column({ name: 'form_code', type: 'nvarchar', length: 100, nullable: true })
  formCode?: string;

  @ManyToMany(() => UserEntity, (user) => user.features)
  @JoinTable({
    name: 'feature_executor',
    joinColumn: { name: 'feature_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  executor?: UserEntity[];

  @Column({ name: 'is_follow_assignee', type: 'bit', default: 0 })
  isFollowAssignee: boolean;

  @Column({ name: 'is_authorized', type: 'bit', default: 0 })
  isAuthorized: boolean;

  @Column({ name: 'is_count', type: 'bit', default: 0 })
  isCount: boolean;

  @Column({ name: 'is_parent_child', type: 'bit', default: 0 })
  isParentChild: boolean;

  @Column({ name: 'is_hide_title', type: 'bit', default: 0 })
  isHideTitle: boolean;

  @Column({ name: 'authorized_function', type: 'nvarchar', length: 255, nullable: true })
  authorizedFunction?: string;

  @Column({ name: 'inherit_sub_tab_function', type: 'nvarchar', length: 255, nullable: true })
  inheritSubTabFunction?: string;

  @Column({ name: 'is_inherit_sub_tab', type: 'bit', default: 0 })
  isInheritSubTab: boolean;

  @Column({ name: 'custom_component', type: 'nvarchar', length: 255, nullable: true })
  customComponent?: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  name?: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true, transformer: jsonTransformer })
  criteria?: any;

  // ==================== FIXED PARENT RELATION ====================
  @Column({ name: 'parent_id', type: 'nvarchar', length: 36, nullable: true })
  parentId?: string;

  @ManyToOne(() => FeatureManagementEntity, (feature) => feature.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: FeatureManagementEntity;

  @OneToMany(() => FeatureManagementEntity, (feature) => feature.parent)
  children?: FeatureManagementEntity[];
  // ================================================================

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  url?: string;

  @Column({ name: 'api_url', type: 'nvarchar', length: 255, nullable: true })
  apiUrl?: string;

  @Column({ name: 'api_url_children', type: 'nvarchar', length: 255, nullable: true })
  apiUrlChildren?: string;

  @Column({ name: 'process_id', type: 'nvarchar', length: 255, nullable: true })
  processID?: string;

  @Column({ name: 'status_feature', type: 'char', length: 1, default: StatusFeature.ACTIVE })
  statusFeature: StatusFeature;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description?: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true, select: false, transformer: jsonTransformer })
  fields?: any;

  @Column({ name: 'value_field', type: 'nvarchar', length: 'max', nullable: true, select: false, transformer: jsonTransformer })
  valueField?: any;

  @Column({ name: 'created_by', type: 'nvarchar', length: 100, nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'nvarchar', length: 100, nullable: true })
  updatedBy?: string;

  @Column({ name: 'feature_type', type: 'nvarchar', length: 50, default: FeatureType.LIST })
  featureType: FeatureType;

  @Column({ type: 'int', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  mpath?: string;

  /**
   * Danh sách tên hàm count động tương ứng với feature này.
   * Ví dụ: ['countDocumentsReceiveDynamic']
   */
  @Column({ name: 'count_list', type: 'simple-json', nullable: true })
  countList?: any[];
}
