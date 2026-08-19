import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

@Entity('view_configs') // Tên bảng trong SQL Server
export class ViewConfigEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index({ unique: true })
    @Column({ length: 255 })
    code: string;

    @Column({ length: 500, nullable: true })
    name?: string;

    @Column({ length: 255, nullable: true })
    processID?: string;

    @Column({ type: 'nvarchar', length: 'max', nullable: true })
    field?: string; // Lưu trữ dưới dạng chuỗi JSON

    @Column({ type: 'int', default: 1 })
    status: number;

    @Column({ length: 100, nullable: true })
    type?: string;

    @Column({ type: 'nvarchar', length: 'max', nullable: true })
    note?: string;

    @Column({ length: 255, nullable: true })
    viewConfigId?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
