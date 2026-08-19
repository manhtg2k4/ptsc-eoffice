import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
} from 'typeorm';
import { VideoEntity } from './video.entity';

@Entity('video_view_history')
@Unique(['videoId', 'userId'])
export class VideoViewHistoryEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'video_id', type: 'uniqueidentifier' })
    videoId: string;

    @Column({ name: 'user_id', type: 'nvarchar', length: 100 })
    userId: string;

    @Column({ name: 'view_count', type: 'int', default: 1 })
    viewCount: number;

    @Column({ name: 'last_viewed_at', type: 'datetime', default: () => 'GETDATE()' })
    lastViewedAt: Date;

    @CreateDateColumn({ name: 'created_at', type: 'datetime' })
    createdAt: Date;

    @ManyToOne(() => VideoEntity)
    @JoinColumn({ name: 'video_id' })
    video: VideoEntity;
}
