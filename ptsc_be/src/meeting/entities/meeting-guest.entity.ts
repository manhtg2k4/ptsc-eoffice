import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { MeetingEntity } from './meeting.entity';

@Entity('meeting_guests') // Ensure this matches your table name
export class MeetingGuest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MeetingEntity, (meeting) => meeting.guests)
  @JoinColumn({ name: 'meeting_id' })  // Explicitly map to the 'meeting_id' column in SQL
  meeting: MeetingEntity;

  @Column({ name: 'guest_name' })  // Explicitly map to 'guest_name' column in SQL
  guestName: string;

  @Column({ name: 'guest_title', nullable: true })  // Explicitly map to 'guest_title' column
  guestTitle: string;

  @Column({ name: 'seat_number', type: 'nvarchar', length: 50, nullable: true })
  seatNumber: string | null;

  @Column({ name: 'room_id', type: 'nvarchar', length: 100, nullable: true })
  roomId: string | null;

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
