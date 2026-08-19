// src/comments/schemas/comment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {
    @Prop({ required: true })
    documentId: string;

    @Prop({ required: true })
    userId: string;

    @Prop({ required: true })
    userName: string;

    @Prop({ required: true })
    content: string;

    @Prop()
    parentId?: string;
    @Prop({ default: false })
    isEdited: boolean;

    @Prop({ default: null })
    editedAt?: Date;

}

export const CommentSchema = SchemaFactory.createForClass(Comment);
