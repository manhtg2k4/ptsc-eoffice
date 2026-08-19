import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject } from 'class-validator';
import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import * as dayjs from 'dayjs';
import { IsPagedLimit, clampLimit } from '../../utils/pagination.validator';

// Danh sách các field được phép filter cho Album
export const ALLOWED_ALBUM_FILTER_KEYS: string[] = [
  'id', 'title', 'description', 'topic', 'albumType', 'album_type',
  'createdBy', 'created_by', 'createdByName', 'created_by_name',
  'createdAt', 'created_at', 'updatedAt', 'updated_at',
  'publishedDate', 'published_date', 'publishedAt', 'published_at',
  'views', 'shares', 'status', 'keyword', 'isStar',
  'startDate', 'endDate', 'start_date', 'end_date'
];

// --- Hỗ trợ camelCase <-> snake_case
function toSnakeCase(str: string) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
function toCamelCase(str: string) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// --- Validator filter object cho Album
export function IsValidAlbumFilter(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsValidAlbumFilter',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(filter: any) {
          if (!filter || typeof filter !== 'object') return true;
          const errors: { field: string; message: string }[] = [];

          function validateRecursively(obj: any, path = '') {
            for (const key of Object.keys(obj)) {
              const value = obj[key];
              const fullPath = path ? `${path}.${key}` : key;

              // check key hợp lệ (camelCase hoặc snake_case)
              const allowed = ALLOWED_ALBUM_FILTER_KEYS.some(
                k => k === key || k === toSnakeCase(key) || k === toCamelCase(key)
              );
              if (!allowed) {
                errors.push({ field: fullPath, message: `Filter không hỗ trợ field: ${key}` });
              }

              // nested object (date range)
              if (value && typeof value === 'object' && !Array.isArray(value)) {
                if ('startDate' in value && value.startDate && !dayjs(value.startDate, 'YYYY-MM-DD', true).isValid()) {
                  errors.push({ field: `${fullPath}.startDate`, message: 'startDate phải đúng định dạng YYYY-MM-DD' });
                }
                if ('endDate' in value && value.endDate && !dayjs(value.endDate, 'YYYY-MM-DD', true).isValid()) {
                  errors.push({ field: `${fullPath}.endDate`, message: 'endDate phải đúng định dạng YYYY-MM-DD' });
                }
                validateRecursively(value, fullPath);
              }
            }
          }

          validateRecursively(filter);
          (this as any).validationErrors = errors;
          return errors.length === 0;
        },
        defaultMessage(args: ValidationArguments) {
          const errors = (this as any).validationErrors || [];
          return JSON.stringify(errors);
        },
      },
    });
  };
}

// --- Validator sort object cho Album
export function IsValidAlbumSort(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsValidAlbumSort',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(sort: any) {
          if (sort == null) return true;

          if (typeof sort !== 'object' || Array.isArray(sort)) {
            return false;
          }

          const errors: { field: string; message: string }[] = [];

          for (const [key, value] of Object.entries(sort)) {
            // 1. Chặn SQL injection qua key
            if (/[;'"`]|--|\b(select|drop|insert|update|delete)\b/i.test(key)) {
              errors.push({
                field: key,
                message: 'Sort key chứa ký tự không hợp lệ',
              });
              continue;
            }

            // 2. Check field hợp lệ (camel / snake)
            const allowed = ALLOWED_ALBUM_FILTER_KEYS.some(
              k => k === key || k === toSnakeCase(key) || k === toCamelCase(key),
            );

            if (!allowed) {
              errors.push({
                field: key,
                message: `Sort không hỗ trợ field: ${key}`,
              });
            }

            // 3. Check value hợp lệ
            const validValues = [1, -1, '1', '-1', 'asc', 'desc', 'ASC', 'DESC'];
            if (!validValues.includes(value as any)) {
              errors.push({
                field: key,
                message: 'Sort value chỉ nhận 1 | -1 | asc | desc',
              });
            }
          }

          (this as any).validationErrors = errors;
          return errors.length === 0;
        },

        defaultMessage() {
          return JSON.stringify((this as any).validationErrors || []);
        },
      },
    });
  };
}

// --- Validator số nguyên dương string
export function IsPositiveIntString(minValue = 1, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPositiveIntString',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (value === undefined || value === null) return true;
          if (typeof value === 'number') return Number.isInteger(value) && value >= minValue;
          if (typeof value !== 'string') return false;
          const num = Number(value);
          return !isNaN(num) && Number.isInteger(num) && num >= minValue;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} phải là số nguyên >= ${minValue}.`;
        },
      },
    });
  };
}

/**
 * DTO cho API list album images
 * Hỗ trợ nested filter object, paging, sort theo format của documents
 */
export class FilterAlbumImageDto {
  @ApiPropertyOptional({
    description: 'Filter object - hỗ trợ các field: title, topic, albumType, createdBy, createdByName, keyword. Hỗ trợ date range với format { createdAt: { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" } }',
    example: { keyword: 'test', topic: 'uuid', albumType: 'featured', createdAt: { startDate: '2025-01-01', endDate: '2025-12-31' } }
  })
  @IsOptional()
  @IsObject()
  @IsValidAlbumFilter()
  filter?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Trang hiện tại', default: '1' })
  @IsOptional()
  page?: string | number = '1';

  @ApiPropertyOptional({ description: 'Số bản ghi trên mỗi trang', default: '25' })
  @IsOptional()
  @IsPagedLimit({ message: 'Limit phải là số nguyên trong khoảng [1, 100].' })
  limit?: string | number = '25';

  @ApiPropertyOptional({
    description: 'Sắp xếp kết quả, ví dụ: {"createdAt": -1} hoặc {"views": "desc"}',
    example: { createdAt: -1 }
  })
  @IsOptional()
  @IsObject()
  @IsValidAlbumSort()
  sort?: Record<string, any>;

  @ApiProperty({ description: 'Mã danh sách (process function) - optional' })
  @IsOptional()
  @IsString()
  processFn?: string;

  @ApiProperty({ description: 'Flag để phân biệt export (true) hay hiển thị UI (undefined)' })
  @IsOptional()
  @IsString()
  isExport?: string;
}
