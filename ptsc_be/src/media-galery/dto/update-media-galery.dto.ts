import { PartialType } from '@nestjs/swagger';
import { CreateMediaGaleryDto } from './create-media-galery.dto';

export class UpdateMediaGaleryDto extends PartialType(CreateMediaGaleryDto) {}
