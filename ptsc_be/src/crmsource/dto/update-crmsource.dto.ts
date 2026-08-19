import { PartialType } from '@nestjs/swagger';
import { CreateCrmsourceDto } from './create-crmsource.dto';

export class UpdateCrmsourceDto extends PartialType(CreateCrmsourceDto) {}
