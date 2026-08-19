// src/role-feature/entities/role-feature.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RoleFeatureDocument = RoleFeature & Document;

@Schema({ timestamps: true })
export class RoleFeature {
  @Prop({ name: 'process_key', required: true })
  processKey: string;   // ví dụ: "MY_PROCESS_KEY"

  @Prop({
    type: [
      {
        name: { type: String, required: true },       // Tên vai trò
        roleCode: { type: String, required: true },   // Mã vai trò
        permissions: { type: [String], default: [] }, // Danh sách quyền
        usersId: { type: [String], default: [] }, // Danh sách người dùng liên kết với vai trò
        users: [{ type: Types.ObjectId, ref: 'User' }],//Id nguoi dung ,
      },
    ],
    default: [],
  })
  roles: {
    name: string;
    roleCode: string;
    permissions: string[];
    usersId: string[]; // client gửi string ObjectId
    users: string[];
  }[];
}

export const RoleFeatureSchema = SchemaFactory.createForClass(RoleFeature);
