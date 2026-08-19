import { Type } from 'class-transformer';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('news_calendar')
@Index(['startTime', 'endTime'])
export class NewsCalendarEntity {
    /** ID tự tăng */
    @PrimaryGeneratedColumn('increment')
    id: number;

    /** Tên sự kiện, công việc */
    @Column({ type: 'nvarchar', length: 500 })
    title: string;

    /** Loại sự kiện (Ngày truyền thống, Hội nghị & Đại hội, Sản xuất kinh doanh, Văn hóa - Đoàn thể, ...) */
    @Column({ type: 'nvarchar', length: 255, nullable: true })
    type: string;

    /** Thời gian bắt đầu */
    @Column({ type: 'datetime2' })
    startTime: Date;

    /** Thời gian kết thúc */
    @Column({ type: 'datetime2', nullable: true })
    endTime: Date;

    /** Địa điểm tổ chức */
    @Column({ type: 'nvarchar', length: 500, nullable: true })
    location: string;

    /** Khách mời / Người TG (Lưu chuỗi phân tách bởi dấu phẩy hoặc JSON string) */
    @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    participants: string;

    /** Ghi chú / Nội dung chi tiết */
    @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    description: string;

    /** Trạng thái (0: Nháp, 1: Công khai, ...) */
    @Column({ type: 'int', default: 1 })
    status: number;

    /** Đánh dấu sự kiện quan trọng */
    @Column({ type: 'bit', default: false, name: 'is_important' })
    @Type(() => Boolean)
    isImportant: boolean;

    /** ID người tạo */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    createdBy: string;

    /** Tên người tạo */
    @Column({ type: 'nvarchar', length: 255, nullable: true })
    createdByName: string;

    /** Thời gian tạo */
    @CreateDateColumn()
    createdAt: Date;

    /** Thời gian cập nhật */
    @UpdateDateColumn()
    updatedAt: Date;
}
