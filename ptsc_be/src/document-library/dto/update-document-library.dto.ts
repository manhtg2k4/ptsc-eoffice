import { PartialType } from '@nestjs/swagger';
import { CreateDocumentLibraryDto } from './create-document-library.dto';

export class UpdateDocumentLibraryDto extends PartialType(CreateDocumentLibraryDto) {}
