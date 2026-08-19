// // camunda-variable.service.ts
// import {
//   BadRequestException,
//   Body,
//   HttpException,
//   HttpStatus,
//   Injectable,
//   InternalServerErrorException,
//   NotFoundException,
// } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { CamundaVariable } from './cmd-variable.schema';
// import { firstValueFrom } from 'rxjs';
// import { HttpService } from '@nestjs/axios';
// import { DeleteResult } from 'mongodb';
// import * as cron from 'node-cron';
// import {
//   FeatureManagementEntity
// } from 'src/feature-management/feature-management.entity';
// import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';
// import * as moment from 'moment';
// import {
//   administrativeProcedureCategory,
//   administrativeProcedureCategoryDocument,
// } from 'src/administrative-procedure-category/administrative-procedure-category.schema';
// import { ExploitationHistoryService } from 'src/report-management/exploitation-history.service';
// // import { ExploitationHistoryService } from 'src/exploitation-history/exploitation-history.service';
// import axios from 'axios';

// import { Enterprise, EnterpriseDocument } from 'src/info-enterprise/info-enterprise.schema';
// import { ModelIntrospectService } from '../model-introspect/model-introspect.service';

// // import { fondsCatalog, fondsCatalogDocument } from 'src/fonds-catalog/fonds-catalog.schema';
// import { Citizen, CitizenDocument } from 'src/info-citizen/info-citizen.schema';
// import { administrativeProcedureFieldCategory, administrativeProcedureFieldCategoryDocument } from 'src/administrative-procedure-field-category/administrative-procedure-field-category.schema';
// import { fileManager, fileManagerDocument } from 'src/file-manager/file-manager.schema';
// import { CommonCategory, CommonCategoryDocument } from 'src/common-categories/common-categories.schema';

// import { ProfileManagement, ProfileManagementDocument } from 'src/profile-management/profile-management.schema';
// import { CollectionManagement, CollectionManagementDocument } from 'src/collection-management/collection-management.schema';
// import { User, UserDocument } from 'src/user/user.schema';
// import { OrganizationUnit, OrganizationUnitDocument } from 'src/organization-unit/organization-unit.schema';
// import { administrativeProcedureResultCategory, administrativeProcedureResultCategoryDocument } from 'src/administrative-procedure-result-category/administrative-procedure-result-category.schema';
// import { RoomInWarehouse, RoomInWarehouseDocument } from 'src/roomInWarehouse/roomInWarehouse.schema';
// import { ShelfManagement, ShelfManagementDocument } from 'src/shelf-management/shelf-management.schema';
// import { BoxManagement, BoxManagementDocument } from 'src/box-management/box-management.schema';
// import { Floor, FloorDocument } from 'src/shelf-management/floor.schema';
// import { Compartment } from 'src/shelf-management/box.schema';
// import { CompartmentDocument } from 'src/shelf-management/compartment.schema';
// import { Warehouse, WarehouseDocument } from 'src/warehouse/warehouse.schema';
// import { fondsCatalog, fondsCatalogDocument } from 'src/fonds-catalog/fonds-catalog.schema';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// @Injectable()
// export class CamundaVariableService {
//   constructor(
//     @InjectModel(CamundaVariable.name)
//     private readonly camundaVariableModel: Model<CamundaVariable>,
//     private readonly httpService: HttpService,
//     // @InjectModel(FeatureManagement.name)
//     // private featureManagementRepo: Model<FeatureManagementDocument>,
    
//     @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
//     private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
    
//     @InjectRepository(BpmnDesignEntity, 'mssqlConnection')
//     private readonly bpmnDesignModel: Repository<BpmnDesignEntity>,

//     @InjectModel(Citizen.name)
//     private infoCitizenModel: Model<CitizenDocument>,


//     @InjectModel(Enterprise.name)
//     private infoEnterpriseModel: Model<EnterpriseDocument>,

//     @InjectModel(administrativeProcedureCategory.name)
//     private administrativeProcedureCategoryModel: Model<administrativeProcedureCategoryDocument>,
//     @InjectModel(ProfileManagement.name)
//     private profileManagementModel: Model<ProfileManagementDocument>,
//     private readonly exploitationHistoryService: ExploitationHistoryService,
//     private readonly modelIntrospectService: ModelIntrospectService,

//     @InjectModel(fondsCatalog.name)
//     private fondsCatalogModel: Model<fondsCatalogDocument>,
//     @InjectModel(Citizen.name)
//     private citizenModel: Model<CitizenDocument>,
//     @InjectModel(administrativeProcedureFieldCategory.name)
//     private administrativeProcedureFieldCategoryModel: Model<administrativeProcedureFieldCategoryDocument>,
//     @InjectModel(fileManager.name)
//     private fileManagerModel: Model<fileManagerDocument>,
//     @InjectModel(CommonCategory.name)
//     private commonCategoryModel: Model<CommonCategoryDocument>,
//     @InjectModel(CollectionManagement.name)
//     private collectionManagementModel: Model<CollectionManagementDocument>,
//     @InjectModel(User.name)
//     private userModel: Model<UserDocument>,
//     @InjectModel(OrganizationUnit.name)
//     private organizationUnitModel: Model<OrganizationUnitDocument>,
//     @InjectModel(administrativeProcedureResultCategory.name)
//     private administrativeProcedureResultCategoryModel: Model<administrativeProcedureResultCategoryDocument>,
//     @InjectModel(RoomInWarehouse.name)
//     private roomInWarehouseModel: Model<RoomInWarehouseDocument>,
//     @InjectModel(ShelfManagement.name)
//     private shelfManagementModel: Model<ShelfManagementDocument>,
//     @InjectModel(BoxManagement.name)
//     private boxManagementModel: Model<BoxManagementDocument>,
//     @InjectModel(Floor.name)
//     private floorModel: Model<FloorDocument>,
//     @InjectModel(Compartment.name)
//     private compartmentModel: Model<CompartmentDocument>,
//     @InjectModel(Warehouse.name)
//     private readonly warehouseModel: Model<WarehouseDocument>,
//   ) { }

//   async saveVariables(processKey: string, variables: Record<string, any>) {
//     return await this.camundaVariableModel.create({
//       processKey,
//       variables,
//     });
//   }

//   async getVariablesList() {
//     return await this.camundaVariableModel
//       .find()
//       .sort({ createdAt: -1 })
//       .lean();
//   }
//   async getVariablesListDashboard() {
//     return await this.camundaVariableModel
//       .find()
//       .sort({ createdAt: -1 })
//       .lean();
//   }
//   async getVariablesListsDocument() {
//     return await this.camundaVariableModel
//       .find()
//       .sort({ createdAt: -1 })
//       .lean();
//   }
//   async getVariablesListClone() {
//     return await this.camundaVariableModel
//       .find()
//       .sort({ createdAt: -1 })
//       .lean();
//   }
//   async getVariablesListDocument() {
//     return await this.camundaVariableModel
//       .find()
//       .sort({ createdAt: -1 })
//       .lean();
//   }
//   async getVariablesLists() {
//     return await this.camundaVariableModel
//       .find()
//       .sort({ createdAt: -1 })
//       .lean();
//   }
//   async getVariablesList2() {
//     return await this.camundaVariableModel
//       .find()
//       .sort({ createdAt: -1 })
//       .lean();
//   }
//   async getVariablesListKqgq() {
//     return await this.camundaVariableModel
//       .find()
//       .sort({ createdAt: -1 })
//       .lean();
//   }
//   async getVariableById(id: string) {
//     return this.camundaVariableModel.findById(id).lean();
//   }

//   // async updateVariable(processInstanceId: string, variables: Record<string, any>) {
//   //   return this.camundaVariableModel
//   //     .updateVariableByProcessFn({ processInstanceId, variables }, { new: true })
//   //     .lean();
//   // }
//   // camunda-variable.service.ts
//   async updateVariableByProcessFn(
//     processInstanceId: string,
//     variables: Record<string, any>,
//   ) {
//     if (!processInstanceId) {
//       throw new BadRequestException('processInstanceId is required');
//     }

//     const entries = Object.entries(variables);

//     // update song song cho nhanh
//     await Promise.all(
//       entries.map(([varName, val]) => {
//         // Nếu FE gửi { value, type, valueInfo? }
//         const payload =
//           val && typeof val === 'object' && 'value' in val
//             ? {
//               value: val.value,
//               type: val.type ?? this.detectCamundaType(val.value),
//               ...(val.valueInfo ? { valueInfo: val.valueInfo } : {}),
//             }
//             : {
//               // Nếu FE gửi giá trị thô: { code: '12', name: 'abc' }
//               value: val,
//               type: this.detectCamundaType(val),
//             };
//         return firstValueFrom(
//           this.httpService.put(
//             `${process.env.CAMUNDA_MEDIUM}/process-instance/${processInstanceId}/variables/${encodeURIComponent(
//               varName,
//             )}`,
//             payload,
//           ),
//         );
//       }),
//     );

//     try {
//       const profileData: Partial<ProfileManagement> = {
//         // code: ``,
//         // name: '',
//         // code: `HS-${Date.now()}`,
//         // name: 'Hồ sơ mới (chưa có tên)',
//         // fonds: new Types.ObjectId('6667d5479302483867a72b1a'),
//         // typeProcedure: new Types.ObjectId('6667d5479302483867a72b1a'),
//         // completionDate: new Date(),
//         // submissionDate: new Date(),
//       };

//       if (variables) {
//         for (const key in variables) {
//           if (variables[key] && typeof variables[key] === 'object' && 'value' in variables[key]) {
//             // Ghi đè giá trị mặc định nếu có trong body
//             profileData[key] = variables[key].value || profileData[key];
//           }
//         }
//       }

//       console.log('profileData', profileData)

//       const a = await this.profileManagementModel.findOne({ processInstanceId: processInstanceId });
//       console.log('a', a)
//       // update bẻn ghi
//       await this.profileManagementModel.updateOne(
//         { processInstanceId: processInstanceId }, // Điều kiện tìm kiếm
//         { $set: profileData }, // data
//         // { upsert: true, new: true, runValidators: true } // Tùy chọn: upsert=tạo nếu chưa có, new=trả về bản ghi mới
//       );
//     } catch (error) {
//       console.error('Lỗi khi cập nhật biến:', error.message);
//       throw error;
//     }

//     return {
//       message: `Đã cập nhật ${entries.length} biến cho processInstanceId ${processInstanceId}`,
//     };
//   }

//   async scheduleExpireMultiple(
//     activityInstanceIds: string[],
//     expireAt: Date,
//   ): Promise<{
//     success: boolean;
//     message: string;
//     data: { scheduled: any[]; errors: any[] };
//   }> {
//     const expireDate = new Date(expireAt);
//     if (isNaN(expireDate.getTime())) {
//       throw new Error('Định dạng thời gian không hợp lệ');
//     }

//     const scheduled: any[] = [];
//     const errors: any[] = [];

//     console.log('--- START scheduleExpireMultiple ---');
//     console.log('Expire date:', expireDate);
//     console.log('ActivityInstanceIds to process:', activityInstanceIds);

//     const variablesList = await this.getVariablesLists(); // dữ liệu tạm
//     console.log('Total variables fetched:', variablesList.length);

//     const filtered = variablesList.filter(
//       (v) =>
//         v.processInstanceId &&
//         activityInstanceIds.includes(v.processInstanceId),
//     );
//     console.log('Filtered items count:', filtered.length);

//     filtered.forEach((item, index) => {
//       const id = item.processInstanceId;
//       if (!id) {
//         errors.push({
//           activityInstanceId: 'unknown',
//           message: 'Không tìm thấy processInstanceId',
//         });
//         return;
//       }

//       // Update tạm thời trước khi expire
//       const scheduledItem = {
//         processInstanceId: id,
//         expireAt: expireDate,
//         status: 'sắp hết hiệu lực',
//         variables: { ...item.variables, status: 'sắp hết hiệu lực' },
//       };
//       scheduled.push(scheduledItem);

//       // Lập lịch cron
//       this.scheduleExpireJob(item, expireDate);
//     });

//     console.log('--- END scheduleExpireMultiple ---');
//     return {
//       success: true,
//       message:
//         'Lập lịch hủy hiệu lực hoàn tất. Trạng thái sẽ được cập nhật tự động khi đến giờ.',
//       data: { scheduled, errors },
//     };
//   }

//   /**
//    * Lập lịch cron để gọi API cập nhật trạng thái khi hết hạn
//    */
//   private scheduleExpireJob(item: any, expireAt: Date) {
//     const cronExp = this.dateToCronExpression(expireAt);
//     console.log(
//       `[scheduleExpireJob] Setting cron for processInstanceId=${item.processInstanceId} at ${expireAt.toISOString()} -> cronExp="${cronExp}"`,
//     );

//     cron.schedule(cronExp, async () => {
//       try {
//         console.log(
//           `[scheduleExpireJob] Cron triggered for processInstanceId=${item.processInstanceId}. Calling API to update status.`,
//         );
//         // Gọi API để cập nhật biến 'invalidStatus' và 'cancelTime' trong Camunda
//         await this.updateVariableByProcessFn(item.processInstanceId, {
//           invalidStatus: 'Hết hiệu lực',
//           cancelTime: moment(expireAt).format('DD/MM/YYYY HH:mm:ss'),
//         });
//         console.log(
//           `[scheduleExpireJob] Successfully updated invalidStatus to 'Hết hiệu lực' and cancelTime for processInstanceId=${item.processInstanceId}`,
//         );
//       } catch (error) {
//         console.error(
//           `[scheduleExpireJob] Failed to update invalidStatus for processInstanceId=${item.processInstanceId}:`,
//           error.message,
//         );
//       }
//     });
//   }

//   /**
//    * Chuyển Date -> cron expression
//    */
//   private dateToCronExpression(date: Date): string {
//     const minute = date.getMinutes();
//     const hour = date.getHours();
//     const day = date.getDate();
//     const month = date.getMonth() + 1;
//     return `${minute} ${hour} ${day} ${month} *`;
//   }

//   async scheduleStatusMultiple(
//     activityInstanceIds: string[],
//     startAt: Date,
//     endAt: Date,
//   ): Promise<{
//     success: boolean;
//     message: string;
//     data: { scheduled: any[]; errors: any[] };
//   }> {
//     const scheduled: any[] = [];
//     const errors: any[] = [];

//     // Lấy danh sách biến hiện tại
//     const variablesList = await this.getVariablesLists();

//     const filtered = variablesList.filter(
//       (v) =>
//         v.processInstanceId &&
//         activityInstanceIds.includes(v.processInstanceId),
//     );

//     filtered.forEach((item) => {
//       const id = item.processInstanceId;
//       if (!id) {
//         errors.push({
//           activityInstanceId: 'unknown',
//           message: 'Không tìm thấy processInstanceId',
//         });
//         return;
//       }

//       // Lập lịch cron cho start
//       this.scheduleStatusJob(item, startAt, 'đang áp dụng');

//       // Lập lịch cron cho end
//       this.scheduleStatusJob(item, endAt, 'Hết hiệu lực');

//       scheduled.push({
//         processInstanceId: id,
//         startAt,
//         endAt,
//         invalidStatus: 'lập lịch',
//       });
//     });

//     return {
//       success: true,
//       message: 'Lập lịch trạng thái hoàn tất.',
//       data: { scheduled, errors },
//     };
//   }

//   /**
//    * Lập lịch cron để cập nhật trạng thái
//    */
//   private scheduleStatusJob(item: any, date: Date, invalidStatus: string) {
//     const cronExp = this.dateToCronExpression(date);

//     cron.schedule(cronExp, async () => {
//       try {
//         const payload: Record<string, any> = { invalidStatus };

//         // Chỉ cập nhật cancelTime khi trạng thái là 'hết hiệu lực'
//         if (invalidStatus === 'Hết hiệu lực') {
//           payload.cancelTime = moment(date).format('DD/MM/YYYY HH:mm:ss');
//         }

//         await this.updateVariableByProcessFn(item.processInstanceId, payload);
//         console.log(
//           `[Cron] processInstanceId=${item.processInstanceId} -> status=${invalidStatus}`,
//         );
//         if (payload.cancelTime) {
//           console.log(
//             `[Cron] processInstanceId=${item.processInstanceId} -> cancelTime=${payload.cancelTime}`,
//           );
//         }
//       } catch (error) {
//         console.error(
//           `[Cron] Failed for processInstanceId=${item.processInstanceId}:`,
//           error.message,
//         );
//       }
//     });
//   }

//   private async executeCertificateValidityCheck(): Promise<{
//     isValid: boolean;
//   }> {
//     try {
//       const certResponse = await firstValueFrom(this.httpService.get(`${process.env.URL_KYSO_DAKLAK}/cert-info`, {
//           headers: { Accept: 'application/json' },
//           timeout: 10000,
//         }),
//       );

//       const certInfo: any = certResponse.data;
//       const now = new Date();

//       const validTo = moment(certInfo.validTo, 'DD-MM-YYYY HH:mm:ss').toDate();
//       const validFrom = moment(
//         certInfo.validFrom,
//         'DD-MM-YYYY HH:mm:ss',
//       ).toDate();

//       const isValid = now >= validFrom && now <= validTo;

//       return { isValid };
//     } catch (error) {
//       console.error('Lỗi khi kiểm tra hiệu lực chứng thư:', error);
//       throw error;
//     }
//   }

//   private scheduleSignatureCheckJob(
//     item: { processInstanceId: string; activityInstanceId: string },
//     checkAt: Date,
//   ) {
//     const cronExp = this.dateToCronExpression(checkAt);
//     console.log(
//       `[scheduleSignatureCheckJob] Setting cron for processInstanceId=${item.processInstanceId} at ${checkAt.toISOString()} -> cronExp="${cronExp}"`,
//     );

//     cron.schedule(cronExp, async () => {
//       try {
//         console.log(
//           `[scheduleSignatureCheckJob] Cron triggered for processInstanceId=${item.processInstanceId}.`,
//         );

//         const checkResult = await this.executeCertificateValidityCheck();
//         const signatureStatus = checkResult.isValid
//           ? 'Hợp lệ '
//           : 'Không hợp lệ';

//         await this.updateVariableByProcessFn(item.processInstanceId, {
//           signatureDeadline: signatureStatus,
//           testDate: moment(checkAt).format('DD/MM/YYYY HH:mm:ss'),
//         });

//         console.log(
//           `[scheduleSignatureCheckJob] Successfully updated signatureDeadline to '${signatureStatus}' for processInstanceId=${item.processInstanceId}`,
//         );
//       } catch (error) {
//         console.error(
//           `[scheduleSignatureCheckJob] Failed for processInstanceId=${item.processInstanceId}:`,
//           error.message,
//         );
//       }
//     });
//   }

//   async scheduleSignatureCheck(
//     activityInstanceIds: string[],
//     checkAt: Date,
//     processFn: string,
//   ): Promise<{
//     success: boolean;
//     message: string;
//     data: { scheduled: any[]; errors: any[] };
//   }> {
//     const checkDate = new Date(checkAt);
//     if (isNaN(checkDate.getTime())) {
//       throw new Error('Định dạng thời gian không hợp lệ');
//     }

//     const scheduled: any[] = [];
//     const errors: any[] = [];

//     if (!activityInstanceIds || activityInstanceIds.length === 0) {
//       throw new BadRequestException(
//         'activityInstanceIds must be a non-empty array',
//       );
//     }

//     // Lấy tất cả các mục cho quy trình được chỉ định
//     const allItems = await this.getVariablesListFilter(
//       { limit: Number.MAX_SAFE_INTEGER },
//       processFn,
//     );

//     // Lọc theo activityInstanceIds được cung cấp
//     const filteredItems = allItems.data.filter((item) =>
//       activityInstanceIds.includes(item.activityInstanceId),
//     );

//     const foundIds = new Set(
//       filteredItems.map((item) => item.activityInstanceId),
//     );
//     activityInstanceIds.forEach((id) => {
//       if (!foundIds.has(id)) {
//         errors.push({
//           activityInstanceId: id,
//           message: `Không tìm thấy activity instance trong danh sách của process "${processFn}".`,
//         });
//       }
//     });

//     for (const item of filteredItems) {
//       if (item.processInstanceId) {
//         this.scheduleSignatureCheckJob(item, checkDate);
//         scheduled.push({
//           activityInstanceId: item.activityInstanceId,
//           checkAt: checkDate,
//           status: 'lập lịch',
//         });
//       } else {
//         errors.push({
//           activityInstanceId: item.activityInstanceId,
//           message: 'Không có processInstanceId cho activity này.',
//         });
//       }
//     }

//     return {
//       success: true,
//       message: 'Lập lịch kiểm tra hiệu lực chữ ký hoàn tất.',
//       data: { scheduled, errors },
//     };
//   }

//   async checkSignatureNow(
//     activityInstanceIds: string[],
//     processFn: string,
//   ): Promise<{
//     success: boolean;
//     message: string;
//     data: { updated: any[]; errors: any[] };
//   }> {
//     const updated: any[] = [];
//     const errors: any[] = [];

//     if (!activityInstanceIds || activityInstanceIds.length === 0) {
//       throw new BadRequestException(
//         'activityInstanceIds must be a non-empty array',
//       );
//     }

//     // Lấy tất cả các mục cho quy trình được chỉ định
//     const allItems = await this.getVariablesListFilter(
//       { limit: Number.MAX_SAFE_INTEGER },
//       processFn,
//     );

//     // Lọc theo activityInstanceIds được cung cấp
//     const filteredItems = allItems.data.filter((item) =>
//       activityInstanceIds.includes(item.activityInstanceId),
//     );

//     const foundIds = new Set(
//       filteredItems.map((item) => item.activityInstanceId),
//     );
//     activityInstanceIds.forEach((id) => {
//       if (!foundIds.has(id)) {
//         errors.push({
//           activityInstanceId: id,
//           message: `Không tìm thấy activity instance trong danh sách của process "${processFn}".`,
//         });
//       }
//     });

//     for (const item of filteredItems) {
//       if (item.processInstanceId) {
//         try {
//           const checkResult = await this.executeCertificateValidityCheck();
//           const signatureStatus = checkResult.isValid
//             ? 'Hợp lệ'
//             : 'Không hợp lệ';

//           await this.updateVariableByProcessFn(item.processInstanceId, {
//             signatureDeadline: signatureStatus,
//             testDate: moment().format('DD/MM/YYYY HH:mm:ss'),
//           });

//           updated.push({
//             activityInstanceId: item.activityInstanceId,
//             status: signatureStatus,
//           });
//         } catch (error) {
//           errors.push({
//             activityInstanceId: item.activityInstanceId,
//             message: `Lỗi khi kiểm tra hoặc cập nhật: ${error.message}`,
//           });
//         }
//       } else {
//         errors.push({
//           activityInstanceId: item.activityInstanceId,
//           message: 'Không có processInstanceId cho activity này.',
//         });
//       }
//     }

//     return {
//       success: true,
//       message: 'Kiểm tra và cập nhật hiệu lực chữ ký hoàn tất.',
//       data: { updated, errors },
//     };
//   }

//   async updateTestDate(
//     activityInstanceIds: string[],
//     expireAt: Date,
//     processFn: string,
//   ): Promise<{
//     success: boolean;
//     message: string;
//     data: { updated: any[]; errors: any[] };
//   }> {
//     const updated: any[] = [];
//     const errors: any[] = [];

//     if (isNaN(expireAt.getTime())) {
//       throw new BadRequestException('Định dạng thời gian không hợp lệ');
//     }

//     if (!activityInstanceIds || activityInstanceIds.length === 0) {
//       throw new BadRequestException(
//         'activityInstanceIds must be a non-empty array',
//       );
//     }

//     // Lấy tất cả các mục cho quy trình được chỉ định
//     const allItems = await this.getVariablesListFilter(
//       { limit: Number.MAX_SAFE_INTEGER },
//       processFn,
//     );

//     // Lọc theo activityInstanceIds được cung cấp
//     const filteredItems = allItems.data.filter((item) =>
//       activityInstanceIds.includes(item.activityInstanceId),
//     );

//     const foundIds = new Set(
//       filteredItems.map((item) => item.activityInstanceId),
//     );
//     activityInstanceIds.forEach((id) => {
//       if (!foundIds.has(id)) {
//         errors.push({
//           activityInstanceId: id,
//           message: `Không tìm thấy activity instance trong danh sách của process "${processFn}".`,
//         });
//       }
//     });

//     for (const item of filteredItems) {
//       if (item.processInstanceId) {
//         try {
//           const formattedDate = moment(expireAt).format('DD/MM/YYYY HH:mm:ss');
//           await this.updateVariableByProcessFn(item.processInstanceId, {
//             testDate: formattedDate,
//           });
//           updated.push({
//             activityInstanceId: item.activityInstanceId,
//             testDate: formattedDate,
//           });
//         } catch (error) {
//           errors.push({
//             activityInstanceId: item.activityInstanceId,
//             message: `Lỗi khi cập nhật: ${error.message}`,
//           });
//         }
//       } else {
//         errors.push({
//           activityInstanceId: item.activityInstanceId,
//           message: 'Không có processInstanceId cho activity này.',
//         });
//       }
//     }

//     return {
//       success: true,
//       message: 'Cập nhật testDate hoàn tất.',
//       data: { updated, errors },
//     };
//   }

//   async updateCancelTime(
//     activityInstanceIds: string[],
//     expireAt: Date,
//     processFn: string,
//   ): Promise<{
//     success: boolean;
//     message: string;
//     data: { updated: any[]; errors: any[] };
//   }> {
//     const updated: any[] = [];
//     const errors: any[] = [];

//     if (isNaN(expireAt.getTime())) {
//       throw new BadRequestException('Định dạng thời gian không hợp lệ');
//     }

//     if (!activityInstanceIds || activityInstanceIds.length === 0) {
//       throw new BadRequestException(
//         'activityInstanceIds must be a non-empty array',
//       );
//     }

//     // Lấy tất cả các mục cho quy trình được chỉ định
//     const allItems = await this.getVariablesListFilter(
//       { limit: Number.MAX_SAFE_INTEGER },
//       processFn,
//     );

//     // Lọc theo activityInstanceIds được cung cấp
//     const filteredItems = allItems.data.filter((item) =>
//       activityInstanceIds.includes(item.activityInstanceId),
//     );

//     const foundIds = new Set(
//       filteredItems.map((item) => item.activityInstanceId),
//     );
//     activityInstanceIds.forEach((id) => {
//       if (!foundIds.has(id)) {
//         errors.push({
//           activityInstanceId: id,
//           message: `Không tìm thấy activity instance trong danh sách của process "${processFn}".`,
//         });
//       }
//     });

//     for (const item of filteredItems) {
//       if (item.processInstanceId) {
//         try {
//           const formattedDate = moment(expireAt).format('DD/MM/YYYY HH:mm:ss');
//           await this.updateVariableByProcessFn(item.processInstanceId, {
//             cancelTime: formattedDate,
//           });
//           updated.push({
//             activityInstanceId: item.activityInstanceId,
//             cancelTime: formattedDate,
//           });
//         } catch (error) {
//           errors.push({
//             activityInstanceId: item.activityInstanceId,
//             message: `Lỗi khi cập nhật: ${error.message}`,
//           });
//         }
//       } else {
//         errors.push({
//           activityInstanceId: item.activityInstanceId,
//           message: 'Không có processInstanceId cho activity này.',
//         });
//       }
//     }

//     return {
//       success: true,
//       message: 'Cập nhật cancelTime hoàn tất.',
//       data: { updated, errors },
//     };
//   }

//   async deleteProcessInstance(processInstanceId: string) {
//     if (!processInstanceId) {
//       throw new BadRequestException('processInstanceId is required');
//     }

//     try {
//       await firstValueFrom(
//         this.httpService.delete(
//           `${process.env.CAMUNDA_MEDIUM}/process-instance/${processInstanceId}`,
//         ),
//       );

//       return {
//         message: `Đã xóa processInstanceId ${processInstanceId}`,
//       };
//     } catch (error) {
//       throw new BadRequestException(
//         `Không thể xóa processInstanceId ${processInstanceId}: ${error?.response?.data?.message || error.message}`,
//       );
//     }
//   }

//   private detectCamundaType(value: any): string {
//     if (typeof value === 'string') return 'String';
//     if (typeof value === 'number')
//       return Number.isInteger(value) ? 'Integer' : 'Double';
//     if (typeof value === 'boolean') return 'Boolean';
//     return 'Object';
//   }

//   async deleteVariable(id: string) {
//     return this.camundaVariableModel.findByIdAndDelete(id).lean();
//   }
//   // Xóa nhiều biến cùng lúc theo mảng id
//   async deleteVariablesByProcessInstanceIds(processInstanceIds: string[]) {
//     if (
//       !processInstanceIds ||
//       !Array.isArray(processInstanceIds) ||
//       processInstanceIds.length === 0
//     ) {
//       throw new BadRequestException(
//         'processInstanceIds must be a non-empty array',
//       );
//     }

//     try {
//       const deletePromises = processInstanceIds.map(
//         async (processInstanceId) => {
//           await firstValueFrom(
//             this.httpService.delete(
//               `${process.env.CAMUNDA_MEDIUM}/process-instance/${processInstanceId}`,
//             ),
//           );
//         },
//       );

//       await Promise.all(deletePromises);

//       return {
//         message: `Đã xóa ${processInstanceIds.length} biến`,
//         deletedCount: processInstanceIds.length,
//       };
//     } catch (error) {
//       throw new BadRequestException(
//         `Không thể xóa các processInstanceIds: ${error?.response?.data?.message || error.message}`,
//       );
//     }
//   }

//   async deleteVariableByInstanceId(
//     processInstanceId: string,
//   ): Promise<DeleteResult> {
//     return this.camundaVariableModel.deleteOne({ processInstanceId }).exec();
//   }

//   async getVariablesListFilter(
//     body: Record<string, any> = {},
//     processFn: string
//   ) {
//     const {
//       variableValues,
//       activityInstanceIdFilter,
//       userFilters,
//       sort,
//       page: rawPage,
//       limit: rawLimit,
//       loaiTaiLieu,
//       tab,
//       thuthap,
//     } = body;

//     // Lấy processID
//     const processIDDoc = await this.featureManagementRepo.findOne({
//       where: { code: processFn }
//     });
//     const processID = processIDDoc?.processID;

//     // Merge variableValues + criteria
//     const mergedVariableValues: any[] = Array.isArray(variableValues)
//       ? [...variableValues]
//       : [];
//     if (
//       Array.isArray(processIDDoc?.criteria) &&
//       processIDDoc.criteria.length > 0
//     ) {
//       const formattedCriteria = processIDDoc.criteria.map((c: any) => ({
//         name: c.name,
//         value: c.value,
//         operator: c.operator,
//       }));
//       mergedVariableValues.push(...formattedCriteria);
//     }

//     // Lấy processKey
//     const resProcess = await this.bpmnDesignModel.findOne({
//       where: { id: processID },
//     });
//     const processKey = resProcess?.processKey || '';
//     const processDefinitionId = resProcess?.processInstanceDefinitionKey || '';
//     if (!processKey) throw new BadRequestException('processKey không tồn tại');

//     // Lấy danh sách processInstanceId
//     const processInstancesResp = await firstValueFrom(
//       this.httpService.get(`${process.env.CAMUNDA_MEDIUM}/process-instance`, {
//         params: { processDefinitionKey: processKey },
//       }),
//     );
//     const processInstanceIds = processInstancesResp.data.map(
//       (pi: any) => pi.id,
//     );
//     if (processInstanceIds.length === 0) return { data: [], total: 0 };

//     // Bước 1: lọc activityInstanceId theo điều kiện variableValues
//     let filteredActivityIds: string[] = [];
//     if (mergedVariableValues.length > 0) {
//       const filterResp = await firstValueFrom(
//         this.httpService.post(
//           `${process.env.CAMUNDA_MEDIUM}/variable-instance`,
//           {
//             processInstanceIdIn: processInstanceIds,
//             variableValues: mergedVariableValues,
//           },
//         ),
//       );
//       filteredActivityIds = filterResp.data.map(
//         (v: any) => v.activityInstanceId,
//       );
//     } else {
//       filteredActivityIds = processInstanceIds;
//     }
//     // if (filteredActivityIds.length === 0) return { data: [], total: 0 };

//     if (filteredActivityIds.length === 0) {
//       throw new BadRequestException('Không tìm thấy dữ liệu phù hợp.');
//     }

//     // Bước 2: lấy tất cả biến của các activityInstanceId đã lọc
//     const allVarsResp = await firstValueFrom(
//       this.httpService.post(`${process.env.CAMUNDA_MEDIUM}/variable-instance`, {
//         activityInstanceIdIn: filteredActivityIds,
//       }),
//     );

//     // Gom nhóm biến theo activityInstanceId
//     const grouped = allVarsResp.data.reduce((acc: any, curr: any) => {
//       const { activityInstanceId, name, value, processInstanceId } = curr;
//       if (!acc[activityInstanceId]) {
//         acc[activityInstanceId] = {
//           activityInstanceId,
//           processDefinitionId,
//           processInstanceId,
//           variables: {},
//         };
//       }
//       acc[activityInstanceId].variables[name] = value;
//       return acc;
//     }, {});

//     const enumFields = (processIDDoc?.valueField?.field || []).filter(
//       (f: any) => f.type === 'enum' && Array.isArray(f.valueInput),
//     );

//     const dateFields = (processIDDoc?.valueField?.field || []).filter(
//       (f: any) => f.type === 'date',
//     );

//     // Format dữ liệu
//     let result = Object.values(grouped).map((item: any) => {
//       const vars = { ...item.variables };

//       // Map enum -> label
//       for (const f of enumFields) {
//         if (vars[f.key] !== undefined) {
//           const found = f.valueInput.find(
//             (opt: any) => opt.value == vars[f.key],
//           );
//           if (found) vars[f.key] = found.label;
//         }
//       }

//       // Format date -> DD/MM/YYYY
//       for (const f of dateFields) {
//         if (vars[f.key]) {
//           const parsed = moment(vars[f.key], ['MM-DD-YYYY', 'YYYY-MM-DD']);
//           if (parsed.isValid()) vars[f.key] = parsed.format('DD/MM/YYYY');
//         }
//       }

//       return { ...item, variables: vars };
//     });

//     result = result.map((item: any) => {
//       const vars = { ...item.variables };

//       // Map managerUnit
//       if (vars.managerUnit && vars.managerUnit.length === 24) {
//         const found = result.find(
//           (r: any) => r.variables?._id === vars.managerUnit,
//         );
//         if (found) {
//           vars.managerUnit = found.variables?.name || vars.managerUnit;
//         }
//       }

//       // Map fileSys
//       if (vars.fileSys && vars.fileSys.length === 24) {
//         const foundFile = result.find(
//           (r: any) => r.variables?.fileSys === vars.fileSys,
//         );
//         if (foundFile) {
//           vars.fileSys = foundFile.variables?.name || vars.fileSys;
//         }
//       }
//       if (vars.citizen && vars.citizen.length === 24) {
//         const found = result.find(
//           (r: any) => r.variables?._id === vars.citizen,
//         );
//         if (found) {
//           vars.citizen = found.variables?.fullName || vars.citizen;
//         }
//       }

//       return { ...item, variables: vars };
//     });
//     const tthcIds = result
//       .map((r: any) => r.variables?.tthcType)
//       .filter((id: string) => id && id.length === 24);

//     if (tthcIds.length > 0) {
//       const tthcDocs = await this.administrativeProcedureCategoryModel
//         .find({ _id: { $in: tthcIds } })
//         .select('_id name')
//         .lean();

//       const tthcMap = tthcDocs.reduce(
//         (acc, doc) => {
//           acc[doc._id.toString()] = doc.name;
//           return acc;
//         },
//         {} as Record<string, string>,
//       );

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.tthcType && tthcMap[vars.tthcType]) {
//           vars.tthcType = tthcMap[vars.tthcType];
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     // Bỏ dấu để filter
//     function removeAccents(str: string): string {
//       return str
//         ? str
//           .normalize('NFD')
//           .replace(/[\u0300-\u036f]/g, '')
//           .toLowerCase()
//         : '';
//     }

//     // Filter userFilters
//     if (userFilters && typeof userFilters === 'object') {
//       const filters = Object.entries(userFilters);
//       result = result.filter((item: any) => {
//         return filters.every(([key, value]) => {
//           const fieldValue = item.variables[key];
//           if (fieldValue == null) return false;
//           return (
//             removeAccents(String(fieldValue)) === removeAccents(String(value))
//           );
//         });
//       });
//     }

//     // Filter activityInstanceId
//     if (activityInstanceIdFilter) {
//       result = result.filter(
//         (item: any) =>
//           item.variables?.activityInstanceIdFilter === activityInstanceIdFilter,
//       );
//     }
//     // 👉 SORT theo 1 cột duy nhất (frontend gửi)
//     if (sort && typeof sort === 'object' && sort !== null) {
//       const [[field, order]] = Object.entries(sort); // lấy cột đầu tiên
//       result.sort((a: any, b: any) => {
//         const valA = a.variables?.[field] || '';
//         const valB = b.variables?.[field] || '';
//         const cmp = String(valA).localeCompare(String(valB), 'vi', {
//           sensitivity: 'base',
//         });
//         return order === -1 ? -cmp : cmp; // -1: desc, 1: asc
//       });
//     }
//     // helper: convert -> positive int, fallback default
//     const toPositiveInt = (v: any, def: number) => {
//       const n = parseInt(String(v ?? ''), 10);
//       return Number.isFinite(n) && n > 0 ? n : def;
//     };

//     const page = toPositiveInt(rawPage, 1);
//     const limit = toPositiveInt(rawLimit, 100);

//     if (!result || result.length === 0) {
//       throw new NotFoundException({
//         success: false,
//         message: 'Không tìm thấy kết quả hồ sơ ',
//       });
//     }

//     // Pagination
//     const totalItems = result.length;
//     const totalPages = Math.ceil(totalItems / limit);
//     const startIndex = (page - 1) * limit;
//     const pagedData = result.slice(startIndex, startIndex + limit);

//     // Lưu lịch sử khai thác
//     // Lưu lịch sử khai thác
//     if (loaiTaiLieu && pagedData && pagedData.length > 0) {
//       // 👉 chỉ lấy 1 bản ghi thỏa mãn
//       const foundRecord = pagedData.find((item) => {
//         const vars = item.variables || {};
//         const maHoSo = vars.code || body.userFilters?.code;
//         return Boolean(maHoSo); // điều kiện kiểm tra bạn muốn
//       });

//       if (foundRecord) {
//         const vars = foundRecord.variables || {};
//         const maHoSo = vars.code || body.userFilters?.code;

//         let historyEntry: any = {
//           maHoSo: maHoSo,
//           tieuDeHoSo: vars.name || vars.fullName,
//           ketQuaGQTTHC: loaiTaiLieu || 'Thành công',
//           processInstanceId: foundRecord.activityInstanceId,
//           tab: tab || 'cd',
//         };

//         if (thuthap) {
//           const citizenCode = vars.idCard || null;
//           let citizenName = vars.name || '';

//           if (tab === 'cd' && vars.idCard) {
//             const citizen = await this.infoCitizenModel.findOne({
//               where: { idCard: vars.idCard },
//             });
//             citizenName = citizen?.fullName || vars.name || '';
//           }

//           if (tab === 'dn' && vars.idCard) {
//             const enterprise = await this.infoEnterpriseModel.findOne({
//               where: { idCard: vars.idCard },
//             });
//             citizenName = enterprise?.name || vars.name || '';
//           }

//           historyEntry = {
//             ...historyEntry,
//             citizenCode,
//             citizenName,
//             thoiGianThuThap: new Date(),
//             thuthap,
//           };
//         } else {
//           historyEntry = {
//             ...historyEntry,
//             thoiGianKhaiThac: new Date(),
//           };

//           // Các logic Giấy tờ tái sử dụng / khác giữ nguyên
//           if (loaiTaiLieu === 'Giấy tờ tái sử dụng') {
//             if (tab === 'cd') {
//               historyEntry = {
//                 ...historyEntry,
//                 loaiGiayTo: vars.loaiGiayTo || 'Chưa xác định',
//                 citizenCode: vars.citizenId || null,
//                 citizenName: vars.citizen || '',
//                 code: vars.code || '',
//                 name: vars.name || '',
//                 tab: 'cd',
//               };
//             }
//             if (tab === 'dn') {
//               const enterprise = await this.infoEnterpriseModel.findOne({ taxCode: vars.taxCode });
//               historyEntry = {
//                 ...historyEntry,
//                 loaiGiayTo: vars.loaiGiayTo || 'Chưa xác định',
//                 enterpriseCode: enterprise?.taxCode || null,
//                 enterpriseName: enterprise?.name || '',
//                 code: vars.code || '',
//                 name: vars.name || '',
//                 tab: 'dn',
//               };
//             }
//           }

//           if (loaiTaiLieu === 'Giấy tờ khác') {
//             historyEntry.moTaKhac = vars.moTaKhac || '';
//           }
//         }

//         await this.exploitationHistoryService.create(historyEntry);
//       }
//     }

//     return {
//       page,
//       limit,
//       totalItems,
//       totalPages,
//       data: pagedData,
//     };
//   }

//   async getVariableDetail(processInstanceId: string) {
//     const { data } = await axios.get(
//       `${process.env.CAMUNDA_MEDIUM}/task?processInstanceId=${processInstanceId}&active=true`,
//     );
//     if (!data || !Array.isArray(data) || data.length === 0) {
//       throw new NotFoundException(
//         `Không thể tìm thấy tác vụ (task) nào đang hoạt động cho process instance ID: ${processInstanceId}`,
//       );
//     }
//     const taskId = data[0].id;
//     const { data: variablesData } = await axios.get(
//       `${process.env.CAMUNDA_MEDIUM}/task/${taskId}/variables`,
//     );
//     if (!variablesData) {
//       throw new NotFoundException(
//         `Không thể tìm thấy biến (variables) cho tác vụ của process instance ID: ${processInstanceId}`,
//       );
//     }
//     return variablesData;
//   }

//   async getVariableDetailById(activityInstanceId: string, processFn: string) {
//     if (!processFn) {
//       throw new BadRequestException('Query parameter "processFn" is required.');
//     }

//     // 1. Lấy cấu hình process
//     const processIDDoc = await this.featureManagementRepo.findOne({
//       where: { code: processFn }
//     });
//     if (!processIDDoc) {
//       throw new NotFoundException(`Process function '${processFn}' not found.`);
//     }

//     // 2. Lấy tất cả biến của activityInstanceId từ Camunda
//     const allVarsResp = await firstValueFrom(
//       this.httpService.post(`${process.env.CAMUNDA_MEDIUM}/variable-instance`, {
//         activityInstanceIdIn: [activityInstanceId],
//       }),
//     );

//     if (allVarsResp.data.length === 0) {
//       throw new NotFoundException(
//         `Activity instance with ID '${activityInstanceId}' not found.`,
//       );
//     }

//     // 3. Gom nhóm các biến lại thành một object
//     const record = allVarsResp.data.reduce((acc: any, curr: any) => {
//       const { name, value, processInstanceId, processDefinitionId } = curr;
//       if (!acc.activityInstanceId) {
//         acc.activityInstanceId = activityInstanceId;
//         acc.processInstanceId = processInstanceId;
//         acc.processDefinitionId = processDefinitionId;
//         acc.variables = {};
//       }
//       acc.variables[name] = value;
//       return acc;
//     }, {});

//     // 4. Định dạng dữ liệu (enum, date)
//     const enumFields = (processIDDoc?.valueField?.field || []).filter(
//       (f: any) => f.type === 'enum' && Array.isArray(f.valueInput),
//     );
//     const dateFields = (processIDDoc?.valueField?.field || []).filter(
//       (f: any) => f.type === 'date',
//     );

//     const vars = { ...record.variables };

//     // Map enum -> label
//     for (const f of enumFields) {
//       if (vars[f.key] !== undefined) {
//         const found = f.valueInput.find((opt: any) => opt.value == vars[f.key]);
//         if (found) vars[f.key] = found.label;
//       }
//     }

//     // Format date -> DD/MM/YYYY
//     for (const f of dateFields) {
//       if (vars[f.key]) {
//         const parsed = moment(vars[f.key], ['MM-DD-YYYY', 'YYYY-MM-DD']);
//         if (parsed.isValid()) vars[f.key] = parsed.format('DD/MM/YYYY');
//       }
//     }

//     record.variables = vars;

//     // 5. Map các trường tham chiếu (tthcType)
//     const tthcId = record.variables?.tthcType;
//     if (tthcId && typeof tthcId === 'string' && tthcId.length === 24) {
//       const tthcDoc = await this.administrativeProcedureCategoryModel
//         .findById(tthcId)
//         .select('name')
//         .lean();
//       if (tthcDoc) {
//         record.variables.tthcType = tthcDoc.name;
//       }
//     }

//     // TODO: Cân nhắc việc map các trường tham chiếu khác như managerUnit, fileSys, citizen
//     // Việc này yêu cầu phải query toàn bộ danh sách, có thể làm chậm API chi tiết.
//     // Nếu cần, có thể tạo các API riêng để lấy chi tiết các đối tượng này.

//     return {
//       success: true,
//       data: record,
//     };
//   }
//   private async fetchProcessVariables(
//     processFn: string,
//     variableValues: any[],
//   ): Promise<any[]> {
//     // Lấy processID
//       const processIDDoc =await this.featureManagementRepo.findOne({
//       where: { code: processFn },
//     });
//     const processID = processIDDoc?.processID;

//     // Hợp nhất variableValues và criteria từ cấu hình
//     const mergedVariableValues: any[] = Array.isArray(variableValues)
//       ? [...variableValues]
//       : [];
//     if (Array.isArray(processIDDoc?.criteria) && processIDDoc.criteria.length > 0) {
//       const formattedCriteria = processIDDoc.criteria.map((c: any) => ({
//         name: c.name,
//         value: c.value,
//         operator: c.operator,
//       }));
//       mergedVariableValues.push(...formattedCriteria);
//     }

//     // Lấy processKey
//     const resProcess = await this.bpmnDesignModel.findOne({
//       where: { id: processID },
//     });
//     const processKey = resProcess?.processKey || '';
//     const processDefinitionId = resProcess?.processInstanceDefinitionKey || '';
//     if (!processKey) throw new Error('processKey is required');

//     // Lấy danh sách processInstanceId
//     const processInstancesResp = await firstValueFrom(
//       this.httpService.get(`${process.env.CAMUNDA_MEDIUM}/process-instance`, {
//         params: { processDefinitionKey: processKey },
//       }),
//     );
//     const processInstanceIds = processInstancesResp.data.map((pi: any) => pi.id);
//     if (processInstanceIds.length === 0) return [];

//     // Bước 1: lọc activityInstanceId theo điều kiện variableValues
//     let filteredActivityIds: string[] = [];

//     filteredActivityIds = processInstanceIds;
//     if (filteredActivityIds.length === 0) return [];

//     // Bước 2: lấy tất cả biến của các activityInstanceId đã lọc
//     const allVarsResp = await firstValueFrom(
//       this.httpService.post(`${process.env.CAMUNDA_MEDIUM}/variable-instance`, {
//         activityInstanceIdIn: filteredActivityIds,
//       }),
//     );

//     // Gom nhóm các biến theo activityInstanceId
//     const grouped = allVarsResp.data.reduce((acc: any, curr: any) => {
//       const { activityInstanceId, name, value, processInstanceId } = curr;
//       if (!acc[activityInstanceId]) {
//         acc[activityInstanceId] = {
//           activityInstanceId,
//           processDefinitionId,
//           processInstanceId,
//           variables: {},
//         };
//       }
//       acc[activityInstanceId].variables[name] = value;
//       return acc;
//     }, {});

//     const enumFields = (processIDDoc?.valueField?.field || []).filter(
//       (f: any) => f.type === 'enum' && Array.isArray(f.valueInput),
//     );

//     const dateFields = (processIDDoc?.valueField?.field || []).filter(
//       (f: any) => f.type === 'date',
//     );

//     // Format dữ liệu
//     function applyOperator(fieldValue, operator, compareValue) {
//       const numField = parseFloat(fieldValue);
//       const numCompare = parseFloat(compareValue);
//       const isNumber = !isNaN(numField) && !isNaN(numCompare);


//       switch (operator) {
//         case "eq":
//           return fieldValue == compareValue;
//         case "neq":
//         case "ne":
//           return fieldValue != compareValue;
//         case "gt":
//           return isNumber && numField > numCompare;
//         case "lt":
//           return isNumber && numField < numCompare;
//         case "gte":
//         case "gteq":
//           return isNumber && numField >= numCompare;
//         case "lte":
//         case "lteq":
//           return isNumber && numField <= numCompare;
//         case "contains":
//         case "like":
//           return typeof fieldValue === "string" && fieldValue.includes(compareValue);
//         default:
//           return false;
//       }
//     }

//     interface FilterCondition {
//       name: string;
//       value: any;
//       operator: string;
//     }

//     function groupFilters(filters: FilterCondition[]): Record<string, FilterCondition[]> {
//       const map: Record<string, FilterCondition[]> = {};
//       for (const filter of filters) {
//         const { name } = filter;
//         if (!map[name]) map[name] = [];
//         map[name].push(filter);
//       }
//       return map;
//     }
//     function filterData(data: any[], filters: FilterCondition[]) {
//       const filterMap = groupFilters(filters);

//       return data.filter(item => {
//         const vars = item.variables;

//         return Object.entries(filterMap).every(([field, conditions]: [string, FilterCondition[]]) => {
//           // Nếu biến không tồn tại trong object, không thỏa mãn
//           if (!(field in vars)) return false;

//           // Chỉ cần 1 trong các điều kiện đúng (OR logic cho từng field)
//           return conditions.some(({ operator, value }: FilterCondition) =>
//             applyOperator(vars[field], operator, value)
//           );
//         });
//       });
//     }
//     let result: any[];
//     if (mergedVariableValues.length > 0) {
//       result = filterData(Object.values(grouped), mergedVariableValues);
//     } else {
//       result = Object.values(grouped);
//     }
//     result = result.map((item: any) => {
//       const vars = { ...item.variables };

//       // Map enum -> label
//       for (const f of enumFields) {
//         if (vars[f.key] !== undefined) {
//           const found = f.valueInput.find((opt: any) => opt.value == vars[f.key]);
//           if (found) vars[f.key] = found.label;
//         }
//       }

//       // Format date -> DD/MM/YYYY
//       for (const f of dateFields) {
//         if (vars[f.key]) {
//           const parsed = moment(vars[f.key], ['MM-DD-YYYY', 'YYYY-MM-DD']);
//           if (parsed.isValid()) vars[f.key] = parsed.format('DD/MM/YYYY');
//         }
//       }

//       return { ...item, variables: vars };
//     });

//     result = result.map((item: any) => {
//       const vars = { ...item.variables };

//       // Map managerUnit
//       if (vars.managerUnit && vars.managerUnit.length === 24) {
//         const found = result.find(
//           (r: any) => r.variables?._id === vars.managerUnit,
//         );
//         if (found) {
//           vars.managerUnit = found.variables?.name || vars.managerUnit;
//         }
//       }

//       // Map fileSys
//       if (vars.fileSys && vars.fileSys.length === 24) {
//         const foundFile = result.find(
//           (r: any) => r.variables?.fileSys === vars.fileSys,
//         );
//         if (foundFile) {
//           vars.fileSys = foundFile.variables?.name || vars.fileSys;
//         }
//       }

//       return { ...item, variables: vars };
//     });
//     const tthcIds = result
//       .map((r: any) => r.variables?.tthcType) // Lấy ID của loại thủ tục hành chính
//       .filter((id: string) => id && id.length === 24);

//     if (tthcIds.length > 0) {
//       const tthcDocs = await this.administrativeProcedureCategoryModel
//         .find({ _id: { $in: tthcIds } })
//         .select('_id name')
//         .lean();

//       const tthcMap = tthcDocs.reduce((acc, doc) => {
//         acc[doc._id.toString()] = doc.name;
//         return acc;
//       }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.tthcType && tthcMap[vars.tthcType]) {
//           vars.tthcType = tthcMap[vars.tthcType];
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     // Map 'files' ID to profile name
//     const fileIds = result
//       .map((r: any) => r.variables?.files)
//       .filter((id: string) => id && id.length === 24);

//     if (fileIds.length > 0) {
//       const profileDocs = await this.profileManagementModel
//         .find({ _id: { $in: fileIds } })
//         .select('_id name')
//         .lean();

//       const profileMap = profileDocs.reduce((acc, doc) => {
//         acc[doc._id.toString()] = doc.name;
//         return acc;
//       }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.files && profileMap[vars.files]) {
//           vars.files = profileMap[vars.files];
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     // Map 'font' ID to fondsCatalog name
//     const fontIds = result
//       .map((r: any) => r.variables?.font)
//       .filter((id: string) => id && id.length === 24);

//     if (fontIds.length > 0) {
//       const fondsDocs = await this.fondsCatalogModel
//         .find({ _id: { $in: fontIds } })
//         .select('_id name')
//         .lean();

//       const fondsMap = fondsDocs.reduce((acc, doc) => {
//         acc[doc._id.toString()] = doc.name;
//         return acc;
//       }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.font && fondsMap[vars.font]) {
//           vars.font = fondsMap[vars.font];
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     // Map 'citizen' ID to citizen fullName
//     const citizenIds = result
//       .map((r: any) => r.variables?.citizen)
//       .filter((id: string) => id && id.length === 24);

//     if (citizenIds.length > 0) {
//       const citizenDocs = await this.citizenModel
//         .find({ _id: { $in: citizenIds } })
//         .select('_id fullName')
//         .lean();

//       const citizenMap = citizenDocs.reduce((acc, doc) => {
//         acc[doc._id.toString()] = doc.fullName;
//         return acc;
//       }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.citizen && citizenMap[vars.citizen]) {
//           vars.citizen = citizenMap[vars.citizen];
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     const objectIds = result
//       .map((r: any) => r.variables?.object)
//       .filter((id: string) => id && id.length === 24);

//     if (objectIds.length > 0) {
//       const objectDocs = await this.citizenModel
//         .find({ _id: { $in: objectIds } })
//         .select('_id fullName')
//         .lean();

//       const objectMap = objectDocs.reduce((acc, doc) => {
//         acc[doc._id.toString()] = doc.fullName;
//         return acc;
//       }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.object && objectMap[vars.object]) {
//           vars.object = objectMap[vars.object];
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     const copyistIds = result
//       .map((r: any) => r.variables?.copyist)
//       .filter((id: string) => id && id.length === 24);

//     if (copyistIds.length > 0) {
//       const userDocs = await this.userModel
//         .find({ _id: { $in: copyistIds } })
//         .select('_id name')
//         .lean();

//       const userMap = userDocs.reduce((acc, doc) => {
//         acc[doc._id.toString()] = doc.name;
//         return acc;
//       }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.copyist && userMap[vars.copyist]) {
//           vars.copyist = userMap[vars.copyist];
//         }
//         return { ...item, variables: vars };
//       });
//     }


//     // Map 'field' ID to administrativeProcedureFieldCategory name
//     const fieldIds = result
//       .map((r: any) => r.variables?.field)
//       .filter((id: string) => id && id.length === 24);

//     if (fieldIds.length > 0) {
//       const fieldDocs = await this.administrativeProcedureFieldCategoryModel
//         .find({ _id: { $in: fieldIds } })
//         .select('_id name')
//         .lean();

//       const fieldMap = fieldDocs.reduce((acc, doc) => {
//         acc[doc._id.toString()] = doc.name;
//         return acc;
//       }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.field && fieldMap[vars.field]) {
//           vars.field = fieldMap[vars.field];
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     // Map 'fielSys' ID to fileManager realName
//     const fielSysIds = result
//       .map((r: any) => r.variables?.fielSys) // Sửa lại từ fileSys thành fielSys
//       .filter((id: string) => id && id.length === 24);

//     if (fielSysIds.length > 0) {
//       const fileDocs = await this.fileManagerModel
//         .find({ _id: { $in: fielSysIds } })
//         .select('_id name realName attachedFiles') // Lấy thêm attachedFiles
//         .lean();

//       const fileMap = fileDocs.reduce((acc, doc) => {
//         // Ưu tiên lấy name từ attachedFiles[0] nếu có
//         if (doc.attachedFiles && doc.attachedFiles.length > 0 && doc.attachedFiles[0].name) {
//           acc[doc._id.toString()] = doc.attachedFiles[0].name;
//         } else {
//           // Nếu không, dùng name hoặc realName ở cấp cao nhất
//           acc[doc._id.toString()] = doc.name || doc.realName;
//         }
//         return acc;
//       }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.fielSys && fileMap[vars.fielSys]) {
//           vars.fielSys = fileMap[vars.fielSys];
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     // Map 'documentType' code to name from common-categories
//     const docTypeCategory = await this.commonCategoryModel.findOne({ categoryCode: 'LTL001' }).lean();
//     if (docTypeCategory && docTypeCategory.valueList) {
//       const docTypeMap = docTypeCategory.valueList.reduce((acc, item) => {
//         acc[item.code] = item.name;
//         return acc;
//       }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         const docTypeCode = vars.documentType;

//         // Check if docTypeCode is a string and exists in the map
//         if (docTypeCode && typeof docTypeCode === 'string' && docTypeMap[docTypeCode]) {
//           vars.documentType = docTypeMap[docTypeCode];
//         }
//         // Handle cases where documentType might be an ID (fallback)
//         else if (docTypeCode) {
//           const foundInValueList = docTypeCategory.valueList.find(v => v.code.toString() === docTypeCode);
//           if (foundInValueList) {
//             vars.documentType = foundInValueList.name;
//           }
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     // Map 'unit' ID to collectionManagement name
//     const unitIds = result
//       .map((r: any) => r.variables?.unit)
//       .filter((id: string) => {
//         // Kiểm tra xem có phải là ID hợp lệ không, và không phải là JSON string
//         try {
//           return id && id.length === 24 && !JSON.parse(id);
//         } catch (e) {
//           return id && id.length === 24;
//         }
//       });

//     if (unitIds.length > 0) {
//       const unitDocs = await this.collectionManagementModel
//         .find({ _id: { $in: unitIds } })
//         .select('_id name')
//         .lean();

//       const unitMap = unitDocs.reduce((acc, doc) => {
//         acc[doc._id.toString()] = doc.name;
//         return acc;
//       }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.unit && unitMap[vars.unit]) {
//           vars.unit = unitMap[vars.unit];
//         }
//         return { ...item, variables: vars };
//       });
//     }
//     const copyUnitIds = result
//       .map((r: any) => r.variables?.copyUnit)
//       .filter((id: string) => id && id.length === 24);

//     if (copyUnitIds.length > 0) {
//       const unitDocs = await this.organizationUnitModel
//         .find({ _id: { $in: copyUnitIds } })
//         .select('_id name')
//         .lean();

//       const unitMap = unitDocs.reduce((acc, doc) => {
//         acc[doc._id.toString()] = doc.name;
//         return acc;
//       }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.copyUnit && unitMap[vars.copyUnit]) {
//           vars.copyUnit = unitMap[vars.copyUnit];
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     // Map 'resultTHHC' ID to administrativeProcedureResultCategory name
//     const resultTHHCIds = result
//       .map((r: any) => r.variables?.resultTHHC)
//       .filter((id: string) => id && id.length === 24);

//     if (resultTHHCIds.length > 0) {
//       const resultDocs = await this.administrativeProcedureResultCategoryModel
//         .find({ _id: { $in: resultTHHCIds } })
//         .select('_id name')
//         .lean();

//       const resultMap = resultDocs.reduce((acc, doc) => {
//         acc[doc._id.toString()] = doc.name;
//         return acc;
//       }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.resultTHHC && resultMap[vars.resultTHHC]) {
//           vars.resultTHHC = resultMap[vars.resultTHHC];
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     // Map 'room' ID to roomInWarehouse name
//     const roomIds = result
//       .map((r: any) => r.variables?.room)
//       .filter((id: string) => id && id.length === 24);

//     if (roomIds.length > 0) {
//       const roomDocs = await this.roomInWarehouseModel
//         .find({ _id: { $in: roomIds } })
//         .select('_id name')
//         .lean();

//       const roomMap = roomDocs.reduce((acc, doc) => {
//         acc[doc._id.toString()] = doc.name;
//         return acc;
//       }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.room && roomMap[vars.room]) {
//           vars.room = roomMap[vars.room];
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     // Map 'shelf' ID to shelfManagement name
//     const shelfIds = result
//       .map((r: any) => r.variables?.shelf)
//       .filter((id: string) => id && id.length === 24);

//     if (shelfIds.length > 0) {
//       const shelfDocs = await this.shelfManagementModel
//         .find({ _id: { $in: shelfIds } })
//         .select('_id name')
//         .lean();

//       const shelfMap = shelfDocs.reduce((acc, doc) => {
//         acc[doc._id.toString()] = doc.name;
//         return acc;
//       }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.shelf && shelfMap[vars.shelf]) {
//           vars.shelf = shelfMap[vars.shelf];
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     // Map 'box' ID to boxManagement name
//     const boxIds = result
//       .map((r: any) => r.variables?.box)
//       .filter((id: string) => id && id.length === 24);

//     if (boxIds.length > 0) {
//       const boxDocs = await this.boxManagementModel
//         .find({ _id: { $in: boxIds } })
//         .select('_id name')
//         .lean();

//       const boxMap = boxDocs.reduce((acc, doc) => {
//         acc[doc._id.toString()] = doc.name;
//         return acc;
//       }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.box && boxMap[vars.box]) {
//           vars.box = boxMap[vars.box];
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     // Map 'storage' ID to warehouse name
//     const storageIds = result
//       .map((r: any) => r.variables?.storage)
//       .filter((id: string) => id && id.length === 24);

//     if (storageIds.length > 0) {
//       const storageDocs = await this.warehouseModel
//         .find({ _id: { $in: storageIds } })
//         .select('_id name')
//         .lean();

//       const storageMap = storageDocs.reduce((acc, doc) => {
//         acc[doc._id.toString()] = doc.name;
//         return acc;
//       }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.storage && storageMap[vars.storage]) {
//           vars.storage = storageMap[vars.storage];
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     // Map 'floor' ID to floorNumber
//     const floorIds = result
//       .map((r: any) => r.variables?.floor)
//       .filter((id: string) => id && id.length === 24);

//     if (floorIds.length > 0) {
//       const floorDocs = await this.floorModel
//         .find({ _id: { $in: floorIds } })
//         .select('_id floorNumber')
//         .lean();

//       const floorMap = floorDocs.reduce((acc, doc) => {
//         acc[doc._id.toString()] = doc.floorNumber;
//         return acc;
//       }, {} as Record<string, number>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.floor && floorMap[vars.floor]) {
//           vars.floor = floorMap[vars.floor];
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     // Map 'compartment' ID to compartmentNumber
//     const compartmentIds = result
//       .map((r: any) => r.variables?.compartment)
//       .filter((id: string) => id && id.length === 24);

//     if (compartmentIds.length > 0) {
//       const compartmentDocs = await this.compartmentModel
//         .find({ _id: { $in: compartmentIds } })
//         .select('_id compartmentNumber')
//         .lean();

//       const compartmentMap = compartmentDocs.reduce((acc, doc) => {
//         acc[doc._id.toString()] = doc.compartmentNumber;
//         return acc;
//       }, {} as Record<string, number>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         if (vars.compartment && compartmentMap[vars.compartment]) {
//           vars.compartment = compartmentMap[vars.compartment];
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     return result;
//   }
//   async fetchAllTasksByProcess(processFn: string): Promise<any[]> {
//     const camundaBaseUrl = process.env.CAMUNDA_API;
//     if (!camundaBaseUrl) {
//       throw new InternalServerErrorException(
//         'CAMUNDA_API env variable is not set (check your .env file)',
//       );
//     }

//     // Camunda API filter theo processDefinitionKey
//     const url = `${camundaBaseUrl}/task?processDefinitionKey=${encodeURIComponent(processFn)}`;

//     console.log('🔧 [fetchAllTasksByProcess] Requesting URL =', url);

//     try {
//       const { data } = await axios.get(url, {
//         headers: { 'Content-Type': 'application/json' },
//       });

//       console.log('✅ [fetchAllTasksByProcess] Retrieved tasks count =', Array.isArray(data) ? data.length : 0);
//       return data;
//     } catch (error: any) {
//       console.error('❌ [fetchAllTasksByProcess] Error while calling Camunda API');
//       if (error.response) {
//         console.error('   ↳ Status:', error.response.status);
//         console.error('   ↳ Data:', error.response.data);
//         throw new HttpException(
//           `Camunda error: ${error.response.data?.message || error.response.statusText}`,
//           error.response.status,
//         );
//       } else if (error.request) {
//         console.error('   ↳ No response from Camunda server');
//         throw new HttpException(
//           'No response from Camunda server. Check if Camunda is running and CAMUNDA_API is correct.',
//           HttpStatus.BAD_GATEWAY,
//         );
//       } else {
//         console.error('   ↳ Error message:', error.message);
//         throw new HttpException(
//           `Internal error: ${error.message}`,
//           HttpStatus.INTERNAL_SERVER_ERROR,
//         );
//       }
//     }
//   }


//   // ví dụ hàm gọi Camunda/database
//   private async callCamundaOrDB(processKey: string, variableValues: any[]) {
//     // Gọi Camunda API hoặc fetch DB
//     // Trả về mảng task
//     return []; // placeholder
//   }

//   private async mapVariablesToTasks(tasks: any[], httpService: HttpService): Promise<any[]> {
//     if (!tasks.length) return [];

//     // 1️⃣ Lấy processInstanceIds
//     const processInstanceIds = tasks.map(t => t.processInstanceId);

//     // 2️⃣ Lấy tất cả biến từ Camunda
//     const allVarsResp = await firstValueFrom(
//       httpService.post(`${process.env.CAMUNDA_MEDIUM}/variable-instance`, {
//         processInstanceIdIn: processInstanceIds,
//       }),
//     );

//     // 3️⃣ Gom biến theo processInstanceId
//     const varsByProcess: Record<string, Record<string, any>> = {};
//     allVarsResp.data.forEach((v: any) => {
//       const { processInstanceId, name, value } = v;
//       if (!varsByProcess[processInstanceId]) varsByProcess[processInstanceId] = {};
//       varsByProcess[processInstanceId][name] = value;
//     });

//     // 4️⃣ Map lại task gọn, giữ activityInstanceId + variables
//     return tasks.map(task => ({
//       id: task.id,
//       name: task.name,
//       assignee: task.assignee,
//       created: task.created,
//       lastUpdated: task.lastUpdated,
//       priority: task.priority,
//       taskDefinitionKey: task.taskDefinitionKey,
//       processDefinitionId: task.processDefinitionId,
//       activityInstanceId: task.executionId, // ← activityInstanceId
//       variables: varsByProcess[task.processInstanceId] || {},
//     }));
//   }



//   async getTasksByAssignee(
//     processFn: string,
//     currentUserId: string,
//     page = 1,
//     limit = 25,
//     userFilters: Record<string, any> = {},
//     sort: Record<string, 'asc' | 'desc'> = {},
//   ) {
//     if (!currentUserId) {
//       throw new HttpException('currentUserId is required', HttpStatus.BAD_REQUEST);
//     }

//     const process = await this.featureManagementRepo.findOne({
//       where: { code: processFn },
//     });
//     let tasks: any[] = [];

//     if (process?.isFollowAssignee) {
//       tasks = await this.modelIntrospectService.getTasksByAssignee(currentUserId);
//       tasks = await this.mapVariablesToTasks(tasks, this.httpService);
//     } else {
//       tasks = await this.fetchProcessVariables(processFn, []);
//     }

//     // ===== FILTER =====
//     const hasActiveFilter = Object.values(userFilters).some(v =>
//       typeof v === 'object' ? v.startDate || v.endDate : v !== '' && v != null,
//     );

//     if (hasActiveFilter) {
//       tasks = tasks.filter(task => {
//         let datePass = true;
//         let textPass = false;

//         for (const [field, cond] of Object.entries(userFilters)) {
//           if (!cond || (typeof cond === 'object' && !cond.startDate && !cond.endDate)) continue;

//           let raw = task[field] ?? task.variables?.[field];
//           if (typeof raw === 'object' && 'value' in raw) raw = raw.value;

//           if (typeof cond === 'object') {
//             if (!raw) { datePass = false; continue; }

//             const parsed = moment(raw, ['D/M/YYYY', 'DD/MM/YYYY', 'DD-MM-YYYY', moment.ISO_8601]);
//             if (!parsed.isValid()) { datePass = false; continue; }

//             const tsVal = parsed.valueOf();
//             const start = cond.startDate
//               ? moment(cond.startDate, ['D-M-YYYY', 'DD-MM-YYYY', 'DD/MM/YYYY']).startOf('day').valueOf()
//               : null;
//             const end = cond.endDate
//               ? moment(cond.endDate, ['D-M-YYYY', 'DD-MM-YYYY', 'DD/MM/YYYY']).endOf('day').valueOf()
//               : null;

//             if ((start && tsVal < start) || (end && tsVal > end)) datePass = false;
//           } else {
//             if (String(raw ?? '').toLowerCase().includes(String(cond).toLowerCase())) {
//               textPass = true;
//             }
//           }
//         }

//         const hasDate = Object.values(userFilters).some(c => typeof c === 'object' && (c.startDate || c.endDate));
//         const hasText = Object.values(userFilters).some(c => typeof c === 'string' && c !== '');

//         if (hasDate && !datePass) return false;
//         if (hasText && !textPass) return false;
//         return true;
//       });
//     }

//     // ===== SORT =====
//     if (Object.keys(sort).length > 0) {
//       const sortFields = Object.entries(sort);
//       tasks.sort((a, b) => {
//         for (const [field, order] of sortFields) {
//           let va = a[field] ?? a.variables?.[field];
//           let vb = b[field] ?? b.variables?.[field];

//           if (typeof va === 'object' && 'value' in va) va = va.value;
//           if (typeof vb === 'object' && 'value' in vb) vb = vb.value;

//           if (!va) return 1;
//           if (!vb) return -1;

//           const na = Number(va), nb = Number(vb);
//           if (!isNaN(na) && !isNaN(nb) && na !== nb)
//             return (na - nb) * (order === 'asc' ? 1 : -1);

//           const dateFormat = /^\d{2}\/\d{2}\/\d{4}$/;
//           if (dateFormat.test(va) && dateFormat.test(vb)) {
//             const [dA, mA, yA] = va.split('/');
//             const [dB, mB, yB] = vb.split('/');
//             const ta = new Date(`${yA}-${mA}-${dA}`).getTime();
//             const tb = new Date(`${yB}-${mB}-${dB}`).getTime();
//             if (ta !== tb) return (ta - tb) * (order === 'asc' ? 1 : -1);
//           }

//           const sa = String(va).toLowerCase();
//           const sb = String(vb).toLowerCase();
//           if (sa !== sb) return sa < sb ? (order === 'asc' ? -1 : 1) : (order === 'asc' ? 1 : -1);
//         }
//         return 0;
//       });
//     }

//     // ===== PAGINATION =====
//     const totalItems = tasks.length;
//     const totalPages = Math.ceil(totalItems / limit);
//     const data = tasks.slice((page - 1) * limit, page * limit);

//     return { page, limit, totalItems, totalPages, data };
//   }
//   // }

//  async getAllTasks(
//   currentUserId: string,
//   page = 1,
//   limit = 25,
//   search: Record<string, string> = {},
//   sort: Record<string, 'asc' | 'desc'> = {},
//   processFn?: string,
// ) {
//   if (!currentUserId) {
//     throw new HttpException('currentUserId is required', HttpStatus.BAD_REQUEST);
//   }

//   // ---- HÀM TIỆN ÍCH NHỎ ----
//   const applySearch = (tasks: any[]) => {
//     if (!search || Object.keys(search).length === 0) return tasks;
//     const normalized = Object.fromEntries(
//       Object.entries(search).map(([k, v]) => [k, String(v ?? '').toLowerCase()])
//     );
//     return tasks.filter(task =>
//       Object.entries(normalized).some(([field, want]) => {
//         const raw = task[field] ?? task.variables?.[field];
//         if (!raw) return false;
//         const value = typeof raw === 'string' ? raw.toLowerCase() : JSON.stringify(raw).toLowerCase();
//         return value.includes(want);
//       }),
//     );
//   };

//   const applySort = (tasks: any[]) => {
//     if (!sort || Object.keys(sort).length === 0) return tasks;
//     const fields = Object.entries(sort);
//     return tasks.sort((a, b) => {
//       for (const [field, order] of fields) {
//         const va = a[field] ?? a.variables?.[field];
//         const vb = b[field] ?? b.variables?.[field];
//         const na = Number(va), nb = Number(vb);
//         if (!Number.isNaN(na) && !Number.isNaN(nb)) {
//           if (na !== nb) return order === 'asc' ? na - nb : nb - na;
//         } else {
//           const sa = String(va ?? '').toLowerCase();
//           const sb = String(vb ?? '').toLowerCase();
//           if (sa !== sb) return order === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
//         }
//       }
//       return 0;
//     });
//   };

//   const applyPagination = (tasks: any[]) => {
//     const totalItems = tasks.length;
//     const totalPages = Math.max(1, Math.ceil(totalItems / limit));
//     const start = (page - 1) * limit;
//     const end = start + limit;
//     return {
//       page,
//       limit,
//       totalItems,
//       totalPages,
//       data: tasks.slice(start, end),
//     };
//   };

//   // ---- XỬ LÝ CHÍNH ----
//   let tasks: any[] = [];

//   const processIDDoc = processFn
//     ? await this.featureManagementRepo.findOne({
//         where: { code: processFn },
//       })
//     : null;

//   const hasCriteria = processIDDoc?.criteria?.some((c: any) => c.processId);

//   if (hasCriteria) {
//     const criteriaTasks = await this.findSubItemsByCriteriaStatus(processFn as string, currentUserId);
//     tasks = criteriaTasks.map((x: any) => x.data);
//   } else {
//     // Lấy tất cả process song song
//     const allProcesses = await this.featureManagementRepo.find();
//     const followAssignee = allProcesses.filter(p => p.isFollowAssignee);

//     let assigneeTasks: any[] = [];
//     if (followAssignee.length > 0) {
//       assigneeTasks = await this.modelIntrospectService.getTasksByAssignee(currentUserId);
//       assigneeTasks = await this.mapVariablesToTasks(assigneeTasks, this.httpService);
//     }

//     // Loại trùng id nhanh bằng Map
//     const taskMap = new Map<string, any>();
//     for (const proc of allProcesses) {
//       const list = proc.isFollowAssignee ? assigneeTasks : []; // Có thể thêm fetch theo process nếu cần
//       for (const task of list) taskMap.set(task.id, task);
//     }
//     tasks = Array.from(taskMap.values());
//   }

//   // ---- ÁP DỤNG SEARCH + SORT + PAGINATION ----
//   tasks = applySearch(tasks);
//   tasks = applySort(tasks);

//   return applyPagination(tasks);
// }


//   private async fetchProcessVariablesByProcessKey(processKey: string): Promise<any[]> {
//     if (!processKey) throw new Error('processKey is required');

//     // Lấy danh sách processInstanceId theo processKey
//     const processInstancesResp = await firstValueFrom(
//       this.httpService.get(`${process.env.CAMUNDA_MEDIUM}/process-instance`, {
//         params: { processDefinitionKey: processKey },
//       }),
//     );

//     const processInstanceIds = processInstancesResp.data.map((pi: any) => pi.id);
//     if (processInstanceIds.length === 0) return [];

//     // Lấy tất cả biến của các processInstanceId
//     const allVarsResp = await firstValueFrom(
//       this.httpService.post(`${process.env.CAMUNDA_MEDIUM}/variable-instance`, {
//         processInstanceIdIn: processInstanceIds,
//       }),
//     );

//     // Gom nhóm các biến theo processInstanceId
//     const grouped = allVarsResp.data.reduce((acc: any, curr: any) => {
//       const { processInstanceId, name, value, activityInstanceId } = curr;
//       if (!acc[processInstanceId]) {
//         acc[processInstanceId] = {
//           activityInstanceId: processInstanceId,
//           activityInstanceIds: [],
//           variables: {},
//         };
//       }
//       if (activityInstanceId && !acc[processInstanceId].activityInstanceIds.includes(activityInstanceId)) {
//         acc[processInstanceId].activityInstanceIds.push(activityInstanceId);
//       }
//       acc[processInstanceId].variables[name] = value;
//       return acc;
//     }, {});

//     return Object.values(grouped);
//   }

//  async findSubItemsByCriteriaStatus(
//   processFn: string,
//   currentUserId?: string,
// ): Promise<any[]> {
//   if (!processFn) {
//     throw new HttpException('processFn is required', HttpStatus.BAD_REQUEST);
//   }

//   console.log('🔹 processFn:', processFn);
//   // 1️⃣ Lấy document process
//   const processDoc: any = await this.featureManagementRepo.findOne({
//     where: { code: processFn },
//   });

//   console.log('🔹 processDoc:', JSON.stringify(processDoc, null, 2));
//   if (!processDoc) return [];

//   const criteriaList: any[] = processDoc.criteria ?? [];
//   console.log('🔹 criteriaList:', JSON.stringify(criteriaList, null, 2));
//   if (!criteriaList.length) return [];

//   // 2️⃣ Lấy tasks theo assignee nếu cần
//   let assigneeTasks: any[] = [];
//   let assigneeSet: Set<string> | null = null;
//   if (processDoc?.isFollowAssignee) {
//     if (!currentUserId) {
//       throw new HttpException('currentUserId is required for isFollowAssignee', HttpStatus.BAD_REQUEST);
//     }

//     console.log('🔹 isFollowAssignee = true → lấy task theo assignee:', currentUserId);

//     assigneeTasks = await this.modelIntrospectService.getTasksByAssignee(currentUserId);
//     assigneeTasks = await this.mapVariablesToTasks(assigneeTasks, this.httpService);
//     console.log('🔹 tasks theo assignee:', assigneeTasks.length);

//     assigneeSet = new Set(
//       assigneeTasks
//         .map(t => t.activityInstanceId)
//         .filter((id): id is string => !!id)
//     );
//   }

//   // 3️⃣ Lấy unique processId để fetch song song
//   const uniqueProcessIds: string[] = Array.from(
//     new Set(
//       criteriaList
//         .map(c => c.processId)
//         .filter((id): id is string => !!id)
//     )
//   );

//   // 4️⃣ Fetch tất cả processId song song
//   const allProcessData = await Promise.all(
//     uniqueProcessIds.map(pid => this.fetchProcessVariablesByProcessKey(pid))
//   );

//   // 5️⃣ Map processId -> docs
//   const processDocsMap = new Map<string, any[]>();
//   allProcessData.forEach((docs, index) => {
//     const pid = uniqueProcessIds[index];
//     processDocsMap.set(pid, docs);
//   });

//   // 6️⃣ Lọc dữ liệu giống logic cũ
//   const finalResults: any[] = [];

//   for (const item of criteriaList) {
//     const statusValue = item.value;
//     const processId = item.processId;

//     console.log('  🔸 criteria item:', item);
//     console.log('    processId:', processId, 'statusValue:', statusValue);

//     if (!processId) continue;

//     const relatedDocs = processDocsMap.get(processId) ?? [];
//     console.log('🔹 related docs:', relatedDocs.length);

//     for (const doc of relatedDocs) {
//       const docStatus = doc.variables?.status ?? doc.valueField?.status ?? doc.status ?? null;

//       if (String(docStatus) === String(statusValue)) {
//         if (processDoc?.isFollowAssignee && assigneeSet) {
//           if (assigneeSet.has(doc.activityInstanceId)) {
//             finalResults.push({ data: doc });
//           }
//         } else {
//           finalResults.push({ data: doc });
//         }
//       }
//     }
//   }

//   console.log('🔹 final results:', finalResults.length);
//   return finalResults;
// }









// }
