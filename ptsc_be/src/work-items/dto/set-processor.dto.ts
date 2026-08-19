import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator';

export class SetProcessItemDto {
    @ApiProperty({ description: 'Action code (e.g., TRINH_LD, TRA_LAI)', required: true })
    @IsString()
    actionCode: string;

    @ApiProperty({ description: 'User ID performing the action', required: true })
    @IsString()
    userId: string;

    @ApiProperty({ description: 'Content of employee in work', required: false })
    @IsString()
    @IsOptional()
    note?: string;

    @ApiProperty({ description: 'List of document IDs', required: true, type: [String] })
    @IsString({ each: true })
    @IsNotEmpty()
    docIds: string;

    @ApiProperty({ description: 'List of document IDs', required: true, type: [String] })
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty()
    processId: string;

    @ApiProperty({ description: 'Role of target', required: false, type: String })
    @IsString({ each: true })
    targetRole: string;

    @ApiProperty({ description: 'AssignToUserId of target user', required: false, type: String })
    @IsString({ each: true })
    @IsOptional()
    assignToUserId: string;

    @ApiProperty({ description: 'Recall type for incoming document recall options', required: false, type: String })
    @IsString()
    @IsOptional()
    recallType?: string;

    @ApiProperty({ description: 'Recall option for incoming document recall options', required: false, type: String })
    @IsString()
    @IsOptional()
    recallOption?: string;
}
