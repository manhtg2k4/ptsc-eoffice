// src/chat/interfaces/message.interface.ts

export interface IAttachment {
  attachFile: string;
  name: string;
  size: number;
  type: string;
}

export interface IMessageSender {
  id: string;
  name: string;
  avatar: string;
}

export interface IMessageTime {
  sentAt: string;
}

export interface IMessageResponse {
  id: string;
  conversationId: string;
  content: string;
  type: number; // 0: text, 1: file/image
  data: IAttachment[] | null;
  caption: string | null;
  linkContent: string | null;
  mentions: string[] | null;
  reactions: any[] | null;
  replyTo: string | null;
  status: string | null;
  sender: IMessageSender;
  time: IMessageTime;
  createdAt: string;
  updatedAt: string;
  clientTempId?: string;
}

export interface ISendMessageDto {
  conversationId: string;
  senderId: string;
  content: string;
  type: number;
  data?: IAttachment[];
  clientTempId?: string;
  caption?: string;
  replyTo?: string;
  mentions?: string[];
}