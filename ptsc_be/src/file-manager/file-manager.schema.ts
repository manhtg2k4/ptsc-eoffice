import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { STATUS } from '../variables/CONST_STATUS';

export type fileManagerDocument = fileManager & Document;

export enum FileStatus {
  INACTIVE = STATUS.NOT_ACTIVED,
  ACTIVE = STATUS.ACTIVED,
  ARCHIVED = STATUS.LOCKED,
  DELETED = STATUS.DELETED,
}

@Schema({ timestamps: true, collection: 'fileManager' })
export class fileManager {
  @Prop()
  name: string; // Tên của file hoặc thư mục.

  @Prop()
  nameRoot: string; //  Tên gốc của file

  @Prop({ default: '' })
  username: string;

  @Prop()
  path: string; // Đường dẫn tương đối

  @Prop()
  realPath: string; // Đường dẫn thực

  @Prop()
  fullPath: string; // Đường dẫn đầy đủ

  @Prop()
  clientId: string; // clientId

  @Prop()
  realName: string; // Tên thực của file.

  @Prop()
  parentPath: string; // Đường dẫn của thư mục cha chứa file/thư mục này.

  @Prop()
  mimetype: string; //  Loại MIME của file

  @Prop({ default: '' })
  description: string; // Mô tả về file

  @Prop({ type: Types.ObjectId })
  mid: Types.ObjectId; // ID của một đối tượng liên quan

  @Prop()
  size: number; // Kích thước file

  @Prop()
  birthtime: Date; // Thời điểm file được tạo

  @Prop({ default: false })
  isFile: boolean; // Cho biết đây là file hay thư mục.

  @Prop()
  type: string; // Loại file (ví dụ: pdf, docx, folder).

  @Prop()
  createdBy: string;
  @Prop()
  updatedBy: string;
  @Prop({ default: FileStatus.ACTIVE, enum: FileStatus })
  status: number;


  @Prop()
  statusExcel: string;
  @Prop()
  originalName: string;

  @Prop([
      {
        path: { type: String, required: false },
        fileId: { type: String, required: true },
        name: { type: String, required: true },
      },
    ])
    attachedFiles: {
      path?: string; 
      fileId: string;
      name: string;
      _id?: mongoose.Types.ObjectId;
    }[];
  
    @Prop()
    rows: any[];  
  
    @Prop() tab: string;
    @Prop() entityType: string;
  
  
    @Prop() implementer: string;
  
    @Prop() implementationDate: Date;

    @Prop({ type: Boolean, default: false })
    isSigned: boolean; // Cho biết file đã được ký hay chưa

    @Prop()
    profileid: string;
}

export const fileManagerSchema = SchemaFactory.createForClass(fileManager);
