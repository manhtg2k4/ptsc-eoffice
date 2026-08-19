import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AgencyDocument = Agency & Document;

@Schema({
  timestamps: true, // Tự động thêm createdAt và updatedAt
  collection: 'agencies',
})
export class Agency {
  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  oldCode?: string;

  @Prop({ type: Number })
  industryType?: number;

  @Prop()
  email?: string;

  @Prop()
  phoneNumber?: string;

  @Prop()
  address?: string;

  @Prop()
  description?: string;

  @Prop({ type: Number })
  tranStatus?: number;

  @Prop({ type: Number })
  lgsp?: number;

  @Prop({ type: Number, default: 1 }) // 1: Active, 3: Deleted
  status: number;
}

export const AgencySchema = SchemaFactory.createForClass(Agency);