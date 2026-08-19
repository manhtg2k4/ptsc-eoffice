import { IsOptional, IsString, MaxLength, IsDateString } from 'class-validator';

export class UpdatePassportDto {
  @IsOptional()
  @IsString()
  passportType?: string;
  @IsOptional()
  @IsString()
  passportNumber?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày cấp phải có định dạng YYYY-MM-DD' })
  issueDate?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Ngày hết hiệu lực phải có định dạng YYYY-MM-DD' },
  )
  expiryDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuePlace?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  countriesVisited?: string;

  @IsOptional()
  scanFile?: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  placeOfBirth?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
