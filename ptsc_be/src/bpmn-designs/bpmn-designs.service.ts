import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Inject,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { validateAndParseSortParam } from 'src/utils/sort-validator.util';
import { BpmnDesignEntity } from './bpmn-design.entity';
import { CreateBpmnDesignDto } from './dto/create-bpmn-design.dto';
import { FieldDto, UpdateBpmnDesignDto } from './dto/update-bpmn-design.dto';
import {
  isValidMongoId,
  areFiltersValid,
  buildMongoQuery,
  convertFiltersBySchema,
} from '../utils/util'; // Assume these utilities are in a shared utils file
import { STATUS } from '../variables/CONST_STATUS'; // Adjust path as needed
import { QueryParams } from '../interfaces/index'; // Adjust path as needed
import axios from 'axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as FormData from 'form-data';
import { parseStringPromise } from 'xml2js';
import {
  FeatureManagementEntity
} from 'src/feature-management/feature-management.entity';
// import { UserService } from 'src/user/user.service';
import { FileManagerService } from 'src/file-manager/file-manager.service';
import { ConfigService } from '@nestjs/config';
import { BpmnVersionService } from 'src/bpmn-version/bpmn-version.service';
import { Repository, In, Brackets } from 'typeorm';
import { HistoryBpmnEntity } from './history-bpmn.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleFeatureSqlService } from 'src/role-feature/role-feature-sql/role-feature-sql.service';
import { CamundaVariableEntity } from 'src/cmd-variable/camunda-variable.entity';
import { UsersService } from 'src/users/users.service';
import { CrmSourcesService } from 'src/crmsource/crmsource.service';
import { MSSQL_REPO } from 'src/database/database.provider';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { IncomingService } from 'src/documents/incomming-document/incoming.service';
// import { ProfileManagementEntity } from 'src/profile-management/profile-management.entity'; // ✅ Commented - module deleted
function parseDate(value: string): Date | null {
  if (!value) return null;

  const dmy = /^(\d{2})-(\d{2})-(\d{4})$/; // dd-MM-yyyy
  if (dmy.test(value)) {
    const [, d, m, y] = value.match(dmy)!;
    return new Date(`${y}-${m}-${d}T00:00:00`);
  }

  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/; // yyyy-MM-dd
  if (ymd.test(value)) return new Date(`${value}T00:00:00`);

  return null;
}

function hasStampPropertyDeclared(base64File?: string): boolean {
  if (!base64File) return false;
  try {
    const xml = Buffer.from(base64File, 'base64').toString('utf-8');
    const xmlWithoutComments = xml.replace(/<!--[\s\S]*?-->/g, '');
    const propertyRegex = /<camunda:property\s+([^>]*)\/?>/gi;
    let match;
    while ((match = propertyRegex.exec(xmlWithoutComments)) !== null) {
      const attrs = match[1];
      if (/name\s*=\s*["']isStamp["']/i.test(attrs)) {
        return true;
      }
    }
  } catch (error) {
    // Ignore error
  }
  return false;
}


interface TaskInfo {
  $: Record<string, string>; // tất cả thuộc tính trong XML
  type?: string; // loại task (userTask, serviceTask,...)
}

@Injectable()
export class BpmnDesignsService {
  private readonly logger = new Logger(BpmnDesignsService.name);
  constructor(
    // @InjectModel(FeatureManagement.name)
    // private FeatureManagementRepo: Model<FeatureManagementDocument>,
    private readonly userService: UsersService,
    @InjectRepository(HistoryBpmnEntity, 'mssqlConnection')
    private readonly historyBpmnRepo: Repository<HistoryBpmnEntity>,
    @InjectRepository(BpmnDesignEntity, 'mssqlConnection')
    private readonly bpmnDesignRepo: Repository<BpmnDesignEntity>,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly orgUnitRepo: Repository<OrganizationUnitEntity>,

    @InjectRepository(CamundaVariableEntity, 'mssqlConnection')
    private readonly camundaVariableRepo: Repository<CamundaVariableEntity>,
    private readonly configService: ConfigService,

    private readonly httpService: HttpService,
    private readonly fileManagerService: FileManagerService,
    // @InjectRepository(ProfileManagementEntity, 'mssqlConnection') // ✅ Commented - module deleted
    // private readonly profileManagementRepo: Repository<ProfileManagementEntity>, // ✅ Commented - module deleted
    private readonly bpmnVersionService: BpmnVersionService,
    private readonly roleFeatureService: RoleFeatureSqlService,
    private readonly crmSourcesService: CrmSourcesService,
    @Inject('REDIS_CLIENT') private readonly redisClient: any,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(MSSQL_REPO) private readonly sqlRepo: MSSQLRepository,
    @Inject(forwardRef(() => IncomingService))
    private readonly incomingService: IncomingService,
  ) { }

  private async refreshBpmnCaches(processKeys: string[], base64File?: string): Promise<void> {
    const normalizedKeys = [...new Set(
      (processKeys || [])
        .map((key) => String(key || '').trim())
        .filter(Boolean),
    )];

    if (!normalizedKeys.length) return;

    let xmlContent: string | null = null;
    if (base64File) {
      try {
        xmlContent = Buffer.from(base64File, 'base64').toString('utf-8');
      } catch (error) {
        this.logger.warn(`Không thể decode BPMN base64 để refresh Redis: ${error?.message || error}`);
      }
    }

    try {
      await Promise.all(
        normalizedKeys.map((key) => this.cacheManager?.del(`bpmn_engine:${key}`)),
      );
    } catch (error) {
      this.logger.warn(`Xóa cacheManager BPMN cache thất bại: ${error?.message || error}`);
    }

    try {
      await this.sqlRepo.invalidateBpmnFileCache(normalizedKeys);
    } catch (error) {
      this.logger.warn(`Invalidate sqlRepo BPMN file cache thất bại: ${error?.message || error}`);
    }

    try {
      await this.incomingService?.invalidateBpmnCaches(normalizedKeys);
    } catch (error) {
      this.logger.warn(`Invalidate incoming BPMN cache failed: ${error?.message || error}`);
    }

    try {
      if (typeof this.redisClient?.multi === 'function') {
        const multi = this.redisClient.multi();
        for (const key of normalizedKeys) {
          multi.del(`bpmn_engine:${key}`);
          if (xmlContent) {
            multi.set(`outgoing_map:bpmn-file:${key}`, JSON.stringify(xmlContent));
          } else {
            multi.del(`outgoing_map:bpmn-file:${key}`);
          }
        }
        await multi.exec();
        return;
      }

      await Promise.all(
        normalizedKeys.flatMap((key) => {
          const actions: Promise<any>[] = [this.redisClient?.del(`bpmn_engine:${key}`)];
          if (xmlContent) {
            actions.push(this.redisClient?.set(`outgoing_map:bpmn-file:${key}`, JSON.stringify(xmlContent)));
          } else {
            actions.push(this.redisClient?.del(`outgoing_map:bpmn-file:${key}`));
          }
          return actions;
        }),
      );
    } catch (error) {
      this.logger.warn(`Refresh Redis BPMN cache thất bại: ${error?.message || error}`);
    }
  }
  async syncBpmnDesignFromMongo(): Promise<{
    total: number;
    synced: number;
    errors: any[];
  }> {
    return {
      total: 0,
      synced: 0,
      errors: ['MongoDB sync disabled. Data now persisted via MSSQL.'],
    };
  }

  async getProcessInstances(maxResults: number, firstResult: number) {
    const response = await axios.get(
      `${process.env.CAMUNDA_API}/process-instance`,
      {
        params: {
          maxResults,
          firstResult,
        },
      },
    );

    return response.data;
  }

  async getAllTasks(): Promise<{ count: number; data: any[] }> {
    const url = `${process.env.CAMUNDA_API}/task`;

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      return { count: response.data.length, data: response.data };
    } catch (error) {
      console.error('Lỗi khi lấy task từ Camunda:', error.message);
      throw new Error('Không thể lấy danh sách task từ Camunda');
    }
  }

  async getTasksByAssignee(
    assignee: string,
  ): Promise<{ count: number; data: any[] }> {
    const url = `${process.env.CAMUNDA_API}/task?assignee=${assignee}`;
    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const tasks = response.data; // dữ liệu từ Camunda API

      // Sort theo ngày tạo mới nhất
      const sortedTasks = tasks.sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
      );

      return { count: sortedTasks.length, data: sortedTasks };
    } catch (error) {
      throw new Error(
        `Lỗi khi lấy task cho assignee=${assignee}: ${error.message}`,
      );
    }
  }

  async getTasksByQuery(
    query: Record<string, string | number>,
  ): Promise<{ count: number; data: any[] }> {
    const queryString = new URLSearchParams(
      query as Record<string, string>,
    ).toString();
    const url = `${process.env.CAMUNDA_API}/task?${queryString}`;

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const tasks = response.data;

      // Sắp xếp theo ngày tạo mới nhất
      const sortedTasks = tasks.sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
      );

      return { count: sortedTasks.length, data: sortedTasks };
    } catch (error) {
      throw new Error(
        `Lỗi khi lấy task với query=${JSON.stringify(query)}: ${error.message}`,
      );
    }
  }

  async findAll(queryParams: QueryParams): Promise<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    data: BpmnDesignEntity[];
    filter: any;
  }> {
    const {
      page = 1,
      limit = 25,
      sort = '-createdAt',
      ...filters
    } = queryParams;

    if (!areFiltersValid(filters)) {
      throw new BadRequestException('Tìm kiếm không được chứa ký tự đặc biệt');
    }

    const pageNum = Math.max(parseInt(page as any, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit as any, 10) || 25, 1);
    const skip = (pageNum - 1) * limitNum;

    const query = this.bpmnDesignRepo.createQueryBuilder('design');

    // Luôn chỉ lấy bản ghi active
    query.andWhere('design.status = :status', { status: STATUS.ACTIVED });

    // Áp dụng filter (hỗ trợ tìm kiếm trên JSON field nếu cần)
    if (Object.keys(filters).length > 0) {
      // Ví dụ: tìm theo name, description, processKey...
      if (filters.name && filters.id) {
        query.andWhere(
          new Brackets((qb) => {
            qb.where('design.name COLLATE Latin1_General_CI_AI LIKE :name', { name: `%${filters.name}%` })
              .orWhere('design.id COLLATE Latin1_General_CI_AI LIKE :id', { id: `%${filters.id}%` });
          })
        );
      } else {
        // Nếu chỉ có 1 trong 2, chạy độc lập như cũ
        if (filters.name) {
          query.andWhere('design.name COLLATE Latin1_General_CI_AI LIKE :name', { name: `%${filters.name}%` });
        }
        if (filters.id) {
          query.andWhere('design.id COLLATE Latin1_General_CI_AI LIKE :id', { id: `%${filters.id}%` });
        }
      }
      if (filters.description && filters.description != "") {
        query.andWhere('design.description COLLATE Latin1_General_CI_AI LIKE :desc', {
          desc: `%${filters.description}%`,
        });
      }
      if (filters.processKey) {
        query.andWhere('design.processKey = :processKey', {
          processKey: filters.processKey,
        });
      }
      // Bạn có thể mở rộng thêm các filter khác
    }

    // Secure sorting (dung shared utility)
    const sortResult = validateAndParseSortParam(sort);
    (Object.entries(sortResult) as [string, 'ASC' | 'DESC'][]).forEach(([key, order]) => {
      query.addOrderBy(`design.${key}`, order);
    });

    const [data, total] = await query
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    const mappedData = await Promise.all(
      data.map(async (entity) => ({
        ...entity,
        relatedProcesses: Array.isArray(entity.relatedProcesses)
          ? await this.crmSourcesService.findTitlesByValues(
            entity.relatedProcesses
          )
          : [],
      }))
    );

    return {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      data: mappedData,
      filter: filters,
    };
  }

  async getDesignsWithStartForm(queryParams: QueryParams) {
    const { sort = '-createdAt', ...filters } = queryParams;

    const query = this.bpmnDesignRepo.createQueryBuilder('design');

    query.andWhere('design.status = :status', { status: STATUS.ACTIVED });
    query.andWhere('design.hasStartForm = :hasStartForm', { hasStartForm: true });
    query.andWhere('design.startFormId IS NOT NULL');

    if (filters.name) {
      query.andWhere('design.name COLLATE Latin1_General_CI_AI LIKE :name', { name: `%${filters.name}%` });
    }

    // Secure sorting (dung shared utility)
    const sortResult = validateAndParseSortParam(sort);
    (Object.entries(sortResult) as [string, 'ASC' | 'DESC'][]).forEach(([key, order]) => {
      query.addOrderBy(`design.${key}`, order);
    });

    const data = await query.getMany();
    return { total: data.length, data, filter: filters };
  }

  async findOne(id: string): Promise<any> {
    const design = await this.bpmnDesignRepo.createQueryBuilder('design')
      .addSelect('design.base64File')
      .addSelect('design.unit')
      .where('design.id = :id AND design.status = :status', {
        id,
        status: STATUS.ACTIVED,
      })
      .getOne();

    if (!design) {
      throw new NotFoundException(`BpmnDesignEntity với id ${id} không tồn tại`);
    }

    let populatedUnits: any[] = [];
    if (design.unit && design.unit.length > 0) {
      const rawUnits = (Array.isArray(design.unit) ? design.unit : []).map((u: any) =>
        typeof u === 'object' && u !== null && u.id ? String(u.id) : String(u)
      );

      const BATCH_SIZE = 2000;
      const allUnits: OrganizationUnitEntity[] = [];
      for (let i = 0; i < rawUnits.length; i += BATCH_SIZE) {
        const chunk = rawUnits.slice(i, i + BATCH_SIZE);
        const unitsChunk = await this.orgUnitRepo.find({
          where: { id: In(chunk) }
        });
        allUnits.push(...unitsChunk);
      }

      const unitMap = new Map(allUnits.map(u => [String(u.id), u]));
      populatedUnits = rawUnits.map(uId => {
        const found = unitMap.get(uId);
        if (found) {
          return { id: found.id, _id: found.id, name: found.name };
        }
        return { id: uId, _id: uId, name: uId };
      });
    }

    return {
      ...design,
      unit: populatedUnits,
    };
  }

  async update(
    id: string,
    updateBpmnDesignDto: UpdateBpmnDesignDto,
  ): Promise<BpmnDesignEntity> {
    const design = await this.bpmnDesignRepo.findOne({
      where: { id, status: STATUS.ACTIVED },
    });

    if (!design) {
      throw new NotFoundException(
        `BpmnDesignEntity with id ${id} not found or inactive`,
      );
    }

    // processKey cũ & mới (CHẮC CHẮN là string)
    const oldProcessKey: string = design.processKey ?? design.id;
    const newProcessKey: string =
      updateBpmnDesignDto.processKey ??
      updateBpmnDesignDto.id ??
      oldProcessKey;

    // Build data update
    const updatedData: Partial<BpmnDesignEntity> = {};
    Object.entries(updateBpmnDesignDto).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        if (key === 'unit' && Array.isArray(value)) {
          updatedData.unit = value.map((u: any) =>
            typeof u === 'object' && u !== null && u.id ? String(u.id) : String(u)
          );
        } else {
          updatedData[key as keyof BpmnDesignEntity] = value as any;
        }
      }
    });
    updatedData.processKey = newProcessKey;

    // Update BpmnDesign
    await this.bpmnDesignRepo.update(id, updatedData);


    // Đồng bộ processKey sang RoleFeature (nếu có) - chỉ update processKey, không thay đổi roles
    if (oldProcessKey !== newProcessKey) {
      const roleFeature =
        await this.roleFeatureService.findOneByProcessKey(oldProcessKey);

      if (roleFeature) {
        await this.roleFeatureService.updateProcessKeyOnly(
          oldProcessKey,
          newProcessKey,
        );
      }
    }

    // Tạo version nếu có file
    if (updateBpmnDesignDto.base64File) {
      await this.bpmnVersionService.createVersion(
        id,
        newProcessKey,
        updateBpmnDesignDto.base64File,
      );
    }

    await this.refreshBpmnCaches(
      [id, oldProcessKey, newProcessKey],
      updateBpmnDesignDto.base64File,
    );

    return this.bpmnDesignRepo.createQueryBuilder('design')
      .addSelect('design.base64File')
      .addSelect('design.unit')
      .where('design.id = :id', { id })
      .getOneOrFail();
  }

  async remove(id: string): Promise<{ status: string }> {
    const design = await this.bpmnDesignRepo.findOne({
      where: { id },
    });

    if (!design) {
      throw new NotFoundException(`BpmnDesignEntity with id ${id} not found`);
    }

    design.status = STATUS.DELETED;
    await this.bpmnDesignRepo.save(design);

    return { status: 'Xóa thành công' };
  }

  async create(dto: CreateBpmnDesignDto): Promise<BpmnDesignEntity> {
    // Tạo entity
    const newDesign = this.bpmnDesignRepo.create({
      ...dto,
      processKey: dto.processKey || dto.id || '', // dùng dto.processKey nếu có, nếu không dùng dto.id
      status: STATUS.ACTIVED,
      fields: dto.fields?.map(f => ({
        id: f.id!,
        label: f.label!,
        type: f.type! as any,
        defaultValue: f.defaultValue,
      })) || [],
      unit: dto.unit ? dto.unit.map((u: any) => typeof u === 'object' && u?.id ? String(u.id) : String(u)) : [],
      relatedProcesses: dto.relatedProcesses || [],
    });

    // Save trước để có id/processKey thực
    const savedDesign = await this.bpmnDesignRepo.save(newDesign);

    // Tạo RoleFeature với processKey chắc chắn có
    await this.roleFeatureService.create({
      processKey: savedDesign.processKey || savedDesign.id,
      roles: [],
    });

    return savedDesign;
  }

  // 2️⃣ addField
  async addField(id: string, fieldsDto: FieldDto[]): Promise<BpmnDesignEntity> {
    if (!Array.isArray(fieldsDto)) throw new BadRequestException(`fieldsDto must be an array`);

    const design = await this.bpmnDesignRepo.findOne({ where: { id, status: STATUS.ACTIVED } });
    if (!design) throw new NotFoundException(`BpmnDesignEntity with id ${id} not found or inactive`);

    const existingFields = design.fields ?? [];
    const existingIds = new Set(existingFields.map(f => f.id));

    const duplicate = fieldsDto.filter(f => f.id && existingIds.has(f.id));
    if (duplicate.length > 0)
      throw new BadRequestException(`Fields with IDs ${duplicate.map(f => f.id).join(', ')} already exist`);

    // validate fields
    for (const field of fieldsDto) {
      if (!field.id || !field.label || !field.type)
        throw new BadRequestException(`Each field must have id, label, type`);
      if (!['string', 'text', 'number', 'date', 'boolean', 'enum', 'long'].includes(field.type))
        throw new BadRequestException(`Invalid field type: ${field.type}`);
    }

    design.fields = [
      ...existingFields,
      ...fieldsDto.map(f => ({
        id: f.id!,
        label: f.label!,
        type: f.type! as any,
        defaultValue: f.defaultValue,
      })),
    ];

    return await this.bpmnDesignRepo.save(design);
  }

  // 3️⃣ updateField
  async updateField(id: string, fieldsDto: FieldDto[]): Promise<BpmnDesignEntity> {
    const design = await this.bpmnDesignRepo.findOne({ where: { id, status: STATUS.ACTIVED } });
    if (!design) throw new NotFoundException(`BpmnDesignEntity with id ${id} not found or inactive`);

    const existing = design.fields ?? [];
    const existingIds = new Set(existing.map(f => f.id));

    const missing = fieldsDto.filter(f => f.id && !existingIds.has(f.id));
    if (missing.length > 0)
      throw new NotFoundException(`Fields with IDs ${missing.map(f => f.id).join(', ')} not found`);

    const map = new Map(existing.map(f => [f.id, f]));
    for (const f of fieldsDto) {
      if (!f.id) continue;
      const target = map.get(f.id);
      if (target) {
        target.label = f.label!;
        target.type = f.type! as any;
        target.defaultValue = f.defaultValue;
      }
    }

    design.fields = Array.from(map.values());
    return await this.bpmnDesignRepo.save(design);
  }

  // 4️⃣ deployProcess
  async deployProcess(
    data: Express.Multer.File,
    deploymentName: string,
    processID: string,
  ) {
    try {
      const form = new FormData();
      form.append('deployment-name', deploymentName);
      form.append('deploy-changed-only', 'true');
      form.append('enable-duplicate-filtering', 'true');
      form.append('data', data.buffer, {
        filename: `${deploymentName}.bpmn`,
        contentType: 'text/xml',
      });

      const response = await firstValueFrom(
        this.httpService.post(`${process.env.CAMUNDA_MEDIUM}/deployment/create`, form, {
          headers: form.getHeaders(),
        }),
      );

      const deployedDefs = response.data.deployedProcessDefinitions;
      type DeployedProcess = { key: string; deploymentId: string };
      const firstDef = deployedDefs ? (Object.values(deployedDefs)[0] as DeployedProcess) : null;

      const processKey = firstDef?.key;
      const processDeploymentId = firstDef?.deploymentId;
      const processInstanceDefinitonKey = firstDef ? Object.keys(deployedDefs!)[0] : undefined;

      if (!processKey) throw new Error('Không tìm thấy processKey trong kết quả deploy');

      // update SQL Server, tránh null
      await this.bpmnDesignRepo.update(
        { id: processID },
        {
          processKey,
          processInstanceDefinitionKey: processInstanceDefinitonKey || undefined,
          processDeploymentId,
        },
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || error.message,
        error.response?.status || 500,
      );
    }
  }


  async getFields(id: string): Promise<FieldDto[]> {
    const design = await this.bpmnDesignRepo.findOne({
      where: { id, status: STATUS.ACTIVED },
    });

    if (!design) {
      throw new NotFoundException(`BpmnDesignEntity with id ${id} not found or inactive`);
    }

    return design.fields ?? [];
  }

  async startProcessForward(
    processKey: string,
    body: any,
    headers: Record<string, any> = {},
  ) {
    const camundaBase =
      process.env.CAMUNDA_BASE || 'http://192.168.0.214:4146/engine-rest';

    // Mongo: FeatureManagement
    const record = await this.featureManagementRepo.findOne({
      where: { code: processKey }
    });

    const processId = record?.processID || processKey;

    // SQL Server: BpmnDesignEntity
    const res = await this.bpmnDesignRepo.findOne({
      where: { id: processId },
    });
    const finalProcessKey = res?.processKey || processId;

    const url = `${camundaBase}/process-definition/key/${finalProcessKey}/start`;

    try {
      const forwardHeaders: Record<string, any> = {
        'Content-Type': headers['content-type'] || 'application/json',
      };
      if (headers['authorization'])
        forwardHeaders['Authorization'] = headers['authorization'];

      const resp = await firstValueFrom(
        this.httpService.post(url, body, { headers: forwardHeaders }),
      );

      const processInstanceId = resp?.data?.id;
      if (!processInstanceId)
        throw new NotFoundException(
          'Không thể tìm thấy ID khởi tạo của quy trình',
        );

      const variablesPayload = body.variables || {};
      await this.camundaVariableRepo.save({
        processKey: finalProcessKey,
        processInstanceId,
        variables: variablesPayload,
      });

      // Lưu hồ sơ (SQL) nếu là quy trình hồ sơ
      if (finalProcessKey === 'Process_thuthaphoso1' && body.variables) {
        const flattened: Record<string, any> = {};
        const variablesOnly: Record<string, any> = {};
        for (const key in body.variables) {
          const v = body.variables[key];
          if (v && typeof v === 'object' && 'value' in v) {
            const value = (v as { value: any }).value;
            variablesOnly[key] = value;
            flattened[key] = value;
          }
        }

        // await this.profileManagementRepo.save({ // ✅ Commented - module deleted
        //   processInstanceId,
        //   variables: variablesOnly,
        //   payload: flattened,
        // });
      }

      // Upload file nếu có
      const fileId = body.variables?.attachment?.value;
      const maHoSo = body.variables?.code?.value;
      const profileid = body.variables?.profileid?.value;
      let externalApiResponse: any = null;

      if (fileId && maHoSo) {
        try {
          externalApiResponse = await this._uploadToExternalApi(fileId, maHoSo, profileid);
        } catch (uploadError) {
          uploadError.externalApiError = true;
          uploadError.camundaData = resp.data;
          uploadError.message = `Lỗi khi upload file: ${uploadError.message}`;
          throw uploadError;
        }
      }

      return {
        ...resp.data,
        ...(externalApiResponse && { externalApiResponse }),
      };
    } catch (err: any) {
      const status = err?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const data = err?.response?.data || { message: err.message || 'Error when calling Camunda' };

      if (err.externalApiError) {
        this.logger.error(
          `Start process to Camunda successful, but external API upload failed for processKey: ${processKey}`,
          err.stack,
        );
        return {
          ...err.camundaData,
          message: 'Start process to Camunda successful, but external file upload failed.',
          externalApiResponse: { success: false, message: err.message },
        };
      }

      throw new HttpException({ success: false, camunda: data }, status);
    }
  }

  async completeProcessForward(
    taskId: string,
    body: any,
    headers: Record<string, any> = {},
  ) {
    const camundaBase =
      process.env.CAMUNDA_MEDIUM || 'http://192.168.0.226:4146/engine-rest';
    const url = `${camundaBase}/task/${taskId}/complete`;

    try {
      // Forward Authorization header if exists, hoặc bạn có thể forward toàn bộ header nếu muốn
      const forwardHeaders: Record<string, any> = {};
      if (headers['authorization'])
        forwardHeaders['Authorization'] = headers['authorization'];
      // set content-type if not present
      forwardHeaders['Content-Type'] =
        headers['content-type'] || 'application/json';

      const resp = await firstValueFrom(
        this.httpService.post(url, body, { headers: forwardHeaders }),
      );

      return resp.data;
    } catch (err: any) {
      // Chuẩn hóa lỗi trả về client
      const status = err?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const data = err?.response?.data || {
        message: err.message || 'Error when calling Camunda',
      };
      throw new HttpException({ success: false, camunda: data }, status);
    }
  }
  async getTasks(processInstanceId: string) {
    const url = `${process.env.CAMUNDA_MEDIUM}/task?processInstanceId=${processInstanceId}&active=true`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        // Nếu Camunda có Basic Auth:
        // Authorization: 'Basic ' + Buffer.from('username:password').toString('base64'),
      },
    });

    return response.data;
  }

  //lấy trang thái của process instance
  async getStatusProcess(processInstanceId: string) {
    const baseUrl = process.env.CAMUNDA_MEDIUM;

    // Gọi API lấy activity instances
    const activityUrl = `${baseUrl}/process-instance/${processInstanceId}/activity-instances`;
    const response = await axios.get(activityUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = response.data;

    // Lấy processDefinitionId từ response
    const processDefinitionId = data.processDefinitionId;

    // Tách processKey từ processDefinitionId (dạng key:version:id)
    const processDefinitionKey = processDefinitionId.split(':')[0];
    const task = await this.getTaskInfo(processDefinitionKey, data.childActivityInstances[0].activityId)
    return {
      ...data,
      processDefinitionKey,
      featureCode: task.id
    };
  }
  async getValueUserTask(taskId: string) {
    const url = `${process.env.CAMUNDA_MEDIUM}/task/${taskId}/form-variables`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        // Nếu Camunda có Basic Auth:
        // Authorization: 'Basic ' + Buffer.from('username:password').toString('base64'),
      },
    });

    return response.data;
  }
  async getDetailTask(taskId: string) {
    const url = `${process.env.CAMUNDA_MEDIUM}/task/${taskId}`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        // Nếu Camunda có Basic Auth:
        // Authorization: 'Basic ' + Buffer.from('username:password').toString('base64'),
      },
    });

    return response.data;
  }

  //  async submitFormByProcess(processInstanceId: string, body: any,currentUserId: any) {
  //   if (!processInstanceId) {
  //     throw new BadRequestException('processInstanceId là bắt buộc');
  //   }

  //   try {
  //     // 1️⃣ Lấy task đang active
  //     const { data: tasks } = await axios.get(
  //       `${process.env.CAMUNDA_API}/task?processInstanceId=${processInstanceId}`,
  //     );

  //     if (!tasks || tasks.length === 0) {
  //       throw new NotFoundException(`Không tìm thấy task active cho processInstanceId ${processInstanceId}`);
  //     }

  //     const task = tasks[0];
  //     const taskId = task.id;

  //      // 2. Set sender = currentUserId

  //   // 3. Submit form cho taskId
  //   const { data } = await axios.post(
  //     `${process.env.CAMUNDA_API}/task/${taskId}/submit-form`,
  //     body,
  //   );

  //       // 3️⃣ Lấy thông tin người gửi (sender) và người được giao (assignee)
  //     const [senderUser, assigneeUser] = await Promise.all([
  //       currentUserId ? this.userService.findById(currentUserId) : null,
  //       task.assignee ? this.userService.findById(task.assignee) : null,
  //     ]);

  //     // 4️⃣ Lưu log vào HistoryBpmn
  //     await this.historyBpmnRepo.create({
  //       processInstanceId,
  //       taskId,
  //       taskName: task.name,
  //       sender: currentUserId,
  //       senderName: senderUser?.name || null,
  //       assignee: task.assignee,
  //       assigneeName: assigneeUser?.name || null,
  //       variablesSubmitted: body.variables || {},
  //       completedAt: new Date(),
  //     });

  //     // 4️⃣ Lưu biến vào CamundaVariable nếu có
  //     if (body.variables) {
  //       try {
  //         await this.camundaVariableModel.create({
  //           processKey: task.processDefinitionKey,
  //           processInstanceId,
  //           variables: body.variables,
  //         });
  //       } catch (err) {
  //         console.error('Error saving Camunda variables:', err.message);
  //       }
  //     }

  //     return {
  //       message: 'Form submitted successfully',
  //       taskId,
  //       result: data,
  //     };
  //   } catch (err: any) {
  //     const status = err?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
  //     const data = err?.response?.data || { message: err.message || 'Error calling Camunda API' };
  //     throw new HttpException({ success: false, camunda: data }, status);
  //   }
  // }
  async submitFormByProcess(
    processInstanceId: string,
    body: any,
    currentUserId: any,
  ) {
    if (!processInstanceId) {
      throw new BadRequestException('processInstanceId là bắt buộc');
    }

    try {
      // 1️⃣ Lấy task đang active
      const { data: tasks } = await axios.get(
        `${process.env.CAMUNDA_API}/task?processInstanceId=${processInstanceId}`,
      );

      if (!tasks || tasks.length === 0) {
        throw new NotFoundException(
          `Không tìm thấy task active cho processInstanceId ${processInstanceId}`,
        );
      }

      const task = tasks[0];
      const taskId = task.id;

      // 2. Set sender = currentUserId (nếu cần claim hoặc assign, thêm code ở đây nếu chưa có)

      // 3. Submit form cho taskId
      const { data } = await axios.post(
        `${process.env.CAMUNDA_API}/task/${taskId}/submit-form`,
        body,
      );
      const [senderUser, assigneeUser] = await Promise.all([
        currentUserId ? this.userService.findById(currentUserId) : null,
        body?.variables?.$assignee?.value
          ? this.userService.findById(body?.variables?.$assignee?.value)
          : null,
      ]);

      // 4️⃣ Lưu log vào HistoryBpmn - assignee là của task tiếp theo
      await this.historyBpmnRepo.save({
        processInstanceId,
        taskId,
        taskName: task.name,
        sender: currentUserId,
        senderName: senderUser?.name || null,
        assignee: body?.variables?.$assignee?.value || null,
        assigneeName: assigneeUser?.name || null,
        variablesSubmitted: JSON.stringify(body.variables || {}),
        completedAt: new Date(),
      });

      // 4️⃣ Lưu biến vào CamundaVariable nếu có
      if (body.variables) {
        try {
          await this.camundaVariableRepo.save({
            processKey: task.processDefinitionKey,
            processInstanceId,
            variables: body.variables,
          });
        } catch (err) {
          console.error('Error saving Camunda variables:', err.message);
        }
      }

      return {
        message: 'Form submitted successfully',
        taskId,
        result: data,
      };
    } catch (err: any) {


      const status = err?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const data = err?.response?.data || {
        message: err.message || 'Error calling Camunda API',
      };
      throw new HttpException({ success: false, camunda: data }, status);
    }
  }

  private async _uploadToExternalApi(fileId: string, maHoSo: string, profileid?: string) {
    // 1. Lấy thông tin file từ DB
    const fileRecord = await this.fileManagerService.findById(fileId);
    if (!fileRecord) {
      throw new NotFoundException(`Không tìm thấy file với ID: ${fileId} trong DB.`);
    }

    const filePath = fileRecord.realPath;
    if (!fs.existsSync(filePath)) {
      this.logger.error(`File does not exist on disk: ${filePath}`);
      throw new InternalServerErrorException(`File vật lý không tồn tại trên máy chủ.`);
    }

    // 2. Chuẩn bị và gọi API ngoài
    try {
      const codeUnit = this.configService.get<string>('CODE_UNIT');
      const baseUrl = this.configService.get<string>('BASE_UPLOAD_ARCHEVEMATICA');

      if (!baseUrl) {
        throw new InternalServerErrorException('Biến môi trường BASE_UPLOAD_ARCHEVEMATICA chưa được thiết lập.');
      }

      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));
      form.append('profileid', profileid);
      const url = new URL(baseUrl);
      url.searchParams.append('maHoSo', maHoSo);

      if (codeUnit) {
        url.searchParams.append('codeUnit', codeUnit);
      } else {
        this.logger.warn('Biến môi trường CODE_UNIT chưa được thiết lập.');
      }


      const response = await firstValueFrom(
        this.httpService.post(url.toString(), form, {
          headers: {
            ...form.getHeaders(),
          },
        }),
      );

      return response.data;

    } catch (error) {
      this.logger.error(
        `Lỗi khi gọi API ngoài cho maHoSo: ${maHoSo}, fileId: ${fileId}`,
        error.stack,
      );
      // Ném lỗi để phương thức gọi nó (submitFormByProcess) có thể bắt và xử lý
      throw new InternalServerErrorException(`Lỗi khi upload file tới hệ thống bên ngoài: ${error.message}`);
    }
  }
  // async getTasksBySender(userId: string, page = 1, limit = 10) {
  //   if (!userId) {
  //     throw new BadRequestException('userId là bắt buộc');
  //   }

  //   const skip = (page - 1) * limit;

  //   // Lấy danh sách lịch sử theo sender
  //   const [items, totalItems] = await Promise.all([
  //     this.historyBpmnRepo
  //       .find({ sender: userId })
  //       .skip(skip)
  //       .limit(limit)
  //       .sort({ completedAt: -1 })
  //       .lean(),
  //     this.historyBpmnRepo.countDocuments({ sender: userId }),
  //   ]);

  //   const processInstanceIds = items.map(item => item.processInstanceId);

  //   const uniqIds = new Set(processInstanceIds);
  //   console.log("🚀 ~ BpmnDesignsService ~ getTasksBySender ~ uniqIds:", uniqIds)

  //   // Map kết quả
  //   const data = items.map(item => ({
  //     activityInstanceId: item.taskId,
  //     processDefinitionId: item.processDefinitionId || "",
  //     processInstanceId: item.processInstanceId,
  //     sender: item.sender || null,
  //     senderName: item.senderName || null,
  //     assignee: item.assignee || null,
  //     assigneeName: item.assigneeName || null,
  //     completedAt: item.completedAt || null,
  //     variables: Object.entries(item.variablesSubmitted || {}).reduce(
  //       (acc, [key, value]) => {
  //         acc[key] = value?.value ?? null;
  //         return acc;
  //       },
  //       {},
  //     ),
  //   }));

  //   // Trả kết quả có phân trang
  //   return {
  //     page,
  //     limit,
  //     totalItems,
  //     totalPages: Math.ceil(totalItems / limit),
  //     data,
  //   };
  // }

  async getTasksBySender(
    userId: string,
    page = 1,
    limit = 25,
    userFilters: Record<string, string> = {},
    sort: Record<string, 'asc' | 'desc'> = {},
  ) {
    if (!userId) {
      throw new BadRequestException('userId là bắt buộc');
    }

    const skip = (page - 1) * limit;

    // 1️⃣ Lấy toàn bộ processInstanceId duy nhất (thay .distinct của Mongoose)
    const allProcessIdsResult = await this.historyBpmnRepo
      .createQueryBuilder('h')
      .select('DISTINCT h.processInstanceId', 'processInstanceId')
      .where('h.sender = :sender', { sender: userId })
      .getRawMany();

    const allProcessIds = allProcessIdsResult.map((x) => x.processInstanceId);

    const totalItems = allProcessIds.length;
    const totalPages = Math.ceil(totalItems / limit);

    // 2️⃣ Cắt theo trang (giữ nguyên)
    const processIdsPage = allProcessIds.slice(skip, skip + limit);

    // 3️⃣ Query Camunda lấy variables (giữ nguyên)
    const data = await Promise.all(
      processIdsPage.map(async (id) => {
        try {
          const resp = await firstValueFrom(
            this.httpService.get(
              `${process.env.CAMUNDA_API}/process-instance/${id}/variables`,
            ),
          );

          const variables = Object.entries(resp.data || {}).reduce(
            (acc, [key, val]: any) => {
              acc[key] = val?.value ?? null;
              return acc;
            },
            {},
          );

          return { activityInstanceId: id, variables };
        } catch {
          return { activityInstanceId: id, variables: {} };
        }
      }),
    );

    let tasks = [...data];

    // 4️⃣ Apply search (giữ nguyên)
    if (userFilters && Object.keys(userFilters).length > 0) {
      const normalizedFilters = Object.entries(userFilters).reduce(
        (acc, [k, v]) => {
          acc[k] = String(v ?? '').toLowerCase();
          return acc;
        },
        {} as Record<string, string>,
      );

      tasks = tasks.filter((task) =>
        Object.entries(normalizedFilters).some(([field, want]) => {
          const raw = task[field] ?? task.variables?.[field];
          if (!raw) return false;
          const value =
            typeof raw === 'string'
              ? raw.toLowerCase()
              : JSON.stringify(raw).toLowerCase();
          return value.includes(want);
        }),
      );
    }

    // 5️⃣ Sort (giữ nguyên 100%)
    if (sort && Object.keys(sort).length > 0) {
      const fields = Object.entries(sort);
      tasks.sort((a, b) => {
        for (const [field, order] of fields) {
          let va = a[field] ?? a.variables?.[field];
          let vb = b[field] ?? b.variables?.[field];
          if (va == null) va = '';
          if (vb == null) vb = '';

          const na = Number(va);
          const nb = Number(vb);
          if (!Number.isNaN(na) && !Number.isNaN(nb)) {
            if (na < nb) return order === 'asc' ? -1 : 1;
            if (na > nb) return order === 'asc' ? 1 : -1;
            continue;
          }

          const dateA = parseDate(va);
          const dateB = parseDate(vb);
          if (dateA && dateB) {
            const diff = dateA.getTime() - dateB.getTime();
            if (diff !== 0) return order === 'asc' ? diff : -diff;
            continue;
          }

          const sa = String(va).toLowerCase();
          const sb = String(vb).toLowerCase();
          if (sa < sb) return order === 'asc' ? -1 : 1;
          if (sa > sb) return order === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    // 6️⃣ Pagination (giữ nguyên)
    const pagedData = tasks;

    return {
      page,
      limit,
      totalItems,
      totalPages,
      data: pagedData,
    };
  }

  async submitFormWithGateway(processInstanceId: string, body: any) {
    try {
      // 1. Lấy taskId từ processInstanceId
      const { data: tasks } = await axios.get(
        `${process.env.CAMUNDA_API}/task?processInstanceId=${processInstanceId}`,
      );

      if (!tasks || tasks.length === 0) {
        throw new HttpException(
          'No active task found for this processInstanceId',
          HttpStatus.NOT_FOUND,
        );
      }

      const taskId = tasks[0].id;

      // 2. Submit form cho taskId
      const res = await axios.post(
        `${process.env.CAMUNDA_API}/task/${taskId}/submit-form`,
        body,
      );

      //Co the can mot retry loop o doan nay de tranh viec khong tim thay task moi
      if (res) {
        const { data: taskAfterSubmitting } = await axios.get(
          `${process.env.CAMUNDA_API}/task?processInstanceId=${processInstanceId}`,
        );
        if (!taskAfterSubmitting || taskAfterSubmitting.length === 0) {
          throw new HttpException(
            'No active task found for this processInstanceId after submitting the original form',
            HttpStatus.NOT_FOUND,
          );
        }

        const activityId = taskAfterSubmitting[0].taskDefinitionKey;
        return {
          message: 'Form submitted successfully',
          popupTaskId: activityId,
          result: res?.data,
        };
      }
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Error calling Camunda API',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Hàm tìm mã hồ sơ clone API dịch vụ thu thập kết quả

  //  async submitFormByProcess1(processInstanceId: string, body: any, headers: Record<string, any> = {}) {
  //   console.log("🚀 ~ BpmnDesignsService ~ submitFormByProcess1 ~ processInstanceId:", processInstanceId)
  //   console.log("🚀 ~ BpmnDesignsService ~ submitFormByProcess1 ~ body:", body)
  //   try {
  //     // Prepare headers to forward to Camunda
  //     const forwardHeaders: Record<string, any> = {
  //       'Content-Type': 'application/json',
  //     };
  //     if (headers['authorization']) {
  //       forwardHeaders['Authorization'] = headers['authorization'];
  //     }
  //     // 1. Lấy taskId từ processInstanceId
  //     const { data: tasks } = await axios.get(
  //       `${process.env.CAMUNDA_API}/task?processInstanceId=${processInstanceId}`,
  //       { headers: forwardHeaders },
  //     );

  //     if (!tasks || tasks.length === 0) {
  //       throw new HttpException(
  //         'No active task found for this processInstanceId',
  //         HttpStatus.NOT_FOUND,
  //       );
  //     }

  //     const taskId = tasks[0].id;

  //     // 2. Submit form cho taskId
  //     const { data } = await axios.post(
  //       `${process.env.CAMUNDA_API}/task/${taskId}/submit-form`,
  //       body,
  //       { headers: forwardHeaders },
  //     );
  //     console.log("🚀 ~ BpmnDesignsService ~ submitFormByProcess1 ~ data:", data)

  //     return {
  //       message: 'Dữ liệu đã được gửi thành công',
  //       taskId,
  //       result: data,
  //     };
  //   } catch (error) {
  //      throw new HttpException(
  //       error.response?.data || 'Lỗi khi gọi API Camunda',
  //       error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  async submitFormByProcess1(processInstanceId: string, body: any) {
    try {
      // 1. Lấy taskId từ processInstanceId
      const { data: tasks } = await axios.get(
        `${process.env.CAMUNDA_API}/task?processInstanceId=${processInstanceId}`,
      );

      if (!tasks || tasks.length === 0) {
        throw new HttpException(
          'No active task found for this processInstanceId',
          HttpStatus.NOT_FOUND,
        );
      }

      const taskId = tasks[0].id;

      // 2. Submit form cho taskId
      const { data } = await axios.post(
        `${process.env.CAMUNDA_API}/task/${taskId}/submit-form`,
        body,
      );

      return {
        message: 'Dữ liệu đẫ được gửi thành công ',
        taskId,
        result: data,
      };
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Error calling Camunda API',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async startProcessForward1(processKey: string, body: any) {
    const camundaBase =
      process.env.CAMUNDA_BASE || 'http://192.168.0.214:4146/engine-rest';

    try {
      // 1. Validate biến bắt buộc
      const requiredFields = ['documentName', 'documentType'];
      const fieldLabels: Record<string, string> = {
        documentName: 'Tên tài liệu',
        documentType: 'Loại tài liệu',
        code: 'Mã hồ sơ',
      };

      function validateRequiredVariables(
        variables: Record<string, any>,
        fields: string[],
      ) {
        return fields.filter((field) => {
          const variable = variables?.[field];
          return (
            !variable ||
            !variable.value ||
            variable.value.toString().trim() === ''
          );
        });
      }

      const missingFields = validateRequiredVariables(
        body?.variables,
        requiredFields,
      );

      if (missingFields.length > 0) {
        const readableFields = missingFields.map(
          (field) => fieldLabels[field] || field,
        );
        throw new BadRequestException({
          success: false,
          message: `Thiếu thông tin bắt buộc: ${readableFields.join(', ')}`,
        });
      }

      // 2. Kiểm tra code trong userFilters và variables
      const userCode = body?.userFilters?.code;
      const variableCode = body?.variables?.code?.value;

      if (!userCode) {
        throw new BadRequestException("Thiếu 'code' trong userFilters");
      }

      if (!variableCode) {
        throw new BadRequestException("Thiếu 'code' trong variables");
      }

      if (userCode !== variableCode) {
        throw new BadRequestException(
          `Mã hồ sơ trong userFilters ('${userCode}') không khớp với variables.code ('${variableCode}')`,
        );
      }

      // 3. Chuẩn bị body gọi Camunda
      const finalBody = { ...body };
      const idFromVariables = body?.variables?._id?.value;
      if (!finalBody.businessKey && idFromVariables) {
        finalBody.businessKey = idFromVariables;
      }

      // 4. Lấy processId từ featureManagementRepo (MongoDB)
      const record = await this.featureManagementRepo.findOne({
        where: { code: processKey }
      });
      const processId = record?.processID || processKey;

      // 5. Lấy bpmnDesign từ SQL Server
      const res = await this.bpmnDesignRepo.findOne({
        where: { id: processId },
      });
      const finalProcessKey = res?.processKey || processId;

      const url = `${camundaBase}/process-definition/key/${finalProcessKey}/start`;

      // 6. Forward Authorization header
      const forwardHeaders: Record<string, any> = {};
      if (body?.headers?.authorization)
        forwardHeaders['Authorization'] = body.headers.authorization;
      forwardHeaders['Content-Type'] =
        body?.headers?.['content-type'] || 'application/json';

      // 7. Gọi Camunda start process
      const resp = await firstValueFrom(
        this.httpService.post(url, finalBody, { headers: forwardHeaders }),
      );

      const processInstanceId = resp?.data?.id;
      if (!processInstanceId) {
        throw new NotFoundException(
          'Không thể tìm thấy ID khởi tạo của quy trình',
        );
      }

      // 8. Lưu biến Camunda vào SQL
      await this.camundaVariableRepo.save({
        processKey: finalProcessKey,
        processInstanceId,
        variables: body.variables || {},
      });

      return resp.data;
    } catch (err: any) {
      const status = err?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const data = err?.response?.data || {
        message: err.message || 'Error when calling Camunda',
      };
      throw new HttpException({ success: false, camunda: data }, status);
    }
  }

  async startProcessBulk(processKey: string, rows: any[]) {
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('Mảng "rows" không được rỗng.');
    }

    const results = await Promise.allSettled(
      rows.map((row) => this.transformAndProcessRow(processKey, row)),
    );

    let successCount = 0;
    const processedRows = results.map((result, index) => {
      const originalRow = rows[index];
      if (result.status === 'fulfilled') {
        successCount++;
        return {
          ...originalRow,
          status: 'Thành công',
          // camundaResponse: result.value, // Có thể thêm response từ Camunda nếu cần
        };
      } else {
        return {
          ...originalRow,
          status: 'Thất bại',
          error: {
            message: result.reason?.message || 'Lỗi không xác định',
            details: result.reason?.response || result.reason,
          },
        };
      }
    });

    return {
      total: rows.length,
      successCount: successCount,
      failureCount: rows.length - successCount,
      data: processedRows, // Trả về mảng đã được xử lý
    };
  }

  private async transformAndProcessRow(
    processKey: string,
    row: any,
  ): Promise<any> {
    // 1. Lấy mã hồ sơ và chuẩn hóa (loại bỏ dấu nháy đơn nếu có)
    const maHoSo = row['code']?.toString().replace(/^'/, '') || '';
    if (!maHoSo) {
      throw new Error('Bản ghi thiếu "Mã hồ sơ".');
    }

    // 2. Xác định loại đối tượng và mã định danh
    let type = '';
    const variables: any = {};
    if (row['idCard']) {
      type = 'congdan';
      variables.idCard = { value: row['idCard'].toString(), type: 'String' };
    } else if (row['idCard']) {
      type = 'doanhNghiep';
      variables.taxCode = { value: row['idCard'].toString(), type: 'String' };
    } else {
      throw new Error('Bản ghi phải có "Mã công dân" hoặc "Mã doanh nghiệp".');
    }

    // 3. Xây dựng body để gọi API
    const body = {
      type: type,
      userFilters: {
        code: maHoSo,
      },
      variables: {
        ...variables,
        code: { value: maHoSo, type: 'String' },
        documentName: {
          value: row['documentName']?.toString() || '',
          type: 'String',
        },
        documentNumber: {
          value: row['documentNumber']?.toString() || '',
          type: 'String',
        },
        documentType: {
          value: row['documentType']?.toString() || '',
          type: 'String',
        },
        documentDate: {
          value: row['documentDate']?.toString() || '',
          type: 'String',
        },
      },
    };

    // 4. Gọi hàm xử lý cho một bản ghi
    return this.startProcessForward1(processKey, body);
  }

  async getActivityInstances(processInstanceId: string): Promise<any> {
    if (!processInstanceId) {
      throw new BadRequestException('processInstanceId là bắt buộc');
    }

    const url = `${process.env.CAMUNDA_MEDIUM}/history/activity-instance?processInstanceId=${processInstanceId}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let data = response.data;

      // Lọc các phần tử có endTime khác null
      data = data.filter((item) => item.endTime);

      // Sắp xếp theo endTime tăng dần
      data.sort(
        (a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime(),
      );

      return data;
    } catch (err: any) {
      const status = err?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const data = err?.response?.data || {
        message: err.message || 'Lỗi khi gọi Camunda',
      };
      throw new HttpException({ success: false, camunda: data }, status);
    }
  }

  async getDiagramByProcessInstanceId(processInstanceId: string) {
    if (!processInstanceId) {
      throw new HttpException(
        'processInstanceId là bắt buộc',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const CAMUNDA_MEDIUM = process.env.CAMUNDA_MEDIUM?.replace(/\/$/, '');
      if (!CAMUNDA_MEDIUM) {
        throw new HttpException(
          'CAMUNDA_MEDIUM chưa được cấu hình',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // === 1️⃣ Lấy processInstance để có processDefinitionId ===
      const instanceUrl = `${CAMUNDA_MEDIUM}/process-instance/${processInstanceId}`;

      const instanceRes = await axios.get(instanceUrl);
      const processDefinitionId = instanceRes.data.definitionId;
      if (!processDefinitionId) {
        throw new HttpException(
          'Không tìm thấy processDefinitionId',
          HttpStatus.NOT_FOUND,
        );
      }

      // === 2️⃣ Lấy BPMN XML từ processDefinitionId ===
      const xmlUrl = `${CAMUNDA_MEDIUM}/process-definition/${processDefinitionId}/xml`;

      const xmlRes = await axios.get(xmlUrl);
      const bpmnXml = xmlRes.data.bpmn20Xml;
      if (!bpmnXml) {
        throw new HttpException(
          'Không lấy được BPMN XML',
          HttpStatus.NOT_FOUND,
        );
      }

      // === 3️⃣ Lấy activity đang active (History API, unfinished=true) ===
      const historyUrl = `${CAMUNDA_MEDIUM}/history/activity-instance?processInstanceId=${processInstanceId}&unfinished=true`;

      const historyRes = await axios.get(historyUrl);
      const activeActivityIds = historyRes.data.map(
        (act: any) => act.activityId,
      );

      return { bpmnXml, activeActivityIds };
    } catch (err: any) {
      console.error('Error in ProcessService:', err.message);
      throw new HttpException(
        err.response?.data || err.message,
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getTaskLogs(processInstanceId: string) {
    if (!processInstanceId) {
      throw new BadRequestException('processInstanceId là bắt buộc');
    }

    const logs = await this.historyBpmnRepo
      .createQueryBuilder('h')
      .where('h.processInstanceId = :processInstanceId', { processInstanceId })
      .orderBy('h.completedAt', 'ASC')
      .getMany(); // tương đương lean() cho SQL, trả về object thuần

    return logs;
  }

  async getTaskInfo(processKey: string, activityId: string) {
    const CAMUNDA_MEDIUM = process.env.CAMUNDA_MEDIUM?.replace(/\/$/, '');
    try {
      if (!processKey || !activityId) {
        throw new HttpException(
          'processKey và activityId là bắt buộc',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 1️⃣ Lấy process definition
      const { data: def } = await firstValueFrom(
        this.httpService.get(
          `${CAMUNDA_MEDIUM}/process-definition/key/${processKey}`,
        ),
      );
      const defId = def.id;

      // 2️⃣ Lấy XML BPMN
      const { data: xmlRes } = await firstValueFrom(
        this.httpService.get(
          `${CAMUNDA_MEDIUM}/process-definition/${defId}/xml`,
        ),
      );
      const xml = xmlRes.bpmn20Xml;

      // 3️⃣ Parse XML
      const parsed = await parseStringPromise(xml, {
        explicitArray: false,
        ignoreAttrs: false,
      });
      const definitions = parsed['bpmn:definitions'];
      if (!definitions)
        throw new Error('Không tìm thấy <bpmn:definitions> trong XML');

      const processList = Array.isArray(definitions['bpmn:process'])
        ? definitions['bpmn:process']
        : [definitions['bpmn:process']];

      let foundTask: TaskInfo | null = null;

      // 4️⃣ Duyệt tất cả process và task types
      for (const proc of processList) {
        const taskTypes = [
          'bpmn:userTask',
          'bpmn:serviceTask',
          'bpmn:scriptTask',
          'bpmn:businessRuleTask',
          'bpmn:manualTask',
        ];

        for (const type of taskTypes) {
          const tasks = proc[type]
            ? Array.isArray(proc[type])
              ? proc[type]
              : [proc[type]]
            : [];
          const task = tasks.find((t) => t.$?.id === activityId);
          if (task) {
            foundTask = { ...task, type };
            break;
          }
        }
        if (foundTask) break;
      }

      if (!foundTask)
        throw new Error(
          `Không tìm thấy task id=${activityId} trong process ${processKey}`,
        );

      // 5️⃣ Lấy formFields nếu có
      const extension = foundTask['bpmn:extensionElements'];
      const fields = extension?.['camunda:formData']?.['camunda:formField'];

      let id: string | null = null;

      if (fields) {
        const firstField = Array.isArray(fields) ? fields[0] : fields;
        id = firstField.$?.id
          ? firstField.$.id.replace(/_\d+$/, '').replace(/\(\d+\)$/, '') // bỏ _5 hoặc (5)
          : null;
      }

      // 6️⃣ Trả về JSON
      return {
        // processKey,
        // activityId,
        // type: foundTask.type || null,
        // name: foundTask.$?.name || null,
        // formKey: foundTask.$?.['camunda:formKey'] || null,
        // assignee: foundTask.$?.['camunda:assignee'] || null,
        // candidateGroups: foundTask.$?.['camunda:candidateGroups'] || null,
        // documentation: foundTask.$?.['bpmn:documentation'] || null,
        id,
      };
    } catch (err: any) {
      console.error('❌ Lỗi lấy task info:', err.message || err);
      throw new HttpException(
        err.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  // ...existing code...

  async findByRelatedProcess(
    relatedProcess: string,
    queryParams: QueryParams,
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    data: BpmnDesignEntity[];
    filter: any;
  }> {
    const {
      page = 1,
      limit = 25,
      sort = '-createdAt',
      isStamp,
      ...filters
    } = queryParams;

    if (!areFiltersValid(filters)) {
      throw new BadRequestException('Tìm kiếm không được chứa ký tự đặc biệt');
    }

    const pageNum = Math.max(parseInt(page as any, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit as any, 10) || 25, 1);
    const skip = (pageNum - 1) * limitNum;

    const query = this.bpmnDesignRepo.createQueryBuilder('design');

    // Luôn chỉ lấy bản ghi active
    query.andWhere('design.status = :status', { status: STATUS.ACTIVED });

    // Tìm kiếm theo related_processes (JSON column)
    // SQL Server: dùng LIKE với JSON string
    query.andWhere('design.related_processes LIKE :relatedProcess', {
      relatedProcess: `%"${relatedProcess}"%`,
    });

    // Áp dụng các filter khác
    if (Object.keys(filters).length > 0) {
      if (filters.name) {
        query.andWhere('design.name COLLATE Latin1_General_CI_AI LIKE :name', { name: `%${filters.name}%` });
      }
      if (filters.description) {
        query.andWhere('design.description COLLATE Latin1_General_CI_AI LIKE :desc', {
          desc: `%${filters.description}%`,
        });
      }
      if (filters.processKey) {
        query.andWhere('design.processKey = :processKey', {
          processKey: filters.processKey,
        });
      }
    }

    // Ưu tiên quy trình SOANTHAO_PHATHANH_VBD lên đầu
    const PRIORITY_PROCESS_KEY = 'SOANTHAO_PHATHANH_VBD';
    query.addOrderBy(
      `CASE WHEN design.processKey = '${PRIORITY_PROCESS_KEY}' THEN 0 ELSE 1 END`,
      'ASC',
    );

    // Secure sorting (dung shared utility)
    const sortResult = validateAndParseSortParam(sort);
    (Object.entries(sortResult) as [string, 'ASC' | 'DESC'][]).forEach(([key, order]) => {
      query.addOrderBy(`design.${key}`, order);
    });

    if (isStamp !== undefined && isStamp !== null && isStamp !== '') {
      // Fetch all matching records from DB without SQL pagination
      // Need to SELECT base64_file to check stamp property
      query.addSelect('design.base64File');
      const allData = await query.getMany();

      const filterVal = String(isStamp).toLowerCase().trim();

      // Filter in-memory
      const filteredData = allData.filter((entity) => {
        const hasProperty = hasStampPropertyDeclared(entity.base64File);
        if (filterVal === 'true' || filterVal === '1') {
          return hasProperty;
        } else if (filterVal === 'false' || filterVal === '0') {
          return !hasProperty;
        }
        return true; // if unknown filter value, do not filter out
      });

      // Ưu tiên quy trình SOANTHAO_PHATHANH_VBD lên đầu (in-memory sort cho nhánh isStamp)
      filteredData.sort((a, b) => {
        const PRIORITY_PROCESS_KEY = 'SOANTHAO_PHATHANH_VBD';
        const aPriority = a.processKey === PRIORITY_PROCESS_KEY ? 0 : 1;
        const bPriority = b.processKey === PRIORITY_PROCESS_KEY ? 0 : 1;
        return aPriority - bPriority;
      });

      const total = filteredData.length;
      const paginatedData = filteredData.slice(skip, skip + limitNum);

      // Clean up base64File so we don't return large payloads
      paginatedData.forEach((entity) => {
        delete entity.base64File;
      });

      return {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        data: paginatedData,
        filter: { ...filters, relatedProcess, isStamp },
      };
    }

    const [data, total] = await query
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    return {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      data,
      filter: { ...filters, relatedProcess },
    };
  }

  // ...existing code...
}
