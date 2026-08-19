import { Injectable } from '@nestjs/common';
import { normalizeDateValueDDMMYYYY } from 'src/meeting/helper/build.meeting.filter';

// Cached lookup - tránh tạo lại object trong mỗi lần gọi O(1) access
const DAY_OF_WEEK_NAMES: Readonly<Record<number, string>> = {
  1: 'Chủ nhật',
  2: 'Thứ hai',
  3: 'Thứ ba',
  4: 'Thứ tư',
  5: 'Thứ năm',
  6: 'Thứ sáu',
  7: 'Thứ bảy',
};


@Injectable()
export class LeadershipDutyScheduleMapper {
  mapListItems(
    rawItems: any[],
    aliases: Record<string, string>,
    isExport?: string,
    isListDynamic?: string,
    allDetails: any[] = [],
  ): any[] {
    if (!rawItems?.length) return [];

    // Pre-compute alias entries một lần ngoài loop
    const aliasEntries = Object.entries(aliases);
    const needsExport = isExport === 'true';

    // Group details by schedule_id - O(details)
    const detailsMap = new Map<string, any[]>();
    for (const d of allDetails) {
      const list = detailsMap.get(d.scheduleId) || [];
      list.push(d);
      detailsMap.set(d.scheduleId, list);
    }

    return rawItems.map(item => {
      const mapped = this.mapSingleItem(item, aliasEntries, needsExport);
      const itemDetails = detailsMap.get(item.id) || [];

      // Manually aggregate name, note, and details to match previous SQL structure
      if (aliases.name) {
        mapped[aliases.name] = itemDetails
          .map(d => d.leaderName)
          .filter(Boolean)
          .join('; ');
      }

      if (aliases.note) {
        mapped[aliases.note] = itemDetails
          .map(d => d.notes)
          .filter(Boolean)
          .join('; ');
      }

      if (aliases.details) {
        mapped[aliases.details] = this.mapScheduleDetailsForList(itemDetails);
      }

      return mapped;
    });
  }

  // Internal helper for mapping details in list (prevent extra prefixing)
  private mapScheduleDetailsForList(details: any[]): any[] {
    return details.map(detail => ({
      dutyDate: detail.dutyDate,
      dayOfWeek: detail.dayOfWeek,
      notes: detail.notes || '',
      leaderName: detail.leaderName || '',
    }));
  }

  // Internal: nhận aliasEntries đã pre-computed
  private mapSingleItem(
    rawItem: any,
    aliasEntries: [string, string][],
    needsExport: boolean,
  ): any {
    const mapped: any = {};

    for (const [dbKey, displayKey] of aliasEntries) {
      if (mapped[displayKey] !== undefined) continue;

      let value = rawItem[dbKey];

      if (value === undefined && dbKey.includes('.')) {
        value = rawItem[dbKey.split('.').pop()!];
      }

      if (value === undefined) continue;

      mapped[displayKey] = this.formatValue(value, dbKey);
    }

    if (needsExport) {
      mapped.export_formatted_date = this.formatDateForExport(rawItem.schedule_date);
    }

    return mapped;
  }

  mapScheduleDetails(details: any[]): any[] {
    if (!details?.length) return [];

    return details.map(detail => ({
      id: detail.d_id,
      dutyDate: normalizeDateValueDDMMYYYY(detail.duty_date),
      dayOfWeek: {
        value: detail.day_of_week,
        // O(1) lookup thay vì tạo object mỗi lần
        name: DAY_OF_WEEK_NAMES[detail.day_of_week] ?? '',
      },
      leader: {
        id: detail.leader_id,
        name: detail.leader_name || '',
      },
      notes: detail.d_notes || '',
      status: detail.d_status,
    }));
  }

  private formatValue(value: any, fieldName: string): any {
    if (value === null || value === undefined) return null;

    const lowerField = fieldName.toLowerCase();
    const normalizedField = lowerField.replace(/_/g, '');

    // Kiểm tra date/time field - hỗ trợ cả camelCase và snake_case
    const isDateField =
      normalizedField.includes('date') ||
      normalizedField.includes('time') ||
      normalizedField.includes('created') ||
      normalizedField.includes('updated');

    if (isDateField) {
      if (
        normalizedField.includes('created') ||
        normalizedField.includes('updated') ||
        normalizedField.includes('scheduletime') ||
        normalizedField.includes('scheduledate')
      ) {
        return this.formatDateTime(value);
      }
      return normalizeDateValueDDMMYYYY(value);
    }

    if (fieldName === 'month' || fieldName === 'year') {
      return parseInt(value, 10);
    }

    if (fieldName === 'week') {
      return `Tuần ${parseInt(value, 10)}`;
    }

    return value;
  }

  private formatDate(date: any): string {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';

      if (d.getHours() || d.getMinutes() || d.getSeconds()) {
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      }

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  }

  private formatDateTime(date: any): string {
    if (!date) return '-';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '-';

      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();

      return `${hh}:${mm} - ${dd}/${mo}/${yyyy}`;
    } catch {
      return '-';
    }
  }

  private formatDateForExport(date: any): string {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch {
      return '';
    }
  }

  mapFullSchedule(schedule: any, details: any[]): any {
    return {
      id: schedule.s_id,
      title: schedule.s_title,
      week: schedule.s_week,
      year: schedule.s_year,

      scheduleDate: this.formatDateTime(schedule.schedule_date),
      scheduleTime: this.formatDateTime(schedule.schedule_time),

      fromDate: normalizeDateValueDDMMYYYY(schedule.from_date),
      toDate: normalizeDateValueDDMMYYYY(schedule.to_date),

      createdBy: {
        id: schedule.created_by,
        name: schedule.created_by_name || '',
      },

      createdAt: this.formatDateTime(schedule.created_at),
      updatedAt: this.formatDateTime(schedule.updated_at),

      details: this.mapScheduleDetails(details ?? []),
    };
  }
}