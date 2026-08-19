import { PartialType } from '@nestjs/swagger';
import { CreateTaskAssignmentConfigDto } from './create-task-assignment-config.dto';

export class UpdateTaskAssignmentConfigDto extends PartialType(CreateTaskAssignmentConfigDto) {}
