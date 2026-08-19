import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  conversationId: string;

  // FE đang gửi sendId
  @IsString()
  sendId: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsArray()
  data?: {
    attachFile: string;
    name: string;
    size: number;
    type: string;
  }[];

  // JSON tự do
  @IsOptional() replyTo?: any;
  @IsOptional() mentions?: any[];
  @IsOptional() reactions?: any;
  @IsOptional() status?: any;
  @IsOptional() linkContent?: any;

  @IsNumber()
  type: number; // 0=text,1=image,2=video,3=file,4=sticker,5=link
}
