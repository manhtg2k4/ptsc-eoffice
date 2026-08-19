import { PartialType } from '@nestjs/mapped-types';
import { CreateIncomingDelegationDto } from './create-incoming-delegation.dto';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateIncomingDelegationDto extends PartialType(CreateIncomingDelegationDto) {
    @IsOptional()
    @IsInt()
    status?: number;
}
