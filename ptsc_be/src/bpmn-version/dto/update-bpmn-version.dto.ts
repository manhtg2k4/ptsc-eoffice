import { PartialType } from '@nestjs/swagger';
import { CreateBpmnVersionDto } from './create-bpmn-version.dto';

export class UpdateBpmnVersionDto extends PartialType(CreateBpmnVersionDto) {}
