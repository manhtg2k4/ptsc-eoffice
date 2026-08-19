import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity('passports')
export class PassportEntity {
    @PrimaryColumn({
        type: 'nvarchar',
        length: 100,
        default: () => `'${uuidv4()}'`,
        name: 'id',
    })
    id: string;

    @Column({ name: 'eoffice_account', type: 'nvarchar', length: 50 })
    eofficeAccount: string;

    @Column({ name: 'full_name', type: 'nvarchar', length: 255, nullable: true })
    fullName: string | null;

    @Column({ name: 'email', type: 'nvarchar', length: 255, nullable: true })
    email: string | null;

    @Column({ name: 'position_title', type: 'nvarchar', length: 255, nullable: true })
    positionTitle: string | null;

    @Column({ name: 'birthday', type: 'date', nullable: true })
    birthday: Date | null;

    @Column({ name: 'gender', type: 'nvarchar', length: 50, nullable: true })
    gender: string | null;

    @Column({ name: 'identification_card', type: 'nvarchar', length: 50, nullable: true })
    identificationCard: string | null;

    @Column({ name: 'phone_number', type: 'nvarchar', length: 50, nullable: true })
    phoneNumber: string | null;

    @Column({ name: 'rank', type: 'nvarchar', length: 255, nullable: true })
    rank: string | null;

    @Column({ name: 'unit_name', type: 'nvarchar', length: 255, nullable: true })
    unitName: string | null;

    @Column({ name: 'department_name', type: 'nvarchar', length: 255, nullable: true })
    departmentName: string | null;

    @Column({ name: 'division_name', type: 'nvarchar', length: 255, nullable: true })
    divisionName: string | null;

    @Column({ name: 'address', type: 'nvarchar', length: 255, nullable: true })
    address: string | null;

    @Column({ name: 'nationality', type: 'nvarchar', length: 255, nullable: true })
    nationality: string | null;

    @Column({ name: 'place_of_birth', type: 'nvarchar', length: 255, nullable: true })
    placeOfBirth: string | null;

    @Column({ name: 'note', type: 'nvarchar', length: 'MAX', nullable: true })
    note: string | null;

    @Column({ name: 'passport_number', type: 'nvarchar', length: 20 })
    passportNumber: string;

    @Column({ name: 'passport_type', type: 'nvarchar', length: 50 })
    passportType: string;

    @Column({ name: 'issue_date', type: 'date' })
    issueDate: Date;

    @Column({ name: 'expiry_date', type: 'date' })
    expiryDate: Date;

    @Column({ name: 'issue_place', type: 'nvarchar', length: 255, nullable: true })
    issuePlace: string | null;

    @Column({
        name: 'scan_file',
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
    scanFile: any | null;

    @Column({ name: 'countries_visited', type: 'nvarchar', length: 255, nullable: true })
    countriesVisited: string | null;

    @Column({ name: 'usage_status', type: 'nvarchar', length: 50, default: 'STORING' })
    usageStatus: string;

    @Column({ name: 'is_deleted', type: 'bit', default: false })
    isDeleted: boolean;

    @Column({ name: 'user_id', type: 'nvarchar', length: 100, nullable: true })
    userId: string | null;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    @Column({ name: 'created_by', type: 'nvarchar', length: 100, nullable: true })
    createdBy: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
    createdAt: Date;

    @Column({ name: 'updated_by', type: 'nvarchar', length: 100, nullable: true })
    updatedBy: string | null;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
    updatedAt: Date;
}
