import { Injectable } from '@nestjs/common';

@Injectable()
export class AmenitiesMapper {
  private readonly AMENITY_STATUS_LABEL: Record<number, string> = {
    1: 'Hoạt động',
    2: 'Hỏng',
    3: 'Đang bảo trì',
    0: 'Ngừng sử dụng',
  };

  mapListItems(items: any[], aliases: Record<string, string>): any {
    return items.map(item => this.mapSingleItem(item, aliases));
  }

  private mapSingleItem(item: any, aliases: Record<string, string>): any {
    const mapped: Record<string, any> = {};

    for (const key in item) {
      if (!Object.prototype.hasOwnProperty.call(item, key)) continue;

      let value = item[key];

      // Map status enum
      if (key === 'status' && typeof value === 'number') {
        value = this.AMENITY_STATUS_LABEL[value] ?? value;
      }

      // Format datetime
      if (['created_at', 'updated_at'].includes(key)) {
        value = this.formatDateTime(value);
      }

      const mappedKey = aliases[key] || key;
      mapped[mappedKey] = value;
    }

    return mapped;
  }

  private formatDateTime(value: any): string | null {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}