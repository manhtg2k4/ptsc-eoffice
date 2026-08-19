import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('messages')
export class MessageEntity {
  // 🔴 BẮT BUỘC: PrimaryColumn
  @PrimaryColumn({ type: 'nvarchar', length: 50 })
  id: string;

  @Column({ type: 'nvarchar', length: 50 })
  conversationId: string;

  // JSON string
  @Column({ type: 'nvarchar', nullable: false })
  sender: string;

  @Column({ type: 'int', default: 0 })
  type: number;

  @Column({ type: 'nvarchar', nullable: true })
  content?: string;

  @Column({ type: 'nvarchar', nullable: true })
  caption?: string;

  // JSON string
  @Column({ type: 'nvarchar', nullable: true })
  data?: string;

  // JSON string
  @Column({ type: 'nvarchar', nullable: true })
  replyTo?: string;

  // JSON string
  @Column({ type: 'nvarchar', nullable: true })
  mentions?: string;

  // JSON string
  @Column({ type: 'nvarchar', nullable: true })
  reactions?: string;

  // JSON string
  @Column({ type: 'nvarchar', nullable: true })
  status?: string;

  // JSON string
  @Column({ type: 'nvarchar', nullable: true })
  linkContent?: string;

  // JSON string
  @Column({ type: 'nvarchar', nullable: false })
  time: string;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;
}
  