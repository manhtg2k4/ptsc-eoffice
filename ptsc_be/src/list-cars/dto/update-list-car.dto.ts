import { PartialType } from '@nestjs/swagger';
import { CreateListCarDto } from './create-list-car.dto';

export class UpdateListCarDto extends PartialType(CreateListCarDto) {}
