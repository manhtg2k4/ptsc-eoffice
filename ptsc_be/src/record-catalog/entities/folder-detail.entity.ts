import {
    Entity,
    Column,
    PrimaryColumn,
    CreateDateColumn,
    UpdateDateColumn,
    BeforeInsert,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { YearCategoryEntity } from './year-category.entity';
import { FileRecordEntity } from './file-record.entity';

@Entity('folder_detail')
export class FolderDetailEntity {
    @PrimaryColumn({ type: 'nvarchar', length: 36 })
    id: string;

    @BeforeInsert()
    generateId() {
        if (!this.id) this.id = uuidv4();
    }

    /** Tiêu đề mục hồ sơ */
    @Column({ name: 'title', type: 'nvarchar', length: 500 })
    title: string;

    @Column({ name: 'year_category_id', type: 'nvarchar', length: 36 })
    yearCategoryId: string;

    @ManyToOne(() => YearCategoryEntity, (year) => year.folderDetails, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'year_category_id' })
    yearCategory: YearCategoryEntity;

    @OneToMany(() => FileRecordEntity, (file) => file.folderDetail)
    departmentRecords: FileRecordEntity[];

    @Column({ name: 'total_documents', type: 'int', default: 0 })
    totalDocuments: number;

    @Column({ name: 'total_files', type: 'int', default: 0 })
    totalFiles: number;

    @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
    updatedAt: Date;
}
