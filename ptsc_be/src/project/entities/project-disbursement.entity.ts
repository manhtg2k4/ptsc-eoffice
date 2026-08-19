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
import { ProjectEntity } from './project.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('project_disbursements')
export class ProjectDisbursementEntity {
    @PrimaryGeneratedColumn('increment')
    id: number;

    /** ID dự án */
    @Index()
    @Column({ type: 'int' })
    projectId: number;

    /** Số tiền giải ngân */
    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    disbursementAmount: number;

    /** Đơn vị tiền tệ (Hệ số nhân, ví dụ: 1000000000 = Tỷ, 1000000 = Triệu, 1 = VNĐ) */
    @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
    moneyUnit: number;

    /** Thời gian giải ngân */
    @Column({ type: 'datetime', nullable: true })
    disbursementDate: Date;

    /** ID người giải ngân */
    @Index()
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    disbursedByUserId: string;

    /** Ghi chú */
    @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    notes: string;

    // === Quan hệ ===

    /** Dự án được giải ngân */
    @ManyToOne(() => ProjectEntity)
    @JoinColumn({ name: 'projectId' })
    project: ProjectEntity;

    /** Người giải ngân */
    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'disbursedByUserId' })
    disbursedByUser: UserEntity;

    // === Quản lý bản ghi ===

    /** Trạng thái: 1=Hoạt động, 3=Đã xóa */
    @Column({ type: 'int', default: 1 })
    status: number;

    @CreateDateColumn({ type: 'datetime' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'datetime' })
    updatedAt: Date;

    /** ID người tạo */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    createdBy: string;
}
