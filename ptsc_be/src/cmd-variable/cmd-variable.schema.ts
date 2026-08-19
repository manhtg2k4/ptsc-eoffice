import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type CamundaVariableDocument = CamundaVariable & Document;

@Schema({ timestamps: true })
export class CamundaVariable extends Document {
  @Prop({ required: true })
  processKey: string; // processKey hoặc processId để truy vết

  @Prop({ type: String })
  processInstanceId: string;

  @Prop({ type: Object, required: true })
  variables: Record<string, { value: any; type: string }>;
}

export const CamundaVariableSchema = SchemaFactory.createForClass(CamundaVariable);
