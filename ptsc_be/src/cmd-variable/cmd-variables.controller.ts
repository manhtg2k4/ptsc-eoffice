// import {
//   BadRequestException,
//   Body,
//   Controller,
//   Delete,
//   Get,
//   HttpStatus,
//   NotFoundException,
//   Param,
//   Post,
//   Put,
//   Res,
//   Query,
//   InternalServerErrorException,
//   Req,
//   UseGuards,
//   HttpException,
// } from '@nestjs/common';
// import { CamundaVariableService } from './cmd-variable.service';
// import { HttpService } from '@nestjs/axios';
// import { firstValueFrom } from 'rxjs';
// import { InjectModel } from '@nestjs/mongoose';
// import { FeatureManagementEntity
// } from 'src/feature-management/feature-management.entity';
// import { Model } from 'mongoose';
// import { FeatureManagementService } from 'src/feature-management/feature-management.service';
// import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';
// import * as moment from 'moment';
// import axios from 'axios';

// import { Response } from 'express';
// import * as ExcelJS from 'exceljs';
// import { administrativeProcedureCategory, administrativeProcedureCategoryDocument } from 'src/administrative-procedure-category/administrative-procedure-category.schema';
// import { CamundaVariable } from './cmd-variable.schema';
// import { ProfileManagement, ProfileManagementDocument } from 'src/profile-management/profile-management.schema';
// import { fondsCatalog, fondsCatalogDocument } from 'src/fonds-catalog/fonds-catalog.schema';
// import { Citizen, CitizenDocument } from 'src/info-citizen/info-citizen.schema';
// import { administrativeProcedureFieldCategory, administrativeProcedureFieldCategoryDocument } from 'src/administrative-procedure-field-category/administrative-procedure-field-category.schema';
// import { fileManager, fileManagerDocument } from 'src/file-manager/file-manager.schema';
// import { CommonCategory, CommonCategoryDocument } from 'src/common-categories/common-categories.schema';
// import { JwtAuthGuard } from 'src/oauth/jwt.guard';

// import { CollectionManagement, CollectionManagementDocument } from 'src/collection-management/collection-management.schema';
// import { User, UserDocument } from 'src/user/user.schema';
// import { OrganizationUnit, OrganizationUnitDocument } from 'src/organization-unit/organization-unit.schema';
// import { administrativeProcedureResultCategory, administrativeProcedureResultCategoryDocument } from 'src/administrative-procedure-result-category/administrative-procedure-result-category.schema';
// import { RoomInWarehouse, RoomInWarehouseDocument } from 'src/roomInWarehouse/roomInWarehouse.schema';
// import { ShelfManagement, ShelfManagementDocument } from 'src/shelf-management/shelf-management.schema';
// import { BoxManagement, BoxManagementDocument } from 'src/box-management/box-management.schema';
// import { Floor, FloorDocument } from 'src/shelf-management/floor.schema';
// // import { Compartment } from 'src/shelf-management/box.schema';
// import { Warehouse, WarehouseDocument } from 'src/warehouse/warehouse.schema';
// import { Compartment, CompartmentDocument } from 'src/shelf-management/compartment.schema';
// import { Enterprise, EnterpriseDocument } from 'src/info-enterprise/info-enterprise.schema';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// // import { OrganizationUnit, OrganizationUnitDocument } from 'src/organization-unit/organization-unit.schema';
// @Controller('variables')
// export class ProcessVariablesController {
//   constructor(
//     private readonly service: CamundaVariableService,
//     private readonly httpService: HttpService,
//     // @InjectModel(FeatureManagement.name)
//     // private featureManagementRepo: Model<FeatureManagementDocument>, 
//     @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
//     private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
//     @InjectRepository(BpmnDesignEntity, 'mssqlConnection')
//     private readonly bpmnDesignModel: Repository<BpmnDesignEntity>,
//     @InjectModel(administrativeProcedureCategory.name)
//     private administrativeProcedureCategoryModel: Model<administrativeProcedureCategoryDocument>,
//     @InjectModel(ProfileManagement.name)
//     private profileManagementModel: Model<ProfileManagementDocument>,
//     @InjectModel(fondsCatalog.name)
//     private fondsCatalogModel: Model<fondsCatalogDocument>,
//     @InjectModel(Citizen.name)
//     private citizenModel: Model<CitizenDocument>,
//     @InjectModel(Enterprise.name)
//     private enterpriseModel: Model<EnterpriseDocument>,
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

//   private async fetchProcessVariables(
//     processFn: string,
//     variableValues: any[],
//   ): Promise<any[]> {

//     // Lấy processID
//     const processIDDoc =await this.featureManagementRepo.findOne({
//       where: { code: processFn }
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
//    const citizenIds = result
//   .map((r: any) => r.variables?.citizen)
//   .filter((id: string) => id && id.length === 24);

//   if (citizenIds.length > 0) {
//     const citizenDocs = await this.citizenModel
//       .find({ _id: { $in: citizenIds } })
//       .select('_id fullName')
//       .lean();

//     const citizenMap = citizenDocs.reduce((acc, doc) => {
//       acc[doc._id.toString()] = doc.fullName;
//       return acc;
//     }, {} as Record<string, string>);

//     result = result.map((item: any) => {
//       const vars = { ...item.variables };
//       const citizenId = vars.citizen; // luôn lấy ID gốc

//       if (citizenId) {
//         vars.citizenId = citizenId; // ✅ luôn có citizenId
//         vars.citizen = citizenMap[citizenId] || vars.citizen; // ✅ đổi sang fullName nếu có, không thì giữ nguyên ID
//       }

//       return { ...item, variables: vars };
//     });
//   }

//     // Map 'enterprise' ID to enterprise name
//     const enterpriseIds = result
//       .map((r: any) => r.variables?.enterprise)
//       .filter((id: string) => id && id.length === 24);

//     if (enterpriseIds.length > 0) {
//       const enterpriseDocs = await this.enterpriseModel
//         .find({ _id: { $in: enterpriseIds } })
//         .select('_id name')
//         .lean();

//       const enterpriseMap = enterpriseDocs.reduce((acc, doc) => {
//         acc[doc._id.toString()] = doc.name;
//         return acc;
//       }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         const enterpriseId = vars.enterprise; // Lấy ID gốc

//         if (enterpriseId && enterpriseMap[enterpriseId]) {
//           vars.enterprise = enterpriseMap[enterpriseId]; // Đổi sang name nếu có
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


//   @Post()
//   async getVariablesList(
//     @Query('page') rawPage?: string,
//     @Query('limit') rawLimit?: string,
//     @Body() body: Record<string, any> = {},
//   ) {
//     const { processFn, variableValues, activityInstanceIdFilter, userFilters, sort } = body;

//     let result: any[] = [];

//     if (processFn === process.env.DSHS_BIEN_NHAN_FN) { // 'dshsbiennhan'
//       // Kiểm tra sự tồn tại của các biến môi trường cần thiết
//       const danhSachHoSoFn = process.env.DANH_SACH_HO_SO_FN;
//       const dsHoSoDoanhNghiepFn = process.env.DS_HO_SO_DOANH_NGHIEP_FN;

//       if (!danhSachHoSoFn || !dsHoSoDoanhNghiepFn) {
//         throw new BadRequestException(
//           'Missing required environment variables for combined process.',
//         );
//       }

//       // Nếu là 'dshsbiennhan', lấy dữ liệu từ 2 quy trình khác và gộp lại hồ sơ và doanh nghiep
//       const [danhsachhosoData] = await Promise.all([
//         this.fetchProcessVariables(danhSachHoSoFn, variableValues),
//         // this.fetchProcessVariables(dsHoSoDoanhNghiepFn, variableValues),
//       ]);
//       result = [...danhsachhosoData];
//     } else {
//       // Trường hợp thông thường
//       result = await this.fetchProcessVariables(processFn, variableValues);
//     }


//     // Bỏ dấu để filter
//     function removeAccents(str: string): string {
//       return str
//         ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
//         : '';
//     }
//     type DateFilter = { startDate: string; endDate: string };
//     if (userFilters && typeof userFilters === 'object') {
//       const filters = Object.entries(userFilters).filter(([, value]) => {

//         if (typeof value === 'string') return value.trim() !== '';

//         if (typeof value === 'number') return true;

//         return value !== null && value !== undefined;
//       });

//       // Chỉ thực hiện lọc nếu có ít nhất một filter hợp lệ
//       if (filters.length > 0) {
//         result = result.filter((item: any) => {
//           return filters.some(([key, value]) => {
//             // Xử lý logic đặc biệt cho trường 'characters'
//             if (key === 'characters') {
//               if (String(value) === '0') {
//                 // Nếu filter là "0", hiển thị các bản ghi không có characters = 1
//                 return item.variables.characters != 1;
//               }
//             }

//             const fieldValue = item.variables[key];

//             // Nếu giá trị filter là null, trả về true cho các bản ghi không có trường hoặc trường có giá trị null/undefined
//             if (value === null) {
//               return fieldValue === null || fieldValue === undefined || !item.variables.hasOwnProperty(key);
//             }

//             // Nếu không tìm thấy giá trị trong bản ghi và đang không tìm null, return false
//             if (fieldValue == null) return false;

//             // Date range filter
//             if (typeof value === 'object' && value !== null && 'startDate' in value && 'endDate' in value) {
//               const { startDate, endDate } = value as DateFilter;
//               const fieldDate = moment(fieldValue, 'DD/MM/YYYY', true);
//               const start = moment(startDate);
//               const end = moment(endDate);
//               return fieldDate.isValid() && fieldDate.isBetween(start, end, 'day', '[]');
//             }

//             // Exact match for numbers and booleans, includes for strings
//             if (typeof fieldValue === 'string') {
//               return removeAccents(String(fieldValue)).includes(removeAccents(String(value)));
//             }
//             return fieldValue == value;
//           });
//         });
//       }
//     }


//     // Filter activityInstanceId
//     if (activityInstanceIdFilter) {
//       result = result.filter(
//         (item: any) => item.activityInstanceId === activityInstanceIdFilter,
//       );
//     }

//     let sortObject = sort;
//     if (sort && typeof sort === 'string') {
//       try {
//         sortObject = JSON.parse(sort);
//       } catch (e) {
//         console.error("Lỗi khi parse sort JSON:", e);
//         sortObject = null; // hoặc xử lý lỗi theo cách khác
//       }
//     }
//     // 👉 SORT theo 1 cột duy nhất (frontend gửi)
//     let finalSortObject = sortObject;
//     // Kiểm tra nếu có object lồng nhau { sort: { ... } }
//     if (finalSortObject && typeof finalSortObject === 'object' && finalSortObject.sort && typeof finalSortObject.sort === 'object') {
//       finalSortObject = finalSortObject.sort;
//     }

//     if (finalSortObject && typeof finalSortObject === 'object' && Object.keys(finalSortObject).length > 0) {
//       const [[field, order]] = Object.entries(finalSortObject); // lấy cột đầu tiên
//       result.sort((a: any, b: any) => {
//         const valA = a.variables?.[field] || '';
//         const valB = b.variables?.[field] || '';

//         const cmp = String(valA).localeCompare(String(valB), 'vi', { sensitivity: 'base' });
//         return order === -1 ? -cmp : cmp; // -1: desc, 1: asc
//       });

//     }
//     // helper: convert -> positive int, fallback default
//     const toPositiveInt = (v: any, def: number) => {
//       const n = parseInt(String(v ?? ''), 10);
//       return Number.isFinite(n) && n > 0 ? n : def;
//     };

//     const page = toPositiveInt(rawPage, 1);
//     const limit = toPositiveInt(rawLimit, 10);

//     // ... (phần lấy result, filter, sort giống cũ)

//     // Pagination
//     const totalItems = result.length;
//     const totalPages = Math.ceil(totalItems / limit);
//     const startIndex = (page - 1) * limit;
//     const pagedData = result.slice(startIndex, startIndex + limit);
//     return {
//       page,
//       limit,
//       totalItems,
//       totalPages,
//       data: pagedData,
//     };
//   }
//   @Post('list-dashboards')
//   async getVariablesListDashboard(
//     @Query('page') rawPage?: string,
//     @Query('limit') rawLimit?: string,
//     @Body() body: Record<string, any> = {},
//   ) {
//     const { processFn, variableValues, activityInstanceIdFilter, userFilters, sort } = body;

//     let result: any[] = [];

//     if (processFn === process.env.DSHS_BIEN_NHAN_FN) { // 'dshsbiennhan'
//       // Kiểm tra sự tồn tại của các biến môi trường cần thiết
//       const danhSachHoSoFn = process.env.DANH_SACH_HO_SO_FN;
//       const dsHoSoDoanhNghiepFn = process.env.DS_HO_SO_DOANH_NGHIEP_FN;

//       if (!danhSachHoSoFn || !dsHoSoDoanhNghiepFn) {
//         throw new BadRequestException(
//           'Missing required environment variables for combined process.',
//         );
//       }

//       // Nếu là 'dshsbiennhan', lấy dữ liệu từ 2 quy trình khác và gộp lại hồ sơ và doanh nghiep
//       const [danhsachhosoData] = await Promise.all([
//         this.fetchProcessVariables(danhSachHoSoFn, variableValues),
//         // this.fetchProcessVariables(dsHoSoDoanhNghiepFn, variableValues),
//       ]);
//       result = [...danhsachhosoData];
//     } else {
//       // Trường hợp thông thường
//       result = await this.fetchProcessVariables(processFn, variableValues);
//     }


//     // Bỏ dấu để filter
//     function removeAccents(str: string): string {
//       return str
//         ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
//         : '';
//     }
//     type DateFilter = { startDate: string; endDate: string };
//     if (userFilters && typeof userFilters === 'object') {
//       const filters = Object.entries(userFilters).filter(([, value]) => {

//         if (typeof value === 'string') return value.trim() !== '';

//         if (typeof value === 'number') return true;

//         return value !== null && value !== undefined;
//       });

//       // Chỉ thực hiện lọc nếu có ít nhất một filter hợp lệ
//       if (filters.length > 0) {
//         result = result.filter((item: any) => {
//           return filters.every(([key, value]) => {
//             // Xử lý logic đặc biệt cho trường 'characters'
//             if (key === 'characters') {
//               if (String(value) === '0') {
//                 // Nếu filter là "0", hiển thị các bản ghi không có characters = 1
//                 return item.variables.characters != 1;
//               }
//             }

//             const fieldValue = item.variables[key];

//             // Nếu giá trị filter là null, trả về true cho các bản ghi không có trường hoặc trường có giá trị null/undefined
//             if (value === null) {
//               return fieldValue === null || fieldValue === undefined || !item.variables.hasOwnProperty(key);
//             }

//             // Nếu không tìm thấy giá trị trong bản ghi và đang không tìm null, return false
//             if (fieldValue == null) return false;

//             // Date range filter
//             if (typeof value === 'object' && value !== null && 'startDate' in value && 'endDate' in value) {
//               const { startDate, endDate } = value as DateFilter;
//               const fieldDate = moment(fieldValue, 'DD/MM/YYYY', true);
//               const start = moment(startDate);
//               const end = moment(endDate);
//               return fieldDate.isValid() && fieldDate.isBetween(start, end, 'day', '[]');
//             }

//             // Exact match for numbers and booleans, includes for strings
//             if (typeof fieldValue === 'string') {
//               return removeAccents(String(fieldValue)).includes(removeAccents(String(value)));
//             }
//             return fieldValue == value;
//           });
//         });
//       }
//     }


//     // Filter activityInstanceId
//     if (activityInstanceIdFilter) {
//       result = result.filter(
//         (item: any) => item.activityInstanceId === activityInstanceIdFilter,
//       );
//     }
//     // 👉 SORT theo 1 cột duy nhất (frontend gửi)
//     if (sort && typeof sort === 'object' && sort !== null) {
//       const [[field, order]] = Object.entries(sort); // lấy cột đầu tiên
//       result.sort((a: any, b: any) => {
//         const valA = a.variables?.[field] || '';
//         const valB = b.variables?.[field] || '';
//         const cmp = String(valA).localeCompare(String(valB), 'vi', { sensitivity: 'base' });
//         return order === -1 ? -cmp : cmp; // -1: desc, 1: asc
//       });

//     }
//     // helper: convert -> positive int, fallback default
//     const toPositiveInt = (v: any, def: number) => {
//       const n = parseInt(String(v ?? ''), 10);
//       return Number.isFinite(n) && n > 0 ? n : def;
//     };

//     const page = toPositiveInt(rawPage, 1);
//     const limit = toPositiveInt(rawLimit, 10);

//     // ... (phần lấy result, filter, sort giống cũ)

//     // Pagination
//     const totalItems = result.length;
//     const totalPages = Math.ceil(totalItems / limit);
//     const startIndex = (page - 1) * limit;
//     const pagedData = result.slice(startIndex, startIndex + limit);
//     return {
//       page,
//       limit,
//       totalItems,
//       totalPages,
//       data: pagedData,
//     };
//   }
//   @Get('list-variables')
//   async getVariablesList2(
//     @Query('page') rawPage?: string,
//     @Query('limit') rawLimit?: string,
//     @Query('processFn') processFn?: string,
//     @Query('variableValues') variableValuesStr?: string,
//     @Query('activityInstanceIdFilter') activityInstanceIdFilter?: string,
//     @Query('userFilters') userFiltersStr?: string,
//     @Query('sort') sortStr?: string,
//   ) {
//     // Parse query parameters safely
//     let variableValues;
//     let userFilters;
//     let sort;
    
//     try {
//       variableValues = variableValuesStr ? JSON.parse(variableValuesStr) : undefined;
//     } catch (e) {
//       throw new BadRequestException('Invalid JSON in variableValues parameter');
//     }
    
//     try {
//       userFilters = userFiltersStr ? JSON.parse(userFiltersStr) : undefined;
//     } catch (e) {
//       throw new BadRequestException('Invalid JSON in userFilters parameter');
//     }
    
//     try {
//       sort = sortStr ? JSON.parse(sortStr) : undefined;
//     } catch (e) {
//       throw new BadRequestException('Invalid JSON in sort parameter');
//     }

//     // Kiểm tra processFn bắt buộc
//     if (!processFn) {
//       throw new BadRequestException('Missing processFn parameter');
//     }

//     let result: any[] = [];

//     if (processFn === process.env.DSHS_BIEN_NHAN_FN) { // 'dshsbiennhan'
//       // Kiểm tra sự tồn tại của các biến môi trường cần thiết
//       const danhSachHoSoFn = process.env.DANH_SACH_HO_SO_FN;
//       const dsHoSoDoanhNghiepFn = process.env.DS_HO_SO_DOANH_NGHIEP_FN;

//       if (!danhSachHoSoFn || !dsHoSoDoanhNghiepFn) {
//         throw new BadRequestException(
//           'Missing required environment variables for combined process.',
//         );
//       }

//       // Nếu là 'dshsbiennhan', lấy dữ liệu từ 2 quy trình khác và gộp lại hồ sơ và doanh nghiep
//       const [danhsachhosoData] = await Promise.all([
//         this.fetchProcessVariables(danhSachHoSoFn, variableValues),
//         // this.fetchProcessVariables(dsHoSoDoanhNghiepFn, variableValues),
//       ]);
//       result = [...danhsachhosoData];
//     } else {
//       // Trường hợp thông thường
//       result = await this.fetchProcessVariables(processFn, variableValues);
//     }


//     // Bỏ dấu để filter
//     function removeAccents(str: string): string {
//       return str
//         ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
//         : '';
//     }
//     type DateFilter = { startDate: string; endDate: string };
//     if (userFilters && typeof userFilters === 'object') {
//       const filters = Object.entries(userFilters).filter(([, value]) => {

//         if (typeof value === 'string') return value.trim() !== '';

//         if (typeof value === 'number') return true;

//         return value !== null && value !== undefined;
//       });

//       // Chỉ thực hiện lọc nếu có ít nhất một filter hợp lệ
//       if (filters.length > 0) {
//         result = result.filter((item: any) => {
//           return filters.some(([key, value]) => {
//             // Xử lý logic đặc biệt cho trường 'characters'
//             if (key === 'characters') {
//               if (String(value) === '0') {
//                 // Nếu filter là "0", hiển thị các bản ghi không có characters = 1
//                 return item.variables.characters != 1;
//               }
//             }

//             const fieldValue = item.variables[key];

//             // Nếu giá trị filter là null, trả về true cho các bản ghi không có trường hoặc trường có giá trị null/undefined
//             if (value === null) {
//               return fieldValue === null || fieldValue === undefined || !item.variables.hasOwnProperty(key);
//             }

//             // Nếu không tìm thấy giá trị trong bản ghi và đang không tìm null, return false
//             if (fieldValue == null) return false;

//             // Date range filter
//             if (typeof value === 'object' && value !== null && 'startDate' in value && 'endDate' in value) {
//               const { startDate, endDate } = value as DateFilter;
//               const fieldDate = moment(fieldValue, 'DD/MM/YYYY', true);
//               const start = moment(startDate);
//               const end = moment(endDate);
//               return fieldDate.isValid() && fieldDate.isBetween(start, end, 'day', '[]');
//             }

//             // Exact match for numbers and booleans, includes for strings
//             if (typeof fieldValue === 'string') {
//               return removeAccents(String(fieldValue)).includes(removeAccents(String(value)));
//             }
//             return fieldValue == value;
//           });
//         });
//       }
//     }


//     // Filter activityInstanceId
//     if (activityInstanceIdFilter) {
//       result = result.filter(
//         (item: any) => item.activityInstanceId === activityInstanceIdFilter,
//       );
//     }

//     let sortObject = sort;
//     if (sort && typeof sort === 'string') {
//       try {
//         sortObject = JSON.parse(sort);
//       } catch (e) {
//         console.error("Lỗi khi parse sort JSON:", e);
//         sortObject = null; // hoặc xử lý lỗi theo cách khác
//       }
//     }
//     // 👉 SORT theo 1 cột duy nhất (frontend gửi)
//     let finalSortObject = sortObject;
//     // Kiểm tra nếu có object lồng nhau { sort: { ... } }
//     if (finalSortObject && typeof finalSortObject === 'object' && finalSortObject.sort && typeof finalSortObject.sort === 'object') {
//       finalSortObject = finalSortObject.sort;
//     }

//     if (finalSortObject && typeof finalSortObject === 'object' && Object.keys(finalSortObject).length > 0) {
//       const [[field, order]] = Object.entries(finalSortObject); // lấy cột đầu tiên
//       result.sort((a: any, b: any) => {
//         const valA = a.variables?.[field] || '';
//         const valB = b.variables?.[field] || '';

//         const cmp = String(valA).localeCompare(String(valB), 'vi', { sensitivity: 'base' });
//         return order === -1 ? -cmp : cmp; // -1: desc, 1: asc
//       });

//     }
//     // helper: convert -> positive int, fallback default
//     const toPositiveInt = (v: any, def: number) => {
//       const n = parseInt(String(v ?? ''), 10);
//       return Number.isFinite(n) && n > 0 ? n : def;
//     };

//     const page = toPositiveInt(rawPage, 1);
//     const limit = toPositiveInt(rawLimit, 10);

//     // ... (phần lấy result, filter, sort giống cũ)

//     // Pagination
//     const totalItems = result.length;
//     const totalPages = Math.ceil(totalItems / limit);
//     const startIndex = (page - 1) * limit;
//     const pagedData = result.slice(startIndex, startIndex + limit);
//     return {
//       page,
//       limit,
//       totalItems,
//       totalPages,
//       data: pagedData,
//     };
//   }

//   @Get('list-all-variables')
//   async getAllVariables(
//     @Query('page') rawPage?: string,
//     @Query('limit') rawLimit?: string,
//     @Query('variableValues') variableValuesStr?: string,
//     @Query('userFilters') userFiltersStr?: string,
//     @Query('sort') sortStr?: string,
//   ) {
//     // Parse query params
//     const variableValues = variableValuesStr ? JSON.parse(variableValuesStr) : undefined;
//     const userFilters = userFiltersStr ? JSON.parse(userFiltersStr) : undefined;
//     const sort = sortStr ? JSON.parse(sortStr) : undefined;

//     let result: any[] = [];

//     // Gom tất cả process cần thiết
//     const processFns = [
//       process.env.DANH_SACH_HO_SO_FN,
//       process.env.DS_HO_SO_DOANH_NGHIEP_FN,
//       process.env.DSHS_BIEN_NHAN_FN,
//     ].filter(Boolean); // bỏ cái nào undefined
//     console.log('🚀 processFns loaded from .env:', processFns);
//     if (processFns.length === 0) {
//       throw new BadRequestException('Missing required environment variables for processes.');
//     }

//     // Lấy dữ liệu từ tất cả process song song
//     const allResults = await Promise.all(
//       processFns.map((fn: string) => this.fetchProcessVariables(fn, variableValues || [])),
//     );

//     // Gộp tất cả lại
//     result = allResults.flat();

//     // Map sang dạng phẳng
//     result = result.map((item: any) => ({
//       activityInstanceId: item.activityInstanceId,
//       processFn: item.processFn || null, // thêm để biết từ quy trình nào
//       ...item.variables,
//     }));

//     // Helper bỏ dấu
//     function removeAccents(str: string): string {
//       return str
//         ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
//         : '';
//     }

//     type DateFilter = { startDate: string; endDate: string };

//     // User filters
//     if (userFilters && typeof userFilters === 'object') {
//       const filters = Object.entries(userFilters).filter(([, value]) => {
//         if (typeof value === 'string') return value.trim() !== '';
//         if (typeof value === 'number') return true;
//         return value !== null && value !== undefined;
//       });

//       if (filters.length > 0) {
//         result = result.filter((item: any) => {
//           return filters.some(([key, value]) => {
//             const fieldValue = item[key];
//             if (fieldValue == null) return false;

//             // Date range filter
//             if (typeof value === 'object' && value !== null && 'startDate' in value && 'endDate' in value) {
//               const { startDate, endDate } = value as DateFilter;
//               const parsedFieldDate = moment(fieldValue, 'DD/MM/YYYY', true);
//               const start = moment(startDate);
//               const end = moment(endDate);
//               return parsedFieldDate.isValid() && parsedFieldDate.isBetween(start, end, 'day', '[]');
//             }

//             // String filter có bỏ dấu
//             if (typeof fieldValue === 'string') {
//               return removeAccents(String(fieldValue)).includes(removeAccents(String(value)));
//             }
//             return fieldValue == value;
//           });
//         });
//       }
//     }

//     // Sort
//     if (sort && typeof sort === 'object' && sort !== null) {
//       const [[field, order]] = Object.entries(sort);
//       result.sort((a: any, b: any) => {
//         const valA = a[field] || '';
//         const valB = b[field] || '';
//         const cmp = String(valA).localeCompare(String(valB), 'vi', { sensitivity: 'base' });
//         return order === -1 ? -cmp : cmp;
//       });
//     }

//     const toPositiveInt = (v: any, def: number) => {
//       const n = parseInt(String(v ?? ''), 10);
//       return Number.isFinite(n) && n > 0 ? n : def;
//     };

//     const page = toPositiveInt(rawPage, 1);
//     const limit = toPositiveInt(rawLimit, 10);

//     const totalItems = result.length;
//     const totalPages = Math.ceil(totalItems / limit);
//     const startIndex = (page - 1) * limit;
//     const pagedData = result.slice(startIndex, startIndex + limit);

//     return {
//       page,
//       limit,
//       totalItems,
//       totalPages,
//       data: pagedData,
//     };
//   }



//   @Post('list-variables-document')
//   async getVariablesListsDocument(
//     @Query('page') rawPage?: string,
//     @Query('limit') rawLimit?: string,
//     @Body() body: Record<string, any> = {},
//   ) {
//     const { processFn, variableValues, activityInstanceIdFilter, userFilters, sort } = body;
//     let result: any[] = [];

//     // --- Helper functions ---
//     const removeAccents = (str: string): string =>
//       str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';

//     const toPositiveInt = (v: any, def: number) => {
//       const n = parseInt(String(v ?? ''), 10);
//       return Number.isFinite(n) && n > 0 ? n : def;
//     };

//     const parseSortObject = (input: any): Record<string, number> | null => {
//       if (!input) return null;
//       if (typeof input === 'object') return input;
//       if (typeof input === 'string') {
//         try {
//           return JSON.parse(input);
//         } catch (e) {
//           console.error("Lỗi khi parse sort JSON:", e);
//           return null;
//         }
//       }
//       return null;
//     };

//     const matchesFilter = (item: any, filters: [string, any][]) => {
//       return filters.some(([key, value]) => {
//         if (key === 'characters' && String(value) === '0') {
//           return item.variables.characters != 1;
//         }

//         const fieldValue = item.variables?.[key];
//         if (fieldValue == null) return false;

//         // --- Date range filter ---
//         if (typeof value === 'object' && value?.startDate && value?.endDate) {
//           const fieldDate = moment(fieldValue, 'DD/MM/YYYY', true);
//           return (
//             fieldDate.isValid() &&
//             fieldDate.isBetween(moment(value.startDate), moment(value.endDate), 'day', '[]')
//           );
//         }

//         // --- String includes / exact compare ---
//         if (typeof fieldValue === 'string') {
//           return removeAccents(fieldValue).includes(removeAccents(String(value)));
//         }
//         return fieldValue == value;
//       });
//     };

//     const sortByField = (arr: any[], sort: Record<string, number>) => {
//       const [[field, order]] = Object.entries(sort);
//       return arr.sort((a, b) => {
//         const valA = a.variables?.[field] || '';
//         const valB = b.variables?.[field] || '';
//         const momentA = moment(valA, 'DD/MM/YYYY', true);
//         const momentB = moment(valB, 'DD/MM/YYYY', true);

//         if (momentA.isValid() && momentB.isValid()) {
//           const diff = momentA.diff(momentB);
//           return order === -1 ? -diff : diff;
//         }
//         const cmp = String(valA).localeCompare(String(valB), 'vi', { sensitivity: 'base' });
//         return order === -1 ? -cmp : cmp;
//       });
//     };

//     // --- Fetch data ---
//     if (processFn === process.env.DSHS_BIEN_NHAN_FN) {
//       const danhSachHoSoFn = process.env.DANH_SACH_HO_SO_FN;
//       const dsHoSoDoanhNghiepFn = process.env.DS_HO_SO_DOANH_NGHIEP_FN;

//       if (!danhSachHoSoFn || !dsHoSoDoanhNghiepFn) {
//         throw new BadRequestException('Missing required environment variables for combined process.');
//       }

//       const [danhsachhosoData] = await Promise.all([
//         this.fetchProcessVariables(danhSachHoSoFn, variableValues),
//         // Có thể mở lại dòng dưới nếu cần gộp dữ liệu doanh nghiệp
//         // this.fetchProcessVariables(dsHoSoDoanhNghiepFn, variableValues),
//       ]);

//       result = [...danhsachhosoData];
//     } else {
//       result = await this.fetchProcessVariables(processFn, variableValues);
//     }

//     // --- Apply user filters ---
//     if (userFilters && typeof userFilters === 'object') {
//       const activeFilters = Object.entries(userFilters).filter(([, val]) =>
//         typeof val === 'string' ? val.trim() !== '' : val != null,
//       );
//       if (activeFilters.length) {
//         result = result.filter((item) => matchesFilter(item, activeFilters));
//       }
//     }

//     // --- Filter by activityInstanceId ---
//     if (activityInstanceIdFilter) {
//       result = result.filter((r) => r.activityInstanceId === activityInstanceIdFilter);
//     }

//     // --- Sort ---
//     const sortObject = parseSortObject(sort);
//     if (sortObject) result = sortByField(result, sortObject);

//     // --- Pagination ---
//     const page = toPositiveInt(rawPage, 1);
//     const limit = toPositiveInt(rawLimit, 10);
//     const totalItems = result.length;
//     const totalPages = Math.ceil(totalItems / limit);
//     const startIndex = (page - 1) * limit;
//     const pagedData = result.slice(startIndex, startIndex + limit);

//     // --- Return ---
//     return {
//       page,
//       limit,
//       totalItems,
//       totalPages,
//       data: pagedData,
//     };
//   }





//   @Post('list-document')
//   async getVariablesListDocument(
//     @Query('page') rawPage?: string,
//     @Query('limit') rawLimit?: string,
//     @Body() body: Record<string, any> = {},
//   ) {
//     const { processFn, variableValues, activityInstanceIdFilter, userFilters, sort } = body;

//     // Lấy processID
//     const processIDDoc = await this.featureManagementRepo.findOne({
//       where: { code: processFn }
//     });
//     const processID = processIDDoc?.processID;

//     // Merge variableValues + criteria
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
//     if (processInstanceIds.length === 0) return { data: [], total: 0 };

//     // Bước 1: lọc activityInstanceId theo điều kiện variableValues
//     let filteredActivityIds: string[] = [];
//     if (mergedVariableValues.length > 0) {
//       const filterResp = await firstValueFrom(
//         this.httpService.post(`${process.env.CAMUNDA_MEDIUM}/variable-instance`, {
//           processInstanceIdIn: processInstanceIds,
//           variableValues: mergedVariableValues,
//         }),
//       );
//       filteredActivityIds = filterResp.data.map((v: any) => v.activityInstanceId);
//     } else {
//       filteredActivityIds = processInstanceIds;
//     }
//     if (filteredActivityIds.length === 0) return { data: [], total: 0 };

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

//     // Lấy tất cả các loại TTHC để tra cứu code và name
//     const allTthcDocs = await this.administrativeProcedureCategoryModel
//       .find({})
//       .select('_id name code')
//       .lean();
//     const allTthcMap = allTthcDocs.reduce((acc, doc) => {
//       acc[doc._id.toString()] = { name: doc.name, code: doc.code };
//       return acc;
//     }, {} as Record<string, { name: string, code: string }>);

//     if (tthcIds.length > 0) {
//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         const tthcId = vars.tthcType;

//         // Lưu lại ID gốc để filter
//         if (tthcId && tthcId.length === 24) {
//           vars.originalTthcTypeId = tthcId;
//         }

//         // Thay thế ID bằng name để hiển thị
//         if (tthcId && allTthcMap[tthcId]) {
//           vars.tthcType = allTthcMap[tthcId].name;
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     // Bỏ dấu để filter
//     function removeAccents(str: string): string {
//       return str
//         ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
//         : '';
//     }
//     type DateRangeFilter = { startDate: string; endDate: string };
//     type PeriodFilter = { year?: string | number; month?: string | number; week?: string | number; quarter?: string | number };
//     if (userFilters && typeof userFilters === 'object') {
//       const allFilters = Object.entries(userFilters);

//       // Tách riêng filter cho string và date
//       const stringFilters = allFilters.filter(([, value]) => typeof value === 'string' && value.trim() !== '');
//       const dateRangeFilters = allFilters.filter(([, value]) =>
//         typeof value === 'object' && value !== null && 'startDate' in value && 'endDate' in value && !('year' in value)
//       );
//       // const tthcTypeFilter = allFilters.find(([key, value]) => key === 'tthcType' && typeof value === 'string' && value.trim() !== '');
//       // const otherStringFilters = stringFilters.filter(([key]) => key !== 'tthcType');


//       const periodFilters = allFilters.filter(([, value]) =>
//         typeof value === 'object' && value !== null && ('year' in value || 'month' in value || 'week' in value || 'quarter' in value)
//       );

//       result = result.filter((item: any) => {
//         if (dateRangeFilters.length > 0) {
//           const dateRangeMatch = dateRangeFilters.every(([key, value]) => {
//             const { startDate, endDate } = value as DateRangeFilter;
//             const fieldValue = item.variables[key];
//             if (fieldValue == null) return false;
//             const fieldDate = moment(fieldValue, 'DD/MM/YYYY', true);
//             const start = moment(startDate);
//             const end = moment(endDate);
//             return fieldDate.isValid() && fieldDate.isBetween(start, end, 'day', '[]');
//           });
//           if (!dateRangeMatch) return false;
//         } // 2. Lọc theo năm/quý/tháng/tuần
//         if (periodFilters.length > 0) {
//           const periodMatch = periodFilters.every(([key, value]) => {
//             const { year, quarter, month, week } = value as PeriodFilter;
//             // Nếu không có giá trị nào được nhập, bỏ qua bộ lọc này
//             if (!year && !quarter && !month && !week) {
//               return true;
//             }
//             const fieldValue = item.variables[key];
//             if (!fieldValue) return false;

//             const date = moment(fieldValue, ['DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY'], true);
//             if (!date.isValid()) return false;

//             const yearMatch = !year || date.year() === Number(year);
//             const quarterMatch = !quarter || date.quarter() === Number(quarter);
//             const monthMatch = !month || date.month() + 1 === Number(month);
//             const weekMatch = !week || date.week() === Number(week);

//             return yearMatch && quarterMatch && monthMatch && weekMatch;
//           });
//           if (!periodMatch) return false;
//         }

//         // 3. Lọc theo tthcType (nếu có)
//         // if (tthcTypeFilter) {
//         //   const [key, value] = tthcTypeFilter;
//         //   const filterValue = String(value);
//         //   const originalId = item.variables?.originalTthcTypeId;

//         //   if (!originalId) return false;

//         //   // Trường hợp 1: Filter value là một ID
//         //   if (filterValue.length === 24 && /^[0-9a-fA-F]{24}$/.test(filterValue)) {
//         //     if (originalId !== filterValue) return false;
//         //   }
//         //   // Trường hợp 2: Filter value là một code
//         //   else {
//         //     // Bổ sung: Kiểm tra cả name và code
//         //     const tthcData = allTthcMap[originalId];
//         //     if (tthcData) {
//         //       const nameMatch = removeAccents(tthcData.name) === removeAccents(filterValue);
//         //       const codeMatch = removeAccents(tthcData.code) === removeAccents(filterValue);
//         //       if (!nameMatch && !codeMatch) {
//         //         return false; // Không khớp cả name và code
//         //       }
//         //     } else {
//         //       return false; // Không tìm thấy tthcEntry
//         //     }
//         //   }
//         // }

//         // // 4. Lọc theo các trường chuỗi khác (dùng logic OR)
//         // if (otherStringFilters.length > 0) {
//         //   const stringMatch = otherStringFilters.some(([key, value]) => {
//         //      if (stringFilters.length > 0) {
//         //       const stringMatch = stringFilters.some(([key, value]) => {
//         //         const fieldValue = item.variables[key];
//         // //         if (key === "tthcType" && typeof value === "string") {
//         // //   // So sánh theo name (đã được map sẵn)
//         // //   return (
//         // //     removeAccents(String(fieldValue)).toLowerCase() ===
//         // //     removeAccents(value).toLowerCase()
//         // //   );
//         // // }
//         //         if (fieldValue == null) return false;
//         //         return removeAccents(String(fieldValue)).includes(removeAccents(String(value)));
//         //       });
//         //       if (!stringMatch) return false;
//         //     }

//         //     return true;
//         const { code, name, ...otherFilters } = userFilters;

//         // 1. Lọc theo các trường khác (AND)
//         const otherFiltersMatch = Object.entries(otherFilters).every(([key, value]) => {
//           // Bỏ qua nếu giá trị filter rỗng hoặc không xác định
//           if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
//             return true;
//           }

//           // Lọc theo khoảng ngày (startDate, endDate)
//           if (typeof value === 'object' && value !== null && 'startDate' in value && 'endDate' in value) {
//             const { startDate, endDate } = value as DateRangeFilter;
//             if (!startDate && !endDate) return true; // Bỏ qua nếu cả 2 rỗng
//             const fieldValue = item.variables[key];
//             if (fieldValue == null) return false;
//             const fieldDate = moment(fieldValue, 'DD/MM/YYYY', true);
//             const start = moment(startDate);
//             const end = moment(endDate);
//             return fieldDate.isValid() && fieldDate.isBetween(start, end, 'day', '[]');
//           }

//           // Lọc theo năm/quý/tháng/tuần
//           if (typeof value === 'object' && value !== null && ('year' in value || 'month' in value || 'week' in value || 'quarter' in value)) {
//             const { year, quarter, month, week } = value as PeriodFilter;
//             if (!year && !quarter && !month && !week) return true; // Bỏ qua nếu rỗng
//             const fieldValue = item.variables[key];
//             if (!fieldValue) return false;
//             const date = moment(fieldValue, ['DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY'], true);
//             if (!date.isValid()) return false;

//             const yearMatch = !year || date.year() === Number(year);
//             const quarterMatch = !quarter || date.quarter() === Number(quarter);
//             const monthMatch = !month || date.month() + 1 === Number(month);
//             const weekMatch = !week || date.week() === Number(week);
//             return yearMatch && quarterMatch && monthMatch && weekMatch;
//           }

//           // Lọc các trường string khác
//           const fieldValue = item.variables[key];
//           if (fieldValue == null) return false;
//           return removeAccents(String(fieldValue)).includes(removeAccents(String(value)));
//         });

//         if (!otherFiltersMatch) {
//           return false;
//         }

//         // 2. Lọc theo code và name (OR)
//         const hasCodeFilter = code && String(code).trim() !== '';
//         const hasNameFilter = name && String(name).trim() !== '';

//         if (hasCodeFilter || hasNameFilter) {
//           const codeMatch = hasCodeFilter && item.variables.code && removeAccents(String(item.variables.code)).includes(removeAccents(String(code)));
//           const nameMatch = hasNameFilter && item.variables.name && removeAccents(String(item.variables.name)).includes(removeAccents(String(name)));
//           if (hasCodeFilter && hasNameFilter) {
//             return codeMatch || nameMatch;
//           }
//           return codeMatch || nameMatch;
//         }

//         // Nếu không có filter code/name, và đã qua được otherFiltersMatch thì là true
//         return true;
//       });
//     }


//     // Filter activityInstanceId
//     if (activityInstanceIdFilter) {
//       result = result.filter(
//         (item: any) => item.activityInstanceId === activityInstanceIdFilter,
//       );
//     }
//     // 👉 SORT theo 1 cột duy nhất (frontend gửi)
//     if (sort && typeof sort === 'object' && sort !== null) {
//       const [[field, order]] = Object.entries(sort); // lấy cột đầu tiên
//       result.sort((a: any, b: any) => {
//         const valA = a.variables?.[field] || '';
//         const valB = b.variables?.[field] || '';
//         const cmp = String(valA).localeCompare(String(valB), 'vi', { sensitivity: 'base' });
//         return order === -1 ? -cmp : cmp; // -1: desc, 1: asc
//       });

//     }
//     // helper: convert -> positive int, fallback default
//     const toPositiveInt = (v: any, def: number) => {
//       const n = parseInt(String(v ?? ''), 10);
//       return Number.isFinite(n) && n > 0 ? n : def;
//     };

//     const page = toPositiveInt(rawPage, 1);
//     const limit = toPositiveInt(rawLimit, 25);

//     // ... (phần lấy result, filter, sort giống cũ)

//     // Pagination
//     const totalItems = result.length;
//     const totalPages = Math.ceil(totalItems / limit);
//     const startIndex = (page - 1) * limit;
//     const pagedData = result.slice(startIndex, startIndex + limit);
//     return {
//       page,
//       limit,
//       totalItems,
//       totalPages,
//       data: pagedData,
//     };
//   }
//   // tìm theo năm tháng ngày quý
//   @Post('list-clone')
//   async getVariablesListClone(
//     @Query('page') rawPage?: string,
//     @Query('limit') rawLimit?: string,
//     @Body() body: Record<string, any> = {},
//   ) {
//     const { processFn, variableValues, activityInstanceIdFilter, userFilters, sort } = body;

//     // Lấy processID
//     const processIDDoc = await this.featureManagementRepo.findOne({
//       where: { code: processFn }
//     });
//     const processID = processIDDoc?.processID;

//     // Merge variableValues + criteria
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
//     if (processInstanceIds.length === 0) return { data: [], total: 0 };

//     // Bước 1: lọc activityInstanceId theo điều kiện variableValues
//     let filteredActivityIds: string[] = [];
//     if (mergedVariableValues.length > 0) {
//       const filterResp = await firstValueFrom(
//         this.httpService.post(`${process.env.CAMUNDA_MEDIUM}/variable-instance`, {
//           processInstanceIdIn: processInstanceIds,
//           variableValues: mergedVariableValues,
//         }),
//       );
//       filteredActivityIds = filterResp.data.map((v: any) => v.activityInstanceId);
//     } else {
//       filteredActivityIds = processInstanceIds;
//     }
//     if (filteredActivityIds.length === 0) return { data: [], total: 0 };

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
//     // Lọc cứng theo documentType
//     result = result.filter((item: any) => {
//       const docType = item.variables?.documentType;
//       return docType == 'TSD' || docType === '67f62c1b91a276f6ca479f25';
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

//     // Lấy tất cả các loại TTHC để tra cứu code và name
//     const allTthcDocs = await this.administrativeProcedureCategoryModel
//       .find({})
//       .select('_id name code')
//       .lean();
//     const allTthcMap = allTthcDocs.reduce((acc, doc) => {
//       acc[doc._id.toString()] = { name: doc.name, code: doc.code };
//       return acc;
//     }, {} as Record<string, { name: string, code: string }>);

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

//     // Bỏ dấu để filter
//     function removeAccents(str: string): string {
//       return str
//         ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
//         : '';
//     }
//     type DateRangeFilter = { startDate: string; endDate: string };
//     type PeriodFilter = { year?: string | number; month?: string | number; week?: string | number; quarter?: string | number };
//     if (userFilters && typeof userFilters === 'object') {
//       const allFilters = Object.entries(userFilters);

//       // Tách riêng idCard filter và các string filter khác
//       const idCardFilter = allFilters.find(([key]) => key === 'idCard');
//       const otherStringFilters = allFilters.filter(
//         ([key, value]) =>
//           key !== 'idCard' &&
//           typeof value === 'string' &&
//           value.trim() !== '',
//       );
//       const dateRangeFilters = allFilters.filter(([, value]) =>
//         typeof value === 'object' && value !== null && 'startDate' in value && 'endDate' in value && !('year' in value)
//       );
//       const periodFilters = allFilters.filter(([, value]) =>
//         typeof value === 'object' && value !== null && ('year' in value || 'month' in value || 'week' in value || 'quarter' in value)
//       );

//       result = result.filter((item: any) => {
//         // 1. Lọc theo khoảng ngày (startDate, endDate)
//         // 1. Lọc theo khoảng ngày (startDate, endDate) - AND
//         if (dateRangeFilters.length > 0) {
//           const dateRangeMatch = dateRangeFilters.every(([key, value]) => {
//             const { startDate, endDate } = value as DateRangeFilter;
//             const fieldValue = item.variables[key];
//             if (fieldValue == null) return false;

//             const fieldDate = moment(fieldValue, 'DD/MM/YYYY', true);
//             const start = moment(startDate);
//             const end = moment(endDate);

//             return fieldDate.isValid() && fieldDate.isBetween(start, end, 'day', '[]');
//           });
//           if (!dateRangeMatch) return false;
//         }

//         // 2. Lọc theo năm/quý/tháng/tuần - AND
//         if (periodFilters.length > 0) {
//           const periodMatch = periodFilters.every(([key, value]) => {
//             const { year, quarter, month, week } = value as PeriodFilter;
//             // Nếu không có giá trị nào được nhập, bỏ qua bộ lọc này
//             if (!year && !quarter && !month && !week) {
//               return true;
//             }
//             const fieldValue = item.variables[key];
//             if (!fieldValue) return false;

//             const date = moment(fieldValue, ['DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY'], true);
//             if (!date.isValid()) return false;

//             const yearMatch = !year || date.year() === Number(year);
//             const quarterMatch = !quarter || date.quarter() === Number(quarter);
//             const monthMatch = !month || date.month() + 1 === Number(month);
//             const weekMatch = !week || date.week() === Number(week);

//             return yearMatch && quarterMatch && monthMatch && weekMatch;
//           });
//           if (!periodMatch) return false;
//         }

//         // // 3. Lọc theo các trường chuỗi
//         // if (stringFilters.length > 0) {
//         //   const stringMatch = stringFilters.some(([key, value]) => {
//         // Lọc theo idCard (AND)
//         // 3. Lọc theo idCard (AND)
//         if (idCardFilter) {
//           const [key, value] = idCardFilter;
//           const fieldValue = item.variables[key];
//           if (fieldValue == null || !removeAccents(String(fieldValue)).includes(removeAccents(String(value)))) {
//             return false;
//           }
//         }
//         // Chỉ thực hiện khi có các bộ lọc chuỗi khác
//         if (otherStringFilters.length > 0) {
//           const otherStringMatch = otherStringFilters.some(([key, value]) => {

//             const fieldValue = item.variables[key];
//             if (fieldValue == null) return false;
//             return removeAccents(String(fieldValue)).includes(removeAccents(String(value)));
//           });
//           if (!otherStringMatch) return false;
//           if (!otherStringMatch) {
//             return false;
//           }
//         }

//         // Nếu qua tất cả các bộ lọc, giữ lại bản ghi
//         return true;
//       });
//     }


//     // Filter activityInstanceId
//     if (activityInstanceIdFilter) {
//       result = result.filter(
//         (item: any) => item.activityInstanceId === activityInstanceIdFilter,
//       );
//     }
//     // 👉 SORT theo 1 cột duy nhất (frontend gửi)
//     if (sort && typeof sort === 'object' && sort !== null) {
//       const [[field, order]] = Object.entries(sort); // lấy cột đầu tiên
//       result.sort((a: any, b: any) => {
//         const valA = a.variables?.[field] || '';
//         const valB = b.variables?.[field] || '';
//         const cmp = String(valA).localeCompare(String(valB), 'vi', { sensitivity: 'base' });
//         return order === -1 ? -cmp : cmp; // -1: desc, 1: asc
//       });

//     }
//     // helper: convert -> positive int, fallback default
//     const toPositiveInt = (v: any, def: number) => {
//       const n = parseInt(String(v ?? ''), 10);
//       return Number.isFinite(n) && n > 0 ? n : def;
//     };

//     const page = toPositiveInt(rawPage, 1);
//     const limit = toPositiveInt(rawLimit, 10);

//     // ... (phần lấy result, filter, sort giống cũ)

//     // Pagination
//     const totalItems = result.length;
//     const totalPages = Math.ceil(totalItems / limit);
//     const startIndex = (page - 1) * limit;
//     const pagedData = result.slice(startIndex, startIndex + limit);
//     return {
//       page,
//       limit,
//       totalItems,
//       totalPages,
//       data: pagedData,
//     };
//   }

//   @Post('get-documents')
//   async getVariableGetDocuments(
//     @Query('page') rawPage?: string,
//     @Query('limit') rawLimit?: string,
//     @Body() body: Record<string, any> = {},
//   ) {
//     const { processFn, variableValues, activityInstanceIdFilter, userFilters, sort } = body;

//     // Lấy processID
//     const processIDDoc = await this.featureManagementRepo.findOne({
//       where: { code: processFn }
//     });
//     const processID = processIDDoc?.processID;

//     // Merge variableValues + criteria
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
//     if (processInstanceIds.length === 0) return { data: [], total: 0 };

//     // Bước 1: lọc activityInstanceId theo điều kiện variableValues
//     let filteredActivityIds: string[] = [];
//     if (mergedVariableValues.length > 0) {
//       const filterResp = await firstValueFrom(
//         this.httpService.post(`${process.env.CAMUNDA_MEDIUM}/variable-instance`, {
//           processInstanceIdIn: processInstanceIds,
//           variableValues: mergedVariableValues,
//         }),
//       );
//       filteredActivityIds = filterResp.data.map((v: any) => v.activityInstanceId);
//     } else {
//       filteredActivityIds = processInstanceIds;
//     }
//     if (filteredActivityIds.length === 0) return { data: [], total: 0 };

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
//     // Lọc cứng theo documentType
//     // result = result.filter((item: any) => {
//     //   const docType = item.variables?.documentType;
//     //   return docType == 'TSD' || docType === '67f62c1b91a276f6ca479f25';
//     // });


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

//     // Lấy tất cả các loại TTHC để tra cứu code và name
//     const allTthcDocs = await this.administrativeProcedureCategoryModel
//       .find({})
//       .select('_id name code')
//       .lean();
//     const allTthcMap = allTthcDocs.reduce((acc, doc) => {
//       acc[doc._id.toString()] = { name: doc.name, code: doc.code };
//       return acc;
//     }, {} as Record<string, { name: string, code: string }>);

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

//     // Bỏ dấu để filter
//     function removeAccents(str: string): string {
//       return str
//         ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
//         : '';
//     }
//     type DateRangeFilter = { startDate: string; endDate: string };
//     type PeriodFilter = { year?: string | number; month?: string | number; week?: string | number; quarter?: string | number };
//     if (userFilters && typeof userFilters === 'object') {
//       const { signatureDeadline, ...otherStringUserFilters } = userFilters;
//       const allFilters = Object.entries(userFilters);

//       // Tách riêng filter cho string và date
//       const stringFilters = allFilters.filter(([, value]) => typeof value === 'string' && value.trim() !== '');
//       const dateRangeFilters = allFilters.filter(([, value]) =>
//         typeof value === 'object' && value !== null && 'startDate' in value && 'endDate' in value && !('year' in value)
//       );
//       const periodFilters = allFilters.filter(([, value]) =>
//         typeof value === 'object' && value !== null && ('year' in value || 'month' in value || 'week' in value || 'quarter' in value)
//       );

//       result = result.filter((item: any) => {
//          // Lọc AND cho signatureDeadline
//         if (signatureDeadline && typeof signatureDeadline === 'string' && signatureDeadline.trim() !== '') {
//           const fieldValue = item.variables['signatureDeadline'];
//           if (fieldValue == null) {
//             return false; // Bỏ qua nếu không có signatureDeadline
//           }
//           if (!removeAccents(String(fieldValue)).includes(removeAccents(signatureDeadline))) {
//             return false; // Nếu signatureDeadline không khớp, loại bỏ ngay
//           }
//         }

//         // Tách các filter còn lại
//         const otherFilters = Object.entries(otherStringUserFilters).filter(([, value]) => typeof value === 'string' && value.trim() !== '');

//         // 1. Lọc theo khoảng ngày (startDate, endDate)
//         if (dateRangeFilters.length > 0) {
//           const dateRangeMatch = dateRangeFilters.every(([key, value]) => {
//             const { startDate, endDate } = value as DateRangeFilter;
//             const fieldValue = item.variables[key];
//             if (fieldValue == null) return false;

//             const fieldDate = moment(fieldValue, 'DD/MM/YYYY', true);
//             const start = moment(startDate);
//             const end = moment(endDate);

//             return fieldDate.isValid() && fieldDate.isBetween(start, end, 'day', '[]');
//           });
//           if (!dateRangeMatch) return false;
//         }

//         // 2. Lọc theo năm/quý/tháng/tuần
//         if (periodFilters.length > 0) {
//           const periodMatch = periodFilters.every(([key, value]) => {
//             const { year, quarter, month, week } = value as PeriodFilter;
//             // Nếu không có giá trị nào được nhập, bỏ qua bộ lọc này
//             if (!year && !quarter && !month && !week) {
//               return true;
//             }
//             const fieldValue = item.variables[key];
//             if (!fieldValue) return false;

//             const date = moment(fieldValue, ['DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY'], true);
//             if (!date.isValid()) return false;

//             const yearMatch = !year || date.year() === Number(year);
//             const quarterMatch = !quarter || date.quarter() === Number(quarter);
//             const monthMatch = !month || date.month() + 1 === Number(month);
//             const weekMatch = !week || date.week() === Number(week);

//             return yearMatch && quarterMatch && monthMatch && weekMatch;
//           });
//           if (!periodMatch) return false;
//         }

//         // 3. Lọc theo các trường chuỗi
//        if (otherFilters.length > 0) {
//           const stringMatch = otherFilters.some(([key, value]) => {
//             const fieldValue = item.variables[key];
//             if (fieldValue == null) return false;
//             return removeAccents(String(fieldValue)).includes(removeAccents(String(value)));
//           });
//           if (!stringMatch) return false;
//         }

//         // Nếu qua tất cả các bộ lọc, giữ lại bản ghi
//         return true;
//       });
//     }


//     // Filter activityInstanceId
//     if (activityInstanceIdFilter) {
//       result = result.filter(
//         (item: any) => item.activityInstanceId === activityInstanceIdFilter,
//       );
//     }
//     // 👉 SORT theo 1 cột duy nhất (frontend gửi)
//     if (sort && typeof sort === 'object' && sort !== null) {
//       const [[field, order]] = Object.entries(sort); // lấy cột đầu tiên
//       result.sort((a: any, b: any) => {
//         const valA = a.variables?.[field] || '';
//         const valB = b.variables?.[field] || '';
//         const cmp = String(valA).localeCompare(String(valB), 'vi', { sensitivity: 'base' });
//         return order === -1 ? -cmp : cmp; // -1: desc, 1: asc
//       });

//     }
//     // helper: convert -> positive int, fallback default
//     const toPositiveInt = (v: any, def: number) => {
//       const n = parseInt(String(v ?? ''), 10);
//       return Number.isFinite(n) && n > 0 ? n : def;
//     };

//     const page = toPositiveInt(rawPage, 1);
//     const limit = toPositiveInt(rawLimit, 10);

//     // ... (phần lấy result, filter, sort giống cũ)

//     // Pagination
//     const totalItems = result.length;
//     const totalPages = Math.ceil(totalItems / limit);
//     const startIndex = (page - 1) * limit;
//     const pagedData = result.slice(startIndex, startIndex + limit);
//     return {
//       page,
//       limit,
//       totalItems,
//       totalPages,
//       data: pagedData,
//     };
//   }
//   @Post("clone")
//   async getVariablesLists(@Body() body: Record<string, any> = {}) {
//     const processFn = "danhsachqltailieucd";
//     const {
//       variableValues,
//       activityInstanceIdFilter,
//       userFilters,
//       KQGQTTHCCode,
//       codeProfile,
//       endDate,
//       limit,
//       page,
//       year,
//       quarter,
//       month,
//       day,
//       startDate,
//       tthcType,
//       sort,
//     } = body;

//     // --- Helper functions ---
//     const removeAccents = (str: string) =>
//       str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';

//     const parseDate = (str: string) => moment(str, [
//       'DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'
//     ], true);

//     // Giúp map field ID -> name theo model bất kỳ
//     const mapFieldByModel = async (result: any[], field: string, model: any, select: string, key: string = '_id', label: string = 'name') => {
//       const ids = result.map((r) => r.variables?.[field]).filter((id) => id && id.length === 24);
//       if (!ids.length) return result;
//       const docs = await model.find({ [key]: { $in: ids } }).select(`${key} ${select}`).lean();
//       const map = docs.reduce((acc, d) => {
//         acc[d[key].toString()] = d[label];
//         return acc;
//       }, {} as Record<string, any>);
//       return result.map((r) => {
//         const vars = { ...r.variables };
//         if (vars[field] && map[vars[field]]) vars[field] = map[vars[field]];
//         return { ...r, variables: vars };
//       });
//     };

//     // --- Bắt đầu xử lý ---
//     const processIDDoc = await this.featureManagementRepo.findOne({
//       where: { code: processFn }
//     });
//     const processID = processIDDoc?.processID;
//     if (!processID) throw new Error("processID not found");

//     const mergedVariableValues = [
//       ...(Array.isArray(variableValues) ? variableValues : []),
//       ...(processIDDoc?.criteria?.map((c: any) => ({
//         name: c.name, value: c.value, operator: c.operator,
//       })) || [])
//     ];

//     const resProcess = await this.bpmnDesignModel.findOne({
//       where: { id: processID },
//     });
//     const processKey = resProcess?.processKey;
//     const processDefinitionId = resProcess?.processInstanceDefinitionKey;
//     if (!processKey) throw new Error("processKey is required");

//     const processInstancesResp = await firstValueFrom(
//       this.httpService.get(`${process.env.CAMUNDA_MEDIUM}/process-instance`, {
//         params: { processDefinitionKey: processKey },
//       }),
//     );
//     const processInstanceIds = processInstancesResp.data.map((pi: any) => pi.id);
//     if (!processInstanceIds.length) return { data: [], total: 0 };

//     const allVarsResp = await firstValueFrom(
//       this.httpService.post(`${process.env.CAMUNDA_MEDIUM}/variable-instance`, {
//         processInstanceIdIn: processInstanceIds,
//       }),
//     );

//     // --- Group by activityInstanceId ---
//     const grouped = allVarsResp.data.reduce((acc: any, curr: any) => {
//       const { activityInstanceId, name, value, processInstanceId } = curr;
//       if (!acc[activityInstanceId])
//         acc[activityInstanceId] = { activityInstanceId, processDefinitionId, processInstanceId, variables: {} };
//       acc[activityInstanceId].variables[name] = value;
//       return acc;
//     }, {});

//     const fields = processIDDoc?.valueField?.field || [];
//     const enumFields = fields.filter((f: any) => f.type === 'enum' && Array.isArray(f.valueInput));
//     const dateFields = fields.filter((f: any) => f.type === 'date');

//     // --- Map enum & date ---
//     let result = Object.values(grouped).map((item: any) => {
//       const vars = { ...item.variables };
//       for (const f of enumFields) {
//         const opt = f.valueInput.find((x: any) => x.value == vars[f.key]);
//         if (opt) vars[f.key] = opt.label;
//       }
//       for (const f of dateFields) {
//         const parsed = moment(vars[f.key], ['MM-DD-YYYY', 'YYYY-MM-DD']);
//         if (parsed.isValid()) vars[f.key] = parsed.format('DD/MM/YYYY');
//       }
//       return { ...item, variables: vars };
//     });

//     // --- Map ID fields using helper ---
//     result = await mapFieldByModel(result, 'tthcType', this.administrativeProcedureCategoryModel, 'name');
//     result = await mapFieldByModel(result, 'files', this.profileManagementModel, 'name');
//     result = await mapFieldByModel(result, 'font', this.fondsCatalogModel, 'name');
//     result = await mapFieldByModel(result, 'citizen', this.citizenModel, 'fullName');
//     result = await mapFieldByModel(result, 'object', this.citizenModel, 'fullName');
//     result = await mapFieldByModel(result, 'copyist', this.userModel, 'name');
//     result = await mapFieldByModel(result, 'field', this.administrativeProcedureFieldCategoryModel, 'name');
//     result = await mapFieldByModel(result, 'resultTHHC', this.administrativeProcedureResultCategoryModel, 'name');
//     result = await mapFieldByModel(result, 'room', this.roomInWarehouseModel, 'name');
//     result = await mapFieldByModel(result, 'shelf', this.shelfManagementModel, 'name');
//     result = await mapFieldByModel(result, 'box', this.boxManagementModel, 'name');
//     result = await mapFieldByModel(result, 'storage', this.warehouseModel, 'name');
//     result = await mapFieldByModel(result, 'unit', this.collectionManagementModel, 'name');
//     result = await mapFieldByModel(result, 'copyUnit', this.organizationUnitModel, 'name');
//     result = await mapFieldByModel(result, 'floor', this.floorModel, 'floorNumber');
//     result = await mapFieldByModel(result, 'compartment', this.compartmentModel, 'compartmentNumber');

//     // --- Map fielSys riêng (có attachedFiles) ---
//     const fielSysIds = result.map((r: any) => r.variables?.fielSys).filter((id) => id && id.length === 24);
//     if (fielSysIds.length) {
//       const fileDocs = await this.fileManagerModel.find({ _id: { $in: fielSysIds } }).select('_id name realName attachedFiles').lean();
//       const fileMap = fileDocs.reduce((acc, d) => {
//         acc[d._id.toString()] = d.attachedFiles?.[0]?.name || d.name || d.realName;
//         return acc;
//       }, {} as Record<string, string>);
//       result = result.map((r: any) => {
//         const vars = { ...r.variables };
//         if (vars.fielSys && fileMap[vars.fielSys]) vars.fielSys = fileMap[vars.fielSys];
//         return { ...r, variables: vars };
//       });
//     }

//     // --- Map documentType ---
//     const docTypeCategory = await this.commonCategoryModel.findOne({ categoryCode: 'LTL001' }).lean();
//     if (docTypeCategory?.valueList?.length) {
//       const docTypeMap = docTypeCategory.valueList.reduce((acc, v) => ({ ...acc, [v.code]: v.name }), {});
//       result = result.map((r: any) => {
//         const vars = { ...r.variables };
//         const code = vars.documentType;
//         if (docTypeMap[code]) vars.documentType = docTypeMap[code];
//         return { ...r, variables: vars };
//       });
//     }

//     // --- Filtering by date ---
//     let filtered = result;
//     if (year || quarter || month || day || startDate || endDate) {
//       filtered = filtered.filter(({ variables }) => {
//         const cancelTime = variables?.cancelTime;
//         if (!cancelTime) return false;
//         const date = parseDate(cancelTime);
//         if (!date.isValid()) return false;
//         if (year && date.year() !== +year) return false;
//         if (quarter && date.quarter() !== +quarter) return false;
//         if (month && date.month() + 1 !== +month) return false;
//         if (day && date.date() !== +day) return false;
//         if (startDate && date.isBefore(parseDate(startDate), 'day')) return false;
//         if (endDate && date.isAfter(parseDate(endDate), 'day')) return false;
//         return true;
//       });
//     }

//     // --- Apply userFilters / search OR ---
//     const filters: [string, any][] = [];
//     if (userFilters) filters.push(...Object.entries(userFilters));
//     if (KQGQTTHCCode) filters.push(['KQGQTTHCCode', KQGQTTHCCode]);
//     if (codeProfile) filters.push(['code', codeProfile]);
//     if (tthcType) filters.push(['tthcType', tthcType]);

//     const active = filters.filter(([, v]) => v != null && v !== '');
//     if (active.length)
//       filtered = filtered.filter((item) =>
//         active.some(([key, val]) =>
//           removeAccents(String(item.variables[key] || '')).includes(removeAccents(String(val)))
//         )
//       );

//     // --- Gắn flag isMatched ---
//     const matchedIds = mergedVariableValues.length
//       ? (await firstValueFrom(this.httpService.post(`${process.env.CAMUNDA_MEDIUM}/variable-instance`, {
//         processInstanceIdIn: processInstanceIds,
//         variableValues: mergedVariableValues,
//       }))).data.map((v: any) => v.activityInstanceId)
//       : [];

//     filtered = filtered.map((r) => ({ ...r, isMatched: matchedIds.includes(r.activityInstanceId) }));

//     // --- Filter theo activityInstanceId ---
//     let final = activityInstanceIdFilter
//       ? filtered.filter((r) => r.activityInstanceId === activityInstanceIdFilter)
//       : filtered;

//     // --- Sort ---
//     let sortObj = sort;
//     if (typeof sort === 'string') {
//       try { sortObj = JSON.parse(sort); } catch { sortObj = null; }
//     }
//     if (sortObj && typeof sortObj === 'object') {
//       const [[field, order]] = Object.entries(sortObj);
//       final.sort((a, b) => {
//         const va = a.variables?.[field] || '';
//         const vb = b.variables?.[field] || '';
//         if (moment(va, 'DD/MM/YYYY', true).isValid() && moment(vb, 'DD/MM/YYYY', true).isValid()) {
//           return (moment(va, 'DD/MM/YYYY').unix() - moment(vb, 'DD/MM/YYYY').unix()) * (order === -1 ? -1 : 1);
//         }
//         const cmp = String(va).localeCompare(String(vb), 'vi', { sensitivity: 'base' });
//         return order === -1 ? -cmp : cmp;
//       });
//     }

//     // --- Pagination ---
//     const total = final.length;
//     if (limit && +limit > 0) {
//       const p = +page > 0 ? +page : 1;
//       const skip = (p - 1) * limit;
//       final = final.slice(skip, skip + limit);
//     }

//     return {
//       data: final,
//       total,
//       page: page || 1,
//       limit: limit || total,
//       totalPages: limit ? Math.ceil(total / limit) : 1,
//     };
//   }

//   @Post("clone-dn")
//   async getVariablesListdn(@Body() body: Record<string, any> = {}) {
//     const processFn = "danhsachqltailieudn"; // cứng ở đây
//     const {
//       variableValues,
//       activityInstanceIdFilter,
//       userFilters,
//       // New search parameters from FE
//       KQGQTTHCCode,
//       codeProfile,
//       endDate,
//       limit,
//       page,
//       year,
//       quarter,
//       month,
//       day,
//       startDate,
//       tthcType,
//       sort, // <--- Thêm sort vào đây
//     } = body;

//     // Lấy processID
//     const processIDDoc = await this.featureManagementRepo.findOne({
//       where: { code: processFn }
//     });
//     const processID = processIDDoc?.processID;

//     // Merge variableValues + criteria
//     const mergedVariableValues: any[] = Array.isArray(variableValues) ? [...variableValues] : [];
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

//     // Lấy tất cả processInstanceId
//     const processInstancesResp = await firstValueFrom(
//       this.httpService.get(`${process.env.CAMUNDA_MEDIUM}/process-instance`, {
//         params: { processDefinitionKey: processKey },
//       }),
//     );
//     const processInstanceIds = processInstancesResp.data.map((pi: any) => pi.id);
//     if (processInstanceIds.length === 0) return { data: [], total: 0 };

//     // Lấy tất cả activityInstanceId (không loại bản ghi)
//     const allVarsResp = await firstValueFrom(
//       this.httpService.post(`${process.env.CAMUNDA_MEDIUM}/variable-instance`, {
//         processInstanceIdIn: processInstanceIds,
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

//     // Format dữ liệu + map enum/date
//     let result = Object.values(grouped).map((item: any) => {
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

//     // Map các trường tham chiếu: managerUnit, fileSys, citizen
//     result = result.map((item: any) => {
//       const vars = { ...item.variables };

//       if (vars.managerUnit && vars.managerUnit.length === 24) {
//         const found = result.find((r: any) => r.variables?._id === vars.managerUnit);
//         if (found) vars.managerUnit = found.variables?.name || vars.managerUnit;
//       }

//       if (vars.fileSys && vars.fileSys.length === 24) {
//         const foundFile = result.find((r: any) => r.variables?.fileSys === vars.fileSys);
//         if (foundFile) vars.fileSys = foundFile.variables?.name || vars.fileSys;
//       }

//       if (vars.citizen && vars.citizen.length === 24) {
//         const found = result.find((r: any) => r.variables?._id === vars.citizen);
//         if (found) vars.citizen = found.variables?.fullName || vars.citizen;
//       }

//       return { ...item, variables: vars };
//     });

//     // Map tthcType
//     const tthcIds = result.map((r: any) => r.variables?.tthcType).filter((id: string) => id?.length === 24);
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

//     // Helper: bỏ dấu
//     function removeAccents(str: string): string {
//       return str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
//     }

//     // Apply new search filters
//     let filteredResult = result;

//     // Lọc theo thời gian (năm, quý, tháng, ngày)
//     if (year || quarter || month || day || startDate || endDate) {
//       filteredResult = filteredResult.filter((item: any) => {
//         const cancelTime = item.variables?.cancelTime;
//         if (!cancelTime) return false;

//         // Thêm các định dạng có chứa thời gian để parse chính xác
//         const date = moment(cancelTime, [
//           'DD/MM/YYYY HH:mm:ss',
//           'DD/MM/YYYY',
//           'MM/DD/YYYY',
//           'YYYY-MM-DD'
//         ], true);
//         if (!date.isValid()) return false;

//         // Lọc theo năm
//         if (year && date.year() !== Number(year)) return false;

//         // Lọc theo quý
//         if (quarter && date.quarter() !== Number(quarter)) return false;

//         // Lọc theo tháng
//         if (month && date.month() + 1 !== Number(month)) return false;

//         // Lọc theo ngày
//         if (day && date.date() !== Number(day)) return false;

//         // Lọc theo khoảng startDate, endDate
//         if (startDate) {
//           const start = moment(startDate, ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], true);
//           if (start.isValid() && date.isBefore(start, 'day')) return false;
//         }
//         if (endDate) {
//           const end = moment(endDate, ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], true);
//           if (end.isValid() && date.isAfter(end, 'day')) return false;
//         }

//         return true; // Nếu qua hết các điều kiện
//       });
//     }

//     // Filter by KQGQTTHCCode
//     const allUserFilters: [string, any][] = [];
//     if (userFilters && typeof userFilters === 'object') {
//       allUserFilters.push(...Object.entries(userFilters));
//     }
//     if (KQGQTTHCCode) {
//       allUserFilters.push(['KQGQTTHCCode', KQGQTTHCCode]);
//     }
//     if (codeProfile) {
//       allUserFilters.push(['code', codeProfile]);
//     }
//     if (tthcType) {
//       allUserFilters.push(['tthcType', tthcType]);
//     }

//     // Lọc theo các điều kiện người dùng với logic OR
//     const activeFilters = allUserFilters.filter(
//       ([, value]) => value !== null && value !== undefined && value !== ''
//     );

//     if (activeFilters.length > 0) {
//       filteredResult = filteredResult.filter((item: any) => {

//         // Thay đổi từ every -> some để tìm kiếm theo logic OR
//         return activeFilters.some(([key, value]) => {
//           // Ignore empty/null/undefined filter values from the payload
//           const searchKey = key === 'codeProfile' ? 'code' : key;
//           const fieldValue = item.variables[searchKey];
//           if (fieldValue == null) return false;
//           return removeAccents(String(fieldValue)).includes(removeAccents(String(value)));
//         });
//       });
//     }
//     // Gắn flag isMatched dựa trên variableValues
//     const matchedIds = mergedVariableValues.length > 0
//       ? (await firstValueFrom(
//         this.httpService.post(`${process.env.CAMUNDA_MEDIUM}/variable-instance`, {
//           processInstanceIdIn: processInstanceIds,
//           variableValues: mergedVariableValues,
//         }),
//       )).data.map((v: any) => v.activityInstanceId)
//       : [];

//     filteredResult = filteredResult.map(item => ({
//       ...item,
//       isMatched: matchedIds.includes(item.activityInstanceId),
//     }));
//     // Filter activityInstanceId nếu có filter
//     let finalResult = activityInstanceIdFilter
//       ? filteredResult.filter(item => item.activityInstanceId === activityInstanceIdFilter)
//       : filteredResult;

//     // 👉 Thêm logic SORT vào đây
//     if (sort && typeof sort === 'object' && sort !== null) {
//       const [[field, order]] = Object.entries(sort); // lấy cột đầu tiên
//       finalResult.sort((a: any, b: any) => {
//         const valA = a.variables?.[field] || '';
//         const valB = b.variables?.[field] || '';
//         // Xử lý sắp xếp cho ngày tháng
//         if (moment(valA, 'DD/MM/YYYY', true).isValid() && moment(valB, 'DD/MM/YYYY', true).isValid()) {
//           return (moment(valA, 'DD/MM/YYYY').unix() - moment(valB, 'DD/MM/YYYY').unix()) * (order === -1 ? -1 : 1);
//         }
//         const cmp = String(valA).localeCompare(String(valB), 'vi', { sensitivity: 'base' });
//         return order === -1 ? -cmp : cmp; // -1: desc, 1: asc
//       });
//     }

//     // Get total before pagination
//     const total = finalResult.length;

//     // Apply pagination
//     if (limit && typeof limit === 'number' && limit > 0) {
//       const pageNumber = (page && typeof page === 'number' && page > 0) ? page : 1;
//       const skip = (pageNumber - 1) * limit;
//       finalResult = finalResult.slice(skip, skip + limit);
//     }

//     return {
//       data: finalResult,
//       total: total,
//       page: page || 1,
//       limit: limit || total,
//       totalPages: limit ? Math.ceil(total / limit) : 1
//     };
//   }

//   @Post("clone-kqgq")
//   async getVariablesListKqgq(@Body() body: Record<string, any> = {}) {
//     const processFn = "danhsachqltailieucd"; // cứng ở đây
//     const {
//       variableValues,
//       activityInstanceIdFilter,
//       userFilters,
//       // New search parameters from FE
//       KQGQTTHCCode,
//       codeProfile,
//       endDate,
//       limit,
//       page,
//       year,
//       quarter,
//       month,
//       day,
//       startDate,
//       tthcType,
//       // Thêm week vào đây để sử dụng
//       week,
//       unit,
//       sort, // <--- Thêm sort vào đây
//     } = body;

//     // Lấy processID
//     const processIDDoc = await this.featureManagementRepo.findOne({
//       where: { code: processFn }
//     });
//     const processID = processIDDoc?.processID;

//     // Merge variableValues + criteria
//     const mergedVariableValues: any[] = Array.isArray(variableValues) ? [...variableValues] : [];
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

//     // Lấy tất cả processInstanceId
//     const processInstancesResp = await firstValueFrom(
//       this.httpService.get(`${process.env.CAMUNDA_MEDIUM}/process-instance`, {
//         params: { processDefinitionKey: processKey },
//       }),
//     );
//     const processInstanceIds = processInstancesResp.data.map((pi: any) => pi.id);
//     if (processInstanceIds.length === 0) return { data: [], total: 0 };

//     // Lấy tất cả activityInstanceId (không loại bản ghi)
//     const allVarsResp = await firstValueFrom(
//       this.httpService.post(`${process.env.CAMUNDA_MEDIUM}/variable-instance`, {
//         processInstanceIdIn: processInstanceIds,
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

//     // Format dữ liệu + map enum/date
//     let result = Object.values(grouped).map((item: any) => {
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

//     // Map các trường tham chiếu: managerUnit, fileSys, citizen
//     result = result.map((item: any) => {
//       const vars = { ...item.variables };

//       if (vars.managerUnit && vars.managerUnit.length === 24) {
//         const found = result.find((r: any) => r.variables?._id === vars.managerUnit);
//         if (found) vars.managerUnit = found.variables?.name || vars.managerUnit;
//       }

//       if (vars.fileSys && vars.fileSys.length === 24) {
//         const foundFile = result.find((r: any) => r.variables?.fileSys === vars.fileSys);
//         if (foundFile) vars.fileSys = foundFile.variables?.name || vars.fileSys;
//       }

//       if (vars.citizen && vars.citizen.length === 24) {
//         const found = result.find((r: any) => r.variables?._id === vars.citizen);
//         if (found) vars.citizen = found.variables?.fullName || vars.citizen;
//       }

//       return { ...item, variables: vars };
//     });

//     // Map tthcType
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
//     // Lấy tất cả các loại TTHC để tra cứu code và name
//     const allTthcDocs = await this.administrativeProcedureCategoryModel
//       .find({})
//       .select('_id name code')
//       .lean();
//     const allTthcMap = allTthcDocs.reduce((acc, doc) => {
//       acc[doc._id.toString()] = { name: doc.name, code: doc.code };
//       return acc;
//     }, {} as Record<string, { name: string, code: string }>);

//     if (tthcIds.length > 0) {
//       // const tthcDocs = await this.administrativeProcedureCategoryModel
//       //   .find({ _id: { $in: tthcIds } })
//       //   .select('_id name')
//       //   .lean();

//       // const tthcMap = tthcDocs.reduce((acc, doc) => {
//       //   acc[doc._id.toString()] = doc.name;
//       //   return acc;
//       // }, {} as Record<string, string>);

//       result = result.map((item: any) => {
//         const vars = { ...item.variables };
//         // if (vars.tthcType && tthcMap[vars.tthcType]) {
//         //   vars.tthcType = tthcMap[vars.tthcType];
//         const tthcId = vars.tthcType;

//         // Lưu lại ID gốc để filter
//         if (tthcId && tthcId.length === 24) {
//           vars.originalTthcTypeId = tthcId;
//         }

//         // Thay thế ID bằng name để hiển thị
//         if (tthcId && allTthcMap[tthcId]) {
//           vars.tthcType = allTthcMap[tthcId].name;
//         }
//         return { ...item, variables: vars };
//       });
//     }

//     // Helper: bỏ dấu
//     function removeAccents(str: string): string {
//       return str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
//     }

//     // Apply new search filters
//     let filteredResult = result;

//     // Lọc theo unit (điều kiện AND)
//     if (unit && String(unit).trim() !== '') {
//       filteredResult = filteredResult.filter((item: any) => {
//         return item.variables?.unit === unit;
//       });
//     }

//     // Lọc theo thời gian (năm, quý, tháng, ngày)
//     if (year || quarter || month || day || startDate || endDate) {
//       filteredResult = filteredResult.filter((item: any) => {
//         const cancelTime = item.variables?.cancelTime;
//         if (!cancelTime) return false;

//         // Thêm các định dạng có chứa thời gian để parse chính xác
//         const date = moment(cancelTime, [
//           'DD/MM/YYYY HH:mm:ss',
//           'DD/MM/YYYY',
//           'MM/DD/YYYY',
//           'YYYY-MM-DD'
//         ], true);
//         if (!date.isValid()) return false;

//         // Lọc theo năm
//         if (year && date.year() !== Number(year)) return false;

//         // Lọc theo quý
//         if (quarter && date.quarter() !== Number(quarter)) return false;

//         // Lọc theo tháng
//         if (month && date.month() + 1 !== Number(month)) return false;

//         // Lọc theo ngày
//         if (day && date.date() !== Number(day)) return false;

//         // Lọc theo tuần
//         if (week && date.week() !== Number(week)) return false;

//         // Lọc theo khoảng startDate, endDate
//         if (startDate) {
//           const start = moment(startDate, ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], true);
//           if (start.isValid() && date.isBefore(start, 'day')) return false;
//         }
//         if (endDate) {
//           const end = moment(endDate, ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], true);
//           if (end.isValid() && date.isAfter(end, 'day')) return false;
//         }

//         return true; // Nếu qua hết các điều kiện
//       });
//     }

//     // Filter by KQGQTTHCCode
//     const allUserFilters: [string, any][] = [];
//     if (userFilters && typeof userFilters === 'object') {
//       allUserFilters.push(...Object.entries(userFilters));
//     }
//     if (KQGQTTHCCode) {
//       allUserFilters.push(['KQGQTTHCCode', KQGQTTHCCode]);
//     }
//     if (codeProfile) {
//       allUserFilters.push(['code', codeProfile]);
//     }
//     if (tthcType) {
//       allUserFilters.push(['tthcType', tthcType]);
//     }
//     // Không thêm 'unit' vào allUserFilters nữa vì đã xử lý riêng
//     // if (unit) {
//     //   allUserFilters.push(['unit', unit]);
//     // }

//     const activeFilters = allUserFilters.filter(
//       ([, value]) => value !== null && value !== undefined && value !== ''
//     );

//     if (activeFilters.length > 0) {
//       filteredResult = filteredResult.filter((item: any) => {
//         //     // Xử lý tthcType riêng với logic AND
//         //     const tthcTypeFilterValue = activeFilters.find(([key]) => key === 'tthcType')?.[1];
//         //     if (tthcTypeFilterValue) {
//         //       const originalId = item.variables?.originalTthcTypeId;
//         //       if (originalId) {
//         //         const tthcData = allTthcMap[originalId];
//         //         if (tthcData) {
//         //           const nameMatch = removeAccents(tthcData.name) === removeAccents(String(tthcTypeFilterValue));
//         //           const codeMatch = removeAccents(tthcData.code) === removeAccents(String(tthcTypeFilterValue));
//         //           if (!nameMatch && !codeMatch) {
//         //             return false; // Không khớp cả name và code
//         //           }
//         //         } else {
//         //           return false; // Không tìm thấy tthcData
//         //         }
//         //       } else {
//         //         return false; // Không có originalId

//         //       }
//         //     }

//         //     // Lọc các trường còn lại với logic OR
//         //     const otherFilters = activeFilters.filter(([key]) => key !== 'tthcType' && key !== 'unit');
//         //     if (otherFilters.length === 0 && tthcTypeFilterValue) return true; // Nếu chỉ có filter tthcType và đã match

//         //     // Nếu không có filter nào khác, không cần chạy some
//         //     if (otherFilters.length === 0) return false;

//         //     return otherFilters.some(([key, value]) => {
//         // Ignore empty/null/undefined filter values from the payload
//         return activeFilters.some(([key, value]) => {
//           const searchKey = key === 'codeProfile' ? 'code' : key;
//           const fieldValue = item.variables[searchKey];
//           if (fieldValue == null) return false;
//           return removeAccents(String(fieldValue)).includes(removeAccents(String(value)));
//         });
//       });
//     }
//     // Gắn flag isMatched dựa trên variableValues
//     const matchedIds = mergedVariableValues.length > 0
//       ? (await firstValueFrom(
//         this.httpService.post(`${process.env.CAMUNDA_MEDIUM}/variable-instance`, {
//           processInstanceIdIn: processInstanceIds,
//           variableValues: mergedVariableValues,
//         }),
//       )).data.map((v: any) => v.activityInstanceId)
//       : [];

//     filteredResult = filteredResult.map(item => ({
//       ...item,
//       isMatched: matchedIds.includes(item.activityInstanceId),
//     }));
//     // Filter activityInstanceId nếu có filter
//     let finalResult = activityInstanceIdFilter
//       ? filteredResult.filter(item => item.activityInstanceId === activityInstanceIdFilter)
//       : filteredResult;

//     // 👉 Thêm logic SORT vào đây
//     if (sort && typeof sort === 'object' && sort !== null) {
//       const [[field, order]] = Object.entries(sort); // lấy cột đầu tiên
//       finalResult.sort((a: any, b: any) => {
//         const valA = a.variables?.[field] || '';
//         const valB = b.variables?.[field] || '';
//         // Xử lý sắp xếp cho ngày tháng
//         if (moment(valA, 'DD/MM/YYYY', true).isValid() && moment(valB, 'DD/MM/YYYY', true).isValid()) {
//           return (moment(valA, 'DD/MM/YYYY').unix() - moment(valB, 'DD/MM/YYYY').unix()) * (order === -1 ? -1 : 1);
//         }
//         const cmp = String(valA).localeCompare(String(valB), 'vi', { sensitivity: 'base' });
//         return order === -1 ? -cmp : cmp; // -1: desc, 1: asc
//       });
//     }

//     // Get total before pagination
//     const total = finalResult.length;

//     // Apply pagination
//     if (limit && typeof limit === 'number' && limit > 0) {
//       const pageNumber = (page && typeof page === 'number' && page > 0) ? page : 1;
//       const skip = (pageNumber - 1) * limit;
//       finalResult = finalResult.slice(skip, skip + limit);
//     }

//     return {
//       data: finalResult,
//       total: total,
//       page: page || 1,
//       limit: limit || total,
//       totalPages: limit ? Math.ceil(total / limit) : 1
//     };
//   }

//   @Post('detail/:activityInstanceId')
//   async getVariableDetailById(
//     @Param('activityInstanceId') activityInstanceId: string,
//     @Body('processFn') processFn: string,
//   ) {
//     return this.service.getVariableDetailById(activityInstanceId, processFn);
//   }


//   @Post('schedule-expire-multiple')
//   async scheduleExpireMultiple(
//     @Body() body: { activityInstanceIds: string[]; expireAt: Date },
//     @Res() res: Response,
//   ) {
//     try {
//       const { activityInstanceIds, expireAt } = body;
//       if (!Array.isArray(activityInstanceIds) || activityInstanceIds.length === 0) {
//         return res.status(HttpStatus.BAD_REQUEST).json({
//           success: false,
//           message: 'Danh sách activityInstanceId không được trống',
//         });
//       }

//       const result = await this.service.scheduleExpireMultiple(
//         activityInstanceIds,
//         new Date(expireAt),
//       );

//       return res.status(HttpStatus.OK).json(result);
//     } catch (error: any) {
//       return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
//         success: false,
//         message: error.message || 'Có lỗi xảy ra',
//       });
//     }
//   }


//   @Post('schedule-status-multiple')
//   async scheduleStatusMultiple(
//     @Body() body: { activityInstanceIds: string[]; startAt: Date; endAt: Date },
//     @Res() res: Response,
//   ) {
//     try {
//       const { activityInstanceIds, startAt, endAt } = body;

//       if (!Array.isArray(activityInstanceIds) || activityInstanceIds.length === 0) {
//         return res.status(HttpStatus.BAD_REQUEST).json({
//           success: false,
//           message: 'Danh sách activityInstanceId không được trống',
//         });
//       }

//       if (!startAt || !endAt) {
//         return res.status(HttpStatus.BAD_REQUEST).json({
//           success: false,
//           message: 'startAt và endAt phải được cung cấp',
//         });
//       }

//       const result = await this.service.scheduleStatusMultiple(
//         activityInstanceIds,
//         new Date(startAt),
//         new Date(endAt),
//       );

//       return res.status(HttpStatus.OK).json(result);
//     } catch (error: any) {
//       return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
//         success: false,
//         message: error.message || 'Có lỗi xảy ra',
//       });
//     }
//   }

//   @Post('schedule-signature-check')
//   async scheduleSignatureCheck(
//     @Body() body: { activityInstanceIds: string[]; expireAt: Date; processFn: string },
//     @Res() res: Response,
//   ) {
//     try {
//       const { activityInstanceIds, expireAt, processFn } = body;
//       if (!Array.isArray(activityInstanceIds) || activityInstanceIds.length === 0) {
//         return res.status(HttpStatus.BAD_REQUEST).json({
//           success: false,
//           message: 'Danh sách activityInstanceId không được trống',
//         });
//       }
//       if (!processFn) {
//         return res.status(HttpStatus.BAD_REQUEST).json({
//           success: false,
//           message: 'processFn là bắt buộc',
//         });
//       }

//       const result = await this.service.scheduleSignatureCheck(
//         activityInstanceIds,
//         new Date(expireAt),
//         processFn,
//       );

//       return res.status(HttpStatus.OK).json(result);
//     } catch (error: any) {
//       return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
//         success: false,
//         message: error.message || 'Có lỗi xảy ra',
//       });
//     }
//   }

//   @Post('check-signature-now')
//   async checkSignatureNow(
//     @Body() body: { activityInstanceIds: string[]; processFn: string },
//     @Res() res: Response,
//   ) {
//     try {
//       const { activityInstanceIds, processFn } = body;
//       if (!Array.isArray(activityInstanceIds) || activityInstanceIds.length === 0) {
//         return res.status(HttpStatus.BAD_REQUEST).json({
//           success: false,
//           message: 'Danh sách activityInstanceId không được trống',
//         });
//       }
//       if (!processFn) {
//         return res.status(HttpStatus.BAD_REQUEST).json({
//           success: false,
//           message: 'processFn là bắt buộc',
//         });
//       }

//       const result = await this.service.checkSignatureNow(
//         activityInstanceIds,
//         processFn,
//       );

//       return res.status(HttpStatus.OK).json(result);
//     } catch (error: any) {
//       return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
//         success: false,
//         message: error.message || 'Có lỗi xảy ra khi kiểm tra chữ ký',
//       });
//     }
//   }

//   @Post('update-test-date')
//   async updateTestDate(
//     @Body() body: { activityInstanceIds: string[]; expireAt: Date; processFn: string },
//     @Res() res: Response,
//   ) {
//     try {
//       const { activityInstanceIds, expireAt, processFn } = body;
//       if (!Array.isArray(activityInstanceIds) || activityInstanceIds.length === 0) {
//         return res.status(HttpStatus.BAD_REQUEST).json({
//           success: false,
//           message: 'Danh sách activityInstanceId không được trống',
//         });
//       }
//       if (!processFn) {
//         return res.status(HttpStatus.BAD_REQUEST).json({
//           success: false,
//           message: 'processFn là bắt buộc',
//         });
//       }
//       if (!expireAt) {
//         return res.status(HttpStatus.BAD_REQUEST).json({
//           success: false,
//           message: 'expireAt là bắt buộc',
//         });
//       }

//       const result = await this.service.updateTestDate(activityInstanceIds, new Date(expireAt), processFn);

//       return res.status(HttpStatus.OK).json(result);
//     } catch (error: any) {
//       return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
//         success: false,
//         message: error.message || 'Có lỗi xảy ra khi cập nhật testDate',
//       });
//     }
//   }

//   @Post('updateCancelTime')
//   async updateCancelTime(
//     @Body() body: { activityInstanceIds: string[]; expireAt: Date; processFn: string },
//     @Res() res: Response,
//   ) {
//     try {
//       const { activityInstanceIds, expireAt, processFn } = body;
//       if (!Array.isArray(activityInstanceIds) || activityInstanceIds.length === 0) {
//         return res.status(HttpStatus.BAD_REQUEST).json({
//           success: false,
//           message: 'Danh sách activityInstanceId không được trống',
//         });
//       }
//       if (!processFn) {
//         return res.status(HttpStatus.BAD_REQUEST).json({
//           success: false,
//           message: 'processFn là bắt buộc',
//         });
//       }
//       if (!expireAt) {
//         return res.status(HttpStatus.BAD_REQUEST).json({
//           success: false,
//           message: 'expireAt là bắt buộc',
//         });
//       }

//       const result = await this.service.updateCancelTime(activityInstanceIds, new Date(expireAt), processFn);

//       return res.status(HttpStatus.OK).json(result);
//     } catch (error: any) {
//       return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
//         success: false,
//         message: error.message || 'Có lỗi xảy ra khi cập nhật cancelTime',
//       });
//     }
//   }

//   @Post('export')
//   async exportVariablesList(
//     @Body() body: Record<string, any> = {},
//     @Res() res: Response,
//   ) {
//     const { processFn } = body;

//     // 👉 tái sử dụng hàm getVariablesList
//     const { data } = await this.getVariablesList('1', String(Number.MAX_SAFE_INTEGER), body);

//     // 1. Tạo workbook và worksheet
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('Variables');

//     // 2. Lấy metadata fields từ FeatureManagement
//     const featureManagement: any = await this.featureManagementRepo.findOne({
//       where: { code: processFn },
//     });

//     const valueField = featureManagement?.valueField;

//     const fields = valueField?.field || [];

//     // Map key -> label
//     const fieldMap = new Map(fields.map((f: any) => [f.key, f.label]));

//     // 3. Xác định các cột động dựa trên keys trong variables
//     const allKeys = Array.from(
//       new Set(
//         data.flatMap((item: any) => Object.keys(item.variables || {})),
//       ),
//     );

//     // 3.1 Lọc key: chỉ lấy khi có label trong fieldMap và không phải toàn số
//     const filteredKeys = allKeys.filter(
//       (k: string) => fieldMap.has(k) && !/^\d+$/.test(k),
//     );

//     // 3.2 Tạo columns
//     worksheet.columns = filteredKeys.map((k: string) => ({
//       header: fieldMap.get(k) as string, // chắc chắn là string
//       key: k,
//       width: 20,
//     }));

//     // 4. Style cho header
//     worksheet.getRow(1).eachCell((cell) => {
//       cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // trắng
//       cell.fill = {
//         type: 'pattern',
//         pattern: 'solid',
//         fgColor: { argb: 'FF666666' }, // xám đậm
//       };
//       cell.alignment = { vertical: 'middle', horizontal: 'center' };
//     });

//     // 5. Ghi dữ liệu vào excel (chỉ giữ key hợp lệ)
//     data.forEach((item: any) => {
//       const row: Record<string, any> = {};
//       filteredKeys.forEach((k) => {
//         row[k] = item.variables?.[k] ?? '';
//       });
//       worksheet.addRow(row);
//     });

//     // 6. Set header response + trả file excel
//     res.setHeader(
//       'Content-Type',
//       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//     );
//     res.setHeader(
//       'Content-Disposition',
//       `attachment; filename=variables_${moment().format(
//         'YYYYMMDD_HHmmss',
//       )}.xlsx`,
//     );

//     await workbook.xlsx.write(res);
//     res.end();
//   }


//   @Get(':processInstanceId')
//   async getVariableDetail(
//     @Param('processInstanceId') processInstanceId: string,
//   ) {
//     const { data } = await axios.get(
//       `${process.env.CAMUNDA_MEDIUM}/task?processInstanceId=${processInstanceId}&active=true`,
//     );
//     if (!data) {
//       throw new NotFoundException(
//         `Khong the tim thay quy trinh voi id: ${processInstanceId}`,
//       );
//     }
//     const taskId = data[0]?.id;
//     const { data: variablesData } = await axios.get(
//       `${process.env.CAMUNDA_MEDIUM}/task/${taskId}/variables`,
//     );
//     if (!variablesData) {
//       throw new NotFoundException(
//         `Khong the tim thay cac bien cua task co id: ${processInstanceId}`,
//       );
//     }
//     return variablesData;
//   }


//   @Put('update-variable')
//   async updateVariableByProcessFn(
//     @Body() body: { processInstanceId: string; variables: Record<string, any> },
//   ) {
//     return this.service.updateVariableByProcessFn(
//       body.processInstanceId,
//       body.variables,
//     );
//   }

//   @Post('set-characters/:id')
//   async setCharacters(
//     @Param('id') processInstanceId: string,
//     @Body() body: { value: number },
//   ) {
//     return this.service.updateVariableByProcessFn(processInstanceId, {
//       characters: {
//         value: body.value,
//         type: 'Integer', // ép kiểu số
//       },
//     });
//   }

//   @Post('bulk-update-document-value')
//   async bulkUpdateDocumentValue(
//     @Body() body: { updates: { processInstanceId: string; documentValue: number }[] },
//   ) {
//     const promises = body.updates.map((item) => {
//       return this.service.updateVariableByProcessFn(item.processInstanceId, {
//         documentValue: {
//           value: item.documentValue,
//           type: 'Integer',
//         },
//       });
//     });

//     await Promise.all(promises);

//     return { message: `Đã cập nhật ${body.updates.length} bản ghi` };
//   }


//   // Hàm helper xác định type cho Camunda
//   private detectCamundaType(value: any): string {
//     if (typeof value === 'string') return 'String';
//     if (typeof value === 'number')
//       return Number.isInteger(value) ? 'Integer' : 'Double';
//     if (typeof value === 'boolean') return 'Boolean';
//     return 'Object';
//   }

//   // Xóa
//   @Delete(':id')
//   async deleteProcessInstance(@Param('id') id: string) {
//     const deleted = await this.service.deleteProcessInstance(id);
//     if (!deleted) {
//       throw new NotFoundException(`Variable with id ${id} not found`);
//     }
//     return { success: true };
//   }
//   @Delete('process-instance/multiple')
//   async deleteMultipleByProcessInstanceIds(@Body() body: { processInstanceIds: string[] }) {
//     const { processInstanceIds } = body;

//     if (!Array.isArray(processInstanceIds) || processInstanceIds.length === 0) {
//       throw new BadRequestException('processInstanceIds must be a non-empty array');
//     }

//     const result = await this.service.deleteVariablesByProcessInstanceIds(processInstanceIds);

//     return {
//       message: result.message,
//       total: result.deletedCount,
//       successCount: result.deletedCount,
//       failedCount: 0,
//     };
//   }







//   @UseGuards(JwtAuthGuard)
//   @Get('tasks-by-assignee/task')
//   async getTasksByAssignee(
//     @Req() req: any,
//     @Query('processFn') processFn: string,
//     @Query('page') page = '1',
//     @Query('limit') limit = '25',
//     @Query() query?: any, // nhận full query string
//   ) {
//     const user = req.user;
//     const userId = user?.userId;

//     if (!userId) {
//       throw new HttpException(
//         'Logged-in user ID not found',
//         HttpStatus.UNAUTHORIZED,
//       );
//     }

//     if (!processFn) {
//       throw new HttpException(
//         'processFn is required',
//         HttpStatus.BAD_REQUEST,
//       );
//     }

//     // ---------------- Parse userFilters ----------------
//     const userFilters: Record<string, any> = {};
//     for (const key of Object.keys(query || {})) {
//       const m = key.match(/^userFilters\[(.+?)\](?:\[(.+?)\])?$/);
//       if (m) {
//         const field = m[1];
//         const subField = m[2]; // ví dụ startDate / endDate
//         if (!userFilters[field]) userFilters[field] = {};

//         if (subField) {
//           userFilters[field][subField] = query[key];
//         } else {
//           userFilters[field] = query[key];
//         }
//       }
//     }

//     // ---------------- Parse sort ----------------
//     const sortParsed: Record<string, 'asc' | 'desc'> = {};
//     for (const key of Object.keys(query || {})) {
//       const m = key.match(/^sort\[(.+)\]$/);
//       if (m) {
//         sortParsed[m[1]] =
//           String(query[key]) === '-1' ||
//             String(query[key]).toLowerCase() === 'desc'
//             ? 'desc'
//             : 'asc';
//       }
//     }

//     // ---------------- Call service ----------------
//     return this.service.getTasksByAssignee(
//       processFn,
//       userId,
//       Number(page),
//       Number(limit),
//       userFilters,
//       sortParsed,
//     );
//   }


//   @Post('list-process-variables')
//   async getMultipleProcessVariables(
//     @Query('page') rawPage?: string,
//     @Query('limit') rawLimit?: string,
//     @Body() body: Record<string, any> = {},
//   ) {
//     const { processFnList, variableValues, userFilters, sort } = body;

//     // Validate processFnList is an array
//     if (!Array.isArray(processFnList) || processFnList.length === 0) {
//       throw new BadRequestException('processFnList must be a non-empty array of process function codes');
//     }

//     // Fetch data from all processes in parallel
//     const processResults = await Promise.all(
//       processFnList.map(async (processFn: string) => {
//         try {
//           const data = await this.fetchProcessVariables(processFn, variableValues);
//           // Add source process info to each item
//           return data.map((item: any) => ({
//             ...item,
//             processInfo: {
//               processFn,
//               processName: processFn // You can map to actual process names if needed
//             }
//           }));
//         } catch (error) {
//           console.error(`Error fetching data for process ${processFn}:`, error);
//           return [];
//         }
//       })
//     );

//     // Combine all results and flatten the structure
//     let result = processResults.flat().map((item: any) => ({
//       activityInstanceId: item.activityInstanceId,
//       processInfo: item.processInfo,
//       ...item.variables,
//     }));

//     // Helper function to remove diacritics for string comparison
//     function removeAccents(str: string): string {
//       return str
//         ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
//         : '';
//     }

//     type DateFilter = { startDate: string; endDate: string };

//     // Apply user filters if any
//     if (userFilters && typeof userFilters === 'object') {
//       const filters = Object.entries(userFilters).filter(([, value]) => {
//         if (typeof value === 'string') return value.trim() !== '';
//         if (typeof value === 'number') return true;
//         return value !== null && value !== undefined;
//       });

//       if (filters.length > 0) {
//         // 🟢 Lấy riêng font ra
//         const fontFilter = filters.find(([key]) => key === 'font');
//         const otherFilters = filters.filter(([key]) => key !== 'font');

//         result = result.filter((item: any) => {
//           let match = false;

//           // 🔹 Nếu có các filter khác → OR logic
//           if (otherFilters.length > 0) {
//             match = otherFilters.some(([key, value]) => {
//               const fieldValue = item[key];
//               if (fieldValue == null) return false;

//               if (typeof fieldValue === 'string') {
//                 return removeAccents(fieldValue).includes(removeAccents(String(value)));
//               }
//               return fieldValue == value;
//             });
//           } else {
//             match = true; // nếu không có filter nào ngoài font thì giữ nguyên
//           }

//           // 🔸 Nếu có font → phải thêm điều kiện AND với font
//           if (fontFilter) {
//             const [key, value] = fontFilter;
//             const fieldValue = item[key];
//             if (!fieldValue) return false;
//             const isFontMatch =
//               typeof fieldValue === 'string' &&
//               removeAccents(fieldValue).includes(removeAccents(String(value)));

//             return match && isFontMatch;
//           }

//           return match;
//         });
//       }
//     }

//     let sortObject = sort;
//     if (sort && typeof sort === 'string') {
//       try {
//         sortObject = JSON.parse(sort);
//       } catch (e) {
//         console.error("Lỗi khi parse sort JSON:", e);
//         sortObject = null;
//       }
//     }

//     // Apply sorting if specified
//     if (sortObject && typeof sortObject === 'object' && sortObject !== null) {
//       const [[field, order]] = Object.entries(sortObject);
//       result.sort((a: any, b: any) => {
//         const valA = a[field] || '';
//         const valB = b[field] || '';
//         const cmp = String(valA).localeCompare(String(valB), 'vi', { sensitivity: 'base' });
//         return order === -1 ? -cmp : cmp;
//       });
//     }

//     // Helper function to convert to positive integer
//     const toPositiveInt = (v: any, def: number) => {
//       const n = parseInt(String(v ?? ''), 10);
//       return Number.isFinite(n) && n > 0 ? n : def;
//     };

//     // Handle pagination
//     const page = toPositiveInt(rawPage, 1);
//     const limit = toPositiveInt(rawLimit, 10);
//     const totalItems = result.length;
//     const totalPages = Math.ceil(totalItems / limit);
//     const startIndex = (page - 1) * limit;
//     const pagedData = result.slice(startIndex, startIndex + limit);

//     return {
//       page,
//       limit,
//       totalItems,
//       totalPages,
//       data: pagedData,
//       summary: {
//         totalProcesses: processFnList.length,
//         processesWithData: processResults.filter(r => r.length > 0).length,
//       }
//     };
//   }

//   @Get('list-process-variables')
//   async getMultipleProcessVariablesGet(
//     @Query('page') rawPage?: string,
//     @Query('limit') rawLimit?: string,
//     @Query('processFnList') processFnListStr?: string,
//     @Query('variableValues') variableValuesStr?: string,
//     @Query('userFilters') userFiltersStr?: string,
//     @Query('sort') sortStr?: string,
//   ) {

//     // Tất cả các tham số phải được encode dưới dạng JSON string dạng dưới đây
//     // {
//     //   page?: string;             // Ví dụ: "1"
//     //   limit?: string;           // Ví dụ: "10"
//     //   processFnList: string;    // Ví dụ: '["process1","process2"]'
//     //   variableValues?: string;  // Ví dụ: '[]'
//     //   userFilters?: string;     // Ví dụ: '{"fieldName":"value"}'
//     //   sort?: string;           // Ví dụ: '{"fieldName":1}'
//     // }

//     // Parse query parameters with type safety
//     let processFnList: string[] = [];
//     let variableValues: any[] = [];
//     let userFilters: any;
//     let sort: any;

//     try {
//       // Ensure processFnList is always an array
//       const parsedProcessFnList = processFnListStr ? JSON.parse(processFnListStr) : [];
//       processFnList = Array.isArray(parsedProcessFnList) ? parsedProcessFnList : [];

//       // Ensure variableValues is always an array
//       const parsedVariableValues = variableValuesStr ? JSON.parse(variableValuesStr) : [];
//       variableValues = Array.isArray(parsedVariableValues) ? parsedVariableValues : [];

//       userFilters = userFiltersStr ? JSON.parse(userFiltersStr) : undefined;
//       sort = sortStr ? JSON.parse(sortStr) : undefined;
//     } catch (error) {
//       throw new BadRequestException('Invalid JSON in query parameters');
//     }

//     // Validate processFnList is an array
//     if (!Array.isArray(processFnList) || processFnList.length === 0) {
//       throw new BadRequestException('processFnList must be a non-empty array of process function codes');
//     }

//     // Fetch data from all processes in parallel
//     const processResults = await Promise.all(
//       processFnList.map(async (processFn: string) => {
//         try {
//           const data = await this.fetchProcessVariables(processFn, variableValues);
//           // Add source process info to each item
//           return data.map((item: any) => ({
//             ...item,
//             processInfo: {
//               processFn,
//               processName: processFn // You can map to actual process names if needed
//             }
//           }));
//         } catch (error) {
//           console.error(`Error fetching data for process ${processFn}:`, error);
//           return [];
//         }
//       })
//     );

//     // Combine all results and flatten the structure
//     let result = processResults.flat().map((item: any) => ({
//       activityInstanceId: item.activityInstanceId,
//       processInfo: item.processInfo,
//       ...item.variables,
//     }));

//     // Helper function to remove diacritics for string comparison
//     function removeAccents(str: string): string {
//       return str
//         ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
//         : '';
//     }

//     type DateFilter = { startDate: string; endDate: string };

//     // Apply user filters if any
//     if (userFilters && typeof userFilters === 'object') {
//       const filters = Object.entries(userFilters).filter(([, value]) => {
//         if (typeof value === 'string') return value.trim() !== '';
//         if (typeof value === 'number') return true;
//         return value !== null && value !== undefined;
//       });

//       if (filters.length > 0) {
//         result = result.filter((item: any) => {
//           return filters.every(([key, value]) => {
//             const fieldValue = item[key];
//             if (fieldValue == null) return false;

//             // Handle date range filters
//             if (typeof value === 'object' && value !== null && 'startDate' in value && 'endDate' in value) {
//               const { startDate, endDate } = value as DateFilter;
//               const parsedFieldDate = moment(fieldValue, 'DD/MM/YYYY', true);
//               const start = moment(startDate);
//               const end = moment(endDate);
//               return parsedFieldDate.isValid() && parsedFieldDate.isBetween(start, end, 'day', '[]');
//             }

//             // Handle string comparison with accent removal
//             if (typeof fieldValue === 'string') {
//               return removeAccents(String(fieldValue)).includes(removeAccents(String(value)));
//             }

//             // Handle direct comparison for other types
//             return fieldValue == value;
//           });
//         });
//       }
//     }

//     // Apply sorting if specified
//     if (sort && typeof sort === 'object' && sort !== null) {
//       const [[field, order]] = Object.entries(sort);
//       result.sort((a: any, b: any) => {
//         const valA = a[field] || '';
//         const valB = b[field] || '';
//         const cmp = String(valA).localeCompare(String(valB), 'vi', { sensitivity: 'base' });
//         return order === -1 ? -cmp : cmp;
//       });
//     }

//     // Helper function to convert to positive integer
//     const toPositiveInt = (v: any, def: number) => {
//       const n = parseInt(String(v ?? ''), 10);
//       return Number.isFinite(n) && n > 0 ? n : def;
//     };

//     // Handle pagination
//     const page = toPositiveInt(rawPage, 1);
//     const limit = toPositiveInt(rawLimit, 10);
//     const totalItems = result.length;
//     const totalPages = Math.ceil(totalItems / limit);
//     const startIndex = (page - 1) * limit;
//     const pagedData = result.slice(startIndex, startIndex + limit);

//     return {
//       page,
//       limit,
//       totalItems,
//       totalPages,
//       data: pagedData,
//       summary: {
//         totalProcesses: processFnList.length,
//         processesWithData: processResults.filter(r => r.length > 0).length,
//       }
//     };
//   }

//   @UseGuards(JwtAuthGuard)
//   @Get('all/tasks')
//   async getAllTasks(
//     @Req() req: any,
//     @Query('page') page = '1',
//     @Query('limit') limit = '25',
//     @Query() query?: any,
//     @Query('processFn') processFn = '25',
//   ) {
//     const currentUserId = req.user?.userId;
//     if (!currentUserId) {
//       throw new HttpException('Logged-in user ID not found', HttpStatus.UNAUTHORIZED);
//     }

//     const searchObj: Record<string, string> = {};
//     if (query?.search) {
//       if (typeof query.search === 'string') {
//         try { Object.assign(searchObj, JSON.parse(query.search)); } catch { }
//       } else if (typeof query.search === 'object') {
//         Object.assign(searchObj, query.search);
//       }
//     }
//     for (const k of Object.keys(query || {})) {
//       const m = k.match(/^search\[(.+)\]$/);
//       if (m) searchObj[m[1]] = query[k];
//     }

//     const sortParsed: Record<string, 'asc' | 'desc'> = {};
//     if (query?.sort) {
//       if (typeof query.sort === 'string') {
//         try { Object.entries(JSON.parse(query.sort)).forEach(([f, v]) => { sortParsed[f] = String(v) === '-1' ? 'desc' : 'asc'; }); } catch { }
//       } else if (typeof query.sort === 'object') {
//         Object.entries(query.sort).forEach(([f, v]) => { sortParsed[f] = String(v) === '-1' ? 'desc' : 'asc'; });
//       }
//     }
//     for (const k of Object.keys(query || {})) {
//       const m = k.match(/^sort\[(.+)\]$/);
//       if (m) sortParsed[m[1]] = String(query[k]) === '-1' ? 'desc' : 'asc';
//     }

//     return this.service.getAllTasks(
//       currentUserId,
//       Number(page),
//       Number(limit),
//       searchObj,
//       sortParsed,
//       processFn
//     );
//   }
//   @Get('sub-items/do')
//   async getSubItemsByCriteriaStatus(@Query('processFn') processFn: string) {
//     if (!processFn) {
//       throw new HttpException('processFn query parameter is required', HttpStatus.BAD_REQUEST);
//     }

//     const result = await this.service.findSubItemsByCriteriaStatus(processFn);
//     return { data: result };
//   }
// }
