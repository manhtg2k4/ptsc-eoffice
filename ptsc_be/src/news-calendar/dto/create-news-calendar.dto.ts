import { IsString, IsNotEmpty, IsOptional, IsDateString, IsInt, MaxLength, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNewsCalendarDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    title: string;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    type?: string;

    @IsDateString()
    @IsNotEmpty()
    startTime: string | Date;

    @IsDateString()
    @IsOptional()
    endTime?: string | Date;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    location?: string;

    @IsString()
    @IsOptional()
    participants?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsInt()
    @IsOptional()
    status?: number;

    @ApiProperty({
        description: 'Đánh dấu sự kiện quan trọng (true: Có, false: Không)',
        example: false,
        required: false,
        default: false
    })
    @IsBoolean()
    @IsOptional()
    isImportant?: boolean;
}
