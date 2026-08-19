import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PassportVoucherEntity } from './passport-voucher.entity';
import { PassportRequestEntity } from '../../passport-requests/entities/passport-request.entity';
import { PassportEntity } from '../../passports/entities/passport.entity';

@Entity('passport_voucher_items')
export class PassportVoucherItemEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'voucher_id', type: 'uniqueidentifier' })
    voucherId: string;

    @ManyToOne(() => PassportVoucherEntity, (voucher) => voucher.items)
    @JoinColumn({ name: 'voucher_id' })
    voucher: PassportVoucherEntity;

    @Column({ name: 'request_id', type: 'nvarchar', length: 100, nullable: true })
    requestId: string | null;

    @ManyToOne(() => PassportRequestEntity)
    @JoinColumn({ name: 'request_id' })
    request: PassportRequestEntity;

    @Column({ name: 'passport_id', type: 'nvarchar', length: 100, nullable: true })
    passportId: string | null;

    @ManyToOne(() => PassportEntity)
    @JoinColumn({ name: 'passport_id' })
    passport: PassportEntity;

    @Column({ name: 'full_name', type: 'nvarchar', length: 255, nullable: true })
    fullName: string | null;

    @Column({ name: 'passport_number', type: 'nvarchar', length: 20, nullable: true })
    passportNumber: string | null;

    @Column({ name: 'passport_type', type: 'nvarchar', length: 50, nullable: true })
    passportType: string | null;

    @Column({ name: 'expiry_date', type: 'date', nullable: true })
    expiryDate: Date | null;

    @Column({ name: 'item_condition', type: 'nvarchar', length: 'max', nullable: true })
    itemCondition: string | null;

    @Column({ name: 'note', type: 'nvarchar', length: 255, nullable: true })
    note: string | null;
}
