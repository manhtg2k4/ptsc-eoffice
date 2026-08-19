import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { News } from './news.entity';

@Entity('news_comment')
export class NewsComment {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int' })
  newsId: number;

  @ManyToOne(() => News)
  @JoinColumn({ name: 'newsId' })
  news: News;

  @Column({ type: 'nvarchar', length: 100 })
  userId: string;

  @Column({ type: 'nvarchar', length: 255 })
  userName: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  content: string;

  @Column({ type: 'int', nullable: true })
  parentId: number;

  @ManyToOne(() => NewsComment, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: NewsComment;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', nullable: true })
  updatedAt: Date;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  dislikeCount: number;

  @Column({ type: 'nvarchar', length: 50, nullable: true, default: 'comment' })
  type: string;

  @Column({ type: 'simple-json', nullable: true })
  file: any[];
}
