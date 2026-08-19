import { PartialType } from '@nestjs/mapped-types';
import { CreateNetworkAdministrationDto } from './create-network-administration.dto';

export class UpdateNetworkAdministrationDto extends PartialType(CreateNetworkAdministrationDto) {}
