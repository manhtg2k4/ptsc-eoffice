import { IsBoolean, IsString } from 'class-validator';

export class MethodDto {
  @IsString()
  name: string;

  @IsBoolean()
  allow: boolean;
}
