import { Injectable, NotFoundException, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { CreateListDriverDto } from './dto/create-list-driver.dto';
import { UpdateListDriverDto } from './dto/update-list-driver.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ListDriverEntity } from './entities/list-driver.entity';
import { ListCarEntity } from '../list-cars/entities/list-car.entity';
import { ListDriverQueryDto } from './dto/list-driver-query.dto';
import { Repository, Not, In, } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { CrmSourcesService } from '../crmsource/crmsource.service';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

import * as sql from 'mssql';
import { format } from 'date-fns';
import { ConfigService } from '@nestjs/config';
import { FeatureManagementEntity, StatusFeature } from 'src/feature-management/feature-management.entity';
import { getMssqlPool } from 'src/database/mssql.pool';
import { parseSortVehicle } from 'src/vehicle-registration/helper/vehicle-registration.helper';
import { ConfigurationService } from 'src/view-config/configuration.service';
import { buildDriverCriteriaHelper, mapDriverVehicelState, mapDriverVehicelStateExport } from './list.driver.helper';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { VehicleRegistrationEntity, VehicleState } from 'src/vehicle-registration/entities/vehicle-registration.entity';
dayjs.extend(utc);
dayjs.extend(timezone);
@Injectable()
export class ListDriversService {
  private pool: sql.ConnectionPool | null = null;
  private readonly logger = new Logger(ListDriversService.name);
  private dbname: string;
  private licenseClassOptions: any[] = [];
  private driverStatusOptions: any[] = [];

  constructor(
    @InjectRepository(ListDriverEntity, 'mssqlConnection')
    private readonly listDriverRepository: Repository<ListDriverEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ListCarEntity, 'mssqlConnection')
    private readonly listCarRepository: Repository<ListCarEntity>,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
    @InjectRepository(VehicleRegistrationEntity, 'mssqlConnection')
    private readonly vehicleRegistrationRepo: Repository<VehicleRegistrationEntity>,


    private readonly crmSourcesService: CrmSourcesService,
    private readonly configService: ConfigService,
    private readonly configurationService: ConfigurationService,
    private readonly systemLogService: SystemLogServiceSql,
  ) { }

  private getDatabaseName(): string {
    const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
    if (!dbName) throw new Error('SQLSERVER_DATABASE not defined in .env');
    return dbName + '.dbo';
  }

  async onModuleInit() {
    this.dbname = this.getDatabaseName();
  }

  private async getPool(): Promise<sql.ConnectionPool> {
    // Nếu đã có pool instance thì trả về luôn
    if (this.pool && this.pool.connected) return this.pool;

    // Nếu chưa có thì tạo pool 1 lần
    this.pool = await getMssqlPool(this.configService);

    if (!this.pool.connected) {
      throw new Error('MSSQL pool not connected');
    }

    return this.pool;
  }

  private camelToSnake(str: string): string {
    return str.replace(/([A-Z])/g, (_, c) => `_${c.toLowerCase()}`);
  }

  private getVal(obj: any, key: string) {
    const snake = this.camelToSnake(key);
    return obj?.[key] ?? obj?.[snake];
  }


  private mapDriverAlias(
    item: any,
    aliases: Record<string, string> = {},
    isExport?: string,
    userMap = new Map<string, string>(),
    licenseClassMap: Record<string, string> = {},
    driverStatusOptions: any[] = []
  ) {
    const mapped: Record<string, any> = {};

    const val = (key: string) => this.getVal(item, key);


    for (const [sourceKey, targetKey] of Object.entries(aliases)) {
      let value = val(sourceKey);

      switch (sourceKey) {
        case 'licenseClass':
          value = licenseClassMap[value] || value;
          break;

        case 'bookingAvailable': {
          const booked = val('bookingAvailable') || val('booking_available');
          // Nếu bookingAvailable = false (0) -> Đã đặt, ngược lại là rảnh
          value = (booked === false || booked === 0) ? 'Đã đặt' : '-';
          break;
        }
        case 'createdAt':
        case 'updatedAt':
        case 'licenseIssuedDate':
          value = this.formatDate(value);
          break;

        case 'createdBy':
          value = userMap.get(value) || value;
          break;

        case 'experienceYears': {
          const licenseIssuedDate = val('licenseIssuedDate');
          if (licenseIssuedDate) {
            const issuedDate = dayjs(licenseIssuedDate);
            const now = dayjs();

            const years = now.diff(issuedDate, 'year');

            if (years < 1) {
              value = '1 năm';
            } else {
              value = `${years} năm`;
            }
          } else {
            value = '0 năm';
          }
          break;
        }
        case 'totalTrips':
          value = value ?? 0;
          break;

        case 'driverId':
        case 'driver_id': {
          const booked = val('bookingAvailable') || val('booking_available');
          mapped['isNotEdit'] = (booked === false || booked === 0);
          break;
        }

        case 'status': {
          const rawStatus = val('status');
          const statusDriver = val('statusDriver') || val('status_driver');

          value = (isExport === 'true') ? mapDriverVehicelStateExport(rawStatus) : mapDriverVehicelState(rawStatus);

          // Nếu có thông tin trạng thái vận hành từ DB (Sẵn sàng, Đang sử dụng), ưu tiên hiển thị
          if (statusDriver) {
            mapped['statusDriverOften'] = statusDriver;
          } else {
            const statusOption = driverStatusOptions.find(opt => String(opt.value) === String(rawStatus));
            mapped['statusDriverOften'] = statusOption ? statusOption.title : mapDriverVehicelStateExport(rawStatus);
          }
          break;
        }

        default:
          break;
      }

      mapped[targetKey] = value ?? '-';
    }

    return mapped;
  }
  private buildCriteria(
    filter: any
  ): Array<{ name: string; operator: string; value: string | string[] }> {

    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];

    if (!filter || typeof filter !== 'object') return criteria;

    Object.entries(filter).forEach(([key, value]) => {

      if (value === undefined || value === null || value === '') return;

      if (typeof value === 'object' && !Array.isArray(value)) {

        const val = value as {
          startDate?: string;
          endDate?: string;
          start?: string | number;
          end?: string | number;
          value?: string | number;
        };

        const start = val.startDate ?? val.start;
        const end = val.endDate ?? val.end;

        if (start !== undefined && end !== undefined) {
          criteria.push({
            name: key,
            operator: 'between',
            value: [String(start), String(end)],
          });
          return;
        }

        if (start !== undefined) {
          criteria.push({
            name: key,
            operator: 'gte',
            value: String(start),
          });
          return;
        }

        if (end !== undefined) {
          criteria.push({
            name: key,
            operator: 'lte',
            value: String(end),
          });
          return;
        }

        if (val.value !== undefined && val.value !== null) {
          criteria.push({
            name: key,
            operator: 'like',
            value: String(val.value),
          });
        }

        return;
      }

      if (typeof value === 'number') {
        criteria.push({
          name: key,
          operator: 'eq',
          value: String(value),
        });
      } else {
        criteria.push({
          name: key,
          operator: 'like',
          value: String(value),
        });
      }

    });

    return criteria;
  }
  private formatDateTime(date?: Date | null, timezone = 'Asia/Ho_Chi_Minh'): string {
    if (!date) return '-';

    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }
  private formatDate(date?: Date | null, timezone = 'Asia/Ho_Chi_Minh'): string {
    if (!date) return '-';

    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private logAsync(
    req: any,
    userId: string,
    details: string,
    status: 'SUCCESS' | 'ERROR'
  ) {
    const method = req?.method || 'UNKNOWN';
    const logData = {
      action: method,
      details,
      method: method,
      status,
      type: process.env.CLIENT_LOG || 'DHVBTC',
      subType: process.env.CLIENT_LOG || 'DHVBTC',
      userInfo: req?.user?.userId || userId || '',
      ipAddress:
        req?.headers['x-forwarded-for'] ||
        req?.socket?.remoteAddress ||
        req?.ip ||
        'Unknown',
      timestamp: new Date().toISOString(),
    };

    setImmediate(() => {
      this.systemLogService.createLogFromSystem(logData).catch(err => {
        this.logger.error('Log error:', err);
      });
    });
  }

  async findAll(query: ListDriverQueryDto, req: any, userId: string) {
    const details = `Lấy danh sách tài xế, trang: ${query.page || 1}, limit: ${query.limit || 50}`;
    try {
      const { type = 'all', page = 1, limit = 20, filter, sort, processFn, isExport, carId, unassignedManager, currentManagerId, search, fullName } = query;

      const pool = await this.getPool();

      const featureManagement = await this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
        select: {
          id: true,
          code: true,
          criteria: true,
          fields: true,
          valueField: true,
        }
      })

      const criteria = this.buildCriteria(filter);
      const fullNameCriterion = criteria.find(c => c.name === 'fullName');
      const cleanCriteria = criteria.filter(c => c.name !== 'fullName');
      const featureCriteria = featureManagement?.criteria ?? [];

      const { sql: filterFeature, joins: filterJoins, from } =
        buildDriverCriteriaHelper(
          [...featureCriteria, ...cleanCriteria],
          'list_drivers',
          featureManagement,
        );

      const where: string[] = [];
      where.push(`(${from}.status = 1 OR ${from}.status = 2)`);
      if (unassignedManager === 'true') {
        const currentManagerCondition = currentManagerId
          ? `AND manager <> '${currentManagerId}'`
          : '';
        where.push(`
          ${from}.driver_id NOT IN (
            SELECT DISTINCT manager
            FROM ${this.dbname}.list_cars
            WHERE manager IS NOT NULL AND status <> 3
            ${currentManagerCondition}
          )
        `);
      } else if (carId) {
        const assignments = await pool.request()
          .input('carId', carId)
          .query(`
            SELECT DISTINCT driver_id
            FROM vehicle_registration_assignments
            WHERE car_id = @carId
          `);
        const assignedDriverIds = assignments.recordset.map(r => r.driver_id);
        if (assignedDriverIds.length) {
          const idsStr = assignedDriverIds.map(id => `'${id}'`).join(',');
          where.push(`${from}.driver_id IN (${idsStr})`);
        }
      }

      let customJoin = '';
      const searchVal = search || fullName || fullNameCriterion?.value;
      if (searchVal && String(searchVal).trim()) {
        customJoin = ` LEFT JOIN ${this.dbname}.users u_driver ON (${from}.driver_id = u_driver.id OR ${from}.full_name = u_driver.id) `;
      }

      const joinClause = `
        ${filterJoins || ''}
        ${customJoin}
      `;

      if (filterFeature) {
        where.push(`(${filterFeature})`);
      }

      if (searchVal && String(searchVal).trim()) {
        const cleanSearch = String(searchVal).trim().replace(/'/g, "''");
        const collation = 'COLLATE SQL_Latin1_General_CP1_CI_AI';
        where.push(`
          (
            u_driver.name ${collation} LIKE N'%${cleanSearch}%' ${collation}
            OR u_driver.username ${collation} LIKE N'%${cleanSearch}%' ${collation}
            OR ${from}.full_name ${collation} LIKE N'%${cleanSearch}%' ${collation}
          )
        `);
      }

      const whereClause = ' WHERE ' + where.join(' AND ');

      const limitNum = Math.min(Number(limit) || 20, 100);
      const pageNum = Math.max(Number(page) || 1, 1);
      const offsetNum = (pageNum - 1) * limitNum;

      const { dbKeys, aliases, allFilterFields } =
        await this.configurationService.buildFilterFieldsVehicleRegistrations(
          from,
          [],
          processFn,
        );
      const driverIdField = `${from}.driver_id`;

      if (!dbKeys.some(k => k.includes('driver_id'))) {
        dbKeys.push(driverIdField);
      }
      aliases['driver_id'] = 'driverId';
      aliases['driverId'] = 'driverId';
      const selectFields = dbKeys.join(', ');

      const orderBy =
        ' ORDER BY ' + parseSortVehicle(sort, aliases, from, {});

      const totalSql = `
        SELECT COUNT(DISTINCT ${from}.id) AS total
        FROM ${this.dbname}.${from}
        ${joinClause}
        ${whereClause}
      `;

      const rowsSql = `
        SELECT DISTINCT ${selectFields}
        FROM ${this.dbname}.${from}
        ${joinClause}
        ${whereClause}
        ${orderBy}
        OFFSET ${offsetNum} ROWS
        FETCH NEXT ${limitNum} ROWS ONLY
      `;


      let totalResult;
      let rowsResult;

      try {
        const totalRequest = pool.request();
        const rowsRequest = pool.request();

        [totalResult, rowsResult] = await Promise.all([
          totalRequest.query(totalSql),
          rowsRequest.query(rowsSql),
        ]);
      } catch (e) {
        this.logger.error(e);
        throw new InternalServerErrorException('Lỗi truy vấn dữ liệu xe');
      }

      const total = totalResult.recordset[0]?.total ?? 0;
      const items = rowsResult.recordset;

      const [licenseClassData, statusSource] = await Promise.all([
        this.crmSourcesService.findByCode('HB'),
        this.crmSourcesService.findByCode('TRANGTHAITAIXE'),
      ]);

      const licenseClassMap = (licenseClassData?.items || []).reduce((m, i) => {
        m[i.value] = i.title;
        return m;
      }, {} as Record<string, string>);

      const driverStatusOptions = statusSource?.items || [];

      // ✅ Không cần query bảng registrations nữa, dùng trực tiếp cột trong bảng driver

      const userIds = [
        ...new Set([
          ...items.map((i) => i.fullName),
          ...items.map((i) => i.createdBy),
        ]),
      ].filter((id) => id);

      const users = userIds.length > 0
        ? await this.userRepository.find({
          where: { id: In(userIds as string[]) },
          select: ['id', 'name'],
        })
        : [];

      const userMap = new Map(users.map(u => [u.id, u.name]));

      const mappedItems = items.map((item) =>
        this.mapDriverAlias(item, aliases, isExport, userMap, licenseClassMap, driverStatusOptions)
      );

      this.logAsync(req, userId, details, 'SUCCESS');
      return {
        success: true,
        items: mappedItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (error) {
      this.logAsync(req, userId, details, 'ERROR');
      throw error;
    }
  }

  private mapDriver(driver: ListDriverEntity, formatDate = true) {
    return {
      ...driver,
      statusDriverOften: mapDriverVehicelStateExport(driver.status),
      licenseIssuedDate: (formatDate && driver.licenseIssuedDate)
        ? format(new Date(driver.licenseIssuedDate), 'dd/MM/yyyy')
        : driver.licenseIssuedDate,
      statusDriver: mapDriverVehicelState(driver.status),
    };
  }
  async create(createListDriverDto: CreateListDriverDto, req: any, userId: string) {
    const details = `Thêm mới tài xế: ${createListDriverDto.fullName}`;
    try {
      const { statusDriver, ...dtoData } = createListDriverDto;

      const user = await this.userRepository.findOne({
        where: { id: dtoData.fullName },
      });

      if (!user) {
        throw new BadRequestException('Người dùng không tồn tại');
      }

      const existingDriver = await this.listDriverRepository.findOne({
        where: { driverId: user.id, status: Not(3) },
      });

      if (existingDriver) {
        throw new BadRequestException('Người dùng này đã được gán làm tài xế.');
      }

      if (dtoData.licenseNumber) {
        const duplicateLicense = await this.listDriverRepository.findOne({
          where: { licenseNumber: dtoData.licenseNumber, status: Not(3) },
        });

        if (duplicateLicense) {
          throw new BadRequestException('Số bằng lái đã tồn tại trong hệ thống.');
        }
      }

      const licenseIssuedDate = new Date(createListDriverDto.licenseIssuedDate);

      const today = new Date();

      let experienceYears = today.getFullYear() - licenseIssuedDate.getFullYear();
      const m = today.getMonth() - licenseIssuedDate.getMonth();

      if (m < 0 || (m === 0 && today.getDate() < licenseIssuedDate.getDate())) {
        experienceYears--;
      }

      experienceYears = Math.max(experienceYears, 0);

      const listDriver = this.listDriverRepository.create({
        ...dtoData,
        driverId: user.id,
        fullName: user.name,
        licenseIssuedDate,
        experienceYears,
        status: statusDriver ? Number(statusDriver) : 1,
      });

      const saved = await this.listDriverRepository.save(listDriver);

      this.logAsync(req, userId, details, 'SUCCESS');
      return {
        success: true,
        message: 'Thêm mới tài xế thành công',
        data: this.mapDriver(saved, false),
      };
    } catch (error) {
      this.logAsync(req, userId, details, 'ERROR');
      throw error;
    }
  }

  async findOne(id: string, req: any, userId: string) {
    const details = `Lấy chi tiết tài xế ID: ${id}`;
    try {
      const listDriver = await this.listDriverRepository.findOne({
        where: {
          id,
          status: Not(3),
        },
      });
      if (!listDriver) {
        throw new NotFoundException(`Không tìm thấy tài xế với ID: ${id}`);
      }

      const userIdToSearch = listDriver.driverId || listDriver.fullName;
      const user = await this.userRepository.findOne({
        where: { id: userIdToSearch },
        select: ['id', 'name'],
      });

      const hbSource = await this.crmSourcesService.findByCode('HB');
      const licenseClassTitle =
        hbSource?.items.find((d: any) => d.value === listDriver.licenseClass)?.title || listDriver.licenseClass;

      const isUsing = await this.vehicleRegistrationRepo.createQueryBuilder('vr')
        .where('vr.vehicle_state IN (:...states)', { states: [VehicleState.DA_PHAN_CONG, VehicleState.TRONG_TIEN_TRINH] })
        .andWhere('(vr.driver_ids LIKE :id OR vr.coordination_information LIKE :id)', { id: `%${listDriver.driverId}%` })
        .getExists();

      const mappedData = this.mapDriver(listDriver, false);
      (mappedData as any).fullName = {
        id: user ? user.id : listDriver.driverId || listDriver.fullName,
        name: user ? user.name : listDriver.fullName,
      };
      (mappedData as any).licenseClass = licenseClassTitle;
      (mappedData as any).isNotEdit = isUsing;

      this.logAsync(req, userId, details, 'SUCCESS');
      return {
        success: true,
        data: mappedData,
      };
    } catch (error) {
      this.logAsync(req, userId, details, 'ERROR');
      throw error;
    }
  }

  async update(id: string, updateListDriverDto: UpdateListDriverDto, req: any, userId: string) {
    const details = `Cập nhật thông tin tài xế ID: ${id}`;
    try {
      const listDriver = await this.listDriverRepository.findOne({
        where: { id, status: Not(3) },
      });

      if (!listDriver) {
        throw new NotFoundException(`Không tìm thấy tài xế với ID: ${id}`);
      }

      const { statusDriver, ...dtoData } = updateListDriverDto;

      if (dtoData.fullName) {
        const user = await this.userRepository.findOne({
          where: { id: dtoData.fullName },
        });

        if (!user) {
          throw new BadRequestException('Người dùng không tồn tại');
        }

        const existingDriver = await this.listDriverRepository.findOne({
          where: { driverId: user.id, status: Not(3), id: Not(id) },
        });

        if (existingDriver) {
          throw new BadRequestException('Người dùng này đã được gán làm tài xế.');
        }

        listDriver.driverId = user.id;
        listDriver.fullName = user.name;
      }

      if (dtoData.licenseNumber) {
        const duplicateLicense = await this.listDriverRepository.findOne({
          where: { licenseNumber: dtoData.licenseNumber, status: Not(3), id: Not(id) },
        });

        if (duplicateLicense) {
          throw new BadRequestException('Số bằng lái đã tồn tại trong hệ thống.');
        }
      }

      let licenseIssuedDate = listDriver.licenseIssuedDate;

      if (dtoData.licenseIssuedDate) {
        licenseIssuedDate = new Date(dtoData.licenseIssuedDate);
      }

      const today = new Date();

      let experienceYears = today.getFullYear() - licenseIssuedDate.getFullYear();
      const m = today.getMonth() - licenseIssuedDate.getMonth();

      if (m < 0 || (m === 0 && today.getDate() < licenseIssuedDate.getDate())) {
        experienceYears--;
      }

      experienceYears = Math.max(experienceYears, 0);

      const updated = Object.assign(listDriver, {
        ...dtoData,
        fullName: dtoData.fullName ? listDriver.fullName : listDriver.fullName,
        licenseIssuedDate,
        experienceYears,
      });

      if (statusDriver) {
        updated.status = Number(statusDriver);
      }

      const saved = await this.listDriverRepository.save(updated);

      this.logAsync(req, userId, details, 'SUCCESS');
      return {
        success: true,
        message: 'Cập nhật thông tin tài xế thành công',
        data: this.mapDriver(saved, false),
      };
    } catch (error) {
      this.logAsync(req, userId, details, 'ERROR');
      throw error;
    }
  }

  async remove(id: string, req: any, userId: string) {
    const details = `Xóa tài xế ID: ${id}`;
    try {
      const listDriver = await this.listDriverRepository.findOne({
        where: { id, status: Not(3) },
        select: ['id', 'driverId', 'fullName', 'bookingAvailable'],
      });

      if (!listDriver) {
        throw new NotFoundException(`Không tìm thấy tài xế với ID: ${id}`);
      }

      // ❌ check đang sử dụng
      if (!listDriver.bookingAvailable) {
        throw new BadRequestException(
          `Tài xế ${listDriver.fullName} đang được phân công hoặc trong tiến trình`,
        );
      }
      listDriver.status = 3;
      await this.listDriverRepository.save(listDriver);

      this.logAsync(req, userId, details, 'SUCCESS');
      return {
        success: true,
        message: `Đã xóa thành công tài xế ${listDriver.fullName}`,
      };
    } catch (error) {
      this.logAsync(req, userId, details, 'ERROR');
      throw error;
    }
  }
  async removeMany(ids: string[], req: any, userId: string) {
    const details = `Xóa nhiều tài xế IDs: ${ids.join(', ')}`;
    try {
      if (!ids || ids.length === 0) {
        throw new BadRequestException('Danh sách ID không được để trống');
      }

      // Lấy driverId từ các id truyền lên
      const drivers = await this.listDriverRepository.find({
        select: ['id', 'driverId', 'fullName', 'bookingAvailable'],
        where: { id: In(ids), status: Not(3) },
      });

      if (drivers.length === 0) {
        throw new NotFoundException('Không tìm thấy tài xế nào trong danh sách đã chọn');
      }

      const bookedDrivers = drivers.filter(d => !d.bookingAvailable);

      if (bookedDrivers.length > 0) {
        const names = bookedDrivers.map(d => d.fullName);
        throw new BadRequestException(
          `Các tài xế đang được phân công hoặc trong tiến trình: ${names.join(', ')}`,
        );
      }

      // ✅ xóa dựa trên id
      await this.listDriverRepository.update(
        { id: In(ids), status: Not(3) },
        { status: 3 }
      );

      this.logAsync(req, userId, details, 'SUCCESS');
      return {
        success: true,
        message: `Đã xóa thành công ${ids.length} tài xế`,
      };
    } catch (error) {
      this.logAsync(req, userId, details, 'ERROR');
      throw error;
    }
  }
}
