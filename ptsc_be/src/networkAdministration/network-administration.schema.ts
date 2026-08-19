import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NetworkAdministrationDocument = NetworkAdministration & Document;

@Schema({
  timestamps: true, // Tự động thêm createdAt và updatedAt
})
export class NetworkAdministration {
  @Prop({ required: true, unique: true })
  ip: string;

  @Prop({ required: true })
  type: string;
  createdAt: Date;
}

export const NetworkAdministrationSchema = SchemaFactory.createForClass(
  NetworkAdministration,
);