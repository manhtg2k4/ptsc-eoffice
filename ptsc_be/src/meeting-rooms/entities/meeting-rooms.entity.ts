import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
import { MeetingRoomAmenityEntity } from './meeting-rooms-amenities.entity';
import { MeetingRoomLayoutItemEntity } from './meeting-room-layout-item.entity';

@Entity('meeting_rooms')
export class MeetingRoomEntity {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ type: 'nvarchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  image?: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  location?: string;

  @Column({ type: 'int', default: 20 })
  capacity: number;

  @OneToMany(() => MeetingRoomAmenityEntity, link => link.meetingRoom)
  amenityLinks: MeetingRoomAmenityEntity[];

  @OneToMany(() => MeetingRoomLayoutItemEntity, item => item.meetingRoom)
  layoutItems: MeetingRoomLayoutItemEntity[];

  @Column({ type: 'tinyint' })
  status: number;

  @Column({ type: 'tinyint' })
  stage: number;

  @Column({ type: 'datetime2', nullable: true, name: 'available_from' })
  availableFrom: Date | null;

  @Column({ type: 'varchar', length: 40, nullable: true, name: 'layout_type' })
  layoutType?: string;

  @Column({ type: 'int', nullable: true, name: 'layout_rows' })
  layoutRows?: number;

  @Column({ type: 'int', nullable: true, name: 'layout_cols' })
  layoutCols?: number;

  @Column({ type: 'int', nullable: true, name: 'layout_seats' })
  layoutSeats?: number;

  @Column({ type: 'int', nullable: true, name: 'layout_blocks' })
  layoutBlocks?: number;

  @Column({ type: 'int', nullable: true, name: 'total_seating' })
  totalSeating?: number;

  @Column({ type: 'int', nullable: true, name: 'layout_col_wing' })
  layoutColWing?: number;

  @Column({ type: 'int', nullable: true, name: 'layout_row_bottom' })
  layoutRowBottom?: number;

  @Column({ type: 'int', nullable: true, name: 'order', default: 1 })
  order?: number;

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