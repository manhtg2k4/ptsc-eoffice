// src/conversations2/entities/conversation-member.entity.ts
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ConversationEntity } from './conversation.entity';

@Entity('conversation_members')
export class ConversationMember {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @ManyToOne(() => ConversationEntity, conv => conv.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: ConversationEntity;

  @Column({ type: 'varchar', length: 50 })
  userId: string;

  @Column({ type: 'int', default: 0 })
  role: number;

  @Column({ type: 'datetime2', default: () => 'GETDATE()' })
  joinedAt: Date;
}