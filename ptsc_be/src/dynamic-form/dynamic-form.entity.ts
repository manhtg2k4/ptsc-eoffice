import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, PrimaryColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity({ name: 'dynamic_form' }) // Thay bằng tên table thực tế nếu khác
export class DynamicForm {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    name: string;

    @CreateDateColumn({ type: 'datetime', name: 'created' })
    created: Date;

    @Column({ type: 'varchar', length: 50, default: '1' })
    status: string;

    @Column({ name: 'files', type: 'nvarchar', length: 500, nullable: true })
    file: string;

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    feature: string;

    @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
    code: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    processID?: string;

    @Column({ type: 'nvarchar', length: 500, nullable: true })
    fileName?: string;
}