import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export const OUTGOING_DRAFT_SIGNER_TYPES = [
  'reportSigner',
  'signContentDraft',
  'signFormatDraft',
  'officialSigner1',
  'officialSigner2',
  'officialSigner3',
  'paraphSigner',
  'confirmer',
  'appraiser',
  'signStamp',
] as const;

export const EXECUTION_MODE = [
  'SEQUENTIAL',
  'PARALLEL'
] as const;

export type OutgoingDraftSignerType = typeof OUTGOING_DRAFT_SIGNER_TYPES[number];

export type OutgoingExecutionMode = typeof EXECUTION_MODE[number];

export class DraftSignerEntryDto {
  @ApiProperty({ enum: OUTGOING_DRAFT_SIGNER_TYPES })
  @IsString()
  @IsIn(OUTGOING_DRAFT_SIGNER_TYPES)
  signerType: OutgoingDraftSignerType;

  @ApiProperty({ type: [String], description: 'Danh sach user id theo thu tu ky' })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}

export class UpdateDraftSignersDto {
  @ApiPropertyOptional({ enum: OUTGOING_DRAFT_SIGNER_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(OUTGOING_DRAFT_SIGNER_TYPES)
  signerType?: OutgoingDraftSignerType;

  @ApiPropertyOptional({ enum: EXECUTION_MODE })
  @IsOptional()
  @IsString()
  @IsIn(EXECUTION_MODE)
  executionMode?: OutgoingExecutionMode;


  @ApiPropertyOptional({ type: [String], description: 'Danh sach user id theo thu tu ky' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @ApiPropertyOptional({ type: [DraftSignerEntryDto], description: 'Cap nhat nhieu loai nguoi ky trong mot request' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DraftSignerEntryDto)
  signers?: DraftSignerEntryDto[];
}
