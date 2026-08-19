// src/conversations/dto/create-conversation.dto.ts
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ConversationType } from '../conversation.types';

export class CreateConversationDto {
  @IsString()
  userId: string;

  @IsEnum(ConversationType)
  type: ConversationType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  memberIds: string[];

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  backgroundImage?: string;
}