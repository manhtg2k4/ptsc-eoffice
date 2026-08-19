import { NotificationType, NotificationKey } from 'src/notifycation/notification.enum';
import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, Not, DataSource } from 'typeorm';
import { CoordinationInformationDto, CreateVehicleRegistrationDto } from './dto/create-vehicle-registration.dto';
import { UpdateVehicleRegistrationDto } from './dto/update-vehicle-registration.dto';
import { VehicleRegistrationEntity, VehicleState } from './entities/vehicle-registration.entity';
import { CrmSourcesService } from '../crmsource/crmsource.service';
import { ConfigService } from '@nestjs/config';
import BpmnEngineService from 'src/bpmn/bpmn-engine.service';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { RuntimeDbService } from 'src/bpmn/runtime-dbmssql.service';
import { NotificationService } from 'src/notifycation/notification.service';
import { UsersService } from 'src/users/users.service';
import { FilesManagementService } from 'src/files-managerment/files-management-mssql.service';
import { ConfigurationService } from 'src/view-config/configuration.service';
import { FeatureManagementEntity, StatusFeature } from 'src/feature-management/feature-management.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import * as sql from 'mssql';
import { Audit } from 'src/database/schema-sql/audit.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { ListRoleEntity } from 'src/list-role/entities/list-role.entity';
import { getMssqlPool } from 'src/database/mssql.pool';
import { getAllNodeExtensionProperties } from 'src/utils/util';
import { STATUS } from 'src/variables/CONST_STATUS';
import { stageStatusArchire, stageStatusDoc, stageStatusVehicle } from 'src/variable/CONST_STATUS';
import { buildCriteria, buildVehicleRegistrationCriteriaHelper, mapVehicleState, mapVehicleStateBadge, mapVehicleStateExport, parseSortVehicle, parseSortVehiclev2 } from './helper/vehicle-registration.helper';
import { stat } from 'fs';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { ListCarEntity } from 'src/list-cars/entities/list-car.entity';
import { ListDriverEntity } from 'src/list-drivers/entities/list-driver.entity';
import { VehicleRegistrationAssignmentEntity } from './entities/vehicle-registration-assignments.entity';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { mapDriverVehicelState, mapDriverVehicelStateExport } from 'src/list-cars/list-car.helper';
import { mapARState, mapARStateExport } from 'src/record-exploitation/validators/helper-record-exploitation';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { ResourceStatusSyncService } from './resource-status-sync.service';
import { validateAndParseSortParam, getDtoKeys } from 'src/utils/sort-validator.util';

dayjs.extend(utc);
dayjs.extend(timezone);
@Injectable()
export class VehicleRegistrationService {
  private requestTypeOptions: any[] = [];
  private processKey: string;
  private priorityOptions: any[] = [];
  private importantGuestsOptions: any[] = [];
  private bpmnXmlCache = new Map<string, string>();
  private typeCarCache = new Map<string, string>();

  // Cache bpmn
  private bpmnCache = new Map<string, any>();
  private readonly logger = new Logger(VehicleRegistrationService.name);
  private pool: sql.ConnectionPool | null = null;
  private dbname: string;
  private typeDocument: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly bpmnEngine: BpmnEngineService,
    private readonly sqlRepo: MSSQLRepository,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly runtimeDbService: RuntimeDbService,
    private readonly notificationService: NotificationService,
    private readonly userService: UsersService,
    private readonly fileService: FilesManagementService,
    private readonly configurationService: ConfigurationService,
    private readonly systemLogService: SystemLogServiceSql,


    @InjectRepository(Audit, 'mssqlConnection')
    private readonly auditRepo: Repository<Audit>,
    @InjectDataSource('mssqlConnection')
    private readonly dataSource: DataSource,
    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserRepository: Repository<GroupUserEntity>,
    @InjectRepository(ListRoleEntity, 'mssqlConnection')
    private readonly listRoleEntity: Repository<ListRoleEntity>,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userrepo: Repository<UserEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly orgUnitRepo: Repository<OrganizationUnitEntity>,

    @InjectRepository(VehicleRegistrationEntity, 'mssqlConnection')
    private readonly vehicleRegistrationRepo: Repository<VehicleRegistrationEntity>,
    @InjectRepository(VehicleRegistrationAssignmentEntity, 'mssqlConnection')
    private readonly vehicleRegistrationAssignmentRepo: Repository<VehicleRegistrationAssignmentEntity>,
    @InjectRepository(ListCarEntity, 'mssqlConnection')
    private readonly listCarRepo: Repository<ListCarEntity>,
    @InjectRepository(ListDriverEntity, 'mssqlConnection')
    private readonly listDriverRepo: Repository<ListDriverEntity>,
    @InjectRepository(RoleFeatureEntity, 'mssqlConnection')
    private readonly roleFeaturesRepo: Repository<RoleFeatureEntity>,
    private readonly crmSourcesService: CrmSourcesService,
    private readonly resourceStatusSyncService: ResourceStatusSyncService,
  ) { }

  private getDatabaseName(): string {
    const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
    if (!dbName) throw new Error('SQLSERVER_DATABASE not defined in .env');
    return dbName + '.dbo';
  }

  async onModuleInit() {
    this.dbname = this.getDatabaseName();
    this.typeDocument = 'VEHICLE_REGISTRATION';

    try {
      const pool = await this.getPool();
      await pool.request().query(`
        IF NOT EXISTS (
          SELECT 1 
          FROM sys.columns 
          WHERE object_id = OBJECT_ID('${this.dbname}.vehicle_registrations') 
            AND name = 'is_edited'
        )
        BEGIN
          ALTER TABLE ${this.dbname}.vehicle_registrations ADD is_edited BIT DEFAULT 0;
        END
      `);
    } catch (e) {
      this.logger.error('Error adding is_edited column to vehicle_registrations:', e);
    }

    // load lần đầu
    this.loadCrmSourceData();

    // reload mỗi 5 phút
    setInterval(() => {
      this.loadCrmSourceData();
    }, 5 * 60 * 1000);
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

  private async getBpmnModel(version: string) {

    if (this.bpmnCache.has(version)) {
      return this.bpmnCache.get(version);
    }

    const xml = await this.sqlRepo.getBpmnFile(version);

    const model = await this.runtimeDbService.getModelFromXml(xml);

    this.bpmnCache.set(version, model);

    return model;
  }
  public async getModelFromXml(xmlContent: string, cacheKey?: string) {
    const { process } = await this.bpmnEngine.loadBpmnFromString(xmlContent);
    const indexes = this.bpmnEngine.buildIndexes(process);
    return { process, indexes, path: cacheKey || 'inline-xml' };
  }

  private async loadCrmSourceData() {
    try {
      const [requestTypeData, priorityData, importantGuestsData, users, departments, cars, drivers, typeCar] = await Promise.all([
        this.crmSourcesService.findByCode('LYCDKX'),
        this.crmSourcesService.findByCode('DOUUTIENDATXE'),
        this.crmSourcesService.findByCode('TIEPKHACHQUANTRONG'),

        this.userrepo.find({
          select: ['id', 'name']
        }),

        this.orgUnitRepo.find({
          select: ['id', 'name']
        }),

        this.listCarRepo.find({
          select: {
            id: true,
            licensePlate: true
          }
        }),

        this.listDriverRepo.find({
          select: {
            id: true,
            fullName: true
          }
        }),

        this.crmSourcesService.findByCode('LOAI_XE'),
      ]);

      this.requestTypeOptions = requestTypeData?.items || [];
      this.priorityOptions = priorityData?.items || [];
      this.importantGuestsOptions = importantGuestsData?.items || [];
      // type car
      this.typeCarCache.clear();
      if (typeCar && Array.isArray(typeCar.items)) {
        typeCar.items.forEach(d => {
          this.typeCarCache.set(d.value, d.title);
        });
      }
    } catch (error) {
      console.error('Error loading CRM source data:', error);
    }
  }
  private async getBpmnXmlCached(version: string): Promise<string> {
    if (this.bpmnXmlCache.has(version)) {
      return this.bpmnXmlCache.get(version)!;
    }

    const xml = await this.sqlRepo.getBpmnFile(version);

    if (xml) {
      this.bpmnXmlCache.set(version, xml);
    }

    return xml;
  }

  private async getUserNameById(userId: string): Promise<string> {
    if (!userId) return '';
    const user = await this.userrepo.findOne({ where: { id: userId }, select: ['name'] });
    return user?.name || userId;
  }

  private async getDepartmentNameById(id: string): Promise<string> {
    if (!id) return '';
    const dept = await this.orgUnitRepo.findOne({ where: { id }, select: ['name'] });
    return dept?.name || id;
  }

  private async getCarLicensePlateById(id: string): Promise<string> {
    if (!id) return '';
    const car = await this.listCarRepo.findOne({ where: { id }, select: ['licensePlate'] });
    return car?.licensePlate || id;
  }

  private async getDriverNameById(id: string): Promise<string> {
    if (!id) return '';
    const driver = await this.listDriverRepo.findOne({
      where: [{ id }, { driverId: id }],
      select: ['fullName'],
    });
    return driver?.fullName || id;
  }

  private logAsync(
    req: any,
    userId: string,
    details: string,
    status: 'SUCCESS' | 'ERROR'
  ) {
    const method = req?.method || 'GET';
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
  private camelToSnake(str: string): string {
    return str.replace(/([A-Z])/g, (_, c) => `_${c.toLowerCase()}`);
  }

  /**
   * Kiểm tra thời gian đặt xe hợp lệ:
   * - Đi thành phố (requestType = 'Tp'): phải tạo trước ít nhất 4 giờ
   * - Đi tỉnh (requestType = 'DT'): phải tạo trước ít nhất 24 giờ
   */
  private validateDepartureLeadTime(requestType: string, departureTime: string | Date): void {
    if (!requestType || !departureTime) return;

    const now = dayjs().tz('Asia/Ho_Chi_Minh');
    const departure = dayjs(departureTime).tz('Asia/Ho_Chi_Minh');
    const diffHours = departure.diff(now, 'hour', true);

    if (requestType === 'Tp' && diffHours < 4) {
      throw new BadRequestException(
        'Yêu cầu đi thành phố phải được tạo trước thời điểm khởi hành tối thiểu 4 giờ',
      );
    }

    if (requestType === 'DT' && diffHours < 24) {
      throw new BadRequestException(
        'Yêu cầu đi tỉnh phải được tạo trước thời điểm khởi hành tối thiểu 24 giờ.',
      );
    }
  }

  private getVal(obj: any, key: string) {
    const snake = this.camelToSnake(key);
    return obj?.[key] ?? obj?.[snake];
  }

  private async preloadLookupData(items: any[]): Promise<{
    userNames: Map<string, string>;
    deptNames: Map<string, string>;
    carPlates: Map<string, string>;
    driverNames: Map<string, string>;
  }> {
    const userIds = new Set<string>();
    const deptIds = new Set<string>();
    const carIds = new Set<string>();
    const driverIds = new Set<string>();

    for (const item of items) {
      if (!item) continue;
      const createdBy = this.getVal(item, 'createdBy');
      if (createdBy) userIds.add(createdBy);

      const manager = this.getVal(item, 'manager');
      if (manager) userIds.add(manager);

      const department = this.getVal(item, 'department');
      if (department) deptIds.add(department);

      const driver = this.getVal(item, 'driver');
      if (driver) {
        driverIds.add(driver);
        userIds.add(driver);
      }

      const driverId = this.getVal(item, 'driverId') || this.getVal(item, 'driver_id');
      if (driverId) {
        driverIds.add(driverId);
        userIds.add(driverId);
      }

      // parse coordinationInformation
      const coordRaw = this.getVal(item, 'coordinationInformation');
      if (coordRaw) {
        let coord: any = [];
        if (typeof coordRaw === 'string') {
          try { coord = JSON.parse(coordRaw); } catch { }
        } else if (Array.isArray(coordRaw)) {
          coord = coordRaw;
        }
        if (Array.isArray(coord)) {
          for (const v of coord) {
            if (v?.carId) carIds.add(v.carId);
            if (v?.driverId) {
              driverIds.add(v.driverId);
              userIds.add(v.driverId);
            }
          }
        }
      }

      // parse driverIds
      const driverIdsRaw = this.getVal(item, 'driverIds');
      if (driverIdsRaw) {
        let ids: any = [];
        if (typeof driverIdsRaw === 'string') {
          try { ids = JSON.parse(driverIdsRaw); } catch { }
        } else if (Array.isArray(driverIdsRaw)) {
          ids = driverIdsRaw;
        }
        if (Array.isArray(ids)) {
          for (const id of ids) {
            if (id) {
              driverIds.add(id);
              userIds.add(id);
            }
          }
        }
      }
    }

    const userNames = new Map<string, string>();
    const deptNames = new Map<string, string>();
    const carPlates = new Map<string, string>();
    const driverNames = new Map<string, string>();

    const promises: Promise<any>[] = [];

    const cleanUserIds = [...userIds].filter(id => typeof id === 'string' && id.trim().length > 0);
    if (cleanUserIds.length > 0) {
      promises.push(
        this.userrepo.find({
          where: { id: In(cleanUserIds) },
          select: ['id', 'name'],
        }).then(users => {
          for (const u of users) {
            userNames.set(u.id, u.name);
          }
        })
      );
    }

    const cleanDeptIds = [...deptIds].filter(id => typeof id === 'string' && id.trim().length > 0);
    if (cleanDeptIds.length > 0) {
      promises.push(
        this.orgUnitRepo.find({
          where: { id: In(cleanDeptIds) },
          select: ['id', 'name'],
        }).then(depts => {
          for (const d of depts) {
            deptNames.set(d.id, d.name);
          }
        })
      );
    }

    const cleanCarIds = [...carIds].filter(id => typeof id === 'string' && id.trim().length > 0);
    if (cleanCarIds.length > 0) {
      promises.push(
        this.listCarRepo.find({
          where: { id: In(cleanCarIds) },
          select: ['id', 'licensePlate'],
        }).then(cars => {
          for (const c of cars) {
            carPlates.set(c.id, c.licensePlate);
          }
        })
      );
    }

    const cleanDriverIds = [...driverIds].filter(id => typeof id === 'string' && id.trim().length > 0);
    if (cleanDriverIds.length > 0) {
      promises.push(
        this.listDriverRepo.find({
          where: [{ id: In(cleanDriverIds) }, { driverId: In(cleanDriverIds) }],
          select: ['id', 'driverId', 'fullName'],
        }).then(drivers => {
          for (const d of drivers) {
            if (d.id) driverNames.set(d.id, d.fullName);
            if (d.driverId) driverNames.set(d.driverId, d.fullName);
          }
        })
      );
    }

    await Promise.all(promises);

    return { userNames, deptNames, carPlates, driverNames };
  }

  private mapToCleanData(
    item: any,
    aliases: Record<string, string> = {},
    isExport?: string,
    userContext?: any,
    lookupData?: {
      userNames: Map<string, string>;
      deptNames: Map<string, string>;
      carPlates: Map<string, string>;
      driverNames: Map<string, string>;
    },
  ) {
    const mapped: Record<string, any> = {};

    const val = (key: string) => this.getVal(item, key);

    const getUserName = (id: string) => {
      if (!id) return '';
      if (lookupData?.userNames.has(id)) return lookupData.userNames.get(id)!;
      return id;
    };

    const getDeptName = (id: string) => {
      if (!id) return '';
      if (lookupData?.deptNames.has(id)) return lookupData.deptNames.get(id)!;
      return id;
    };

    const getCarPlate = (id: string) => {
      if (!id) return '';
      if (lookupData?.carPlates.has(id)) return lookupData.carPlates.get(id)!;
      return id;
    };

    const getDriverName = (id: string) => {
      if (!id) return '';
      if (lookupData?.driverNames.has(id)) return lookupData.driverNames.get(id)!;
      return id;
    };

    // CRM source map
    const requestTypeMap = this.requestTypeOptions.reduce((m, i) => {
      m[i.value] = i.title;
      return m;
    }, {} as Record<string, string>);

    const priorityMap = this.priorityOptions.reduce((m, i) => {
      m[i.value] = i.title;
      return m;
    }, {} as Record<string, string>);

    const importantGuestMap = this.importantGuestsOptions.reduce((m, i) => {
      m[i.value] = i.title;
      return m;
    }, {} as Record<string, string>);

    for (const [sourceKey, targetKey] of Object.entries(aliases)) {
      let value = val(sourceKey);
      const timezone = this.getVal(item, 'timezone') || 'Asia/Ho_Chi_Minh';
      switch (sourceKey) {
        case 'requestType': {
          const text = requestTypeMap[value] || value;

          const priority = priorityMap[val('priority')] || val('priority');
          const importantGuest = importantGuestMap[val('isImportantGuest')] || val('isImportantGuest');

          let icons = '';

          if (priority === 'Khẩn cấp') {
            icons += '🔥 ';
          }

          if (importantGuest === 'Có') {
            icons += '👤 ';
          }

          value = `${text} ${icons}`;
          break;
        }

        case 'priority':
          value = priorityMap[value] || value;
          break;

        case 'isImportantGuest':
          value = importantGuestMap[value] || value;
          break;

        case 'departureTime':
        case 'returnTime':
          value = this.formatDateTime(value, timezone);
          break;


        case 'tripDurationMinutes': {
          if (value) {
            const totalMinutes = Number(value);

            const days = Math.floor(totalMinutes / 1440);
            const hours = Math.floor((totalMinutes % 1440) / 60);
            const minutes = totalMinutes % 60;

            const parts: string[] = [];   // FIX ở đây

            if (days) parts.push(`${days} ngày`);
            if (hours) parts.push(`${hours} giờ`);
            if (minutes) parts.push(`${minutes} phút`);

            value = parts.join(' ');
          }
          break;
        }

        case 'createdBy':
          value = getUserName(value) || value;
          break;


        case 'manager': {
          value = getUserName(value) || value;
          break;
        }

        case 'department':
          value = getDeptName(value) || value;
          break;

        case 'coordinationInformation': {
          if (typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch {
              value = [];
            }
          }

          // danh sách tài xế đã xác nhận
          let confirmedDrivers: string[] = [];
          const confirmedRaw = this.getVal(item, 'confirmedDriverIds');

          if (typeof confirmedRaw === 'string') {
            try {
              confirmedDrivers = JSON.parse(confirmedRaw);
            } catch {
              confirmedDrivers = [];
            }
          }

          if (Array.isArray(value)) {
            const mappedValues = value.map(v => {
              const car = getCarPlate(v.carId) || v.carId;
              const driver = getDriverName(v.driverId) || getUserName(v.driverId) || v.driverId;

              const isConfirmed = confirmedDrivers.includes(v.driverId);

              const text = v.text || `🚗 ${car} - 👤 ${driver}`;

              return isConfirmed
                ? `<span style="color:red;font-weight:600">${text}</span>`
                : text;
            });
            value = mappedValues.join(', ');
          }

          break;
        }
        case 'driverIds': {
          if (typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch {
              value = [];
            }
          }

          if (Array.isArray(value)) {
            const mappedValues = value.map(id => {
              const driver = getDriverName(id) || getUserName(id) || id;
              return `👤 ${driver}`;
            });
            value = mappedValues.join(', ');
          }

          break;
        }
        case 'driverId':
        case 'driver_id':
          value = getDriverName(value) || getUserName(value) || value;
          break;

        case 'vehicleState':
          if (isExport === 'true') {
            value = mapVehicleStateExport(value) || '-';
          } else {
            value = mapVehicleState(value) || '-';
          }
          break;

        case 'statusCar': {
          const statusCode = value;

          value =
            isExport === 'true'
              ? mapDriverVehicelStateExport(statusCode)
              : mapDriverVehicelState(statusCode);

          break;
        }

        default:
          break;
      }

      mapped[targetKey] = value ?? '-';
    }

    const state = this.getVal(item, 'vehicleState');
    const canEdit = [VehicleState.CHO_DIEU_PHOI, VehicleState.TU_CHOI].includes(state);
    const canDelete = state === VehicleState.CHO_DIEU_PHOI;

    mapped.isNotEdit = !canEdit;
    mapped.isNotDelete = !canDelete;

    return mapped;
  }

  async create(
    dto: CreateVehicleRegistrationDto,
    userContext: {
      originalUserId: string;
      effectiveUserId: string;
    },
    req?: any
  ) {
    const requestCode = await this.generateRequestCode();
    const details = `Tạo mới yêu cầu đăng ký xe, Mã yêu cầu: ${requestCode}`;
    const originalUserId = userContext.originalUserId;

    // Kiểm tra thời gian đặt xe
    // this.validateDepartureLeadTime(dto.requestType, dto.departureTime);
    try {
      // BPMN
      if (!originalUserId) {
        throw new BadRequestException('Không xác định được người dùng');
      }
      const { flowConfig, workItem, actionCode } = dto;
      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho người dùng');
      }

      if (!actionCode) {
        throw new BadRequestException('actionCode is required');
      }

      // Lấy BPMN
      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig);
      if (!bpmnXML) {
        throw new BadRequestException('Không tìm thấy file BPMN');
      }
      // Lấy role trực tiếp của user
      const userProcessRoles = await this.userService.findProcessRoleInfoByIdActionStart(originalUserId, flowConfig);
      let userRoleCodes: string[] = userProcessRoles.roleCodes || [];

      // Lấy indexes
      const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);
      // Lấy role từ lane + group
      const lanes = Object.values(indexes.lanes || {});
      const laneRoleCodes: string[] = lanes
        .map((l: any) => l.role)
        .filter((r): r is string => typeof r === 'string' && r.length > 0);

      const groupRoles = await this.findUsersByRoleCodes(laneRoleCodes, flowConfig);

      const rolesFromGroup = groupRoles
        .filter(u => u.userId === originalUserId)
        .map(u => u.roleCode);

      // Merge tất cả role
      userRoleCodes = [...new Set([...userRoleCodes, ...rolesFromGroup])];

      if (!userRoleCodes.length) {
        throw new BadRequestException('Người dùng không có role trong flow');
      }

      // 4️⃣ Find current node & outgoing flows
      const wi = workItem;
      if (!wi) {
        throw new BadRequestException('WorkItem not found or already completed');
      }

      const node = indexes.nodes.get(wi.nodeId);
      if (!node) {
        throw new BadRequestException('Current BPMN node not found');
      }

      let outs = indexes.outgoingBySource.get(node.id) || [];

      // Handle gateway trung gian
      for (const f of outs) {
        const target = f.targetRef;
        if (target && (target.$type === 'bpmn:ExclusiveGateway' || target.$type === 'bpmn:InclusiveGateway')) {
          outs = indexes.outgoingBySource.get(target.id) || [];
          break;
        }
      }

      // 5️⃣ Match flow theo actionCode
      const flow = outs.find((f: any) => {
        const ext = getAllNodeExtensionProperties(f);
        return (
          (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
          (f.name && f.name.toUpperCase() === actionCode) ||
          f.id === actionCode
        );
      });

      if (!flow) {
        throw new BadRequestException(`No outgoing flow matches actionCode ${actionCode}`);
      }

      // 6️⃣ Resolve next interactive node
      const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
      if (!nextNode) {
        throw new BadRequestException('No next interactive node found');
      }

      const role = indexes.laneMap.get(nextNode.id);
      // Lấy role của lane node tiếp theo
      const nodeRole = indexes.laneMap.get(node.id);
      const hasPermission = userRoleCodes.includes(nodeRole);

      if (!hasPermission) {
        throw new BadRequestException('Bạn không có quyền tạo lịch họp');
      }

      // Lấy trạng thái statusCode
      const statusNameStart = getAllNodeExtensionProperties(node)?.statusName;
      const statusCodeNextNode = getAllNodeExtensionProperties(nextNode)?.statusCode;

      const userRes = await this.userrepo.findOne({
        where: { id: originalUserId },
        relations: ['parent'],
        select: ['id'],
      });
      const receiverUnit = userRes?.parent?.id ?? '';
      // Tạo mới yêu cầu đăng ký xe với status = 1 (Mới tạo)
      const registration = this.vehicleRegistrationRepo.create({
        ...dto,
        requestCode: requestCode,
        status: 1,
        departureTime: new Date(dto.departureTime),
        returnTime: new Date(dto.returnTime),
        bpmnVersion: flowConfig,
        vehicleState: VehicleState.CHO_DIEU_PHOI,
        statusCode: statusCodeNextNode,
        requestSubmittedAt: new Date(),
        createdBy: originalUserId,
        department: receiverUnit,
        tripDurationMinutes: dayjs(dto.returnTime).diff(dayjs(dto.departureTime), 'minute'),
        coordinationInformation: dto.coordinationInformation
          ? JSON.stringify(dto.coordinationInformation)
          : undefined,
      });
      await this.vehicleRegistrationRepo.save(registration);
      // Lấy role
      const targetRole = indexes.laneMap.get(nextNode.id);

      // ===== 1️⃣ USER THEO ROLE HỆ THỐNG =====
      const roleUsers = await this.findUsersByRoleCodes([targetRole]);
      const roleUserIds = roleUsers.map(u => u.userId);

      // ===== 2️⃣ USER THEO BPMN LANE =====
      const { userIds: laneUserIds } = await this.getUsersInFlow(
        flowConfig,
        targetRole
      );
      // ===== 3️⃣ UNION 2 NGUỒN =====
      const allUserIds = [...new Set([
        ...roleUserIds,
        ...laneUserIds
      ])];

      // 10.2 Create workItem cho MỖI Ban quản lý phòng
      for (const user of allUserIds) {
        await this.sqlRepo.addWorkItem(
          registration.id,
          {
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: nextNode.id,
            role: targetRole,
            assigneeUserId: user,
            nodeType: nextNode.$type,
          },
          undefined,
          registration.bpmnVersion,
        );
      }
      const baseAudit = {
        user_id: originalUserId,
        role: wi.role,
        action_code: actionCode,
        receiver_unit: null,
        group_: null,
        roleProcess: 'processor',
        created_by: originalUserId,
        origin_id: wi.id,
        deadline: null,
        typeDocument: this.typeDocument,
      };
      await this.sqlRepo.addAudit(
        registration.id,
        {
          ...baseAudit,
          display_name: 'Phòng hậu cần, đội xe',
          receiver: stageStatusVehicle.PHONG_DOI_HAU_CAN_NGUOI_DIEU_PHOI,
          action: statusNameStart,
          details: statusNameStart,
          stage_status: stageStatusArchire.CHUA_XU_LY,
          curStatusCode: statusCodeNextNode,
          from_node_id: node.id,
          to_node_id: nextNode.id,
        }
      );
      // Tạo work item cho người hiện tại sau khi submit (nếu node tiếp theo là user task)
      const nodeAfterSubmit = this.findEventNode(indexes, 'AFTER_SUBMIT');
      const roleAfterSubmit = nodeAfterSubmit ? indexes.laneMap.get(nodeAfterSubmit.id) : role;
      await this.sqlRepo.addWorkItem(
        registration.id,
        {
          id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          nodeId: nodeAfterSubmit.id,
          role: roleAfterSubmit,
          assigneeUserId: originalUserId,
          nodeType: nextNode.$type,
        },
        undefined,
        registration.bpmnVersion,
      );

      const senderName = await this.getUserNameById(originalUserId) || 'Người dùng';
      const departmentName = await this.getDepartmentNameById(receiverUnit) || 'Đơn vị';
      const recipientIds = Array.from(allUserIds);

      if (recipientIds.length) {
        this.notificationService.createForRecipients({
          recipientIds,
          senderId: originalUserId,
          type: NotificationType.CAR_BOOKING_REQUESTED.value,
          content: `Có yêu cầu đăng ký xe ${registration.requestCode} từ ${senderName ? senderName : departmentName}${registration.priority === 'kc' ? ', đề nghị điều phối xe và tài xế. Mức độ: khẩn cấp' : 'đề nghị điều phối xe và tài xế.'
            }`,
          recordId: registration.id,
          link: `/vehicle-registration/${registration.id}`,
          key: NotificationKey.VIEW_NEW_REQUEST,
          time: new Date(),
          status: 0,
        });
      }
      this.logAsync(req, originalUserId, details, 'SUCCESS');
      return registration;
    } catch (error) {
      this.logAsync(req, originalUserId, details, 'ERROR');
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Lỗi tạo mới Yêu cầu đăng ký xe',
      );

    }
  }
  // gen mã yêu cầu
  async generateRequestCode(): Promise<string> {
    const today = dayjs().format('YYYYMMDD');

    const result = await this.vehicleRegistrationRepo.query(`
        SELECT MAX(request_code) as maxCode
        FROM vehicle_registrations
        WHERE request_code LIKE 'YC-${today}-%'
    `);

    let nextNumber = 1;

    if (result[0]?.maxCode) {
      const lastNumber = parseInt(result[0].maxCode.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    const numberStr = String(nextNumber).padStart(3, '0');

    return `YC-${today}-${numberStr}`;
  }
  async transferredDeputy(
    registrationId: string,
    flowConfig: string,
  ) {
    if (!flowConfig) {
      throw new BadRequestException('Không tìm thấy luồng cho người dùng');
    }
    if (!registrationId) {
      throw new BadRequestException('Không tìm thấy đăng ký xe');
    }

    // 1️⃣ Lấy BPMN XML
    const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig);

    // 2️⃣ Parse BPMN & build indexes
    const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);

    // 3️⃣ Lấy node hiện tại APPROVAL_REPLACEMENT
    const nodeApprovalDeputy = this.findEventNode(indexes, 'APPROVAL_REPLACEMENT');
    if (!nodeApprovalDeputy) {
      throw new BadRequestException('Không tìm thấy node APPROVAL_REPLACEMENT');
    }
    const roleApprovalDeputy = indexes.laneMap.get(nodeApprovalDeputy.id);
    // 4️⃣ Lấy node tiếp theo (next interactive node) mà không cần actionCode
    const outgoingFlows = indexes.outgoingBySource.get(nodeApprovalDeputy.id) || [];

    if (!outgoingFlows.length) {
      throw new BadRequestException('Không tìm thấy node tiếp theo để tạo WorkItem');
    }

    const nextFlow = outgoingFlows[0];

    if (!nextFlow.targetRef) {
      throw new BadRequestException('Không tìm thấy node tiếp theo');
    }

    const nextNode = nextFlow.targetRef;
    const roleApprove = indexes.laneMap.get(nextNode.id) || roleApprovalDeputy;
    if (!roleApprove) {
      throw new Error(`Lane role not found for node ${nextNode.id}`);
    }

    // ===== 1️⃣ USER THEO ROLE HỆ THỐNG =====
    const roleUsers = await this.findUsersByRoleCodes([roleApprove]);
    const roleUserIds = roleUsers.map(u => u.userId);

    // ===== 2️⃣ USER THEO BPMN LANE =====
    const { userIds: laneUserIds } = await this.getUsersInFlow(
      flowConfig,
      roleApprove
    );

    // ===== 3️⃣ UNION 2 NGUỒN =====
    const allUserIds = [...new Set([
      ...roleUserIds,
      ...laneUserIds
    ])];

    // Xóa node trường hiện tại của trưởng phòng
    await this.sqlRepo.removeAllWorkItemsWithRole(registrationId, roleApprovalDeputy);
    // 10.2 Create workItem cho MỖI Ban quản lý phòng
    for (const user of allUserIds) {
      await this.sqlRepo.addWorkItem(
        registrationId,
        {
          id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          nodeId: nextNode.id,
          role: roleApprove,
          assigneeUserId: user,
          nodeType: nextNode.$type,
        },
        undefined,
        flowConfig,
      );
    }
    const baseAudit = {
      user_id: null,
      role: roleApprove,
      action_code: 'SYSTEM',
      receiver_unit: null,
      group_: null,
      roleProcess: 'processor',
      created_by: null,
      origin_id: 'SYSTEM',
      deadline: null,
      typeDocument: this.typeDocument,
    };
    // Tao audit cho người thực hiện action
    await this.sqlRepo.addAudit(
      registrationId,
      {
        ...baseAudit,
        receiver: null,
        display_name: 'Hệ thống',
        action: 'Hệ thống tự động chuyển sang phó trưởng phòng, hậu cần',
        details: 'Hệ thống tự động chuyển sang phó trưởng phòng, hậu cần',
        stage_status: stageStatusArchire.DA_XU_LY,
        curStatusCode: '',
        from_node_id: nodeApprovalDeputy.id,
        to_node_id: nextNode.id,
      }
    );

    return { allUserIds, message: 'WorkItem đã được tạo cho node tiếp theo', nextNodeId: nextNode.id };
  }

  // Tìm người dùng theo roleCode
  async findUsersByRoleCodes(roleCodes: string[], processKey?: string, userId?: string) {
    if (!roleCodes?.length && !userId) return [];

    // BƯỚC 1: Tìm các Group thỏa mãn điều kiện Role
    const groupQb = this.groupUserRepository.createQueryBuilder('g')
      .select(['g.id AS id', 'g.roles_dynamic AS roles_dynamic'])
      .where('g.status = :status', { status: STATUS.ACTIVED });

    if (roleCodes?.length || processKey) {
      groupQb.andWhere(
        `EXISTS (
          SELECT 1
          FROM OPENJSON(g.roles_dynamic)
          WITH (
            processKey nvarchar(100) '$.processKey',
            roleCode nvarchar(100) '$.roleCode'
          ) j
          WHERE 1=1
          ${roleCodes?.length ? 'AND j.roleCode IN (:...roleCodes)' : ''}
          ${processKey ? 'AND j.processKey = :processKey' : ''}
        )`,
        { roleCodes, processKey }
      );
    }

    const groups = await groupQb.getRawMany();
    if (!groups.length) return [];

    const groupToRolesMap = new Map<string, string[]>();
    const matchedGroupIds: string[] = [];

    for (const g of groups) {
      let rolesDynamic: any[] = [];
      try {
        rolesDynamic = typeof g.roles_dynamic === 'string'
          ? JSON.parse(g.roles_dynamic)
          : g.roles_dynamic || [];
      } catch (e) {
        console.error('Parse roles_dynamic lỗi:', e);
        continue;
      }

      const matchedRoles: string[] = [];
      for (const r of rolesDynamic) {
        if (
          r?.roleCode &&
          roleCodes.includes(r.roleCode) &&
          (!processKey || r.processKey === processKey)
        ) {
          matchedRoles.push(r.roleCode);
        }
      }

      if (matchedRoles.length > 0) {
        groupToRolesMap.set(g.id, matchedRoles);
        matchedGroupIds.push(g.id);
      }
    }

    if (!matchedGroupIds.length) return [];

    // BƯỚC 2: Tìm User ID thuộc các Group thỏa mãn điều kiện
    const userQb = this.groupUserRepository.manager.createQueryBuilder()
      .select(['ugu.user_id AS userId', 'ugu.group_user_id AS groupId'])
      .from('user_group_users', 'ugu')
      .innerJoin('users', 'u', 'u.id = ugu.user_id AND u.status = :status', {
        status: STATUS.ACTIVED,
      })
      .where('ugu.group_user_id IN (:...matchedGroupIds)', { matchedGroupIds });

    if (userId) {
      userQb.andWhere('u.id = :userId', { userId });
    }

    const userRows = await userQb.getRawMany();

    const result: { userId: string; roleCode: string }[] = [];
    for (const row of userRows) {
      const roles = groupToRolesMap.get(row.groupId) || [];
      for (const roleCode of roles) {
        result.push({
          userId: row.userId,
          roleCode,
        });
      }
    }

    // ✅ remove duplicate (userId + roleCode)
    return [
      ...new Map(
        result.map(i => [`${i.userId}_${i.roleCode}`, i])
      ).values(),
    ];
  }

  // Lấy node sự kiện (Event) theo actionCode để lấy được statusCode tương ứng
  public findEventNode(indexes: any, actionCode: string) {
    for (const node of indexes.nodes.values()) {

      // 1. Chỉ cần là Event (Throw / Start / End)
      if (!node.$type || !node.$type.includes('Event')) continue;

      // 2. Phải có outgoing → THROW
      if (!node.outgoing || node.outgoing.length === 0) continue;

      // 3. actionCode
      const ext = getAllNodeExtensionProperties(node);
      if (ext.actionCode === actionCode || node.name === actionCode || node.id === actionCode) {
        return node;
      }
    }
    return null;
  }

  private async attachWorkflowFields(
    items: any[],
    mappedItems: any[],
    originalUserId: string,
    roles: string[],
    receiverUnit: string,
  ) {
    const ids: string[] = [];
    const bpmnVersionsSet = new Set<string>();

    for (const item of items) {
      if (!item) continue;
      const id = this.getVal(item, 'id');
      if (id) ids.push(String(id));

      const v = this.getVal(item, 'bpmnVersion') || this.getVal(item, 'bpmn_version');
      if (typeof v === 'string' && v.trim().length > 0 && v.toUpperCase() !== 'NULL') {
        bpmnVersionsSet.add(v);
      }
    }

    const allOpenWorkItems = ids.length ? await this.sqlRepo.listOpenWorkItemsByIds(ids) : [];

    const openWorkItemsMap = new Map<string, any[]>();
    for (const wi of allOpenWorkItems) {
      const docId = wi.documentId;
      let list = openWorkItemsMap.get(docId);
      if (!list) {
        list = [];
        openWorkItemsMap.set(docId, list);
      }
      list.push(wi);
    }

    const bpmnVersions = [...bpmnVersionsSet];

    const bpmnEngineMap = new Map<string, { process: any; indexes: any; userParent: string | null }>(
      await Promise.all(
        bpmnVersions.map(async (v: string): Promise<[string, { process: any; indexes: any; userParent: string | null }]> => {
          try {
            const model = await this.getBpmnModel(v);
            return [v, { process: model.process, indexes: model.indexes, userParent: receiverUnit }];
          } catch (e) {
            return [v, { process: null, indexes: null, userParent: receiverUnit }];
          }
        }),
      ),
    );

    const rolesCache = new Map<string, Promise<any>>();
    const cachedGetUsersByRole = (role: string) => {
      if (rolesCache.has(role)) {
        return rolesCache.get(role)!;
      }
      const promise = this.sqlsvRepo.getUsersByRoleMongoDB(role);
      rolesCache.set(role, promise);
      return promise;
    };

    const promises = items.map(async (item, i) => {
      const mapped = mappedItems[i];
      if (!item || !mapped) return;

      const docId = String(this.getVal(item, 'id'));
      const openWorkItems = openWorkItemsMap.get(docId) || [];
      const bpmnVersion = this.getVal(item, 'bpmnVersion') || this.getVal(item, 'bpmn_version');
      const bpmnEngineInfo = bpmnVersion ? bpmnEngineMap.get(bpmnVersion) : null;
      const process = bpmnEngineInfo?.process;
      const indexes = bpmnEngineInfo?.indexes;

      const coordRoles: string[] = [];
      if (indexes && (indexes as any).lanes) {
        for (const lane of Object.values((indexes as any).lanes) as any[]) {
          const ext = getAllNodeExtensionProperties(lane);
          if (ext.isCoordinator === 'true') {
            const laneRole = lane.role || ext.candidateGroupsCode || ext.candidateGroups;
            if (laneRole && !coordRoles.includes(laneRole)) {
              coordRoles.push(laneRole);
            }
          }
        }
      }

      let perItems: any[] = [];
      if (process && indexes && openWorkItems.length) {
        perItems = await Promise.all(
          openWorkItems.map(async (wi) => {
            const rolesForCompute = [...roles];
            if (item.vehicleState === VehicleState.TRONG_TIEN_TRINH) {
              const isCoordinator = roles.some(r => coordRoles.includes(r));
              if (isCoordinator && wi.role && coordRoles.includes(wi.role)) {
                if (!rolesForCompute.includes(wi.role)) {
                  rolesForCompute.push(wi.role);
                }
              }
            }

            const res = await this.bpmnEngine.computeAvailableActions({
              process,
              indexes,
              currentNodeId: wi.nodeId,
              workItem: wi,
              document: item,
              userId: originalUserId,
              userRoles: rolesForCompute,
              getUsersByRole: cachedGetUsersByRole,
            });

            const isAllConfirmed = this.getVal(item, 'isAllDriversConfirmed') || this.getVal(item, 'is_all_drivers_confirmed');
            if (isAllConfirmed) {
              res.availableActions = res.availableActions.filter((a: any) => {
                const flow = indexes.outgoingBySource.get(wi.nodeId)?.find((f: any) => (f.name || f.id) === a.code || getAllNodeExtensionProperties(f)?.actionCode === a.code);
                const hideIfAll = getAllNodeExtensionProperties(flow)?.hideIfAllConfirmed === 'true';
                return !hideIfAll;
              });
            }

            // Override for TRONG_TIEN_TRINH state
            if (item.vehicleState === VehicleState.TRONG_TIEN_TRINH) {
              const isCoordinator = roles.some(r => coordRoles.includes(r));
              const coordRaw = this.getVal(item, 'coordinationInformation');
              let driverIds: string[] = [];
              if (coordRaw) {
                let coord: any = [];
                if (typeof coordRaw === 'string') {
                  try { coord = JSON.parse(coordRaw); } catch { }
                } else if (Array.isArray(coordRaw)) {
                  coord = coordRaw;
                }
                if (Array.isArray(coord)) {
                  driverIds = coord.map(c => c.driverId).filter(Boolean);
                }
              }
              const isDriverOfRequest = driverIds.includes(originalUserId);

              res.availableActions = res.availableActions.map((a: any) => {
                if (isCoordinator || isDriverOfRequest) {
                  return { ...a, canExecute: true };
                } else {
                  return { ...a, canExecute: false };
                }
              });
            }

            return {
              workItem: wi,
              node: res.node,
              availableActions: res.availableActions,
              flags: res.flags,
            };
          })
        );
      }

      const first = perItems.find((x) =>
        x.availableActions.some((a: any) => a.canExecute),
      );

      const summary = first ||
        perItems[0] || { workItem: null, availableActions: [], flags: {} };

      const summaryFlags = perItems.reduce(
        (acc, x) => ({ ...acc, ...x.flags }),
        {},
      );

      let sortedActions = summary.availableActions || [];

      if (this.getVal(item, 'isEdited') || this.getVal(item, 'is_edited')) {
        sortedActions = sortedActions.map((a: any) => {
          if (a.code === 'CHINH_SUA_NGUOI_DANG_KY') {
            return {
              ...a,
              isDisabled: true,
              flagsButton: {
                ...(a.flagsButton || {}),
                isDisabled: true,
              },
            };
          }
          return a;
        });
      }

      mapped.workItem = summary.workItem;
      mapped.availableActions = sortedActions;
      mapped.flags = summaryFlags;
    });

    await Promise.all(promises);
  }


  async listVehiclesRegistration(query: CreateVehicleRegistrationDto, originalUserId: string, effectiveUserId: string, authority: boolean, req?: any) {
    const { type, page = 1, limit = 20, filter, sort, processFn, isExport, } = query;

    const TAB_MAP = {
      all: 'Tất cả',
      pending: 'Chờ điều phối',
      processed: 'Đã phân công',
      processing: 'Trong tiến trình',
      completed: 'Hoàn thành',
      rejected: 'Từ chối',
      cancel: 'Đã hủy',
    } as const;

    const typeKey = (type || '').toLowerCase() as keyof typeof TAB_MAP;
    const tabName = TAB_MAP[typeKey] || 'Tất cả';
    const details = `Truy cập danh sách sách yêu cầu đăng ký xe (${tabName}) - Người đăng ký xe, trang: ${page}, limit: ${limit}`;

    if ((authority || query.authority === 'true') && effectiveUserId) {
      originalUserId = effectiveUserId;
    }
    const pool = await this.getPool();
    const [userRoleRes, featureManagement, userRes] =
      await Promise.all([
        this.userService.getUserRole(originalUserId, processFn),
        this.featureManagementRepo.findOne({
          where: {
            code: processFn,
            status: 1,
            statusFeature: StatusFeature.ACTIVE,
          },
        }),
        this.userrepo.findOne({
          where: { id: originalUserId },
          relations: ['parent'],
          select: ['id'],
        }),
      ]);

    const { roles } = userRoleRes;
    const receiverUnit = userRes?.parent?.id ?? '';
    const userContext = { originalUserId, roles, receiverUnit };

    const criteria = buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } = buildVehicleRegistrationCriteriaHelper([...featureCriteria, ...criteria], 'vehicle_registrations', featureManagement);

    const TYPES = ['all', 'processed', 'pending', 'processing', 'completed', 'rejected', 'cancel'] as const;
    if (!type || !TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }
    const isPending = type === 'pending';
    const isProcessed = type === 'processed';
    const isProcessing = type === 'processing';
    const isCompleted = type === 'completed';
    const isRejected = type === 'rejected';
    const isCancel = type === 'cancel';

    const where: string[] = [];
    where.push(`${from}.status = '1'`);
    where.push(`${from}.created_by = '${originalUserId}'`);

    const joinClause = filterJoins || '';

    if (isPending) {
      where.push(`${from}.vehicle_state = '${VehicleState.CHO_DIEU_PHOI}'`);
    }
    if (isProcessed) {
      where.push(`${from}.vehicle_state = '${VehicleState.DA_PHAN_CONG}'`);
    }
    if (isProcessing) {
      where.push(`${from}.vehicle_state = '${VehicleState.TRONG_TIEN_TRINH}'`);
    }
    if (isCompleted) {
      where.push(`${from}.vehicle_state = '${VehicleState.HOAN_THANH}'`);
    }
    if (isRejected) {
      where.push(`${from}.vehicle_state = '${VehicleState.TU_CHOI}'`);
    }
    if (isCancel) {
      where.push(`${from}.vehicle_state = '${VehicleState.DA_HUY}'`);
    }

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = ' WHERE ' + where.join(' AND ');

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    const { dbKeys, aliases, allFilterFields } = await this.configurationService.buildFilterFieldsVehicleRegistrations(from, [], processFn);
    const aliasFields = [
      'unitGuest',
    ];

    aliasFields.forEach((f) => {
      const snake = f.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allFilterFields.includes(f) || allFilterFields.includes(snake)) {
        aliases[f] = f;
      }
    });
    const selectFields = dbKeys.join(', ');
    const orderBy = ' ORDER BY ' + parseSortVehicle(sort, aliases, from, {});

    const totalSql = `  SELECT COUNT(*) AS total FROM ${this.dbname}.${from} ${joinClause} ${whereClause} `;

    const rowsSql = ` SELECT ${selectFields} FROM ${this.dbname}.${from} ${joinClause} ${whereClause} ${orderBy} OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY `;

    // this.logger.debug('[VehicleRegistration PREPARE] TOTAL SQL:', totalSql);

    let totalResult, rowsResult;

    try {
      const totalRequest = pool.request()
        .input('userId', originalUserId);

      const rowsRequest = pool.request()
        .input('userId', originalUserId);

      [totalResult, rowsResult] = await Promise.all([
        totalRequest.query(totalSql),
        rowsRequest.query(rowsSql),
      ]);
    } catch (e) {
      this.logAsync(req, originalUserId, details, 'ERROR');
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn danh sách đăng ký xe');
    }

    const total = totalResult.recordset[0]?.total ?? 0;
    const items = rowsResult.recordset;
    if (!items.length) { return { success: true, items: [], message: 'Không có dữ liệu', total: 0, page: pageNum, limit: limitNum, totalPages: 0, }; }

    // Map dữ liệu sạch
    const lookupData = await this.preloadLookupData(items);
    const mappedItems = items.map(item => this.mapToCleanData(item, aliases, isExport, userContext, lookupData));
    await this.attachWorkflowFields(items, mappedItems, originalUserId, roles, receiverUnit);
    this.logAsync(req, originalUserId, details, 'SUCCESS');
    return {
      success: true,
      items: mappedItems,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }


  async listVehiclesRegistrationAssignment(query: CreateVehicleRegistrationDto, originalUserId: string, effectiveUserId: string, authority: boolean, req?: any) {
    const { type, page = 1, limit = 20, filter, sort, processFn, isExport, } = query;
    const TAB_MAP = {
      all: 'Tất cả',
      pending: 'Chờ điều phối',
      processed: 'Đã phân công',
      processing: 'Trong tiến trình',
      completed: 'Hoàn thành',
      rejected: 'Từ chối',
      cancel: 'Đã hủy',
    } as const;
    const typeKey = (type || '').toLowerCase() as keyof typeof TAB_MAP;
    const tabName = TAB_MAP[typeKey] || 'Tất cả';
    const details = `Truy cập danh sách sách yêu cầu đăng ký xe (${tabName}) - Người đăng ký xe, trang: ${page}, limit: ${limit}`;

    if ((authority || query.authority === 'true') && effectiveUserId) {
      originalUserId = effectiveUserId;
    }
    const pool = await this.getPool();
    const [userRoleRes, featureManagement, userRes] =
      await Promise.all([
        this.userService.getUserRole(originalUserId, processFn),
        this.featureManagementRepo.findOne({
          where: {
            code: processFn,
            status: 1,
            statusFeature: StatusFeature.ACTIVE,
          },
        }),
        this.userrepo.findOne({
          where: { id: originalUserId },
          relations: ['parent'],
          select: ['id'],
        }),
      ]);

    const { roles } = userRoleRes;
    const receiverUnit = userRes?.parent?.id ?? '';
    const userContext = { originalUserId, roles, receiverUnit };

    const criteria = buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } = buildVehicleRegistrationCriteriaHelper([...featureCriteria, ...criteria], 'vehicle_registrations', featureManagement);

    const TYPES = ['all', 'processed', 'pending', 'processing', 'completed', 'rejected', 'cancel'] as const;
    if (!type || !TYPES.includes(type as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }
    const isPending = type === 'pending';
    const isProcessed = type === 'processed';
    const isProcessing = type === 'processing';
    const isCompleted = type === 'completed';
    const isRejected = type === 'rejected';
    const isCancel = type === 'cancel';

    const where: string[] = [];
    where.push(`${from}.status = '1'`);
    where.push(`last_audit.receiver IS NOT NULL`);
    let joinClause = filterJoins || '';

    joinClause += `
      OUTER APPLY (
        SELECT TOP 1
          a.stage_status,
          a.receiver,
          a.processed_by
        FROM ${this.dbname}.audit a WITH (NOLOCK)
        WHERE a.document_id = CAST(${from}.id AS NVARCHAR(64))
          AND a.type_document = 'VEHICLE_REGISTRATION'
          AND (
            a.receiver = '${originalUserId}'
            OR a.receiver = '${stageStatusVehicle.PHONG_DOI_HAU_CAN_NGUOI_DIEU_PHOI}'
            OR a.processed_by = '${originalUserId}'
            OR a.acting_as = '${originalUserId}'
            OR a.created_by = '${originalUserId}'
          )
        ORDER BY a.created_at DESC, a.id DESC
      ) last_audit
    `;

    if (isPending) {
      where.push(`${from}.vehicle_state = '${VehicleState.CHO_DIEU_PHOI}'`);
    }
    if (isProcessed) {
      where.push(`${from}.vehicle_state = '${VehicleState.DA_PHAN_CONG}'`);
    }
    if (isProcessing) {
      where.push(`${from}.vehicle_state = '${VehicleState.TRONG_TIEN_TRINH}'`);
    }
    if (isCompleted) {
      where.push(`${from}.vehicle_state = '${VehicleState.HOAN_THANH}'`);
    }
    if (isRejected) {
      where.push(`${from}.vehicle_state = '${VehicleState.TU_CHOI}'`);
    }
    if (isCancel) {
      where.push(`${from}.vehicle_state = '${VehicleState.DA_HUY}'`);
    }

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = ' WHERE ' + where.join(' AND ');

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    const { dbKeys, aliases, allFilterFields } = await this.configurationService.buildFilterFieldsVehicleRegistrations(from, [], processFn);
    const aliasFields = [
      'unitGuest',
    ];

    aliasFields.forEach((f) => {
      const snake = f.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allFilterFields.includes(f) || allFilterFields.includes(snake)) {
        aliases[f] = f;
      }
    });
    const selectFields = dbKeys.join(', ');
    const orderBy = ' ORDER BY ' + parseSortVehicle(sort, aliases, from, {});

    const totalSql = `  SELECT COUNT(*) AS total FROM ${this.dbname}.${from} ${joinClause} ${whereClause} `;

    const rowsSql = ` SELECT ${selectFields} FROM ${this.dbname}.${from} ${joinClause} ${whereClause} ${orderBy} OFFSET ${offsetNum} ROWS FETCH NEXT ${limitNum} ROWS ONLY `;

    // this.logger.debug('[VehicleRegistration PREPARE] TOTAL SQL:', totalSql);
    // this.logger.debug('[VehicleRegistration PREPARE] ROWS SQL:', rowsSql);

    let totalResult, rowsResult;

    try {
      const totalRequest = pool.request()
        .input('userId', originalUserId);

      const rowsRequest = pool.request()
        .input('userId', originalUserId);

      [totalResult, rowsResult] = await Promise.all([
        totalRequest.query(totalSql),
        rowsRequest.query(rowsSql),
      ]);

      const total = totalResult.recordset[0]?.total ?? 0;
      const items = rowsResult.recordset;
      if (!items.length) { return { success: true, items: [], message: 'Không có dữ liệu', total: 0, page: pageNum, limit: limitNum, totalPages: 0, }; }

      // Map dữ liệu sạch
      const lookupData = await this.preloadLookupData(items);
      const mappedItems = items.map(item => this.mapToCleanData(item, aliases, isExport, undefined, lookupData));
      await this.attachWorkflowFields(items, mappedItems, originalUserId, roles, receiverUnit);
      this.logAsync(req, originalUserId, details, 'SUCCESS');

      return {
        success: true,
        items: mappedItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (e) {
      this.logAsync(req, originalUserId, details, 'ERROR');
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn danh sách phân công xe');
    }

  }

  async listVehiclesRegistrationDriver(
    query: CreateVehicleRegistrationDto,
    originalUserId: string,
    effectiveUserId: string,
    authority: boolean,
    req?: any
  ) {
    const { type = 'all', page = 1, limit = 20, filter, sort, processFn, isExport } = query;

    const TAB_MAP = {
      all: 'Tất cả',
      pending: 'Chờ xác nhận',
      processed: 'Đã xác nhận',
      processing: 'Trong tiến trình',
      completed: 'Hoàn thành',
      rejected: 'Từ chối',
      cancel: 'Đã hủy',
    } as const;
    const typeKey = (type || '').toLowerCase() as keyof typeof TAB_MAP;
    const tabName = TAB_MAP[typeKey] || 'Tất cả';
    const details = `Truy cập danh sách sách yêu cầu đăng ký xe  (${tabName}) - Người đăng ký xe, trang: ${page}, limit: ${limit}`;

    if ((authority || query.authority === 'true') && effectiveUserId) {
      originalUserId = effectiveUserId;
    }

    let totalSql = '';
    let rowsSql = '';

    try {
      const pool = await this.getPool();

      const [userRoleRes, featureManagement, userRes] = await Promise.all([
        this.userService.getUserRole(originalUserId, processFn),
        this.featureManagementRepo.findOne({
          where: {
            code: processFn,
            status: 1,
            statusFeature: StatusFeature.ACTIVE,
          },
        }),
        this.userrepo.findOne({
          where: { id: originalUserId },
          relations: ['parent'],
          select: ['id'],
        }),
      ]);

      const { roles } = userRoleRes;
      const receiverUnit = userRes?.parent?.id ?? '';
      const userContext = { originalUserId, roles, receiverUnit };

      const criteria = buildCriteria(filter);
      const featureCriteria = featureManagement?.criteria ?? [];

      const { sql: filterFeature, joins: filterJoins, from } =
        buildVehicleRegistrationCriteriaHelper(
          [...featureCriteria, ...criteria],
          'vehicle_registrations',
          featureManagement,
        );

      const TYPES = ['all', 'pending', 'processed', 'processing', 'completed'] as const;

      if (!TYPES.includes(type as any)) {
        throw new BadRequestException({
          message: 'Type không hợp lệ',
          allowedTypes: TYPES,
        });
      }

      const where: string[] = [];
      where.push(`${from}.status = 1`);

      /** join tách tài xế từ bảng phân công (assignments) */
      const joinDriver = `
        LEFT JOIN ${this.dbname}.vehicle_registration_assignments assignment
          ON assignment.registration_id = ${from}.id
        LEFT JOIN ${this.dbname}.list_cars lc
          ON lc.id = assignment.car_id
      `;

      const joinClause = `
        ${joinDriver}
        ${filterJoins || ''}
      `;

      /** tài xế hiện tại */
      where.push(`
        COALESCE(assignment.driver_id, lc.manager) = @userId
      `);

      /** trạng thái hồ sơ */

      if (type === 'processing') {
        where.push(`${from}.vehicle_state = '${VehicleState.TRONG_TIEN_TRINH}'`);
      }

      if (type === 'completed') {
        where.push(`${from}.vehicle_state = '${VehicleState.HOAN_THANH}'`);
      }

      /** chưa xác nhận */

      if (type === 'pending') {
        where.push(`COALESCE(assignment.is_confirmed, 0) = 0`);
      }

      /** đã xác nhận */

      if (type === 'processed') {
        where.push(`assignment.is_confirmed = 1`);
      }

      if (filterFeature) {
        where.push(`(${filterFeature})`);
      }

      const whereClause = ' WHERE ' + where.join(' AND ');

      const limitNum = Math.min(Number(limit) || 20, 100);
      const pageNum = Math.max(Number(page) || 1, 1);
      const offsetNum = (pageNum - 1) * limitNum;

      const { dbKeys, aliases } = await this.configurationService.buildFilterFieldsVehicleRegistrations(from, [], processFn,);

      const selectFields = dbKeys.join(', ');

      // Sort (dùng shared utility)
      const orderField = sort || 'createdAt';
      const allowedSortFields = [
        ...getDtoKeys(CreateVehicleRegistrationDto),
        'createdAt', 'updatedAt'
      ];
      //chỉ validate giữ logic sort ở hàm dùng chung.      
      validateAndParseSortParam(orderField, allowedSortFields);

      const orderBy =
        ' ORDER BY ' + parseSortVehicle(sort, aliases, from, {});

      totalSql = `
        SELECT COUNT(DISTINCT ${from}.id) AS total
        FROM ${this.dbname}.${from}
        ${joinClause}
        ${whereClause}
      `;

      rowsSql = `
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

      const totalRequest = pool.request().input('userId', originalUserId);
      const rowsRequest = pool.request().input('userId', originalUserId);

      [totalResult, rowsResult] = await Promise.all([
        totalRequest.query(totalSql),
        rowsRequest.query(rowsSql),
      ]);

      const total = totalResult.recordset[0]?.total ?? 0;
      const items = rowsResult.recordset;

      if (!items.length) {
        return {
          success: true,
          items: [],
          total: 0,
          page: pageNum,
          limit: limitNum,
          totalPages: 0,
        };
      }

      // Kiểm tra tài xế đã tiếp nhận yêu cầu nào khác chưa hoàn thành hay không
      const activeRegistration = await this.vehicleRegistrationAssignmentRepo.createQueryBuilder('assignment')
        .innerJoin(VehicleRegistrationEntity, 'vr', 'vr.id = assignment.registrationId')
        .where('assignment.driverId = :driverId', { driverId: originalUserId })
        .andWhere('assignment.isConfirmed = :isConfirmed', { isConfirmed: true })
        .andWhere('vr.vehicleState IN (:...states)', { states: [VehicleState.DA_PHAN_CONG, VehicleState.TRONG_TIEN_TRINH] })
        .andWhere('vr.status = 1')
        .getOne();

      const hasActive = !!activeRegistration;

      const lookupData = await this.preloadLookupData(items);
      const mappedItems = items.map((item) => {
        const cleaned = this.mapToCleanData(item, aliases, isExport, userContext, lookupData);

        // Tìm xem mục này đã được tài xế xác nhận chưa
        let confirmedDrivers: string[] = [];
        const confirmedRaw = this.getVal(item, 'confirmedDriverIds');
        if (typeof confirmedRaw === 'string') {
          try { confirmedDrivers = JSON.parse(confirmedRaw); } catch { }
        }
        const isConfirmedByMe = Array.isArray(confirmedDrivers) && confirmedDrivers.includes(originalUserId);

        cleaned.canConfirm = !hasActive || isConfirmedByMe;

        return cleaned;
      });
      await this.attachWorkflowFields(items, mappedItems, originalUserId, roles, receiverUnit);
      this.logAsync(req, originalUserId, details, 'SUCCESS');

      return {
        success: true,
        items: mappedItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      const errorStack = e instanceof Error ? e.stack : '';
      const detailedLog = `LỖI TRUY VẤN DỮ LIỆU XE | Lỗi: ${errorMsg} | Stack: ${errorStack} | Query params: ${JSON.stringify({ type, page, limit, filter, sort, processFn, isExport, originalUserId, effectiveUserId, authority })} | Total SQL: ${totalSql || 'N/A'} | Rows SQL: ${rowsSql || 'N/A'}`;

      this.logAsync(req, originalUserId, detailedLog, 'ERROR');
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu xe');
    }
  }
  private async findEntityById(id: string) {
    const item = await this.vehicleRegistrationRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy yêu cầu đăng ký xe với ID: ${id}`);
    }
    return item;
  }

  async getDetail(id: string, originalUser: string, req?: any) {
    const item = await this.findEntityById(id);
    const details = `Truy cập chi tiết yêu cầu đăng ký xe, ID yêu cầu: ${id}`;

    try {
      let coordinationInformation: any[] = [];

      if (typeof item.coordinationInformation === 'string') {
        try {
          coordinationInformation = JSON.parse(item.coordinationInformation);
        } catch {
          coordinationInformation = [];
        }
      }

      let confirmedDrivers: string[] = [];

      if (item.confirmedDriverIds) {
        try {
          confirmedDrivers = JSON.parse(item.confirmedDriverIds);
        } catch {
          confirmedDrivers = [];
        }
      }

      const carIds = [...new Set(coordinationInformation.map(c => c.carId).filter(Boolean))];
      const driverIds = [...new Set(coordinationInformation.map(c => c.driverId).filter(Boolean))];

      const userPromise = item.createdBy ? this.userrepo.findOne({
        where: { id: item.createdBy },
        relations: ['parent'],
        select: {
          id: true, name: true, position: true, parent: { id: true, name: true }
        }
      }) : Promise.resolve(null);

      const [userRoleRes, userRes, createdUser, cars, drivers, users] = await Promise.all([
        this.userService.getUserRole(originalUser, item.bpmnVersion),

        this.userrepo.findOne({
          where: { id: originalUser },
          relations: ['parent'],
          select: ['id'],
        }),

        userPromise,

        carIds.length ? this.listCarRepo.find({
          where: { id: In(carIds) },
          select: [
            'id', 'licensePlate', 'carType', 'brand', 'seatCount', 'manager', 'statusCar'
          ]
        }) : Promise.resolve([]),

        driverIds.length ? this.listDriverRepo.find({
          where: { driverId: In(driverIds) },
          select: [
            'id', 'fullName', 'phoneNumber', 'idCard', 'email', 'address', 'licenseNumber', 'licenseClass', 'licenseIssuedDate', 'driverId'
          ]
        }) : [],
        driverIds.length
          ? this.userrepo.find({
            where: { id: In(driverIds) },
            select: ['id', 'name', 'phoneNumberUser', 'emailUser', 'addressUser']
          })
          : Promise.resolve([])
      ]);

      const carMap = new Map<string, any>(
        cars.map((c): [string, any] => [c.id, c])
      );

      const driverMap = new Map<string, any>(
        drivers.map((d): [string, any] => [d.driverId, d])
      );
      const userMap = new Map(
        users.map((u): [string, any] => [u.id, u])
      );
      const userContext = {
        userId: originalUser,
        roles: userRoleRes?.roles || [],
        receiverUnit: userRes?.parent?.id ?? null,
      };
      if (!item.bpmnVersion) {
        throw new Error('bpmnVersion is missing');
      }

      const { process, indexes } = await this.getBpmnModel(item.bpmnVersion);

      const coordRoles: string[] = [];
      if (indexes && (indexes as any).lanes) {
        for (const lane of Object.values((indexes as any).lanes) as any[]) {
          const ext = lane.properties || getAllNodeExtensionProperties(lane);
          if (ext.isCoordinator === 'true') {
            const laneRole = lane.role || ext.candidateGroupsCode || ext.candidateGroups;
            if (laneRole && !coordRoles.includes(laneRole)) {
              coordRoles.push(laneRole);
            }
          }
        }
      }

      const [audit, openWorkItems] = await Promise.all([
        this.sqlRepo.getAudit(item.id),
        this.sqlRepo.listOpenWorkItems(item.id),
      ]);
      const perItems = await Promise.all(
        openWorkItems.map(async (wi) => {
          const rolesForCompute = [...userContext.roles];
          if (item.vehicleState === VehicleState.TRONG_TIEN_TRINH) {
            const isCoordinator = userContext.roles.some(r => coordRoles.includes(r));
            if (isCoordinator && wi.role && coordRoles.includes(wi.role)) {
              if (!rolesForCompute.includes(wi.role)) {
                rolesForCompute.push(wi.role);
              }
            }
          }

          const res = await this.bpmnEngine.computeAvailableActions({
            process,
            indexes,
            currentNodeId: wi.nodeId,
            workItem: wi,
            document: item,
            userId: originalUser,
            userRoles: rolesForCompute,
            skipRedisRead: true,
            getUsersByRole: (role) => this.sqlsvRepo.getUsersByRoleMongoDB(role),
            audit,
          });

          // Lọc action Nhắc nhở nếu đã xác nhận hết
          const isAllConfirmed = (item as any).isAllDriversConfirmed || (item as any).is_all_drivers_confirmed;
          if (isAllConfirmed) {
            res.availableActions = res.availableActions.filter((a: any) => {
              const flow = indexes.outgoingBySource.get(wi.nodeId)?.find((f: any) => (f.name || f.id) === a.code || getAllNodeExtensionProperties(f)?.actionCode === a.code);
              const hideIfAll = getAllNodeExtensionProperties(flow)?.hideIfAllConfirmed === 'true';
              return !hideIfAll;
            });
          }

          // Override for TRONG_TIEN_TRINH state
          if (item.vehicleState === VehicleState.TRONG_TIEN_TRINH) {
            const isCoordinator = userContext.roles.some(r => coordRoles.includes(r));
            const isDriverOfRequest = driverIds.includes(originalUser);

            res.availableActions = res.availableActions.map((a: any) => {
              if (isCoordinator || isDriverOfRequest) {
                return { ...a, canExecute: true };
              } else {
                return { ...a, canExecute: false };
              }
            });
          }

          return {
            workItem: wi,
            node: res.node,
            availableActions: res.availableActions,
            flags: res.flags,
          };
        })
      );

      const first = perItems.find((x) =>
        x.availableActions.some((a: any) => a.canExecute),
      );

      const summary = first ||
        perItems[0] || { workItem: null, availableActions: [], flags: {} };

      const summaryFlags = perItems.reduce(
        (acc, x) => ({ ...acc, ...x.flags }),
        {},
      );
      coordinationInformation = await Promise.all(coordinationInformation.map(async (c) => {
        const car = carMap.get(c.carId);
        const driver = driverMap.get(c.driverId);
        const user = userMap.get(c.driverId);

        const managerId = car?.manager ?? null;

        const isManagerDriver = car?.manager === c.driverId;
        const contact =
          driver?.phoneNumber ||
          driver?.email ||
          driver?.address ||
          user?.phoneNumberUser ||
          user?.emailUser ||
          user?.addressUser ||
          '-';

        return {
          carId: c.carId,
          driverId: c.driverId,

          carType: this.typeCarCache.get(car?.carType) || car?.carType || '-',
          brand: car?.brand || '-',
          licensePlate: car?.licensePlate || '-',

          driverName: driver?.fullName || user?.name || '-',

          contact,
          manager: managerId
            ? {
              id: managerId,
              name: await this.getUserNameById(managerId)
            }
            : '-',

          isManagerDriver,

          confirmed: confirmedDrivers.includes(c.driverId)
            ? "Đã tiếp nhận"
            : "Chưa tiếp nhận"
        };
      }));
      const totalCoordinatedCars = carIds.length;
      const createdByInfo = createdUser ? {
        id: createdUser.id,
        name: createdUser.name,
        position: createdUser.position || '-',
        department: createdUser.parent?.name || '-',
        departmentId: createdUser.parent?.id || '-',
        createdAt: dayjs(item.createdAt)
          .tz('Asia/Ho_Chi_Minh')
          .format('HH:mm DD/MM/YYYY')
      } : '-';
      const isCreator = item.createdBy === originalUser;

      const isCoordinated = coordinationInformation.some(
        (c) => c.carId && c.driverId
      );
      const totalSeats = cars.reduce(
        (sum, car) => sum + (car.seatCount || 0),
        0
      );
      let sortedActions = (summary.availableActions || []).sort((a, b) => {
        const orderA = a.orderButton ? Number(a.orderButton) : Infinity;
        const orderB = b.orderButton ? Number(b.orderButton) : Infinity;
        return orderA - orderB;
      });

      // Ẩn action có hideIfAllConfirmed=true khi tất cả tài xế đã xác nhận
      const isAllConfirmedDetail = item.isAllDriversConfirmed;
      if (isAllConfirmedDetail && summary.workItem?.nodeId) {
        sortedActions = sortedActions.filter((a: any) => {
          const flow = indexes.outgoingBySource
            .get(summary.workItem.nodeId)
            ?.find(
              (f: any) =>
                (f.name || f.id) === a.code ||
                getAllNodeExtensionProperties(f)?.actionCode === a.code,
            );
          const hideIfAll = getAllNodeExtensionProperties(flow)?.hideIfAllConfirmed === 'true';
          return !hideIfAll;
        });
      }

      if (item.isEdited) {
        sortedActions = sortedActions.map((a: any) => {
          if (a.code === 'CHINH_SUA_NGUOI_DANG_KY') {
            return {
              ...a,
              isDisabled: true,
              flagsButton: {
                ...(a.flagsButton || {}),
                isDisabled: true,
              },
            };
          }
          return a;
        });
      }
      // Kiểm tra tài xế đã tiếp nhận yêu cầu nào khác chưa hoàn thành hay không
      const activeOtherRegistration = await this.vehicleRegistrationAssignmentRepo.createQueryBuilder('assignment')
        .innerJoin(VehicleRegistrationEntity, 'vr', 'vr.id = assignment.registrationId')
        .where('assignment.registrationId != :registrationId', { registrationId: item.id })
        .andWhere('assignment.driverId = :driverId', { driverId: originalUser })
        .andWhere('assignment.isConfirmed = :isConfirmed', { isConfirmed: true })
        .andWhere('vr.vehicleState IN (:...states)', { states: [VehicleState.DA_PHAN_CONG, VehicleState.TRONG_TIEN_TRINH] })
        .andWhere('vr.status = 1')
        .getOne();

      const hasActive = !!activeOtherRegistration;
      const isConfirmedByMe = confirmedDrivers.includes(originalUser);

      this.logAsync(req, originalUser, details, 'SUCCESS');

      return {
        success: true,
        data: {
          ...item,
          coordinationInformation,
          createdByInfo,
          vehicleStateBadge: mapVehicleStateBadge(item.vehicleState),
          isCreator: !isCreator,
          isCoordinated,
          totalCoordinatedCars,
          totalSeats,
          canConfirm: !hasActive || isConfirmedByMe,
        },
        workItem: summary.workItem,
        availableActions: sortedActions,
        flags: summaryFlags
      };
    } catch (e) {
      this.logAsync(req, originalUser, details, 'ERROR');
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu xe');
    }
  }

  async getCarList(keyword?: string) {
    const pool = await this.getPool();
    const request = pool.request();

    let whereClause = `
      WHERE status = 1 
        AND booking_available = 1
        AND (status_car IS NULL OR status_car <> 'BAO_DUONG')

        -- 🔥 loại xe đang bận
        AND NOT EXISTS (
          SELECT 1
          FROM ${this.dbname}.vehicle_registrations vr
          CROSS APPLY OPENJSON(vr.car_ids) j
          WHERE j.value = list_cars.id
            AND vr.vehicle_state IN ('TRONG_TIEN_TRINH', 'DA_PHAN_CONG')
        )
    `;

    if (keyword?.trim()) {
      whereClause += `
        AND (
          license_plate COLLATE Latin1_General_CI_AI LIKE '%' + @keyword + '%'
          OR brand COLLATE Latin1_General_CI_AI LIKE '%' + @keyword + '%'
        )
      `;
      request.input('keyword', keyword.trim());
    }

    const sql = `
      SELECT 
        id,
        license_plate AS licensePlate,
        car_type AS carType,
        brand,
        seat_count AS seatCount,
        manager,
        status_car,
        ISNULL(total_trips, 0) AS totalTrips
      FROM ${this.dbname}.list_cars
      ${whereClause}
      ORDER BY license_plate
    `;

    const result = await request.query(sql);
    const cars = result.recordset ?? [];

    return await Promise.all(cars.map(async (car) => ({
      ...car,
      name: car.licensePlate,
      carType: this.typeCarCache.get(car.carType) || car.carType,
      manager: car.manager
        ? {
          id: car.manager,
          name: await this.getUserNameById(car.manager) || car.manager
        }
        : null
    })));
  }
  async getCarListIncludeBusy(keyword?: string) {
    const pool = await this.getPool();
    const request = pool.request();

    let whereClause = `
      WHERE status = 1
    `;

    if (keyword?.trim()) {
      whereClause += `
        AND (
          license_plate COLLATE Latin1_General_CI_AI LIKE '%' + @keyword + '%'
          OR brand COLLATE Latin1_General_CI_AI LIKE '%' + @keyword + '%'
        )
      `;
      request.input('keyword', keyword.trim());
    }

    const sql = `
      SELECT 
        id,
        license_plate AS licensePlate,
        car_type AS carType,
        brand,
        seat_count AS seatCount,
        manager,
        status_car,
        ISNULL(total_trips, 0) AS totalTrips
      FROM ${this.dbname}.list_cars
      ${whereClause}
      ORDER BY license_plate
    `;

    const result = await request.query(sql);
    const cars = result.recordset ?? [];

    return await Promise.all(cars.map(async (car) => ({
      ...car,
      name: car.licensePlate,
      carType: this.typeCarCache.get(car.carType) || car.carType,
      manager: car.manager
        ? {
          id: car.manager,
          name: await this.getUserNameById(car.manager) || car.manager
        }
        : null
    })));
  }

  async getDriverList(keyword?: string) {
    const pool = await this.getPool();
    const request = pool.request();

    if (keyword?.trim()) {
      request.input('keyword', keyword.trim());
    }

    const sql = `
      SELECT 
        d.id,
        d.driver_id AS driverId,
        d.full_name AS fullName,
        d.phone_number AS phoneNumber,
        d.license_class AS licenseClass,
        ISNULL(d.total_trips, 0) AS totalTrips
      FROM ${this.dbname}.list_drivers d
      WHERE d.status = 1 
        AND booking_available = 1
        AND (d.status_driver IS NULL OR d.status_driver <> 'NGUNG_HOAT_DONG')

        -- Loại driver đang bận
        AND NOT EXISTS (
          SELECT 1
          FROM ${this.dbname}.vehicle_registrations vr2
          CROSS APPLY OPENJSON(
            CASE 
              WHEN vr2.driver_ids IS NULL THEN '[]'
              WHEN LTRIM(RTRIM(vr2.driver_ids)) = '' THEN '[]'
              WHEN ISJSON(vr2.driver_ids) = 1 THEN vr2.driver_ids
              ELSE '[]'
            END
          ) j2
          WHERE j2.value = d.id
            AND vr2.vehicle_state IN ('TRONG_TIEN_TRINH', 'DA_PHAN_CONG')
        )

        ${keyword?.trim() ? `
          AND (
            d.full_name COLLATE Latin1_General_CI_AI LIKE '%' + @keyword + '%'
            OR d.phone_number LIKE '%' + @keyword + '%'
          )
        ` : ''}
      ORDER BY d.full_name
    `;

    const result = await request.query(sql);
    const data = result.recordset ?? [];

    return data.map((d: any) => ({
      ...d,
      nameAndTrip: `${d.fullName} - ${d.totalTrips} chuyến`,
    }));
  }

  async getDriverListIncludeBusy(keyword?: string) {
    const pool = await this.getPool();
    const request = pool.request();

    if (keyword?.trim()) {
      request.input('keyword', keyword.trim());
    }

    const sql = `
      SELECT 
        d.id,
        d.driver_id AS driverId,
        d.full_name AS fullName,
        d.phone_number AS phoneNumber,
        d.license_class AS licenseClass,
        ISNULL(d.total_trips, 0) AS totalTrips
      FROM ${this.dbname}.list_drivers d
      WHERE d.status = 1

      ${keyword?.trim() ? `
        AND (
          d.full_name COLLATE Latin1_General_CI_AI LIKE '%' + @keyword + '%'
          OR d.phone_number LIKE '%' + @keyword + '%'
        )
      ` : ''}
      ORDER BY d.full_name
    `;

    const result = await request.query(sql);
    const data = result.recordset ?? [];

    return data.map((d: any) => ({
      ...d,
      id: d.driverId,
      name: d.fullName,
      nameAndTrip: `${d.fullName} - ${d.totalTrips} chuyến`,
    }));
  }

  async update(id: string, updateVehicleRegistrationDto: UpdateVehicleRegistrationDto, originalUserId: string, req?: any) {
    const details = `Cập nhật yêu cầu đăng ký xe, ID yêu cầu: ${id}`;
    let tx: any = null;
    let addAudit = true;
    try {
      if (updateVehicleRegistrationDto.coordinationInformation) {
        const carIdsInput = updateVehicleRegistrationDto.coordinationInformation.map(i => i.carId).filter(Boolean);
        if (new Set(carIdsInput).size !== carIdsInput.length) {
          throw new BadRequestException('Không được phép chọn xe trùng nhau trong cùng một phiếu điều phối');
        }
        const driverIdsInput = updateVehicleRegistrationDto.coordinationInformation.map(i => i.driverId).filter(Boolean);
        if (new Set(driverIdsInput).size !== driverIdsInput.length) {
          throw new BadRequestException('Không được phép chọn tài xế trùng nhau trong cùng một phiếu điều phối');
        }
      }
      const { actionCode } = updateVehicleRegistrationDto;
      const item = await this.findEntityById(id);

      const isNotRejected = item.vehicleState !== 'TU_CHOI';
      let allUserIds: string[] = [];

      if (isNotRejected) {
        const now = new Date();
        const departureTime = new Date(item.departureTime);
        const diffMinutes = (departureTime.getTime() - now.getTime()) / (1000 * 60);
        if (diffMinutes < 30) {
          throw new BadRequestException(
            'Chỉ được phép chỉnh sửa yêu cầu trước thời gian xuất phát ít nhất 30 phút.',
          );
        }

        if (item.isEdited) {
          throw new BadRequestException(
            'Yêu cầu này đã được chỉnh sửa trước đó. Chỉ được phép chỉnh sửa 1 lần duy nhất.',
          );
        }

        item.isEdited = true;

        // Resolve active work items and their users
        const workItems = await this.sqlRepo.getWorkItemsByDocumentId(id);
        const activeWorkItems = workItems.filter((w) => w.state === 'open');
        const uniqueRoles = [...new Set(activeWorkItems.map((w) => w.role).filter(Boolean))];

        if (uniqueRoles.length > 0 && item.bpmnVersion) {
          const roleUsers = await this.findUsersByRoleCodes(uniqueRoles);
          const roleUserIds = roleUsers.map((u) => u.userId);

          const laneUserIds: string[] = [];
          for (const r of uniqueRoles) {
            const res = await this.getUsersInFlow(item.bpmnVersion, r);
            if (res && res.userIds) {
              laneUserIds.push(...res.userIds);
            }
          }
          allUserIds = [...new Set([...roleUserIds, ...laneUserIds])];
        }
      }

      if (item.vehicleState === 'TU_CHOI') {
        const workItems =
          await this.sqlRepo.getWorkItemsByDocumentId(id);

        const currentWorkItem = workItems.find(
          (w) =>
            w.documentId === id &&
            w.state === 'open' &&
            w.assigneeUserId === originalUserId
        ) || workItems.find(
          (w) =>
            w.documentId === id &&
            w.state === 'open'
        );

        if (!currentWorkItem) {
          throw new BadRequestException(
            'Không tìm thấy work item đang xử lý',
          );
        }

        const flowConfig = item.bpmnVersion;

        if (!flowConfig) {
          throw new BadRequestException(
            'Không tìm thấy cấu hình BPMN',
          );
        }

        // BPMN XML
        const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig);

        if (!bpmnXML) {
          throw new BadRequestException(
            'Không tìm thấy file BPMN',
          );
        }

        // Parse BPMN
        const { indexes } = await this.runtimeDbService.getModelFromXml(
          bpmnXML,
        );

        // Current node
        const currentNode = indexes.nodes.get(
          currentWorkItem.nodeId,
        );

        if (!currentNode) {
          throw new BadRequestException(
            'Không tìm thấy node hiện tại',
          );
        }

        // User role
        const userProcessRoles =
          await this.userService.findProcessRoleInfoByIdActionStart(
            originalUserId,
            flowConfig,
          );

        let userRoleCodes: string[] =
          userProcessRoles.roleCodes || [];

        // Lane roles
        const lanes = Object.values(indexes.lanes || {});

        const laneRoleCodes: string[] = lanes
          .map((l: any) => l.role)
          .filter(
            (r): r is string =>
              typeof r === 'string' && r.length > 0,
          );

        const groupRoles =
          await this.findUsersByRoleCodes(
            laneRoleCodes,
            flowConfig,
          );

        const rolesFromGroup = groupRoles
          .filter(
            (u) => u.userId === originalUserId,
          )
          .map((u) => u.roleCode);

        userRoleCodes = [
          ...new Set([
            ...userRoleCodes,
            ...rolesFromGroup,
          ]),
        ];

        // Check permission
        const currentNodeRole = indexes.laneMap.get(currentNode.id);

        const hasPermission =
          currentWorkItem.assigneeUserId ===
          originalUserId ||
          userRoleCodes.includes(currentNodeRole);

        if (!hasPermission) {
          throw new ForbiddenException(
            'Bạn không có quyền cập nhật yêu cầu đăng ký xe',
          );
        }

        // OUTGOING FLOW
        let outs =
          indexes.outgoingBySource.get(
            currentNode.id,
          ) || [];

        if (!outs.length) {
          throw new BadRequestException(
            'Node hiện tại không có outgoing flow',
          );
        }

        // Handle gateway
        for (const f of outs) {
          const target = f.targetRef;

          if (
            target &&
            (
              target.$type ===
              'bpmn:ExclusiveGateway' ||
              target.$type ===
              'bpmn:InclusiveGateway'
            )
          ) {
            outs =
              indexes.outgoingBySource.get(
                target.id,
              ) || [];

            break;
          }
        }

        // Match flow
        let flow = outs[0];
        if (actionCode) {
          const matchedFlow = outs.find((f: any) => {
            const ext = getAllNodeExtensionProperties(f);
            return (
              (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode.toUpperCase()) ||
              (f.name && f.name.toUpperCase() === actionCode.toUpperCase()) ||
              f.id === actionCode
            );
          });
          if (matchedFlow) {
            flow = matchedFlow;
          }
        }

        if (!flow) {
          throw new BadRequestException(
            'Không tìm thấy flow tiếp theo',
          );
        }

        // Resolve next node
        const { node: nextNode } =
          this.bpmnEngine.nextInteractiveFromFlow(
            flow,
            indexes,
          );

        if (!nextNode) {
          throw new BadRequestException(
            'Không tìm thấy node tiếp theo',
          );
        }

        const targetRole = indexes.laneMap.get(nextNode.id);

        // status
        const statusCodeNextNode =
          getAllNodeExtensionProperties(
            nextNode,
          )?.statusCode;

        const statusNameNextNode =
          getAllNodeExtensionProperties(
            nextNode,
          )?.statusName;

        // USERS
        const roleUsers = await this.findUsersByRoleCodes([
          targetRole,
        ]);

        const roleUserIds = roleUsers.map(
          (u) => u.userId,
        );

        const { userIds: laneUserIds } = await this.getUsersInFlow(
          flowConfig,
          targetRole,
        );

        allUserIds = [
          ...new Set([
            ...roleUserIds,
            ...laneUserIds,
          ]),
        ];

        // START TRANSACTION
        tx = await this.sqlRepo.begin();

        // CLOSE OLD WORK ITEMS (Xóa toàn bộ work item đang hoạt động của tài liệu)
        await this.sqlRepo.removeAllWorkItems(item.id, tx);

        // CREATE NEW WORK ITEMS
        for (const userId of allUserIds) {
          await this.sqlRepo.addWorkItem(
            item.id,
            {
              id: `wi_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}`,
              nodeId: nextNode.id,
              role: targetRole || null,
              assigneeUserId: userId || null,
              nodeType: nextNode.$type || null,
            },
            tx,
            flowConfig,
          );
        }

        // UPDATE STATUS
        item.vehicleState = VehicleState.CHO_DIEU_PHOI;

        item.statusCode = statusCodeNextNode || null;

        // AUDIT
        await this.sqlRepo.addAudit(
          item.id,
          {
            user_id: originalUserId,
            role: currentWorkItem.role || null,
            action_code: nextNode.actionCode || 'CAP_NHAT_YEU_CAU_DANG_KY_XE',
            receiver: targetRole || null,
            receiver_unit: null,
            display_name: 'Người đăng ký xe',
            action: 'Cập nhật yêu cầu đăng ký xe bị từ chối và trình phê duyệt',
            details: 'Người dùng cập nhật lại yêu cầu sau khi bị từ chối',
            stage_status: stageStatusArchire.CHUA_XU_LY,
            curStatusCode: statusCodeNextNode || null,
            from_node_id: currentNode.id,
            to_node_id: nextNode.id,
            roleProcess: 'processor',
            created_by: originalUserId,
            origin_id: currentWorkItem.id || null,
            deadline: null,
            typeDocument: this.typeDocument,
            group_: null,
          },
          tx,
        );

        // Tạo work item cho người hiện tại sau khi submit (nếu node tiếp theo là user task)
        const nodeAfterSubmit = this.findEventNode(indexes, 'AFTER_SUBMIT');
        if (nodeAfterSubmit) {
          const roleAfterSubmit = indexes.laneMap.get(nodeAfterSubmit.id) || targetRole;
          await this.sqlRepo.addWorkItem(
            item.id,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: nodeAfterSubmit.id,
              role: roleAfterSubmit || null,
              assigneeUserId: originalUserId,
              nodeType: nextNode.$type || null,
            },
            tx,
            item.bpmnVersion,
          );
        }

        addAudit = false;
      }
      // // Kiểm tra thời gian đặt xe khi cập nhật
      // const checkRequestType = updateVehicleRegistrationDto.requestType ?? item.requestType;
      // const checkDepartureTime = updateVehicleRegistrationDto.departureTime ?? item.departureTime;
      // this.validateDepartureLeadTime(checkRequestType, checkDepartureTime);

      const finalDepartureTime = updateVehicleRegistrationDto.departureTime
        ? new Date(updateVehicleRegistrationDto.departureTime)
        : item.departureTime;
      const finalReturnTime = updateVehicleRegistrationDto.returnTime
        ? new Date(updateVehicleRegistrationDto.returnTime)
        : item.returnTime;

      const tripDurationMinutes =
        finalDepartureTime && finalReturnTime
          ? Math.round(
            (new Date(finalReturnTime).getTime() - new Date(finalDepartureTime).getTime()) / (1000 * 60),
          )
          : item.tripDurationMinutes ?? undefined;

      const updated = {
        ...item,
        ...updateVehicleRegistrationDto,
        departureTime: finalDepartureTime,
        returnTime: finalReturnTime,
        tripDurationMinutes,

        coordinationInformation: updateVehicleRegistrationDto.coordinationInformation
          ? JSON.stringify(updateVehicleRegistrationDto.coordinationInformation)
          : undefined,
      };
      await this.vehicleRegistrationRepo.save(updated);

      const baseAudit = {
        user_id: originalUserId,
        role: null,
        action_code: 'CHINH_SUA_YEU_CAU_DANG_KY_XE',
        receiver_unit: null,
        group_: null,
        roleProcess: 'processor',
        created_by: originalUserId,
        origin_id: null,
        deadline: null,
        typeDocument: this.typeDocument,
      };
      if (addAudit) {
        // Tao audit cho người thực hiện action
        await this.sqlRepo.addAudit(
          id,
          {
            ...baseAudit,
            receiver: originalUserId,
            display_name: 'Người đăng ký xe',
            action: 'Cập nhật yêu cầu đăng ký xe',
            details: 'Cập nhật yêu cầu đăng ký xe',
            stage_status: stageStatusArchire.DA_XU_LY,
            curStatusCode: null,
            from_node_id: null,
            to_node_id: null,
          },
          tx,
        );
      }

      if (tx) {
        await this.sqlRepo.commit(tx);
      }

      if (allUserIds.length > 0) {
        try {
          const senderName = await this.getUserNameById(originalUserId) || 'Người dùng';
          const userRes = await this.userrepo.findOne({
            where: { id: originalUserId },
            relations: ['parent'],
            select: ['id'],
          });
          const receiverUnit = userRes?.parent?.id ?? '';
          const departmentName = await this.getDepartmentNameById(receiverUnit) || 'Đơn vị';
          const priorityLabel = this.getPriorityLabel(updated.priority);

          let notificationContent = `Có yêu cầu đăng ký xe ${updated.requestCode} từ ${departmentName} đã được chỉnh sửa, yêu cầu xem xét.`;
          if (priorityLabel === 'Khẩn cấp') {
            notificationContent += ` (Mức độ: Khẩn cấp)`;
          }

          this.notificationService.createForRecipients({
            recipientIds: allUserIds,
            senderId: originalUserId,
            type: NotificationType.CAR_BOOKING_REQUESTED.value,
            content: notificationContent,
            recordId: updated.id,
            link: `/vehicle-registration/${updated.id}`,
            key: 'VIEW_NEW_REQUEST',
            time: new Date(),
            status: 0,
          });
        } catch (notifErr) {
          this.logger.error('Failed to send notification on update:', notifErr);
        }
      }

      const detailAfter = await this.getDetail(id, originalUserId, req);
      this.logAsync(req, originalUserId, details, 'SUCCESS');
      return {
        success: true,
        message: 'Cập nhật yêu cầu đăng ký xe thành công',
        isEdited: updated.isEdited || false,
        data: detailAfter
      };

    } catch (e) {
      if (tx) {
        await this.sqlRepo.rollback(tx);
      }
      this.logAsync(req, originalUserId, details, 'ERROR');
      this.logger.error(e);
      if (
        e instanceof BadRequestException ||
        e instanceof ForbiddenException ||
        e instanceof NotFoundException
      ) {
        throw e;
      }
      throw new InternalServerErrorException('Lỗi cập nhật yêu cầu đăng ký xe');
    }
  }

  async remove(id: string, originalUserId: string, req?: any) {
    const details = `Xóa yêu cầu đăng ký xe, ID yêu cầu: ${id}`;
    try {
      const item = await this.findEntityById(id);

      // Kiểm tra trạng thái
      if (item.vehicleState === VehicleState.DA_PHAN_CONG || item.vehicleState === VehicleState.TRONG_TIEN_TRINH) {
        throw new BadRequestException(`Yêu cầu ${item.requestCode} đang phân công hoặc trong tiến trình, không thể xóa`);
      }

      // Cập nhật trạng thái xóa
      item.status = 3;
      await this.vehicleRegistrationRepo.save(item);

      this.logAsync(req, originalUserId, details, 'SUCCESS');

      // Trả về request_code và trạng thái map
      return {
        message: `Đã xóa thành công yêu cầu ${item.requestCode}`,
        deleted: { requestCode: item.requestCode, vehicleState: item.vehicleState }
      };
    } catch (e) {
      this.logAsync(req, originalUserId, details, 'ERROR');
      this.logger.error(e);
      throw e instanceof BadRequestException ? e : new InternalServerErrorException('Lỗi xóa yêu cầu đăng ký xe');
    }
  }
  async removeMultiple(ids: string[], originalUserId: string, req?: any) {
    if (!ids || ids.length === 0) {
      return { success: false, message: 'Danh sách ID không hợp lệ' };
    }
    const details = `Xóa nhiều yêu cầu đăng ký xe, ID yêu cầu: ${ids}`;
    try {
      // Lấy tất cả bản ghi
      const items = await this.vehicleRegistrationRepo.find({ where: { id: In(ids) } });

      // Lọc các yêu cầu không được xóa
      const blocked = items.filter(i => i.vehicleState === VehicleState.DA_PHAN_CONG || i.vehicleState === VehicleState.TRONG_TIEN_TRINH);
      if (blocked.length > 0) {
        const blockedCodes = blocked.map(i => i.requestCode).join(', ');
        throw new BadRequestException(`Không thể xóa các yêu cầu đang phân công hoặc trong tiến trình: ${blockedCodes}`);
      }

      // Cập nhật trạng thái xóa
      const result = await this.vehicleRegistrationRepo.update({ id: In(ids) }, { status: 3 });
      this.logAsync(req, originalUserId, details, 'SUCCESS');

      // Map request_code và trạng thái
      const deleted = items.map(i => ({ requestCode: i.requestCode, vehicleState: i.vehicleState }));

      return {
        success: true,
        message: `Đã xóa thành công ${result.affected} yêu cầu`,
        affected: result.affected,
        deleted
      };
    } catch (e) {
      this.logAsync(req, originalUserId, details, 'ERROR');
      this.logger.error(e);
      throw e instanceof BadRequestException ? e : new InternalServerErrorException('Lỗi xóa yêu cầu đăng ký xe');
    }
  }


  // Get start node
  async getActionAvailableByUser(userId: string, roleCache?: Map<string, any>) {
    // 1️⃣ Initialize cache & fetch user/flow info
    const cache = roleCache || new Map();

    const userKey = `__user_${userId}`;
    let user = cache.get(userKey);
    if (!user) {
      user = await this.sqlsvRepo.getUserById(userId);
      if (user) cache.set(userKey, user);
    }
    if (!user?.parent?.id) return [];

    const unitId = String(user.parent.id);
    const flowKey = `__flow_${unitId}`;
    let flow = cache.get(flowKey);
    if (!flow) {
      flow = await this.sqlsvRepo.getFlowByUnit(unitId, 'VehicleRegistration');
      if (flow) cache.set(flowKey, flow);
    }
    if (!flow?.id) return [];

    this.processKey = flow.id;

    // 2️⃣ Get BPMN model (already optimized with internal cache)
    const model = await this.getBpmnModel(flow.id);
    if (!model) return [];
    const { process, indexes } = model;

    // 3️⃣ Resolve roles for THIS user (Optimized: fetch specific instead of all)
    const userRolesKey = `__user_roles_${flow.id}_${userId}`;
    let userRoleCodes: string[] = cache.get(userRolesKey);

    if (!userRoleCodes) {
      const laneRoleCodes: string[] = Object.values(indexes.lanes || {})
        .map((l: any) => l.role)
        .filter((r): r is string => typeof r === 'string' && r.length > 0);

      if (!laneRoleCodes.length) return [];

      // Fetch direct roles and group roles in parallel, specific to this user
      const [roleFeature, userGroupRoles] = await Promise.all([
        this.roleFeaturesRepo.findOne({
          where: { processKey: flow.id },
          select: ['roles'],
        }),
        this.findUsersByRoleCodes(laneRoleCodes, flow.id, userId),
      ]);

      const matchedRoles = new Set<string>();

      // Check group roles (already filtered by userId in DB)
      for (const gu of userGroupRoles) {
        matchedRoles.add(gu.roleCode);
      }

      // Check direct roles (parsed from JSON)
      let roles: any[] = [];
      if (roleFeature?.roles) {
        try {
          roles = typeof roleFeature.roles === 'string' ? JSON.parse(roleFeature.roles) : roleFeature.roles;
        } catch { }
      }
      for (const r of roles) {
        if (r?.roleCode && laneRoleCodes.includes(r.roleCode) && Array.isArray(r.users) && r.users.includes(userId)) {
          matchedRoles.add(r.roleCode);
        }
      }

      userRoleCodes = Array.from(matchedRoles);
      cache.set(userRolesKey, userRoleCodes);
    }

    if (!userRoleCodes.length) return [];

    // 4️⃣ Find Start Node matching user roles
    const matchedStart = Array.from(indexes.nodes.values()).find((n: any) => {
      if (n.$type !== 'bpmn:StartEvent') return false;
      const role = indexes.laneMap.get(n.id);
      return role && userRoleCodes.includes(role);
    });

    if (!matchedStart) return [];
    const laneRoleCode = indexes.laneMap.get((matchedStart as any).id);

    // Resolve the first interactive node after start event
    let startNode: any = null;
    for (const f of (matchedStart as any).outgoing || []) {
      const r = this.bpmnEngine.nextInteractiveFromFlow(f, indexes);
      if (r?.node) {
        startNode = r.node;
        break;
      }
    }

    if (!startNode) return [];

    const workItem = {
      id: 'preview',
      nodeId: startNode.id,
      assigneeUserId: userId,
      role: laneRoleCode,
      nodeType: startNode.$type,
    };

    // 5️⃣ Compute available actions with cached role-user lookups
    const res = await this.bpmnEngine.computeAvailableActions({
      process,
      indexes,
      currentNodeId: startNode.id,
      workItem,
      document: null,
      userId,
      userRoles: userRoleCodes,
      getUsersByRole: async (r: string) => {
        const key = `__role_users_${r}`;
        if (!cache.has(key)) {
          cache.set(key, await this.sqlsvRepo.getUsersByRoleMongoDB(r));
        }
        return cache.get(key);
      },
      audit: [],
    });

    return {
      availableActions: res.availableActions,
      flowConfig: flow,
      workItem,
    };
  }


  async getUsersInFlow(
    processKey: string,
    roleCode: string | string[]
  ): Promise<{ userIds: string[]; total: number }> {
    try {
      // 1. Lấy role_feature
      const docs = await this.roleFeaturesRepo
        .createQueryBuilder('rf')
        .select(['rf.roles'])
        .where('rf.processKey = :processKey', { processKey })
        .getMany();

      // 2. Normalize roleCode
      const roleCodes = Array.isArray(roleCode) ? roleCode : [roleCode];

      // 3. Gom userIds
      const userIdsSet = new Set<string>();

      for (const doc of docs) {
        let roles: any[] = [];

        if (doc.roles) {
          try {
            roles = typeof doc.roles === 'string'
              ? JSON.parse(doc.roles)
              : doc.roles;
          } catch (e) {
            console.error('Parse roles error:', e);
            continue;
          }
        }

        for (const role of roles) {
          if (!role?.users?.length) continue;

          if (roleCodes.includes(role.roleCode)) {
            role.users.forEach((id: string) => {
              if (id) userIdsSet.add(id);
            });
          }
        }
      }

      const userIds = Array.from(userIdsSet);

      return {
        userIds,
        total: userIds.length,
      };
    } catch (e) {
      console.error('Error in getUsersInFlow:', e);
      return { userIds: [], total: 0 };
    }
  }

  async coordinationInformation(
    id: string,
    dto: CreateVehicleRegistrationDto,
    originalUserId: string,
    req?: any
  ) {
    const { noteDetail, workItem, actionCode, coordinationInformation } = dto;
    const details = `Điều phối yêu cầu đăng ký xe - Phòng hậu cần, đội xe, ID yêu cầu: ${id}`;
    let tx: any = null;
    try {
      if (!coordinationInformation || coordinationInformation.length === 0) {
        throw new BadRequestException('coordinationInformation là bắt buộc');
      }

      const incomingCarIds = coordinationInformation.map(i => i.carId).filter(Boolean);
      const incomingDriverIds = coordinationInformation.map(i => i.driverId).filter(Boolean);

      const [carsList, driverUsers, driverListDetails] = await Promise.all([
        incomingCarIds.length ? this.listCarRepo.find({
          where: { id: In(incomingCarIds) },
          select: ['id', 'licensePlate']
        }) : Promise.resolve([]),
        incomingDriverIds.length ? this.userrepo.find({
          where: { id: In(incomingDriverIds) },
          relations: ['parent'],
          select: ['id', 'name', 'phoneNumberUser']
        }) : Promise.resolve([]),
        incomingDriverIds.length ? this.listDriverRepo.find({
          where: { driverId: In(incomingDriverIds) },
          select: ['driverId', 'fullName', 'phoneNumber']
        }) : Promise.resolve([])
      ]);

      const carMap = new Map(carsList.map(c => [c.id, c.licensePlate]));
      const driverUserMap = new Map(driverUsers.map(u => [u.id, u]));
      const driverDetailMap = new Map(driverListDetails.map(d => [d.driverId, d]));

      const coordinationList = coordinationInformation.map(item => {
        if (!item.carId) {
          throw new BadRequestException('carId là bắt buộc');
        }

        const carPlate = carMap.get(item.carId) || item.carId;
        let driverName = '-';
        let phoneNumber = '';
        if (item.driverId) {
          const u = driverUserMap.get(item.driverId);
          const d = driverDetailMap.get(item.driverId);
          driverName = d?.fullName || u?.name || '-';
          phoneNumber = d?.phoneNumber || u?.phoneNumberUser || '';
        }

        const phoneText = phoneNumber ? ` - ${phoneNumber}` : '';
        const text = `🚗 ${carPlate} - 👤 ${driverName}${phoneText}`;

        return {
          carId: item.carId.trim(),
          driverId: item.driverId ? item.driverId.trim() : null,
          text: text
        };
      });

      const carIds = coordinationList.map(i => i.carId);
      if (new Set(carIds).size !== carIds.length) {
        throw new BadRequestException('Không được phép chọn xe trùng nhau trong cùng một phiếu điều phối');
      }

      const driverIds = coordinationList.map(i => i.driverId).filter((id): id is string => !!id);
      if (new Set(driverIds).size !== driverIds.length) {
        throw new BadRequestException('Không được phép chọn tài xế trùng nhau trong cùng một phiếu điều phối');
      }

      const item = await this.findEntityById(id);
      const flowConfig = item.bpmnVersion;

      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho yêu cầu này');
      }

      // Lấy BPMN
      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig);
      if (!bpmnXML) {
        throw new BadRequestException('Không tìm thấy file BPMN');
      }

      // Kiểm tra quyền của user trong flow tương tự checkView
      const flowInfo = await this.userService.getUserFlowInfo(originalUserId, flowConfig);
      const roleInfo = await this.sqlsvRepo.getUserRole(originalUserId, flowConfig);
      const hasPermission = !!flowInfo || !!roleInfo;

      if (!hasPermission) {
        throw new BadRequestException('Bạn không có quyền điều phối xe');
      }

      // Lấy role trực tiếp của user
      const userProcessRoles = await this.userService.findProcessRoleInfoByIdActionStart(originalUserId, flowConfig);
      let userRoleCodes: string[] = userProcessRoles.roleCodes || [];

      // Lấy indexes
      const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);

      // Lấy role từ lane + group
      const lanes = Object.values(indexes.lanes || {});
      const laneRoleCodes: string[] = lanes
        .map((l: any) => l.role)
        .filter((r): r is string => typeof r === 'string' && r.length > 0);

      const groupRoles = await this.findUsersByRoleCodes(laneRoleCodes, flowConfig);

      const rolesFromGroup = groupRoles
        .filter(u => u.userId === originalUserId)
        .map(u => u.roleCode);

      // Merge tất cả role
      userRoleCodes = [...new Set([...userRoleCodes, ...rolesFromGroup])];
      if (roleInfo?.roleCode) {
        userRoleCodes.push(roleInfo.roleCode);
      }
      userRoleCodes = [...new Set(userRoleCodes)];

      // 4️⃣ Find current node & outgoing flows
      const wi = workItem;
      if (!wi) {
        throw new BadRequestException('WorkItem not found or already completed');
      }

      const node = indexes.nodes.get(wi.nodeId);
      if (!node) {
        throw new BadRequestException('Current BPMN node not found');
      }

      let outs = indexes.outgoingBySource.get(node.id) || [];

      // Handle gateway trung gian
      for (const f of outs) {
        const target = f.targetRef;
        if (target && (target.$type === 'bpmn:ExclusiveGateway' || target.$type === 'bpmn:InclusiveGateway')) {
          outs = indexes.outgoingBySource.get(target.id) || [];
          break;
        }
      }

      // 5️⃣ Match flow theo actionCode
      const flow = outs.find((f: any) => {
        const ext = getAllNodeExtensionProperties(f);
        return (
          (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
          (f.name && f.name.toUpperCase() === actionCode) ||
          f.id === actionCode
        );
      });

      if (!flow) {
        throw new BadRequestException(`No outgoing flow matches actionCode ${actionCode}`);
      }

      // 6️⃣ Resolve next interactive node
      const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
      if (!nextNode) {
        throw new BadRequestException('No next interactive node found');
      }



      const branches: any[] = [];

      /**
       * CASE 1: NEXT NODE LÀ GATEWAY
       */
      if (nextNode.$type === 'bpmn:ExclusiveGateway') {
        const gatewayOuts = indexes.outgoingBySource.get(nextNode.id) || [];

        if (!gatewayOuts.length) {
          throw new BadRequestException('Gateway không có nhánh tiếp theo');
        }

        for (const f of gatewayOuts) {
          let condition = f.conditionExpression?.body;
          if (!condition) continue;

          condition = condition.trim();

          if (condition.startsWith('{') && condition.endsWith('}')) {
            condition = condition.slice(1, -1);
          }

          const conditionStr = condition.toLowerCase().replace(/\s+/g, '');

          let branchKey: string | null = null;

          if (
            conditionStr.includes('key=="driver"') ||
            conditionStr.includes("key=='driver'") ||
            conditionStr.includes('key==driver')
          ) {
            branchKey = 'driver';
          }

          if (
            conditionStr.includes('key=="logisticsroom"') ||
            conditionStr.includes("key=='logisticsroom'") ||
            conditionStr.includes('key==logisticsroom')
          ) {
            branchKey = 'logisticsroom';
          }

          if (!branchKey) continue;

          const { node: resolvedNode } = this.bpmnEngine.nextNodeByFlow(f, indexes);
          if (!resolvedNode) continue;

          const role = indexes.laneMap.get(resolvedNode.id);

          let users: string[] = [];

          /**
           * DRIVER → user lấy từ API
           */
          if (branchKey === 'driver') {
            users = driverIds;
          }

          /**
           * LOGISTICSROOM → user lấy từ role
           */
          if (branchKey === 'logisticsroom') {
            const roleUsers = await this.findUsersByRoleCodes([role]);
            const roleUserIds = roleUsers.map(u => u.userId);

            const { userIds: laneUserIds } = await this.getUsersInFlow(
              flowConfig,
              role
            );
            users = [...new Set([
              ...roleUserIds,
              ...laneUserIds
            ])];
          }

          branches.push({
            key: branchKey,
            nodeId: resolvedNode.id,
            nodeType: resolvedNode.$type,
            role,
            users,
          });
        }

        if (!branches.length) {
          throw new BadRequestException(
            'Không tìm thấy nhánh driver hoặc logisticsroom',
          );
        }
      }

      /**
       * CASE 2: NEXT NODE LÀ TASK
       */
      else {
        const role = indexes.laneMap.get(nextNode.id);

        const users = await this.sqlRepo.getUsersByRoleInFlow(role, flowConfig);

        branches.push({
          key: 'default',
          nodeId: nextNode.id,
          nodeType: nextNode.$type,
          role,
          users,
        });
      }

      /**
       * UPDATE VEHICLE
       */

      const oldAssignments = await this.vehicleRegistrationAssignmentRepo.find({
        where: { registrationId: id },
      });

      const oldDriverIdsV = oldAssignments
        .map(x => x.driverId)
        .filter((id): id is string => !!id);

      // Xóa tất cả phân công cũ của phiếu này
      await this.vehicleRegistrationAssignmentRepo.delete({
        registrationId: id,
      });

      // Thêm mới danh sách phân công
      const newAssignments = coordinationList.map(x => ({
        registrationId: id,
        carId: x.carId,
        driverId: x.driverId || undefined,
        isConfirmed: false,
      }));
      if (newAssignments.length > 0) {
        await this.vehicleRegistrationAssignmentRepo.insert(newAssignments);
      }
      const updateResult = await this.vehicleRegistrationRepo.update(id, {
        vehicleState: VehicleState.DA_PHAN_CONG,
        carIds: JSON.stringify(carIds),
        driverIds: JSON.stringify(driverIds),
        coordinationInformation: JSON.stringify(coordinationList),
        waitingConfirmedAt: new Date(),
        isAllDriversConfirmed: false, // Reset khi điều phối (lại)
        confirmedDriverIds: JSON.stringify([]), // Reset khi điều phối (lại)
      });

      if (updateResult.affected === 0) {
        throw new InternalServerErrorException(
          'Cập nhật thông tin điều phối thất bại',
        );
      }

      tx = await this.sqlRepo.begin();
      /**
       * CREATE WORKITEM
       */

      await this.sqlRepo.updateStageStatusAuditByOrigin(
        item.id,
        stageStatusVehicle.PHONG_DOI_HAU_CAN_NGUOI_DIEU_PHOI,
        stageStatusArchire.DA_XU_LY,
        originalUserId,
        tx,
      );

      // Xóa workitem có node Event_02tms5q có actionCode = AFTER_SUBMIT
      const nodeAfterSubmit = this.findEventNode(indexes, 'AFTER_SUBMIT');
      if (nodeAfterSubmit) {
        const roleAfterSubmit = indexes.laneMap.get(nodeAfterSubmit.id);
        if (roleAfterSubmit) {
          await this.sqlRepo.removeAllWorkItemsWithRole(item.id, roleAfterSubmit, tx);
        }
      }

      // Gom nhóm các node cần tạo workitem theo role để tránh xóa nhầm
      const roleToNodes = new Map<string, { nodeId: string, nodeType: string, users: string[] }[]>();

      for (const branch of branches) {
        const roleNode = branch.role;
        if (!roleToNodes.has(roleNode)) roleToNodes.set(roleNode, []);
        const nodesByRole = roleToNodes.get(roleNode);
        if (nodesByRole) {
          nodesByRole.push({
            nodeId: branch.nodeId,
            nodeType: branch.nodeType,
            users: branch.users
          });
        }
      }

      // Đảm bảo có node Nhắc nhở nếu là điều phối lại cho người đang thực hiện
      if (oldDriverIdsV.length > 0) {
        const reminderNodes = Array.from(indexes.nodes.values())
          .filter((node: any) => getAllNodeExtensionProperties(node)?.isReminderNode === 'true');

        for (const rNode of reminderNodes) {
          const rRole = indexes.laneMap.get((rNode as any).id);
          if (userRoleCodes.includes(rRole)) {
            if (!roleToNodes.has(rRole)) roleToNodes.set(rRole, []);
            const nodesByRole = roleToNodes.get(rRole);
            const alreadyIn = nodesByRole ? nodesByRole.some(n => n.nodeId === (rNode as any).id) : false;
            if (!alreadyIn && nodesByRole) {
              nodesByRole.push({
                nodeId: (rNode as any).id,
                nodeType: (rNode as any).$type,
                users: [originalUserId]
              });
            }
          }
        }
      }

      // Thực hiện xóa và tạo mới workitem
      for (const [roleNode, nodes] of roleToNodes.entries()) {
        await this.sqlRepo.removeAllWorkItemsWithRole(item.id, roleNode, tx);
        for (const node of nodes) {
          // Lấy danh sách các user_id đã có work_item sẵn cho node này (chỉ 1 query duy nhất cho mỗi node)
          const existCheck = await tx.request()
            .input('documentId', item.id)
            .input('nodeId', node.nodeId)
            .query(`SELECT assignee_user_id FROM work_items WHERE document_id = @documentId AND node_id = @nodeId`);
          const existingUserIds = new Set(existCheck.recordset.map((r: any) => String(r.assignee_user_id)));

          for (const user of node.users) {
            // Tránh tạo trùng cho cùng 1 user trên cùng 1 node bằng cách check bộ nhớ
            if (!existingUserIds.has(String(user))) {
              await this.sqlRepo.addWorkItem(
                item.id,
                {
                  id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  nodeId: node.nodeId,
                  role: roleNode,
                  assigneeUserId: user,
                  nodeType: node.nodeType,
                },
                tx,
                item.bpmnVersion,
              );
            }
          }
        }
      }

      const statusCodeNextNode = getAllNodeExtensionProperties(node)?.statusCode;

      const statusNameNextNode = getAllNodeExtensionProperties(nextNode)?.statusName;

      // Query driver details to save in audit details
      let detailContent: any = null;
      try {
        if (driverIds.length > 0) {
          const [driverUsers, driverListDetails] = await Promise.all([
            this.userrepo.find({
              where: { id: In(driverIds) },
              relations: ['parent'],
              select: ['id', 'name', 'phoneNumberUser']
            }),
            this.listDriverRepo.find({
              where: { driverId: In(driverIds) },
              select: ['driverId', 'fullName', 'phoneNumber']
            })
          ]);

          const driverUserMap = new Map(driverUsers.map(u => [u.id, u]));
          const driverDetailMap = new Map(driverListDetails.map(d => [d.driverId, d]));

          const driversData = coordinationList.map(item => {
            const u = driverUserMap.get(item.driverId || '');
            const d = driverDetailMap.get(item.driverId || '');
            const carPlate = carMap.get(item.carId) || item.carId;
            return {
              carPlate,
              driverName: d?.fullName || u?.name || '-',
              department: u?.parent?.name || '-',
              phoneNumber: d?.phoneNumber || u?.phoneNumberUser || '-'
            };
          });

          detailContent = {
            note: oldDriverIdsV.length > 0 ? `Lý do điều phối lại: ${noteDetail || ''}` : 'Đã điều phối',
            drivers: driversData
          };
        } else {
          detailContent = {
            note: oldDriverIdsV.length > 0 ? `Lý do điều phối lại: ${noteDetail || ''}` : 'Đã điều phối',
            drivers: []
          };
        }
      } catch (err) {
        this.logger.error('Lỗi khi lấy thông tin tài xế để ghi log audit:', err);
        detailContent = {
          note: oldDriverIdsV.length > 0 ? `Lý do điều phối lại: ${noteDetail || ''}` : 'Đã điều phối',
          drivers: []
        };
      }

      const baseAudit = {
        user_id: originalUserId,
        role: wi.role,
        action_code: actionCode,
        receiver_unit: null,
        group_: null,
        roleProcess: 'processor',
        created_by: originalUserId,
        origin_id: wi.id,
        deadline: null,
        created_at: new Date(),
        updated_at: new Date(),
        typeDocument: this.typeDocument,
      };

      await this.sqlRepo.addAudit(item.id, {
        ...baseAudit,
        receiver: stageStatusVehicle.TAI_XE_TIEP_NHAN,
        display_name: oldDriverIdsV.length > 0 ? 'Điều phối lại xe và tài xế' : 'Điều phối xe và tài xế ',
        action: oldDriverIdsV.length > 0 ? 'Điều phối lại xe và tài xế' : 'Điều phối xe và tài xế',
        details: detailContent,
        stage_status: stageStatusVehicle.DA_XU_LY,
        curStatusCode: statusCodeNextNode,
        from_node_id: wi.nodeId,
        to_node_id: node.id,
      }, tx);
      const creator = await this.sqlRepo.findCreatorId(item.id, tx);
      // /**
      //  * UPDATE BOOKING STATUS
      //  */
      // // ===== DRIVER BỊ REMOVE → trả lại trạng thái =====
      // for (const old of oldAssignments) {
      //   if (old.driverId && !driverIds.includes(old.driverId)) {
      //     await this.sqlRepo.setDriverBookingTx(old.driverId, true, tx);
      //   }

      //   if (old.carId && !carIds.includes(old.carId)) {
      //     await this.sqlRepo.setCarBookingTx(old.carId, true, tx);
      //   }
      // }

      // // ===== DRIVER + CAR MỚI → set false =====
      // for (const itemCoord of coordinationList) {

      //   await this.sqlRepo.setCarBookingTx(itemCoord.carId, false, tx);

      //   if (itemCoord.driverId) {
      //     await this.sqlRepo.setDriverBookingTx(itemCoord.driverId, false, tx);
      //   }
      // }
      await this.sqlRepo.commit(tx);

      // 7. Thực hiện gửi thông báo và đồng bộ trạng thái xe/tài xế trong background để tránh blocking/timeout API chính
      (async () => {
        try {
          const oldDriverIds: string[] = oldAssignments.map(x => x.driverId).filter((id): id is string => !!id);
          const isReCoordination = oldDriverIds.length > 0 && (
            oldDriverIds.some(id => !driverIds.includes(id)) ||
            driverIds.some(id => !oldDriverIds.includes(id))
          );

          const removedDrivers = oldDriverIds.filter(id => !driverIds.includes(id));
          const requestCode = item.requestCode;

          // tên tài xế
          const driverNames = (await Promise.all(driverIds
            .map(async id => await this.getDriverNameById(id))))
            .filter(Boolean);

          const driverNameText = driverNames.join(', ');
          const newDrivers = driverIds.filter(
            id => !oldDriverIds.includes(id)
          );

          // ===== TÀI XẾ ĐƯỢC PHÂN CÔNG =====
          if (driverIds.length) {
            const priorityLabel = this.getPriorityLabel(item.priority);
            let notificationContent = isReCoordination
              ? `Bạn được phân công thực hiện chuyến xe ${requestCode}, đề nghị tiếp nhận chuyến.`
              : `Bạn được phân công thực hiện chuyến xe ${requestCode}, đề nghị tiếp nhận chuyến.`;
            if (priorityLabel === 'Khẩn cấp') {
              notificationContent += ` (Mức độ: Khẩn cấp)`;
            }
            this.notificationService.createForRecipients({
              recipientIds: driverIds,
              senderId: originalUserId,
              type: NotificationType.CAR_BOOKING_COORDINATED.value,
              content: notificationContent,
              recordId: item.id,
              link: `/vehicle-registration/${item.id}`,
              key: NotificationKey.VIEW_NEW_REQUEST,
              time: new Date(),
              status: 0,
            });
          }

          // ===== TÀI XẾ CŨ (CHỈ KHI ĐIỀU PHỐI LẠI) =====
          if (isReCoordination && removedDrivers.length) {
            this.notificationService.createForRecipients({
              recipientIds: removedDrivers,
              senderId: originalUserId,
              type: NotificationType.CAR_BOOKING_COORDINATED.value,
              content: `Bạn không còn phụ trách chuyến xe ${requestCode}.`,
              recordId: item.id,
              link: `/vehicle-registration/${item.id}`,
              key: NotificationKey.VIEW_NEW_REQUEST,
              time: new Date(),
              status: 0,
            });
          }

          // ===== NGƯỜI ĐĂNG KÝ =====
          if (creator) {
            let creatorContent = '';
            if (isReCoordination) {
              creatorContent = `Yêu cầu đăng ký xe ${requestCode} đã được điều phối lại tài xế.`;
            } else {
              creatorContent = `Yêu cầu đăng ký xe ${requestCode} đã được điều phối, tài xế ${driverNameText} phụ trách.`;
            }

            this.notificationService.createForRecipients({
              recipientIds: [creator],
              senderId: originalUserId,
              type: NotificationType.CAR_BOOKING_COORDINATED.value,
              content: creatorContent,
              recordId: item.id,
              link: `/vehicle-registration/${item.id}`,
              key: NotificationKey.VIEW_NEW_REQUEST,
              time: new Date(),
              status: 0,
            });
          }

          await this.resourceStatusSyncService.syncAll();
        } catch (bgError) {
          this.logger.error('Lỗi chạy tác vụ ngầm sau khi điều phối xe:', bgError);
        }
      })();

      this.logAsync(req, originalUserId, details, 'SUCCESS');

      return {
        status: 'success',
        message: 'Điều phối thành công'
      }
    } catch (e) {
      if (tx) {
        await this.sqlRepo.rollback(tx);
      }
      this.logAsync(req, originalUserId, details, 'ERROR');
      this.logger.error(e);
      if (
        e instanceof BadRequestException ||
        e instanceof ForbiddenException ||
        e instanceof NotFoundException
      ) {
        throw e;
      }
      throw new InternalServerErrorException('Lỗi điều phối xe');
    }
  }

  async rejectRequest(
    id: string,
    dto: CreateVehicleRegistrationDto,
    originalUserId: string,
    req?: any
  ) {
    const { noteDetail, workItem, actionCode } = dto;
    if (!noteDetail || !noteDetail.trim()) {
      throw new BadRequestException('Lý do từ chối yêu cầu là bắt buộc');
    }
    const details = `Từ chối yêu cầu đăng ký xe - Phòng hậu cần, đội xe, ID yêu cầu: ${id}, Lý do: ${dto.noteDetail}`;
    let tx: any = null;
    try {
      const item = await this.findEntityById(id);
      const flowConfig = item.bpmnVersion;

      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho yêu cầu này');
      }

      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig);
      const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);

      const wi = workItem;

      if (!wi) {
        throw new BadRequestException('WorkItem not found or already completed');
      }

      const node = indexes.nodes.get(wi.nodeId);

      if (!node) {
        throw new BadRequestException('Current BPMN node not found');
      }

      let outs = indexes.outgoingBySource.get(node.id) || [];

      for (const f of outs) {
        const target = f.targetRef;

        if (
          target &&
          (target.$type === 'bpmn:ExclusiveGateway' ||
            target.$type === 'bpmn:InclusiveGateway')
        ) {
          outs = indexes.outgoingBySource.get(target.id) || [];
          break;
        }
      }

      const flow = outs.find((f: any) => {
        const ext = getAllNodeExtensionProperties(f);
        return (
          (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
          (f.name && f.name.toUpperCase() === actionCode) ||
          f.id === actionCode
        );
      });

      if (!flow) {
        throw new BadRequestException(
          `No outgoing flow matches actionCode ${actionCode}`,
        );
      }

      const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
        flow,
        indexes,
      );

      if (!nextNode) {
        throw new BadRequestException('No next interactive node found');
      }
      if (item.vehicleState === VehicleState.TU_CHOI) {
        throw new BadRequestException('Yêu cầu đã bị từ chối trước đó');
      }
      item.vehicleState = VehicleState.TU_CHOI;
      item.rejectionReason = noteDetail;
      item.isEdited = false;
      await this.vehicleRegistrationRepo.save(item);


      tx = await this.sqlRepo.begin();
      /**
       * CREATE WORKITEM
       */
      await this.sqlRepo.removeAllWorkItems(item.id, tx);

      await this.sqlRepo.updateStageStatusAuditByOrigin(
        item.id,
        stageStatusVehicle.PHONG_DOI_HAU_CAN_NGUOI_DIEU_PHOI,
        stageStatusVehicle.TU_CHOI,
        originalUserId,
        tx,
      );

      // người đăng ký
      const creator = await this.sqlRepo.findCreatorId(item.id);

      await this.sqlRepo.addWorkItem(
        item.id,
        {
          id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          nodeId: nextNode.id,
          role: nextNode.role,
          assigneeUserId: creator || item.createdBy,
          nodeType: nextNode.nodeType,
        },
        tx,
        item.bpmnVersion,
      );

      const statusCodeNextNode = getAllNodeExtensionProperties(node)?.statusCode;

      const statusNameNextNode = getAllNodeExtensionProperties(nextNode)?.statusName;

      const detailContent = noteDetail
        ? `Lý do: ${noteDetail}`
        : 'Từ chối yêu cầu đăng ký xe';

      const baseAudit = {
        user_id: originalUserId,
        role: wi.role,
        action_code: actionCode,
        receiver_unit: null,
        group_: null,
        roleProcess: 'processor',
        created_by: originalUserId,
        origin_id: wi.id,
        deadline: null,
        created_at: new Date(),
        updated_at: new Date(),
        typeDocument: this.typeDocument,
      };

      await this.sqlRepo.addAudit(item.id, {
        ...baseAudit,
        receiver: originalUserId,
        display_name: 'Từ chối yêu cầu đăng ký xe',
        action: "Từ chối yêu cầu đăng ký xe",
        details: detailContent,
        stage_status: stageStatusVehicle.DA_XU_LY,
        curStatusCode: statusCodeNextNode,
        from_node_id: wi.nodeId,
        to_node_id: node.id,
      }, tx);

      await this.sqlRepo.commit(tx);

      const requestCode = item.requestCode;

      let content = noteDetail
        ? `Yêu cầu đăng ký xe ${requestCode} đã bị từ chối. Lý do: ${noteDetail}.`
        : `Yêu cầu đăng ký xe ${requestCode} đã bị từ chối.`;

      const priorityLabel = this.getPriorityLabel(item.priority);
      if (priorityLabel === 'Khẩn cấp') {
        content += ` (Mức độ: Khẩn cấp)`;
      }

      if (creator) {
        this.notificationService.createForRecipients({
          recipientIds: [creator],
          senderId: originalUserId,
          type: NotificationType.CAR_BOOKING_REJECTED_BY_FLEET.value,
          content: content,
          recordId: item.id,
          link: `/vehicle-registration/${item.id}`,
          key: NotificationKey.VIEW_NEW_REQUEST,
          time: new Date(),
          status: 0,
        });
      }

      await this.resourceStatusSyncService.syncAll();

      return {
        status: 'success',
        message: 'Từ chối yêu cầu thành công',
        item: await this.vehicleRegistrationRepo.findOne({ where: { id } }),
      }
    } catch (e) {
      if (tx) {
        await this.sqlRepo.rollback(tx);
      }
      this.logAsync(req, originalUserId, details, 'ERROR');
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi từ chối yêu cầu đăng ký xe');
    }
  }

  // Hủy yêu cầu đăng ký xe
  async cancelVehicleRegistration(
    id: string,
    dto: CreateVehicleRegistrationDto,
    originalUserId: string,
    req?: any
  ) {
    const { noteDetail, workItem, actionCode } = dto;
    const item = await this.findEntityById(id);
    const flowConfig = item.bpmnVersion;
    const details = `Hủy yêu cầu đăng ký xe - Người đăng ký xe, ID yêu cầu: ${id}, Lý do: ${dto.noteDetail}`;
    let tx: any = null;
    try {
      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho yêu cầu này');
      }

      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig);
      const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);

      const wi = workItem;

      if (!wi) {
        throw new BadRequestException('WorkItem not found or already completed');
      }

      const node = indexes.nodes.get(wi.nodeId);

      if (!node) {
        throw new BadRequestException('Current BPMN node not found');
      }

      let outs = indexes.outgoingBySource.get(node.id) || [];

      for (const f of outs) {
        const target = f.targetRef;

        if (
          target &&
          (target.$type === 'bpmn:ExclusiveGateway' ||
            target.$type === 'bpmn:InclusiveGateway')
        ) {
          outs = indexes.outgoingBySource.get(target.id) || [];
          break;
        }
      }

      const flow = outs.find((f: any) => {
        const ext = getAllNodeExtensionProperties(f);
        return (
          (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
          (f.name && f.name.toUpperCase() === actionCode) ||
          f.id === actionCode
        );
      });

      if (!flow) {
        throw new BadRequestException(
          `No outgoing flow matches actionCode ${actionCode}`,
        );
      }

      const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
        flow,
        indexes,
      );

      if (!nextNode) {
        throw new BadRequestException('No next interactive node found');
      }
      item.vehicleState = VehicleState.DA_HUY;
      item.rejectionReason = noteDetail;
      await this.vehicleRegistrationRepo.save(item);


      tx = await this.sqlRepo.begin();
      /**
       * CREATE WORKITEM
       */
      await this.sqlRepo.removeAllWorkItems(item.id, tx);

      await this.sqlRepo.addWorkItem(
        item.id,
        {
          id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          nodeId: nextNode.id,
          role: nextNode.role,
          assigneeUserId: originalUserId,
          nodeType: nextNode.nodeType,
        },
        tx,
        item.bpmnVersion,
      );

      const statusCodeNextNode = getAllNodeExtensionProperties(nextNode)?.statusCode;

      const statusNameNextNode = getAllNodeExtensionProperties(nextNode)?.statusName;

      const detailContent = noteDetail
        ? `Lý do: ${noteDetail}`
        : 'Hủy yêu cầu đăng ký xe';

      const baseAudit = {
        user_id: originalUserId,
        role: wi.role,
        action_code: actionCode,
        receiver_unit: null,
        group_: null,
        roleProcess: 'processor',
        created_by: originalUserId,
        origin_id: wi.id,
        deadline: null,
        created_at: new Date(),
        updated_at: new Date(),
        typeDocument: this.typeDocument,
      };

      await this.sqlRepo.addAudit(item.id, {
        ...baseAudit,
        receiver: originalUserId,
        display_name: 'Hủy yêu cầu đăng ký xe',
        action: statusNameNextNode,
        details: detailContent,
        stage_status: stageStatusVehicle.DA_XU_LY,
        curStatusCode: statusCodeNextNode,
        from_node_id: wi.nodeId,
        to_node_id: node.id,
      }, tx);

      await this.sqlRepo.commit(tx);
      const requestCode = item.requestCode;

      // tài xế
      const drivers: string[] = JSON.parse(item.driverIds || '[]');

      // phòng điều phối
      const coordinators = await this.sqlRepo.findCoordinatorInfor(item.id);

      const recipients = [...new Set([
        ...(drivers || []),
        ...(coordinators ? [coordinators] : []),
      ])];

      let content = noteDetail
        ? `Yêu cầu đăng ký xe ${requestCode} đã bị hủy. Lý do: ${noteDetail}.`
        : `Yêu cầu đăng ký xe ${requestCode} đã bị hủy.`;

      const priorityLabel = this.getPriorityLabel(item.priority);
      if (priorityLabel === 'Khẩn cấp') {
        content += ` (Mức độ: Khẩn cấp)`;
      }

      if (recipients.length) {
        this.notificationService.createForRecipients({
          recipientIds: recipients,
          senderId: originalUserId,
          type: NotificationType.CAR_BOOKING_REJECTED_BY_FLEET.value,
          content: content,
          recordId: item.id,
          link: `/vehicle-registration/${item.id}`,
          key: NotificationKey.VIEW_NEW_REQUEST,
          time: new Date(),
          status: 0,
        });
      }
      this.logAsync(req, originalUserId, details, 'SUCCESS');

      await this.resourceStatusSyncService.syncAll();

      return {
        status: 'success',
        message: 'Hủy yêu cầu thành công',
        item: await this.vehicleRegistrationRepo.findOne({ where: { id } }),
      }
    } catch (error) {
      if (tx) {
        await this.sqlRepo.rollback(tx);
      }
      this.logAsync(req, originalUserId, details, 'ERROR');
      this.logger.error(error);
      throw new InternalServerErrorException('Lỗi hủy yêu cầu đăng ký xe');
    }
  }
  // Xác nhận yêu cầu đăng ký xe (dành cho tài xế)
  async comfirmVehicleRegistration(
    id: string,
    dto: CreateVehicleRegistrationDto,
    originalUserId: string,
    req?: any
  ) {
    const details = `Tài xế xác nhận yêu cầu đặt xe, ID yêu cầu: ${id}`;
    const { workItem, actionCode } = dto;
    const item = await this.findEntityById(id);
    const flowConfig = item.bpmnVersion;

    if (!flowConfig) {
      throw new BadRequestException('Không tìm thấy luồng cho yêu cầu này');
    }

    const drivers: string[] = JSON.parse(item.driverIds || '[]');

    if (!drivers.includes(originalUserId)) {
      throw new BadRequestException('Bạn không thuộc danh sách tài xế của chuyến này');
    }

    const confirmedSet = new Set(JSON.parse(item.confirmedDriverIds || '[]'));

    if (confirmedSet.has(originalUserId)) {
      throw new BadRequestException('Bạn đã xác nhận chuyến xe này rồi');
    }

    // Kiểm tra tài xế đã tiếp nhận yêu cầu nào khác chưa hoàn thành hay không
    const activeRegistration = await this.vehicleRegistrationRepo.findOne({
      where: {
        id: Not(id),
        vehicleState: In([VehicleState.DA_PHAN_CONG, VehicleState.TRONG_TIEN_TRINH]),
        confirmedDriverIds: Like(`%"${originalUserId}"%`),
        status: 1,
      },
    });

    if (activeRegistration) {
      throw new BadRequestException(
        `Bạn đã tiếp nhận yêu cầu ${activeRegistration.requestCode} chưa hoàn tất. Vui lòng hoàn thành chuyến xe trước khi tiếp nhận yêu cầu mới.`
      );
    }

    const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig);
    const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);

    const wi = workItem;

    if (!wi) {
      throw new BadRequestException('WorkItem not found or already completed');
    }

    const node = indexes.nodes.get(wi.nodeId);

    if (!node) {
      throw new BadRequestException('Current BPMN node not found');
    }

    let outs = indexes.outgoingBySource.get(node.id) || [];

    for (const f of outs) {
      const target = f.targetRef;

      if (
        target &&
        (target.$type === 'bpmn:ExclusiveGateway' ||
          target.$type === 'bpmn:InclusiveGateway')
      ) {
        outs = indexes.outgoingBySource.get(target.id) || [];
        break;
      }
    }

    const flow = outs.find((f: any) => {
      const ext = getAllNodeExtensionProperties(f);
      return (
        (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
        (f.name && f.name.toUpperCase() === actionCode) ||
        f.id === actionCode
      );
    });

    if (!flow) {
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );
    }

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );

    if (!nextNode) {
      throw new BadRequestException('No next interactive node found');
    }

    const tx = await this.sqlRepo.begin();

    try {

      /**
       * UPDATE CONFIRM DRIVER
       */
      confirmedSet.add(originalUserId);
      const confirmedDrivers = [...confirmedSet];

      const isAllDriversConfirmed =
        drivers.length > 0 &&
        drivers.every((d) => confirmedSet.has(d));

      const request = tx.request();

      await request
        .input('id', id)
        .input('confirmedDriverIds', JSON.stringify(confirmedDrivers))
        .input('isAllDriversConfirmed', isAllDriversConfirmed)
        .query(`
          UPDATE vehicle_registrations
          SET confirmed_driver_ids = @confirmedDriverIds,
              is_all_drivers_confirmed = @isAllDriversConfirmed
          WHERE id = @id
        `);
      await this.sqlRepo.updateDriverConfirmTx(
        id,
        originalUserId,
        true,
        tx
      );
      // Set driver + car booking khi tài xế xác nhận
      const assignments = await this.vehicleRegistrationAssignmentRepo.find({
        where: { registrationId: id, driverId: originalUserId }
      });

      for (const assignment of assignments) {
        await this.sqlRepo.setDriverBookingTx(originalUserId, false, tx);
        await this.sqlRepo.setCarBookingTx(assignment.carId, false, tx);
      }
      /**
       * XÓA WORKITEM CỦA DRIVER VỪA CONFIRM
       */
      await this.sqlRepo.removeWorkItem(item.id, wi.id, tx);

      /**
       * AUDIT LUÔN TẠO
       */

      const statusCodeNextNode =
        getAllNodeExtensionProperties(nextNode)?.statusCode;

      const statusNameNextNode =
        getAllNodeExtensionProperties(nextNode)?.statusName;

      const baseAudit = {
        user_id: originalUserId,
        role: wi.role,
        action_code: actionCode,
        receiver_unit: null,
        group_: null,
        roleProcess: 'processor',
        created_by: 'Hệ thống',
        origin_id: wi.id,
        deadline: null,
        created_at: new Date(),
        updated_at: new Date(),
        typeDocument: this.typeDocument,
      };

      /**
       * CHỈ TẠO WORKITEM MỚI KHI TẤT CẢ DRIVER CONFIRM
       */
      const creator = await this.sqlRepo.findCreatorId(item.id, tx);
      if (isAllDriversConfirmed) {
        // 1️⃣ Xóa các workitem Nhắc nhở
        const xml = await this.sqlRepo.getBpmnFile(item.bpmnVersion);
        const { indexes } = await this.runtimeDbService.getModelFromXml(xml);
        const reminderNodeIds = Array.from(indexes.nodes.values())
          .filter((node: any) => getAllNodeExtensionProperties(node)?.isReminderNode === 'true')
          .map((node: any) => node.id);

        if (reminderNodeIds.length > 0) {
          for (const nodeId of reminderNodeIds) {
            await tx.request()
              .input('documentId', item.id)
              .input('nodeId', nodeId)
              .query(`DELETE FROM work_items WHERE document_id = @documentId AND node_id = @nodeId`);
          }
        }

        await this.sqlRepo.addWorkItem(
          item.id,
          {
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: nextNode.id,
            role: nextNode.role,
            assigneeUserId: creator,
            nodeType: nextNode.nodeType,
          },
          tx,
          item.bpmnVersion,
        );

        await this.sqlRepo.addAudit(
          item.id,
          {
            ...baseAudit,
            receiver: 'Hệ thống',
            display_name: 'Tài xế tiếp nhận phân công',
            action: 'Tài xế tiếp nhận phân công',
            details: 'Tài xế tiếp nhận phân công',
            stage_status: stageStatusVehicle.DA_XU_LY,
            curStatusCode: statusCodeNextNode,
            from_node_id: wi.nodeId,
            to_node_id: isAllDriversConfirmed ? nextNode.id : wi.nodeId,
          },
          tx,
        );


      }

      await this.sqlRepo.commit(tx);

      /**
       * NOTIFICATION
       */

      const coordinators = await this.sqlRepo.findCoordinatorInfor(item.id);

      const requestCode = item.requestCode;
      const driverName = await this.getDriverNameById(originalUserId) || 'Tài xế';

      const recipients = [
        ...new Set([
          ...(creator ? [creator] : []),
          ...(coordinators ? [coordinators] : []),
        ]),
      ];

      if (recipients.length) {
        let notificationContent = `Tài xế ${driverName} đã xác nhận chuyến xe ${requestCode}.`;
        const priorityLabel = this.getPriorityLabel(item.priority);
        if (priorityLabel === 'Khẩn cấp') {
          notificationContent += ` (Mức độ: Khẩn cấp)`;
        }
        this.notificationService.createForRecipients({
          recipientIds: recipients,
          senderId: originalUserId,
          type: NotificationType.CAR_BOOKING_ACCEPTED_BY_DRIVER.value,
          content: notificationContent,
          recordId: item.id,
          link: `/vehicle-registration/${item.id}`,
          key: NotificationKey.VIEW_NEW_REQUEST,
          time: new Date(),
          status: 0,
        });
      }
      this.logAsync(req, originalUserId, details, 'SUCCESS');

      await this.resourceStatusSyncService.syncAll();

      return {
        status: 'success',
        message: isAllDriversConfirmed ? 'Tất cả tài xế đã xác nhận. Yêu cầu được chuyển bước tiếp theo.' : 'Xác nhận thành công.',
        item: await this.vehicleRegistrationRepo.findOne({ where: { id } }),
      };

    } catch (error) {
      this.logAsync(req, originalUserId, details, 'ERROR');
      await this.sqlRepo.rollback(tx);
      throw error;

    }
  }

  // Hoàn thành yêu cầu đăng ký xe
  async completeVehicleRegistration(
    id: string,
    dto: CreateVehicleRegistrationDto,
    originalUserId: string,
    req?: any
  ) {
    const details = `Hoàn thành yêu cầu đăng ký xe - Người đăng ký xe, ID yêu cầu: ${id}, Lý do: ${dto.noteDetail}`;
    let tx: any = null;
    try {
      const { workItem, actionCode } = dto;
      const item = await this.findEntityById(id);
      const flowConfig = item.bpmnVersion;

      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho yêu cầu này');
      }

      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig);
      const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);

      const wi = workItem;

      if (!wi) {
        throw new BadRequestException('WorkItem not found or already completed');
      }

      const node = indexes.nodes.get(wi.nodeId);

      if (!node) {
        throw new BadRequestException('Current BPMN node not found');
      }

      let outs = indexes.outgoingBySource.get(node.id) || [];

      for (const f of outs) {
        const target = f.targetRef;

        if (
          target &&
          (target.$type === 'bpmn:ExclusiveGateway' ||
            target.$type === 'bpmn:InclusiveGateway')
        ) {
          outs = indexes.outgoingBySource.get(target.id) || [];
          break;
        }
      }

      const flow = outs.find((f: any) => {
        const ext = getAllNodeExtensionProperties(f);
        return (
          (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
          (f.name && f.name.toUpperCase() === actionCode) ||
          f.id === actionCode
        );
      });

      if (!flow) {
        throw new BadRequestException(
          `No outgoing flow matches actionCode ${actionCode}`,
        );
      }

      const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
        flow,
        indexes,
      );

      if (!nextNode) {
        throw new BadRequestException('No next interactive node found');
      }
      item.vehicleState = VehicleState.HOAN_THANH;
      await this.vehicleRegistrationRepo.save(item);


      tx = await this.sqlRepo.begin();
      /**
       * CREATE WORKITEM
       */
      await this.sqlRepo.removeAllWorkItems(item.id, tx);

      await this.sqlRepo.addWorkItem(
        item.id,
        {
          id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          nodeId: nextNode.id,
          role: nextNode.role,
          assigneeUserId: originalUserId,
          nodeType: nextNode.nodeType,
        },
        tx,
        item.bpmnVersion,
      );

      const statusCodeNextNode = getAllNodeExtensionProperties(nextNode)?.statusCode;

      const statusNameNextNode = getAllNodeExtensionProperties(nextNode)?.statusName;

      const detailContent = 'Hoàn thành yêu cầu đăng ký xe';

      const baseAudit = {
        user_id: originalUserId,
        role: wi.role,
        action_code: actionCode,
        receiver_unit: null,
        group_: null,
        roleProcess: 'processor',
        created_by: originalUserId,
        origin_id: wi.id,
        deadline: null,
        created_at: new Date(),
        updated_at: new Date(),
        typeDocument: this.typeDocument,
      };

      await this.sqlRepo.addAudit(item.id, {
        ...baseAudit,
        receiver: originalUserId,
        display_name: 'Hoàn thành yêu cầu đăng ký xe',
        action: statusNameNextNode,
        details: detailContent,
        stage_status: stageStatusVehicle.DA_XU_LY,
        curStatusCode: statusCodeNextNode,
        from_node_id: wi.nodeId,
        to_node_id: node.id,
      }, tx);

      // phòng điều phối
      const coordinators = await this.sqlRepo.findCoordinatorInfor(item.id, tx);

      /**
       * TRẢ XE + TÀI XẾ + TĂNG TỔNG SỐ CHUYẾN
       */
      const drivers2: string[] = JSON.parse(item.driverIds || '[]');
      const cars: string[] = JSON.parse(item.carIds || '[]');

      // driver
      for (const driverId of drivers2) {
        await this.sqlRepo.increaseDriverTotalTripsTx(driverId, tx); // +1 chuyến
        await this.sqlRepo.setDriverBookingTx(driverId, true, tx);      // mở lại booking
      }

      // car
      for (const carId of cars) {
        await this.sqlRepo.increaseCarTotalTripsTx(carId, tx); // +1 chuyến
        await this.sqlRepo.setCarBookingTx(carId, true, tx);      // mở lại booking
      }

      await this.sqlRepo.commit(tx);
      const requestCode = item.requestCode;

      // tài xế
      const drivers: string[] = JSON.parse(item.driverIds || '[]');

      // gộp người nhận
      const recipients = [...new Set([
        ...(drivers || []),
        ...(coordinators ? [coordinators] : []),
      ])];

      if (recipients.length) {
        let notificationContent = `Chuyến xe ${requestCode} đã hoàn thành.`;
        const priorityLabel = this.getPriorityLabel(item.priority);
        if (priorityLabel === 'Khẩn cấp') {
          notificationContent += ` (Mức độ: Khẩn cấp)`;
        }
        this.notificationService.createForRecipients({
          recipientIds: recipients,
          senderId: originalUserId,
          type: NotificationType.CAR_BOOKING_COMPLETED_BY_FLEET.value,
          content: notificationContent,
          recordId: item.id,
          link: `/vehicle-registration/${item.id}`,
          key: NotificationKey.VIEW_NEW_REQUEST,
          time: new Date(),
          status: 0,
        });
      }
      this.logAsync(req, originalUserId, details, 'SUCCESS');

      await this.resourceStatusSyncService.syncAll();

      return {
        status: 'success',
        message: 'Hoàn thành yêu cầu thành công',
        item: await this.vehicleRegistrationRepo.findOne({ where: { id } }),
      }
    } catch (error) {
      if (tx) {
        await this.sqlRepo.rollback(tx);
      }
      this.logAsync(req, originalUserId, details, 'ERROR');
      throw error;
    }
  }
  // Helper: lấy tên mức độ ưu tiên
  private getPriorityLabel(priorityCode: string): string {
    if (!priorityCode) return '';
    const priorityOption = this.priorityOptions.find(p => p.value === priorityCode);
    return priorityOption ? priorityOption.title : priorityCode;
  }

  // Lấy danh sách tài xế nhắc nhở 
  async getUnconfirmedDriversByRegistration(id: string) {

    const item = await this.vehicleRegistrationRepo.findOne({
      where: { id, status: 1 },
      select: [
        'id',
        'name',
        'requestCode',
        'requestType',
        'priority',
        'isImportantGuest',
        'departureTime',
        'returnTime',
        'departurePoint',
        'destination',
        'passengerCount',
        'coordinationInformation',
        'confirmedDriverIds'
      ]
    });

    if (!item) {
      throw new BadRequestException('Không tìm thấy đăng ký xe');
    }

    /**
     * parse json
     */
    let coordinationInformation: any[] = [];
    let confirmedDrivers: string[] = [];

    try {
      coordinationInformation = JSON.parse(item.coordinationInformation || '[]');
    } catch {
      coordinationInformation = [];
    }

    try {
      confirmedDrivers = JSON.parse(item.confirmedDriverIds || '[]');
    } catch {
      confirmedDrivers = [];
    }

    const confirmedSet = new Set(confirmedDrivers);

    /**
     * lấy id
     */
    const carIds = [...new Set(coordinationInformation.map(c => c.carId).filter(Boolean))];
    const driverIds = [...new Set(coordinationInformation.map(c => c.driverId).filter(Boolean))];

    /**
     * query giống getDetail
     */
    const [cars, drivers, users] = await Promise.all([

      carIds.length
        ? this.listCarRepo.find({
          where: { id: In(carIds) },
          select: [
            'id',
            'licensePlate',
            'carType',
            'brand',
            'seatCount',
            'manager',
            'statusCar'
          ]
        })
        : Promise.resolve([]),

      driverIds.length
        ? this.listDriverRepo.find({
          where: { id: In(driverIds) },
          select: [
            'id',
            'fullName',
            'phoneNumber',
            'email',
            'address'
          ]
        })
        : Promise.resolve([]),

      driverIds.length
        ? this.userrepo.find({
          where: { id: In(driverIds) },
          select: [
            'id',
            'name',
            'phoneNumberUser',
            'emailUser',
            'addressUser'
          ]
        })
        : Promise.resolve([])
    ]);

    /**
     * map giống getDetail
     */
    const carMap = new Map(cars.map(c => [c.id, c]));
    const driverMap = new Map(drivers.map(d => [d.id, d]));
    const userMap = new Map(users.map(u => [u.id, u]));

    /**
     * map coordinationInformation giống getDetail
     */
    const coordinationDetail = await Promise.all(coordinationInformation.map(async c => {

      const car = carMap.get(c.carId);
      const driver = driverMap.get(c.driverId);
      const userEntity = userMap.get(c.driverId);
      const userName = userEntity?.name || await this.getUserNameById(c.driverId);
      const managerId = car?.manager ?? null;

      const contact =
        driver?.phoneNumber ||
        driver?.email ||
        driver?.address ||
        userEntity?.phoneNumberUser ||
        userEntity?.emailUser ||
        userEntity?.addressUser ||
        '-';

      return {

        carId: c.carId,
        driverId: c.driverId,

        carType: car?.carType || '-',
        brand: car?.brand || '-',
        licensePlate: car?.licensePlate || '-',

        driverName: driver?.fullName || userName || '-',

        contact,

        manager: managerId
          ? {
            id: managerId,
            name: await this.getUserNameById(managerId)
          }
          : '-',

        isManagerDriver: managerId === c.driverId,

        confirmed: confirmedSet.has(c.driverId) ? "Đã tiếp nhận" : "Chưa tiếp nhận"
      };
    }));

    /**
     * lọc chưa xác nhận
     */
    const unconfirmedDrivers = coordinationDetail.filter(c => c.confirmed === "Chưa tiếp nhận");

    return {

      id: item.id,
      name: item.name,
      requestCode: item.requestCode,

      requestType:
        this.requestTypeOptions.find(x => x.code === item.requestType)?.name ||
        item.requestType,

      priority:
        this.priorityOptions.find(x => x.code === item.priority)?.name ||
        item.priority,

      importantGuest:
        this.importantGuestsOptions.find(x => x.code === item.isImportantGuest)?.name ||
        item.isImportantGuest,

      departureTime: item.departureTime,
      returnTime: item.returnTime,

      departurePoint: item.departurePoint,
      destination: item.destination,

      passengerCount: item.passengerCount,

      coordinationInformation: coordinationDetail,

      unconfirmedDrivers,

      driverIds: unconfirmedDrivers.map(d => d.driverId)
    };
  }
  async remindDrivers(id: string, senderId: string, note?: string, req?: any) {
    const details = `Nhắc nhở các tài xế trong yêu cầu đăng ký xe, ID yêu cầu: ${id}`;
    try {
      const data = await this.getUnconfirmedDriversByRegistration(id);
      const { driverIds } = data;

      if (!data.driverIds.length) {
        throw new BadRequestException('Tất cả tài xế đã xác nhận');
      }
      const driverNames = (await Promise.all(driverIds.map(async (id) => await this.getDriverNameById(id) || await this.getUserNameById(id)))).join(', ');

      const detailContent = `Nhắc nhở tài xế: ${driverNames} chưa tiếp nhận yêu cầu`;

      const baseAudit = {
        user_id: senderId,
        role: stageStatusVehicle.PHONG_DOI_HAU_CAN_NGUOI_DIEU_PHOI,
        action_code: 'NHAC_NHO',
        receiver_unit: null,
        group_: null,
        roleProcess: 'processor',
        created_by: senderId,
        origin_id: null,
        deadline: null,
        created_at: new Date(),
        updated_at: new Date(),
        typeDocument: this.typeDocument,
      };

      await this.sqlRepo.addAudit(id, {
        ...baseAudit,
        receiver: senderId,
        display_name: 'Nhắc nhở tài xế',
        action: `Nhắc nhở tài xế: ${driverNames} chưa tiếp nhận yêu cầu`,
        details: detailContent,
        stage_status: stageStatusVehicle.DA_XU_LY,
        curStatusCode: null,
        from_node_id: null,
        to_node_id: null,
      });
      this.notificationService.createForRecipients({
        recipientIds: data.driverIds,
        senderId,
        type: NotificationType.CAR_BOOKING_ACCEPTED_BY_DRIVER.value,
        content: `Chuyến xe ${data.requestCode || data.name || id} vẫn chưa được tiếp nhận, đề nghị xác nhận ngay.`,
        recordId: id,
        link: `/vehicle-registration/${id}`,
        key: NotificationKey.VIEW_NEW_REQUEST,
        time: new Date(),
        status: 0,
      });

      await this.vehicleRegistrationRepo.increment(
        { id },
        'driverNoticeCount',
        1
      );

      this.logAsync(req, senderId, details, 'SUCCESS');
      return {
        message: 'Đã gửi nhắc tài xế',
        drivers: data.unconfirmedDrivers
      };

    } catch (error) {
      this.logAsync(req, senderId, details, 'ERROR');
      throw error;
    }
  }

  async getWorkflowHistories(recordId: string) {
    const pool = await this.getPool();

    const result = await pool.request()
      .input('recordId', sql.NVarChar, recordId)
      .query(`
        SELECT 
          a.id,
          a.action,
          a.created_at,
          COALESCE(a.created_by, a.processed_by, a.receiver, a.acting_as, a.user_id) AS userId,
          u.name,
          o.name AS orgName,
          a.details
        FROM audit a
        LEFT JOIN users u 
          ON u.id = COALESCE(a.created_by, a.processed_by, a.receiver, a.acting_as, a.user_id)
        LEFT JOIN organization_units o 
          ON u.parent = o.id
        WHERE a.document_id = @recordId
        ORDER BY a.created_at DESC
      `);

    const rows = result.recordset;

    if (!rows.length) return [];

    return rows.map((r, index) => {
      const dateStr = this.formatDateTime(r.created_at);

      const opinion =
        r.name && dateStr !== '-'
          ? `${dateStr} | ${r.name}${r.orgName ? ' - ' + r.orgName : ''}`
          : dateStr;

      let parsedDetails: any = null;
      if (r.details) {
        try {
          parsedDetails = JSON.parse(r.details);
          if (typeof parsedDetails === 'string') {
            try {
              parsedDetails = JSON.parse(parsedDetails);
            } catch { }
          }
          if (parsedDetails && Array.isArray(parsedDetails.drivers)) {
            parsedDetails.drivers = parsedDetails.drivers.map((d: any) => {
              const phoneText = d.phoneNumber && d.phoneNumber !== '-' ? ` - ${d.phoneNumber}` : '';
              const text = `🚗 ${d.carPlate || '-'} - 👤 ${d.driverName || '-'}${phoneText}`;
              return {
                ...d,
                text
              };
            });
          }
        } catch {
          parsedDetails = r.details;
        }
      }

      return {
        order: index + 1,
        action: r.action || '-',
        processor: r.name || r.userId || '-',
        opinion,
        details: parsedDetails || '-'
      };
    });
  }
  private formatDateTimeHistory(date?: Date | null): string {
    if (!date) return '-';

    const d = new Date(date);

    const pad = (n: number) => n.toString().padStart(2, '0');

    return (
      `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    );
  }

  // Lịch sử của xe
  async getHistoryCar(
    carId: string,
    dto: CreateVehicleRegistrationDto,
    originalUserId: string,
    effectiveUserId: string,
    authority: boolean,
  ) {
    const { type, filter, page = 1, limit = 20, sort } = dto;
    const isExport = "true";
    if (authority && effectiveUserId) {
      originalUserId = effectiveUserId;
    }

    let queryType = type;
    if (!queryType || queryType === 'undefined' || queryType === 'null') {
      queryType = 'all';
    }

    const pool = await this.getPool();

    const criteria = buildCriteria(filter);

    const { sql: filterFeature, joins: filterJoins, from } =
      buildVehicleRegistrationCriteriaHelper(criteria, 'vehicle_registrations');

    const TYPES = ['all', 'pending'] as const;

    if (!TYPES.includes(queryType as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }

    const where: string[] = [];

    where.push(`${from}.status = 1`);
    where.push(`vra.car_id = @carId`);

    if (queryType === 'pending') {
      where.push(`${from}.vehicle_state IN ('${VehicleState.DA_PHAN_CONG}', '${VehicleState.TRONG_TIEN_TRINH}')`);
      where.push(`vra.is_confirmed = 1`);
    } else if (queryType === 'all') {
      // all: lấy các chuyến hoàn thành thôi
      where.push(`${from}.vehicle_state = '${VehicleState.HOAN_THANH}'`);
    }

    // type = all -> KHÔNG thêm filter trạng thái

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const joinClause = `
      INNER JOIN vehicle_registration_assignments vra
        ON vra.registration_id = ${from}.id
      ${filterJoins || ''}
    `;

    const whereClause = ' WHERE ' + where.join(' AND ');

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    const { aliases } =
      await this.configurationService.buildFilterFieldsVehicleRegistrations(
        from,
        [],
        undefined,
      );

    const selectFields = `
        ${from}.id,
        ${from}.departure_point,
        ${from}.destination,
        ${from}.departure_time,
        ${from}.return_time,
        ${from}.vehicle_state,
        ${from}.created_by,
        vra.driver_id,
        vra.is_confirmed
    `;

    const orderBy =
      ' ORDER BY ' +
      (parseSortVehicle(sort, aliases, from, {}) ||
        `${from}.departure_time DESC`);

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    const rowsSql = `
      SELECT ${selectFields}
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
      ${orderBy}
      OFFSET ${offsetNum} ROWS
      FETCH NEXT ${limitNum} ROWS ONLY
    `;

    const totalTripSql = `
      SELECT COUNT(DISTINCT vr.id) totalTrips
      FROM ${this.dbname}.vehicle_registrations vr
      INNER JOIN vehicle_registration_assignments vra
        ON vra.registration_id = vr.id
      WHERE vr.status = 1
      AND vra.car_id = @carId
      AND vr.vehicle_state = '${VehicleState.HOAN_THANH}'
    `;

    const totalTripMonthSql = `
      SELECT COUNT(DISTINCT vr.id) totalTripsMonth
      FROM ${this.dbname}.vehicle_registrations vr
      INNER JOIN vehicle_registration_assignments vra
        ON vra.registration_id = vr.id
      WHERE vr.status = 1
      AND vra.car_id = @carId
      AND vr.vehicle_state = '${VehicleState.HOAN_THANH}'
      AND MONTH(vr.departure_time) = MONTH(GETDATE())
      AND YEAR(vr.departure_time) = YEAR(GETDATE())
    `;

    // this.logger.debug('[VehicleHistoryCar] SQL:', rowsSql);

    let totalResult, rowsResult, totalTripRes, totalTripMonthRes;

    try {
      const request = pool.request().input('carId', carId);

      [totalResult, rowsResult, totalTripRes, totalTripMonthRes] =
        await Promise.all([
          request.query(totalSql),
          pool.request().input('carId', carId).query(rowsSql),
          pool.request().input('carId', carId).query(totalTripSql),
          pool.request().input('carId', carId).query(totalTripMonthSql),
        ]);
    } catch (e) {
      this.logger.error(e);
      throw new InternalServerErrorException('Lỗi truy vấn lịch sử xe');
    }

    const total = totalResult.recordset[0]?.total ?? 0;
    const totalTrips = totalTripRes.recordset[0]?.totalTrips ?? 0;
    const totalTripsMonth = totalTripMonthRes.recordset[0]?.totalTripsMonth ?? 0;

    const items = rowsResult.recordset;

    if (!items.length) {
      return {
        success: true,
        items: [],
        message: 'Không có dữ liệu',
        total: 0,
        totalTrips,
        totalTripsMonth,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      };
    }

    const lookupData = await this.preloadLookupData(items);
    const mappedItems = items.map((item) => {
      const driverName = lookupData.userNames.get(item.driver_id) || item.driver_id;

      return {
        ...this.mapToCleanData(item, aliases, isExport, { originalUserId }, lookupData),
        driverName,
      };
    });

    return {
      success: true,
      items: mappedItems,
      total,
      totalTrips,
      totalTripsMonth,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  // Lịch sử của tài xế
  async getHistoryDriver(
    driverId: string,
    dto: CreateVehicleRegistrationDto,
    originalUserId: string,
    effectiveUserId: string,
    authority: boolean,
  ) {
    const { type, filter, page = 1, limit = 20, sort } = dto;
    const isExport = 'true';

    if (authority && effectiveUserId) {
      originalUserId = effectiveUserId;
    }

    let queryType = type;
    if (!queryType || queryType === 'undefined' || queryType === 'null') {
      queryType = 'all';
    }

    const pool = await this.getPool();

    // map list_drivers.id -> driver_id (userId)
    const driverRes = await pool
      .request()
      .input('id', driverId)
      .query(`
        SELECT driver_id, license_issued_date
        FROM ${this.dbname}.list_drivers
        WHERE id = @id
      `);

    const driver = driverRes.recordset[0];

    if (!driver) {
      throw new NotFoundException('Không tìm thấy tài xế');
    }

    const driverUserId = driver.driver_id;

    const criteria = buildCriteria(filter);

    const { sql: filterFeature, joins: filterJoins, from } =
      buildVehicleRegistrationCriteriaHelper(criteria, 'vehicle_registrations');

    const TYPES = ['all', 'pending', 'experience'] as const;

    if (!TYPES.includes(queryType as any)) {
      throw new BadRequestException({
        message: 'Type không hợp lệ',
        allowedTypes: TYPES,
      });
    }

    const where: string[] = [];

    where.push(`${from}.status = 1`);
    where.push(`vra.driver_id = @driverUserId`);

    if (queryType === 'pending') {
      where.push(`${from}.vehicle_state IN ('${VehicleState.DA_PHAN_CONG}', '${VehicleState.TRONG_TIEN_TRINH}')`);
      where.push(`vra.is_confirmed = 1`);
    } else if (queryType === 'all') {
      // all: lấy các chuyến hoàn thành thôi
      where.push(`${from}.vehicle_state = '${VehicleState.HOAN_THANH}'`);
    }

    // ================= EXPERIENCE =================
    if (type === 'experience') {
      const experienceSql = `
        SELECT
          ld.license_issued_date,
          (
            SELECT STRING_AGG(car, ', ')
            FROM (
              SELECT DISTINCT
                CONCAT(lc.brand, ' - ', lc.seat_count, N' chỗ - ', lc.license_plate) AS car
              FROM ${this.dbname}.vehicle_registration_assignments vra2
              LEFT JOIN ${this.dbname}.list_cars lc
                ON lc.id = vra2.car_id
              WHERE vra2.driver_id = ld.driver_id
            ) t
          ) AS managedCars
        FROM ${this.dbname}.list_drivers ld
        WHERE ld.id = @driverId
      `;
      const carStatsSql = `
        SELECT
          CONCAT(lc.brand, ' - ', lc.seat_count, N' chỗ - ', lc.license_plate) car,
          COUNT(vr.id) totalTrips,
          MAX(vr.departure_time) lastTrip
        FROM ${this.dbname}.vehicle_registration_assignments vra
        JOIN ${this.dbname}.vehicle_registrations vr
          ON vr.id = vra.registration_id
        JOIN ${this.dbname}.list_cars lc
          ON lc.id = vra.car_id
        WHERE vr.status = 1
        AND vra.driver_id = @driverUserId
        GROUP BY lc.brand, lc.seat_count, lc.license_plate
      `;

      const [infoRes, carStatsRes] = await Promise.all([
        pool.request().input('driverId', driverId).query(experienceSql),
        pool.request().input('driverUserId', driverUserId).query(carStatsSql),
      ]);

      const info = infoRes.recordset[0];

      let experience = '< 1 năm'; // Default to "< 1 year" if no valid experience.

      if (info?.license_issued_date) {
        const issuedDate = dayjs(info.license_issued_date);
        const now = dayjs();

        const years = now.diff(issuedDate, 'year');

        // If the experience is less than 1 year, show "< 1 năm"
        if (years >= 1) {
          experience = `${years} năm`; // Show number of years if >= 1 year.
        }
      }

      const cars = carStatsRes.recordset
        .map((c) => ({
          car: c.car,
          totalTrips: c.totalTrips,
          lastTrip: c.lastTrip,
          summary: `${c.totalTrips} chuyến · Gần nhất: ${dayjs(c.lastTrip).format(
            'DD/MM/YYYY',
          )}`,
        }))
        .sort((a, b) => Number(b.totalTrips) - Number(a.totalTrips));

      return {
        success: true,
        managedCars: info?.managedCars || '',
        experience,
        cars,
      };
    }

    // ================= FILTER =================
    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const joinClause = `
      INNER JOIN vehicle_registration_assignments vra
        ON vra.registration_id = ${from}.id
      LEFT JOIN ${this.dbname}.list_cars lc
        ON lc.id = vra.car_id
      ${filterJoins || ''}
    `;

    const whereClause = ' WHERE ' + where.join(' AND ');

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    const { aliases } =
      await this.configurationService.buildFilterFieldsVehicleRegistrations(
        from,
        [],
        undefined,
      );

    const selectFields = `
      ${from}.id,
      ${from}.departure_point,
      ${from}.destination,
      ${from}.departure_time,
      ${from}.return_time,
      ${from}.vehicle_state,
      ${from}.created_by,
      vra.driver_id,
      vra.car_id,
      vra.is_confirmed,
      lc.license_plate
    `;

    const orderBy =
      ' ORDER BY ' +
      (parseSortVehicle(sort, aliases, from, {}) ||
        `${from}.departure_time DESC`);

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    const rowsSql = `
      SELECT ${selectFields}
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
      ${orderBy}
      OFFSET ${offsetNum} ROWS
      FETCH NEXT ${limitNum} ROWS ONLY
    `;

    const totalTripSql = `
      SELECT COUNT(DISTINCT vr.id) totalTrips
      FROM ${this.dbname}.vehicle_registrations vr
      INNER JOIN vehicle_registration_assignments vra
        ON vra.registration_id = vr.id
      WHERE vr.status = 1
      AND vra.driver_id = @driverUserId
      AND vr.vehicle_state = '${VehicleState.HOAN_THANH}'
    `;

    const totalTripMonthSql = `
      SELECT COUNT(DISTINCT vr.id) totalTripsMonth
      FROM ${this.dbname}.vehicle_registrations vr
      INNER JOIN vehicle_registration_assignments vra
        ON vra.registration_id = vr.id
      WHERE vr.status = 1
      AND vra.driver_id = @driverUserId
      AND vr.vehicle_state = '${VehicleState.HOAN_THANH}'
      AND MONTH(vr.departure_time) = MONTH(GETDATE())
      AND YEAR(vr.departure_time) = YEAR(GETDATE())
    `;

    // this.logger.debug('[VehicleHistoryCar] SQL:', rowsSql);

    const [totalResult, rowsResult, totalTripRes, totalTripMonthRes] =
      await Promise.all([
        pool.request().input('driverUserId', driverUserId).query(totalSql),
        pool.request().input('driverUserId', driverUserId).query(rowsSql),
        pool.request().input('driverUserId', driverUserId).query(totalTripSql),
        pool.request().input('driverUserId', driverUserId).query(totalTripMonthSql),
      ]);

    const total = totalResult.recordset[0]?.total ?? 0;
    const totalTrips = totalTripRes.recordset[0]?.totalTrips ?? 0;
    const totalTripsMonth =
      totalTripMonthRes.recordset[0]?.totalTripsMonth ?? 0;

    const items = rowsResult.recordset;

    if (!items.length) {
      return {
        success: true,
        items: [],
        total: 0,
        totalTrips,
        totalTripsMonth,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      };
    }

    const lookupData = await this.preloadLookupData(items);
    const mappedItems = items.map((item) => {
      const driverName = lookupData.driverNames.get(item.driver_id) || lookupData.userNames.get(item.driver_id) || item.driver_id;

      return {
        ...this.mapToCleanData(item, aliases, isExport, { originalUserId }, lookupData),
        driverName,
        licensePlate: item.license_plate,
      };
    });

    return {
      success: true,
      items: mappedItems,
      total,
      totalTrips,
      totalTripsMonth,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  // Statistics on vehicle registration requests
  async statisticsVehicleRegistrationRequests(
    dto: CreateVehicleRegistrationDto,
    originalUserId: string,
    effectiveUserId: string,
    authority: boolean,
    req: any
  ) {
    const { page = 1, limit = 20, filter, sort, processFn, isExport } = dto;
    const details = `Truy cập báo cáo thống kê yêu cầu đăng ký xe, page: ${page}, limit: ${limit}`;

    if (authority && effectiveUserId) {
      originalUserId = effectiveUserId;
    }

    const pool = await this.getPool();

    const [userRoleRes, featureManagement, userRes] = await Promise.all([
      this.userService.getUserRole(originalUserId),
      this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      }),
      this.userrepo.findOne({
        where: { id: originalUserId },
        relations: ['parent'],
        select: ['id'],
      }),
    ]);

    const { roles } = userRoleRes;
    const receiverUnit = userRes?.parent?.id ?? '';

    const userContext = { originalUserId, roles, receiverUnit };

    const criteria = buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } =
      buildVehicleRegistrationCriteriaHelper(
        [...featureCriteria, ...criteria],
        'vehicle_registrations',
        featureManagement,
      );

    const where: string[] = [];

    where.push(`${from}.status = 1`);

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const joinClause = filterJoins || '';

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

    const aliasFields = ['unitGuest'];

    aliasFields.forEach((f) => {
      const snake = f.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allFilterFields.includes(f) || allFilterFields.includes(snake)) {
        aliases[f] = f;
      }
    });

    const selectFields = dbKeys.join(', ');

    const orderBy =
      ' ORDER BY ' +
      (parseSortVehicle(sort, aliases, from, {}) ||
        `${from}.created_at DESC`);

    const totalSql = `
      SELECT COUNT(*) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    const rowsSql = `
      SELECT ${selectFields}
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
      ${orderBy}
      OFFSET ${offsetNum} ROWS
      FETCH NEXT ${limitNum} ROWS ONLY
    `;


    let totalResult, rowsResult;

    try {
      const totalRequest = pool.request();
      const rowsRequest = pool.request();

      [totalResult, rowsResult] = await Promise.all([
        totalRequest.query(totalSql),
        rowsRequest.query(rowsSql),
      ]);

      const total = totalResult.recordset[0]?.total ?? 0;
      const items = rowsResult.recordset;

      if (!items.length) {
        return {
          success: true,
          items: [],
          message: 'Không có dữ liệu',
          total: 0,
          page: pageNum,
          limit: limitNum,
          totalPages: 0,
        };
      }

      const lookupData = await this.preloadLookupData(items);
      const mappedItems = items.map((item) =>
        this.mapToCleanData(item, aliases, isExport, userContext, lookupData),
      );
      this.logAsync(req, originalUserId, details, 'SUCCESS');

      return {
        success: true,
        items: mappedItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (e) {
      this.logger.error(e);
      this.logAsync(req, originalUserId, details, 'ERROR');
      throw new InternalServerErrorException(
        'Lỗi truy vấn dữ liệu thống kê đăng ký xe',
      );
    }
  }

  // Statistics on vehicle usage by car
  async vehicleUsageStatisticsReport(
    dto: CreateVehicleRegistrationDto,
    originalUserId: string,
    effectiveUserId: string,
    authority: boolean,
    req: any,
  ) {
    const { page = 1, limit = 20, filter, sort, processFn, isExport } = dto;
    const details = `Truy cập Báo cáo thống kê sử dụng xe theo phương tiện, page: ${page}, limit: ${limit}`;
    if (authority && effectiveUserId) {
      originalUserId = effectiveUserId;
    }

    const pool = await this.getPool();

    const [userRoleRes, featureManagement, userRes] = await Promise.all([
      this.userService.getUserRole(originalUserId),
      this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      }),
      this.userrepo.findOne({
        where: { id: originalUserId },
        relations: ['parent'],
        select: ['id'],
      }),
    ]);

    const { roles } = userRoleRes;
    const receiverUnit = userRes?.parent?.id ?? '';

    const userContext = { originalUserId, roles, receiverUnit };

    const criteria = buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } =
      buildVehicleRegistrationCriteriaHelper(
        [...featureCriteria, ...criteria],
        'vehicle_registrations',
        featureManagement,
      );

    /** ---------------- WHERE ---------------- */
    const where: string[] = [];
    where.push(`${from}.status = 1`);

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    /** filter theo xe */

    if (filter?.licensePlate) {
      where.push(`c.id = @licensePlate`);
    }

    if (filter?.manager) {
      where.push(`c.manager = @manager`);
    }
    const whereClause = ' WHERE ' + where.join(' AND ');

    /** ---------------- JOIN ---------------- */

    const joinClause = `
      LEFT JOIN ${this.dbname}.vehicle_registration_assignments vra
        ON vra.registration_id = ${from}.id

      LEFT JOIN ${this.dbname}.list_cars c
        ON c.id = vra.car_id

      ${filterJoins || ''}
    `;

    /** ---------------- PAGINATION ---------------- */

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    /** ---------------- FILTER FIELDS ---------------- */

    const { aliases } =
      await this.configurationService.buildFilterFieldsVehicleRegistrations(
        from,
        [],
        processFn,
      );

    aliases['licensePlate'] = 'licensePlate';
    aliases['brand'] = 'brand';
    aliases['statusCar'] = 'statusCar';
    aliases['driverIds'] = 'driverIds';
    aliases['totalTrips'] = 'totalTrips';
    aliases['totalHours'] = 'totalHours';
    aliases['manager'] = 'manager';

    /** ---------------- SELECT ---------------- */
    const totalHoursExpr = `
      SUM(
        CASE
          WHEN ${from}.return_time IS NOT NULL
          THEN DATEDIFF(MINUTE, ${from}.departure_time, ${from}.return_time)
          ELSE 0
        END
      ) / 60.0
    `;
    const selectFields = `
      c.id AS car_id,
      c.license_plate,
      c.brand,
      c.status_car,
      c.manager,
      vra.driver_id,

      COUNT(DISTINCT ${from}.id) AS total_trips,

      ROUND(${totalHoursExpr}, 2) AS total_hours
    `;

    /** ---------------- GROUP BY ---------------- */

    const groupBy = `
      GROUP BY
        c.id,
        c.license_plate,
        c.brand,
        c.status_car,
        c.manager,
        vra.driver_id
    `;

    /** ---------------- ORDER ---------------- */

    const orderBy =
      ' ORDER BY ' +
      parseSortVehiclev2(
        sort,
        aliases,
        'c',
        {
          carId: 'c.id',

          licensePlate: 'c.license_plate',

          brand: 'c.brand',

          statusCar: 'c.status_car',

          manager: 'c.manager',

          driverIds: 'vra.driver_id',

          totalTrips: `COUNT(DISTINCT ${from}.id)`,

          totalHours: `
            SUM(
              CASE
                WHEN ${from}.return_time IS NOT NULL
                THEN DATEDIFF(MINUTE, ${from}.departure_time, ${from}.return_time)
                ELSE 0
              END
            ) / 60.0
          `,
        },
        'c.license_plate DESC',
      );
    /** ---------------- BASE SQL ---------------- */

    const baseSql = `
      SELECT ${selectFields}
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
      ${groupBy}
    `;

    /** ---------------- TOTAL ---------------- */

    const totalSql = `
      SELECT COUNT(*) AS total
      FROM (
        ${baseSql}
      ) t
    `;

    /** ---------------- ROWS ---------------- */

    const rowsSql = `
      ${baseSql}
      ${orderBy}
      OFFSET ${offsetNum} ROWS
      FETCH NEXT ${limitNum} ROWS ONLY
    `;

    // this.logger.debug('[VehicleUsageStatistics] ROWS SQL:', rowsSql);

    let totalResult, rowsResult;

    try {
      const totalRequest = pool.request();
      const rowsRequest = pool.request();

      if (filter?.licensePlate) {
        totalRequest.input('licensePlate', filter.licensePlate);
        rowsRequest.input('licensePlate', filter.licensePlate);
      }

      if (filter?.manager) {
        totalRequest.input('manager', filter.manager);
        rowsRequest.input('manager', filter.manager);
      }

      [totalResult, rowsResult] = await Promise.all([
        totalRequest.query(totalSql),
        rowsRequest.query(rowsSql),
      ]);

      const total = totalResult.recordset[0]?.total ?? 0;
      const items = rowsResult.recordset;

      if (!items.length) {
        return {
          success: true,
          items: [],
          message: 'Không có dữ liệu',
          total: 0,
          page: pageNum,
          limit: limitNum,
          totalPages: 0,
        };
      }

      const lookupData = await this.preloadLookupData(items);
      const mappedItems = items.map((item) =>
        this.mapToCleanData(item, aliases, isExport, userContext, lookupData),
      );
      this.logAsync(req, originalUserId, details, 'SUCCESS');

      return {
        success: true,
        items: mappedItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (e) {
      this.logAsync(req, originalUserId, details, 'ERROR');
      this.logger.error(e);
      throw new InternalServerErrorException(
        'Lỗi truy vấn dữ liệu thống kê sử dụng xe',
      );
    }
  }
  // Statistics vehicle registration by department
  async vehicleRegistrationStatisticsByDepartment(
    dto: CreateVehicleRegistrationDto,
    originalUserId: string,
    effectiveUserId: string,
    authority: boolean,
    req: any,
  ) {
    const {
      page = 1,
      limit = 20,
      filter,
      sort,
      processFn,
      isExport,
    } = dto;
    const details = `Truy cập báo cáo thống kê đăng ký xe theo phòng ban, page: ${page}, limit: ${limit}`;

    if (authority && effectiveUserId) {
      originalUserId = effectiveUserId;
    }

    const pool = await this.getPool();

    const [userRoleRes, featureManagement, userRes] = await Promise.all([
      this.userService.getUserRole(originalUserId),
      this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      }),
      this.userrepo.findOne({
        where: { id: originalUserId },
        relations: ['parent'],
        select: ['id'],
      }),
    ]);

    const { roles } = userRoleRes;
    const receiverUnit = userRes?.parent?.id ?? '';

    const userContext = { originalUserId, roles, receiverUnit };

    /** ---------------- FILTER ---------------- */

    const criteria = buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } =
      buildVehicleRegistrationCriteriaHelper(
        [...featureCriteria, ...criteria],
        'vehicle_registrations',
        featureManagement,
      );

    /** ---------------- WHERE ---------------- */

    const where: string[] = [];

    where.push(`${from}.status = 1`);

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = ' WHERE ' + where.join(' AND ');

    /** ---------------- JOIN ---------------- */

    const joinClause = `
      ${filterJoins || ''}
    `;

    /** ---------------- PAGINATION ---------------- */

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    /** ---------------- ALIAS ---------------- */

    const { aliases } =
      await this.configurationService.buildFilterFieldsVehicleRegistrations(
        from,
        [],
        processFn,
      );

    aliases['department'] = 'department';
    aliases['totalRequests'] = 'totalRequests';
    aliases['approved'] = 'approved';
    aliases['rejected'] = 'rejected';
    aliases['cancelled'] = 'cancelled';
    aliases['approvalRate'] = 'approvalRate';

    /** ---------------- SELECT ---------------- */

    const selectFields = `
      ${from}.department AS department,

      COUNT(${from}.id) AS total_requests,

      SUM(
        CASE
          WHEN ${from}.vehicle_state IN ('TRONG_TIEN_TRINH','DA_PHAN_CONG','HOAN_THANH')
          THEN 1 ELSE 0
        END
      ) AS approved,

      SUM(
        CASE
          WHEN ${from}.vehicle_state = 'TU_CHOI'
          THEN 1 ELSE 0
        END
      ) AS rejected,

      SUM(
        CASE
          WHEN ${from}.vehicle_state = 'DA_HUY'
          THEN 1 ELSE 0
        END
      ) AS cancelled,

      CASE
        WHEN COUNT(${from}.id) = 0 THEN 0
        ELSE
          CAST(
            SUM(
              CASE
                WHEN ${from}.vehicle_state IN ('TRONG_TIEN_TRINH','DA_PHAN_CONG','HOAN_THANH')
                THEN 1 ELSE 0
              END
            ) * 100.0 / COUNT(${from}.id)
          AS DECIMAL(5,2))
      END AS approval_rate
    `;

    /** ---------------- GROUP BY ---------------- */

    const groupBy = `
      GROUP BY ${from}.department
    `;

    /** ---------------- ORDER ---------------- */

    const orderBy =
      ' ORDER BY ' +
      (parseSortVehiclev2(
        sort,
        aliases,
        from,
        {
          department: `${from}.department`,

          totalRequests: `COUNT(${from}.id)`,

          approved: `
            SUM(
              CASE
                WHEN ${from}.vehicle_state IN ('TRONG_TIEN_TRINH','DA_PHAN_CONG','HOAN_THANH')
                THEN 1 ELSE 0
              END
            )
          `,

          rejected: `
            SUM(
              CASE
                WHEN ${from}.vehicle_state = 'TU_CHOI'
                THEN 1 ELSE 0
              END
            )
          `,

          cancelled: `
            SUM(
              CASE
                WHEN ${from}.vehicle_state = 'DA_HUY'
                THEN 1 ELSE 0
              END
            )
          `,

          approvalRate: `
            CASE
              WHEN COUNT(${from}.id) = 0 THEN 0
              ELSE
                SUM(
                  CASE
                    WHEN ${from}.vehicle_state IN ('TRONG_TIEN_TRINH','DA_PHAN_CONG','HOAN_THANH')
                    THEN 1 ELSE 0
                  END
                ) * 100.0 / COUNT(${from}.id)
            END
          `,
        },
        `${from}.department ASC`,
      ) || `${from}.department ASC`);
    /** ---------------- SQL ---------------- */

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.department) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    const rowsSql = `
      SELECT ${selectFields}
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
      ${groupBy}
      ${orderBy}
      OFFSET ${offsetNum} ROWS
      FETCH NEXT ${limitNum} ROWS ONLY
    `;

    // this.logger.debug(
    //   '[VehicleRegistrationStatisticsByDepartment] ROWS SQL:',
    //   rowsSql,
    // );

    let totalResult, rowsResult;

    try {
      const totalRequest = pool.request();
      const rowsRequest = pool.request();

      [totalResult, rowsResult] = await Promise.all([
        totalRequest.query(totalSql),
        rowsRequest.query(rowsSql),
      ]);

      const total = totalResult.recordset[0]?.total ?? 0;
      const items = rowsResult.recordset;

      if (!items.length) {
        return {
          success: true,
          items: [],
          message: 'Không có dữ liệu',
          total: 0,
          page: pageNum,
          limit: limitNum,
          totalPages: 0,
        };
      }

      const lookupData = await this.preloadLookupData(items);
      const mappedItems = items.map((item) =>
        this.mapToCleanData(item, aliases, isExport, userContext, lookupData),
      );
      this.logAsync(req, originalUserId, details, 'SUCCESS');

      return {
        success: true,
        items: mappedItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (e) {
      this.logAsync(req, originalUserId, details, 'ERROR');
      this.logger.error(e);
      throw new InternalServerErrorException(
        'Lỗi truy vấn thống kê đăng ký xe theo phòng ban',
      );
    }
  }

  // Report: Most dispatched vehicles
  async vehicleMostDispatchedReport(
    dto: CreateVehicleRegistrationDto,
    originalUserId: string,
    effectiveUserId: string,
    authority: boolean,
    req: any,
  ) {
    const { page = 1, limit = 20, filter, sort, processFn, isExport } = dto;
    const details = `Truy cập báo cáo xe được điều phối nhiều nhất page: ${page}`;

    if (authority && effectiveUserId) {
      originalUserId = effectiveUserId;
    }

    const pool = await this.getPool();

    const [userRoleRes, featureManagement, userRes] = await Promise.all([
      this.userService.getUserRole(originalUserId),
      this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      }),
      this.userrepo.findOne({
        where: { id: originalUserId },
        relations: ['parent'],
        select: ['id'],
      }),
    ]);

    const { roles } = userRoleRes;
    const receiverUnit = userRes?.parent?.id ?? '';
    const userContext = { originalUserId, roles, receiverUnit };

    /** ---------------- FILTER ---------------- */

    const criteria = buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } =
      buildVehicleRegistrationCriteriaHelper(
        [...featureCriteria, ...criteria],
        'vehicle_registrations',
        featureManagement,
      );

    /** ---------------- WHERE ---------------- */

    const where: string[] = [];

    where.push(`${from}.status = 1`);
    where.push(
      `${from}.vehicle_state IN ('DA_PHAN_CONG','TRONG_TIEN_TRINH','HOAN_THANH')`,
    );

    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = ' WHERE ' + where.join(' AND ');

    /** ---------------- JOIN ---------------- */

    const joinClause = `
      LEFT JOIN ${this.dbname}.vehicle_registration_assignments vra
        ON vra.registration_id = ${from}.id

      LEFT JOIN ${this.dbname}.list_cars c
        ON c.id = vra.car_id

      ${filterJoins || ''}
    `;

    /** ---------------- PAGINATION ---------------- */

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    /** ---------------- ALIAS ---------------- */

    const { aliases } =
      await this.configurationService.buildFilterFieldsVehicleRegistrations(
        from,
        [],
        processFn,
      );

    aliases['license_plate'] = 'licensePlate';
    aliases['brand'] = 'brand';
    aliases['driver_id'] = 'driverId';
    aliases['total_trips'] = 'totalTrips';
    aliases['total_hours'] = 'totalHours';
    aliases['usage_rate'] = 'usageRate';

    /** ---------------- SELECT ---------------- */

    const selectFields = `
      c.license_plate,
      c.brand,
      vra.driver_id,

      COUNT(DISTINCT ${from}.id) AS total_trips,

      CAST(
        ROUND(
          CAST(SUM(${from}.trip_duration_minutes) AS FLOAT) / 60.0
        , 2)
      AS DECIMAL(10,2)) AS total_hours,

      CAST(
        ROUND(
          CASE
            WHEN COUNT(DISTINCT ${from}.id) = 0 THEN 0
            ELSE
              (CAST(SUM(${from}.trip_duration_minutes) AS FLOAT) / 60.0)
              / (COUNT(DISTINCT ${from}.id) * 8.0) * 100.0
          END
        , 2)
      AS DECIMAL(10,2)) AS usage_rate
    `;

    /** ---------------- GROUP BY ---------------- */

    const groupBy = `
      GROUP BY
        c.license_plate,
        c.brand,
        vra.driver_id
    `;

    /** ---------------- ORDER ---------------- */

    const orderBy =
      ' ORDER BY ' +
      parseSortVehiclev2(
        sort,
        aliases,
        'c',
        {
          total_trips: `COUNT(DISTINCT ${from}.id)`,

          total_hours: `CAST(SUM(${from}.trip_duration_minutes) AS FLOAT) / 60.0`,

          usage_rate: `
            (CAST(SUM(${from}.trip_duration_minutes) AS FLOAT) / 60.0)
            / (COUNT(DISTINCT ${from}.id) * 8.0) * 100.0
          `,

          license_plate: 'c.license_plate',
          brand: 'c.brand',
          driver_id: 'vra.driver_id',
        },
        `total_trips DESC`,
      );

    /** ---------------- BASE SQL ---------------- */

    const baseSql = `
      SELECT ${selectFields}
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
      ${groupBy}
    `;

    /** ---------------- TOTAL ---------------- */

    const totalSql = `
      SELECT COUNT(*) AS total
      FROM (
        SELECT 
          c.license_plate,
          vra.driver_id
        FROM ${this.dbname}.${from}
        ${joinClause}
        ${whereClause}
        GROUP BY
          c.license_plate,
          vra.driver_id
      ) t
    `;

    /** ---------------- ROWS ---------------- */

    const rowsSql = `
      ${baseSql}
      ${orderBy}
      OFFSET ${offsetNum} ROWS
      FETCH NEXT ${limitNum} ROWS ONLY
    `;

    // this.logger.debug('[VehicleMostDispatchedReport] ROWS SQL:', rowsSql);

    let totalResult, rowsResult;

    try {
      const totalRequest = pool.request();
      const rowsRequest = pool.request();

      [totalResult, rowsResult] = await Promise.all([
        totalRequest.query(totalSql),
        rowsRequest.query(rowsSql),
      ]);

      const total = totalResult.recordset[0]?.total ?? 0;
      const items = rowsResult.recordset;

      if (!items.length) {
        return {
          success: true,
          items: [],
          total: 0,
          page: pageNum,
          limit: limitNum,
          totalPages: 0,
        };
      }

      const lookupData = await this.preloadLookupData(items);
      const mappedItems = items.map((item) =>
        this.mapToCleanData(item, aliases, isExport, userContext, lookupData),
      );
      this.logAsync(req, originalUserId, details, 'SUCCESS');

      return {
        success: true,
        items: mappedItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (e) {
      this.logAsync(req, originalUserId, details, 'ERROR');
      this.logger.error(e);
      throw new InternalServerErrorException(
        'Lỗi truy vấn báo cáo xe được điều phối nhiều nhất',
      );
    }

  }

  // Report: Vehicle borrowing history
  async vehicleBorrowReturnHistoryReport(
    dto: CreateVehicleRegistrationDto,
    originalUserId: string,
    effectiveUserId: string,
    authority: boolean,
    req: any,
  ) {
    const { page = 1, limit = 20, filter, sort, processFn, isExport } = dto;

    const details = `Truy cập báo cáo lịch sử mượn trả xe page: ${page}`;

    if (authority && effectiveUserId) {
      originalUserId = effectiveUserId;
    }

    const pool = await this.getPool();

    const [userRoleRes, featureManagement, userRes] = await Promise.all([
      this.userService.getUserRole(originalUserId),
      this.featureManagementRepo.findOne({
        where: {
          code: processFn,
          status: 1,
          statusFeature: StatusFeature.ACTIVE,
        },
      }),
      this.userrepo.findOne({
        where: { id: originalUserId },
        relations: ['parent'],
        select: ['id'],
      }),
    ]);

    const { roles } = userRoleRes;
    const receiverUnit = userRes?.parent?.id ?? '';

    const userContext = { originalUserId, roles, receiverUnit };

    /** ---------------- FILTER ---------------- */

    const criteria = buildCriteria(filter);
    const featureCriteria = featureManagement?.criteria ?? [];

    const { sql: filterFeature, joins: filterJoins, from } =
      buildVehicleRegistrationCriteriaHelper(
        [...featureCriteria, ...criteria],
        'vehicle_registrations',
        featureManagement,
      );

    /** ---------------- WHERE ---------------- */

    const where: string[] = [];

    where.push(`${from}.status = 1`);
    where.push(`vra.car_id IS NOT NULL`);
    if (filter?.licensePlate) {
      where.push(`c.id LIKE N'%${filter.licensePlate}%'`);
    }
    if (filterFeature) {
      where.push(`(${filterFeature})`);
    }

    const whereClause = ' WHERE ' + where.join(' AND ');

    /** ---------------- JOIN ---------------- */

    const joinClause = `
      LEFT JOIN ${this.dbname}.vehicle_registration_assignments vra
        ON vra.registration_id = ${from}.id

      LEFT JOIN ${this.dbname}.list_cars c
        ON c.id = vra.car_id

      LEFT JOIN ${this.dbname}.list_drivers d
        ON d.id = vra.driver_id

      ${filterJoins || ''}
    `;

    /** ---------------- PAGINATION ---------------- */

    const limitNum = Math.min(Number(limit) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const offsetNum = (pageNum - 1) * limitNum;

    /** ---------------- ALIAS ---------------- */

    const { aliases } =
      await this.configurationService.buildFilterFieldsVehicleRegistrations(
        from,
        [],
        processFn,
      );

    aliases['request_code'] = 'requestCode';
    aliases['license_plate'] = 'licensePlate';
    aliases['driver'] = 'driver';
    aliases['departure_time'] = 'departureTime';
    aliases['return_time'] = 'returnTime';
    aliases['status_borrow'] = 'statusBorrow';

    /** ---------------- SELECT ---------------- */

    const selectFields = `
      ${from}.request_code,
      c.license_plate,
      c.manager as driver,
      ${from}.created_by,
      ${from}.departure_time,
      ${from}.return_time,
      ${from}.vehicle_state,
      CASE
        WHEN ${from}.return_time IS NOT NULL
        THEN N'DA_TRA'
        ELSE N'DANG_SU_DUNG'
      END AS status_borrow
    `;

    /** ---------------- ORDER ---------------- */

    const orderBy =
      ' ORDER BY ' +
      parseSortVehiclev2(
        sort,
        aliases,
        from,
        {
          driver: `d.full_name`,
          license_plate: `c.license_plate`,
          borrow_time: `${from}.departure_time`,
          return_time: `${from}.return_time`,
          request_code: `${from}.name`,
        },
        `${from}.departure_time DESC`,
      );

    /** ---------------- SQL ---------------- */

    const totalSql = `
      SELECT COUNT(DISTINCT ${from}.id) AS total
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
    `;

    const rowsSql = `
      SELECT ${selectFields}
      FROM ${this.dbname}.${from}
      ${joinClause}
      ${whereClause}
      ${orderBy}
      OFFSET ${offsetNum} ROWS
      FETCH NEXT ${limitNum} ROWS ONLY
    `;

    // this.logger.debug('[VehicleBorrowReturnHistory] ROWS SQL:', rowsSql);

    let totalResult, rowsResult;

    try {
      const totalRequest = pool.request();
      const rowsRequest = pool.request();

      [totalResult, rowsResult] = await Promise.all([
        totalRequest.query(totalSql),
        rowsRequest.query(rowsSql),
      ]);

      const total = totalResult.recordset[0]?.total ?? 0;
      const items = rowsResult.recordset;

      if (!items.length) {
        return {
          success: true,
          items: [],
          total: 0,
          page: pageNum,
          limit: limitNum,
          totalPages: 0,
        };
      }

      const lookupData = await this.preloadLookupData(items);
      const mappedItems = items.map((item, index) => {
        const driverName = lookupData.driverNames.get(item.driver) || lookupData.userNames.get(item.driver) || item.driver;
        return {
          stt: offsetNum + index + 1,
          ...this.mapToCleanData(item, aliases, isExport, userContext, lookupData),
          statusBorrow: isExport === 'true' ? mapARStateExport(item.status_borrow) : mapARState(item.status_borrow),
          driver: driverName,
        };
      });
      this.logAsync(req, originalUserId, details, 'SUCCESS');

      return {
        success: true,
        items: mappedItems,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (e) {
      this.logAsync(req, originalUserId, details, 'ERROR');
      this.logger.error(e);
      throw new InternalServerErrorException(
        'Lỗi truy vấn báo cáo lịch sử mượn trả xe',
      );
    }
  }
}
