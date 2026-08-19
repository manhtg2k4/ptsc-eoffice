import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { PassportReturnRequestEntity } from './passport-return-request.entity';
import { PassportEntity } from '../../passports/entities/passport.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity('passport_return_request_items')
export class PassportReturnRequestItemEntity {
    @PrimaryColumn({
        type: 'nvarchar',
        length: 100,
        default: () => `'${uuidv4()}'`,
        name: 'id',
    })
    id: string;

    @Column({ name: 'return_request_id', type: 'nvarchar', length: 100 })
    returnRequestId: string;

    @ManyToOne(() => PassportReturnRequestEntity, (req) => req.items, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'return_request_id' })
    returnRequest: PassportReturnRequestEntity;

    @Column({ name: 'passport_id', type: 'nvarchar', length: 100 })
    passportId: string;

    @ManyToOne(() => PassportEntity, { nullable: true })
    @JoinColumn({ name: 'passport_id' })
    passport: PassportEntity;

    @Column({ name: 'passport_number', type: 'nvarchar', length: 50, nullable: true })
    passportNumber: string | null;

    @Column({ name: 'passport_type', type: 'nvarchar', length: 50, nullable: true })
    passportType: string | null;

    @Column({ name: 'full_name', type: 'nvarchar', length: 255, nullable: true })
    fullName: string | null;

    @Column({ name: 'issue_date', type: 'date', nullable: true })
    issueDate: Date | null;

    @Column({ name: 'expiry_date', type: 'date', nullable: true })
    expiryDate: Date | null;

    @Column({ name: 'issue_place', type: 'nvarchar', length: 255, nullable: true })
    issuePlace: string | null;

    @Column({ name: 'usage_status', type: 'nvarchar', length: 50, nullable: true })
    usageStatus: string | null;

    @Column({ name: 'eoffice_account', type: 'nvarchar', length: 100, nullable: true })
    eofficeAccount: string | null;

    @Column({ name: 'note', type: 'nvarchar', length: 'MAX', nullable: true })
    note: string | null;
}
