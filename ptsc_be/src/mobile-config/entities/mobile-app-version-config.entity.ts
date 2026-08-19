import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type MobilePlatform = 'android' | 'ios';

@Entity('mobile_app_version_configs')
@Index('UQ_mobile_app_version_configs_platform', ['platform'], { unique: true })
export class MobileAppVersionConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'nvarchar', length: 20 })
  platform: MobilePlatform;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  version: string | null;

  @Column({ name: 'build_number', type: 'int', nullable: true })
  buildNumber: number | null;

  @Column({
    name: 'update_url',
    type: 'nvarchar',
    length: 'max',
    nullable: true,
  })
  updateUrl: string | null;

  @Column({ name: 'force_update', type: 'bit', default: false })
  forceUpdate: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;
}
