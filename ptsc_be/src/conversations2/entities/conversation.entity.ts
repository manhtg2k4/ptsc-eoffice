// src/conversations/entities/conversation.entity.ts (adjust path as needed)
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ConversationMember } from './conversation-member.entity';
import { ConversationMemberState } from './conversation-member-state.entity';

@Entity('conversations')
export class ConversationEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'int', default: 0 }) // or use @Column({ type: 'enum', enum: ConversationType }) if you prefer strings
  type: number; // 0: direct, 1: group

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  title?: string; // renamed from 'name' for clarity

  @Column({ type: 'varchar', length: 50 })
  createdBy: string; // Add this!

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  avatar?: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  backgroundImage?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  lastMessageId?: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  lastMessagePreview?: string;

  @Column({ type: 'datetime2', nullable: true })
  lastMessageAt?: Date;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;

  @OneToMany(() => ConversationMember, member => member.conversation, { cascade: true })
  members: ConversationMember[];

  @OneToMany(() => ConversationMemberState, state => state.conversation, { cascade: true })
  memberStates: ConversationMemberState[];
}