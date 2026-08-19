import { PartialType } from '@nestjs/mapped-types';
import { CreateAuthConfigDto } from './create-auth-config.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateAuthConfigDto extends PartialType(CreateAuthConfigDto) {
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
