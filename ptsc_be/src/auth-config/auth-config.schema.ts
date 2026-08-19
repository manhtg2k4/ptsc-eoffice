import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type AuthConfigDocument = AuthConfig & Document;

@Schema({ timestamps: true })
export class AuthConfig {
    @Prop({
        type: String,
        required: true,
        // enum: ['local', 'ldap', 'saml', 'oauth2', 'cas'],
        // unique: true,//
    })
    authType: string;

    @Prop({ type: mongoose.Schema.Types.Mixed, default: {} })
    config: Record<string, any>;

    @Prop({ type: Boolean, default: false })
    isActive: boolean;

    @Prop({ type: Number, enum: [1, 3], default: 1 })
    status: number;
}

export const AuthConfigSchema = SchemaFactory.createForClass(AuthConfig);