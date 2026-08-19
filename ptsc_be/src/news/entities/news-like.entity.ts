import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('news_like')
@Unique(['type', 'objectId', 'userId'])
export class NewsLike {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'nvarchar', length: 100 })
  type: string; // 'NEWS', 'COMMENT', or any other type

  @Column({ type: 'int' })
  objectId: number;

  @Column({ type: 'nvarchar', length: 100 })
  userId: string;

  @Column({ type: 'nvarchar', length: 100 })
  userName: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @Column({ type: 'bit', default: true })
  isLike: boolean; // true = like, false = dislike
}
