import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomThemeDocument = CustomTheme & Document;

@Schema({ timestamps: true, collection: 'custom_themes' })
export class CustomTheme {
  @Prop({ type: String, required: true })
  name: string; // Tên cấu hình theme do người dùng đặt

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId; // ID của người dùng tạo cấu hình này

  @Prop({ type: Object, required: true, default: {} })
  options: Record<string, any>; // Lưu trữ đối tượng cấu hình theme tùy chỉnh

  @Prop({ type: Boolean, default: false })
  isDefault: boolean; // Cờ cho biết đây có phải là cấu hình mặc định của người dùng không

  @Prop({ type: Number, default: 1 }) // 1: active, 2: inactive, 3: deleted
  status: number;
}

export const CustomThemeSchema = SchemaFactory.createForClass(CustomTheme);