import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, BeforeInsert, ManyToOne, JoinColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { FileRecordEntity } from './file-record.entity';
import { YearCategoryEntity } from './year-category.entity';

export enum DocumentStatus {
    NOT_OPEN = '0',   // Chưa mở
    OPENED = '1',     // Đã mở
    ARCHIVED = '2',   // Đã lưu trữ
}

@Entity('record_document')
export class RecordDocumentEntity {
    @PrimaryColumn({ type: 'nvarchar', length: 36 })
    id: string;

    @BeforeInsert()
    generateId() {
        if (!this.id) this.id = uuidv4();
    }

    @Column({ name: 'document_symbol', type: 'nvarchar', length: 100, nullable: true })
    documentSymbol: string;    // Số ký hiệu văn bản

    @Column({ name: 'document_title', type: 'nvarchar', length: 500, nullable: true })
    documentTitle: string;    // Tiêu đề văn bản (Trích yếu)

    @Column({ name: 'file_record_id', type: 'nvarchar', length: 36, nullable: true })
    fileRecordId: string | null;

    @ManyToOne(() => FileRecordEntity, (file) => file.documents, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'file_record_id' })
    fileRecord: FileRecordEntity | null;

    @Column({ name: 'year_category_id', type: 'nvarchar', length: 36 })
    yearCategoryId: string;

    @ManyToOne(() => YearCategoryEntity, { onDelete: 'NO ACTION' })
    @JoinColumn({ name: 'year_category_id' })
    yearCategory: YearCategoryEntity;

    // Status: 0: Chưa mở, 1: Đã mở, 2: Đã lưu trữ
    @Column({ type: 'char', length: 1, default: DocumentStatus.NOT_OPEN })
    status: DocumentStatus;

    @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
    updatedAt: Date;
}
