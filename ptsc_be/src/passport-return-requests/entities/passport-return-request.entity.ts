import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { PassportReturnRequestItemEntity } from './passport-return-request-item.entity';
import { v4 as uuidv4 } from 'uuid';

export enum PassportReturnRequestStatus {
    DRAFT = 'DRAFT',              // Lưu nháp
    WAITING_SIGN = 'WAITING_SIGN',// Chờ ký nhận
    RETURNED = 'RETURNED',        // Đã trả
    REJECTED = 'REJECTED',        // Trả lại
    CANCELLED = 'CANCELLED',      // Hủy phiếu
}

export const PASSPORT_RETURN_STATUS_LABEL: Record<string, string> = {
    [PassportReturnRequestStatus.DRAFT]: 'Lưu nháp',
    [PassportReturnRequestStatus.WAITING_SIGN]: 'Chờ ký nhận',
    [PassportReturnRequestStatus.RETURNED]: 'Đã trả',
    [PassportReturnRequestStatus.REJECTED]: 'Trả lại',
    [PassportReturnRequestStatus.CANCELLED]: 'Hủy phiếu',
    // Fallback tương thích ngược mã cũ
    WAITING_OWNER_RECEIVE: 'Chờ ký nhận',
    WAITING_SIGN_VOUCHER: 'Chờ ký nhận',
    COMPLETED: 'Đã trả',
    RETURNED_EDIT: 'Trả lại',
};

export const PASSPORT_RETURN_STATUS_HTML_MAP: Record<string, string> = {
    [PassportReturnRequestStatus.DRAFT]:
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#F3F4F6;color:#374151;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #D1D5DB;">Lưu nháp</div>',

    [PassportReturnRequestStatus.WAITING_SIGN]:
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FEF3C7;color:#D97706;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #FCD34D;">Chờ ký nhận</div>',

    [PassportReturnRequestStatus.RETURNED]:
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#D0FFDE;color:#007222;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #6EB884;">Đã trả</div>',

    [PassportReturnRequestStatus.REJECTED]:
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FEE2E2;color:#DC2626;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #F87171;">Trả lại</div>',

    [PassportReturnRequestStatus.CANCELLED]:
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FEE2E2;color:#DC2626;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #F87171;">Hủy phiếu</div>',

    // Fallback tương thích ngược mã cũ
    WAITING_OWNER_RECEIVE:
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FEF3C7;color:#D97706;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #FCD34D;">Chờ ký nhận</div>',
    WAITING_SIGN_VOUCHER:
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FEF3C7;color:#D97706;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #FCD34D;">Chờ ký nhận</div>',
    COMPLETED:
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#D0FFDE;color:#007222;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #6EB884;">Đã trả</div>',
    RETURNED_EDIT:
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FEE2E2;color:#DC2626;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #F87171;">Trả lại</div>',
};

@Entity('passport_return_requests')
export class PassportReturnRequestEntity {
    @PrimaryColumn({
        type: 'nvarchar',
        length: 100,
        default: () => `'${uuidv4()}'`,
        name: 'id',
    })
    id: string;

    @Column({ name: 'request_code', type: 'nvarchar', length: 50, unique: true })
    requestCode: string;

    @Column({ name: 'eoffice_account', type: 'nvarchar', length: 100 })
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

    @Column({ name: 'countries_visited', type: 'nvarchar', length: 'MAX', nullable: true })
    countriesVisited: string | null;

    @Column({ name: 'note', type: 'nvarchar', length: 'MAX', nullable: true })
    note: string | null;

    // Trạng thái xóa mềm bản ghi: 1 = Hoạt động (chưa xóa), 3 = Đã xóa mềm
    @Column({ name: 'status', type: 'int', default: 1 })
    status: number;

    // Trạng thái quy trình: DRAFT (Lưu nháp), WAITING_SIGN (Chờ ký nhận), RETURNED (Đã trả), REJECTED (Trả lại)
    @Column({ name: 'process_status', type: 'nvarchar', length: 50, default: PassportReturnRequestStatus.DRAFT, nullable: true })
    processStatus: string | null;

    @Column({ name: 'current_handler_id', type: 'nvarchar', length: 100, nullable: true })
    currentHandlerId: string | null;

    @Column({ name: 'voucher_id', type: 'nvarchar', length: 100, nullable: true })
    voucherId: string | null;

    @Column({ name: 'bpmn_version', type: 'nvarchar', length: 100, nullable: true })
    bpmnVersion: string | null;

    @Column({ name: 'process_instance_id', type: 'nvarchar', length: 100, nullable: true })
    processInstanceId: string | null;

    @Column({ name: 'client_request_id', type: 'nvarchar', length: 100, nullable: true })
    clientRequestId: string | null;

    @OneToMany(() => PassportReturnRequestItemEntity, (item) => item.returnRequest, {
        cascade: true,
    })
    items: PassportReturnRequestItemEntity[];

    @Column({ name: 'created_by', type: 'nvarchar', length: 100, nullable: true })
    createdBy: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
    createdAt: Date;

    @Column({ name: 'updated_by', type: 'nvarchar', length: 100, nullable: true })
    updatedBy: string | null;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
    updatedAt: Date;

    @Column({ name: 'is_deleted', type: 'bit', default: false })
    isDeleted: boolean;
}
