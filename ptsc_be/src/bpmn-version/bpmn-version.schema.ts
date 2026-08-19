import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BpmnDesignVersionDocument = BpmnDesignVersion & Document;

@Schema({ timestamps: true })
export class BpmnDesignVersion {
  @Prop()
  base64File?: string;
  
  @Prop()
  version?: number;

  @Prop()
  processKey?: string;

  @Prop()
  id?: string;

}
export const BpmnDesignVersionSchema = SchemaFactory.createForClass(BpmnDesignVersion);