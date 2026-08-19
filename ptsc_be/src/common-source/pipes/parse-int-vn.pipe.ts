import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * Custom ParseIntPipe với thông báo lỗi tiếng Việt
 */
@Injectable()
export class ParseIntVnPipe implements PipeTransform<string, number> {
  private readonly fieldName: string;

  constructor(fieldName: string = 'ID') {
    this.fieldName = fieldName;
  }

  transform(value: string): number {
    if (value === undefined || value === null || value === '') {
      throw new BadRequestException({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: [{ field: this.fieldName.toLowerCase(), message: `${this.fieldName} không được để trống` }],
      });
    }

    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: [{ field: this.fieldName.toLowerCase(), message: `${this.fieldName} phải là số nguyên` }],
      });
    }

    if (val < 1) {
      throw new BadRequestException({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: [{ field: this.fieldName.toLowerCase(), message: `${this.fieldName} phải lớn hơn 0` }],
      });
    }

    return val;
  }
}
