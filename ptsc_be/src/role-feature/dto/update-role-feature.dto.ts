import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleFeatureDto } from './create-role-feature.dto';

export class UpdateRoleFeatureDto extends PartialType(CreateRoleFeatureDto) {}
