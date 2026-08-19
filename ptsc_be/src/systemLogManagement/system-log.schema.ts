import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SystemLogDocument = SystemLog & Document;

// @Schema({ _id: false }) // _id: false để không tạo _id cho sub-document
// class UserInfo {
//   @Prop({ required: true })
//   fullName: string;

//   @Prop({ required: true })
//   userName: string;

//   @Prop()
//   organization: string;

//   @Prop({ required: true })
//   ipAddress: string;
// }

// const UserInfoSchema = SchemaFactory.createForClass(UserInfo);

@Schema({
  timestamps: true, // Tự động thêm createdAt và updatedAt
  collection: 'system_logs', // Tên của collection trong MongoDB
})
export class SystemLog {
  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  details: string;

  @Prop({ required: true })
  method: string;

  @Prop({ required: true })
  status: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  subType: string;

  // @Prop({ type: UserInfoSchema, required: true })
  // userInfo: UserInfo;

  @Prop({ required: true })
  userInfo: string;
  
  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true })
  timestamp: Date;
}

export const SystemLogSchema = SchemaFactory.createForClass(SystemLog);