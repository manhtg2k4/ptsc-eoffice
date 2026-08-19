import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, BeforeInsert, OneToMany } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { FileRecordEntity } from './file-record.entity';
import { RecordDocumentEntity } from './record-document.entity';
import { FolderDetailEntity } from './folder-detail.entity';

@Entity('year_category')
export class YearCategoryEntity {
    @PrimaryColumn({ type: 'nvarchar', length: 36 })
    id: string;

    @BeforeInsert()
    generateId() {
        if (!this.id) this.id = uuidv4();
    }

    @Column({ type: 'int', unique: true })
    year: number;

    @Column({ type: 'nvarchar', length: 500, nullable: true })
    description?: string;

    @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
    updatedAt: Date;

    @OneToMany(() => FolderDetailEntity, (fd) => fd.yearCategory)
    folderDetails: FolderDetailEntity[];

    @OneToMany(() => FileRecordEntity, (file) => file.yearCategory)
    files: FileRecordEntity[];

    @OneToMany(() => RecordDocumentEntity, (doc) => doc.yearCategory)
    documents: RecordDocumentEntity[];

    @Column({ name: 'total_documents', type: 'int', default: 0 })
    totalDocuments: number;

    @Column({ name: 'total_files', type: 'int', default: 0 })
    totalFiles: number;
}
