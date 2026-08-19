import { IsNotEmpty, IsOptional, IsString, IsInt, IsArray } from 'class-validator';

export class CreateIncomingDelegationDto {
	// --- Thông tin chung đoàn vào ---
	@IsNotEmpty({ message: 'Tên đoàn không được để trống' })
	@IsString()
	nameDelegation: string;

	@IsOptional()
	@IsString()
	delegationLeader?: string;

	@IsOptional()
	@IsInt()
	numberOfMembers?: number;

	@IsNotEmpty({ message: 'Ngày đến không được để trống' })
	@IsString()
	incomingDate: string;

	@IsOptional()
	@IsString()
	outgoingDate?: string;

	// --- Chi tiết buổi làm việc ---
	@IsOptional()
	@IsString()
	receivedGifts?: string;

	@IsOptional()
	@IsString()
	partnerGifts?: string;

	@IsOptional()
	@IsString()
	meetingContent?: string;

	@IsOptional()
	@IsString()
	note?: string;

	@IsOptional()
	@IsString()
	originType?: string; // TRONG_NUOC / NUOC_NGOAI

	@IsOptional()
	nationalities?: any; // Mảng mã quốc tịch hoặc chuỗi JSON/string

	@IsOptional()
	nationality?: any; // Mã quốc tịch đơn (nếu FE truyền nationality thay vì nationalities)

	// --- Danh sách thành viên tiếp đón (Lưu vào bảng phụ) ---
	@IsOptional()
	@IsArray()
	listOfReceptionMembers?: Array<{
		id?: string;
		userId?: string;
		fullName: string;
		passportId?: string;
		passportNumber?: string;
		passportType?: string;
		identityCard?: string;
		position?: string;
		rank?: string;
		unit?: string;
		cbType?: string;
		expiryDate?: string;
		role?: string;
		nationality?: any;
	}>;
}
