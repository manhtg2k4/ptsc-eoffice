import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateKeycloakGroupMappingDto {
  @ApiProperty({ description: 'Mã nhóm trong ứng dụng' })
  @IsString()
  @IsNotEmpty()
  groupCode: string;

  @ApiProperty({ description: 'Realm Role từ Keycloak', required: false })
  @IsString()
  @IsOptional()
  realmRole?: string;

  @ApiProperty({ description: 'Client Role từ Keycloak', required: false })
  @IsString()
  @IsOptional()
  clientRole?: string;
}

export class SaveBatchGroupMappingDto {
  @ApiProperty({ type: [CreateKeycloakGroupMappingDto], description: 'Danh sách các mapping cần lưu' })
  mappings: CreateKeycloakGroupMappingDto[];
}
