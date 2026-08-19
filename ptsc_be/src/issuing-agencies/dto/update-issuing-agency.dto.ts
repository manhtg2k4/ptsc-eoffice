import { PartialType } from '@nestjs/mapped-types';
import { CreateIssuingAgencyDto } from './create-issuing-agency.dto';

export class UpdateIssuingAgencyDto extends PartialType(
  CreateIssuingAgencyDto,
) {}