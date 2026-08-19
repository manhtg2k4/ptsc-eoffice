// src/users/dto/get-pending-items.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBooleanString } from 'class-validator';

export class GetPendingItemsDto {
    @ApiPropertyOptional({ description: 'Whether to include items claimable by the user\'s roles.' })
    @IsOptional()
    @IsBooleanString()
    includeUnassigned?: string;

    @ApiPropertyOptional({ description: 'Comma-separated list of roles.' })
    @IsOptional()
    @IsString()
    roles?: string;

    @ApiPropertyOptional({ description: 'Filter items by a specific BPMN node ID.' })
    @IsOptional()
    @IsString()
    nodeIdFilter?: string;
}
