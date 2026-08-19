import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Type } from 'class-transformer';

@Schema()
export class Method {
  @Prop({ required: true })
  name: string; // GET, POST, etc.

  @Prop({ default: false })
  allow: boolean;
}

export const MethodSchema = SchemaFactory.createForClass(Method);

@Schema()
export class RoleFunction {
  @Prop({ required: true })
  titleFunction: string;

  @Prop({ required: true })
  codeModuleFunction: string;

  @Prop({ required: true })
  clientId: string;

  @Prop({ type: [MethodSchema], default: [] })
  @Type(() => Method)
  methods: Method[];
}

export const RoleFunctionSchema = SchemaFactory.createForClass(RoleFunction);

@Schema({ timestamps: true })
export class Role extends Document {
  @Prop({ required: true })
  clientId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop()
  description?: string;

  @Prop({ type: [RoleFunctionSchema], default: [] })
  @Type(() => RoleFunction)
  roles: RoleFunction[];

  createdAt: Date;
  updatedAt: Date;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
