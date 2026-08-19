import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
import { MeetingRoomAmenityEntity } from 'src/meeting-rooms/entities/meeting-rooms-amenities.entity';

@Entity('amenities')
export class AmenitiesEntity {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ type: 'nvarchar', length: 255 })
  name: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  note?: string;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @OneToMany(() => MeetingRoomAmenityEntity, link => link.amenity)
  roomLinks: MeetingRoomAmenityEntity[];

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