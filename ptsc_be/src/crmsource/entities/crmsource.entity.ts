import {
    Entity,
    Column,
    PrimaryColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ValueTransformer,
} from 'typeorm';

export const CategoryArrayTransformer: ValueTransformer = {
    to: (value: any) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return '';
        try {
            return typeof value === 'string' ? value : JSON.stringify(value);
        } catch {
            return '';
        }
    },
    from: (value: any) => {
        // Nếu DB trả về null hoặc chuỗi rỗng thì trả về mảng rỗng
        if (!value || (typeof value === 'string' && value.trim() === '')) return [];
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            return [value]; // Bọc tự động thành mảng nếu gặp dữ liệu cũ (ví dụ 'documentModule')
        }
    }
};


@Entity({ name: 'crm_sources', schema: 'dbo' })
export class CrmSourceEntity {
    /**
     * ID là string (nvarchar(250)), không tự tăng → dùng PrimaryColumn thay vì PrimaryGeneratedColumn
     */
    @PrimaryColumn({ type: 'nvarchar', length: 250 })
    id: string | null;

    @Column({ type: 'tinyint', default: 0 })
    canDragDrop: number;

    @Column({ type: 'nvarchar', length: 2000, nullable: true })
    code: string | null;

    @Column({ type: 'int', nullable: true })
    status: number | null;

    @Column({ type: 'tinyint', default: 0 })
    canDelete: number;

    @Column({ type: 'nvarchar', length: 2000, nullable: true })
    state: string | null;

    @Column({ type: 'nvarchar', length: 2000, nullable: true })
    title: string | null;

    /**
     * Trường "type" là từ khóa trong SQL Server → phải dùng name: '[type]'
     */
    @Column({ name: '[type]', type: 'nvarchar', length: 2000, nullable: true })
    type: string | null;

    @Column({ type: 'nvarchar', length: 2000, nullable: true })
    originalName: string | null;

    @CreateDateColumn({ type: 'datetime', name: 'createdAt' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'datetime', name: 'updatedAt' })
    updatedAt: Date;

		@Column({ type: 'nvarchar', length: 'MAX', nullable: false, default: '', transformer: CategoryArrayTransformer })
    moduleCategory: any;
}