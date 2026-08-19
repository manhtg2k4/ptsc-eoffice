import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, BeforeInsert, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { YearCategoryEntity } from './year-category.entity';
import { RecordDocumentEntity } from './record-document.entity';
import { FolderDetailEntity } from './folder-detail.entity';

export enum FileRecordStatus {
    NOT_OPEN = '0', // Chưa mở
    OPENED = '1',   // Đã mở
    ARCHIVED = '2', // Đã lưu trữ
}

@Entity('file_record')
export class FileRecordEntity {
    @PrimaryColumn({ type: 'nvarchar', length: 36 })
    id: string;

    @BeforeInsert()
    generateId() {
        if (!this.id) this.id = uuidv4();
    }

    @Column({ name: 'file_symbol', type: 'nvarchar', length: 100 })
    fileSymbol: string;

    @Column({ type: 'nvarchar', length: 255 })
    title: string;

    @Column({ name: 'year_category_id', type: 'nvarchar', length: 36, nullable: true })
    yearCategoryId: string;

    @ManyToOne(() => YearCategoryEntity, (year) => year.files, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'year_category_id' })
    yearCategory: YearCategoryEntity;

    /** Level 1 parent - FolderDetail (nullable để backward compatible) */
    @Column({ name: 'folder_detail_id', type: 'nvarchar', length: 36, nullable: true })
    folderDetailId: string | null;

    @ManyToOne(() => FolderDetailEntity, (fd) => fd.departmentRecords, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'folder_detail_id' })
    folderDetail: FolderDetailEntity | null;

    // Status: 0: Chưa mở, 1: Đã mở, 2: Đã lưu trữ
    @Column({ type: 'char', length: 1, default: FileRecordStatus.NOT_OPEN })
    status: FileRecordStatus;

    @OneToMany(() => RecordDocumentEntity, (doc) => doc.fileRecord)
    documents: RecordDocumentEntity[];

    @Column({ name: 'total_documents', type: 'int', default: 0 })
    totalDocuments: number;

    @Column({ name: 'total_files', type: 'int', default: 0 })
    totalFiles: number;

    @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
    updatedAt: Date;
}
