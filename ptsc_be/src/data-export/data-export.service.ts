/**
 * ============================================================
 * FILE 8/10: data-export.service.ts
 *
 * Orchestrator chính — KHÔNG chứa logic Excel/PDF/transform.
 * Chỉ điều phối:
 *   getFileExportList → resolve data + columns → gọi builder
 *   exportBody        → delegate sang service tương ứng
 *
 * Hai luồng export:
 *   A) processFn      → getColumnsByProcessFn + getListByProcessFn
 *   B) viewConfigCode → getColumnsByViewConfig + getListByViewConfig
 *
 * Hai cách build PDF (chọn 1 khi cần):
 *   - PdfNativeBuilder   : build trực tiếp bằng pdfkit
 *   - PdfConvertBuilder  : build Excel → gửi APP_CONVERT_URL convert
 * ============================================================
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';

import { DataExportRepository } from './data-export.repository';
import { ExcelBuilder } from './builders/excel.builder';
import { PdfNativeBuilder } from './builders/pdf-native.builder';
import { PdfConvertBuilder } from './builders/pdf-convert.builder';
import { WordBuilder } from './builders/word.builder';

import { ExportType } from './dtos/data-export.dto';
import {
  IParsedApiUrl,
  IListHandler,
  IColumnConfig,
  IExportBuildOptions,
  IExportFileResult,
  IListResult,
} from './interfaces/data-export.interface';
import { ExcelBuilderOption } from './builders/excel-option.builder';

const VIEW_CONFIG_MAP: Record<string, { service: string; typeHandle: IListHandler['typeHandle']; method: string; inforUser?: any }> = {
  COLUMNBROWSINGPROCESS: { service: 'news-statistics', typeHandle: 'object', method: 'getWorkflowStats' },
  COLUMNMOSTVIEWEDNEWS: { service: 'news-statistics', typeHandle: 'object', method: 'getTopViewedNews' },
  COLUMNSTATISTICSBYDEPARTMENT: { service: 'news-statistics', typeHandle: 'object', method: 'getStatsByDepartment' },
  COLUMNSTATISTICSBYTOPIC: { service: 'news-statistics', typeHandle: 'object', method: 'getStatsByTopic' },
  COLUMNSTATISTICSOVERTIME: { service: 'news-statistics', typeHandle: 'object', method: 'getStatsByTime' },
  INCOMMING: { service: 'incoming', typeHandle: 'dtoListRecall', method: 'listReplacedDocuments' },
  REPLACEDINCOMING: { service: 'incoming', typeHandle: 'dtoListRecall', method: 'listReplacedDocuments' },
  OUTGOING: { service: 'outgoing-documents', typeHandle: 'dtoListVanBanDi', method: 'listOutgoingByIncomingId' },
  PASSPORT_BORROW_RETURN_HISTORY: { service: 'passport-statistics', typeHandle: 'object', method: 'getBorrowHistory' },
  PASSPORT_MANAGED_LIST: { service: 'passport-statistics', typeHandle: 'object', method: 'getManagedPassports' },
  PASSPORT_STAT_BY_DEPARTMENT: { service: 'passport-statistics', typeHandle: 'object', method: 'getDeptStats' },
  PASSPORT_TRIP_STAT_BY_DEPARTMENT: { service: 'passport-statistics', typeHandle: 'object', method: 'getBusinessTrips' },
  COLUMNLISTJOBSTATUS: { service: 'project-statistics', typeHandle: 'object', method: 'getProjectSummary' },
  COLUMNLISTJOBPROGRESS: { service: 'project-statistics', typeHandle: 'object', method: 'getProjectTasks' },
  COLUMNLISTJOBPERFORMANCE: { service: 'project-statistics', typeHandle: 'object', method: 'getMemberPerformance' },
  QUANLYCV: { service: 'tasks', typeHandle: 'dtoListQuanLyCV', method: 'findOneSelectFormDoc' },
  RECORDACCESSSTATS: { service: 'record-access', typeHandle: 'dto', method: 'reportArchiveAccessStatistics' },
  RECORDBYDEPARTMENT: { service: 'record-access', typeHandle: 'dto', method: 'reportArchiveRecordsByDepartment' },
  RECORDBYRETENTIONPERIOD: { service: 'record-access', typeHandle: 'dto', method: 'reportStatisticsByRetentionPeriod' },
  RECORDEXPIRINGSOON: { service: 'record-access', typeHandle: 'dto', method: 'reportArchiveRecordsExpiring' },
  RECORDEXPLOITATIONLOG: { service: 'record-access', typeHandle: 'dto', method: 'reportBorrowReturnRecord' },
  TDTTLIENTHONG: { service: 'outgoing-documents', typeHandle: 'dto', method: 'getInteroperabilityStatus' },
  TRACKDOCUMENTINTEROPERABILITYSTATUS: { service: 'outgoing-documents', typeHandle: 'dto', method: 'getInteroperabilityStatus' },
  TKTIENDOTRINHKY: { service: 'outgoing-documents', typeHandle: 'dto', method: 'getStatisticReportOfSenderUnitService' },
  OUTGOINGDOCUMENTPROCESSINGSTATS: { service: 'outgoing-documents', typeHandle: 'dto', method: 'getStatisticReportOfSenderUnitService' },
  INCOMINGDOCUMENTDIRECTIVE: { service: 'incoming', typeHandle: 'dto', method: 'listDocumentsDirective' },
  DOCUMENTSBYSENDINGUNITSTATS: { service: 'incoming', typeHandle: 'dto', method: 'getStatisticReportOfSenderUnit' },
  OVERDUEINCOMINGDOCUMENTS: { service: 'incoming', typeHandle: 'dto', method: 'listDocumentsDeadline' },
  INCOMINGDOCUMENTPROCESSINGSTATS: { service: 'incoming', typeHandle: 'dto', method: 'getStatisticReport' },
  INCOMINGDOCUMENTSTATSBYTIME: { service: 'incoming', typeHandle: 'dto', method: 'statisticsByTime' },
  TKVBDTHEONGUOIKY: { service: 'outgoing-documents', typeHandle: 'dto', method: 'statisticsBySigner' },
  OUTGOINGDOCUMENTSBYSIGNER: { service: 'outgoing-documents', typeHandle: 'dto', method: 'statisticsBySigner' },
  OUTGOINGDOCUMENTSTATSBYTIME: { service: 'outgoing-documents', typeHandle: 'dto', method: 'reportOutgoingByTime' },
  TKVBDTHEOTHOIGIAN: { service: 'outgoing-documents', typeHandle: 'dto', method: 'reportOutgoingByTime' },
  COLUMNSUGGESTIONSOVERTIME: { service: 'feedback-suggestions-report', typeHandle: 'object', method: 'getListReport' }, // Báo cáo 10.1: Danh sách phản ánh, kiến nghị theo thời gian
  COLUMNREFLECTBYTYPE: { service: 'feedback-suggestions-report', typeHandle: 'object', method: 'getTypeStatisticsReport' }, // Báo cáo 10.2: Thống kê phản ánh theo loại
  COLUMNOVERDUEFEEDBACK: { service: 'feedback-suggestions-report', typeHandle: 'object', method: 'getOverdueListReport' }, // Báo cáo 10.3: Danh sách phản ánh quá hạn xử lý
  COLUMNFEEDBACKUNIT: { service: 'feedback-suggestions-report', typeHandle: 'object', method: 'getUnitStatisticsReport' }, // Báo cáo 10.4: Thống kê phản ánh theo đơn vị xử lý
  COLUMNASSESSINGSATISFACTION: { service: 'feedback-suggestions-report', typeHandle: 'object', method: 'getSatisfactionReport' }, // Báo cáo 10.5: Đánh giá mức độ hài lòng
  COLUMNLISTJOBBYSTATUS: { service: 'task-report', typeHandle: 'object', method: 'getPersonalTaskReport' },
  COLUMNSLISTJOBLONGEST: { service: 'task-report', typeHandle: 'object', method: 'getLongestProcessingTimeTasksReport' },
  COLUMNSPERFORMANCEJOBPERSON: { service: 'task-report', typeHandle: 'object', method: 'getPersonalPerformanceReport' },
  COLUMNSLISTJOBLATE: { service: 'task-report', typeHandle: 'object', method: 'getOverdueTaskReport' },
  COLUMNSLISTJOBCYCLE: { service: 'task-report', typeHandle: 'object', method: 'getRecurringTaskReport' },
  COLUMNSTOSOURCE: { service: 'task-report', typeHandle: 'object', method: 'getWorkloadBySourceReport' },
  COLUMNSTASKLISTBYTOPIC: { service: 'task-report', typeHandle: 'object', method: 'getTopicTaskListReport' },
  TKYCDKX: { service: 'vehicle-registration', typeHandle: 'dto', method: 'statisticsVehicleRegistrationRequests' },
  TKSDTPT: { service: 'vehicle-registration', typeHandle: 'dto', method: 'vehicleUsageStatisticsReport' },
  TKDKXTPB: { service: 'vehicle-registration', typeHandle: 'dto', method: 'vehicleRegistrationStatisticsByDepartment' },
  TKXDDPNN: { service: 'vehicle-registration', typeHandle: 'dto', method: 'vehicleMostDispatchedReport' },
  TKLSMTS: { service: 'vehicle-registration', typeHandle: 'dto', method: 'vehicleBorrowReturnHistoryReport' },
  THONGKECUOCHOPTHEOTG: { service: 'meetings', typeHandle: 'dtoHoistFilter', method: 'statisticMeetingsByTime' },
  TKTANSUATSUDUNGPHONG: { service: 'meetings', typeHandle: 'dto', method: 'listMeetingRoomsStats' },
  TKCUOCHOPTHEOPONGBAN: { service: 'meetings', typeHandle: 'dto', method: 'listMeetingInMeeetingRoomsStats' },
  THONGKETHAMDUCUOCHOP: { service: 'meetings', typeHandle: 'dto', method: 'listMeetingAttendanceReport' },
  THONGKEKETLUANCUOCHOP: { service: 'meetings', typeHandle: 'dto', method: 'listConclusionsFromKMeeting' },
  CONGVIECTUCUOCHOP: { service: 'tasks', typeHandle: 'dto', method: 'findTasksByConclusion', inforUser: ['unit', 'createBy', 'titleMeeting', 'contentColusion', 'dateReport'] },
  TASKDELEGATION: { service: 'task-delegation', typeHandle: 'dto', method: 'findAll' },
  AUDIO_TRANSCRIPT: { service: 'meetings', typeHandle: 'object', method: 'getTranscriptForExport' },
  COLUMNSPERFORMANCEJOBDEPARTMENTAL: { service: 'task-report', typeHandle: 'object', method: 'getDeptPerformanceReport' },
  LISTJOBBYREPOST: { service: 'task-report', typeHandle: 'object', method: 'getDeptTaskDetailReport' },
  DEPARTMENT_RECORD_COLUMNS: { service: 'record-catalog', typeHandle: 'dto', method: 'findAllFiles' },
  RECORD_LIST_COLUMNS: { service: 'record-catalog', typeHandle: 'dto', method: 'findAllDocuments' },
  FOLDER_DETAIL_COLUMNS: { service: 'record-catalog', typeHandle: 'dto', method: 'findAllFolderDetails' },
  EMPLOYEEHRM :{ service: 'hrm', typeHandle: 'dto', method: 'getEmployees', },
};

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);

  /**
   * Registry các service được inject lazy để tránh circular dependency.
   * Các module khác gọi registerService() trong onModuleInit.
   */
  private readonly serviceMap = new Map<string, any>();

  constructor(
    private readonly repository: DataExportRepository,
    private readonly excelBuilder: ExcelBuilder,
    private readonly excelBuilderOption: ExcelBuilderOption,
    private readonly pdfNativeBuilder: PdfNativeBuilder,
    private readonly pdfConvertBuilder: PdfConvertBuilder,
    private readonly wordBuilder: WordBuilder,

    /** Runtime repo dùng cho exportBody (getStatusCode, mapSingleDocument, ...) */
    @Inject(forwardRef(() => 'RUNTIME_SERVICE'))
    private readonly runtime: any,
  ) { }

  // ─── Service registry ─────────────────────────────────────────────────────

  registerService(name: string, instance: any): void {
    this.serviceMap.set(name, instance);
  }

  private getService(name: string): any {
    return this.serviceMap.get(name);
  }

  // =========================================================================
  // PUBLIC: getFileExportList
  // =========================================================================

  /**
   * Entry point chính cho export danh sách.
   *
   * Hai trường hợp:
   *  - processFn      : export theo cấu hình FeatureManagement / TableConfig
   *  - viewConfigCode : export theo ViewConfig (dùng khi export từ màn chi tiết)
   *
   * @param queryParams  Toàn bộ query string từ request
   * @param userId       User thực hiện export
   */
  async getFileExportList(
    queryParams: Record<string, string>,
    userId: string,
  ): Promise<IExportFileResult> {
    const { processFn, viewConfigCode, exportType } = queryParams as any;

    if (!processFn && !viewConfigCode) {
      throw new BadRequestException('processFn hoặc viewConfigCode là bắt buộc');
    }


    let type: ExportType;
    switch (exportType) {
      case 'pdf':
        type = ExportType.PDF;
        break;
      case 'word':
        type = ExportType.WORD;
        break;
      default:
        type = ExportType.EXCEL;
    }

    try {
      if (processFn) {
        return await this.exportByProcessFn(queryParams, userId, type);
      } else {
        return await this.exportByViewConfig(queryParams, userId, type);
      }
    } catch (err: any) {
      this.logger.error('getFileExportList failed', err);
      throw err instanceof BadRequestException ? err : new BadRequestException(err.message || 'Xuất file thất bại');
    }
  }

  // =========================================================================
  // PUBLIC: exportBody  (xuất văn bản — delegate sang incoming/outgoing service)
  // =========================================================================

  /**
   * Xuất body một văn bản (incoming hoặc outgoing).
   * Delegate sang service tương ứng để lấy dữ liệu, sau đó map và trả về.
   *
   * @param documentId   ID văn bản
   * @param userId       User thực hiện
   * @param typeDocument 'IncommingDocument' | 'OutGoingDocument'
   */
  async exportBody(
    documentId: string,
    userId: string,
    typeDocument: string,
  ): Promise<Record<string, any>> {
    if (!documentId || !userId) {
      throw new BadRequestException('Thiếu documentId hoặc userId');
    }

    const serviceKey = typeDocument === 'IncommingDocument' ? 'incoming' : 'outgoing-documents';
    const service = this.getService(serviceKey);

    if (!service || typeof service.exportBody !== 'function') {
      throw new BadRequestException(`Service không hỗ trợ exportBody: ${serviceKey}`);
    }

    try {
      return await service.exportBody(documentId, userId, typeDocument);
    } catch (err: any) {
      this.logger.error(`exportBody failed for documentId="${documentId}"`, err);
      throw new BadRequestException(err.message || 'Xuất văn bản thất bại');
    }
  }

  // =========================================================================
  // PUBLIC: export  (dùng trực tiếp từ service khác — vd: exportSummaryByDepartment)
  // =========================================================================

  /**
   * Export data tuỳ ý ra Excel hoặc PDF.
   * Dùng khi module khác đã có sẵn data + columns và chỉ cần gọi builder.
   *
   * @param data        Mảng data đã fetch sẵn
   * @param columns     Column definitions (KHÔNG bao gồm STT — sẽ tự thêm)
   * @param nameOfList  Tên danh sách — làm tiêu đề & tên file
   * @param type        ExportType.EXCEL | ExportType.PDF
   * @param userId      User thực hiện (dùng cho log)
   *
   * @example
   * // Trong NewsService:
   * return this.dataExportService.export(data, columns, 'Thống kê theo phòng ban', ExportType.EXCEL, userId);
   */
  async export(
    data: any[],
    columns: IColumnConfig[],
    nameOfList: string,
    type: ExportType,
    userId: string,
  ): Promise<IExportFileResult> {
    if (!data?.length) {
      throw new BadRequestException(`Không có dữ liệu để xuất`);
    }


    const columnsWithStt = this.buildColumnsWithStt(columns);
    return this.buildOutput(data, columnsWithStt, nameOfList, type);
  }

  // =========================================================================
  // PRIVATE: Export flows
  // =========================================================================

  /** Luồng A: export theo processFn */
  private async exportByProcessFn(
    queryParams: Record<string, string>,
    userId: string,
    type: ExportType,
  ): Promise<IExportFileResult> {
    const { processFn } = queryParams;
    const start = Date.now();

    // ⚡ Parallel: lấy column config + data cùng lúc
    const [columnConfig, listResult] = await Promise.all([
      this.repository.getColumnsByProcessFn(processFn, userId),
      this.getListByProcessFn(queryParams, userId),
    ]);

    this.assertHasData(listResult.data, processFn);

    const columns = this.buildColumnsWithStt(columnConfig.columns);


    return this.buildOutput(listResult.data, columns, columnConfig.nameOfList, type);
  }

  /** Luồng B: export theo viewConfigCode */
  private async exportByViewConfig(
    queryParams: Record<string, string>,
    userId: string,
    type: ExportType,
  ): Promise<IExportFileResult> {
    const { viewConfigCode } = queryParams;
    const normalizedViewConfigCode = viewConfigCode?.trim().toUpperCase();

    const [columnConfig, listResult] = await Promise.all([
      this.repository.getColumnsByViewConfig(viewConfigCode),
      this.getListByViewConfig(queryParams, userId),
    ]);

    this.assertHasData(listResult.data, viewConfigCode);

    const columns = this.buildColumnsWithStt(columnConfig.columns);
    const options = this.buildExportOptionsByViewConfig(normalizedViewConfigCode, listResult);
    return this.buildOutput(listResult.data, columns, columnConfig.nameOfList, type, options);
  }

  /** Thêm cột STT vào đầu danh sách cột */
  private buildColumnsWithStt(columns: IColumnConfig[]): IColumnConfig[] {
    const withoutStt = columns.filter(c => c.key !== 'stt' && c.key?.toLowerCase() !== 'stt');
    return [{ key: 'stt', header: 'STT', width: 6 }, ...withoutStt];
  }

  /** Validate data không rỗng */
  private assertHasData(data: any[], context: string): void {
    if (!data || data.length === 0) {
      throw new BadRequestException(`Không có dữ liệu để xuất`);
    }
  }

  /**
   * Gọi builder tương ứng với type.
   *
   * PDF có 2 cách:
   *  - pdfNativeBuilder  : dùng pdfkit trực tiếp (không cần service ngoài)
   *  - pdfConvertBuilder : build Excel → convert qua APP_CONVERT_URL
   *
   * Mặc định dùng pdfConvertBuilder để đảm bảo layout giống Excel.
   * Đổi thành pdfNativeBuilder nếu cần tốc độ hoặc không có APP_CONVERT_URL.
   */
  private buildExportOptionsByViewConfig(
    viewConfigCode: string,
    listResult: IListResult,
  ): IExportBuildOptions | undefined {
    const mapping = VIEW_CONFIG_MAP[viewConfigCode];
    if (!mapping?.inforUser?.length || !listResult.extraInfo?.length) {
      return undefined;
    }

    const allowedKeys = new Set(mapping.inforUser);
    const extraInfo = listResult.extraInfo.filter(item => item?.key && allowedKeys.has(item.key));

    return extraInfo.length ? { extraInfo } : undefined;
  }

  private async buildOutput(
    data: any[],
    columns: IColumnConfig[],
    nameOfList: string,
    type: ExportType,
    options?: IExportBuildOptions,
  ): Promise<IExportFileResult> {
    if (options) {
      return this.excelBuilderOption.buildOptionExcel(data, columns, nameOfList, options);
    }
    if (type === ExportType.PDF) {
      // ── Chọn 1 trong 2: ────────────────────────────────────────────────
      return this.pdfNativeBuilder.build(data, columns, nameOfList);    // Cách 1: pdfkit
      // return this.pdfConvertBuilder.build(data, columns, nameOfList);      // Cách 2: convert
    }
    if (type === ExportType.WORD) {
      const firstItem = data[0] || {};
      const content = firstItem.transcriptText || firstItem.content || '';
      return this.wordBuilder.buildFromText(content, nameOfList);
    }
    return this.excelBuilder.build(data, columns, nameOfList);
  }

  // =========================================================================
  // PRIVATE: Data fetching — getListByProcessFn
  // =========================================================================

  /**
   * Lấy danh sách data theo processFn.
   * Resolve: apiUrl → service + method → gọi service → normalize response.
   */
  async getListByProcessFn(
    queryParams: Record<string, string>,
    userId: string,
  ): Promise<IListResult> {
    const {
      processFn,
      page = '1',
      limit = '9999',
      sort = '-createdAt',
    } = queryParams;

    const empty: IListResult = { data: [], total: 0, page: 1, limit: 20 };
    if (!processFn) return empty;

    // 1. Resolve apiUrl
    const apiUrl = await this.repository.getApiUrlByProcessFn(processFn);
    if (!apiUrl) return empty;

    // 2. Parse apiUrl → { service, action, apiKey, query }
    const parsed = this.parseApiUrl(apiUrl);
    if (!parsed.service) return empty;

    // 3. Resolve handler
    const handler = this.resolveHandler(parsed.service, parsed.action, parsed.apiKey);
    if (!handler) {
      this.logger.warn(`No handler for service="${parsed.service}" action="${parsed.action}"`);
      return empty;
    }

    // 4. Authority delegation
    const authorId = await this.getAuthorId(userId);
    const effectiveUserId = (authorId && parsed.query.authority === 'true') ? authorId : userId;

    // 5. Normalize filters
    const rawParams = this.normalizeFilterParams(queryParams);

    // 6. Build DTOs
    const dtos = this.buildRequestDtos(rawParams, effectiveUserId, parsed.query, '9999', processFn, 'false', page, sort);

    // 7. Get service instance
    const serviceInstance = this.getService(parsed.service);
    if (!serviceInstance) {
      this.logger.warn(`Service not registered: "${parsed.service}"`);
      return empty;
    }

    // 8. Invoke + normalize
    try {
      const response = await this.invokeServiceMethod(serviceInstance, handler, dtos, effectiveUserId, authorId ?? undefined, rawParams, sort, processFn);
      const normalized = this.normalizeListResponse(response, page, limit);

      return normalized;
    } catch (err: any) {
      this.logger.error(`getListByProcessFn failed for "${processFn}"`, err);
      return empty;
    }
  }

  // ─── Data fetching — getListByViewConfig ─────────────────────────────────

  /**
   * Lấy danh sách data theo viewConfigCode.
   * Dùng VIEW_CONFIG_MAP để xác định service + method.
   */
  async getListByViewConfig(
    queryParams: Record<string, string>,
    userId: string,
  ): Promise<IListResult> {
    const { viewConfigCode, recordId } = queryParams;

    if (!viewConfigCode) throw new BadRequestException('viewConfigCode là bắt buộc');

    const mapping = VIEW_CONFIG_MAP[viewConfigCode.trim().toUpperCase()];
    if (!mapping) throw new BadRequestException(`viewConfigCode không hợp lệ: ${viewConfigCode}`);

    const serviceInstance = this.getService(mapping.service);
    if (!serviceInstance) throw new BadRequestException(`Service chưa được register: ${mapping.service}`);

    const rawParams: Record<string, any> = { ...queryParams };
    if (typeof rawParams.filter === 'string') {
      try {
        rawParams.filter = JSON.parse(rawParams.filter);
      } catch (e) {}
    }

    const result = await this.invokeServiceMethod(
      serviceInstance,
      { method: mapping.method, typeHandle: mapping.typeHandle },
      this.buildRequestDtos(rawParams, userId, {}, '9999', '', 'false', 1, '-createdAt'),
      userId,
      undefined,
      rawParams,
      '-createdAt',
      '',
    );

    return this.normalizeListResponse(result, 1, 9999);
  }

  // =========================================================================
  // PRIVATE: Helper methods
  // =========================================================================

  /** Parse "service/list/key?query=value" → IParsedApiUrl */
  private parseApiUrl(apiUrl: string): IParsedApiUrl {
    const [path, queryString] = apiUrl.split('?');
    const segments = path.split('/').filter(Boolean);

    const service = segments[0] ?? null;
    let action: 'list' | 'search' = 'list';
    let apiKey: string | null = null;

    const second = segments[1];
    const third = segments[2];

    if (second === 'search') {
      action = 'search';
    } else if (second === 'list') {
      action = 'list';
      apiKey = third ?? null;
    } else if (second === 'my-list') {
      action = 'list';
      apiKey = second && third ? `${second}/${third}` : null;
    } else {
      action = 'list';
      apiKey = second ?? null;
    }

    const query: Record<string, string> = {};
    if (queryString) {
      new URLSearchParams(queryString).forEach((v, k) => { query[k] = v; });
    }

    return { service, action, apiKey, query };
  }

  /** Lấy handler config từ LIST_HANDLERS lookup table */
  private resolveHandler(
    service: string,
    action: 'list' | 'search',
    apiKey?: string | null,
  ): IListHandler | null {
    const handlers = this.getListHandlers();
    const serviceHandlers = handlers[service];
    if (!serviceHandlers) return null;

    const actionHandlers = serviceHandlers[action];
    if (!actionHandlers) return null;

    return (apiKey ? actionHandlers[apiKey] : null) ?? actionHandlers._default ?? null;
  }

  /** Merge userFilters → filter */
  private normalizeFilterParams(queryParams: Record<string, string>): Record<string, any> {
    const params: Record<string, any> = { ...queryParams };
    if (params.userFilters && !params.filter) params.filter = params.userFilters;
    delete params.userFilters;
    if (typeof params.filter === 'string') {
      try {
        params.filter = JSON.parse(params.filter);
      } catch (e) {}
    }
    return params;
  }

  private buildRequestDtos(
    rawParams: Record<string, any>,
    userId: string,
    query: Record<string, string>,
    effectiveLimit: string,
    processFn: string,
    countOnly: string,
    page: any,
    sort: any,
  ) {
    const pageStr = page?.toString() ?? '1';

    return {
      dto: {
        userId, processFn,
        type: query.type || 'deadline',
        page: pageStr,
        limit: effectiveLimit,
        filter: rawParams.filter,
        isExport: 'true',
        countOnly,
        meetingConclusionId: rawParams.meetingConclusionId,
      },
      dtoMeeting: {
        userId, processFn,
        type: query.type,
        workstate: query.workstate || 'waiting',
        page: pageStr,
        limit: effectiveLimit,
        filter: rawParams.filter,
        isExport: 'true',
        countOnly,
      },
      dtoTask: {
        typeTask: query.typeTask,
        page: Number(page) || 1,
        limit: Number(effectiveLimit),
        filter: rawParams.filter,
        isExport: 'true',
        countOnly,
      },
      rawParams,
    };
  }

  private async invokeServiceMethod(
    serviceInstance: any,
    handler: IListHandler,
    dtos: ReturnType<DataExportService['buildRequestDtos']>,
    userId: string,
    authorId: string | undefined,
    rawParams: Record<string, any>,
    sort: any,
    processFn: string,
  ): Promise<any> {
    const { method, typeHandle } = handler;
    const { dto, dtoMeeting, dtoTask } = dtos as any;

    const fn = serviceInstance[method];
    if (typeof fn !== 'function') {
      this.logger.warn(`Method not found: ${method} on service`);
      return null;
    }

    try {
      switch (typeHandle) {
        case 'dto':
          return await fn.call(serviceInstance, { ...dto, ...rawParams, }, userId, authorId);

        case 'dtoMeeting':
          return await fn.call(serviceInstance, dtoMeeting, userId, authorId);

        case 'dtoTask':
          return await fn.call(serviceInstance, dtoTask, userId);

        case 'object':
          return await fn.call(serviceInstance, {
            ...rawParams,
            page: dto.page, limit: dto.limit,
            userId, filter: rawParams.filter,
            sort, processFn, isExport: 'true',
            countOnly: dto.countOnly,
          }, userId, '127.0.0.1');

        case 'legacy':
          return await fn.call(serviceInstance, userId, dto);

        case 'dtoListRecall': {
          const { recordId, ...payload } = rawParams;
          if (!recordId) throw new BadRequestException('recordId là bắt buộc cho dtoListRecall');
          // Override limit = 9999 cho export
          payload.limit = '9999';
          payload.page = '1';
          return await fn.call(serviceInstance, userId, recordId, payload);
        }

        case 'dtoListQuanLyCV': {
          const { recordId } = rawParams;
          if (!recordId) throw new BadRequestException('recordId là bắt buộc cho dtoListQuanLyCV');
          return await fn.call(serviceInstance, recordId, dto.page, dto.limit, userId);
        }

        case 'dtoListVanBanDi': {
          const { recordId, ...payload } = rawParams;
          if (!recordId) throw new BadRequestException('recordId là bắt buộc cho dtoListVanBanDi');
          return await fn.call(serviceInstance, recordId, payload, userId);
        }
        case 'dtoHoistFilter': {
          const hoisted: Record<string, any> = {};
          const SYSTEM_KEYS = new Set([
            'page', 'limit', 'sort', 'processFn', 'viewConfigCode',
            'exportType', 'userFilters', 'countOnly', 'isExport',
            'authority', 'recordId', 'meetingConclusionId', 'filter',
          ]);

          // Gom các key lỏng vào filter
          for (const key of Object.keys(rawParams)) {
            if (!SYSTEM_KEYS.has(key)) {
              hoisted[key] = rawParams[key];
            }
          }

          const mergedFilter = { ...(rawParams.filter ?? {}), ...hoisted };

          return await fn.call(serviceInstance, {
            ...dto,
            ...rawParams,
            filter: mergedFilter,
          }, userId, authorId);
        }

        default:
          return await fn.call(serviceInstance, dto, userId);
      }
    } catch (err: any) {
      this.logger.error(`invokeServiceMethod: "${method}" (${typeHandle}) failed — ${err?.message}`);
      return null;
    }
  }

  private normalizeListResponse(
    response: any,
    page: any,
    limit: any,
  ): IListResult {
    const data = response?.items ?? response?.data ?? (Array.isArray(response) ? response : []);
    const total = response?.total ?? response?.count ?? data.length ?? 0;
    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      extraInfo: response?.extraInfo ?? response?.exportInfo ?? [],
    };
  }

  private async getAuthorId(userId: string): Promise<string | null> {
    try {
      return (await this.runtime?.repo?.getAuthorIdIfAuthorized?.(userId)) ?? null;
    } catch {
      return null;
    }
  }

  // =========================================================================
  // PRIVATE: List handlers registry
  // Thêm service mới vào đây. Cấu trúc: { service: { list/search: { key: handler } } }
  // =========================================================================

  private getListHandlers(): Record<string, {
    list: Record<string, IListHandler>;
    search: Record<string, IListHandler>;
  }> {
    return {
      'outgoing-documents': {
        list: {
          'pending-feedbacks': { typeHandle: 'legacy', method: 'getPendingFeedbacks' },
          'given-feedbacks': { typeHandle: 'legacy', method: 'getGivenFeedbacks' },
          'my-sent-feedbacks': { typeHandle: 'legacy', method: 'getMySentFeedbacks' },
          'my-complete-feedbacks': { typeHandle: 'legacy', method: 'getMyCompletedFeedbacks' },
          'my-receive-feedbacks': { typeHandle: 'legacy', method: 'getMyReceivedFeedbackRequests' },
          'list-evict': { typeHandle: 'legacy', method: 'listEvict' },
          'signer-process': { typeHandle: 'dto', method: 'listSignerProcessDynamic' },
          'process': { typeHandle: 'dto', method: 'listProcessDocumentsDynamic' },
          'promulgate': { typeHandle: 'dto', method: 'listPromulgateDocumentsDynamic' },
          'recipient-to-know': { typeHandle: 'dto', method: 'listViewDocumentsDynamic' },
          'report-outgoing-by-time': { typeHandle: 'dto', method: 'reportOutgoingByTime' },
          'statistics-by-signer': { typeHandle: 'dto', method: 'statisticsBySigner' },
          'statistic-process-sign': { typeHandle: 'dto', method: 'getStatisticReportOfSenderUnitService' },
          'interoperability-status': { typeHandle: 'dto', method: 'getInteroperabilityStatus' },
          _default: { typeHandle: 'dto', method: 'listDocumentsDynamic' },
        },
        search: { _default: { typeHandle: 'object', method: 'outgoingRecipients' } },
      },
      'incoming': {
        list: {
          'main-process': { typeHandle: 'dto', method: 'listDocumentsMainProcessDynamic' },
          'receive': { typeHandle: 'dto', method: 'listDocumentsReceiveDynamic' },
          'for-task': { typeHandle: 'dto', method: 'listDocumentsForTask' },
          'implementation-coordination': { typeHandle: 'dto', method: 'listDocumentsImplementationDynamic' },
          'recipient-to-know': { typeHandle: 'dto', method: 'listDocumentsViewerDynamic' },
          'reply': { typeHandle: 'dto', method: 'listDocumentsReplyDynamic' },
          'overdue': { typeHandle: 'dto', method: 'listDocumentsDeadline' },
          'directive': { typeHandle: 'dto', method: 'listDocumentsDirective' },
          'statistic-report-sender-unit': { typeHandle: 'dto', method: 'getStatisticReportOfSenderUnit' },
          'statistic-report': { typeHandle: 'dto', method: 'getStatisticReport' },
          'statistics': { typeHandle: 'dto', method: 'statisticsByTime' },
          'statistics-by-time': { typeHandle: 'dto', method: 'statisticsByTime' },
          _default: { typeHandle: 'dto', method: 'listDocumentsDynamic' },
        },
        search: { _default: { typeHandle: 'object', method: 'incomingRecipients' } },
      },
      'tasks': {
        list: {
          'form-doc': { typeHandle: 'dtoTask', method: 'findAllFormDoc' },
          'form-meeting': { typeHandle: 'dtoTask', method: 'findAllMeeting' },
          'recurring': { typeHandle: 'dtoTask', method: 'findAllRecurringConfigs' },
          _default: { typeHandle: 'dtoTask', method: 'findAll' },
        },
        search: { _default: { typeHandle: 'dto', method: 'findAll' } },
      },
      'meetings': {
        list: {
          'company': { typeHandle: 'dtoMeeting', method: 'listMeetingCompany' },
          'prepare': { typeHandle: 'dtoMeeting', method: 'listPrepareMeetingSchedule' },
          'approval': { typeHandle: 'dtoMeeting', method: 'listApprovalSchedule' },
          'process': { typeHandle: 'dtoMeeting', method: 'listProcessSchedule' },
          'unit': { typeHandle: 'dtoMeeting', method: 'listMeetingUnit' },
          'user': { typeHandle: 'dtoMeeting', method: 'listMeetingPerson' },
          'meeting-rooms-stats': { typeHandle: 'dto', method: 'listMeetingRoomsStats' },
          'meeting-in-meeting-rooms-stats': { typeHandle: 'dto', method: 'listMeetingInMeeetingRoomsStats' },
          'meeting-by-time': { typeHandle: 'dto', method: 'statisticMeetingsByTime' },
          'meeting-attendance-report': { typeHandle: 'dto', method: 'listMeetingAttendanceReport' },
          'conclusions-from-meeting': { typeHandle: 'dto', method: 'listConclusionsFromKMeeting' },
          'seat-assignment': { typeHandle: 'dto', method: 'seatAssignmentList' },
          _default: { typeHandle: 'dtoMeeting', method: 'listMeetingPerson' },
        },
        search: { _default: { typeHandle: 'dtoMeeting', method: 'listMeetingPerson' } },
      },
      'meeting-schedule': {
        list: {
          'commanders': { typeHandle: 'dto', method: 'getCommandersByFlow' },
          'organization-units': { typeHandle: 'dto', method: 'getOrganizationUnitsByFlowV2' },
          'users': { typeHandle: 'dto', method: 'getUsersByFlow' },
          _default: { typeHandle: 'dto', method: 'getCommandersByFlow' },
        },
        search: { _default: { typeHandle: 'dto', method: 'getCommandersByFlow' } },
      },
      'amenities': { list: { _default: { typeHandle: 'dto', method: 'list' } }, search: { _default: { typeHandle: 'dto', method: 'list' } } },
      'meeting-rooms': { list: { _default: { typeHandle: 'dto', method: 'list' } }, search: { _default: { typeHandle: 'dto', method: 'list' } } },
      'travel-work-schedules': {
        list: { _default: { typeHandle: 'dto', method: 'list' } },
        search: { _default: { typeHandle: 'dto', method: 'list' } },
      },
      'leadership-duty-schedules': {
        list: { _default: { typeHandle: 'dto', method: 'list' } },
        search: { _default: { typeHandle: 'dto', method: 'list' } },
      },
      'process-template': {
        list: { _default: { typeHandle: 'object', method: 'findAll' } },
        search: { _default: { typeHandle: 'object', method: 'findAll' } },
      },
      'authority': {
        list: {
          'process': { typeHandle: 'dto', method: 'listAuthorityProcess' },
          'authority-docs': { typeHandle: 'dto', method: 'listAuthorityDocs' },
          _default: { typeHandle: 'dto', method: 'listAuthorityProcess' },
        },
        search: { _default: { typeHandle: 'dto', method: 'listAuthorityProcess' } },
      },
      'destroy-records': {
        list: {
          'record-exploitation-requests': { typeHandle: 'dto', method: 'listRecordExploitationRequests' },
          'leader-destroy-records': { typeHandle: 'dto', method: 'listLeaderRecordExploitationRequests' },
          'comander-destroy-records': { typeHandle: 'dto', method: 'listComanderRecordExploitationRequests' },
          _default: { typeHandle: 'dto', method: 'findAll' },
        },
        search: { _default: { typeHandle: 'dto', method: 'findAll' } }
      },
      'record-access': {
        list: {
          'record-exploitation-requests': { typeHandle: 'dto', method: 'listRecordExploitationRequests' },
          'leader-record-exploitation': { typeHandle: 'dto', method: 'listLeaderRecordExploitationRequests' },
          'comander-record-exploitation': { typeHandle: 'dto', method: 'listComanderRecordExploitationRequests' },
          'processor-record-exploitation': { typeHandle: 'dto', method: 'listProcessRecordExploitationRequests' },
          _default: { typeHandle: 'dto', method: 'listRecordExploitationRequests' },
        },
        search: { _default: { typeHandle: 'dto', method: 'listRecordExploitationRequests' } },
      },
      'archive-records': {
        list: {
          'report-borrow-return-record': { typeHandle: 'dto', method: 'reportBorrowReturnRecord' },
          'report-archive-records-expiring': { typeHandle: 'dto', method: 'reportArchiveRecordsExpiring' },
          'report-archive-records-department': { typeHandle: 'dto', method: 'reportArchiveRecordsByDepartment' },
          'report-statistics-retention-reriod': { typeHandle: 'dto', method: 'reportStatisticsByRetentionPeriod' },
          'report-archive-access-statistics': { typeHandle: 'dto', method: 'reportArchiveAccessStatistics' },
          _default: { typeHandle: 'dto', method: 'listArchivedRecords' }
        },
        search: { _default: { typeHandle: 'dto', method: 'listArchivedRecords' } },
      },
      'passports': { list: { _default: { typeHandle: 'dto', method: 'findAll' } }, search: { _default: { typeHandle: 'dto', method: 'findAll' } } },
      'list-car': { list: { _default: { typeHandle: 'dto', method: 'findAll' } }, search: { _default: { typeHandle: 'dto', method: 'findAll' } } },
      'list-driver': { list: { _default: { typeHandle: 'dto', method: 'findAll' } }, search: { _default: { typeHandle: 'dto', method: 'findAll' } } },
      'vehicle-registration': {
        list: {
          'list-registration': { typeHandle: 'dto', method: 'listVehiclesRegistration' },
          'list-assignment': { typeHandle: 'dto', method: 'listVehiclesRegistrationAssignment' },
          'list-driver-assignment': { typeHandle: 'dto', method: 'listVehiclesRegistrationDriver' },
          'statistics-vehicle-registration-requests': { typeHandle: 'dto', method: 'statisticsVehicleRegistrationRequests' },
          'vehicle-statistics-report': { typeHandle: 'dto', method: 'vehicleUsageStatisticsReport' },
          'vehicle-registration-statistics-department': { typeHandle: 'dto', method: 'vehicleRegistrationStatisticsByDepartment' },
          'vehicle-most-dispatched-report': { typeHandle: 'dto', method: 'vehicleMostDispatchedReport' },
          'vehicle-borrow-return-history-report': { typeHandle: 'dto', method: 'vehicleBorrowReturnHistoryReport' },
          _default: { typeHandle: 'dto', method: 'listVehiclesRegistrationAssignment' },
        },
        search: { _default: { typeHandle: 'dto', method: 'listVehiclesRegistrationAssignment' } },
      },
      'news': {
        list: {
          'my-list/drafts': { typeHandle: 'dto', method: 'getNewsDrafts' },
          'my-list/pending': { typeHandle: 'dto', method: 'getNewsPendingApproval' },
          'my-list/published': { typeHandle: 'dto', method: 'getNewsPublished' },
          'my-list/returned': { typeHandle: 'dto', method: 'getNewsReturned' },
          'my-list/cancelled': { typeHandle: 'dto', method: 'getNewsCancelled' },
          'my-list/recalled': { typeHandle: 'dto', method: 'getNewsRecalled' },
          'my-list/recalled-by-user': { typeHandle: 'dto', method: 'getNewsRecalledByUser' },
          'my-list/waiting-approval': { typeHandle: 'dto', method: 'getNewsWaitingMyApproval' },
          'public-published': { typeHandle: 'dto', method: 'getAllPublishedNews' },
          'latest': { typeHandle: 'dto', method: 'getLatestNews' },
          'most-viewed': { typeHandle: 'dto', method: 'getMostViewedNews' },
          'favorites': { typeHandle: 'dto', method: 'getFavoriteNews' },
          _default: { typeHandle: 'dto', method: 'getNewsPublished' },
        },
        search: { _default: { typeHandle: 'dto', method: 'findAll' } },
      },
      'topic': { list: { _default: { typeHandle: 'legacy', method: 'findAll' } }, search: { _default: { typeHandle: 'legacy', method: 'findAll' } } },
      'album-images': { list: { _default: { typeHandle: 'dto', method: 'findWithFilter' } }, search: { _default: { typeHandle: 'dto', method: 'findWithFilter' } } },
      'videos': { list: { _default: { typeHandle: 'dto', method: 'findWithFilter' } }, search: { _default: { typeHandle: 'dto', method: 'findWithFilter' } } },
      'project': { list: { _default: { typeHandle: 'object', method: 'findAll' } }, search: { _default: { typeHandle: 'object', method: 'findAll' } } },
      'passport-requests': {
        list: {
          'approval': { typeHandle: 'dto', method: 'findAllForApproval' },
          'wait-commander': { typeHandle: 'dto', method: 'findAllWaitCommander' },
          'wait-receive': { typeHandle: 'dto', method: 'findAllWaitReceive' },
          'in-use': { typeHandle: 'dto', method: 'findAllInUse' },
          'completed': { typeHandle: 'dto', method: 'findAllCompleted' },
          'rejected': { typeHandle: 'dto', method: 'findAllRejected' },
          'cancelled': { typeHandle: 'dto', method: 'findAllCancelled' },
          _default: { typeHandle: 'dto', method: 'findAll' },
        },
        search: { _default: { typeHandle: 'dto', method: 'findAll' } },
      },
      'news-statistics': {
        list: {
          'time': { typeHandle: 'object', method: 'getStatsByTime' },
          'top-viewed': { typeHandle: 'object', method: 'getTopViewedNews' },
          'topic': { typeHandle: 'object', method: 'getStatsByTopic' },
          'workflow': { typeHandle: 'object', method: 'getWorkflowStats' },
          'department': { typeHandle: 'object', method: 'getStatsByDepartment' },
          _default: { typeHandle: 'object', method: 'getStatsByTime' },
        },
        search: {
          _default: { typeHandle: 'object', method: 'getStatsByTime' },
        }
      },
      'passport-statistics': {
        list: {
          'managed': { typeHandle: 'object', method: 'getManagedPassports' },
          'history': { typeHandle: 'object', method: 'getBorrowHistory' },
          'dept-stats': { typeHandle: 'object', method: 'getDeptStats' },
          'business-trips': { typeHandle: 'object', method: 'getBusinessTrips' },
          _default: { typeHandle: 'object', method: 'getManagedPassports' },
        },
        search: { _default: { typeHandle: 'object', method: 'getManagedPassports' } },
      },
      'feedback-suggestions': {
        list: {
          'cho-dieu-phoi': { typeHandle: 'dto', method: 'exportWaitingDispatch' },
          'cho-xu-ly': { typeHandle: 'dto', method: 'exportWaitingProcess' },
          'dang-xu-ly': { typeHandle: 'dto', method: 'exportProcessing' },
          'hoan-thanh': { typeHandle: 'dto', method: 'exportCompleted' },
          'tu-choi': { typeHandle: 'dto', method: 'exportRejected' },
          _default: { typeHandle: 'dto', method: 'exportAll' },
        },
        search: { _default: { typeHandle: 'dto', method: 'exportAll' } },
      },
      'project-statistics': {
        list: {
          'summary': { typeHandle: 'object', method: 'getProjectSummary' },
          'tasks': { typeHandle: 'object', method: 'getProjectTasks' },
          'performance': { typeHandle: 'object', method: 'getMemberPerformance' },
          _default: { typeHandle: 'object', method: 'getProjectSummary' },
        },
        search: { _default: { typeHandle: 'object', method: 'getProjectSummary' } },
      },
    };
  }
}