import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreatePassportRequestDto {
    // Loại yêu cầu: 'user' (cá nhân) | 'organization' (đoàn ra)
    @IsNotEmpty({ message: 'Loại yêu cầu không được để trống' })
    @IsString()
    typeRequest: string;

    // --- Chung ---
    // FE gửi Borrower ID (VD: "BR002") hoặc tên đoàn
    @IsNotEmpty({ message: 'Tên người mượn/đoàn không được để trống' })
    @IsString()
    namePassportRequest: string;

    @IsOptional()
    borrowDate?: string;

    @IsOptional()
    returnDate?: string;

    // --- Cá nhân ---
    @IsOptional()
    leader?: string; // Leader ID (VD: "LD003")

    @IsOptional()
    passportId?: string; // Backend tự resolve từ passportNumber

    @IsOptional()
    passportNumber?: string; // FE gửi số HC (VD: "B16676028")

    @IsOptional()
    passportType?: string; // Backend tự resolve từ passportNumber

    @IsOptional()
    reason?: string;

    // --- Đoàn ra ---
    @IsOptional()
    delegationLeader?: string;

    @IsOptional()
    position?: string;

    @IsOptional()
    destination?: string | string[];

    @IsOptional()
    @IsString()
    destinationOther?: string;

    @IsOptional()
    isSpecificDepartureDate?: boolean;

    @IsOptional()
    departureDate?: string;

    @IsOptional()
    arrivalDate?: string;

    @IsOptional()
    partner?: string;

    @IsOptional()
    typeOfFunding?: string;

    @IsOptional()
    tripContent?: string;

    @IsOptional()
    decision?: string;

    @IsOptional()
    note?: string;

    @IsOptional()
    @IsString()
    receivedGifts?: string; // quà tặng từ đối tác

    @IsOptional()
    @IsString()
    partnerGifts?: string; // quà tặng từ TCT

    @IsOptional()
    passportFile?: Array<{
        fileName: string;
        fileUrl: string;
        fileSize?: number;
    }>;

    @IsOptional()
    listOfOrganizations?: Array<{
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

    @IsOptional()
    @IsString()
    clientRequestId?: string;
}
