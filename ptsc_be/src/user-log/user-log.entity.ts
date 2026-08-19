import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'user_logs' }) // Tên bảng trong MSSQL, bạn có thể đổi nếu cần
export class UserLogEntity {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id: number;

    @Column({ type: 'nvarchar', length: 45, nullable: true })
    ip: string | null;

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    userName: string | null;

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    department: string | null;

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    feature: string | null;

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    action: string | null;

    @Column({ type: 'nvarchar', length: 100, nullable: true })
    status: string | null;

    @CreateDateColumn({
        type: 'datetime',
        name: 'created_at',
        default: () => 'GETDATE()',
    })
    createdAt: Date;

    @UpdateDateColumn({
        type: 'datetime',
        name: 'updated_at',
        default: () => 'GETDATE()',
        onUpdate: 'GETDATE()',
    })
    updatedAt: Date;
}