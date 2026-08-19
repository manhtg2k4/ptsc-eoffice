import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { PassportRequestEntity } from './passport-request.entity';

@Entity('passport_delegation_items')
export class PassportDelegationItemEntity {
    @PrimaryColumn({
        type: 'nvarchar',
        length: 100,
        name: 'id',
    })
    id: string;

    @Column({ name: 'request_id', type: 'nvarchar', length: 100 })
    requestId: string;

    @ManyToOne(() => PassportRequestEntity, (request) => request.delegationItems)
    @JoinColumn({ name: 'request_id' })
    request: PassportRequestEntity;

    @Column({ name: 'user_id', type: 'nvarchar', length: 100, nullable: true })
    userId: string | null;

    @Column({ name: 'full_name', type: 'nvarchar', length: 255 })
    fullName: string;

    @Column({ name: 'passport_id', type: 'nvarchar', length: 100, nullable: true })
    passportId: string | null;

    @Column({ name: 'passport_number', type: 'nvarchar', length: 20, nullable: true })
    passportNumber: string | null;

    @Column({ name: 'passport_type', type: 'nvarchar', length: 50, nullable: true })
    passportType: string | null;

    @Column({ name: 'position', type: 'nvarchar', length: 255, nullable: true })
    position: string | null;

    @Column({ name: 'rank', type: 'nvarchar', length: 255, nullable: true })
    rank: string | null;

    @Column({ name: 'unit', type: 'nvarchar', length: 255, nullable: true })
    unit: string | null;

    @Column({ name: 'cb_type', type: 'nvarchar', length: 100, nullable: true })
    cbType: string | null;

    @Column({ name: 'expiry_date', type: 'date', nullable: true })
    expiryDate: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
    updatedAt: Date;
}
