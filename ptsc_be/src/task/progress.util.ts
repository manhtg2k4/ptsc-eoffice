// src/task/progress.util.ts
import { TaskEntity } from './entity/task.entity';
import * as moment from 'moment';

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}


interface ProgressHtmlProps {
  percent: number;
  text: string;
  color: string;
  width?: number; // width động
  slowReason?: string | null;
  isOverdue?: boolean;
}

// Tạo HTML progress bar
export function buildProgressHtml({
  percent,
  text,
  color,
  slowReason,
  isOverdue,
}: ProgressHtmlProps): string {
  const safePercent = Math.max(0, Math.min(100, percent));

  // Màu thanh bar
  const barColor = isOverdue ? '#e05050' : color;
  // Nền thanh bar: xanh nhạt mặc định, đỏ nhạt nếu quá hạn
  const trackColor = isOverdue ? '#fde0e0' : '#dce6f5';
  // Màu chữ phần trăm
  const textColor = isOverdue ? '#e05050' : '#1a3353';

  const progressContent = `
<div style="
  width: 100%;
  min-width: 120px;
">
  <div style="
    font-weight: 700;
    font-size: 14px;
    color: ${textColor};
    margin-bottom: 4px;
  ">${safePercent}%</div>
  <div style="
    width: 100%;
    height: 10px;
    border-radius: 999px;
    background: ${trackColor};
    overflow: hidden;
  ">
    <div style="
      width: ${safePercent}%;
      background: ${barColor};
      height: 100%;
      border-radius: 999px;
      transition: width 0.3s ease;
    "></div>
  </div>
</div>`;

  if (isOverdue) {
    return `
<div class="unit-task-wrapper" style="width: 100%; display: block;">
  <div class="unit-task-tooltip" style="text-align: left; z-index: 9999; max-height: 250px; overflow: auto; text-align: justify;">
    <div><strong style="color: #ff6c70">Lý do chậm tiến độ công việc:</strong><br/>${escapeHtml(slowReason) || 'Không có lý do chậm trễ'}</div>
  </div>
  <div class="unit-task-label" style="cursor:pointer; width: 100%; display:block;">
    ${progressContent}
  </div>
</div>`;
  }

  return progressContent;
}



// Tính chênh lệch thời gian
export function calcDiffText(from: any, to: any, mode: 'remain' | 'done'): string {
  // 1. Kiểm tra đầu vào thô
  if (!from || !to) {
    return 'Không thời hạn';
  }

  // 2. Ép kiểu về Date (đề phòng trường hợp nhận vào string hoặc timestamp)
  const dFrom = from instanceof Date ? from : new Date(from);
  const dTo = to instanceof Date ? to : new Date(to);

  // 3. Kiểm tra Invalid Date
  if (isNaN(dFrom.getTime()) || isNaN(dTo.getTime())) {
    return 'Không thời hạn';
  }

  const diffMs = dTo.getTime() - dFrom.getTime();
  const absMs = Math.abs(diffMs);

  const totalHours = Math.floor(absMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0) parts.push(`${hours} giờ`);
  if (parts.length === 0) return mode === 'remain' ? 'Đến hạn' : 'Đúng hạn';

  if (mode === 'remain') return diffMs >= 0 ? `Còn ${parts.join(' ')}` : `Quá ${parts.join(' ')}`;
  return diffMs >= 0 ? `Sớm ${parts.join(' ')}` : `Trễ ${parts.join(' ')}`;
}

// buildProgressView async, trả html có width từ API
export function buildProgressView(task: TaskEntity) {
  const now = new Date();
  const progress = Number(task.progress) || 0;
  const isCompleted = String(task.processStatus) === '4';
  const hasDeadlineExceeded = !!(task.endDate && now > task.endDate);

  let timeText = '';
  let status: string;

  if (hasDeadlineExceeded && progress < 100) {
    timeText = calcDiffText(now, task.endDate, 'remain');
    status = 'OVERDUE';
  } else if (progress === 100 && isCompleted) {
    // Đã hoàn thành chính thức → hiển thị Sớm/Trễ
    const doneAt = task.updatedAt ?? now;
    if (task.endDate) {
      timeText = calcDiffText(doneAt, task.endDate, 'done');
      status = timeText.startsWith('Sớm') ? 'EARLY' : 'LATE';
    } else {
      timeText = 'Không thời hạn';
      status = 'COMPLETED';
    }
  } else if (progress === 100 && !isCompleted) {
    // CV con hoàn thành hết nhưng cv cha chưa đánh dấu hoàn thành
    // → vẫn tính thời gian còn/quá hạn so với deadline
    timeText = task.endDate
      ? calcDiffText(now, task.endDate, 'remain')
      : 'Không thời hạn';
    status = task.endDate && now > task.endDate ? 'OVERDUE' : 'IN_PROGRESS';
  } else {
    timeText = task.endDate
      ? calcDiffText(now, task.endDate, 'remain')
      : 'Không thời hạn';
    status = progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';
  }

  // Tinh chỉnh màu sắc theo yêu cầu
  let color = '#c6cbd1'; // Mặc định xám
  if (status === 'OVERDUE') {
    color = '#EF5350'; // Đỏ (Quá hạn)
  } else if (progress === 100 && isCompleted) {
    color = '#23B052'; // Xanh lá (Hoàn thành)
  } else if (progress > 0) {
    color = '#2364B0'; // Xanh dương (Đang thực hiện)
  }

  const html = buildProgressHtml({
    percent: progress,
    text: timeText,
    color,
    slowReason: (task as any).slowReason,
    isOverdue: status === 'OVERDUE',
  });

  const deadlineExceededHtml = hasDeadlineExceeded
    ? buildProgressHtml({
      percent: progress,
      text: calcDiffText(now, task.endDate, 'remain'),
      color: '#EF5350',
      slowReason: (task as any).slowReason,
      isOverdue: true,
    })
    : '';

  return {
    rawText: `${progress}% - ${timeText}`,
    status,
    percent: progress,
    color,
    html,
    isDeadlineExceeded: deadlineExceededHtml,
  };
}

// ===== BADGE VIEW HELPERS =====

interface BadgeConfig {
  text: string;
  bgColor: string;
  textColor: string;
}

/**
 * Build HTML badge view with consistent styling
 */
export function buildBadgeHtml(config: BadgeConfig): string {
  return `<div style="
    display:flex;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    align-items:center;
    justify-content:center;
    width:100%;
    height:30px;
    padding:0 16px;
    background:${config.bgColor};
    color:${config.textColor};
    font-weight:700;
    font-size:14px;
    border-radius:15px;
    border: 1px solid #AEB5BE;
  ">${config.text}</div>`;
}

// Loại yêu cầu (typeRequest) colors
const TYPE_REQUEST_CONFIG: Record<string, BadgeConfig> = {
  // GUI_PHE_DUYET: { text: 'Phê duyệt kết quả', bgColor: '#D1FAE5', textColor: '#007222' },
  GUI_PHE_DUYET: { text: 'Phê duyệt kết quả', bgColor: '#DBEAFE', textColor: '#0062AD' },
  // DIEU_CHINH: { text: 'Điều chỉnh thông tin', bgColor: '#DBEAFE', textColor: '#0062AD' },
  DIEU_CHINH: { text: 'Điều chỉnh thông tin', bgColor: '#FEF9C2', textColor: '#FFA600' },
  GUI_DIEU_CHINH: { text: 'Điều chỉnh thông tin', bgColor: '#FEF9C2', textColor: '#FFA600' },
};

/**
 * Build HTML view for typeRequest field
 */
export function buildTypeRequestView(typeRequest?: string): { html: string; text: string } {
  if (!typeRequest) {
    return { html: '', text: '' };
  }

  const config = TYPE_REQUEST_CONFIG[typeRequest] || {
    text: typeRequest,
    bgColor: '#E5E7EB',
    textColor: '#374151',
  };

  return {
    html: buildBadgeHtml(config),
    text: config.text,
  };
}

// Nguồn công việc (typeTask) colors - sử dụng lowercase keys giống TYPE_TASK_VN
const TYPE_TASK_CONFIG: Record<string, BadgeConfig> = {
  // Lowercase keys (từ database/entity)
  project: { text: 'Công việc dự án', bgColor: '#94ffc4ff', textColor: '#006d18ff' },
  template: { text: 'Mẫu', bgColor: '#E5E7EB', textColor: '#374151' },
  recurring: { text: 'Công việc lặp lại', bgColor: '#DBEAFE', textColor: '#0062AD' },
  general: { text: 'Công việc chung', bgColor: '#DBEAFE', textColor: '#0062AD' },
  form_doc: { text: 'Công việc từ văn bản', bgColor: '#FEF9C2', textColor: '#FFA600' },
  form_meeting: { text: 'Công việc từ cuộc họp', bgColor: '#D1FAE5', textColor: '#007222' },
  // Legacy PascalCase keys (fallback)
  TaskGeneral: { text: 'Công việc chung', bgColor: '#DBEAFE', textColor: '#0062AD' },
  TaskFormDoc: { text: 'Công việc từ văn bản', bgColor: '#FFDCD9', textColor: '#FEF9C2' },
  TaskFormMeeting: { text: 'Công việc từ cuộc họp', bgColor: '#D1FAE5', textColor: '#007222' },
  TaskRecurring: { text: 'Công việc lặp lại', bgColor: '#DBEAFE', textColor: '#0062AD' },
  TaskProject: { text: 'Dự án', bgColor: '#FEF9C2', textColor: '#854D0E' },
};

/**
 * Build HTML view for typeTask field
 */
export function buildTypeTaskView(typeTask?: string): { html: string; text: string } {
  if (!typeTask) {
    return { html: '', text: '' };
  }

  const config = TYPE_TASK_CONFIG[typeTask] || {
    text: typeTask,
    bgColor: '#E5E7EB',
    textColor: '#374151',
  };

  return {
    html: buildBadgeHtml(config),
    text: config.text,
  };
}

// Trạng thái phê duyệt (approval status) colors
const APPROVAL_STATUS_CONFIG: Record<string, BadgeConfig> = {
  // Chờ phê duyệt
  pending: { text: 'Chờ phê duyệt', bgColor: '#DBEAFE', textColor: '#0062AD' },
  GUI_PHE_DUYET: { text: 'Chờ phê duyệt', bgColor: '#FEF9C2', textColor: '#FFA600' },
  GUI_DIEU_CHINH: { text: 'Chờ phê duyệt', bgColor: '#FEF9C2', textColor: '#FFA600' },
  // Đồng ý phê duyệt
  accepted: { text: 'Đồng ý phê duyệt', bgColor: '#D1FAE5', textColor: '#007222' },
  PHE_DUYET: { text: 'Đồng ý phê duyệt', bgColor: '#D1FAE5', textColor: '#007222' },
  DONG_Y: { text: 'Đồng ý phê duyệt', bgColor: '#D1FAE5', textColor: '#007222' },
  DONG_Y_DIEU_CHINH: { text: 'Đồng ý điều chỉnh', bgColor: '#D1FAE5', textColor: '#007222' },
  XAC_NHAN_DIEU_CHINH: { text: 'Đồng ý điều chỉnh', bgColor: '#D1FAE5', textColor: '#007222' },
  DIEU_CHINH: { text: 'Đã điều chỉnh', bgColor: '#D1FAE5', textColor: '#007222' },
  // Từ chối phê duyệt
  rejected: { text: 'Từ chối phê duyệt', bgColor: '#FFDCD9', textColor: '#C41E1E' },
  TU_CHOI: { text: 'Từ chối điều chỉnh', bgColor: '#FFDCD9', textColor: '#C41E1E' },
  TU_CHOI_PHE_DUYET: { text: 'Từ chối phê duyệt', bgColor: '#FFDCD9', textColor: '#C41E1E' },
};

/**
 * Build HTML view for approval status
 */
export function buildApprovalStatusView(status?: string): { html: string; text: string } {
  if (!status) {
    return { html: '', text: '' };
  }

  const config = APPROVAL_STATUS_CONFIG[status] || {
    text: status,
    bgColor: '#E5E7EB',
    textColor: '#374151',
  };

  return {
    html: buildBadgeHtml(config),
    text: config.text,
  };
}

/**
 * Helper to build date view with red color and tooltip if validation fails
 */
function buildDateWithTooltip(dateStr: string, tooltip: string): string {
  return `
<div class="unit-task-wrapper" style="width: 100%;">
  <div class="unit-task-tooltip" style="text-align: left; z-index: 9999; top: 100%; left: 0; min-width: 200px;">
    <div><strong style="color: #ff6c70">Cảnh báo:</strong><br/>${tooltip}</div>
  </div>
  <div class="unit-task-label" style="cursor:pointer; width: 100%; display:block; color: red;">
    ${dateStr}
  </div>
</div>`.trim();
}

/**
 * Build view for startDate with validation against parentTask.endDate
 */
export function buildStartDateView(task: TaskEntity, parentTask?: TaskEntity | null): string {
  const dateStr = task.startDate ? moment(task.startDate).format('DD/MM/YYYY') : '';
  if (!parentTask || !task.startDate || !parentTask.endDate) {
    return dateStr;
  }

  if (moment(task.startDate).isAfter(moment(parentTask.endDate))) {
    const tooltip = `Ngày bắt đầu của công việc ${task.name || 'ABC'} đang vượt quá hạn kết thúc công việc ${parentTask.name || 'BCD'}. Hãy cập nhật lại thời gian.`;
    return buildDateWithTooltip(dateStr, tooltip);
  }

  return dateStr;
}

/**
 * Build view for endDate with validation against parentTask.endDate
 */
export function buildEndDateView(task: TaskEntity, parentTask?: TaskEntity | null): string {
  const dateStr = task.endDate ? moment(task.endDate).format('DD/MM/YYYY') : '';
  if (!parentTask || !task.endDate || !parentTask.endDate) {
    return dateStr;
  }

  if (moment(task.endDate).isAfter(moment(parentTask.endDate))) {
    const tooltip = `Hạn kết thúc của công việc ${task.name || 'ABC'} đang vượt quá hạn kết thúc công việc ${parentTask.name || 'BCD'}. Hãy cập nhật lại thời gian.`;
    return buildDateWithTooltip(dateStr, tooltip);
  }

  return dateStr;
}

