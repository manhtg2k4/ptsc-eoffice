import { Injectable } from '@nestjs/common';

type AttendanceStyle = {
  label: string;
  bg: string;
  color: string;
  icon?: string;
};

/**
 * Mapper: transform raw data thành response format
 * - Parse JSON
 * - Map enums
 * - Format datetime
 * - Apply aliases
 */
@Injectable()
export class MeetingMapper {
  private readonly ATTENDANCE_STYLE: Record<string, AttendanceStyle> = {
    CHECKED: {
      label: 'Có mặt',
      bg: '#16a34a',
      color: '#ffffff',
      icon: '✔',
    },
    NOT_CHECKED: {
      label: 'Vắng',
      bg: '#dc2626',
      color: '#ffffff',
      icon: '✖',
    },
    RECEIVED: {
      label: 'Chưa điểm danh',
      bg: '#9ca3af',
      color: '#ffffff',
      icon: undefined,
    }
  };

  private readonly DEFAULT_STYLE: AttendanceStyle = {
    label: 'Không cần điểm danh',
    bg: '#0075FF',
    color: '#ffffff',
    icon: undefined,
  };

  map(items: any[]): any[] {
    return items.map(item => ({
      ...item,
      attendanceState: this.mapAttendanceState(item.attendanceState),
    }));
  }

  mapOne(item: any): any {
    return {
      ...item,
      attendanceState: this.mapAttendanceState(item.attendanceState),
    };
  }

  mapAttendanceState(value: unknown): string {
    const key = String(value ?? '').trim();
    const style = this.ATTENDANCE_STYLE[key] ?? this.DEFAULT_STYLE;

    return this.renderBadge(style);
  }

  private renderBadge(style: AttendanceStyle): string {
    const iconHtml = `
      <span
        style="
          display:inline-flex;
          align-items:center;
          justify-content:center;
          width:16px;
          min-width:16px;
          margin-right:6px;
          font-weight:bold;
          font-size:16px;
          line-height:1;
        "
      >
        ${style.icon ?? ''}
      </span>
    `;

    return `
      <span
        style="
          display:inline-flex;
          align-items:center;
          justify-content:center;
          height:40px;
          width:180px;
          padding:0 20px;
          border-radius:8px;
          font-size:15px;
          font-weight:500;
          white-space:nowrap;
          background:${style.bg};
          color:${style.color};
          box-sizing:border-box;
        "
      >
        ${iconHtml}
        <span
          style="
            flex:1;
            text-align:center;
            padding-right:22px;
          "
        >
          ${style.label}
        </span>
      </span>
    `.trim();
  }

}

export enum MEETING_STATE {
  DU_KIEN = 'DU_KIEN',
  CHUAN_BI = 'CHUAN_BI',
  DANG_HOP = 'DANG_HOP',
  KET_THUC = 'KET_THUC',
  DA_HUY = 'DA_HUY',
  DIEU_CHINH = 'DIEU_CHINH',
}
export enum MEETING_UNIT_STATE {
  PENDING = 'PENDING',           // Đang chờ
  RECEIVED = 'RECEIVED',         // Đã tiếp nhận
  CONFIRMED = 'CONFIRMED',       // Đã xác nhận
  PROCESSING = 'PROCESSING',     // Đang xử lý
  COMPLETED = 'COMPLETED',       // Đã hoàn thành
  CANCELED = 'CANCELED',         // Đã hủy
  DONE = 'DONE',                 // Đã xong
}

export enum MEETING_PARTICIPANT_STATE {
  PENDING = 'PENDING',           // Đang chờ
  RECEIVED = 'RECEIVED',         // Đã tiếp nhận
  CONFIRMED = 'CONFIRMED',       // Đã xác nhận
  PROCESSING = 'PROCESSING',     // Đang xử lý
  COMPLETED = 'COMPLETED',       // Đã hoàn thành
  CANCELED = 'CANCELED',         // Đã hủy
  DONE = 'DONE',                 // Đã xong
  NOT_PARTICIPATE = 'NOT_PARTICIPATE'
}

export enum ATTENDANCE_STATE {
  CHECKED = 'CHECKED',           // Đã điểm danh
  RECEIVED = 'RECEIVED',         // Chưa điểm danh
  NOT_CHECKED = 'NOT_CHECKED',       // Vắng
  NOT_REQUIRED = 'NOT_REQUIRED',     // Không cần điểm danh
}
export const MEETING_STATE_LABEL: Record<MEETING_STATE, string> = {
  [MEETING_STATE.DU_KIEN]: 'Dự kiến',
  [MEETING_STATE.CHUAN_BI]: 'Chuẩn bị họp',
  [MEETING_STATE.DANG_HOP]: 'Đang họp',
  [MEETING_STATE.KET_THUC]: 'Đã kết thúc',
  [MEETING_STATE.DA_HUY]: 'Đã hủy',
  [MEETING_STATE.DIEU_CHINH]: 'Điều chỉnh',
};
export enum ASSIGNING_SEAT_STATUS {
  NOT_ASSIGN = 'NOT_ASSIGN',
  ASSIGNING = 'ASSIGNING', // đang xử lý
  ASSIGNED = 'ASSIGNED',
  LOCKED = 'LOCKED',
  RECEIVED = 'RECEIVED',
}

export interface MeetingDurationInfo {
  state: MEETING_STATE;
  stateLabel: string;
  totalMs: number;
  elapsedMs: number;
  remainingMs: number;
  elapsedTime: string;
  remainingTime: string;
  actualStart: Date;
  actualEnd: Date;
}
export interface ParticipantSummary {
  total: number;
  joined: number;
  notJoined: number;
  unconfirmed: number;
}

const JOINED_STATES = ['CONFIRMED', 'PROCESSING', 'COMPLETED', 'DONE', 'DELEGATED'];
const NOT_JOINED_STATES = ['CANCELED', 'NOT_PARTICIPATE'];
const UNCONFIRMED_STATES = ['RECEIVED', 'PENDING'];

export function calculateParticipantSummaryByState(
  participants: {
    participantState?: string | null;
  }[],
): ParticipantSummary {
  const summary: ParticipantSummary = {
    total: participants.length,
    joined: 0,
    notJoined: 0,
    unconfirmed: 0,
  };

  for (const p of participants) {
    const state = p.participantState ?? 'RECEIVED';

    if (JOINED_STATES.includes(state)) {
      summary.joined++;
      continue;
    }

    if (NOT_JOINED_STATES.includes(state)) {
      summary.notJoined++;
      continue;
    }

    if (UNCONFIRMED_STATES.includes(state)) {
      summary.unconfirmed++;
      continue;
    }

    // fallback an toàn
    summary.unconfirmed++;
  }

  return summary;
}

export function calculateUnitParticipantConfirm(
  participants: {
    participantState?: string | null;
  }[],
) {
  const total = participants.length;

  const confirmed = participants.filter((p) =>
    JOINED_STATES.includes(p.participantState ?? ''),
  ).length;

  return {
    confirmed,
    total,
  };
}

export interface UnitConfirmSummary {
  total: number;
  confirmed: number;
  notConfirmed: number;
}

/**
 * Kiểm tra trạng thái xác nhận
 */
export const isConfirmedState = (state?: string): boolean => ['CONFIRMED', 'PROCESSING', 'COMPLETED', 'DONE', 'DELEGATED'].includes(state ?? 'RECEIVED');

/**
 * Kiểm tra trạng thái chưa xác nhận
 */
export const isNotConfirmedState = (state?: string): boolean => ['RECEIVED', 'PENDING'].includes(state ?? 'RECEIVED');

// Map lịch lặp hiển thị trong chi tiết 
export function buildRecurrence(recurrence: any, recurrenceTypeTitle?: string) {
  if (!recurrence) {
    return { type: 'Không' };
  }

  return {
    id: recurrence.id,
    type: recurrenceTypeTitle, // title hiển thị
    typeOrigin: recurrence.type, // enum gốc

    startDate: recurrence.startDate,
    endDate: recurrence.endDate,

    // ===== TUẦN =====
    daysOfWeek: recurrence.daysOfWeek
      ? recurrence.daysOfWeek.split(',').map((d: string) => d.trim().toUpperCase())
      : undefined,

    // ===== THÁNG =====
    dayOfMonth: recurrence.dayOfMonth ?? undefined,

    // ===== NĂM =====
    dayOfYear: recurrence.dayOfYear ?? undefined,

    // ===== TUỲ CHỈNH =====
    intervalValue: recurrence.intervalValue ?? undefined,
  };
}
/**
 * Tổng hợp trạng thái xác nhận của các đơn vị trong cuộc họp
 * - Không tính CHAIRMAN_UNIT, SECRETARY_UNIT
 */
export function calculateUnitConfirmSummary(
  units: {
    unitId: string;
    unitState?: string;
  }[] = [],
): UnitConfirmSummary {
  return units
    .filter(
      (u) =>
        u.unitId !== 'CHAIRMAN_UNIT' &&
        u.unitId !== 'SECRETARY_UNIT',
    )
    .reduce(
      (acc, unit) => {
        if (isConfirmedState(unit.unitState)) {
          acc.confirmed++;
        } else {
          acc.notConfirmed++;
        }
        acc.total++;
        return acc;
      },
      {
        total: 0,
        confirmed: 0,
        notConfirmed: 0,
      } as UnitConfirmSummary,
    );
}
export const ICON_PENDING = `
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 22C13.1046 22 14 21.1046 14 20H10C10 21.1046 10.8954 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="#FBC02D"/>
</svg>
`;

export const ICON_ACCEPTED = `
<svg width="11" height="9" viewBox="0 0 11 9" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10.2103 4.63636L11 5.40545L7.31641 9L5.35897 7.09091L6.14872 6.32182L7.31641 7.45636L10.2103 4.63636ZM3.94872 7.09091L5.64103 8.72727H0V7.63636C0 6.43091 2.01949 5.45455 4.51282 5.45455L5.57897 5.51455L3.94872 7.09091ZM4.51282 0C5.11126 0 5.68518 0.229869 6.10834 0.63904C6.5315 1.04821 6.76923 1.60316 6.76923 2.18182C6.76923 2.76047 6.5315 3.31543 6.10834 3.7246C5.68518 4.13377 5.11126 4.36364 4.51282 4.36364C3.91438 4.36364 3.34046 4.13377 2.9173 3.7246C2.49414 3.31543 2.25641 2.76047 2.25641 2.18182C2.25641 1.60316 2.49414 1.04821 2.9173 0.63904C3.34046 0.229869 3.91438 0 4.51282 0Z" fill="#2E7D32"/>
</svg>
`;

export const ICON_REJECTED = `
<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5 0C7.765 0 10 2.235 10 5C10 7.765 7.765 10 5 10C2.235 10 0 7.765 0 5C0 2.235 2.235 0 5 0ZM6.795 2.5L5 4.295L3.205 2.5L2.5 3.205L4.295 5L2.5 6.795L3.205 7.5L5 5.705L6.795 7.5L7.5 6.795L5.705 5L7.5 3.205L6.795 2.5Z" fill="#D60B0B"/>
</svg>

`;

export const ICON_ASSIGNED = `
<svg width="11" height="9" viewBox="0 0 11 9" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10.2103 4.63636L11 5.40545L7.31641 9L5.35897 7.09091L6.14872 6.32182L7.31641 7.45636L10.2103 4.63636ZM3.94872 7.09091L5.64103 8.72727H0V7.63636C0 6.43091 2.01949 5.45455 4.51282 5.45455L5.57897 5.51455L3.94872 7.09091ZM4.51282 0C5.11126 0 5.68518 0.229869 6.10834 0.63904C6.5315 1.04821 6.76923 1.60316 6.76923 2.18182C6.76923 2.76047 6.5315 3.31543 6.10834 3.7246C5.68518 4.13377 5.11126 4.36364 4.51282 4.36364C3.91438 4.36364 3.34046 4.13377 2.9173 3.7246C2.49414 3.31543 2.25641 2.76047 2.25641 2.18182C2.25641 1.60316 2.49414 1.04821 2.9173 0.63904C3.34046 0.229869 3.91438 0 4.51282 0Z" fill="#2E7D32"/>
</svg>
`;

export const ICON_DELEGATED = `
<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0.425832 0.0294106C0.375169 0.00544542 0.318254 -0.00418798 0.261931 0.00166867C0.205608 0.00752531 0.152276 0.0286227 0.108346 0.062424C0.064417 0.0962254 0.031761 0.141292 0.0143048 0.192204C-0.00315129 0.243116 -0.00466433 0.297707 0.00994778 0.349412L0.891129 3.47053C0.905688 3.522 0.93561 3.56843 0.977328 3.60428C1.01905 3.64014 1.0708 3.66391 1.12642 3.67276L5.1588 4.3072C5.32292 4.33331 5.32292 4.55554 5.1588 4.58165L1.12701 5.21609C1.07128 5.22485 1.0194 5.24857 0.977571 5.28443C0.93574 5.32029 0.90573 5.36678 0.891129 5.41832L0.00994778 8.53944C-0.00466433 8.59114 -0.00315129 8.64573 0.0143048 8.69665C0.031761 8.74756 0.064417 8.79263 0.108346 8.82643C0.152276 8.86023 0.205608 8.88133 0.261931 8.88718C0.318254 8.89304 0.375169 8.88341 0.425832 8.85944L6.17645 6.14443V6.1111C6.17645 5.79878 6.26937 5.49275 6.44461 5.2279C6.61985 4.96304 6.87036 4.75002 7.16758 4.61311C7.4648 4.4762 7.79677 4.42092 8.12564 4.45357C8.45452 4.48622 8.76706 4.60548 9.02764 4.79776L9.24941 4.69276C9.2982 4.66967 9.33922 4.63421 9.36789 4.59035C9.39656 4.54649 9.41174 4.49597 9.41174 4.44443C9.41174 4.39288 9.39656 4.34236 9.36789 4.2985C9.33922 4.25464 9.2982 4.21919 9.24941 4.19609L0.425832 0.0294106ZM9.11764 6.1111C9.11764 6.40578 8.99369 6.6884 8.77306 6.89677C8.55243 7.10515 8.25319 7.22221 7.94117 7.22221C7.62915 7.22221 7.3299 7.10515 7.10927 6.89677C6.88864 6.6884 6.76469 6.40578 6.76469 6.1111C6.76469 5.81641 6.88864 5.5338 7.10927 5.32542C7.3299 5.11705 7.62915 4.99998 7.94117 4.99998C8.25319 4.99998 8.55243 5.11705 8.77306 5.32542C8.99369 5.5338 9.11764 5.81641 9.11764 6.1111ZM10 8.61111C10 9.30278 9.41176 10 7.94117 10C6.47057 10 5.88233 9.30555 5.88233 8.61111C5.88233 8.39009 5.97529 8.17813 6.14077 8.02185C6.30624 7.86557 6.53067 7.77777 6.76469 7.77777H9.11764C9.35166 7.77777 9.57609 7.86557 9.74156 8.02185C9.90704 8.17813 10 8.39009 10 8.61111Z" fill="#FE8401"/>
</svg>
`;

export const ICON_DOC = `
<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5.41667 5.41667H4.33333V2.16667H5.41667M4.33333 6.5H5.41667V7.58333H4.33333M6.89542 0H2.85458L0 2.85458V6.89542L2.85458 9.75H6.89542L9.75 6.89542V2.85458L6.89542 0Z" fill="#FFA629"/>
</svg>
`;

export const ICON_DOC_DONE = `
<svg width="9" height="10" viewBox="0 0 9 10" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M4.5 9.5C2.01465 9.5 0 7.48535 0 5C0 2.51465 2.01465 0.5 4.5 0.5C6.98535 0.5 9 2.51465 9 5C9 7.48535 6.98535 9.5 4.5 9.5ZM3.97035 5.963L2.7261 4.71785L2.25 5.19395L3.65355 6.5984C3.73794 6.68276 3.85238 6.73015 3.9717 6.73015C4.09102 6.73015 4.20546 6.68276 4.28985 6.5984L6.96825 3.9209L6.49035 3.443L3.97035 5.963Z" fill="#008236"/>
</svg>
`;

export function getMeetingActionIcon(state: string) {
  switch (state) {
    case 'RECEIVED':
      return { icon: ICON_PENDING, text: 'Chờ xác nhận' };
    case 'CONFIRMED':
      return { icon: ICON_ACCEPTED, text: 'Đã xác nhận' };
    case 'PROCESSING':
      return { icon: ICON_ACCEPTED, text: 'Đang chuẩn bị' };
    case 'DONE':
      return { icon: ICON_ACCEPTED, text: 'Hoàn thành' };
    case 'NOT_PARTICIPATE':
      return { icon: ICON_REJECTED, text: 'Không tham gia' };
    case 'DELEGATED':
      return { icon: ICON_DELEGATED, text: 'Đã ủy quyền' };
    default:
      return { icon: ICON_PENDING, text: 'Chưa xác định' };
  }
}

export function buildMeetingComment(type: string, reason?: string) {
  switch (type) {
    case 'TRINH_DUYET':
      return 'Đã trình duyệt lịch họp';

    case 'PHE_DUYET':
      return 'Đã công bố lịch họp';

    case 'TU_CHOI':
      return `Lịch họp không được phê duyệt${reason ? `: ${reason}` : ''}`;

    case 'CAP_NHAT':
      return 'Đã thay đổi thông tin lịch họp';

    default:
      return '';
  }
}