import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { DocumentNumberReservationEntity } from './document-number-reservation.entity';

@Entity('book_documents')
export class BookDocumentEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  book_document_id: number;

  @Column({ type: 'nvarchar', length: 255 })
  name: string;

  @Column({ type: 'int', nullable: true })
  year?: number;

  @Column({ type: 'int', default: 1 })
  status?: number;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  type_document?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  order?: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  sender_unit?: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  to_book_code?: string;

  @Column({ type: 'simple-array', nullable: true })
  document_field?: string[];

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  private_level?: string; // Giữ nguyên kiểu string

  @Column({
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
    transformer: {
      to: (value: string[] | null) => (Array.isArray(value) ? value.join(',') : value),
      from: (value: string | null) => (value ? value.split(',') : []),
    },
  })
  manager_book?: string[];

  @Column({ type: 'int', default: 0 })
  count?: number;

  @Column({ type: 'bit', default: true })
  active?: boolean;

  @Column({ type: 'bit', default: false, name: 'is_default' })
  isDefault?: boolean;

  @Column({ type: 'bit', default: false, name: 'is_certified_copies' })
  isCertifiedCopies?: boolean;

  @CreateDateColumn({ type: 'varchar', name: 'created_by', length: 100, nullable: true })
  createdBy: Date;

  @OneToMany(
    () => DocumentNumberReservationEntity,
    (reservation) => reservation.bookDocument,
    { cascade: true },
  )
  reservations: DocumentNumberReservationEntity[];

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;
}