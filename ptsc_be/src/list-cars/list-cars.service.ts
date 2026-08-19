import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateListCarDto } from './dto/create-list-car.dto';
import { UpdateListCarDto } from './dto/update-list-car.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CarStatus, ListCarEntity } from './entities/list-car.entity';
import { Repository, Not, Like, In, Between, MoreThanOrEqual } from 'typeorm';
import { CrmSourcesService } from '../crmsource/crmsource.service';
import { ListDriversService } from '../list-drivers/list-drivers.service';
import { ListDriverEntity } from '../list-drivers/entities/list-driver.entity';
import { ListCarQueryDto } from './dto/list-car-query.dto';
import { UserEntity } from '../users/entities/user.entity';
import { FeatureManagementEntity, StatusFeature } from 'src/feature-management/feature-management.entity';
import { buildDriverCriteriaHelper } from 'src/list-drivers/list.driver.helper';
import { parseSortVehicle } from 'src/vehicle-registration/helper/vehicle-registration.helper';
import { ConfigService } from '@nestjs/config';
import { ConfigurationService } from 'src/view-config/configuration.service';
import * as sql from 'mssql'; import { getMssqlPool } from 'src/database/mssql.pool';
import { mapDriverVehicelState, mapDriverVehicelStateExport } from './list-car.helper';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { VehicleRegistrationEntity, VehicleState } from 'src/vehicle-registration/entities/vehicle-registration.entity';
@Injectable()

export class ListCarsService {
  private pool: sql.ConnectionPool | null = null;
  private readonly logger = new Logger(ListCarsService.name);
  private dbname: string;
  private licenseClassOptions: any[] = [];
  constructor(
    @InjectRepository(ListCarEntity, 'mssqlConnection')
    private readonly listCarRepository: Repository<ListCarEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userSqlRepo: Repository<UserEntity>,
    private readonly listDriversService: ListDriversService,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
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

  onModuleInit() {
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

  private async mapCarData(items: any[], isDetail = false, isExport = 'false') {
    if (items.length === 0) return items;

    // Lấy thông tin từ danh mục (CrmSource)
    const [statusSource, typeSource] = await Promise.all([
      this.crmSourcesService.findByCode('TRANG_THAI_XE'),
      this.crmSourcesService.findByCode('LOAI_XE'),
    ]);

    // Lấy thông tin người quản lý từ bảng User
    const managerIds = [...new Set(items.map((item) => item.manager).filter(Boolean))];
    let managers: any[] = [];
    if (managerIds.length > 0) {
      managers = await this.userSqlRepo.find({
        where: { id: In(managerIds) },
        select: ['id', 'name'],
      });
    }
    const managerMap = new Map(managers.map((u) => [u.id, u.name]));

    // ✅ Không cần query bảng registrations nữa, dùng trực tiếp cột trong bảng xe

    return items.map((item) => {
      const typeTitle =
        typeSource?.items.find((d) => d.value === item.carType)?.title || item.carType;

      const managerName = managerMap.get(item.manager) || item.manager;

      // ✅ Lấy trạng thái từ cột status_car
      const statusCode = item.statusCar;

      let formattedStatus = '-';
      if (statusCode === CarStatus.SAN_SANG || statusCode === 'SAN_SANG') {
        formattedStatus = '<div style=\"\n    display:flex;\n    overflow:hidden;\n    text-overflow:ellipsis;\n    white-space:nowrap;\n    align-items:center;\n    justify-content:center;\n    width:100%;\n    height:30px;\n    padding:0 16px;\n    font-weight:700;\n    font-size:14px;\n    border-radius:15px;\n  border:1px solid #FFD88F;background: #FEF9C2;color: #FFA600;\">Sẵn sàng</div>';
      } else if (statusCode === CarStatus.DANG_SU_DUNG || statusCode === 'DANG_SU_DUNG') {
        formattedStatus = '<div style=\"\n    display:flex;\n    overflow:hidden;\n    text-overflow:ellipsis;\n    white-space:nowrap;\n    align-items:center;\n    justify-content:center;\n    width:100%;\n    height:30px;\n    padding:0 16px;\n    font-weight:700;\n    font-size:14px;\n    border-radius:15px;\n  border:1px solid #ADECC8;background: #D0FFDE;color: #007222;\">Đang sử dụng</div>';
      } else if (statusCode === CarStatus.BAO_DUONG || statusCode === 'BAO_DUONG') {
        formattedStatus = '<div style=\"\n    display:flex;\n    overflow:hidden;\n    text-overflow:ellipsis;\n    white-space:nowrap;\n    align-items:center;\n    justify-content:center;\n    width:100%;\n    height:30px;\n    padding:0 16px;\n    font-weight:700;\n    font-size:14px;\n    border-radius:15px;\n  border:1px solid #E0E0E0;background: #D1D1D1;color: #555555;\">Bảo dưỡng</div>';
      }

      const mapped = {
        ...item,
        statusCar: formattedStatus,
        carType: typeTitle || '-',
        manager: isDetail
          ? {
            id: item.manager,
            fullName: managerName,
          }
          : managerName || '-',
        managerId: item.manager,
        tripCount: 0,
        bookingAvailable: (item.bookingAvailable === false || item.booking_available === 0) ? 'Đã đặt' : '-',
      };

      if (isExport === 'true') {
        mapped.statusCar = mapDriverVehicelStateExport(statusCode);
      }
      mapped.statusCarOrigin = statusCode;

      return mapped;
    });
  }

  private async mapCarDataList(
    items: any[],
    isDetail = false,
    isExport = 'false',
    aliases: Record<string, string> = {},
  ) {
    if (items.length === 0) return items;

    const [statusSource, typeSource] = await Promise.all([
      this.crmSourcesService.findByCode('TRANG_THAI_XE'),
      this.crmSourcesService.findByCode('LOAI_XE'),
    ]);

    const managerIds = [
      ...new Set(items.map((i) => this.getVal(i, 'manager')).filter(Boolean)),
    ];

    let managers: any[] = [];
    if (managerIds.length > 0) {
      managers = await this.userSqlRepo.find({
        where: { id: In(managerIds) },
        select: ['id', 'name'],
      });
    }

    const managerMap = new Map(managers.map((u) => [u.id, u.name]));

    // ✅ Không cần query bảng registrations nữa, dùng trực tiếp cột trong bảng xe

    return items.map((item) => {
      const mapped: Record<string, any> = {};

      const val = (key: string) => this.getVal(item, key);

      for (const [sourceKey, targetKey] of Object.entries(aliases)) {
        let value = val(sourceKey);

        switch (sourceKey) {
          case 'statusCar': {
            const statusCode = val('statusCar') || val('status_car');
            value =
              isExport === 'true'
                ? mapDriverVehicelStateExport(statusCode)
                : mapDriverVehicelState(statusCode);
            break;
          }

          case 'carType':
            value =
              typeSource?.items.find((d) => d.value === value)?.title || value;
            break;

          case 'manager': {
            const managerName = managerMap.get(value) || value;

            value = isDetail
              ? {
                id: value,
                fullName: managerName,
              }
              : managerName;

            break;
          }

          case 'totalTrips':
            value = value ?? 0;
            break;

          case 'bookingAvailable': {
            const booked = val('bookingAvailable') || val('booking_available');
            value = (booked === false || booked === 0) ? 'Đã đặt' : '-';
            break;
          }
          case 'id': {
            const booked = val('bookingAvailable') || val('booking_available');
            mapped['isNotEdit'] = (booked === false || booked === 0);
            break;
          }
          default:
            break;
        }

        mapped[targetKey] = value ?? '-';
      }

      return mapped;
    });
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

  async create(createListCarDto: CreateListCarDto, req: any, userId: string) {
    const details = `Thêm mới xe: ${createListCarDto.licensePlate}`;
    try {
      // Kiểm tra trùng biển số xe
      const existingCar = await this.listCarRepository.findOne({
        where: {
          licensePlate: createListCarDto.licensePlate,
          status: Not(3),
        },
      });

      if (existingCar) {
        throw new BadRequestException(
          `Biển số xe ${createListCarDto.licensePlate} đã tồn tại trong hệ thống`,
        );
      }

      let statusCar: CarStatus = CarStatus.SAN_SANG;

      // nếu xe đang bảo dưỡng
      if (createListCarDto.maintenance?.toLowerCase() === 'co') {
        statusCar = CarStatus.BAO_DUONG;
      }

      const data = {
        ...createListCarDto,
        statusCar,
      };

      const listCar = this.listCarRepository.create(data);
      const saved = await this.listCarRepository.save(listCar);

      this.logAsync(req, userId, details, 'SUCCESS');
      return {
        success: true,
        message: 'Thêm mới xe thành công',
        data: saved,
      };
    } catch (error) {
      this.logAsync(req, userId, details, 'ERROR');
      throw error;
    }
  }

  async findAll(query: ListCarQueryDto, req: any, userId: string) {
    const details = `Lấy danh sách xe, trang: ${query.page || 1}, limit: ${query.limit || 50}`;
    try {
      const { page = 1, limit = 20, filter, sort, processFn, isExport } = query;

      const pool = await this.getPool();

      const featureManagement = await this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
        // Thêm dòng này để lấy các field mong muốn
        select: {
          id: true,
          code: true,
          criteria: true,
          fields: true, // Lấy cột fields
          valueField: true, // Lấy cột value_field
        }
      })

      const criteria = this.buildCriteria(filter);
      const featureCriteria = featureManagement?.criteria ?? [];

      const { sql: filterFeature, joins: filterJoins, from } =
        buildDriverCriteriaHelper(
          [...featureCriteria, ...criteria],
          'list_cars',
          featureManagement,
          // 'OR',
        );

      const where: string[] = [];
      where.push(`${from}.status = 1`);

      const joinClause = `
        ${filterJoins || ''}
      `;

      if (filterFeature) {
        where.push(`(${filterFeature})`);
      }

      const whereClause = ' WHERE ' + where.join(' AND ');

      const limitNum = Math.min(Number(limit) || 20, 100);
      const pageNum = Math.max(Number(page) || 1, 1);
      const offsetNum = (pageNum - 1) * limitNum;

      const { dbKeys, aliases } =
        await this.configurationService.buildFilterFieldsVehicleRegistrations(
          from,
          [],
          processFn,
        );

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

      // this.logger.debug('[VehicleDriver] SQL:', rowsSql);

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
      const mappedItems = await this.mapCarDataList(items, false, isExport, aliases);

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

  async findOne(id: string, req: any, userId: string) {
    const details = `Lấy chi tiết xe ID: ${id}`;
    try {
      const listCar = await this.listCarRepository.findOne({
        where: {
          id,
          status: Not(3),
        }
      });
      if (!listCar) {
        throw new NotFoundException(`Không tìm thấy xe với ID: ${id}`);
      }
      const mappedItems = await this.mapCarData([listCar], true);

      this.logAsync(req, userId, details, 'SUCCESS');
      return {
        success: true,
        data: mappedItems[0],
      };
    } catch (error) {
      this.logAsync(req, userId, details, 'ERROR');
      throw error;
    }
  }

  async update(id: string, updateListCarDto: UpdateListCarDto, req: any, userId: string) {
    const details = `Cập nhật thông tin xe ID: ${id}`;
    try {
      const listCar = await this.listCarRepository.findOne({
        where: {
          id,
          status: Not(3),
        },
      });

      if (!listCar) {
        throw new NotFoundException(`Không tìm thấy xe với ID: ${id}`);
      }

      // Kiểm tra trùng biển số xe
      if (
        updateListCarDto.licensePlate &&
        updateListCarDto.licensePlate !== listCar.licensePlate
      ) {
        const existingCar = await this.listCarRepository.findOne({
          where: {
            licensePlate: updateListCarDto.licensePlate,
            id: Not(id),
            status: Not(3),
          },
        });

        if (existingCar) {
          throw new BadRequestException(
            `Biển số xe ${updateListCarDto.licensePlate} đã tồn tại trong hệ thống`,
          );
        }
      }

      // xử lý trạng thái theo maintenance
      let statusCar = listCar.statusCar;

      if (updateListCarDto.maintenance !== undefined) {
        if (updateListCarDto.maintenance?.toLowerCase() === 'co') {
          statusCar = CarStatus.BAO_DUONG;
        } else if (listCar.statusCar !== CarStatus.DANG_SU_DUNG) {
          statusCar = CarStatus.SAN_SANG;
        }
      }

      const updated = Object.assign(listCar, {
        ...updateListCarDto,
        statusCar,
      });

      const saved = await this.listCarRepository.save(updated);

      this.logAsync(req, userId, details, 'SUCCESS');
      return {
        success: true,
        message: 'Cập nhật thông tin xe thành công',
        data: saved,
      };
    } catch (error) {
      this.logAsync(req, userId, details, 'ERROR');
      throw error;
    }
  }
  async remove(id: string, req: any, userId: string) {
    const details = `Xóa xe ID: ${id}`;
    try {
      const listCar = await this.listCarRepository.findOne({
        where: {
          id,
          status: Not(3),
        },
      });

      if (!listCar) {
        throw new NotFoundException(`Không tìm thấy xe với ID: ${id}`);
      }

      // ❌ check đang sử dụng
      if (!listCar.bookingAvailable) {
        throw new BadRequestException(
          `Xe ${listCar.licensePlate} đang được phân công hoặc trong tiến trình`,
        );
      }

      // ✅ Xóa mềm
      listCar.status = 3;
      await this.listCarRepository.save(listCar);

      this.logAsync(req, userId, details, 'SUCCESS');
      return {
        success: true,
        message: `Đã xóa thành công xe ${listCar.licensePlate}`,
      };
    } catch (error) {
      this.logAsync(req, userId, details, 'ERROR');
      throw error;
    }
  }

  async removeMultiple(ids: string[], req: any, userId: string) {
    const details = `Xóa nhiều xe IDs: ${ids.join(', ')}`;
    try {
      if (!ids || ids.length === 0) {
        throw new BadRequestException('Danh sách ID không hợp lệ');
      }

      // ❌ tìm xe đang sử dụng
      const cars = await this.listCarRepository.find({
        where: { id: In(ids), status: Not(3) },
        select: ['id', 'licensePlate', 'bookingAvailable'],
      });

      if (cars.length === 0) {
        throw new NotFoundException('Không tìm thấy xe nào trong danh sách đã chọn');
      }

      const bookedCars = cars.filter(c => !c.bookingAvailable);

      if (bookedCars.length > 0) {
        const plates = bookedCars.map(c => c.licensePlate);
        throw new BadRequestException(
          `Các xe đang được phân công hoặc trong tiến trình: ${plates.join(', ')}`,
        );
      }

      // ✅ xóa nếu ok
      const result = await this.listCarRepository.update(
        { id: In(ids) },
        { status: 3 },
      );

      this.logAsync(req, userId, details, 'SUCCESS');
      return {
        success: true,
        message: `Đã xóa thành công ${result.affected} xe`,
        affected: result.affected,
        deletedIds: ids,
      };
    } catch (error) {
      this.logAsync(req, userId, details, 'ERROR');
      throw error;
    }
  }

  // Xây dựng mảng tiêu chí lọc từ object filter
  private buildCriteria(
    filter: any
  ): Array<{ name: string; operator: string; value: string | string[] }> {

    const criteria: Array<{ name: string; operator: string; value: string | string[] }> = [];

    if (!filter || typeof filter !== 'object') return criteria;

    Object.entries(filter).forEach(([key, value]) => {

      if (value === undefined || value === null || value === '') return;

      // object filter (range)
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

        // BETWEEN
        if (start !== undefined && end !== undefined) {
          criteria.push({
            name: key,
            operator: 'between',
            value: [String(start), String(end)],
          });
          return;
        }

        // >=
        if (start !== undefined) {
          criteria.push({
            name: key,
            operator: 'gte',
            value: String(start),
          });
          return;
        }

        // <=
        if (end !== undefined) {
          criteria.push({
            name: key,
            operator: 'lte',
            value: String(end),
          });
          return;
        }

        // like
        if (val.value !== undefined && val.value !== null) {
          criteria.push({
            name: key,
            operator: 'like',
            value: String(val.value),
          });
        }

        return;
      }

      // primitive value
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
}
