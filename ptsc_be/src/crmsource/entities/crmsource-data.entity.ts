import {
    Entity,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'crm_source_data', schema: 'dbo' }) 
export class CrmSourceDataEntity {
    /**
     * id là nvarchar(250) NULL → không phải khóa chính tự tăng
     * → dùng @Column thông thường, không dùng @PrimaryColumn hay @PrimaryGeneratedColumn
     */
    @PrimaryColumn({ type: 'nvarchar', length: 250 })
    id: string | null;

    /**
     * source_id: tham chiếu đến id của bảng crm_sources (logic quan hệ 1-n)
     * Hiện tại DB chưa có FK → chỉ lưu string, không dùng @ManyToOne
     */
    @Column({ type: 'nvarchar', length: 250, nullable: true })
    source_id: string | null;

    @Column({ type: 'nvarchar', length: 2000, nullable: true })
    title: string | null;

    @Column({ type: 'nvarchar', length: 2000, nullable: true })
    value: string | null;

    @CreateDateColumn({ type: 'datetime', name: 'createdAt' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'datetime', name: 'updatedAt' })
    updatedAt: Date;
}