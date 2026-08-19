// src/work-items/dto/process-work-item.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsArray } from 'class-validator';

export class ProcessWorkItemDto {
    @ApiProperty({ description: 'Action code (e.g., TRINH_LD, TRA_LAI)', required: true })
    @IsString()
    actionCode: string;

    @ApiProperty({ description: 'User ID performing the action', required: true })
    @IsString()
    userId: string;

    @ApiProperty({ description: 'Display name of the user', required: true })
    @IsString()
    displayName: string;

    @ApiProperty({ description: 'ID of the user to assign the next task to', required: false })
    @IsString()
    @IsOptional()
    assignToUserId?: string;

    @ApiProperty({ description: 'Additional data for inclusive gateways or other logic', required: false })
    @IsObject()
    @IsOptional()
    selections?: any[];

    @ApiProperty({ description: 'Additional data for inclusive gateways or other logic', required: false })
    @IsArray()
    @IsOptional()
    assignments?: any[];

    @ApiProperty({ description: 'Deadline of employee in work', required: false })
    @IsString()
    @IsOptional()
    deadline?: string;

    @ApiProperty({ description: 'Content of emloyee in work', required: false })
    @IsString()
    @IsOptional()
    note?: string;


    @ApiProperty({ description: 'roles of employee in work', required: false })
    @IsString()
    @IsOptional()
    roles?: string;


    // Thêm các thuộc tính khác nếu cần
}
export class ProcessWorkItemDtoDraft {
    @ApiProperty({ description: 'Action code (e.g., TRINH_LD, TRA_LAI)', required: true })
    @IsString()
    actionCode?: string;

    @ApiProperty({ description: 'User ID performing the action', required: true })
    @IsString()
    userId: string;

    @ApiProperty({ description: 'Display name of the user', required: true })
    @IsString()
    displayName: string;

    @ApiProperty({ description: 'ID of the user to assign the next task to', required: false })
    @IsOptional()
    @IsString()
    assignToUserId?: string;

    @ApiProperty({ description: 'Additional data for inclusive gateways or other logic', required: false })
    @IsObject()
    @IsOptional()
    selections?: any[];

    @ApiProperty({ description: 'Additional data for inclusive gateways or other logic', required: false })
    @IsArray()
    @IsOptional()
    assignments?: any[];

    @ApiProperty({ description: 'Deadline of employee in work', required: false })
    @IsString()
    @IsOptional()
    deadline?: string;

    @ApiProperty({ description: 'Content of emloyee in work', required: false })
    @IsString()
    @IsOptional()
    note?: string;


    @ApiProperty({ description: 'roles of employee in work', required: false })
    @IsString()
    @IsOptional()
    roles?: string;


    // Thêm các thuộc tính khác nếu cần
}
export class ProcessWorkItemTransferDto {
    @ApiProperty({ description: 'Action code (e.g., TRINH_LD, TRA_LAI)', required: true })
    @IsString()
    actionCode: string;

    @ApiProperty({ description: 'User ID performing the action', required: true })
    @IsString()
    userId: string;

    @ApiProperty({ description: 'Display name of the user', required: true })
    @IsString()
    displayName: string;

    @ApiProperty({ description: 'ID of the user to assign the next task to', required: false })
    @IsArray()
    @IsOptional()
    assignToUserId?: string[];

    @ApiProperty({ description: 'Additional data for inclusive gateways or other logic', required: false })
    @IsObject()
    @IsOptional()
    selections?: any[];

    @ApiProperty({ description: 'Additional data for inclusive gateways or other logic', required: false })
    @IsArray()
    @IsOptional()
    assignments?: any[];

    @ApiProperty({ description: 'Deadline of employee in work', required: false })
    @IsString()
    @IsOptional()
    deadline?: string;

    @ApiProperty({ description: 'Content of emloyee in work', required: false })
    @IsString()
    @IsOptional()
    note?: string;


    @ApiProperty({ description: 'roles of employee in work', required: false })
    @IsString()
    @IsOptional()
    roles?: string;


    // Thêm các thuộc tính khác nếu cần
}