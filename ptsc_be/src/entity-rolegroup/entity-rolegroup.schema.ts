import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class EntityRoleGroup extends Document {
  @Prop({ required: true, index: true })
  unitId: string; // ID của đơn vị, nhóm, hoặc người dùng (e.g., "UNIT_A", "USER_123")

  @Prop({ required: true, enum: ['organization', 'group', 'user'] })
  entityType: string; // Loại thực thể: "organization", "group", "user"

  @Prop({ type: Types.ObjectId, ref: 'RoleGroup', required: true })
  roleGroupId: Types.ObjectId; // ID của role_group chứa quyền

  @Prop({ required: true })
  clientId: string; // Tenant ID (e.g., "DHVB_DEV")

  @Prop({ default: true })
  isActive: boolean; // Trạng thái hoạt động của ánh xạ
}

export const EntityRoleGroupSchema = SchemaFactory.createForClass(EntityRoleGroup);

// Tạo index để tối ưu truy vấn
EntityRoleGroupSchema.index({ unitId: 1, entityType: 1, clientId: 1 }, { unique: true });