import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model, Query, UpdateWriteOpResult } from 'mongoose';
import { STATUS } from '../variables/CONST_STATUS';
import {
  validateUniqueFields,
  validateUniqueBeforeUpdate,
} from '../utils/util';

export type CommonSourceDocument = CommonSource & Document;

@Schema({ timestamps: true, collection: 'commonsources' })
export class CommonSource {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, default: false })
  canDragDrop: boolean;

  @Prop({ required: true })
  type: string;

  @Prop({
    type: [
      {
        title: { type: String, required: true },
        value: { type: String, required: true },
        index: { type: Number, required: false },
        extraValue: { type: Object, default: {} },
      },
    ],
    default: [],
  })
  data: { title: string; value: string }[];

  @Prop({ default: STATUS.ACTIVED })
  status: number;
}

export const CommonSourceSchema = SchemaFactory.createForClass(CommonSource);