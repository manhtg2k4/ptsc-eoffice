import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteVehicleRegistrationDto {
  @ApiProperty({ type: [String], description: 'List of IDs to delete' })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  ids: string[];
}
