import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FileRecordStatus } from '../entities/file-record.entity';

export class CreateFileRecordDto {
    @ApiProperty({ example: 'HSCNTT0012/CNTT', description: 'File number/symbol' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    fileSymbol: string;

    @ApiProperty({ example: 'Hồ sơ dự án Nâng cấp Hạ tầng Mạng...', description: 'Title of the file' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    title: string;

    @ApiProperty({ example: 'uuid-string', description: 'Year Category ID' })
    @IsNotEmpty()
    @IsString()
    yearCategoryId: string;

    @ApiProperty({ example: 'uuid-string', description: 'Folder Detail ID (Level 1 parent)', required: false })
    @IsOptional()
    @IsString()
    folderDetailId?: string;

    @ApiProperty({ enum: FileRecordStatus, required: false, default: FileRecordStatus.NOT_OPEN })
    @IsOptional()
    @IsEnum(FileRecordStatus)
    status?: FileRecordStatus;
}
