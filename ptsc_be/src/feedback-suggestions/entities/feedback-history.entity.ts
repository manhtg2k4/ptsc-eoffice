import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { FeedbackSuggestionEntity } from './feedback-suggestion.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('feedback_histories')
export class FeedbackHistoryEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'feedback_id', type: 'uniqueidentifier' })
    feedbackId: string; // ID của phản ánh liên quan

    @ManyToOne(() => FeedbackSuggestionEntity)
    @JoinColumn({ name: 'feedback_id' })
    feedback: FeedbackSuggestionEntity;

    @Column({ name: 'action', type: 'nvarchar', length: 255 })
    action: string; // Hành động thực hiện (Tạo mới, Tiếp nhận, Từ chối, Hoàn thành...)

    @Column({ name: 'note', type: 'nvarchar', length: 'max', nullable: true })
    note: string; // Nội dung ghi chú kèm theo hành động

    @Column({ name: 'performer_id', type: 'nvarchar', length: 100, nullable: true })
    performerId: string | null; // ID người thực hiện hành động

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'performer_id' })
    performer: UserEntity; // Thông tin chi tiết người thực hiện

    @CreateDateColumn({ name: 'performed_at', type: 'datetime2' })
    performedAt: Date; // Thời gian thực hiện hành động
}
