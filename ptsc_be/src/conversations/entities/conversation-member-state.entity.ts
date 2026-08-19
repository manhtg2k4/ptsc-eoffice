// src/conversations2/entities/conversation-member-state.entity.ts
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ConversationEntity } from './conversation.entity';

@Entity('conversation_member_states')
export class ConversationMemberState {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @ManyToOne(() => ConversationEntity, conv => conv.memberStates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: ConversationEntity;

  @Column({ type: 'varchar', length: 50 })
  userId: string;

  @Column({ type: 'int', nullable: true })
  pinnedOrder: number | null;

  @Column({ type: 'int', default: 0 })
  unread: number;

  @Column({ type: 'bit', default: false })
  hidden: boolean;

  @Column({ type: 'datetime2', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'datetime2', nullable: true })
  lastReadAt: Date | null;
}