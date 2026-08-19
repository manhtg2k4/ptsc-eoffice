import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Unique,
} from 'typeorm';

@Entity({ name: 'network_administrations' }) // tên bảng trong MSSQL
@Unique(['ip']) // đảm bảo IP unique
export class NetworkAdministrationEntity {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id: number;

    @Column({ type: 'nvarchar', length: 45, unique: true })
    ip: string;

    @Column({ type: 'nvarchar', length: 100 })
    type: string;

    @CreateDateColumn({ type: 'datetime', name: 'createdAt' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'datetime', name: 'updatedAt' })
    updatedAt: Date;
}