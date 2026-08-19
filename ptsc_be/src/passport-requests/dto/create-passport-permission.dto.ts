import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePassportPermissionDto {
	@IsOptional()
	@IsString()
	code?: string;

	// --- Phạm vi ---
	@IsOptional()
	@IsString()
	passportBorrowScope?: string;

	// --- Người được cấp quyền mượn hộ chiếu ---
	@IsOptional()
	@IsString()
	authPersonsPassport?: string;

	@IsOptional()
	officerList?: Array<{
		userId?: string;
		fullName: string;
		passportId?: string;
		passportNumber?: string;
		passportType?: string;
		position?: string;
		rank?: string;
		unit?: string;
		cbType?: string;
		expiryDate?: string;
	}>;
}
