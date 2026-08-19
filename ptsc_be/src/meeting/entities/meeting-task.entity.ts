import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('meeting_tasks')
@Index(['meetingId'])
@Index(['attachableType', 'attachableId'])
export class MeetingTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Nội dung công việc
  @Column({ type: 'text' })
  content: string;

  // Tên tài liệu cần chuẩn bị
  @Column({ name: 'document_name' })
  documentName: string;

  @Column({ type: 'datetime2' })
  deadline: Date;

  // MEETING | UNIT | PARTICIPANT
  @Column({ name: 'attachable_type' })
  attachableType: string;
  
  @Column({ name: 'attachable_role' })
  attachableRole: string;

  // id của meeting / unit / participant
  @Column({ name: 'attachable_id' })
  attachableId: string;

  // luôn gắn với cuộc họp để query nhanh
  @Column({ name: 'meeting_id' })
  meetingId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({
    name: 'is_document_prepared',
    type: 'bit',
    default: false,  // Mặc định là chưa chuẩn bị tài liệu
  })
  isDocumentPrepared: boolean;
}
