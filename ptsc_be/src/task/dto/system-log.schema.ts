import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type SystemLogDocument = SystemLogTask & Document;

@Schema({
  timestamps: true, // Tự động thêm createdAt và updatedAt
  collection: 'system_logs', // Tên của collection trong MongoDB
})
export class SystemLogTask {
  @Prop({ required: true })
  actions: string;

  @Prop({ required: true })
  details: string;

  @Prop({ required: true })
  userInfo: string;

  @Prop({ required: true })
  timestamps: Date;

  @Prop({ required: true })
  taskId: string;

}

export const SystemLogTaskSchema = SchemaFactory.createForClass(SystemLogTask);