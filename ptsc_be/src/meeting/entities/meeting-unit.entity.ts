import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { MeetingEntity } from './meeting.entity';
import { MeetingParticipantEntity } from './meeting-participant.entity';
import { MeetingUnitSeatEntity } from './meeting-unit-seats.entity';

@Entity('meeting_units')
export class MeetingUnitEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'meeting_id', type: 'uniqueidentifier', nullable: true })
  meetingId: string | null;

  @Column({ name: 'unit_id', type: 'nvarchar', length: 100 })
  unitId: string;

  @Column({ name: 'seat_number', type: 'nvarchar', length: 50, nullable: true })
  seatNumber: string | null;

  @Column({ name: 'room_id', type: 'nvarchar', length: 100, nullable: true })
  roomId: string | null;

  @Column({
    name: 'is_room_selected',
    type: 'bit',
    default: false,
  })
  isRoomSelected: boolean;
  
  @Column({
    name: 'unit_state',
    type: 'nvarchar',
    length: 30,
    default: 'PENDING',
  })
  unitState: string;

  @Column({ name: 'accept_join', type: 'bit', default: false, nullable: false })
  acceptJoin: boolean;

  @Column({
    name: 'assign_participants',
    type: 'bit',
    default: false,
    nullable: false,
  })
  assignParticipants: boolean;

  @Column({
    name: 'prepare_documents',
    type: 'bit',
    default: false,
    nullable: false,
  })
  prepareDocuments: boolean;

  @Column({
    name: 'seat_participants',
    type: 'bit',
    default: false,
    nullable: false,
  })
  seatParticipants: boolean;
  
  @Column({ name: 'processby', type: 'nvarchar', length: 100, nullable: true })
  processby: string | null;

  @ManyToOne(() => MeetingEntity, m => m.units, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meeting_id' })
  meeting: MeetingEntity;

  @OneToMany(() => MeetingParticipantEntity, p => p.unit, {
    cascade: true,
  })
  participants: MeetingParticipantEntity[];

  @OneToMany(() => MeetingUnitSeatEntity, s => s.unit)
  seats: MeetingUnitSeatEntity[];
}

