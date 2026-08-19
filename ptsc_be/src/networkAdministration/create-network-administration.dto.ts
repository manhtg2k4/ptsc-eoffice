import { IsIP, IsNotEmpty, IsString } from 'class-validator';

export class CreateNetworkAdministrationDto {
  @IsIP()
  @IsNotEmpty()
  ip: string;

  @IsString()
  @IsNotEmpty()
  type: string;
}