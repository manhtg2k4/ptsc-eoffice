import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { STATUS } from '../variables/CONST_STATUS'; // Giữ nguyên enum của bạn

export enum FileStatus {
    INACTIVE = STATUS.NOT_ACTIVED,
    ACTIVE = STATUS.ACTIVED,
    ARCHIVED = STATUS.LOCKED,
    DELETED = STATUS.DELETED,
}

@Entity({ name: 'file_manager' }) // Tên table trong MSSQL
export class FileManager {
    @PrimaryGeneratedColumn('uuid') // Tạo UUID tự động (string 36 ký tự)
    id: string;

    @Column({ type: 'nvarchar', length: 500, nullable: true })
    name: string; // Tên hiển thị (originalname)

    @Column({ type: 'nvarchar', length: 500, nullable: true })
    nameRoot: string; // Tên file đã upload (filename)

    @Column({ type: 'nvarchar', length: 255, default: '' })
    username: string;

    @Column({ type: 'nvarchar', length: 1000, nullable: true })
    path: string; // Đường dẫn tương đối

    @Column({ type: 'nvarchar', length: 1000, nullable: true })
    realPath: string; // Đường dẫn tuyệt đối trên server

    @Column({ type: 'nvarchar', length: 1000, nullable: true })
    fullPath: string;

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    clientId: string;

    @Column({ type: 'nvarchar', length: 500, nullable: true })
    realName: string;

    @Column({ type: 'nvarchar', length: 1000, nullable: true })
    parentPath: string;

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    mimetype: string;

    @Column({ type: 'nvarchar', length: 1000, default: '' })
    description: string;

    @Column({ type: 'nvarchar', length: 36, nullable: true })
    mid: string; // ObjectId → string uuid

    @Column({ type: 'bigint', nullable: true })
    size: number;

    @Column({ type: 'datetime', nullable: true })
    birthtime: Date;

    @Column({ type: 'bit', default: false })
    isFile: boolean;

    @Column({ name: 'fileType', type: 'nvarchar', length: 100, nullable: true }) // Tránh từ khóa 'type'
    type: string;

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    createdBy: string;

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    updatedBy: string;

    @Column({ type: 'int', default: FileStatus.ACTIVE })
    status: number;

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    statusExcel: string;

    @Column({ type: 'nvarchar', length: 500, nullable: true })
    originalName: string;

    // attachedFiles: mảng object → dùng JSON column (đơn giản và hiệu quả trong MSSQL)
    @Column({
        type: 'nvarchar', nullable: true, transformer: {
            to: (value) => (value ? JSON.stringify(value) : null),
            from: (value) => (value ? JSON.parse(value) : []),
        }
    })
    attachedFiles: {
        path?: string;
        fileId: string;
        name: string;
        _id?: string;
    }[];

    // rows: any[] → cũng dùng JSON
    @Column({
        type: 'nvarchar', nullable: true, transformer: {
            to: (value) => (value ? JSON.stringify(value) : null),
            from: (value) => (value ? JSON.parse(value) : []),
        }
    })
    rows: any[];

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    tab: string;

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    entityType: string;

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    implementer: string;

    @Column({ type: 'datetime', nullable: true })
    implementationDate: Date;

    @Column({ type: 'bit', default: false })
    isSigned: boolean;

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    profileid: string;

    @CreateDateColumn({ type: 'datetime' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'datetime' })
    updatedAt: Date;
}