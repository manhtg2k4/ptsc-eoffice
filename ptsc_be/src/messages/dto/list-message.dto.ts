import { IsOptional, IsString } from 'class-validator';

export class ListMessageDto {
  @IsString()
  conversationId: string;

  @IsOptional()
  limit?: string;

  @IsOptional()
  before?: string; // ISO datetime
}
