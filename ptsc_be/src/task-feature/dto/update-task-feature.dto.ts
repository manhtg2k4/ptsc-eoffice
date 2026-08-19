import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskFeatureDto } from './create-task-feature.dto';

export class UpdateTaskFeatureDto extends PartialType(CreateTaskFeatureDto) {}
