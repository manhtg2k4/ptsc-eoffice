import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

@Entity('media_view')
@Index(['mediaId', 'userId', 'type'], { unique: true })
export class MediaView {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'nvarchar', length: 100 })
    mediaId: string; // ID của Album hoặc Video

    @Column({ type: 'nvarchar', length: 50 })
    type: string; // 'image' hoặc 'video'

    @Column({ type: 'nvarchar', length: 100 })
    userId: string;

    @CreateDateColumn({ type: 'datetime' })
    createdAt: Date;
}
