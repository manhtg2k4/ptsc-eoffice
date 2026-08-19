import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { News } from './news.entity';

@Entity('news_view')
@Index(['newsId', 'userId'], { unique: true })
export class NewsView {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'int' })
    newsId: number;

    @ManyToOne(() => News)
    @JoinColumn({ name: 'newsId' })
    news: News;

    @Column({ type: 'nvarchar', length: 100 })
    userId: string;

    @CreateDateColumn({ type: 'datetime' })
    createdAt: Date;
}
