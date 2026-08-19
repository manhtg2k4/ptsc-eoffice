import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import * as moment from 'moment';
import { TaskReportRepository } from './repositories/task-report.repository';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { GROUP_CODES } from 'src/variable/CONST_STATUS';
import { buildProgressView, buildTypeTaskView } from './progress.util';

@Injectable()
export class TaskReportService {
  constructor(
    private readonly reportRepo: TaskReportRepository,
    private readonly sqlsvRepo: SQLSVRepository,
  ) { }

  /**
   * BÁO CÁO 4.1: DANH SÁCH CÔNG VIỆC CÁ NHÂN THEO TRẠNG THÁI
   */
  async getPersonalTaskReport(filters: any) {
    filters = await this.applyTaskFilters(filters);
    const { userId, page = 1, limit = 25 } = filters;
    const [tasks, total] = await this.reportRepo.findPersonalTasks(filters);
    const priorityMapping = await this.reportRepo.mapCrmTitlesBatch(tasks, ['DOUUTIEN']);

    const slowReasonMap: Record<string, string> = {};
    if (tasks.length > 0) {
      const reasons = await this.reportRepo.findSlowReasons(tasks.map(t => t.id));
      reasons.forEach((r: any) => {
        slowReasonMap[r.document_id] = r.content;
      });
    }

    const data = tasks.map((task, index) => {
      const isSelfCreated = task.createdById === userId;
      const assigner = task.taskUsers.find(tu => tu.role === 'assigner' && tu.processId !== userId);
      const directors = task.taskUsers.filter(tu => tu.role === 'director');
      const nguoiChuTri = directors.map(d => d.processName).join(', ');
      const crmMapped = priorityMapping[task.id] || {};
      return {
        id: task.id,
        stt: index + 1,
        tieuDe: task.name,
        nguoiChuTri: nguoiChuTri,
        assigner: isSelfCreated ? 'Tự tạo' : (assigner?.processName || task.createdBy?.name || ''),
        ngayTao: moment(task.createdAt).format('DD/MM/YYYY'),
        hanHoanThanh: task.endDate ? moment(task.endDate).format('DD/MM/YYYY') : '',
        trangThai: this.mapStatusToHtml(task.processStatus || ''),
        uuTien: crmMapped.priority || task.priority || 'Trung bình',
        tienDo: `${task.progress || 0}%`,
        slowReason: slowReasonMap[task.id] || '',
      };
    });

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  /**
   * BÁO CÁO 4.2: THỐNG KÊ HIỆU SUẤT CÔNG VIỆC CÁ NHÂN
   */
  async getPersonalPerformanceReport(filters: any) {
    filters = await this.applyTaskFilters(filters);
    const { page = 1, limit = 10, fromDate, toDate } = filters;
    const stats = await this.reportRepo.countPerformanceStats(filters);

    const paginatedStats = stats.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit));
    const total = stats.length;

    return {
      data: paginatedStats.map((s, index) => {
        const total = Number(s.Total) || 0;
        const completed = Number(s.Completed) || 0;
        const onTime = Number(s.OnTime) || 0;

        return {
          stt: index + 1,
          startDate: fromDate ? moment(fromDate).format('DD/MM/YYYY') : '',
          endDate: toDate ? moment(toDate).format('DD/MM/YYYY') : '',
          nguoiThucHien: s.PerformerName || '',
          nguoiChuTri: s.DirectorNames || '',
          tongCV: total,
          hoanThanh: completed,
          dungHan: onTime,
          treHan: Number(s.Overdue) || 0,
          dangLam: Number(s.InProgress) || 0,
          tyLeHT: total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%',
          tyLeDungHan: completed > 0 ? `${Math.round((onTime / completed) * 100)}%` : '0%',
        };
      }),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  /**
   * BÁO CÁO 4.3: DANH SÁCH CÔNG VIỆC QUÁ HẠN
   */
  async getOverdueTaskReport(filters: any) {
    filters = await this.applyTaskFilters(filters);
    const { page = 1, limit = 25 } = filters;
    const [tasks, total] = await this.reportRepo.findOverdueTasks(filters);

    const slowReasonMap: Record<string, string> = {};
    if (tasks.length > 0) {
      const reasons = await this.reportRepo.findSlowReasons(tasks.map(t => t.id));
      reasons.forEach((r: any) => {
        slowReasonMap[r.document_id] = r.content;
      });
    }

    const data = tasks.map((task, index) => {
      const diffDays = moment().diff(moment(task.endDate), 'days');
      const assigner = task.taskUsers.find(tu => tu.role === 'assigner');
      const directors = task.taskUsers.filter(tu => tu.role === 'director');
      const nguoiChuTri = directors.map(d => d.processName).join(', ');

      return {
        id: task.id,
        stt: (Number(page) - 1) * Number(limit) + index + 1,
        tieuDe: task.name,
        nguoiChuTri: nguoiChuTri,
        nguonGiao: assigner?.processName || task.createdBy?.name || '',
        assigner: assigner?.processName || task.createdBy?.name || '',
        hanHT: moment(task.endDate).format('DD/MM/YYYY'),
        soNgayQua: diffDays > 0 ? diffDays : 0,
        tienDo: `${task.progress || 0}%`,
        lyDoCham: slowReasonMap[task.id] || '',
      };
    });

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  /**
   * BÁO CÁO 4.4: CÔNG VIỆC LẶP LẠI THEO CHU KỲ
   */
  async getRecurringTaskReport(filters: any) {
    filters = await this.applyTaskFilters(filters);
    const { page = 1, limit = 25 } = filters;
    const [configs, total] = await this.reportRepo.findRecurringConfigs(filters);

    // 1. Collect all potential IDs for name resolution
    const idSet = new Set<string>();
    const parsedDataMap = new Map<number, any>();

    configs.forEach(config => {
      try {
        const data = JSON.parse(config.taskData || '{}');
        parsedDataMap.set(config.id, data);
        const directors = data.directors || [];
        const assigners = data.assigners || [];
        directors.forEach(d => {
          if (d.processId) idSet.add(d.processId);
        });
        assigners.forEach(a => {
          if (a.processId) idSet.add(a.processId);
        });
      } catch (e) { }
    });

    // 2. Fetch all unique names in one go
    const [cycleMap, resolvedNamesMap] = await Promise.all([
      this.reportRepo.getCRMTitleMap('CONGVIECLAPLAI'),
      this.reportRepo.resolveNames(Array.from(idSet))
    ]);

    const data = configs.map((config, index) => {
      let nextRun = '';
      if (config.lastExecutedAt) {
        const last = moment(config.lastExecutedAt);
        const cycle = config.repetitiveTask?.toLowerCase();

        switch (cycle) {
          case 'daily': case 'ngay': nextRun = last.add(1, 'day').format('DD/MM/YYYY'); break;
          case 'weekly': case 'tuan': nextRun = last.add(7, 'days').format('DD/MM/YYYY'); break;
          case 'monthly': case 'thang': nextRun = last.add(1, 'month').format('DD/MM/YYYY'); break;
          case 'quarterly': case 'quy': nextRun = last.add(3, 'months').format('DD/MM/YYYY'); break;
          default: nextRun = 'Chưa xác định';
        }
      } else {
        nextRun = moment(config.startDate).format('DD/MM/YYYY');
      }

      // Resolve Director Names from parsed taskData
      let directorNames = '';
      const data = parsedDataMap.get(config.id) || {};
      const directors = data.directors || [];
      directorNames = directors
        .map(d => d.processName || d.name || resolvedNamesMap[d.processId])
        .filter(Boolean)
        .join('; ');

      const assigners = data.assigners || [];
      const assignerNames = assigners
        .map(a => a.processName || a.name || resolvedNamesMap[a.processId])
        .filter(Boolean)
        .join('; ');

      return {
        id: config.id,
        stt: index + 1,
        tieuDe: config.name,
        nguoiChuTri: directorNames || config.createdBy?.name || '',
        nguonGiao: assignerNames || config.createdBy?.name || '',
        assigner: assignerNames || config.createdBy?.name || '',
        chuKy: cycleMap[config.repetitiveTask] || this.mapCycleType(config.repetitiveTask),
        lanThucHienGanNhat: config.lastExecutedAt ? moment(config.lastExecutedAt).format('DD/MM/YYYY') : 'Chưa thực hiện',
        lanTiepTheo: nextRun,
        trangThai: this.mapRecurringStatus(config.status),
        ghiChu: config.note || '',
      };
    });

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  private mapRecurringStatus(status: number) {
    let text = '';
    let bgColor = '';
    let textColor = '';
    let borderColor = '#AEB5BE';
    switch (status) {
      case 1: text = 'Hoạt động'; bgColor = '#ADECC0'; textColor = '#007222'; borderColor = '#ADECC0'; break;
      case 2: text = 'Tạm dừng'; bgColor = '#FEF9C2'; textColor = '#FFA600'; borderColor = '#FFD88F'; break;
      case 0: text = 'Đã hủy'; bgColor = '#FFDCD9'; textColor = '#F44336'; borderColor = '#FFC3C6'; break;
      default: text = 'Không xác định';
    }
    return `<div style="display:flex;overflow: hidden;text-overflow: ellipsis;white-space: nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:${bgColor};color:${textColor};font-weight:700;font-size:14px;border-radius:15px;border: 1px solid ${borderColor};">${text}</div>`;
  }

  private mapCycleType(type: string) {
    const map = {
      'daily': 'Hàng ngày',
      'ngay': 'Hàng ngày',
      'weekly': 'Hàng tuần',
      'tuan': 'Hàng tuần',
      'monthly': 'Hàng tháng',
      'thang': 'Hàng tháng',
      'quarterly': 'Hàng quý',
      'quy': 'Hàng quý',
    };
    return map[type] || type;
  }

  /**
   * BÁO CÁO 4.5: PHÂN TÍCH KHỐI LƯỢNG CÔNG VIỆC THEO NGUỒN
   */
  async getWorkloadBySourceReport(filters: any) {
    filters = await this.applyTaskFilters(filters);
    const { page = 1, limit = 25 } = filters;
    const { data: tasks, total } = await this.reportRepo.findWorkloadBySourceTasks(filters);

    const sourceMap = {
      'general': 'Công việc chung',
      'form_doc': 'Công việc từ VB',
      'form_meeting': 'Công việc từ cuộc họp',
      'project': 'Công việc từ dự án',
    };

    const data = tasks.map((s, index) => {
      const totalCount = Number(s.Total) || 0;
      const completedCount = Number(s.Completed) || 0;

      return {
        stt: index + 1,
        nguonGiaoViec: sourceMap[s.Source] || s.Source,
        nguoiChuTri: s.DirectorNames || '',
        soCVDuocGiao: totalCount,
        hoanThanh: completedCount,
        dungHan: Number(s.OnTime) || 0,
        treHan: Number(s.Overdue) || 0,
        tgXuLyTB: s.AvgProcessingTime ? Number(s.AvgProcessingTime).toFixed(1) : '0',
        tyLeHT: totalCount > 0 ? `${Math.round((completedCount / totalCount) * 100)}%` : '0%',
      };
    });

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  private async applyTaskFilters(filters: any) {
    const { user, userId } = filters;
    const currentUserId = typeof user === 'string'
      ? user
      : user?.userId || userId;

    if (!currentUserId) {
      throw new UnauthorizedException('Token không hợp lệ (không tìm thấy userId).');
    }
    const userObj = await this.sqlsvRepo.getUserById(currentUserId);
    if (!userObj) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa trong hệ thống.');
    }

    // 2. Initialize f from nested filter or flat filter[key] params
    let f = filters.filter || {};
    if (typeof f === 'string') {
      try { f = JSON.parse(f); } catch (e) { f = {}; }
    }

    Object.keys(filters).forEach(key => {
      const decodedKey = decodeURIComponent(key);
      // Regex này sẽ bắt: filter[ngayTao][startDate] -> match[1]="ngayTao", match[2]="[startDate]"
      const match = decodedKey.match(/^filter\[([^\]]+)\](.*)/);
      if (match) {
        const primaryKey = match[1];
        const rest = match[2];

        if (rest === '[]') {
          f[primaryKey] = filters[key];
          return;
        }

        if (rest) {
          const subMatch = rest.match(/^\[([^\]]+)\]/);
          if (subMatch) {
            const secondaryKey = subMatch[1];
            if (typeof f[primaryKey] !== 'object' || f[primaryKey] === null) {
              f[primaryKey] = {};
            }
            f[primaryKey][secondaryKey] = filters[key];
            return;
          }
        }
        f[primaryKey] = filters[key];
      }
    });

    // 2. Map frontend names to repository names
    const mapping = {
      nguoiChuTri: 'directorId',
      nguoiThucHien: 'userId',
      trangThai: 'status',
      uuTien: 'priority',
      overdue: 'overdue',
      quaHan: 'overdue',
      isOverdue: 'overdue',
      cycleType: 'cycleType',
      source: 'source',
      nguonGiaoViec: 'source',
      thang: 'month',
      nam: 'year',
      chuKy: 'cycleType',
      thanhPhan: 'userId', // Added for consistency if needed
      topic: 'topic',
      chuDe: 'topic',
      phongBan: 'deptId',
      nguoiGiao: 'assignerId',
      nguoiTao: 'assignerId',
      assigner: 'assignerId',
      soNgayQua: 'overdueDaysFrom',
    };

    const newFilters: any = { ...filters };
    delete newFilters.userId; // Bỏ gán cứng userId ban đầu

    Object.keys(mapping).forEach(key => {
      if (f[key] !== undefined) {
        newFilters[mapping[key]] = f[key];
      }
    });

    // 3. Numeric conversion for time filters
    if (newFilters.month !== undefined && newFilters.month !== null) newFilters.month = Number(newFilters.month);
    if (newFilters.year !== undefined && newFilters.year !== null) newFilters.year = Number(newFilters.year);
    if (newFilters.overdueDaysFrom !== undefined && newFilters.overdueDaysFrom !== null) newFilters.overdueDaysFrom = Number(newFilters.overdueDaysFrom);

    // 4. Role-based Visibility Constraints
    const roleInfo = await this.checkIsLeader(currentUserId);
    if (!newFilters.directorId && !newFilters.deptId && !newFilters.userId) {
      if (roleInfo.isCompanyLeader) {
        // No restriction for Company Leaders (sees all)
      } else if (roleInfo.isDeptLeader) {
        newFilters.deptId = roleInfo.deptId;
      } else {
        newFilters.userId = currentUserId;
      }
    } else {
      // Khi đã có filter cụ thể (directorId, deptId, userId)
      if (roleInfo.isCompanyLeader) {
        // Lãnh đạo Công ty: xem được theo filter bất kỳ, không ép userId của bản thân
      } else if (roleInfo.isDeptLeader) {
        // Lãnh đạo phòng: xem theo filter nhưng giới hạn trong phạm vi phòng mình (nếu chưa chọn deptId)
        if (!newFilters.deptId) {
          newFilters.deptId = roleInfo.deptId;
        }
      } else {
        // Nhân viên thường: chỉ xem công việc của chính mình
        newFilters.userId = currentUserId;
      }
    }

    // 5. Date range handling
    // - ngayBatDau/ngayTao/dateRange -> fromDate/toDate (lọc theo ngày bắt đầu)
    // - hanHoanThanh -> endDateFrom/endDateTo (lọc theo hạn hoàn thành)
    if (f.ngayTao || f.ngayBatDau || f.dateRange || f.fromDate || f.toDate) {
      const dr = f.ngayTao || f.ngayBatDau || f.dateRange || {};
      newFilters.fromDate = f.fromDate || dr.startDate;
      newFilters.toDate = f.toDate || dr.endDate;
    }

    if (f.hanHoanThanh?.startDate || f.hanHoanThanh?.endDate) {
      newFilters.endDateFrom = f.hanHoanThanh.startDate;
      newFilters.endDateTo = f.hanHoanThanh.endDate;
    } else if (f.ngayBatDau?.startDate || f.ngayBatDau?.endDate) {
      // Fallback theo yêu cầu màn hình báo cáo:
      // nếu chỉ truyền khoảng ngày bắt đầu thì lọc luôn cả hạn hoàn thành cùng khoảng đó.
      newFilters.endDateFrom = f.ngayBatDau.startDate;
      newFilters.endDateTo = f.ngayBatDau.endDate;
    }
    // 6. Pagination numeric conversion
    if (newFilters.page) newFilters.page = Number(newFilters.page);
    if (newFilters.limit) newFilters.limit = Number(newFilters.limit);

    // 7. Sort parameter handling
    if (filters.sort) {
      let sortObj = filters.sort;
      if (typeof sortObj === 'string') {
        try {
          sortObj = JSON.parse(sortObj);
        } catch (e) {
          sortObj = {};
        }
      }
      newFilters.sort = sortObj;
    }

    return newFilters;
  }

  /**
   * BÁO CÁO: CÔNG VIỆC CÓ THỜI GIAN XỬ LÝ LÂU NHẤT
   * Hiển thị danh sách công việc sắp xếp theo thời gian xử lý từ lâu nhất đến gần nhất
   * Hỗ trợ lọc theo: người chủ trì, khoảng thời gian, trạng thái, độ ưu tiên
   */
  async getLongestProcessingTimeTasksReport(filters: any) {
    filters = await this.applyTaskFilters(filters);
    const { userId, page = 1, limit = 25 } = filters;
    filters.minProcessingDays = 10;
    const { data: tasks, total } = await this.reportRepo.findLongestProcessingTimeTasks(filters);
    const priorityMapping = await this.reportRepo.mapCrmTitlesBatch(tasks, ['DOUUTIEN']);

    const data = tasks.map((task, index) => {

      const assigner = task.taskUsers.find(tu => tu.role === 'assigner' && tu.processId !== userId);
      const directors = task.taskUsers.filter(tu => tu.role === 'director');
      const nguoiChuTri = directors.map(d => d.processName).join(', ');
      const crmMapped = priorityMapping[task.id] || {};

      // Tính số ngày xử lý
      const startDate = moment(task.startDate || task.createdAt);
      const endDate = moment(task.endDate || task.updatedAt || new Date());
      const processingDays = endDate.diff(startDate, 'days');

      return {
        id: task.id,
        stt: (page - 1) * limit + index + 1,
        tieuDe: task.name,
        nguoiChuTri: nguoiChuTri,
        nguoiTao: assigner?.processName || task.createdBy?.name || '',
        nguonGiao: assigner?.processName || task.createdBy?.name || '',
        assigner: assigner?.processName || task.createdBy?.name || '',
        ngayBatDau: task.startDate ? moment(task.startDate).format('DD/MM/YYYY') : moment(task.createdAt).format('DD/MM/YYYY'),
        hanHoanThanh: task.endDate ? moment(task.endDate).format('DD/MM/YYYY') : '',
        trangThai: this.mapStatusToHtml(task.processStatus),
        uuTien: crmMapped.priority || task.priority || 'Trung bình',
        tienDo: `${task.progress || 0}%`,
        thoiGianXuLy: processingDays,
        thoiGianXuLyText: `${processingDays} ngày`,
      };
    });

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  /**
   * BÁO CÁO: DANH SÁCH CÔNG VIỆC THEO CHỦ ĐỀ
   */
  async getTopicTaskListReport(filters: any) {
    filters = await this.applyTaskFilters(filters);
    const { userId, page = 1, limit = 25 } = filters;
    const { data: tasks, total } = await this.reportRepo.findTopicTaskListTasks(filters);

    const data = tasks.map((task, index) => {
      const isSelfCreated = task.createdById === userId;
      const assigner = task.taskUsers.find(tu => tu.role === 'assigner');
      const directors = task.taskUsers.filter(tu => tu.role === 'director');
      const nguoiChuTri = directors.map(d => d.processName).join(', ');
      const mapTopic = {
        'DT': 'Đào tạo',
        "CC": "Chấm công",
        "TD": "Tuyển dụng"
      }

      return {
        stt: (page - 1) * limit + index + 1,
        nguoiChuTri: nguoiChuTri,
        tieuDe: task.name,
        chuDe: mapTopic[task.topic] || task.topic || '',
        nguonGiao: isSelfCreated ? 'Tự tạo' : (assigner?.processName || task.createdBy?.name || ''),
        assigner: isSelfCreated ? 'Tự tạo' : (assigner?.processName || task.createdBy?.name || ''),
        nguoiTao: isSelfCreated ? 'Tự tạo' : (assigner?.processName || task.createdBy?.name || ''),
        ngayTao: moment(task.createdAt).format('DD/MM/YYYY'),
        hanHoanThanh: task.endDate ? moment(task.endDate).format('DD/MM/YYYY') : '',
        trangThai: this.mapStatusToHtml(task.processStatus),
        tienDo: `${task.progress || 0}%`,
      };
    });

    return {
      data,
      limit: Number(limit),
      page: Number(page),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private mapStatusToHtml(status: string): string {
    const s = String(status || '').trim();
    let text = '';
    let bgColor = '';
    let textColor = '';
    let borderColor = '#AEB5BE';

    switch (s) {
      case '1':
        text = 'Công việc mới';
        bgColor = '#E0E0E0';
        textColor = '#555555';
        break;
      case '2':
        text = 'Đang thực hiện';
        bgColor = '#DBEAFE';
        textColor = '#0062AD';
        break;
      case '3':
        text = 'Chờ phê duyệt';
        bgColor = '#FEF9C2';
        textColor = '#FFA600';
        break;
      case '4':
        text = 'Hoàn thành';
        bgColor = '#D0FFDE';
        textColor = '#007222';
        borderColor = '#ADECC0';
        break;
      case '8':
        text = 'Hủy';
        bgColor = '#FFDCD9';
        textColor = '#F44336';
        borderColor = '#FFCFCF';
        break;
      case '5':
        text = 'Điều chỉnh';
        bgColor = '#FEF9C2';
        textColor = '#FFA600';
        break;
      case '6':
        text = 'Chờ điều chỉnh';
        bgColor = '#FEF9C2';
        textColor = '#FFA600';
        break;
      case '9':
        text = 'Quá hạn';
        bgColor = '#FFDCD9';
        textColor = '#F44336';
        borderColor = '#FFCFCF';
        break;
      default:
        return s;
    }

    return `<div style="display:flex;overflow: hidden;text-overflow: ellipsis;white-space: nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:${bgColor};color:${textColor};font-weight:700;font-size:14px;border-radius:15px;border: 1px solid ${borderColor};">${text}</div>`;
  }

  private mapTypeTask(type: string): string {
    if (!type) return 'Giao việc';
    const t = type.toLowerCase();
    const map = {
      'general': 'Công việc chung',
      'taskgeneral': 'Công việc chung',
      'general_task': 'Công việc chung',
      'form_doc': 'Văn bản',
      'taskformdoc': 'Văn bản',
      'document': 'Văn bản',
      'form_meeting': 'Cuộc họp',
      'taskformmeeting': 'Cuộc họp',
      'meeting': 'Cuộc họp',
      'recurring': 'Lặp lại',
      'template': 'Mẫu',
      'project': 'Dự án',
      'form_project': 'Dự án',
    };
    return map[t] || 'Giao việc';
  }

  // ─── API kiểm tra vai trò lãnh đạo ───────────────────────────────────────

  /**
   * Kiểm tra người dùng có phải lãnh đạo hay không
   * Trả về: { isCompanyLeader, isDeptLeader, deptId, deptName }
   */
  async checkIsLeader(userId: string) {
    const userGroups = await this.sqlsvRepo.getUserGroups(userId);
    const groupCodes = userGroups.map(g => g.code);

    const isCompanyLeader = groupCodes.some(c =>
      [GROUP_CODES.TONG_GIAM_DOC, GROUP_CODES.PHO_GIAM_DOC].includes(c),
    );
    const isDeptLeader = groupCodes.some(c =>
      [GROUP_CODES.TRUONG_PHONG, GROUP_CODES.PHO_TRUONG_PHONG].includes(c),
    );
    const isTruongPhong = groupCodes.includes(GROUP_CODES.TRUONG_PHONG);

    let deptId: string | null = null;
    let deptName: string | null = null;

    if (isDeptLeader || isCompanyLeader) {
      const userDetail = await this.sqlsvRepo.getUserById(userId);
      deptId = userDetail?.parent?.id ?? null;
      deptName = userDetail?.parent?.name ?? null;
    }

    return {
      isCompanyLeader,
      isDeptLeader,
      isTruongPhong,
      isLeader: isCompanyLeader || isDeptLeader,
      deptId,
      deptName,
    };
  }

  // ─── API thống kê phòng ban (dành cho Lãnh đạo) ──────────────────────────

  /**
   * BÁO CÁO PHÒNG BAN: Tổng hợp hiệu suất theo từng phòng ban
   * Điều kiện: công việc cha (parentId IS NULL) + người chủ trì (role='director')
   */
  async getDeptPerformanceReport(filters: any) {
    const f = await this.applyDeptFilters(filters);
    const { fromDate, toDate } = f;
    const stats = await this.reportRepo.countDepartmentPerformance(f);

    return stats.map((s: any, index: number) => {
      const total = Number(s.Total) || 0;
      const completed = Number(s.Completed) || 0;
      const onTime = Number(s.OnTime) || 0;

      return {
        stt: index + 1,
        startDate: fromDate ? moment(fromDate).format('DD/MM/YYYY') : '',
        endDate: toDate ? moment(toDate).format('DD/MM/YYYY') : '',
        deptId: s.DeptId,
        phongBan: s.DeptName || '',
        tongCV: total,
        hoanThanh: completed,
        dungHan: onTime,
        treHan: Number(s.Overdue) || 0,
        dangLam: Number(s.InProgress) || 0,
        tyLeHT: total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%',
        tyLeDungHan: completed > 0 ? `${Math.round((onTime / completed) * 100)}%` : '0%',
      };
    });
  }

  /**
   * BÁO CÁO PHÒNG BAN - CHI TIẾT: Danh sách công việc của 1 phòng ban
   */
  async getDeptTaskDetailReport(filters: any) {
    const f = await this.applyDeptFilters(filters);
    const { deptId, page = 1, limit = 25 } = f;

    if (!deptId) throw new Error('Thiếu deptId');


    // Nếu FE không truyền tháng/năm, mặc định lấy kỳ gần nhất của phòng ban
    // để detail khớp với dòng đầu tiên của báo cáo dept-performance.
    if (!f.month && !f.year && !f.fromDate && !f.toDate) {
      const latestStats = await this.reportRepo.countDepartmentPerformance({ deptId });
      if (latestStats?.length > 0) {
        const first = latestStats[0];
        const latestMonth = Number(first?._month);
        const latestYear = Number(first?._year);
        if (!Number.isNaN(latestMonth) && latestMonth >= 1 && latestMonth <= 12) {
          f.month = latestMonth;
        }
        if (!Number.isNaN(latestYear) && latestYear > 0) {
          f.year = latestYear;
        }
      }
    }

    const { data: tasks, total } = await this.reportRepo.findDepartmentTaskDetail(f);

    const data = tasks.map((task, index) => {
      const directors = task.taskUsers.filter(tu => tu.role === 'director');
      const nguoiChuTri = directors.map(d => d.processName).join(', ');
      const assigner = task.taskUsers.find(tu => tu.role === 'assigner');

      return {
        stt: (page - 1) * limit + index + 1,
        id: task.id,
        tieuDe: task.name,
        nguoiChuTri,
        nguoiTao: assigner?.processName || task.createdBy?.name || '',
        nguoiGiao: assigner?.processName || task.createdBy?.name || '',
        ngayBatDau: task.startDate ? moment(task.startDate).format('DD/MM/YYYY') : '',
        ngayTao: moment(task.createdAt).format('DD/MM/YYYY'),
        hanKetThuc: task.endDate ? moment(task.endDate).format('DD/MM/YYYY') : '',
        tienDo: buildProgressView(task).html,
        trangThai: this.mapStatusToHtml(task.processStatus),
        nguonCongViec: buildTypeTaskView(task.typeTask).html,
      };
    });

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Tách filter chung cho các endpoint phòng ban */
  private async applyDeptFilters(filters: any) {
    const { user } = filters;
    const currentUserId = typeof user === 'string' ? user : user?.userId;

    let f = filters.filter || {};
    if (typeof f === 'string') {
      try { f = JSON.parse(f); } catch (e) { f = {}; }
    }

    // Thủ công parse các key kiểu filter[key] hoặc filter[key][]
    Object.keys(filters).forEach(key => {
      const decodedKey = decodeURIComponent(key);
      const match = decodedKey.match(/^filter\[([^\]]+)\]/);
      if (match) {
        const cleanKey = match[1];
        const val = filters[key];
        f[cleanKey] = val;
      }
    });

    // Mapping date ranges from advanced filter keys
    if (f['ngayBatDau.startDate']) f.startDateFrom = f['ngayBatDau.startDate'];
    if (f['ngayBatDau.endDate']) f.startDateTo = f['ngayBatDau.endDate'];
    if (f['ngayHetHan.startDate']) f.endDateFrom = f['ngayHetHan.startDate'];
    if (f['ngayHetHan.endDate']) f.endDateTo = f['ngayHetHan.endDate'];
    
    if (f.ngayTao?.startDate) f.fromDate = f.ngayTao.startDate;
    if (f.ngayTao?.endDate) f.toDate = f.ngayTao.endDate;
    if (f['ngayTao.startDate']) f.fromDate = f['ngayTao.startDate'];
    if (f['ngayTao.endDate']) f.toDate = f['ngayTao.endDate'];

    const mapping = {
      phongBan: 'deptId',
      department: 'deptId',
      thang: 'month',
      nam: 'year',
      deptId: 'deptId',
      month: 'month',
      year: 'year',
      overdue: 'overdue',
      trangThai: 'processStatus',
      nguoiChuTri: 'directorId',
      nguonCongViec: 'typeTask',
      name: 'name',
      tieuDe: 'name',
      assigner: 'assignerId',
      nguoiGiao: 'assignerId',
    };

    const merged = { ...filters };

    Object.keys(mapping).forEach(k => {
      const val = f[k];
      if (val !== undefined && val !== null && val !== '') {
        merged[mapping[k]] = val;
      }
    });

    // Hỗ trợ query trực tiếp: ?thang=MM/YYYY (không đi qua filter[thang])
    if (!f.thang && typeof merged.thang === 'string') {
      f.thang = merged.thang;
    }

    // Normalize deptId input from UI (quoted string, CSV, JSON array)
    if (merged.deptId !== undefined && merged.deptId !== null) {
      const rawDept = merged.deptId;
      let deptList: string[] = [];

      if (Array.isArray(rawDept)) {
        deptList = rawDept;
      } else if (typeof rawDept === 'string') {
        const s = rawDept.trim();
        if (s.startsWith('[') && s.endsWith(']')) {
          try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) deptList = parsed;
          } catch (e) {
            deptList = s.split(',');
          }
        } else if (s.includes(',')) {
          deptList = s.split(',');
        } else {
          deptList = [s];
        }
      } else {
        deptList = [String(rawDept)];
      }

      const cleaned = deptList
        .map(v => String(v).trim().replace(/^"+|"+$/g, ''))
        .filter(Boolean);

      merged.deptId = cleaned.length <= 1 ? cleaned[0] : cleaned;
    }

    // Support "thang" from UI in MM/YYYY format
    if (typeof f.thang === 'string' && f.thang.includes('/')) {
      const [mm, yyyy] = f.thang.split('/');
      const month = Number(mm);
      const year = Number(yyyy);
      if (!Number.isNaN(month) && month >= 1 && month <= 12) merged.month = month;
      if (!Number.isNaN(year)) merged.year = year;
    }

    // Ép kiểu số
    if (merged.month) merged.month = Number(merged.month);
    if (merged.year) merged.year = Number(merged.year);
    if (merged.page) merged.page = Number(merged.page);
    if (merged.limit) merged.limit = Number(merged.limit);

    return merged;
  }

  /**
   * BÁO CÁO THỐNG KÊ CÔNG VIỆC CỦA PHÒNG
   */
  async getDeptWorkStatsReport(filters: any) {
    const { user, page = 1, limit = 25, search, includeOptions } = filters;
    const currentUserId = typeof user === 'string' ? user : user?.userId;

    // Phân quyền: Kiểm tra người dùng có thuộc Ban Lãnh đạo / Lãnh đạo phòng không
    const roleInfo = await this.checkIsLeader(currentUserId);
    if (!roleInfo.isLeader) {
      throw new ForbiddenException('Bạn không có quyền truy cập báo cáo thống kê công việc của phòng');
    }

    // Extract nested filter object if any
    let f: any = typeof filters.filter === 'object' && filters.filter !== null ? { ...filters.filter } : {};
    if (typeof filters.filter === 'string') {
      try { f = JSON.parse(filters.filter); } catch (e) {}
    }

    // Parse any bracket notation keys from filters like filter[assignerIds][], filter[deptIds][], filter[nguoiGiao][], etc.
    Object.keys(filters).forEach(key => {
      const decodedKey = decodeURIComponent(key);
      const match = decodedKey.match(/^filter\[([^\]]+)\]/);
      if (match) {
        const primaryKey = match[1];
        const val = filters[key];
        if (f[primaryKey] === undefined) {
          f[primaryKey] = val;
        } else {
          const existing = Array.isArray(f[primaryKey]) ? f[primaryKey] : [f[primaryKey]];
          const addition = Array.isArray(val) ? val : [val];
          f[primaryKey] = [...new Set([...existing, ...addition])];
        }
      }
    });

    // Lấy danh sách ID phòng ban lọc (nếu có)
    let deptIds: string[] | undefined;
    const rawDeptIds = filters.deptIds || f.deptIds || f.phongBan || f.deptId || filters.deptId || filters.phongBan;
    if (rawDeptIds) {
      if (Array.isArray(rawDeptIds)) {
        deptIds = rawDeptIds.map(s => String(s).trim()).filter(Boolean);
      } else if (typeof rawDeptIds === 'string') {
        deptIds = rawDeptIds.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    // Lấy danh sách ID người giao lọc (nếu có)
    let assignerIds: string[] | undefined;
    const rawAssignerIds = filters.assignerIds || f.assignerIds || f.nguoiGiao || f.nguoiTao || f.assigner || filters.nguoiGiao;
    if (rawAssignerIds) {
      if (Array.isArray(rawAssignerIds)) {
        assignerIds = rawAssignerIds.map(s => String(s).trim()).filter(Boolean);
      } else if (typeof rawAssignerIds === 'string') {
        assignerIds = rawAssignerIds.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    // Helper định dạng chuỗi ngày an toàn thành YYYY-MM-DD
    const formatDateStr = (val: any): string | undefined => {
      if (!val) return undefined;
      if (typeof val === 'object' && val !== null) return undefined;
      const str = String(val).trim();
      if (!str) return undefined;
      const m = moment(str);
      return m.isValid() ? m.format('YYYY-MM-DD') : str;
    };

    // Helper bóc tách từ ngày / đến ngày từ đối tượng hoặc chuỗi
    const parseDateRange = (raw: any) => {
      let from: string | undefined;
      let to: string | undefined;
      if (typeof raw === 'object' && raw !== null) {
        from = formatDateStr(raw.startDate || raw.fromDate || raw.from || raw.start || raw.min);
        to = formatDateStr(raw.endDate || raw.toDate || raw.to || raw.end || raw.max);
      } else if (typeof raw === 'string') {
        const formatted = formatDateStr(raw);
        to = formatted;
      }
      return { from, to };
    };

    let endDateFrom: string | undefined;
    let endDateTo: string | undefined;
    let startDateFrom: string | undefined;
    let startDateTo: string | undefined;

    const rawStartDate = filters.startDate || f.startDate || filters.start_date || f.start_date;
    const rawEndDate = filters.endDate || f.endDate || filters.end_date || f.end_date;

    // Do FE định nghĩa cột hiển thị dùng key="startDate" và bộ lọc gửi lên startDate/endDate dưới dạng chuỗi đơn lẻ.
    // Nên ta cần lọc theo trường Ngày bắt đầu (startDate) của công việc.
    if (rawStartDate && typeof rawStartDate === 'string') {
      startDateFrom = formatDateStr(rawStartDate);
    } else if (rawStartDate && typeof rawStartDate === 'object') {
      const parsedStart = parseDateRange(rawStartDate);
      startDateFrom = parsedStart.from;
      startDateTo = parsedStart.to;
    }

    if (rawEndDate && typeof rawEndDate === 'string') {
      startDateTo = formatDateStr(rawEndDate);
    } else if (rawEndDate && typeof rawEndDate === 'object') {
      const parsedEnd = parseDateRange(rawEndDate);
      endDateFrom = parsedEnd.from;
      endDateTo = parsedEnd.to;
    }

    // Lọc theo từ ngày - đến ngày (Legacy / fallback)
    const fromDate = formatDateStr(filters.fromDate || f.fromDate || f.from);
    const toDate = formatDateStr(filters.toDate || f.toDate || f.to);
    if (fromDate && toDate && moment(toDate).isBefore(moment(fromDate), 'day')) {
      throw new BadRequestException('Đến ngày phải lớn hơn hoặc bằng Từ ngày');
    }

    // Lọc theo nguồn công việc (sources)
    let sources: string[] | undefined;
    const rawSources = filters.sources || f.sources || f.source;
    if (rawSources) {
      if (Array.isArray(rawSources)) {
        sources = rawSources.map(s => String(s).trim()).filter(Boolean);
      } else if (typeof rawSources === 'string') {
        sources = rawSources.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const { tasks, total, chartStats } = await this.reportRepo.findDeptWorkStatsTasks({
      deptIds,
      assignerIds,
      fromDate,
      toDate,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
      sources,
      page: Number(page),
      limit: Number(limit),
      search: search ? String(search).trim() : undefined,
    });

    const data = tasks.map((task, index) => {
      const assigner = task.taskUsers?.find(tu => tu.role === 'assigner');
      const directors = task.taskUsers?.filter(tu => tu.role === 'director') || [];
      const supporters = task.taskUsers?.filter(tu => tu.role === 'supporter') || [];

      const phongChuTriList = Array.from(
        new Set(
          directors
            .map(d => (d.type === 2 ? (d.organizationUnit?.name || d.processName) : (d.user?.parent?.name || d.organizationUnit?.name || d.processName)))
            .filter(Boolean)
        )
      );

      const phongPhoiHopList = Array.from(
        new Set(
          supporters
            .map(s => (s.type === 2 ? (s.organizationUnit?.name || s.processName) : (s.user?.parent?.name || s.organizationUnit?.name || s.processName)))
            .filter(Boolean)
        )
      );

      let sourceText = 'Công việc chung';
      if (task.docId || ['document', 'form_doc', 'TaskFormDoc'].includes(task.typeTask)) {
        sourceText = 'Từ văn bản';
      } else if (task.meetingId || task.meetingConclusionId || ['meeting', 'form_meeting', 'TaskFormMeeting'].includes(task.typeTask)) {
        sourceText = 'Từ cuộc họp';
      } else if (task.typeTask) {
        sourceText = this.mapTypeTask(task.typeTask);
      }

      const assignerName = assigner?.processName || assigner?.user?.name || task.createdBy?.name || '';
      const phongChuTriText = phongChuTriList.join(', ');
      const phongPhoiHopText = phongPhoiHopList.join(', ');
      const startDateText = task.startDate ? moment(task.startDate).format('DD/MM/YYYY') : '';
      const endDateText = task.endDate ? moment(task.endDate).format('DD/MM/YYYY') : '';

      const isOverdue = task.endDate && moment(task.endDate).isBefore(moment(), 'day') && String(task.processStatus) !== '4';
      const effectiveStatus = isOverdue ? '9' : (String(task.processStatus || '1').trim() || '1');

      return {
        stt: (Number(page) - 1) * Number(limit) + index + 1,
        id: task.id,
        tieuDe: task.name,
        deptIds: phongChuTriText,
        phongChuTri: phongChuTriText,
        phongChuTriList: phongChuTriList,
        assignerIds: assignerName,
        nguoiGiao: assignerName,
        phongPhoiHop: phongPhoiHopText,
        phongPhoiHopList: phongPhoiHopList,
        startDate: startDateText,
        endDate: endDateText,
        hanKetThuc: endDateText,
        tienDo: `${task.progress || 0}%`,
        progressValue: Number(task.progress || 0),
        sources: sourceText,
        trangThai: this.mapStatusToHtml(effectiveStatus),
        processStatus: effectiveStatus,
      };
    });

    let optionsData: any = undefined;
    if (includeOptions === true || includeOptions === 'true') {
      optionsData = await this.getDeptWorkStatsFilterOptionsInternal();
    }

    return {
      data,
      chartStats,
      ...(optionsData ? { filterOptions: optionsData } : {}),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  private async getDeptWorkStatsFilterOptionsInternal() {
    try {
      const depts = await this.reportRepo.manager.query(
        `SELECT id, name, code FROM organization_units WHERE status = 1 ORDER BY [order] ASC, name ASC`
      );
      const leaders = await this.reportRepo.manager.query(
        `SELECT DISTINCT u.id, u.name, u.username 
         FROM users u 
         INNER JOIN user_group_users ugu ON ugu.user_id = u.id 
         INNER JOIN group_users gu ON gu.id = ugu.group_user_id 
         WHERE gu.code IN ('tonggd', 'phogdtongcty', 'truongphong', 'photruongphong') AND u.status = 1
         ORDER BY u.name ASC`
      );

      return {
        departments: depts.map((d: any) => ({ id: d.id, name: d.name, code: d.code })),
        assigners: leaders.map((u: any) => ({ id: u.id, name: u.name, username: u.username })),
        sources: [
          { id: 'general', name: 'Công việc chung' },
          { id: 'document', name: 'Công việc từ văn bản' },
          { id: 'meeting', name: 'Công việc từ cuộc họp' },
        ],
      };
    } catch (e) {
      return {
        departments: [],
        assigners: [],
        sources: [
          { id: 'general', name: 'Công việc chung' },
          { id: 'document', name: 'Công việc từ văn bản' },
          { id: 'meeting', name: 'Công việc từ cuộc họp' },
        ],
      };
    }
  }
}
