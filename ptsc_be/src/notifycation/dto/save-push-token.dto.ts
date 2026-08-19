import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SavePushTokenDto {
    @IsString()
    @IsNotEmpty()
    pushToken: string;

    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    token?: string;
}
