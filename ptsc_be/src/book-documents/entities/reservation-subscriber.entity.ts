import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DocumentNumberReservationEntity } from './document-number-reservation.entity';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity('reservation_subscribers')
@Index('UQ_reservation_user', ['reservationId', 'userId'], { unique: true }) // Chặn 1 User bị gán lặp lại trong cùng 1 đơn giữ số
export class ReservationSubscriberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- FK TỚI BẢNG GIỮ SỐ (XÓA RESERVATION -> XÓA SUBSCRIBER) ---
  @Column({ name: 'reservation_id' })
  reservationId: string;

  @ManyToOne(
    () => DocumentNumberReservationEntity,
    (reservation) => reservation.subscribers,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'reservation_id' })
  reservation: DocumentNumberReservationEntity;

  // --- FK TỚI BẢNG USER ---
  @Column({ type: 'nvarchar', length: 100, name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;
}
