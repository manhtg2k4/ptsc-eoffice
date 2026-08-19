// src/task/progress.util.ts
import { ProjectEntity } from './entities/project.entity';

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
  isOverdue
  
}: ProgressHtmlProps & { slowReason?: string }): string {
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

  // 2. Ép kiểu về Date
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
export function buildProgressView(task: ProjectEntity, slowReason?: string) {
  const now = new Date();
  const progress = Number(task.progress) || 0;

  let timeText = '';
  let color = '#c6cbd1';
  let status: string;

  if (task.endDate && now > task.endDate) {
    timeText = calcDiffText(now, task.endDate, 'remain');
    status = 'OVERDUE';
    color = '#ff6c70';
  } else if (progress === 100) {
    const doneAt = task.updatedAt ?? now;
    timeText = calcDiffText(doneAt, task.endDate, 'done');
    status = timeText.startsWith('Sớm') ? 'EARLY' : 'LATE';
    color = '#4caf50';
  } else {
    timeText = task.endDate
      ? calcDiffText(now, task.endDate, 'remain')
      : 'Không thời hạn';
    status = progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';
    color = progress > 0 ? '#2364B0' : '#c6cbd1';
  }

  const html = buildProgressHtml({
    percent: progress,
    text: timeText,
    color,
    slowReason,
    isOverdue: status === 'OVERDUE',
  });

  return {
    rawText: `${progress}% - ${timeText}`,
    status,
    percent: progress,
    html,
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




