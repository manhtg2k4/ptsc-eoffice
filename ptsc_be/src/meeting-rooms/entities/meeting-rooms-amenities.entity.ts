import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import { MeetingRoomEntity } from './meeting-rooms.entity';
import { AmenitiesEntity } from 'src/meeting-room-amenities/entities/amenities.entity';

@Entity('meeting_rooms_amenities')
@Index('UQ_room_amenity', ['meetingRoomId', 'amenityId'], { unique: true })
export class MeetingRoomAmenityEntity {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ type: 'varchar', length: 40, name: 'meeting_room_id' })
  meetingRoomId: string;

  @Column({ type: 'varchar', length: 40, name: 'amenity_id' })
  amenityId: string;

  @ManyToOne(() => MeetingRoomEntity, room => room.amenityLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_room_id' })
  meetingRoom: MeetingRoomEntity;

  @ManyToOne(() => AmenitiesEntity, amenity => amenity.roomLinks)
  @JoinColumn({ name: 'amenity_id' })
  amenity: AmenitiesEntity;

  @Column({ type: 'int' })
  quantity: number;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
      const random = Math.random().toString(36).substring(2, 10).toUpperCase();
      this.id = `${timestamp}-${random}`;
    }
  }
}
