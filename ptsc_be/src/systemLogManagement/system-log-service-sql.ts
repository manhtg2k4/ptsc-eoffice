import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like, Brackets } from 'typeorm';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
import { QueryParams } from 'src/interfaces';
import { SystemLogEntity } from './system-log.entity';
// import { SystemLog, SystemLogDocument } from './system-log.schema';
import { CreateSystemLogDto } from './create-system-log.dto';
import { v4 as uuidv4 } from 'uuid';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { FindSystemLogDto } from './find-system-log.dto';

@Injectable()
export class SystemLogServiceSql {
  constructor(
    // @InjectModel(SystemLog.name)
    // private readonly systemLogMongoModel: Model<SystemLogDocument>,

    @InjectRepository(SystemLogEntity, 'mssqlConnection')
    private readonly systemLogsql: Repository<SystemLogEntity>,
  ) { }

  async create(createLogDto: CreateSystemLogDto): Promise<SystemLogEntity> {
    const logEntity = this.systemLogsql.create({
      id: uuidv4(), // Tạo một UUID mới cho cột 'id'
      action: createLogDto.action,
      details: createLogDto.details,
      method: createLogDto.method,
      status: createLogDto.status,
      type: createLogDto.type,
      subType: createLogDto.subType,
      userInfoId: createLogDto.userInfo,
      ipAddress: createLogDto.ipAddress,
      timestamp: new Date(createLogDto.timestamp),
    });

    // Dùng save để vừa insert vừa update nếu đã tồn tại
    return this.systemLogsql.save(logEntity);
  }


  // async findAll(queryParams: QueryParams) {
  //   const page = queryParams.page ? Number(queryParams.page) : 1;
  //   const limit = queryParams.limit ? Number(queryParams.limit) : 25;
  //   const { filter, sort } = queryParams;

  //   const skip = (page - 1) * limit;

  //   const options: FindManyOptions<SystemLogEntity> = {
  //     skip,
  //     take: limit, // Đã là number
  //     order: {},
  //     where: {},
  //   };

  //   // Sắp xếp
  //   if (sort) {
  //     const [field, order] = sort.split(',');
  //     options.order![field] = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  //   } else {
  //     options.order = { timestamp: 'DESC' }; // Mặc định sắp xếp mới nhất
  //   }

  //   // Lọc
  //   if (filter) {
  //     let parsedFilter: Record<string, any> = {}; // Khởi tạo với một đối tượng rỗng
  //     try {
  //       // Tham số truy vấn 'filter' được mong đợi là một chuỗi JSON.
  //       // Lỗi TypeScript "Argument of type '{}' is not assignable to parameter of type 'string'."
  //       // cho thấy TypeScript có thể suy luận 'filter' là một kiểu đối tượng tiềm năng.
  //       // Chúng ta kiểm tra rõ ràng kiểu của nó để đảm bảo JSON.parse nhận được một chuỗi.
  //       if (typeof filter === 'string' && filter.trim().length > 0) {
  //         parsedFilter = JSON.parse(filter);
  //       } else if (typeof filter === 'object' && filter !== null) {
  //         // Trường hợp này xử lý kịch bản không chắc chắn khi filter đã là một đối tượng,
  //         // điều mà lỗi TypeScript dường như gợi ý.
  //         parsedFilter = filter as Record<string, any>;
  //       }
  //       // Nếu filter là một chuỗi rỗng, parsedFilter vẫn là {}
  //     } catch (e) {
  //       console.error('Error parsing filter JSON:', e);
  //       // Trong trường hợp lỗi phân tích cú pháp (ví dụ: chuỗi JSON không hợp lệ),
  //       // chúng ta coi đó là một bộ lọc rỗng để tránh làm sập ứng dụng.
  //       parsedFilter = {};
  //     }
  //     for (const key in parsedFilter) {
  //       if (Object.prototype.hasOwnProperty.call(parsedFilter, key)) {
  //         options.where![key] = Like(`%${parsedFilter[key]}%`);
  //       }
  //     }
  //   }
  //   const [data, total] = await this.systemLogsql.findAndCount(options);
  //   return {
  //     data,
  //     total,
  //     page,
  //     limit,
  //   };
  // }

  async findAll(queryParams: FindSystemLogDto) {
    const page = Number(queryParams.page) || 1;
    const limit = Number(queryParams.limit) || 100;
    const skip = (page - 1) * limit;

    const qb = this.systemLogsql
      .createQueryBuilder('log')
      .leftJoin('log.userInfo', 'u')
      .leftJoin(OrganizationUnitEntity, 'ou', 'ou.id = u.parent');

    if (queryParams.type) {
      qb.andWhere('log.type LIKE :type', {
        type: `%${queryParams.type}%`,
      });
    }

    if (queryParams.status) {
      qb.andWhere('log.status LIKE :status', {
        status: `%${queryParams.status}%`,
      });
    }

    if (queryParams.method || queryParams.details || queryParams.ipAddress || queryParams.fullName) {
      qb.andWhere(
        new Brackets((qb) => {
          if (queryParams.method) {
            qb.orWhere(
              `log.method COLLATE Latin1_General_CI_AI LIKE :method`,
              {
                method: `%${queryParams.method}%`,
              });
          }

          if (queryParams.details) {
            qb.orWhere(
              `log.details COLLATE Latin1_General_CI_AI LIKE :details`,
              {
                details: `%${queryParams.details}%`,
              }
            );
          }

          if (queryParams.ipAddress) {
            qb.orWhere(
              `log.ipAddress COLLATE Latin1_General_CI_AI LIKE :ipAddress`,
              {
                ipAddress: `%${queryParams.ipAddress}%`,
              }
            );
          }

          if (queryParams.fullName) {
            qb.orWhere(
              `u.name COLLATE Latin1_General_CI_AI LIKE :fullName`,
              {
                fullName: `%${queryParams.fullName}%`,
              }
            );
          }
        }),
      );
    }

    qb.select([
      'log.id AS id',
      'log.action AS action',
      'log.details AS details',
      'log.method AS method',
      'log.status AS status',
      'log.type AS type',
      'log.subType AS subType',
      'log.ipAddress AS ipAddress',
      'log.timestamp AS timestamp',

      'log.userInfoId AS userId',
      'u.username AS userName',
      'u.name AS fullName',

      'ou.name AS organization',
    ]);

    if (queryParams.sort && typeof queryParams.sort === 'object') {
      const [field, value] = Object.entries(queryParams.sort)[0];
      const direction = value === -1 ? 'DESC' : 'ASC';

      switch (field) {
        case 'userName':
          qb.orderBy('u.username', direction);
          break;
        case 'fullName':
          qb.orderBy('u.name', direction);
          break;
        case 'organization':
          qb.orderBy('org.name', direction);
          break;
        default:
          qb.orderBy(`log.${field}`, direction);
          break;
      }
    } else {
      qb.orderBy('log.createdAt', 'DESC');
    }

    const [data, total] = await Promise.all([
      qb.offset(skip).limit(limit).getRawMany(),
      qb.getCount(),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findAllLogTask(queryParams: QueryParams) {
    const page = queryParams.page ? Number(queryParams.page) : 1;
    const limit = queryParams.limit ? Number(queryParams.limit) : 100;
    const skip = (page - 1) * limit;
    const { sort } = queryParams;

    // 👉 GỘP FILTER
    let parsedFilter: Record<string, any> = {};

    // filter dạng JSON
    if (queryParams.filter) {
      try {
        const f =
          typeof queryParams.filter === 'string'
            ? JSON.parse(queryParams.filter)
            : queryParams.filter;
        parsedFilter = { ...parsedFilter, ...f };
      } catch { }
    }

    // filter dạng query param
    if (queryParams.type) parsedFilter.type = queryParams.type;
    if (queryParams.status) parsedFilter.status = queryParams.status;
    if (queryParams.method) parsedFilter.method = queryParams.method;

    // ===== SUB QUERY =====
    const subQb = this.systemLogsql
      .createQueryBuilder('log')
      .select('log.id', 'id');

    Object.keys(parsedFilter).forEach((key) => {
      subQb.andWhere(`log.${key} LIKE :${key}`, {
        [key]: `%${parsedFilter[key]}%`,
      });
    });

    if (sort) {
      const [field, order] = sort.split(',');
      subQb.orderBy(
        `log.${field}`,
        order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
      );
    } else {
      subQb.orderBy('log.createdAt', 'DESC');
    }

    subQb.offset(skip).limit(limit);

    // ===== MAIN QUERY =====
    const qb = this.systemLogsql
      .createQueryBuilder('log')
      .leftJoin('log.userInfo', 'u')
      .leftJoin(OrganizationUnitEntity, 'ou', 'ou.id = u.parent')
      .where(`log.id IN (${subQb.getQuery()})`)
      .setParameters(subQb.getParameters());

    qb.select([
      'log.id AS id',
      'log.action AS action',
      'log.details AS details',
      'log.method AS method',
      'log.status AS status',
      'log.type AS type',
      'log.subType AS subType',
      'log.ipAddress AS ipAddress',
      'log.timestamp AS timestamp',
      'u.username AS userName',
      'u.name AS fullName',
      'ou.name AS organization',
    ]);

    if (sort) {
      const [field, order] = sort.split(',');
      qb.orderBy(
        ['userName', 'fullName'].includes(field) ? `u.${field}` : `log.${field}`,
        order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
      );
    } else {
      qb.orderBy('log.createdAt', 'DESC');
    }

    const data = await qb.getRawMany();

    // ===== TOTAL =====
    const totalQb = this.systemLogsql.createQueryBuilder('log');
    Object.keys(parsedFilter).forEach((key) => {
      totalQb.andWhere(`log.${key} LIKE :${key}`, {
        [key]: `%${parsedFilter[key]}%`,
      });
    });

    const total = await totalQb.getCount();

    return { data, total, page, limit };
  }

  async createLogFromSystem(createSystemLogDto: CreateSystemLogDto): Promise<any> {
    // Hàm dùng chung cho các module khác gọi vào để tạo log từ hệ thống
    if (!createSystemLogDto.ipAddress) {
      throw new Error('User information is ipAddress');
    }
    if (!createSystemLogDto.userInfo) {
      throw new Error('User information is required');
    }
    // if (!createSystemLogDto.userInfo.fullName || !createSystemLogDto.userInfo.userName || !createSystemLogDto.userInfo.ipAddress) {
    //   throw new Error('User information must include fullName, userName, and ipAddress');
    // }

    const logData = {
      ...createSystemLogDto,
      // userInfo: {
      //   ...createSystemLogDto.userInfo,
      //   ipAddress: normalizeIp(createSystemLogDto.userInfo.ipAddress),
      // },
      timestamp: createSystemLogDto.timestamp || new Date().toISOString(),
    };

    // 3 Ghi log vào SQL Server + LOG ID
    try {
      const sqlLog = await this.create(logData);

      // console.log('BBB - SQL log ID:', sqlLog.id);
    } catch (err) {
      console.error('Lỗi khi ghi log vào SQL Server:', err);
    }

    // Ghi log vào MongoDB (bạn có thể xóa dòng này nếu không muốn ghi vào Mongo nữa)
    // const createdMongoLog = new this.systemLogModel(logData);
    // return createdMongoLog.save();
  }

  // async syncFromMongo() {
  //   const mongoLogs = await this.systemLogMongoModel.find().exec();
  //   let syncedCount = 0;
  //   const errors: any[] = [];

  //   for (const mongoLog of mongoLogs) {
  //     try {
  //       const logEntity = this.systemLogsql.create({
  //         id: (mongoLog as any)._id.toString(), // Sử dụng _id của Mongo làm id
  //         action: mongoLog.action,
  //         details: mongoLog.details,
  //         method: mongoLog.method,
  //         status: mongoLog.status,
  //         type: mongoLog.type,
  //         subType: mongoLog.subType,
  //         userInfoId: mongoLog.userInfo,
  //         ipAddress: mongoLog.ipAddress,
  //         timestamp: mongoLog.timestamp,
  //         createdAt: (mongoLog as any).createdAt,
  //         updatedAt: (mongoLog as any).updatedAt,
  //       });

  //       // Dùng save để vừa insert vừa update nếu đã tồn tại
  //       await this.systemLogsql.save(logEntity);
  //       syncedCount++;
  //     } catch (error) {
  //       errors.push({ id: mongoLog._id, error: error.message });
  //     }
  //   }

  //   return { total: mongoLogs.length, synced: syncedCount, errors };
  // }
}