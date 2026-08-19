import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    Index,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { PassportEntity } from '../../passports/entities/passport.entity';
import { PassportDelegationItemEntity } from './passport-delegation-item.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity('passport_borrow_requests')
@Index('UQ_created_by_client_request_id', ['createdBy', 'clientRequestId'], {
    unique: true,
    where: 'client_request_id IS NOT NULL',
})
export class PassportRequestEntity {
    @PrimaryColumn({
        type: 'nvarchar',
        length: 100,
        name: 'id',
    })
    id: string;

    @Column({ name: 'request_code', type: 'nvarchar', length: 50 })
    requestCode: string;

    @Column({ name: 'type_request', type: 'nvarchar', length: 20, default: 'user' })
    typeRequest: string;

    // --- Thông tin chung ---
    @Column({ name: 'requester_id', type: 'nvarchar', length: 100 })
    requesterId: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'requester_id' })
    requester: UserEntity;

    @Column({ name: 'name_passport_request', type: 'nvarchar', length: 255 })
    namePassportRequest: string;

    // --- Cá nhân ---
    @Column({ name: 'leader', type: 'nvarchar', length: 100, nullable: true })
    leader: string | null;

    @Column({ name: 'passport_id', type: 'nvarchar', length: 100, nullable: true })
    passportId: string | null;

    @ManyToOne(() => PassportEntity)
    @JoinColumn({ name: 'passport_id' })
    passport: PassportEntity;

    @Column({ name: 'passport_number', type: 'nvarchar', length: 20, nullable: true })
    passportNumber: string | null;

    @Column({ name: 'passport_type', type: 'nvarchar', length: 50, nullable: true })
    passportType: string | null;

    @Column({ name: 'reason', type: 'nvarchar', length: 500, nullable: true })
    reason: string | null;

    // --- Thời gian mượn/trả ---
    @Column({ name: 'borrow_date', type: 'date' })
    borrowDate: Date;

    @Column({ name: 'return_date', type: 'date', nullable: true })
    returnDate: Date | null;

    // --- Đoàn ra ---
    @Column({ name: 'delegation_leader', type: 'nvarchar', length: 255, nullable: true })
    delegationLeader: string | null;

    @Column({ name: 'position', type: 'nvarchar', length: 255, nullable: true })
    position: string | null;

    @Column({ name: 'destination', type: 'nvarchar', length: 300, nullable: true })
    destination: string | null;

    @Column({ name: 'destination_other', type: 'nvarchar', length: 300, nullable: true })
    destinationOther: string | null;

    @Column({ name: 'is_specific_departure_date', type: 'bit', default: false })
    isSpecificDepartureDate: boolean;

    @Column({ name: 'departure_date', type: 'datetime2', nullable: true })
    departureDate: Date | null;

    @Column({ name: 'arrival_date', type: 'datetime2', nullable: true })
    arrivalDate: Date | null;

    @Column({ name: 'partner', type: 'nvarchar', length: 255, nullable: true })
    partner: string | null;

  @Column({
    name: 'type_of_funding',
    type: 'nvarchar',
    length: 300,
    nullable: true,
  })
  typeOfFunding: string | null;

  @Column({
    name: 'trip_content',
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  tripContent: string | null;

    @Column({ name: 'decision', type: 'nvarchar', length: 255, nullable: true })
    decision: string | null;

    @Column({ name: 'note', type: 'nvarchar', length: 300, nullable: true })
    note: string | null;

    @Column({ name: 'received_gifts', type: 'nvarchar', length: 500, nullable: true })
    receivedGifts: string | null;

    @Column({ name: 'partner_gifts', type: 'nvarchar', length: 500, nullable: true })
    partnerGifts: string | null;

    @Column({
        name: 'passport_file',
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
    passportFile: any | null;

    @Column({
        name: 'list_of_organizations',
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
    listOfOrganizations: any | null;

    @OneToMany(() => PassportDelegationItemEntity, (item) => item.request)
    delegationItems: PassportDelegationItemEntity[];

    // --- Trạng thái & xử lý ---
    @Column({ name: 'status', type: 'nvarchar', length: 50, default: 'PENDING' })
    status: string;

    @Column({ name: 'handler_id', type: 'nvarchar', length: 100, nullable: true })
    handlerId: string | null;

    @Column({ name: 'reject_reason', type: 'nvarchar', length: 500, nullable: true })
    rejectReason: string | null;

    @Column({ name: 'approval_reason', type: 'nvarchar', length: 500, nullable: true })
    approvalReason: string | null;

    @Column({ name: 'cancel_reason', type: 'nvarchar', length: 500, nullable: true })
    cancelReason: string | null;

    @Column({ name: 'process_instance_id', type: 'nvarchar', length: 100, nullable: true })
    processInstanceId: string | null;

    @Column({ name: 'client_request_id', type: 'nvarchar', length: 100, nullable: true })
    clientRequestId: string | null;

    // --- Audit ---
    @Column({ name: 'is_deleted', type: 'bit', default: false })
    isDeleted: boolean;

    @Column({ name: 'created_by', type: 'nvarchar', length: 100, nullable: true })
    createdBy: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
    createdAt: Date;

    @Column({ name: 'updated_by', type: 'nvarchar', length: 100, nullable: true })
    updatedBy: string | null;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
    updatedAt: Date;
}
