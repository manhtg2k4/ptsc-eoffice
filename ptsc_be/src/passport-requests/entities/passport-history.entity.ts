import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PassportRequestEntity } from './passport-request.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('passport_histories')
export class PassportHistoryEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'request_id', type: 'nvarchar', length: 100 })
    requestId: string; // ID của yêu cầu mượn hộ chiếu liên quan

    @ManyToOne(() => PassportRequestEntity)
    @JoinColumn({ name: 'request_id' })
    request: PassportRequestEntity;

    @Column({ name: 'action', type: 'nvarchar', length: 255 })
    action: string; // Hành động thực hiện (Gửi yêu cầu, Phê duyệt, Chuyển xử lý, Bàn giao, Hoàn trả, Từ chối...)

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
