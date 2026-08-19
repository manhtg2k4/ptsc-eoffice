// src/news/entities/news.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { TopicEntity } from '../../topic/entities/topic.entity';

@Entity('news')
@Index(['status', 'publishedAt'])
export class News {
    /** ID tự tăng */
    @PrimaryGeneratedColumn('increment')
    id: number;

    /** Tiêu đề tin tức */
    @Column({ type: 'nvarchar', length: 255 })
    title: string;

    /** Slug URL thân thiện SEO (unique) */
    @Column({ type: 'nvarchar', length: 255, unique: true })
    slug: string;

    /** Nội dung HTML của tin tức */
    @Column({ type: 'nvarchar', length: 'MAX' })
    content: string;

    /** Tên file ảnh đại diện */
    @Column({ type: 'nvarchar', length: 500, nullable: true })
    nameThumbnail: string;

    /** Tóm tắt ngắn gọn */
    @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    summary: string;

    /** Cho phép bình luận hay không */
    @Column({ type: 'bit', default: false })
    isComment: boolean;

    /** Đánh dấu tin đặc biệt/nổi bật */
    @Column({ type: 'bit', default: false })
    isSpecial: boolean;

    /** Đánh dấu tin quan trọng */
    @Column({ type: 'bit', default: false })
    isImportant: boolean;

    /** Chủ đề/danh mục tin tức (ID của topic) */
    @Column({ type: 'nvarchar', nullable: true })
    topic: string;

    /** Relation với TopicEntity */
    @ManyToOne(() => TopicEntity, { eager: false })
    @JoinColumn({ name: 'topic', referencedColumnName: 'id' })
    topicEntity?: TopicEntity;

    /** Các tag phân loại (cách nhau bởi dấu phẩy) */
    @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    tags: string;

    /** Trạng thái: 0=nháp, 1=đã xuất bản, 2=đã lên lịch, 3=đã xóa */
    @Column({ type: 'int', default: 1 })
    status: number; // 0: draft, 1: published, 3: deleted

    /** Ngày xuất bản thực tế */
    @Column({ type: 'datetime', nullable: true })
    publishedAt: Date;

    /** Ngày xuất bản theo lịch hẹn */
    @Column({ type: 'datetime', nullable: true })
    scheduledPublishAt: Date;

    /** Số lượt xem */
    @Column({ type: 'int', default: 0 })
    viewCount: number;

    // === Thông tin tác giả ====

    /** ID người tạo tin */
    @Column({ type: 'nvarchar', length: 100 })
    authorId: string;

    /** Tên người tạo tin */
    @Column({ type: 'nvarchar', length: 100 })
    authorName: string;

    /** Phòng ban của người tạo tin */
    @Column({ type: 'nvarchar', length: 255, nullable: true })
    authorDepartment: string;


    // === Thông tin người kiểm duyệt ===

    /** ID người phê duyệt */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    reviewerId: string;

    /** Tên người phê duyệt */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    reviewerName: string;

    /** Ngày duyệt tin tức */
    @Column({ type: 'datetime', nullable: true })
    approvedAt: Date;

    // === Thông tin workflow ===

    /** Phòng ban của người gửi (lấy từ parent organization) */
    @Column({ type: 'nvarchar', length: 255, nullable: true })
    department: string;

    /** ID người trình duyệt */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    submitterId: string;

    /** Tên người trình duyệt */
    @Column({ type: 'nvarchar', length: 255, nullable: true })
    submitterName: string;

    /** Ngày trình duyệt */
    @Column({ type: 'datetime', nullable: true })
    submittedAt: Date;

    /** Hạn xử lý phê duyệt (tính từ ngày trình + timeSave từ system_setting_log) */
    @Column({ type: 'datetime', nullable: true })
    deadline: Date;

    // === Thông tin thu hồi ===

    /** Ngày thu hồi tin đã xuất bản */
    @Column({ type: 'datetime', nullable: true })
    recalledAt: Date;

    /** ID người thu hồi */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    recalledById: string;

    /** Tên người thu hồi */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    recalledByName: string;

    /** Lý do thu hồi tin */
    @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    recallReason: string;

    // === Thông tin người trả lại ===

    /** ID người trả lại tin */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    rejectorId: string;

    /** Tên người trả lại tin */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    rejectorName: string;

    /** Ngày trả lại */
    @Column({ type: 'datetime', nullable: true })
    rejectedAt: Date;

    /** Lý do trả lại */
    @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    rejectReason: string;

    // === Thông tin người hủy tin ===

    /** ID người hủy tin */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    cancellerId: string;

    /** Tên người hủy tin */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    cancellerName: string;

    /** Ngày hủy tin */
    @Column({ type: 'datetime', nullable: true })
    cancelledAt: Date;

    /** Lý do hủy tin */
    @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    cancelReason: string;

    /** ID ảnh thumbnail size nhỏ (Mobile) */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    sizeSmall: string;

    /** ID ảnh thumbnail size trung bình (Tablet) */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    sizeMedium: string;

    /** ID ảnh thumbnail size lớn (Desktop) */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    sizeBig: string;

    // BPMN workflow (cần tạo migration để thêm cột vào database)
    // @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    // bpmnXML: string;

    // @Column({ type: 'nvarchar', length: 100, nullable: true })
    // flowId: string;

    /** Ngày tạo bản ghi */
    @CreateDateColumn({ type: 'datetime' })
    createdAt: Date;

    /** Ngày cập nhật cuối cùng */
    @UpdateDateColumn({ type: 'datetime' })
    updatedAt: Date;
}