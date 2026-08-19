import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { ProjectEntity } from './project.entity';

@Entity('project_role_permissions')
@Index(['projectId', 'role'], { unique: true })
export class ProjectRolePermissionEntity {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ name: 'project_id' })
    projectId: number;

    @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'project_id' })
    project: ProjectEntity;

    /** Vai trò: manager, member, viewer */
    @Column({ type: 'nvarchar', length: 50 })
    role: string;

    @Column({ type: 'bit', default: 0 })
    updateStatus: boolean;

    @Column({ type: 'bit', default: 0 })
    updateGeneralInfo: boolean;

    @Column({ type: 'bit', default: 0 })
    updateParticipants: boolean;

    @Column({ type: 'bit', default: 0 })
    uploadFiles: boolean;

    @Column({ type: 'bit', default: 0 })
    comment: boolean;

    @Column({ type: 'bit', default: 0 })
    inputDelayReason: boolean;

    @Column({ type: 'bit', default: 0 })
    viewAnalysis: boolean;

    @Column({ type: 'bit', default: 0 })
    setPermissions: boolean;
}
