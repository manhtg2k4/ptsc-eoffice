import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserColumnConfigDocument = UserColumnConfig & Document;

@Schema({ _id: false }) // Không tạo _id cho sub-document
class ColumnConfig {
  @Prop({ required: true })
  row: string; // Định danh duy nhất cho cột, ví dụ: 'code', 'name'

  @Prop({ required: true })
  name: string; // Nhãn hiển thị của cột, ví dụ: 'Mã vai trò'

  @Prop({ required: true, type: Boolean })
  visible: boolean; // Cột có được hiển thị hay không

  @Prop({ required: false })
  width?: string;
}

@Schema({ timestamps: true })
export class UserColumnConfig {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true }) // Giả sử bạn có model User
  userId: Types.ObjectId;

  @Prop({ required: true })
  codeModule: string; // Ví dụ: 'list-role', 'user-management'

  @Prop({ type: [ColumnConfig], required: true })
  columns: ColumnConfig[]; // Mảng các cột đã được sắp xếp theo thứ tự
}

export const UserColumnConfigSchema = SchemaFactory.createForClass(UserColumnConfig);

UserColumnConfigSchema.index({ userId: 1, codeModule: 1 }, { unique: true });