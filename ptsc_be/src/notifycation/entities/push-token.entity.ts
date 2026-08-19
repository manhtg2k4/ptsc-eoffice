import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    JoinColumn,
} from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity('notification_mobile_tokens')
@Index(['userId', 'pushToken'], { unique: true })
export class PushTokenEntity {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'nvarchar', length: 100 })
    userId: string;

    @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user?: UserEntity | null;

    @Column({ type: 'nvarchar', length: 500 })
    pushToken: string;

    @Column({ type: 'nvarchar', length: 'MAX', default: '' })
    token: string;

    @Column({ type: 'bit', default: true, name: 'isUse' })
    isUse: boolean;

    @CreateDateColumn({ type: 'datetime2', name: 'createdAt' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'datetime2', name: 'updatedAt' })
    updatedAt: Date;
}
