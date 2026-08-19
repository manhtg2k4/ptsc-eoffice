import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { MeetingUnitEntity } from "./meeting-unit.entity";

@Entity('meeting_unit_seats')
export class MeetingUnitSeatEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id', type: 'nvarchar', length: 50, nullable: true })
  roomId: string;

  @Column({ name: 'seat_number', type: 'nvarchar', length: 50, nullable: true })
  seatNumber: string;

  @ManyToOne(() => MeetingUnitEntity, u => u.seats)
  @JoinColumn({ name: 'meeting_unit_id' })
  unit: MeetingUnitEntity;
}
