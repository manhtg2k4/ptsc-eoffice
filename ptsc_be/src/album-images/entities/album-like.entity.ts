import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Unique,
} from 'typeorm';

@Entity('album_like')
@Unique(['albumId', 'userId'])
export class AlbumLike {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ name: 'album_id', type: 'nvarchar', length: 100 })
    albumId: string; // Trong DB là album_id, trả về JSON là albumId

    @Column({ name: 'user_id', type: 'nvarchar', length: 100 })
    userId: string;

    @Column({ name: 'user_name', type: 'nvarchar', length: 255, nullable: true })
    userName: string;

    @CreateDateColumn({ name: 'created_at', type: 'datetime' })
    createdAt: Date;

    @Column({ name: 'is_like', type: 'bit', default: true })
    isLike: boolean;
}
