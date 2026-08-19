// src/crm-sources/schemas/crm-sources.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Sub-document: các item trong mảng data (ví dụ: Chưa xử lý, Đang xử lý, Hoàn thành)
@Schema({ _id: false }) // không tạo _id riêng cho từng item
export class DataItem extends Document {
    @Prop({ required: true, trim: true })
    title: string;

    @Prop({ required: true, unique: true, trim: true })
    value: string;
}

@Schema({
    timestamps: true,
    collection: 'crmsources', // ĐÚNG TÊN COLLECTION TRONG DB
    versionKey: '__v',
})
export class CrmSource extends Document {
    @Prop({ required: true, unique: true, trim: true })
    code: string;

    @Prop({ required: true, trim: true })
    title: string;

    @Prop({ trim: true })
    originalName?: string;

    @Prop({ default: false })
    canDragDrop: boolean;

    @Prop({ default: false })
    canDelete: boolean;

    @Prop({ trim: true })
    status?: number;

    @Prop({ trim: true })
    state?: string;

    // Mảng các trạng thái (Chưa xử lý, Đang xử lý, Hoàn thành...)
    @Prop({ type: [DataItem], default: [] })
    data: DataItem[];

    // Quan hệ với collection ExtraField (nếu dùng sau này)
    @Prop({ type: [Types.ObjectId], ref: 'ExtraField', default: [] })
    extraFields: Types.ObjectId[];

    // Dữ liệu gốc (giữ nguyên từ hệ thống cũ)
    @Prop({ type: [Object], default: [] })
    originalData: any[];

    // Soft delete
    @Prop({ default: false })
    isDeleted: boolean = false;

    @Prop()
    deletedAt?: Date;
}

export const CrmSourceSchema = SchemaFactory.createForClass(CrmSource);

// ==================== INDEXES - TỐI ƯU TÌM KIẾM & QUERY XÓA MỀM ====================
CrmSourceSchema.index({ isDeleted: 1 }); // cho query chỉ lấy bản ghi chưa xóa
CrmSourceSchema.index({ code: 1, isDeleted: 1 }, { unique: true }); // unique chỉ áp dụng cho bản ghi chưa xóa
CrmSourceSchema.index({ createdAt: -1 });
CrmSourceSchema.index({ title: 'text' }); // nếu muốn search theo title

// // Optional: tự động set deletedAt khi isDeleted = true
// CrmSourceSchema.pre('findOneAndUpdate', function () {
//     if (this.getUpdate()?.$set?.isDeleted === true && !this.getUpdate()?.$set?.deletedAt) {
//         this.set({ deletedAt: new Date() });
//     }
// });