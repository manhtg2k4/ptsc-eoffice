// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { STATUS } from '../variables/CONST_STATUS';
// import { Types, Schema as MongooseSchema } from 'mongoose'; // <-- thêm Schema ở đây
// import {
//   validateUniqueBeforeUpdate,
//   validateUniqueFields,
// } from 'src/utils/util';
// import { Document, Model, Query, UpdateWriteOpResult } from 'mongoose';
// import { User } from 'src/user/user.schema';

// export type FeatureManagementDocument = FeatureManagement & Document;
// export class CriteriaItem {
//   @Prop({ required: true })
//   name: string;

//   @Prop({ required: true })
//   operator: string;

//   @Prop({ required: true })
//   value: string;

//   @Prop()
//   processId?: string;
// }
// @Schema({ timestamps: true })
// export class FeatureManagement {
//   @Prop({
//     required: [true, 'Mã chức năng là bắt buộc!'],
//     trim: true,
//     minlength: [3, 'Mã chức năng phải có ít nhất 3 ký tự!'],
//   })
//   code: string;
//   @Prop()
//   formCode: string;

// @Prop({ type: [User] })
// executor: User[];


//   @Prop()
//   isFollowAssignee: boolean;

//   @Prop()
//   isAuthorized: boolean;

//   @Prop()
//   isCount: boolean;

//   @Prop()
//   authorizedFunction: string;

//   @Prop({
//     trim: true,
//   })
//   name: string;

//   @Prop({ type: [CriteriaItem] })
//   criteria: CriteriaItem[];

//   @Prop({
//     type: Types.ObjectId,
//     ref: 'FeatureManagement',
//   })
//   parentId?: Types.ObjectId;

//   @Prop({
//     trim: true,
//   })
//   url: string;


//   @Prop({
//     trim: true,
//   })
//   apiUrl: string;

//   @Prop()
//   processID: string;

//   @Prop({
//     required: true,
//     enum: ['0', '1'],
//     default: '1',
//   })
//   statusFeature: string;

//   @Prop({
//     trim: true,
//   })
//   description?: string;

//   @Prop({ type: MongooseSchema.Types.Mixed })
//   fields?: Record<string, any>;

//   @Prop({ type: Object })
//   valueField?: Record<string, any>;

//   @Prop()
//   createdBy: string;

//   @Prop()
//   updatedBy: string;

//   // @Prop()
//   // featureType: string;
//   @Prop({
//   type: String,
//   enum: ['list', 'form', 'popup', 'fullList', 'completeList', 'automatic'],
//   default: 'list',
// })
// featureType: string;

//   @Prop()
//   processId: string;

//   @Prop({ default: STATUS.ACTIVED })
//   status: number;
// }

// export const FeatureManagementSchema =
//   SchemaFactory.createForClass(FeatureManagement);

// FeatureManagementSchema.pre<FeatureManagementDocument>(
//   'save',
//   async function (next) {
//     try {
//       await validateUniqueFields(
//         this,
//         this.constructor as Model<FeatureManagementDocument>,
//         ['code'],
//       );
//       next();
//     } catch (error) {
//       next(error);
//     }
//   },
// );

// FeatureManagementSchema.pre<
//   Query<UpdateWriteOpResult, FeatureManagementDocument>
// >('findOneAndUpdate', async function (next) {
//   try {
//     await validateUniqueBeforeUpdate(
//       this.model as unknown as Model<FeatureManagementDocument>,
//       this.getQuery(),
//       this.getUpdate() as Partial<FeatureManagementDocument>,
//       ['code'],
//       next,
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// FeatureManagementSchema.pre<FeatureManagementDocument>(
//   'save',
//   async function (next) {
//     try {
//       await validateUniqueFields(
//         this,
//         this.constructor as Model<FeatureManagementDocument>,
//         ['url'],
//       );
//       next();
//     } catch (error) {
//       next(error);
//     }
//   },
// );

// FeatureManagementSchema.pre<
//   Query<UpdateWriteOpResult, FeatureManagementDocument>
// >('findOneAndUpdate', async function (next) {
//   try {
//     await validateUniqueBeforeUpdate(
//       this.model as unknown as Model<FeatureManagementDocument>,
//       this.getQuery(),
//       this.getUpdate() as Partial<FeatureManagementDocument>,
//       ['url'],
//       next,
//     );
//   } catch (error) {
//     next(error);
//   }
// });
