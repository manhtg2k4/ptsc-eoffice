import { Injectable } from '@nestjs/common';

type StatusStyle = {
  label: string;
  bg: string;
  color: string;
  border?: string;
};

/**
 * Mapper: Transform data for presentation
 * - Map database fields to display format
 * - Format dates, enums, status
 * - Apply aliases
 */
@Injectable()
export class TravelWorkSchedulesMapper {
  /* =========================
   * STATUS CONFIG
   * ========================= */
  private readonly STATUS_STYLE: Record<string, StatusStyle> = {
    '1': {
      label: 'Đang hiệu lực',
      bg: '#b3e4c6',
      color: '#00a73e',
      border: '#00a73e',
    },
    '2': {
      label: 'Đã khóa',
      bg: '#fef9c2',
      color: '#ffa601',
      border: '#adb4be',
    },
    '3': {
      label: 'Đã xóa',
      bg: '#ffdcda',
      color: '#e13527',
      border: '#aeb5bf',
    },
  };

  private readonly SCHEDULE_TYPE_LABELS: Record<string, string> = {
    singleDay: 'Trong ngày',
    multiDay: 'Nhiều ngày',
  };

  private readonly CALENDAR_FORMAT_LABELS: Record<string, string> = {
    session: 'Theo buổi',
    fullDay: 'Cả ngày',
  };

  private readonly TRAVEL_SCHEDULE_LABELS: Record<string, string> = {
    nhieulich: 'Nhiều lịch',
    motlich: 'Một lịch',
  };

  private readonly NUM_DAYS_LABELS: Record<string, string> = {
    motngay: 'Một ngày',
    nhieungay: 'Nhiều ngày',
  };

  /* =========================
   * PUBLIC API
   * ========================= */
  mapListItems(
    items: any[],
    aliases: Record<string, string>,
    isExport?: string,
    isListDynamic?: string,
  ) {
    return items.map((i) =>
      this.mapSingleItem(i, aliases, isExport, isListDynamic),
    );
  }

  mapDetail(item: any, detail: boolean) {
    return this.mapSingleItem(item, {}, 'true', undefined, detail);
  }

  /* =========================
   * CORE MAPPING
   * ========================= */
  private mapSingleItem(
    item: any,
    aliases: Record<string, string>,
    isExport?: string,
    isListDynamic?: string,
    detail?: boolean,
  ) {
    const mapped: Record<string, any> = {};

    for (const key in item) {
      if (!Object.prototype.hasOwnProperty.call(item, key)) continue;

      let value = item[key];

      // Map enums and status
      value = this.mapEnums(key, value, isExport, isListDynamic, detail);

      // Format date/time fields
      value = this.formatDateTimeField(key, value);

      // Parse JSON fields
      if (key === 'schedules' && typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // ignore error
        }
      }

      // Format sub-items in schedules array
      if (key === 'schedules' && Array.isArray(value)) {
        value = value.map((subItem) => ({
          ...subItem,
          startDate: this.formatDate(subItem.startDate),
          endDate: this.formatDate(subItem.endDate),
          date: this.formatDate(subItem.date),
          numDays: detail
            ? {
                value: subItem.numDays,
                title: this.NUM_DAYS_LABELS[subItem.numDays] ?? subItem.numDays,
              }
            : this.NUM_DAYS_LABELS[subItem.numDays] ?? subItem.numDays,
          format: detail
            ? {
                value: subItem.format,
                title: this.CALENDAR_FORMAT_LABELS[subItem.format] ?? subItem.format,
              }
            : this.CALENDAR_FORMAT_LABELS[subItem.format] ?? subItem.format,
        }));
      }

      // Apply alias
      const mappedKey = aliases[key] || key;
      mapped[mappedKey] = value;
    }

    return mapped;
  }

  /* =========================
   * ENUM / STATUS MAPPING
   * ========================= */
  private mapEnums(
    key: string,
    value: unknown,
    isExport?: string,
    isListDynamic?: string,
    detail?: boolean,
  ) {
    if (typeof value !== 'string') return value;
		if (detail) {
			switch (key) {
        case 'status':
          return this.mapStatus(value, isExport, isListDynamic);
        case 'schedule_type':
          return {
            value,
            title: this.SCHEDULE_TYPE_LABELS[value] ?? value,
          };
        case 'calendar_format':
          return {
            value,
            title: this.CALENDAR_FORMAT_LABELS[value] ?? value,
          };
        case 'scheduleType':
          return {
            value,
            title: this.SCHEDULE_TYPE_LABELS[value] ?? value,
          };
        case 'calendarFormat':
          return {
            value,
            title: this.CALENDAR_FORMAT_LABELS[value] ?? value,
          };
        case 'travel_schedule':
        case 'travelSchedule':
          return {
            value,
            title: this.TRAVEL_SCHEDULE_LABELS[value] ?? value,
          };
        default:
          return value;
      }
    } else {
      switch (key) {
        case 'status':
          return this.mapStatus(value, isExport, isListDynamic);
        case 'schedule_type':
        case 'scheduleType':
          return this.SCHEDULE_TYPE_LABELS[value] ?? value;
        case 'calendar_format':
        case 'calendarFormat':
          return this.CALENDAR_FORMAT_LABELS[value] ?? value;
        case 'travel_schedule':
        case 'travelSchedule':
          return this.TRAVEL_SCHEDULE_LABELS[value] ?? value;
        default:
          return value;
      }
    }
    
  }

  private mapStatus(
    status: string,
    isExport?: string,
    isListDynamic?: string,
  ): string | StatusStyle {
    const config = this.STATUS_STYLE[status];
    if (!config) return status;

    // For export, return label only
    if (isExport === 'true') {
      return config.label;
    }

    // For list dynamic, return full config
    if (isListDynamic === 'true') {
      return config;
    }

    // Default: return label
    return config.label;
  }

  /* =========================
   * DATE/TIME FORMATTERS
   * ========================= */
  private formatDateTimeField(key: string, value: any) {
    const dateFields = [
      'work_date',
      'from_date',
      'to_date',
      'created_at',
      'updated_at',
      'workDate',
      'fromDate',
      'toDate',
      'createdAt',
      'updatedAt',
    ];

    if (dateFields.includes(key)) {
      return this.formatDateTime(value);
    }

    return value;
  }

  private formatDateTime(value: any): string | null {
    if (!value) return null;

    const d = new Date(value);
    if (isNaN(d.getTime())) return null;

    const pad = (n: number) => n.toString().padStart(2, '0');

    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  /* =========================
   * HELPER METHODS
   * ========================= */
  formatDate(value: any): string | null {
    if (!value) return null;

    const d = new Date(value);
    if (isNaN(d.getTime())) return null;

    const pad = (n: number) => n.toString().padStart(2, '0');

    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  formatTime(value: any): string | null {
    if (!value) return null;

    const d = new Date(value);
    if (isNaN(d.getTime())) return null;

    const pad = (n: number) => n.toString().padStart(2, '0');

    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}