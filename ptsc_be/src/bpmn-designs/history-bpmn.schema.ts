import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HistoryBpmnDocument = HistoryBpmn & Document;

@Schema({ timestamps: true })
export class HistoryBpmn {
  @Prop({ required: true })
  processInstanceId: string;
//  @Prop({ required: true })
  processDefinitionId: string;
  @Prop({ required: true })
  taskId: string;

  @Prop()
  taskName: string;

  @Prop()
  assignee: string;
 @Prop()
  assigneeName: string;
   @Prop()
  senderName: string;
   @Prop()
  sender: string;

  @Prop({ type: Object })
  variablesSubmitted: Record<string, any>;

  @Prop()
  completedAt: Date;
}

export const HistoryBpmnSchema = SchemaFactory.createForClass(HistoryBpmn);
