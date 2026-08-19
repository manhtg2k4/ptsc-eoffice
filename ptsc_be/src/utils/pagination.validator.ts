import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

/**
 * Lấy max page limit từ environment variable
 * Sử dụng để bảo vệ chống DoS (CWE-400: Uncontrolled Resource Consumption)
 */
export function getMaxPageLimit(): number {
  const envValue = parseInt(process.env.MAX_PAGE_LIMIT || '', 10);
  return isNaN(envValue) || envValue <= 0 ? 100 : envValue;
}

/**
 * Lấy default page limit từ environment variable
 */
export function getDefaultPageLimit(): number {
  const envValue = parseInt(process.env.DEFAULT_PAGE_LIMIT || '', 10);
  const maxLimit = getMaxPageLimit();
  if (isNaN(envValue) || envValue <= 0) return 20;
  return Math.min(envValue, maxLimit);
}

/**
 * Validator cho trường limit (pagination)
 * Giới hạn giá trị trong khoảng [1, MAX_PAGE_LIMIT] từ environment variable
 *
 * @example
 * @IsPagedLimit()
 * limit?: string = '20';
 */
export function IsPagedLimit(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPagedLimit',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string' && typeof value !== 'number') return false;
          const num = Number(value);
          const maxLimit = getMaxPageLimit();
          return !isNaN(num) && Number.isInteger(num) && num >= 1 && num <= maxLimit;
        },
        defaultMessage(args: ValidationArguments) {
          const maxLimit = getMaxPageLimit();
          return `${args.property} phải là số nguyên trong khoảng [1, ${maxLimit}]. Giá trị mặc định: ${getDefaultPageLimit()}.`;
        },
      },
    });
  };
}

/**
 * Validator cho trường page (pagination)
 * Giới hạn giá trị >= 1
 */
export function IsPositivePage(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPositivePage',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          const num = Number(value);
          return !isNaN(num) && Number.isInteger(num) && num >= 1;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} phải là số nguyên >= 1.`;
        },
      },
    });
  };
}

/**
 * Utility function: Clamp giá trị limit về khoảng cho phép (server-side fallback)
 * Sử dụng khi cần validate và clamp giá trị trực tiếp trong service
 */
export function clampLimit(value: string | number, min = 1, max?: number): number {
  const maxLimit = max ?? getMaxPageLimit();
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num) || !Number.isInteger(num)) return min;
  return Math.max(min, Math.min(num, maxLimit));
}

/**
 * Utility function: Clamp giá trị page về khoảng cho phép (server-side fallback)
 */
export function clampPage(value: string | number, min = 1): number {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num) || !Number.isInteger(num)) return min;
  return Math.max(min, num);
}