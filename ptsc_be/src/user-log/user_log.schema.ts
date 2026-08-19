import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true }) // tự động thêm createdAt, updatedAt
export class UserLog extends Document {
  @Prop()
  ip: string;

  @Prop()
  userName: string;

  @Prop()
  department: string;

  @Prop()
  feature: string;

  @Prop()
  action: string;

  @Prop()
  status: string;
}

export const UserLogSchema = SchemaFactory.createForClass(UserLog);
