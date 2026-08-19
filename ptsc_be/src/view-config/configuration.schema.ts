import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type ConfigurationDocument = HydratedDocument<Configuration>;

@Schema({ timestamps: true })
export class Configuration {
    @Prop({ type: String, required: true })
    code: string;

    @Prop({ type: String })
    name?: string;

    @Prop({ type: String })
    processID?: string;

    @Prop({ type: [{ type: mongoose.Schema.Types.Mixed }] }) // Mảng các object với dữ liệu bất kỳ
    field: any[];

    @Prop({ type: Number, enum: [0, 1, 2, 3], default: 1 })
    status: 0 | 1 | 2 | 3;

    @Prop({ type: String, enum: ['form', 'attribute', 'listTable', 'form-handled', 'attribute-handled', 'table-handled'] })
    type?: string;

    @Prop({ type: String })
    note?: string;
       @Prop({ type: String })
    viewConfigId?: string;


}

export const ConfigurationSchema = SchemaFactory.createForClass(Configuration);