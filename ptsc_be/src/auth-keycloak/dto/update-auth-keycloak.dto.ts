import { PartialType } from '@nestjs/mapped-types';
import { CreateAuthKeycloakDto } from './create-auth-keycloak.dto';

export class UpdateAuthKeycloakDto extends PartialType(CreateAuthKeycloakDto) {}
