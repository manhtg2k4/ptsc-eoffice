import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { ProjectEntity } from './project.entity';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity('project_members')
@Index(['projectId', 'userId'], { unique: true })
export class ProjectMemberEntity {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ name: 'project_id' })
    projectId: number;

    @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'project_id' })
    project: ProjectEntity;

    @Column({ name: 'user_id', type: 'nvarchar', length: 100 })
    userId: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    /** Vai trò: manager, member, viewer */
    @Column({ type: 'nvarchar', length: 50 })
    role: string;

    @Column({ type: 'datetime', default: () => 'GETDATE()' })
    joinedAt: Date;
}
