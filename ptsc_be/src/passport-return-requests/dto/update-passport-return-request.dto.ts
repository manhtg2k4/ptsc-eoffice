import { PartialType } from '@nestjs/swagger';
import { CreatePassportReturnRequestDto } from './create-passport-return-request.dto';

export class UpdatePassportReturnRequestDto extends PartialType(CreatePassportReturnRequestDto) {}
