import { PartialType } from '@nestjs/swagger';
import { CreateListDriverDto } from './create-list-driver.dto';

export class UpdateListDriverDto extends PartialType(CreateListDriverDto) {}
