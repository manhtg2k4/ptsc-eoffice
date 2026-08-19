import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";


export const ALLOWED_FILTER_KEYS: string[] = [
  'id', 'name', 'request_type', 'priority', 'is_important_guest', 'passenger_count', 'departure_time',
  'return_time', 'departure_point', 'destination', 'contact_person', 'contact_phone', 'total_people',
  'purpose', 'notes', 'status', 'bpmn_version', 'timezone', 'vehicle_state', 'status_code',
  'request_submitted_at', 'waiting_confirmed_at', 'created_at', 'updated_at'
];

// --- Hỗ trợ camelCase <-> snake_case
function toSnakeCase(str: string) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
function toCamelCase(str: string) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
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
// Validate Sort
export function IsValidSort(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsValidSort',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(sort: any) {
          if (sort == null) return true;

          // Nếu sort là string (từ query string), thử parse JSON
          let sortObj = sort;
          if (typeof sort === 'string') {
            try {
              sortObj = JSON.parse(sort);
            } catch (e) {
              (this as any).validationErrors = [{ field: 'sort', message: 'Sort phải là JSON object hợp lệ' }];
              return false;
            }
          }

          if (typeof sortObj !== 'object' || Array.isArray(sortObj)) {
            (this as any).validationErrors = [{ field: 'sort', message: 'Sort phải là object, không phải array hoặc primitive' }];
            return false;
          }

          const errors: { field: string; message: string }[] = [];

          for (const [key, value] of Object.entries(sortObj)) {
            // 1. Chặn SQL injection qua key
            if (/[;'"`]|--|\b(select|drop|insert|update|delete)\b/i.test(key)) {
              errors.push({
                field: key,
                message: 'Sort key chứa ký tự không hợp lệ',
              });
              continue;
            }

            // 2. Check field hợp lệ (camel / snake)
            const allowed = ALLOWED_FILTER_KEYS.some(
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