import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { STATUS } from 'src/variables/CONST_STATUS';

export type GroupUserDocument = GroupUser & Document;

@Schema({ timestamps: true })
export class GroupUser {
  @Prop({ required: true })
  name: string; // Tên đơn vị

  @Prop({ required: true, unique: true })
  code: string; // Mã đơn vị

  @Prop({ required: false })
  type?: string; // Loại đơn vị

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  UserId?: Types.ObjectId[];

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'OrganizationUnit' }],
    default: [],
  })
  organizationUnits?: Types.ObjectId[];
  @Prop({ type: Number, required: false, default: STATUS.ACTIVED }) // Mặc định là ACTIVED (1)
  status?: number;

  @Prop({ required: false })
  description?: string; // Mô tả

  // @Prop({ type: [String], default: [] })
  // permissions?: string[]; // Danh sách quyền
     
  @Prop({ type: Types.ObjectId, ref: 'MenuManager', default: null }) // Đơn vị cha
  permissions?: Types.ObjectId;

  @Prop({ type: String, required: false })
  roleType?: string; // 'fixed' or 'dynamic'

  @Prop({ type: [String], default: [] })
  roles?: string[]; // Mảng các ID của vai trò
}

export const GroupUserSchema = SchemaFactory.createForClass(GroupUser);

// Nếu muốn name là unique
GroupUserSchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { status: STATUS.ACTIVED } },
);
