import { PartialType } from '@nestjs/swagger';
import { CreateTaskDelegationDto } from './create-task-delegation.dto';

export class UpdateTaskDelegationDto extends PartialType(CreateTaskDelegationDto) {}
