import { Type } from 'class-transformer';
import { IsObject, IsString, ValidateNested, IsUrl, IsOptional } from 'class-validator';

class SsoConfigDto {
  @IsOptional()
  authUrl: string;

  @IsOptional()
  tokenUrl: string;

  @IsOptional()
  userInfoUrl: string;

  @IsOptional()
  logoutUrl: string;

  @IsString()
  clientId: string;

  @IsOptional()
  clientSecret: string;

  @IsOptional()
  redirectUri: string;

  @IsOptional()
  issuer: string;

  @IsString()
  scope: string;
}

export class TestSsoConnectionDto {
  @IsString()
  authType: string;

  @IsObject()
  @ValidateNested()
  @Type(() => SsoConfigDto)
  config: SsoConfigDto;
}