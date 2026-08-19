import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OutMobilePushNotifyDto {
    @ApiProperty({
        description: 'Push token cần cập nhật trạng thái sử dụng',
    })
    @IsString()
    @IsNotEmpty()
    pushToken: string;

    @ApiPropertyOptional({
        description: 'Trạng thái sử dụng push token. true: đang dùng, false: không dùng',
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    inUse?: boolean;
}
