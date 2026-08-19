import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    OneToMany,
} from 'typeorm';
import { ProjectMemberEntity } from './project-member.entity';
import { ProjectRolePermissionEntity } from './project-permission.entity';
import { TaskEntity } from '../../task/entity/task.entity';

@Entity('projects')
export class ProjectEntity {
    @PrimaryGeneratedColumn('increment')
    id: number;

    /** Mã dự án - Tự sinh */
    @Index({ unique: true })
    @Column({ type: 'nvarchar', length: 50, unique: true })
    code: string;

    /** Tên dự án */
    @Column({ type: 'nvarchar', length: 500 })
    name: string;

    /** Ngày bắt đầu */
    @Column({ type: 'datetime', nullable: true })
    startDate: Date;

    /** Ngày kết thúc */
    @Column({ type: 'datetime', nullable: true })
    endDate: Date;

    /** Quy trình */
    @Column({ type: 'nvarchar', length: 255, nullable: true })
    process: string;

    /** Thời gian nhắc hạn (ví dụ: 1 ngày, 24 giờ) */
    @Column({ type: 'nvarchar', length: 255, default: '3' })
    reminderDays: string;

    /** Độ ưu tiên: gap, binhthuong, Gấp, Bình thường */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    priority: string;

    /** Loại dự án */
    @Column({ type: 'nvarchar', length: 255, nullable: true })
    typeProject: string;

    /** Ngân sách */
    @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
    budget: number;

    /** Đơn vị tiền tệ (Hệ số nhân, ví dụ: 1000000000 = Tỷ, 1000000 = Triệu, 1 = VNĐ) */
    @Column({ type: 'decimal', precision: 18, scale: 2, default: 1, nullable: true })
    moneyUnit: number;

    /** Mô tả dự án */
    @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    description: string;

    /** Quản lý dự án (IDs cách nhau bởi dấu phẩy) */
    @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    managerId: string;

    /** Thành viên dự án (IDs cách nhau bởi dấu phẩy) */
    @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    members: string;

    /** Người xem (IDs cách nhau bởi dấu phẩy) */
    @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    viewers: string;

    /** Trạng thái: 1=Đang sống, 3=Đã bị xóa */
    @Column({ type: 'int', default: 1 })
    status: number;

    @CreateDateColumn({ type: 'datetime' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'datetime' })
    updatedAt: Date;

    /** ID người tạo */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    createdBy: string;

    /** Tiến độ (%) */
    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, nullable: true })
    progress: number;

    /** Trạng thái nghiệp vụ: 1=Chuẩn bị, 2=Đang thực hiện, 3=Hoàn thành, 4=Hủy, 5=Tạm dừng */
    @Column({ type: 'int', nullable: true })
    projectStatus: number;

    /** ID thư mục lưu trữ */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    folderId: string;

    /** Danh sách phòng ban */
    @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    departments: string;

    /** ID phòng ban */
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    organizationUnitId: string;

    // === Quan hệ ===

    /** Danh sách thành viên tham gia dự án */
    @OneToMany(() => ProjectMemberEntity, (member) => member.project)
    projectMembers: ProjectMemberEntity[];

    /** Cấu hình quyền hạn cho các vai trò trong dự án này */
    @OneToMany(() => ProjectRolePermissionEntity, (permission) => permission.project)
    rolePermissions: ProjectRolePermissionEntity[];

    /** Danh sách công việc thuộc dự án */
    @OneToMany(() => TaskEntity, (task) => task.project)
    tasks: TaskEntity[];

    // Tao lich su
    isUpdateGeneralInfo: string;
    isUpdateStatus: string;
    isUpdateParticipants: string;
    isUpdateProcess: string;
}
