import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('hrm_sync_history')
export class HrmSyncHistoryEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @CreateDateColumn({ type: 'datetime', name: 'sync_time' })
  syncTime: Date;

  @Column({ type: 'int', name: 'added' })
  added: number;

  @Column({ type: 'int', name: 'updated' })
  updated: number;

  @Column({ type: 'int', name: 'unchanged' })
  unchanged: number;

  @Column({ type: 'int', name: 'total' })
  total: number;
}
