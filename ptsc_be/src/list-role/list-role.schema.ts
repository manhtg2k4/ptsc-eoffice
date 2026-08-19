import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { STATUS } from 'src/variables/CONST_STATUS';
export type listRoleDocument = listRole & Document;

@Schema({ _id: false })
class RolePermission {
  @Prop({ type: Types.ObjectId, ref: 'MenuManager', required: true })
  functionName: Types.ObjectId;

  @Prop({ type: [String], required: true, default: [] })
  permissions: string[];
}

const RolePermissionSchema = SchemaFactory.createForClass(RolePermission);
@Schema({ timestamps: true })
export class listRole {
  @Prop({ required: true, unique: true })
  code: string; // Mã vai trò

  @Prop({ required: true })
  name: string; // Tên vai trò

  @Prop({ required: false })
  describe?: string; // Mô tả

  @Prop({
    type: [RolePermissionSchema],
    required: false,
    default: [],
  })
  roles?: RolePermission[];
  @Prop({ type: Number, required: false, default: STATUS.ACTIVED }) // Mặc định là ACTIVED (1)
  status?: number;
}

export const listRoleSchema = SchemaFactory.createForClass(listRole);

// Nếu muốn name là unique
listRoleSchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { status: STATUS.ACTIVED } },
);
listRoleSchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { status: STATUS.ACTIVED } },
);
