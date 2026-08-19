import { PartialType } from '@nestjs/swagger';
import { CreateAlbumImageDto } from './create-album-image.dto';

export class UpdateAlbumImageDto extends PartialType(CreateAlbumImageDto) {}
