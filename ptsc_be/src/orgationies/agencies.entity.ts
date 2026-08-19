import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('agencies')
export class AgencyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  @Index()
  code: string;

  @Column({ length: 500 })
  name: string;

  @Column({ name: 'old_code', length: 255, nullable: true })
  oldCode?: string;

  @Column({ name: 'industry_type', type: 'int', nullable: true, default: 1 })
  industryType?: number;

  @Column({ nullable: true, length: 255 })
  email?: string;

  @Column({ name: 'phone_number', length: 50, nullable: true })
  phoneNumber?: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  address?: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  description?: string;

  @Column({ name: 'tran_status', type: 'int', nullable: true })
  tranStatus?: number;

  @Column({ type: 'int', nullable: true })
  lgsp?: number;

  @Column({ type: 'int', default: 1 }) // 1: Active, 3: Deleted
  status: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;
}