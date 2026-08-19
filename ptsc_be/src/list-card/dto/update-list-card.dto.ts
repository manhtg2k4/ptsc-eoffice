import { PartialType } from '@nestjs/swagger';
import { CreateListCardDto } from './create-list-card.dto';

export class UpdateListCardDto extends PartialType(CreateListCardDto) {}
