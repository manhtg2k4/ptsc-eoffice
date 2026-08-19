import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class DynamicForm extends Document {
  @Prop()
  name: string;

  @Prop()
  created: Date;

  @Prop({default: '1'})
  status: string;

  @Prop()
  file: string;

  @Prop()
  feature: string;

  @Prop({ unique: true, required: true })
  code: string;

  @Prop({ type: String })
  processID?: string;

  @Prop({ type: String })
  fileName?: string;
}

export const DynamicFormSchema = SchemaFactory.createForClass(DynamicForm);
