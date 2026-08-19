import { PartialType } from '@nestjs/swagger';
import { CreateVehicleRegistrationDto } from './create-vehicle-registration.dto';

export class UpdateVehicleRegistrationDto extends PartialType(CreateVehicleRegistrationDto) {}
