import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendOtpDto {
    @ApiProperty({ description: 'Mã OTP' })
    @IsString()
    @IsNotEmpty()
    otp: string;

}
