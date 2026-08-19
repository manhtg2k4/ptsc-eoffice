import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('authority_documents')
export class AuthorityDocumentEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'nvarchar', length: 64, nullable: true })
  author: string | null; // Người ủy quyền

  @Column({ type: 'nvarchar', length: 64, nullable: true })
  authorized: string | null; // Người được ủy quyền

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  stage: string | null; // Giai đoạn/API được ủy quyền

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  status: string | null; // 1: active, 3: deleted

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  files: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', default: () => 'GETDATE()' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', default: () => 'GETDATE()' })
  updatedAt: Date;

  @Column({ name: 'start_date', type: 'datetime', nullable: true })
  startDate: Date | null;

  @Column({ name: 'end_date', type: 'datetime', nullable: true })
  endDate: Date | null;

  @Column({ name: 'original_end_date', type: 'datetime', nullable: true })
  originalEndDate: Date | null;
}

