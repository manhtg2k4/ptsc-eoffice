import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuthorityDocumentType = AuthorityDocument & Document;

@Schema({ timestamps: true })
export class AuthorityDocument {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId; // ID người ủy quyền

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorized: Types.ObjectId; // ID người được ủy quyền

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop()
  originalEndDate?: Date;

  @Prop({ default: 0 })
  stage: number; // 0: hết hạn, 1: active, 2: kết thúc

  @Prop({ default: 1 })
  status: number; // 1: active, 3: deleted

  @Prop({
    type: [String],
    default: [],
  })
  files?: string[];
}

export const AuthoritySchema = SchemaFactory.createForClass(AuthorityDocument);
