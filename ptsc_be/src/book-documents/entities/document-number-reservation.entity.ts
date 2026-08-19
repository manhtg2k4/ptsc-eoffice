import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BookDocumentEntity } from './book-document.entity';
import { ReservationSubscriberEntity } from './reservation-subscriber.entity';

export enum ReservationStatus {
  RESERVED = 1, // Đang giữ
  USED = 2,     // Đã sử dụng
}

@Entity('document_number_reservations')
@Index('UQ_book_reserved_number', ['bookDocumentId', 'reservedNumber'], {
  unique: true,
  where: 'status IN (1, 2)', // Chặn giữ/dùng lại số khi số đang giữ (1) hoặc đã dùng (2)
})
export class DocumentNumberReservationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- LIÊN KẾT SỔ VĂN BẢN (XÓA SỔ -> XÓA DỮ LIỆU GIỮ SỐ) ---
  @Column({ type: 'bigint', name: 'book_document_id' })
  bookDocumentId: number;

  @ManyToOne(() => BookDocumentEntity, (book) => book.reservations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'book_document_id' })
  bookDocument: BookDocumentEntity;

  // --- DỮ LIỆU GIỮ SỐ ---
  @Column({ type: 'int', name: 'reserved_number' })
  reservedNumber: number;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  note?: string;

  @Column({
    type: 'int',
    default: ReservationStatus.RESERVED,
    comment: '1: Đang giữ, 2: Đã sử dụng',
  })
  status: ReservationStatus;

  // --- LIÊN KẾT ĐẾN BẢNG PHỤ CHỨA DANH SÁCH USER ---
  @OneToMany(
    () => ReservationSubscriberEntity,
    (subscriber) => subscriber.reservation,
    { cascade: true },
  )
  subscribers: ReservationSubscriberEntity[];

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;
}
