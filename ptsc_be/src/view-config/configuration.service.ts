import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateConfigurationDto } from './dto/create-view-config.dto';
import { UpdateConfigurationDto } from './dto/update-view-config.dto';
import { areFiltersValid, ReturnError } from 'src/utils/util';
import { STATUS } from 'src/variables/CONST_STATUS';
import { ViewConfigEntity } from './entities/view-config.entity';
import { In, Like, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { InjectRepository } from '@nestjs/typeorm';
import { FeatureManagementService } from 'src/feature-management/feature-management.service';

@Injectable()
export class ConfigurationService {
  constructor(
    @InjectRepository(ViewConfigEntity, 'mssqlConnection')
    private viewConfigRepository: Repository<ViewConfigEntity>,
    private featureManagementService: FeatureManagementService,
  ) { }
  private filterFieldsCache = new Map< string, { dbKeys: string[]; aliases: Record<string, string>; allFilterFields: string[]; expireAt: number; } >();
  async onModuleInit() {
    setInterval(() => {
      const now = Date.now();

      for (const [key, value] of this.filterFieldsCache.entries()) {
        if (value.expireAt <= now) {
          this.filterFieldsCache.delete(key);
        }
      }
    }, 60 * 1000); // check mỗi 1 phút
  }
  async create(createConfigurationDto: CreateConfigurationDto): Promise<ViewConfigEntity> {
    const { code } = createConfigurationDto;

    // 1. Kiểm tra trùng code
    const existingConfig = await this.viewConfigRepository.findOne({ where: { code, status: STATUS.ACTIVED } });
    if (existingConfig) {
      throw new BadRequestException(`Configuration với code '${code}' đã tồn tại.`);
    }

    // 2. Tạo mới nếu không trùng
    const newConfig = this.viewConfigRepository.create({
      ...createConfigurationDto,
      field: createConfigurationDto.field ? JSON.stringify(createConfigurationDto.field) : undefined,
    });

    return this.viewConfigRepository.save(newConfig);
  }

  async findAll(queryParams: any): Promise<unknown> {
    try {
      const { page, limit, sort = '-createdAt', ...filters } = queryParams;
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 50;
      const skip = (pageNum - 1) * limitNum;

      if (!areFiltersValid(filters)) {
        return {
          success: false,
          message: `Tìm kiếm không được chứa ký tự đặc biệt`,
        };
      }

      const where: any = { status: STATUS.ACTIVED };
      const searchTerm = filters.code;

      if (searchTerm && filters.name && searchTerm === filters.name) {
        where.code = Like(`%${searchTerm}%`);
        where.name = Like(`%${searchTerm}%`);
        delete filters.code;
        delete filters.name;
      } else {
        for (const key in filters) {
          if (Object.prototype.hasOwnProperty.call(filters, key)) {
            where[key] = Like(`%${filters[key]}%`);
          }
        }
      }

      const [data, totalRecords] = await this.viewConfigRepository.findAndCount({
        where,
        order: this.parseSort(sort),
        take: limitNum,
        skip: skip,
      });

      const parsedData = data.map(item => ({
        ...item,
        field: item.field ? (() => {
          try {
            return JSON.parse(item.field);
          } catch (error) {
            throw new Error(`Failed to parse field for item with id ${item.id}: ${error.message}`);
          }
        })() : [],
      }));

      const totalPages = Math.ceil(totalRecords / limitNum);

      return {
        total: totalRecords,
        page: pageNum,
        limit: limitNum,
        totalPages,
        data: parsedData,
        filter: where,
      };
    } catch (error) {
      const errorResponse = ReturnError(error);
      return errorResponse.body;
    }
  }

  private parseSort(sort: string): { [key: string]: 'ASC' | 'DESC' } {
    const [field, order] = sort.startsWith('-')
      ? [sort.substring(1), 'DESC']
      : [sort, 'ASC'];
    return { [field]: order as 'ASC' | 'DESC' };
  }

  async findById(id: string): Promise<ViewConfigEntity> {
    const config = await this.viewConfigRepository.findOneBy({ id });
    if (!config) {
      throw new NotFoundException(`Configuration with id ${id} not found`);
    }
    // Parse 'field' from JSON string to object
    if (config.field) {
      config.field = JSON.parse(config.field);
    }
    return config;
  }

  async findOne(code: string): Promise<ViewConfigEntity | null> {
    const config = await this.viewConfigRepository.findOne({ where: { code } });
    if (config && config.field) {
      config.field = JSON.parse(config.field);
    }
    return config;
  }

  async update(id: string, updateDto: UpdateConfigurationDto): Promise<ViewConfigEntity[]> {
    const config = await this.viewConfigRepository.findOneBy({ id });
    if (!config) {
      throw new NotFoundException(`Không tìm thấy configuration với id: ${id}`);
    }

    const { field, ...restOfDto } = updateDto;
    const updatePayload: QueryDeepPartialEntity<ViewConfigEntity> = { ...restOfDto };

    if (field) {
      updatePayload.field = JSON.stringify(field);
    }

    await this.viewConfigRepository.update(id, updatePayload);

    // Trả về toàn bộ bảng có status = 1
    const listActive = await this.viewConfigRepository.find({ where: { status: STATUS.ACTIVED } });
    return listActive.map(item => ({
      ...item,
      field: item.field ? JSON.parse(item.field) : []
    }));
  }

  async remove(ids: string[]): Promise<{ modifiedCount: number }> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('ID không được để trống');
    }

    const result = await this.viewConfigRepository.update(
      { id: In(ids) },
      { status: STATUS.DELETED },
    );

    if (result.affected === 0) {
      throw new NotFoundException(`Không tìm thấy configuration nào với các id đã cho.`);
    }
    return { modifiedCount: result.affected || 0 };
  }

  async removeByCode(codes: string[]): Promise<{ modifiedCount: number }> {
    if (!codes || codes.length === 0) {
      throw new BadRequestException('Code không được để trống');
    }

    const result = await this.viewConfigRepository.update(
      { code: In(codes) },
      { status: STATUS.DELETED },
    );

    if (result.affected === 0) {
      throw new NotFoundException(`Không tìm thấy configuration nào với các id đã cho.`);
    }
    return { modifiedCount: result.affected || 0 };
  }

  async updateForm(code: string, updateDto: UpdateConfigurationDto): Promise<ViewConfigEntity> {
    const config = await this.viewConfigRepository.findOne({ where: { code } });
    if (!config) {
      throw new NotFoundException(`Không tìm thấy configuration với code: ${code}`);
    }

    const updatePayload: QueryDeepPartialEntity<ViewConfigEntity> = {};

    // Lọc các trường undefined
    Object.keys(updateDto).forEach(key => {
      if (updateDto[key] !== undefined) {
        updatePayload[key] = updateDto[key];
      }
    });

    if (updateDto.field) {
      updatePayload.field = JSON.stringify(updateDto.field);
    }

    await this.viewConfigRepository.update({ code }, updatePayload);
    const updatedConfig = await this.findOne(code);
    if (!updatedConfig) {
      throw new NotFoundException(`Không tìm thấy configuration với code: ${code} sau khi cập nhật.`);
    }
    return updatedConfig;
  }

  async findOneByProcessId(processId: string): Promise<ViewConfigEntity> {
    const config = await this.viewConfigRepository.findOne({
      where: {
        processID: processId,
        status: STATUS.ACTIVED,
      }
    });

    if (!config) {
      throw new NotFoundException(`Không tìm thấy configuration với processId: ${processId}`);
    }

    if (config.field) {
      config.field = JSON.parse(config.field);
    }

    return config;
  }

  async findOneByCodeAndProcessId(code: string, processId: string): Promise<ViewConfigEntity> {
    const config = await this.viewConfigRepository.findOne({
      where: {
        code,
        processID: processId,
        status: STATUS.ACTIVED,
      },
    });

    if (!config) {
      throw new NotFoundException(`Không tìm thấy configuration với code: ${code} và processId: ${processId}`);
    }

    if (config.field) {
      config.field = JSON.parse(config.field);
    }

    return config;
  }

  public async buildSelectFieldsNew(
    tablePrefix = 'incomming_documents',
    excludeKeys: string[] = [],
    processFn?: string,
  ): Promise<{
    dbKeys: string[];
    aliases: Record<string, string>;
    allViewFields: string[];
  }> {
    const viewConfigCode = processFn
      ? (await this.featureManagementService.getViewConfigCodeByProcessFn(processFn))
      : null;
    let config;
    if (viewConfigCode) {
      config = await this.viewConfigRepository.findOne({
        where: { code: viewConfigCode, status: STATUS.ACTIVED },
      });
    }

    const typeFilters: Record<string, string[]> = {
      incomming_documents: [
        "document_id", "status_code", "created_at", "updated_at", "book_document_id",
        "abstract_note", "to_book", "sender_unit", "receiver_unit", "document_date",
        "receive_date", "to_book_date", "deadline", "second_book", "receive_method",
        "private_level", "urgency_level", "document_type", "document_field", "signer",
        "to_book_code", "fileids", "status", "parent_doc", "type_process_doc", "bpmn_version",
        "copy_to_internal", "resolution_deadline", "copy_count", "page_count", "view_group", "directive_comment"
      ],
      outgoing_documents: [
        "document_id", "status_code", "sender_unit", "drafter", "document_type",
        "urgency_level", "private_level", "document_field", "report_signer",
        "report_document_symbol", "to_book_text_symbols", "viewers",
        "deadline_reply", "abstract_note", "recipient_ids", "internal_receiving_unit",
        "reply_incomming_doc", "created_at", "updated_at", "draft_signer", "book_document_id",
        "status", "code_commanders", "commanders", "current_note", "to_book", "release_no",
        "release_date", "text_symbols", "doc_work_files", "doc_proposal", "doc_draft",
        "doc_attachments", "doc_recall", "doc_replacement", "doc_answer", "external_receiving_unit",
        "internal_receiving_dept", "processor", "files", "type_doc", "bpmn_version", "vieweds",
        "type_of_process", "know_receivers", "replaced_documents", "replaced", "document_date",
        "is_stamp", "req_sign_format_draft"
      ],
      authority_documents: [
        "id", "author", "authorized", "stage", "status", "files", "created_at", "updated_at",
        "start_date", "end_date", "original_end_date", "filter"
      ],
      group_users: [
        "id", "name", "code", "type", "userId", 'user_id', "status", "order", "description",
        "permissionsId", "roleType", "permissions_id", "role_type", "roles", "roles_dynamic", "hrm_job_id", "createdAt", "updatedAt", "created_at", "updated_at"
      ],
    };

    let viewFields: string[] = [];

    if (config?.field) {
      let rawFields: any[] = [];
      if (Array.isArray(config.field)) rawFields = config.field;
      else if (typeof config.field === 'string') {
        try { rawFields = JSON.parse(config.field); } catch { }
      }

      viewFields = rawFields
        .map(f => (typeof f?.name === 'string' ? f.name.trim() : ''))
        .filter(Boolean);
    } else {
      // fallback nếu không có config → dùng typeFilters
      viewFields = (typeFilters[tablePrefix] || []).map(f =>
        f.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      );
    }

    const addDocumentFields = ['incomming_documents', 'outgoing_documents', 'authority_documents'];
    if (addDocumentFields.includes(tablePrefix)) {
      if (!viewFields.includes('documentId')) viewFields.push('documentId');
      if (!viewFields.includes('bpmnVersion')) viewFields.push('bpmnVersion');
      if (!viewFields.includes('replaced')) viewFields.push('replaced');
    }
    if (tablePrefix === 'outgoing_documents') {
      if (!viewFields.includes('internalReceivingDept')) {
        viewFields.push('internalReceivingDept');
        viewFields.push('internal_receiving_unit');
      }
      if (!viewFields.includes('isStamp')) viewFields.push('isStamp');
      if (!viewFields.includes('reqSignFormatDraft')) viewFields.push('reqSignFormatDraft');
    }

    const allowedFields = typeFilters[tablePrefix] || [];

    const dbKeys: string[] = [];
    const aliases: Record<string, string> = {};
    const seen = new Set<string>();

    const allViewFields = [...viewFields];

    for (const alias of viewFields) {
      const safeAlias = typeof alias === 'string' ? alias : String(alias || '');

      // convert sang snake_case để so với typeFilters
      const snakeAlias = safeAlias.replace(/([A-Z])/g, '_$1').toLowerCase();

      // --- CHỈ CHỌN NHỮNG FIELD ĐƯỢC PHÉP ---
      if (!allowedFields.includes(snakeAlias)) continue;

      // alias vẫn giữ camelCase, dbKey snake_case
      if (!config) {
        // Thêm cả snake_case và camelCase
        aliases[snakeAlias] = safeAlias;
        aliases[safeAlias] = safeAlias;

        if (!allViewFields.includes(snakeAlias)) allViewFields.push(snakeAlias);
        if (!allViewFields.includes(safeAlias)) allViewFields.push(safeAlias);
      } else {
        // Khi có config → alias giữ camelCase
        aliases[snakeAlias] = safeAlias;
      }

      if (excludeKeys.includes(safeAlias) || seen.has(snakeAlias)) continue;

      dbKeys.push(`${tablePrefix}.${snakeAlias}`);
      seen.add(snakeAlias);
    }

    return { dbKeys, aliases, allViewFields };
  }

  public async buildFilterFieldsMeetings(
    tablePrefix = 'meetings',
    excludeKeys: string[] = [],
    processFn?: string,
    existingFeature?: any,
  ): Promise<{
    dbKeys: string[];
    aliases: Record<string, string>;
    allFilterFields: string[];
  }> {
    const cacheKey = JSON.stringify({
      tablePrefix,
      excludeKeys,
      processFn,
      featureId: existingFeature?.id ?? null,
    });

    if (this.filterFieldsCache.has(cacheKey)) {
      return this.filterFieldsCache.get(cacheKey)!;
    }
    // ===================== GET CONFIG =====================
    const feature = existingFeature || (processFn
      ? await this.featureManagementService.findByCode(processFn)
      : null);


    // ===================== ALLOWED FIELDS =====================
    const typeFilters: Record<string, string[]> = {
      meetings: [
        "id", "title", "meeting_type", "priority", "meeting_date", "meeting_time",
        "meeting_mode", "room_ids", "status", "status_code", "bpmn_version", "content",
        "chairman_id", "secretary_id", "direct_command", "online_meeting_id",
        "created_at", "updated_at", "conclusion", "created_by", "attendance_locked", "meeting_state",
        "started_at", "ended_at", "timezone", "created_at", "updated_at", "is_company", "organizational_unit", "location"
      ],
      online_meetings: ["platform", "meeting_link", "passcode"],
      meeting_units: ["unit_id", "meeting_id"],
      meeting_participants: ["user_id", "seat_number", "room_id", "meeting_unit_id"],
      meeting_recurrences: [
        "type", "form", "days_of_week", "days_of_month", "month_in_quarter",
        "start_date", "end_date", "end_month", "end_year", "meeting_id"
      ],
      meeting_tasks: [
        "document_name", "attachable_type", "attachable_id", "meeting_id",
        "deadline", "content"
      ],
      meeting_rooms: [
        "id", "name", "location", "capacity", "status", "stage",
        "layout_blocks", "layout_seats", "layout_rows", "layout_type",
        "available_from", "created_at", "updated_at", "image", "amenities",
        "total_seating", "order"
      ],
      amenities: [
        "id", "name", "status", "note",
        "created_at", "updated_at",
      ],
      lds: [
        "id", "title", "week", "month", "year", "schedule_date", "schedule_time", "status", "created_at", "updated_at",
        "name", "note", "created_by", "from_date", "to_date"
      ],
      tws: [
        "id", "leader", "schedule_type", "calendar_format", "work_date", "from_date",
        "to_date", "location", "content", "morning_location", "morning_content",
        "afternoon_location", "afternoon_content", "status", "created_by", "created_at", "updated_at"
      ]
    };

    // ===================== PARSE FILTER FIELDS =====================
    let filterFields: string[] = [];
    if (feature?.valueField?.field) {
      let rawFields: any[] = [];
      if (Array.isArray(feature.valueField.field)) rawFields = feature.valueField.field;
      else if (typeof feature.valueField.field === 'string') {
        try { rawFields = JSON.parse(feature.valueField.field); } catch { }
      }

      filterFields = rawFields
        .map(f => (typeof f?.name === 'string' ? f.name.trim() : ''))
        .filter(Boolean);
    } else {
      // fallback: dùng typeFilters
      const allowedKeys = typeFilters[tablePrefix] || [];
      filterFields = allowedKeys.map(f =>
        f.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      );
    }

    if (!filterFields.includes('id')) filterFields.push('id');
    if (!filterFields.includes('bpmnVersion')) filterFields.push('bpmnVersion');
    if (!filterFields.includes('chairmanId')) filterFields.push('chairmanId');
    if (!filterFields.includes('secretaryId')) filterFields.push('secretaryId');
    if (!filterFields.includes('meetingState')) filterFields.push('meetingState');
    if (!filterFields.includes('location')) filterFields.push('location');
    if (!filterFields.includes('meetingMode')) filterFields.push('meetingMode');

    // ===================== BUILD KEYS & ALIASES =====================
    const dbKeys: string[] = [];
    const aliases: Record<string, string> = {};
    const seen = new Set<string>();
    const allFilterFields = [...filterFields];

    const allowedFields = typeFilters[tablePrefix] || [];

    for (const alias of filterFields) {
      const safeAlias = String(alias || '');
      const snakeAlias = safeAlias.replace(/([A-Z])/g, '_$1').toLowerCase();

      if (!allowedFields.includes(snakeAlias)) continue;

      // map alias (camelCase) → dbKey (snake_case)
      aliases[snakeAlias] = safeAlias;
      aliases[safeAlias] = safeAlias;

      if (excludeKeys.includes(safeAlias) || seen.has(snakeAlias)) continue;

      dbKeys.push(`${tablePrefix}.${snakeAlias}`);
      seen.add(snakeAlias);
    }

    // ===================== SPECIAL FIELDS =====================
    const specialFields = ["currentDate", "currentMonth", "currentWeek"];
    specialFields.forEach(field => {
      if (!allFilterFields.includes(field)) {
        allFilterFields.push(field);
        const snakeField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        allFilterFields.push(snakeField);
        aliases[field] = field;
        aliases[snakeField] = field;
      }
    });
    this.filterFieldsCache.set(cacheKey, { dbKeys, aliases, allFilterFields, expireAt: Date.now() + 600000 });
    return { dbKeys, aliases, allFilterFields };
  }


  public async buildFilterFieldsArchiveRecord(
    tablePrefix = 'archive_records',
    excludeKeys: string[] = [],
    processFn?: string,
    existingFeature?: any,
  ): Promise<{
    dbKeys: string[];
    aliases: Record<string, string>;
    allFilterFields: string[];
  }> {
    const cacheKey = JSON.stringify({
      tablePrefix,
      excludeKeys,
      processFn,
      featureId: existingFeature?.id ?? null,
    });

    if (this.filterFieldsCache.has(cacheKey)) {
      return this.filterFieldsCache.get(cacheKey)!;
    }
    // ===================== GET CONFIG =====================
    const feature = processFn
      ? await this.featureManagementService.findByCode(processFn)
      : null;


    // ===================== ALLOWED FIELDS =====================
    const typeFilters: Record<string, string[]> = {
      archive_records: [
        "id", "title", "category", "file_code", "related_department", "formation_year",
        "retention_period", "usage_mode", "language", "start_date", "end_date", "notes",
        "status", "record_state", "created_at", "updated_at",
      ]
    };

    let filterFields: string[] = [];
    if (feature?.valueField?.field) {
      let rawFields: any[] = [];
      if (Array.isArray(feature.valueField.field)) rawFields = feature.valueField.field;
      else if (typeof feature.valueField.field === 'string') {
        try { rawFields = JSON.parse(feature.valueField.field); } catch { }
      }

      filterFields = rawFields
        .map(f => (typeof f?.name === 'string' ? f.name.trim() : ''))
        .filter(Boolean);
    } else {
      // fallback: dùng typeFilters
      const allowedKeys = typeFilters[tablePrefix] || [];
      filterFields = allowedKeys.map(f =>
        f.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      );
    }

    if (!filterFields.includes('id')) filterFields.push('id');
    if (!filterFields.includes('bpmnVersion')) filterFields.push('bpmnVersion');

    // ===================== BUILD KEYS & ALIASES =====================
    const dbKeys: string[] = [];
    const aliases: Record<string, string> = {};
    const seen = new Set<string>();
    const allFilterFields = [...filterFields];

    const allowedFields = typeFilters[tablePrefix] || [];

    for (const alias of filterFields) {
      const safeAlias = String(alias || '');
      const snakeAlias = safeAlias.replace(/([A-Z])/g, '_$1').toLowerCase();

      if (!allowedFields.includes(snakeAlias)) continue;

      // map alias (camelCase) → dbKey (snake_case)
      aliases[snakeAlias] = safeAlias;
      aliases[safeAlias] = safeAlias;

      if (excludeKeys.includes(safeAlias) || seen.has(snakeAlias)) continue;

      dbKeys.push(`${tablePrefix}.${snakeAlias}`);
      seen.add(snakeAlias);
    }
    this.filterFieldsCache.set(cacheKey, { dbKeys, aliases, allFilterFields, expireAt: Date.now() + 600000 });
    return { dbKeys, aliases, allFilterFields };
  }




  public async buildFilterFieldsRecordExploitationRequests(
    tablePrefix = 'record_exploitation_requests',
    excludeKeys: string[] = [],
    processFn?: string,
    existingFeature?: any,
  ): Promise<{
    dbKeys: string[];
    aliases: Record<string, string>;
    allFilterFields: string[];
  }> {
    const cacheKey = JSON.stringify({
      tablePrefix,
      excludeKeys,
      processFn,
      featureId: existingFeature?.id ?? null,
    });

    if (this.filterFieldsCache.has(cacheKey)) {
      return this.filterFieldsCache.get(cacheKey)!;
    }
    // ===================== GET CONFIG =====================
    const feature = processFn
      ? await this.featureManagementService.findByCode(processFn)
      : null;


    // ===================== ALLOWED FIELDS =====================
    const typeFilters: Record<string, string[]> = {
      record_exploitation_requests: [
        'id', 'request_code', 'requester_name', 'department', 'purpose',
        'extraction_method', 'use_from_date', 'use_to_date', 'receiver_email',
        'note', 'explanation_document_id', 'created_date', 'status_code', 'status',
        'mining_state', 'created_by', 'updated_at', 'created_at'
      ],
      destroy_records: [
        'id', 'destroy_batch_code', 'destroy_batch_name', 'created_at', 'destroy_reason', 'total_destroyed_records', 'status', 'profile_ids',
      ],
    };

    let filterFields: string[] = [];
    if (feature?.valueField?.field) {
      let rawFields: any[] = [];
      if (Array.isArray(feature.valueField.field)) rawFields = feature.valueField.field;
      else if (typeof feature.valueField.field === 'string') {
        try { rawFields = JSON.parse(feature.valueField.field); } catch { }
      }

      filterFields = rawFields
        .map(f => (typeof f?.name === 'string' ? f.name.trim() : ''))
        .filter(Boolean);
    } else {
      // fallback: dùng typeFilters
      const allowedKeys = typeFilters[tablePrefix] || [];
      filterFields = allowedKeys.map(f =>
        f.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      );
    }

    if (!filterFields.includes('id')) filterFields.push('id');
    if (!filterFields.includes('bpmnVersion')) filterFields.push('bpmnVersion');

    // ===================== BUILD KEYS & ALIASES =====================
    const dbKeys: string[] = [];
    const aliases: Record<string, string> = {};
    const seen = new Set<string>();
    const allFilterFields = [...filterFields];

    const allowedFields = typeFilters[tablePrefix] || [];

    for (const alias of filterFields) {
      const safeAlias = String(alias || '');
      const snakeAlias = safeAlias.replace(/([A-Z])/g, '_$1').toLowerCase();

      if (!allowedFields.includes(snakeAlias)) continue;

      // map alias (camelCase) → dbKey (snake_case)
      aliases[snakeAlias] = safeAlias;
      aliases[safeAlias] = safeAlias;

      if (excludeKeys.includes(safeAlias) || seen.has(snakeAlias)) continue;

      dbKeys.push(`${tablePrefix}.${snakeAlias}`);
      seen.add(snakeAlias);
    }
    this.filterFieldsCache.set(cacheKey, { dbKeys, aliases, allFilterFields, expireAt: Date.now() + 600000 });
    return { dbKeys, aliases, allFilterFields };
  }


  public async buildFilterFieldsVehicleRegistrations(
    tablePrefix = 'vehicle_registrations',
    excludeKeys: string[] = [],
    processFn?: string,
    existingFeature?: any,
  ): Promise<{
    dbKeys: string[];
    aliases: Record<string, string>;
    allFilterFields: string[];
  }> {
    const cacheKey = JSON.stringify({
      tablePrefix,
      excludeKeys,
      processFn,
      featureId: existingFeature?.id ?? null,
    });

    if (this.filterFieldsCache.has(cacheKey)) {
      return this.filterFieldsCache.get(cacheKey)!;
    }
    // ===================== GET CONFIG =====================
    const feature = processFn ? await this.featureManagementService.findByCode(processFn) : null;

    const typeFilters: Record<string, string[]> = {
      vehicle_registrations: [
        'id', 'name', 'request_type', 'priority', 'is_important_guest', 'passenger_count', 'departure_time',
        'return_time', 'departure_point', 'destination', 'contact_person', 'contact_phone', 'total_people',
        'purpose', 'notes', 'status', 'bpmn_version', 'timezone', 'vehicle_state', 'status_code',
        'request_submitted_at', 'waiting_confirmed_at', 'created_at', 'updated_at','department','trip_duration_minutes',
        'driver_ids','car_ids','coordination_information', 'created_by',
      ],
      list_cars: [
        'id', 'license_plate', 'car_type', 'brand', 'seat_count', 'manager', 'status_car',
        'note', 'status', 'created_at', 'updated_at', 'maintenance', 'total_trips',
        'booking_available',
      ],
      list_drivers: [
        'id', 'full_name', 'phone_number', 'id_card', 'email', 'address', 'license_number',
        'license_class', 'license_issued_date', 'note', 'status', 'created_at', 'updated_at',
        'driver_id', 'total_trips', 'experience_years', 'booking_available', 
      ],
    };

    let filterFields: string[] = [];
    if (feature?.valueField?.field) {
      let rawFields: any[] = [];
      if (Array.isArray(feature.valueField.field)) rawFields = feature.valueField.field;
      else if (typeof feature.valueField.field === 'string') {
        rawFields = JSON.parse(feature.valueField.field);
      }

      filterFields = rawFields
        .map(f => (typeof f?.name === 'string' ? f.name.trim() : ''))
        .filter(Boolean);
    } else {
      // fallback: dùng typeFilters
      const allowedKeys = typeFilters[tablePrefix] || [];
      filterFields = allowedKeys.map(f =>
        f.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      );
    }

    if (!filterFields.includes('id')) filterFields.push('id');
    if (!filterFields.includes('bpmnVersion')) filterFields.push('bpmnVersion');
    if (!filterFields.includes('timezone')) filterFields.push('timezone');
    if (!filterFields.includes('createdAt')) filterFields.push('createdAt');
    if (!filterFields.includes('updatedAt')) filterFields.push('updatedAt');

    const dbKeys: string[] = [];
    const aliases: Record<string, string> = {};
    const seen = new Set<string>();
    const allFilterFields = [...filterFields];

    const allowedFields = typeFilters[tablePrefix] || [];

    for (const alias of filterFields) {
      const safeAlias = String(alias || '');
      const snakeAlias = safeAlias.replace(/([A-Z])/g, '_$1').toLowerCase();

      if (!allowedFields.includes(snakeAlias)) continue;

      // map alias (camelCase) → dbKey (snake_case)
      aliases[snakeAlias] = safeAlias;
      aliases[safeAlias] = safeAlias;

      if (excludeKeys.includes(safeAlias) || seen.has(snakeAlias)) continue;

      dbKeys.push(`${tablePrefix}.${snakeAlias}`);
      seen.add(snakeAlias);
    }
    this.filterFieldsCache.set(cacheKey, { dbKeys, aliases, allFilterFields, expireAt: Date.now() + 600000 }); // 10 minutes
    return { dbKeys, aliases, allFilterFields };
  }

}