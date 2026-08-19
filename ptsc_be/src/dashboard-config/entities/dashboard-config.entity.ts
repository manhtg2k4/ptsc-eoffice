import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('dashboard_config')
export class DashboardConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: string;

  @Column({ type: 'simple-array', nullable: true })
  columnLeft: string[];

  @Column({ type: 'simple-array', nullable: true })
  columnRight: string[];

  @Column({ type: 'simple-array', nullable: true })
  statOrder: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
