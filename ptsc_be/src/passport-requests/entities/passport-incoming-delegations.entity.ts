import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { PassportIncomingDelegationItemEntity } from "./passport-incoming-delegation-item.entity";

@Entity('passport_incoming_delegations')
export class PassportIncomingDelegationsEntity {
	@PrimaryColumn({
		type: 'nvarchar',
		length: 100,
		name: 'id',
	})
	id: string;

	//Tên đoàn
	@Column({ name: 'name_delegation', type: 'nvarchar', length: 255 })
	nameDelegation: string;

	//Trưởng đoàn (Lưu ID nhưng Map ra Object User)
	@Column({ name: 'delegation_leader', type: 'nvarchar', length: 255, nullable: true })
	delegationLeader: string | null;

	//Số lượng thành viên
	@Column({ name: 'number_of_members', type: 'int', nullable: true })
	numberOfMembers: number | null;

	//Ngày đến
	@Column({ name: 'incoming_date', type: 'date' })
	incomingDate: Date;

	//Ngày về
	@Column({ name: 'outgoing_date', type: 'date', nullable: true })
	outgoingDate: Date | null;

	//Quà tặng của đối tác
	@Column({ name: 'received_gifts', type: 'nvarchar', length: 300, nullable: true })
	receivedGifts: string | null;

	//Quà TCT tặng đối tác
	@Column({ name: 'partner_gifts', type: 'nvarchar', length: 300, nullable: true })
	partnerGifts: string | null;

	//Nội dung buổi làm việc
	@Column({ name: 'meeting_content', type: 'nvarchar', length: 300, nullable: true })
	meetingContent: string | null;

	//Ghi chú
	@Column({ name: 'note', type: 'nvarchar', length: 300, nullable: true })
	note: string | null;

	//Loại nguồn gốc đoàn: TRONG_NUOC / NUOC_NGOAI
	@Column({ name: 'origin_type', type: 'nvarchar', length: 50, nullable: true })
	originType: string | null;

	//Danh sách quốc tịch (khi chọn NUOC_NGOAI)
	@Column({ name: 'nationalities', type: 'nvarchar', length: 500, nullable: true })
	nationalities: string | null;

	//Thành viên tham gia buổi tiếp đón (Lưu vào bảng phụ)
	@OneToMany(() => PassportIncomingDelegationItemEntity, (item) => item.request, {
		cascade: true,
	})
	listOfReceptionMembers: PassportIncomingDelegationItemEntity[];

	// --- Audit ---
	@Column({ name: 'status', type: 'int', default: 1 })
	status: number;

	@Column({ name: 'created_by', type: 'nvarchar', length: 100, nullable: true })
	createdBy: string | null;

	@CreateDateColumn({ name: 'created_at', type: 'datetime2' })
	createdAt: Date;

	@Column({ name: 'updated_by', type: 'nvarchar', length: 100, nullable: true })
	updatedBy: string | null;

	@UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
	updatedAt: Date;
}