// src/task-feature/dto/create-task-feature.dto.ts
// src/task-feature/dto/create-task-feature.dto.ts
export class CreateTaskFeatureDto {
  processId: string;
  tasks: {
    taskId: string;
    taskName: string;
    feature: { code: string };
  }[];
}

// src/task-feature/dto/update-task-feature.dto.ts
import { PartialType } from '@nestjs/mapped-types';

export class UpdateTaskFeatureDto extends PartialType(CreateTaskFeatureDto) {}
