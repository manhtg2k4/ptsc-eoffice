import { Injectable } from '@nestjs/common';
type StatusStyle = {
  label: string;
  bg: string;
  color: string;
  border?: string;
};

interface StatusStyleSimple {
  label: string;
  bg: string;
  color: string;
}
/**
 * Mapper: transform raw data thành response format
 * - Parse JSON
 * - Map enums
 * - Format datetime
 * - Apply aliases
 */
@Injectable()
export class MeetingRoomMapper {
  private readonly PROCESS_STATUS_STYLE: Record<string, StatusStyle> = {
    '1': {
      label: 'Sẵn sàng sử dụng',
      bg: '#b3e4c6',
      color: '#00a73e',
      border: '#00a73e',
    },
    '2': {
      label: 'Bảo trì',
      bg: '#ffdcda',
      color: '#e13527',
      border: '#aeb5bf',
    },
    '3': {
      label: 'Sẵn sàng sử dụng',
      bg: '#b3e4c6',
      color: '#00a73e',
      border: '#00a73e',
    },
  };

  private readonly PROCESS_STATUS_STYLE_SIMPLE: Record<string, StatusStyleSimple> = {
    '1': { // Đang trống
      label: 'Đang trống',
      bg: '#06ce53',   // xanh lá
      color: '#ffffff',
    },
    '2': { // Bảo trì
      label: 'Bảo trì',
      bg: '#e7000c',   // đỏ
      color: '#ffffff',
    },
  };

  private readonly ROOM_STATUS_LABEL: Record<number, string> = {
    1: 'Hoạt động',
    2: 'Khoá',
    3: 'Đã xoá',
  };

  /**
   * Map list items
   */
  mapListItems(items: any[], aliases: Record<string, string>, isExport?: string, isListDynamic?: string): any {
    return items.map(item => this.mapSingleItem(item, aliases, isExport, isListDynamic));
  }

  /**
   * Map single item
   */
  private mapSingleItem(item: any, aliases: Record<string, string>, isExport?: string, isListDynamic?: string): any {
    const mapped: Record<string, any> = {};

    for (const key in item) {
      if (!Object.prototype.hasOwnProperty.call(item, key)) continue;

      let value = item[key];

      // Parse JSON fields
      value = this.parseJsonField(key, value);

      // Map enums
      value = this.mapEnums(key, value, isExport, isListDynamic);

      // Format datetime
      value = this.formatDateTimeField(key, value);

      // Format amenities
      value = this.formatAmenities(key, value);

      // Apply alias
      const mappedKey = aliases[key] || key;
      mapped[mappedKey] = value;
    }

    return mapped;
  }

  /**
   * Parse JSON field
   */
  private parseJsonField(key: string, value: any): any {
    // if (key === 'amenities' && typeof value === 'string') {
    //   try {
    //     return JSON.parse(value);
    //   } catch {
    //     return [];
    //   }
    // }
    return value;
  }

  /**
   * Map enums to labels
   */
  private mapEnums(
    key: string,
    value: unknown,
    isExport?: string,
    isListDynamic?: string,
  ) {
    if (key === 'status' && typeof value === 'number') {
      return this.ROOM_STATUS_LABEL[value] ?? value;
    }

    if (key === 'stage' && typeof value === 'number') {
      return this.mapProcessStage(value, isExport, isListDynamic);
    }

    return value;
  }

  /**
   * Format datetime fields
   */
  private formatDateTimeField(key: string, value: any): any {
    if (['available_from', 'created_at', 'updated_at'].includes(key)) {
      return this.formatDateTime(value);
    }
    return value;
  }

  /**
   * Format amenities array to string
   */
  private formatAmenities(key: string, value: any): any {
    if (key === 'amenities' && Array.isArray(value)) {
      return value.map(a => a?.name).filter(Boolean).join(', ');
    }
    return value;
  }

  /**
   * Format datetime helper
   */
  private formatDateTime(value: any): string | null {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private mapProcessStage(
    status: unknown,
    isExport?: string,
    isListDynamic?: string,
  ): string {
    const key = String(status ?? '').trim();
    const statusKey = isListDynamic === 'false' ? '1' : key;
    const config = isListDynamic === 'false' ? this.PROCESS_STATUS_STYLE_SIMPLE['1'] : this.PROCESS_STATUS_STYLE[statusKey];

    // export: chỉ text
    if (isExport === 'true') {
      return (config?.label ?? key) || 'Không xác định';
    }
    // list dynamic: màu HTML khác
    if (isListDynamic === 'true') {
      return this.renderStatusHtmlSimple(
        (config?.label ?? key) || 'Không xác định',
        config,
      );
    }
    // không export: html + màu
    return this.renderStatusHtml(
      (config?.label ?? key) || 'Không xác định',
      config,
    );
  }

  private renderStatusHtml(label: string, style?: StatusStyle): string {
    return `
      <div style="
        display:flex;
        align-items:center;
        justify-content:center;
        width:100%;
        height:30px;
        padding:0 16px;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
        background:${style?.bg ?? '#fef9c2'};
        color:${style?.color ?? '#666'};
        font-weight:700;
        font-size:14px;
        border-radius:15px;
        ${style?.border ? `border:1px solid ${style.border};` : ''}
      ">
        ${label}
      </div>
    `.trim();
  }

  private renderStatusHtmlSimple(label: string, style?: StatusStyleSimple): string {
    return `
      <div style="
        display:inline-flex;
        align-items:center;
        justify-content:center;
        height:36px;
        padding:0 20px;
        border-radius:9999px;
        font-weight:400;
        font-size:14px;
        line-height:1;
        background:${style?.bg ?? '#e5e7eb'};
        color:${style?.color ?? '#111827'};
        white-space:nowrap;
      ">
        ${label}
      </div>
    `.trim();
  }
}