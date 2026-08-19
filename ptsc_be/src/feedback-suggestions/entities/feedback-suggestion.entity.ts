import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('feedback_suggestions')
export class FeedbackSuggestionEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string; // ID duy nhất của phản ánh/góp ý

    @Column({ name: 'code', type: 'nvarchar', length: 50, unique: true })
    code: string; // Mã phản ánh duy nhất (ví dụ: YC-20241208-001)

    @Column({ name: 'types', type: 'nvarchar', length: 255 })
    types: string; // Loại phản ánh (Thủ tục hành chính nội bộ, Chính sách, Cơ sở vật chất...)

    @Column({ name: 'priority', type: 'nvarchar', length: 50, default: 'binhthuong' })
    priority: string; // Mức độ (binhthuong / khancap)


    @Column({ name: 'title', type: 'nvarchar', length: 200 })
    title: string; // Tiêu đề phản ánh (tối đa 200 ký tự)

    @Column({ name: 'content', type: 'nvarchar', length: '2000' })
    content: string; // Nội dung chi tiết (không giới hạn ký tự)

    @Column({
        name: 'files',
        type: 'nvarchar',
        length: 'max',
        nullable: true,
        transformer: {
            to: (value: any) => (value ? JSON.stringify(value) : null),
            from: (value: string) => (value ? JSON.parse(value) : []),
        },
    })
    files: any[]; // Danh sách file minh chứng đính kèm

    @Column({ name: 'status', type: 'int', default: 1 })
    status: number; // Trạng thái bản ghi: 1 = đang hoạt động, 3 = đã xóa

    @Column({ name: 'process_status', type: 'int', default: 1 })
    processStatus: number; // Trạng thái xử lý: 1=Chờ điều phối, 2=Chờ xử lý, 3=Đang xử lý, 4=Hoàn thành, 5=Từ chối

    @Column({ name: 'unit_id', type: 'nvarchar', length: 255, nullable: true })
    unitId: string | null; // Đơn vị xử lý

    @Column({ name: 'processor_id', type: 'nvarchar', length: 255, nullable: true })
    processorId: string | null; // Người xử lý cụ thể

    @Column({ name: 'deadline', type: 'datetime2', nullable: true })
    deadline: Date | null; // Hạn xử lý (SLA)

    @Column({ name: 'note', type: 'nvarchar', length: 'max', nullable: true })
    note: string | null; // Ghi chú trong quá trình xử lý

    @Column({ name: 'result', type: 'nvarchar', length: 'max', nullable: true })
    result: string | null; // Kết quả xử lý cuối cùng

    @Column({ name: 'overdue_reason', type: 'nvarchar', length: 'max', nullable: true })
    overdueReason: string | null; // Lý do quá hạn (nếu xử lý chậm)

    @Column({ name: 'created_by_id', type: 'nvarchar', length: 100, nullable: true })
    createdById: string | null; // ID người tạo phản ánh (nvarchar 100 để khớp với bảng users)

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'created_by_id' })
    createdBy: UserEntity; // Thông tin chi tiết người tạo

    @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
    createdAt: Date; // Thời gian gửi phản ánh

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
    updatedAt: Date; // Thời gian cập nhật gần nhất

    @Column({ name: 'is_edited', type: 'bit', default: 0 })
    isEdited: boolean; // Đã từng chỉnh sửa (chỉ được sửa 1 lần)

    @Column({ name: 'edited_at', type: 'datetime2', nullable: true })
    editedAt: Date | null; // Thời điểm chỉnh sửa lần đầu

    @Column({ name: 'rating', type: 'int', nullable: true })
    rating: number | null; // Đánh giá sao (1-5)

    @Column({ name: 'rating_comment', type: 'nvarchar', length: 'max', nullable: true })
    ratingComment: string | null; // Nội dung đánh giá

    @Column({ name: 'satisfaction_level', type: 'nvarchar', length: 255, nullable: true })
    satisfactionLevel: string | null; // Mức độ hài lòng
}
