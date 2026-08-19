import { PartialType } from '@nestjs/swagger';
import { CreateBookDocumentDto } from './create-book-document.dto';

export class UpdateBookDocumentDto extends PartialType(CreateBookDocumentDto) {}
