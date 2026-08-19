import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
// import { isValidName, hasVietnameseDiacritics } from '../utils/util';
import { STATUS } from 'src/variables/CONST_STATUS';

export type BpmnDesignDocument = BpmnDesign & Document;

@Schema({ timestamps: true })
export class BpmnDesign {
  @Prop()
  id: string;

  @Prop()
  name: string;

  @Prop()
  description: string;


  @Prop()
  hasStartForm?: boolean;

  @Prop()
  startFormId?: string;


  @Prop({
    type: [
      {
        id: { type: String, required: true },
        label: { type: String, required: true },
        type: {
          type: String,
          enum: ['string', 'text', 'number', 'date', 'boolean', 'enum', 'long'],
          required: true,
        },
        defaultValue: { type: String || Number || Date, required: false }, // Optional defaultValue
      },
    ],
    default: [],
  })
  fields: {
    id: string;
    label: string;
    type: 'string' | 'text' | 'number' | 'date' | 'boolean' | 'enum' | 'long';
    defaultValue?: string | number | Date;
  }[];

  @Prop({ type: Number, required: false, default: STATUS.ACTIVED })
  status?: number;

  @Prop()
  base64File?: string;

  @Prop()
  processKey?: string;

  @Prop()
  processInstanceDefinitionKey?: string

  @Prop()
  processDeploymentId?: string

  @Prop({ type: [String] })
  unit?: string[];
  
  @Prop({ type: [String] })
  relatedProcesses?: string[];

  @Prop()
  processSelect?: string

  @Prop()
  documentType?: string;
}

export const BpmnDesignSchema = SchemaFactory.createForClass(BpmnDesign);
