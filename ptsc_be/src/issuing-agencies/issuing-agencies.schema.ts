import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { STATUS } from '../variables/CONST_STATUS';

export type IssuingAgencyDocument = IssuingAgency & Document;

@Schema({
  timestamps: true,
  collection: 'issuing_agencies', // Tên collection trong MongoDB
})
export class IssuingAgency {
  @Prop({ required: false, unique: true, trim: true })
  code: string;

  @Prop({ required: false, trim: true })
  name: string;

  @Prop({ required: false, trim: true })
  address: string;

  @Prop({ required: false, trim: true })
  phone: string;

  @Prop({ required: false, trim: true, lowercase: true })
  email: string;

  @Prop({ required: false, trim: true })
  description: string;

  @Prop({ default: STATUS.ACTIVED })
  status: number;

  @Prop({ required: false })
  createdBy: string;

  @Prop({ required: false })
  updatedBy: string;
}

export const IssuingAgencySchema = SchemaFactory.createForClass(IssuingAgency);