import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator';

export class SetProcessorsItemDto {
    @ApiProperty({ description: 'Action code (e.g., TRINH_KY, TRINH_LD)', required: true })
    @IsString()
    actionCode: string;

    @ApiProperty({ description: 'User ID performing the action', required: true })
    @IsString()
    userId: string;

    @ApiProperty({ description: 'Content of employee in work', required: false })
    @IsString()
    @IsOptional()
    note?: string;

    @ApiProperty({ description: 'Document ID', required: true })
    @IsString()
    @IsNotEmpty()
    docIds: string;

    @ApiProperty({ description: 'Role of target', required: false })
    @IsString()
    @IsOptional()
    targetRole?: string;

    @ApiProperty({ description: 'List of assignees', required: true, type: [String] })
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty()
    assignToUserId: string[];

    @ApiProperty({ description: 'Display name of actor', required: false })
    @IsString()
    @IsOptional()
    displayName?: string;
}
