import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum VideoType {
    FEATURED = 'featured', // Nổi bật
    NORMAL = 'normal',     // Thường
}

export enum VideoStatus {
    ACTIVE = 1,    // Hoạt động
    DELETED = 3,   // Đã xóa mềm
}

@Entity('videos')
export class VideoEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'title', type: 'nvarchar', length: 500 })
    title: string;

    @Column({ name: 'description', type: 'nvarchar', length: 'MAX' })
    description: string;

    @Column({ name: 'topic', type: 'nvarchar', length: 500 })
    topic: string;

    @Column({
        name: 'video_type',
        type: 'nvarchar',
        length: 50,
        enum: VideoType,
        default: VideoType.NORMAL,
    })
    videoType: VideoType;

    @Column({ name: 'thumbnail', type: 'nvarchar', length: 'MAX', nullable: true })
    thumbnail: string;

    @Column({ name: 'video_url', type: 'nvarchar', length: 'MAX', nullable: true })
    videoUrl: string;

    @Column({ name: 'video_link', type: 'nvarchar', length: 'MAX', nullable: true })
    videoLink: string;

    @Column({ name: 'thumbnail_file_id', type: 'bigint', nullable: true })
    thumbnailFileId: number;

    @Column({ name: 'video_file_id', type: 'bigint', nullable: true })
    videoFileId: number;

    @Column({ name: 'likes', type: 'int', default: 0 })
    likes: number;

    @Column({ name: 'views', type: 'int', default: 0 })
    views: number;

    @Column({ name: 'shares', type: 'int', default: 0 })
    shares: number;

    @Column({ name: 'duration', type: 'int', nullable: true })
    duration: number | null; // Thời lượng video tính bằng giây

    @Column({ name: 'status', type: 'int', default: VideoStatus.ACTIVE })
    status: VideoStatus;

    @Column({ name: 'created_by', type: 'nvarchar', length: 100, nullable: true })
    createdBy: string;

    @Column({ name: 'created_by_name', type: 'nvarchar', length: 255, nullable: true })
    createdByName: string;

    @Column({ name: 'department', type: 'nvarchar', length: 500, nullable: true })
    department: string;

    /** ID ảnh thumbnail size nhỏ (Mobile) */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    sizeSmall: string;

    /** ID ảnh thumbnail size trung bình (Tablet) */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    sizeMedium: string;

    /** ID ảnh thumbnail size lớn (Desktop) */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    sizeBig: string;

    @CreateDateColumn({ name: 'created_at', type: 'datetime' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
    updatedAt: Date;

    // Computed property: publishedDate từ createdAt (DD/MM/YYYY)
    get publishedDate(): string {
        if (!this.createdAt) return '';
        const date = new Date(this.createdAt);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    // Getter trả về thời lượng định dạng mm:ss
    get durationText(): string {
        if (!this.duration) return '';
        const minutes = Math.floor(this.duration / 60);
        const seconds = Math.floor(this.duration % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}
