import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Unique,
} from 'typeorm';

@Entity('video_like')
@Unique(['videoId', 'userId'])
export class VideoLike {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ name: 'video_id', type: 'nvarchar', length: 100 })
    videoId: string; // DB: video_id, API: videoId

    @Column({ name: 'user_id', type: 'nvarchar', length: 100 })
    userId: string; // DB: user_id, API: userId//

    @Column({ name: 'user_name', type: 'nvarchar', length: 255, nullable: true })
    userName: string;

    @CreateDateColumn({ name: 'created_at', type: 'datetime' })
    createdAt: Date;

    @Column({ name: 'is_like', type: 'bit', default: true })
    isLike: boolean;
}
