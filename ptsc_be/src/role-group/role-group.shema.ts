import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RoleFunction, RoleFunctionSchema } from '../role/role.shema'; // Đường dẫn đúng
export type RoleGroupDocument = RoleGroup & Document;
@Schema({ timestamps: true })
export class RoleGroup extends Document {
  @Prop({ required: true })
  clientId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  entityType: string;

  @Prop({ type: [RoleFunctionSchema], default: [] })
  roles: RoleFunction[];

  @Prop({ default: false })
  applyToModule: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const RoleGroupSchema = SchemaFactory.createForClass(RoleGroup);
