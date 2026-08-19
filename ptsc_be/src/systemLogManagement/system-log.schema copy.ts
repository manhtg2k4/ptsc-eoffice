import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SystemLogDocument = SystemLog & Document;

@Schema({ timestamps: true, collection: 'systemlogs' })
export class SystemLog {
  @Prop()
  action: string;

  @Prop()
  details: string;

  @Prop()
  method: string;

  @Prop()
  status: string;

  @Prop()
  type: string;

  @Prop()
  subType: string;

  @Prop({ type: Object })
  userInfo: {
    fullName: string;
    userName: string;
    organization: string;
    ipAddress: string;
  };

  @Prop({ type: Date })
  timestamp: Date;
}

export const SystemLogSchema = SchemaFactory.createForClass(SystemLog);