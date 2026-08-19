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
import { LayoutItemType } from '../meeting-rooms.enum';

@Entity('meeting_room_layout_items')
@Index('IX_meeting_room_layout_items_room', ['meetingRoomId'])
export class MeetingRoomLayoutItemEntity {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ type: 'varchar', length: 40, name: 'meeting_room_id' })
  meetingRoomId: string;

  @ManyToOne(() => MeetingRoomEntity, room => room.layoutItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_room_id' })
  meetingRoom: MeetingRoomEntity;

  // TABLE, CHAIR, TV, PROJECTOR, DOOR, WINDOW, OTHER
  @Column({ type: 'varchar', length: 50, name: 'item_type' })
  itemType: LayoutItemType;

  // SQUARE, ROUND, U-SHAPE, RECTANGULAR, OVAL, etc.
  @Column({ type: 'varchar', length: 50, name: 'sub_type', nullable: true })
  subType?: string | null;

  @Column({ type: 'int' })
  row: number;

  @Column({ type: 'int' })
  col: number;

  @Column({ type: 'int', name: 'row_span', default: 1 })
  rowSpan: number;

  @Column({ type: 'int', name: 'col_span', default: 1 })
  colSpan: number;

  @Column({ type: 'int', default: 0 })
  rotation: number;

  @Column({ type: 'nvarchar', length: 50, name: 'seat_number', nullable: true })
  seatNumber?: string | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  label?: string | null;

  // Serialized JSON for visual settings, color, style, etc.
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  properties?: string | null;

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
