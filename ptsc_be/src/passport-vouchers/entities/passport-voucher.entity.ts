import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { PassportVoucherItemEntity } from './passport-voucher-item.entity';
// import { PassportVoucherItemEntity } from './passport-voucher-item.entity';

@Entity('passport_vouchers')
export class PassportVoucherEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'voucher_code', type: 'nvarchar', length: 50, unique: true })
    voucherCode: string;

    @Column({ name: 'voucher_type', type: 'nvarchar', length: 20 })
    voucherType: string; // 'HANDOVER', 'RETURN'

    @Column({ name: 'request_id', type: 'nvarchar', length: 100, nullable: true })
    requestId: string | null;

    @Column({ name: 'unit_name', type: 'nvarchar', length: 255, nullable: true })
    unitName: string | null;

    @Column({ name: 'department_name', type: 'nvarchar', length: 255, nullable: true })
    departmentName: string | null;

    @Column({ name: 'receiver_name', type: 'nvarchar', length: 255, nullable: true })
    receiverName: string | null;

    @Column({ name: 'receiver_id', type: 'nvarchar', length: 100, nullable: true })
    receiverId: string | null;

    @Column({ name: 'performer_id', type: 'nvarchar', length: 100, nullable: true })
    performerId: string | null;

    @Column({ name: 'performer_name', type: 'nvarchar', length: 255, nullable: true })
    performerName: string | null;

    @Column({ name: 'performer_signature', type: 'nvarchar', length: 'max', nullable: true })
    performerSignature: string | null;

    @Column({ name: 'receiver_signature', type: 'nvarchar', length: 'max', nullable: true })
    receiverSignature: string | null;

    @Column({ name: 'performer_signed_at', type: 'datetime2', nullable: true })
    performerSignedAt: Date | null;

    @Column({ name: 'receiver_signed_at', type: 'datetime2', nullable: true })
    receiverSignedAt: Date | null;

    @Column({ name: 'note', type: 'nvarchar', length: 'max', nullable: true })
    note: string | null;

    @Column({ name: 'partial_return_reason', type: 'nvarchar', length: 'max', nullable: true })
    partialReturnReason: string | null;

    @Column({ name: 'status', type: 'nvarchar', length: 50, default: 'DRAFT' })
    status: string;

    @Column({
        name: 'summary_meta',
        type: 'nvarchar',
        length: 'MAX',
        nullable: true,
        transformer: {
            to: (value: any) => (value ? JSON.stringify(value) : null),
            from: (value: string) => {
                if (!value) return null;
                try { return JSON.parse(value); } catch { return value; }
            },
        },
    })
    summaryMeta: any | null;

    @OneToMany('PassportVoucherItemEntity', 'voucher')
    items: any[];

    @Column({ name: 'created_by', type: 'nvarchar', length: 100, nullable: true })
    createdBy: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
    createdAt: Date;

    @Column({ name: 'updated_by', type: 'nvarchar', length: 100, nullable: true })
    updatedBy: string | null;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
    updatedAt: Date;
}
