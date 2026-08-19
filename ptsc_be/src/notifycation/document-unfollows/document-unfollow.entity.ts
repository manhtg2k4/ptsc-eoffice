import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'document_unfollow' })
@Index(['userId', 'documentId'])
export class DocumentUnfollowEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'user_id', type: 'nvarchar', length: 255 })
  userId: string;

  @Column({ name: 'document_id', type: 'nvarchar', length: 255 })
  documentId: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;
}
