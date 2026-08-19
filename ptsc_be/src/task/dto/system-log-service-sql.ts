import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like } from 'typeorm';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
import { QueryParams } from 'src/interfaces';
// import { SystemLogDocument, SystemLogTask } from './system-log.schema';
import { v4 as uuidv4 } from 'uuid';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { CreateSystemLogDto } from './create-system-log.dto';
import { SystemLogEntity } from './system-log.entity';


@Injectable()
export class SystemLogTaskServiceSql {
  constructor(
    // @InjectModel(SystemLogTask.name)
    // private readonly systemLogMongoModel: Model<SystemLogDocument>,

    @InjectRepository(SystemLogEntity, 'mssqlConnection')
    private readonly systemLogsql: Repository<SystemLogEntity>,
  ) { 
  }

  async create(createLogDto: CreateSystemLogDto): Promise<SystemLogEntity> {
    const logEntity = this.systemLogsql.create({
      id: uuidv4(), // Tạo một UUID mới cho cột 'id'
      actions: createLogDto.actions,
      details: createLogDto.details,
      userInfoId: createLogDto.userInfo,
      timestamps: new Date(createLogDto.timestamps),
      taskId: createLogDto.taskId,
      note: createLogDto.note,
    });

    // Dùng save để vừa insert vừa update nếu đã tồn tại
    return this.systemLogsql.save(logEntity);
  }

  // async findAll(queryParams: QueryParams) {
  //   const page = queryParams.page ? Number(queryParams.page) : 1;
  //   const limit = queryParams.limit ? Number(queryParams.limit) : 100;
  //   const { filter, sort } = queryParams;
  //   const skip = (page - 1) * limit;

  //   const subQb = this.systemLogsql
  //     .createQueryBuilder('log')
  //     .select('log.id', 'id');

  //   if (filter) {
  //     let parsedFilter: Record<string, any> = {};
  //     try {
  //       parsedFilter =
  //         typeof filter === 'string' ? JSON.parse(filter) : filter;
  //     } catch {
  //       parsedFilter = {};
  //     }

  //     Object.keys(parsedFilter).forEach((key) => {
  //       subQb.andWhere(`log.${key} LIKE :${key}`, {
  //         [key]: `%${parsedFilter[key]}%`,
  //       });
  //     });
  //   }

  //   if (sort) {
  //     const [field, order] = sort.split(',');
  //     subQb.orderBy(
  //       `log.${field}`,
  //       order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
  //     );
  //   } else {
  //     subQb.orderBy('log.createdAt', 'DESC');
  //   }

  //   subQb.offset(skip).limit(limit);
  //   const qb = this.systemLogsql
  //   .createQueryBuilder('log')
  //   .leftJoin('log.userInfo', 'u')
  //   .leftJoin(
  //     OrganizationUnitEntity,
  //     'ou',
  //     'ou.id = u.parent',
  //   )
  //   .where(`log.id IN (${subQb.getQuery()})`)
  //   .setParameters(subQb.getParameters());

  //   qb.select([
  //     'log.id AS id',
  //     'log.actions AS actions',
  //     'log.details AS details',
  //     'log.method AS method',
  //     'log.status AS status',
  //     'log.type AS type',
  //     'log.subType AS subType',
  //     'log.ipAddress AS ipAddress',
  //     'log.timestamp AS timestamp',

  //     'log.userInfoId AS userId',
  //     'u.username AS userName',
  //     'u.name AS fullName',

  //     'ou.name AS organization',
  //   ]);

  //   if (sort) {
  //     const [field, order] = sort.split(',');
  //     if (['userName', 'fullName'].includes(field)) {
  //       qb.orderBy(`u.${field}`, order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
  //     } else {
  //       qb.orderBy(`log.${field}`, order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
  //     }
  //   } else {
  //     qb.orderBy('log.createdAt', 'DESC');
  //   }

  //    const data = await qb.getRawMany();
  //    const totalQb = this.systemLogsql
  //   .createQueryBuilder('log');

  //   if (filter) {
  //     let parsedFilter: Record<string, any> = {};
  //     try {
  //       parsedFilter =
  //         typeof filter === 'string' ? JSON.parse(filter) : filter;
  //     } catch {
  //       parsedFilter = {};
  //     }

  //     Object.keys(parsedFilter).forEach((key) => {
  //       totalQb.andWhere(`log.${key} LIKE :${key}`, {
  //         [key]: `%${parsedFilter[key]}%`,
  //       });
  //     });
  //   }

  //   const total = await totalQb.getCount();
  //   return {
  //     data,
  //     total,
  //     page,
  //     limit,
  //   };
  // }


  async findAll(queryParams: QueryParams) {
  const page = queryParams.page ? Number(queryParams.page) : 1;
  const limit = queryParams.limit ? Number(queryParams.limit) : 100;
  const { filter, sort } = queryParams;
  const skip = (page - 1) * limit;

  const subQb = this.systemLogsql
    .createQueryBuilder('log')
    .select('log.id', 'id');

  // ===== HANDLE FILTER =====
  let parsedFilter: Record<string, any> = {};
  let taskId: number | undefined;

  if (filter) {
    try {
      parsedFilter = typeof filter === 'string' ? JSON.parse(filter) : filter;
    } catch {
      parsedFilter = {};
    }

    // taskId filter special case (DB: task_id)
    if (parsedFilter.taskId) {
      taskId = Number(parsedFilter.taskId);
      delete parsedFilter.taskId;
    }

    // map key filter theo cột mới
    const keyMapping: Record<string, string> = {
      userInfo: 'user_info',
      taskId: 'task_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      note: 'note',
    };

    Object.keys(parsedFilter).forEach((key) => {
      const dbKey = keyMapping[key] || key;

      subQb.andWhere(`log.${dbKey} LIKE :${key}`, {
        [key]: `%${parsedFilter[key]}%`,
      });
    });
  }

  // taskId search in CSV string (DB column: task_id)
  if (taskId) {
    subQb.andWhere(
      `
      EXISTS (
        SELECT 1
        FROM STRING_SPLIT(log.task_id, ',')
        WHERE value = :taskId
      )
    `,
      { taskId: String(taskId) },
    );
  }

  // ===== SORT + PAGINATION =====
  if (sort) {
    const [field, order] = sort.split(',');

    const sortMapping: Record<string, string> = {
      taskId: 'task_id',
      userInfo: 'user_info',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      note: 'note',
    };

    const dbField = sortMapping[field] || field;

    subQb.orderBy(
      `log.${dbField}`,
      order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    );
  } else {
    subQb.orderBy('log.created_at', 'DESC');
  }

  subQb.offset(skip).limit(limit);

  // ===== MAIN QUERY =====
  const qb = this.systemLogsql
    .createQueryBuilder('log')
    .distinct(true)
    .leftJoin('log.userInfo', 'u') // relation vẫn là userInfo trong entity
    .leftJoin(OrganizationUnitEntity, 'ou', 'ou.id = u.parent')
    .where(`log.id IN (${subQb.getQuery()})`)
    .setParameters(subQb.getParameters());

  qb.select([
    'log.id AS id',
    'log.actions AS actions',
    'log.details AS details',

    'log.task_id AS taskId',
    'log.note AS note',

    'log.user_info AS userId',
    'u.username AS userName',
    'u.name AS fullName',
    'ou.name AS organization',

    'log.created_at AS createdAt',
    'log.updated_at AS updatedAt',
  ]);

  if (sort) {
    const [field, order] = sort.split(',');

    if (['userName', 'fullName'].includes(field)) {
      qb.orderBy(
        `u.${field === 'userName' ? 'username' : 'name'}`,
        order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
      );
    } else {
      const sortMapping: Record<string, string> = {
        taskId: 'task_id',
        userInfo: 'user_info',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        note: 'note',
      };

      const dbField = sortMapping[field] || field;

      qb.orderBy(
        `log.${dbField}`,
        order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
      );
    }
  } else {
    qb.orderBy('log.created_at', 'DESC');
  }

  const dataRaw = await qb.getRawMany();
  const dedupMap = new Map<string, any>();
  for (const row of dataRaw) {
    const key = String(row.id || '').trim();
    if (!key) continue;
    if (!dedupMap.has(key)) dedupMap.set(key, row);
  }

  const weight = (details: string): number => {
    const d = String(details || '').trim().toLowerCase();
    if (d === 'tạo dự án') return 0;
    if (d === 'thêm công việc' || d === 'tạo công việc') return 1;
    return 2;
  };

  let data = Array.from(dedupMap.values()).sort((a, b) => {
    const wa = weight(a.details);
    const wb = weight(b.details);
    if (wa !== wb) return wa - wb;
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return ta - tb;
  });

  const normalizeText = (v: any) =>
    String(v || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  // Import history mode:
  // Nếu có log "Tạo dự án", chỉ trả về log tạo dự án và log tạo/thêm công việc.
  // Trường hợp dự án hiện không có công việc thì chỉ giữ "Tạo dự án".
  const hasProjectCreateLog = data.some(
    (x) => normalizeText(x?.details) === 'tao du an',
  );
  if (hasProjectCreateLog) {
    const projectCreateLogs = data
      .filter((x) => normalizeText(x?.details) === 'tao du an')
      .sort(
        (a, b) =>
          new Date(b?.createdAt || 0).getTime() -
          new Date(a?.createdAt || 0).getTime(),
      );
    const latestProjectCreateAt = projectCreateLogs.length
      ? new Date(projectCreateLogs[0].createdAt).getTime()
      : 0;

    let hasAnyTaskInProject = false;
    if (taskId) {
      const taskCountRows = await this.systemLogsql.manager.query(
        `SELECT COUNT(1) AS cnt FROM task WHERE project_id = @0 AND status = 1`,
        [Number(taskId)],
      );
      hasAnyTaskInProject = Number(taskCountRows?.[0]?.cnt || 0) > 0;
    }

    // Tạo dự án 
    // Cập nhật tài liệu dự án 
    // Cập nhật thông tin người tham gia 
    // Cập nhật thông tin chung 
    // Cập nhật trạng thái dự án 
    // Tạo công việc trong dự án

    data = data.filter((x) => {
      const logTime = new Date(x?.createdAt || 0).getTime();
      // Chỉ lấy log cùng đợt import (sau lần "Tạo dự án" gần nhất),
      // tránh dính log cũ của task trùng ID.
      if (latestProjectCreateAt && logTime < latestProjectCreateAt) return false;

      // const d = normalizeText(x?.details);
      // if (d === 'tao du an') return true;
      // if (!hasAnyTaskInProject) return false;
      // return d === 'them cong viec' || d === 'tao cong viec';
      return true;
    });

    // Sắp xếp lại theo thời gian giảm dần (Mới nhất lên đầu)
    // Các log Cập nhật -> Tạo công việc -> Tạo dự án sẽ tự động đúng thứ tự
    data = data.sort((a, b) => {
      return new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
    });
  }

  // ===== TOTAL QUERY =====
  const totalQb = this.systemLogsql.createQueryBuilder('log');

  if (taskId) {
    totalQb.andWhere(
      `
      EXISTS (
        SELECT 1
        FROM STRING_SPLIT(log.task_id, ',')
        WHERE value = :taskId
      )
    `,
      { taskId: String(taskId) },
    );
  }

  // filter total theo mapping mới
  const keyMapping: Record<string, string> = {
    userInfo: 'user_info',
    taskId: 'task_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    note: 'note',
  };

  Object.keys(parsedFilter).forEach((key) => {
    const dbKey = keyMapping[key] || key;

    totalQb.andWhere(`log.${dbKey} LIKE :${key}`, {
      [key]: `%${parsedFilter[key]}%`,
    });
  });

  const total = await totalQb.getCount();

  return {
    data,
    total: data.length,
    page,
    limit,
  };
}


  // async syncFromMongo() {
  //   const mongoLogs = await this.systemLogMongoModel.find().exec();
  //   let syncedCount = 0;
  //   const errors: any[] = [];

  //   for (const mongoLog of mongoLogs) {
  //     try {
  //       const logEntity = this.systemLogsql.create({
  //         id: (mongoLog as any)._id.toString(), // Sử dụng _id của Mongo làm id
  //         actions: mongoLog.actions,
  //         details: mongoLog.details,
  //         userInfoId: mongoLog.userInfo,
  //         timestamps: mongoLog.timestamps,
  //         taskId: (mongoLog as any).taskId,
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

