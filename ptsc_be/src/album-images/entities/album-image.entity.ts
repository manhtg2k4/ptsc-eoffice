import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum AlbumType {
    FEATURED = 'featured', // Nổi bật
    NORMAL = 'normal', // Thường
}

export enum AlbumStatus {
    ACTIVE = 1,    // Hoạt động (chưa xóa)
    DELETED = 3,   // Đã xóa mềm (soft delete)
}

@Entity('album_images')
export class AlbumImageEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'topic', type: 'nvarchar', length: 500 })
    topic: string;

    @Column({ name: 'title', type: 'nvarchar', length: 500 })
    title: string;

    @Column({ name: 'description', type: 'nvarchar', length: 'MAX' })
    description: string;

    @Column({
        name: 'album_type',
        type: 'nvarchar',
        length: 50,
        enum: AlbumType,
        default: AlbumType.NORMAL,
    })
    albumType: AlbumType;

    @Column({
        name: 'images',
        type: 'nvarchar',
        length: 'MAX',
        transformer: {
            to: (value: any[]) => (value ? JSON.stringify(value) : '[]'),
            from: (value: string) => {
                if (!value) return [];
                try {
                    return JSON.parse(value);
                } catch {
                    return [];
                }
            },
        },
        default: '[]',
    })
    images: Record<string, any>[];

    @Column({
        name: 'thumbnail',
        type: 'nvarchar',
        length: 'MAX',
        nullable: true,
    })
    thumbnail: string;

    @Column({ name: 'thumbnail_file_id', type: 'int', nullable: true })
    thumbnailFileId: number;

    @Column({ name: 'views', type: 'int', default: 0 })
    views: number;

    @Column({ name: 'shares', type: 'int', default: 0 })
    shares: number;

    @Column({ name: 'status', type: 'int', default: AlbumStatus.ACTIVE })
    status: AlbumStatus;

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
}
