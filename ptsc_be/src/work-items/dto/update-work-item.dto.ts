import { PartialType } from '@nestjs/swagger';
import { CreateWorkItemDto } from './create-work-item.dto';

export class UpdateWorkItemDto extends PartialType(CreateWorkItemDto) { }

export class UpdateActionDto {
    userId: string;
    actionCode: string;
    assignments: {
        subActionCode: string;
        users: string[];
    }[];
}