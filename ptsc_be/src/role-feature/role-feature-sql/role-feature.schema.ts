import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RoleFeatureDocument = RoleFeature & Document;

@Schema({ _id: false })
class Role {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  roleCode: string;

  @Prop([String])
  permissions: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  users: Types.ObjectId[];
}

const RoleSchema = SchemaFactory.createForClass(Role);

@Schema({ timestamps: true, collection: 'rolefeatures' })
export class RoleFeature {
  @Prop({ required: true, unique: true, index: true })
  processKey: string;

  @Prop({ type: [RoleSchema], default: [] })
  roles: Role[];

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const RoleFeatureSchema = SchemaFactory.createForClass(RoleFeature);

