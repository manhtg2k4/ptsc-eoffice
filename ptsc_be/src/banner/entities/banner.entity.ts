import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('banners')
@Index(['bannerKey'])
export class Banner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 100, unique: true })
  bannerKey: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  linkUrl: string | null;

  @Column({ type: 'int', default: 1 })
  status: number;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ type: 'bigint', nullable: true })
  idfile: number | null;

  @Column({ type: 'nvarchar', length: 100 })
  createdBy: string;

  @Column({ type: 'nvarchar', length: 100 })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}