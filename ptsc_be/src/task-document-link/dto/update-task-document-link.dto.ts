// src/task-document-link/dto/update-task-document-link.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateTaskDocumentLinkDto } from './create-task-document-link.dto';

export class UpdateTaskDocumentLinkDto extends PartialType(CreateTaskDocumentLinkDto) {}
