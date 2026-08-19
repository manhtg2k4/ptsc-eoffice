import { PartialType } from '@nestjs/mapped-types';
import { CreateRecordDocumentDto } from './create-record-document.dto';

export class UpdateRecordDocumentDto extends PartialType(CreateRecordDocumentDto) { }
