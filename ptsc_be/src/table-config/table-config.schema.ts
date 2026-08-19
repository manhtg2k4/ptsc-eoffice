import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false, versionKey: false })
class Column {}

@Schema({
  timestamps: true,
  collection: 'table_configs',
})
export class TableConfig extends Document {
  @Prop({ required: true, index: true })
  owner: string; // To store userId

  @Prop({ required: true, index: true })
  module: string;

  @Prop({ type: [Object] })
  columns: Column[];
}

export const TableConfigSchema = SchemaFactory.createForClass(TableConfig);

TableConfigSchema.index({ owner: 1, module: 1 }, { unique: true });