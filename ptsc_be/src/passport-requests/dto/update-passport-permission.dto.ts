import { PartialType } from '@nestjs/swagger';
import { CreatePassportPermissionDto } from './create-passport-permission.dto';

export class UpdatePassportPermissionDto extends PartialType(CreatePassportPermissionDto) {}
