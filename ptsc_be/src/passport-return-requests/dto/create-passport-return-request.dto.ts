import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PassportReturnItemDto {
    @IsOptional()
    @IsString()
    id?: string;

    @IsNotEmpty()
    @IsString()
    passportId: string;

    @IsOptional()
    @IsString()
    passportNumber?: string;

    @IsOptional()
    @IsString()
    passportType?: string;

    @IsOptional()
    @IsString()
    fullName?: string;

    @IsOptional()
    @IsString()
    expiryDate?: string;

    @IsOptional()
    @IsString()
    issueDate?: string;

    @IsOptional()
    @IsString()
    issuePlace?: string;

    @IsOptional()
    @IsString()
    usageStatus?: string;

    @IsOptional()
    @IsString()
    eofficeAccount?: string;

    @IsOptional()
    @IsString()
    note?: string;
}

export class CreatePassportReturnRequestDto {
    @IsNotEmpty()
    @IsString()
    eofficeAccount: string;

    @IsOptional()
    @IsString()
    fullName?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    positionTitle?: string;

    @IsOptional()
    birthday?: string | Date;

    @IsOptional()
    @IsString()
    gender?: string;

    @IsOptional()
    @IsString()
    identificationCard?: string;

    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @IsOptional()
    @IsString()
    rank?: string;

    @IsOptional()
    @IsString()
    unitName?: string;

    @IsOptional()
    @IsString()
    departmentName?: string;

    @IsOptional()
    @IsString()
    divisionName?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    nationality?: string;

    @IsOptional()
    @IsString()
    countriesVisited?: string;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PassportReturnItemDto)
    passportListReturn?: PassportReturnItemDto[];
}
