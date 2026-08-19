import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { MeetingEntity } from './meeting.entity';

@Entity('online_meetings')
export class OnlineMeetingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  platform: string;

  @Column({ name: 'meeting_link' })
  meetingLink: string;

  @Column({ name: 'meeting_id', nullable: true })
  meetingId: string;

  @Column({ nullable: true })
  passcode: string;

  @OneToOne(() => MeetingEntity, m => m.onlineMeeting)
  meeting: MeetingEntity;
}
