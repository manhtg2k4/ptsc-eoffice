import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class GetRolesDto {
  @ApiPropertyOptional({ description: 'Comma-separated list of roles.' })
  @IsOptional()
  @IsString()
  roles?: string;

  @ApiProperty({ description: 'ID of document', required: true })
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @ApiProperty({ description: 'ID of user', required: true })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Type of document', required: true })
  @IsString()
  documentType: string;

  @ApiPropertyOptional({ description: 'Check same of unit' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Priority for return user' })
  @IsOptional()
  priority?: boolean;
}
