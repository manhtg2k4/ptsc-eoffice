import { IsString } from 'class-validator';

export class SearchMessageDto {
  @IsString()
  conversationId: string;

  @IsString()
  q: string;
}
