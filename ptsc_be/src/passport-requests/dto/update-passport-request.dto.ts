import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePassportRequestDto {
    // Chỉ cho sửa khi status = 'Chờ phê duyệt'

    @IsOptional()
    @IsString()
    namePassportRequest?: string;

    // Cá nhân
    @IsOptional()
    @IsString()
    leader?: string; // User ID

    @IsOptional()
    @IsString()
    passportId?: string;

    @IsOptional()
    @IsString()
    passportNumber?: string;

    @IsOptional()
    @IsString()
    passportType?: string;

    @IsOptional()
    @IsString()
    reason?: string;

    // Thời gian
    @IsOptional()
    @IsString()
    borrowDate?: string;

    @IsOptional()
    @IsString()
    returnDate?: string;

    // Đoàn ra
    @IsOptional()
    @IsString()
    delegationLeader?: string;

    @IsOptional()
    @IsString()
    position?: string;

    @IsOptional()
    destination?: string | string[];

    @IsOptional()
    @IsString()
    destinationOther?: string;

    @IsOptional()
    @IsBoolean()
    isSpecificDepartureDate?: boolean;

    @IsOptional()
    @IsString()
    departureDate?: string;

    @IsOptional()
    @IsString()
    arrivalDate?: string;

    @IsOptional()
    @IsString()
    partner?: string;

  	@IsOptional()
  	@IsString()
  	typeOfFunding?: string;

    @IsOptional()
    @IsString()
    tripContent?: string;

    @IsOptional()
    @IsString()
    decision?: string;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsString()
    receivedGifts?: string;

    @IsOptional()
    @IsString()
    partnerGifts?: string;

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
}
