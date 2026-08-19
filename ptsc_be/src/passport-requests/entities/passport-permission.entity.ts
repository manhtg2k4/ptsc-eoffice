import {
	Entity,
	PrimaryColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn
} from 'typeorm';

@Entity('passport_permissions')
export class PassportPermissionEntity {
	@PrimaryColumn({
		type: 'nvarchar',
		length: 100,
		name: 'id',
	})
	id: string;

	@Column({ name: 'code', type: 'nvarchar', length: 50 })
	code: string;

	// --- Phạm vi ---
	@Column({ name: 'passport_borrow_scope', type: 'nvarchar', length: 50 })
	passportBorrowScope: string;

	@Column({ name: 'auth_persons_passport', type: 'nvarchar', length: 50 })
	authPersonsPassport: string;

	@Column({
		name: 'officer_list',
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
	officerList: any | null;

	@CreateDateColumn({ name: 'created_at', type: 'datetime2' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
	updatedAt: Date;
}
