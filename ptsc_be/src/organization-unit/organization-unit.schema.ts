import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { STATUS } from '../variables/CONST_STATUS';
export type OrganizationUnitDocument = OrganizationUnit & Document;

@Schema({ timestamps: true })
export class OrganizationUnit {
  @Prop({ required: true })
  name: string; // Tên đơn vị

  @Prop({ required: true, unique: true })
  code: string; // Mã đơn vị

  @Prop({ default: null})
  type: string; // Loại đơn vị

  @Prop({ default: null})
  phoneNumber?: string; // Số điện thoại đơn vị

  @Prop({ default: null})
  email?: string; // Email liên hệ

  @Prop({ default: null})
  leader?: string; // Lãnh đạo đơn vị

  @Prop({ default: null})
  position?: string; // Chức vụ lãnh đạo

  @Prop({ default: null})
  address?: string; // Địa chỉ đơn vị

  @Prop({ default: null})
  description?: string; // Mô tả về đơn vị

  @Prop({ default: null})
  permissions?: string; // Phân quyền

  @Prop({ type: Number,default: null })
  order?: number; // Thứ tự sắp xếp

  @Prop({ type: Types.ObjectId, ref: 'OrganizationUnit',default: null }) // Đơn vị cha
  parent?: Types.ObjectId; // Đơn vị cha (có thể là null nếu đây là đơn vị cấp cao nhất)
  @Prop({ type: Number, required: false, default: STATUS.ACTIVED }) // Mặc định là ACTIVED (1)
  status?: number;
  @Prop({ type: String, default: '' }) // Thêm trường path
  path?: string; // Đường dẫn phân cấp, ví dụ: "root_id/parent_id/current_id"
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] }) // Định nghĩa managers
  managers?: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'GroupUser' }], default: [] })
  groupUsers?: Types.ObjectId[]; // Mảng tham chiếu đến GroupUser
}

export const OrganizationSchema = SchemaFactory.createForClass(OrganizationUnit);

 // Thêm partial index cho trường code
 OrganizationSchema.index(
  { code: 1 }, // Index trên trường code
  {unique : true, partialFilterExpression: { status: STATUS.DELETED } }, // Chỉ áp dụng unique cho status = 1
);