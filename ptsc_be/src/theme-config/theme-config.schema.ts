import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ThemeConfigDocument = ThemeConfig & Document;

@Schema({ timestamps: true, collection: 'theme_configs' })
export class ThemeConfig {
  @Prop({ type: String, unique: true, default: 'main_theme' })
  configKey: string; // Khóa duy nhất để đảm bảo chỉ có một tài liệu cấu hình

  @Prop({ type: Object, required: true, default: { mode: 'light' } })
  options: Record<string, any>; // Lưu trữ đối tượng cấu hình
}

export const ThemeConfigSchema = SchemaFactory.createForClass(ThemeConfig);