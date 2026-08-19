import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({
  timestamps: true, // Tự động thêm createdAt và updatedAt
})
export class Notification {
  @Prop({ required: true })
  recipientId: string; // ID người nhận

  @Prop({ required: true })
  senderId: string; // ID người gửi (người thực hiện hành động)

  @Prop({ required: true })
  content: string;

  @Prop()
  link: string; // Đường dẫn khi click vào thông báo

  @Prop({ default: false })
  isRead: boolean; // Trạng thái đã đọc hay chưa

  @Prop({ required: true })
  key: string;

  @Prop()
  recordId: string; // ID của văn bản/đối tượng liên quan

  @Prop({ default: 1 })
  status: number;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 }); // Tối ưu query