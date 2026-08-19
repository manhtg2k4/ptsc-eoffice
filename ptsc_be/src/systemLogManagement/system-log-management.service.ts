// import { Injectable, NotFoundException } from '@nestjs/common';
// import { CreateSystemLogDto } from './create-system-log.dto';
// // import { SystemLog } from './system-log.entity';
// import { UpdateSystemLogDto } from './update-system-log.dto';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { SystemLog, SystemLogDocument } from './system-log.schema';
// import { SystemLogServiceSql } from './system-log-service-sql';
// import moment from 'moment';
// function normalizeIp(ip: string | undefined): string {
//   if (!ip) return '';
//   if (ip.startsWith('::ffff:')) {
//     return ip.substring(7);
//   }
//   return ip;
// }

// @Injectable()
// export class SystemLogManagementService {
//   constructor(
//     @InjectModel(SystemLog.name)
//     private readonly systemLogModel: Model<SystemLogDocument>,
//     private readonly systemLogServiceSql: SystemLogServiceSql,
//   ) { }

//   async create(createSystemLogDto: CreateSystemLogDto): Promise<SystemLog> {
//     const createdLog = new this.systemLogModel({
//       ...createSystemLogDto,
//       timestamp: new Date(createSystemLogDto.timestamp), // Chuyển đổi chuỗi ngày thành Date object
//       // userInfo: {
//       //   ...createSystemLogDto.userInfo,
//       //   ipAddress: normalizeIp(createSystemLogDto.userInfo.ipAddress),
//       // },
//     });
//     return createdLog.save();
//   }

//   async findAll(options: {
//     page: number;
//     limit: number;
//     method?: string;
//     search?: string;
//     details?: string;
//     fullName?: string; // Đổi tên tham số
//     ipAddress?: string; // Đổi tên tham số
//     sort?: string; // Tham số mới: chuỗi JSON để sắp xếp, ví dụ '{"details":1}'
//   }) {
//     const { page, limit, method, search, details, fullName, ipAddress, sort } = options;
//     const skip = (page - 1) * limit;

//     const andConditions: any[] = [];
//     const orConditions: any[] = [];

//     if (details) {
//       orConditions.push({ details: { $regex: details, $options: 'i' } });
//     }

//     if (method) {
//       orConditions.push({ method: { $regex: method, $options: 'i' } });
//     }

//     if (fullName) {
//       orConditions.push({ 'userInfo.fullName': { $regex: fullName, $options: 'i' } });
//     }

//     if (ipAddress) {
//       orConditions.push({ 'userInfo.ipAddress': { $regex: ipAddress, $options: 'i' } });
//     }

//     if (search && search.trim() !== '') {
//       const searchRegex = { $regex: search, $options: 'i' };
//       orConditions.push({ 'userInfo.fullName': searchRegex });
//       orConditions.push({ 'userInfo.ipAddress': searchRegex });
//     }

//     if (orConditions.length > 0) {
//       andConditions.push({ $or: orConditions });
//     }

//     // --- Logic sắp xếp từ chuỗi JSON ---
//     let sortOptions: any = { timestamp: -1 }; // Mặc định sắp xếp theo thời gian mới nhất
//     let collationOptions: any = undefined;

//     if (sort) {
//       try {
//         const parsedSort = JSON.parse(sort);
//         const sortField = Object.keys(parsedSort)[0];
//         const sortOrder = parsedSort[sortField];

//         if (sortField && (sortOrder === 1 || sortOrder === -1)) {
//           let actualSortField = sortField;
//           // Ánh xạ tên trường thân thiện (fullName) sang tên trường trong DB (userInfo.fullName)
//           if (sortField === 'fullName') {
//             actualSortField = 'userInfo.fullName';
//           } else if (sortField === 'ipAddress') {
//             actualSortField = 'userInfo.ipAddress';
//           }

//           sortOptions = { [actualSortField]: sortOrder };

//           // Áp dụng collation cho các trường string để sắp xếp không phân biệt hoa thường
//           const caseInsensitiveSortFields = ['details', 'method', 'userInfo.fullName'];
//           if (caseInsensitiveSortFields.includes(actualSortField)) {
//             collationOptions = { locale: 'vi', strength: 1 };
//           }
//         }
//       } catch (error) {
//         // Nếu chuỗi JSON không hợp lệ, bỏ qua và sử dụng sắp xếp mặc định
//         console.error('Lỗi phân tích tham số sort:', error);
//       }
//     }
//     // --- Kết thúc Logic sắp xếp ---

//     const query = andConditions.length > 0 ? { $and: andConditions } : {};
//     const [total, data] = await Promise.all([
//       this.systemLogModel.countDocuments(query).exec(),
//       this.systemLogModel.find(query).sort(sortOptions).collation(collationOptions).skip(skip).limit(limit).exec(),
//     ]);

//     // Làm phẳng cấu trúc userInfo
//     const flattenedData = data.map(log => {
//       const logObject = log.toObject();
//       return {
//         ...logObject,
//         // fullName: logObject.userInfo?.fullName,
//         // userName: logObject.userInfo?.userName,
//         // organization: logObject.userInfo?.organization,
//         // ipAddress: logObject.userInfo?.ipAddress,
//         timestamp: logObject.timestamp
//           ? moment(logObject.timestamp).format('DD/MM/YYYY HH:mm:ss')
//           : null,
//       };
//     });

//     const totalPages = Math.ceil(total / limit);
//     return {
//       data: flattenedData,
//       total,
//       page,
//       limit,
//       totalPages,
//     };
//   }

//   async findOne(id: string): Promise<SystemLog> {
//     const log = await this.systemLogModel.findById(id).exec();
//     if (!log) {
//       throw new NotFoundException(`Log with ID "${id}" not found`);
//     }
//     return log;
//   }

//   async update(id: string, updateSystemLogDto: UpdateSystemLogDto): Promise<SystemLog> {
//     const updatedLog = await this.systemLogModel.findByIdAndUpdate(id, updateSystemLogDto, { new: true }).exec();
//     if (!updatedLog) {
//       throw new NotFoundException(`Log with ID "${id}" not found`);
//     }
//     return updatedLog;
//   }

//   async remove(ids: string[]) {
//     const result = await this.systemLogModel.deleteMany({ _id: { $in: ids } }).exec();
//     if (result.deletedCount === 0) throw new NotFoundException(`Không tìm thấy bản ghi nào với các ID đã cung cấp.`);
//     return { message: `Đã xóa thành công ${result.deletedCount} bản ghi.` };
//   }

// }