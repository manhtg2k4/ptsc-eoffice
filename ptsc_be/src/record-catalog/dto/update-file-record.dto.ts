import { PartialType } from '@nestjs/mapped-types';
import { CreateFileRecordDto } from './create-file-record.dto';

export class UpdateFileRecordDto extends PartialType(CreateFileRecordDto) { }
