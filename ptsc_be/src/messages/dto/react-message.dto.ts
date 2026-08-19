import { IsString } from 'class-validator';

export class ReactMessageDto {
  @IsString()
  messageId: string;

  @IsString()
  emoji: string;

  @IsString()
  userId: string;
}
