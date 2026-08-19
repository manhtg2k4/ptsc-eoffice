import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'authority_documents' }) // tên bảng trong MSSQL
export class AuthorityDocumentEntity {
    @PrimaryGeneratedColumn('increment')
    id: number;

    /** ID của người ủy quyền (tương ứng với trường author trong MongoDB) */
    @Column({ type: 'nvarchar', length: 64, nullable: false })
    author: string;

    /** ID của người được ủy quyền */
    @Column({ type: 'nvarchar', length: 64, nullable: false })
    authorized: string;

    /** Thời điểm bắt đầu hiệu lực */
    @Column({ name: 'start_date', type: 'datetime', nullable: false })
    startDate: Date;

    /** Thời điểm hết hiệu lực */
    @Column({ name: 'end_date', type: 'datetime', nullable: false })
    endDate: Date;

    /** Thời điểm hết hiệu lực ban đầu (nếu có gia hạn) */
    @Column({ name: 'original_end_date', type: 'datetime', nullable: true })
    originalEndDate?: Date;

    /** Giai đoạn: 0 = hết hạn, 1 = active, 2 = kết thúc, ... */
    @Column({ type: 'int', default: 0 })
    stage: number;

    /** Trạng thái: 1 = active, 3 = deleted, ... */
    @Column({ type: 'int', default: 1 })
    status: number;

    /** Danh sách tên file hoặc đường dẫn file liên quan */
    @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    files: string | null;

    /**
     * Getter tiện lợi để lấy danh sách files dưới dạng mảng
     * (trong MongoDB là mảng string, ở đây giả định lưu dưới dạng JSON string)
     */
    get filesArray(): string[] {
        if (!this.files) return [];
        try {
            return JSON.parse(this.files);
        } catch {
            return [];
        }
    }

    @CreateDateColumn({name: 'created_at', type: 'datetime' })
    createdAt: Date;

    @UpdateDateColumn({name: 'updated_at', type: 'datetime' })
    updatedAt: Date;
}