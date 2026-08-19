import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator để kiểm tra giá trị có phải là số nguyên hợp lệ trong phạm vi INT
 * Kiểm tra TRƯỚC khi @Type(() => Number) convert, tránh lỗi overflow
 */
export function IsSafeInt(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isSafeInt',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Nếu không có giá trị (optional field), bỏ qua
          if (value === undefined || value === null) {
            return true;
          }

          // Convert sang string để kiểm tra
          const strValue = String(value).trim();

          // Kiểm tra có phải là số không
          if (!/^-?\d+$/.test(strValue)) {
            return false;
          }

          // Parse và kiểm tra phạm vi INT
          const numValue = parseInt(strValue, 10);
          
          // Kiểm tra overflow (khi parse lại không bằng string gốc)
          if (String(numValue) !== strValue) {
            return false;
          }

          // Kiểm tra phạm vi INT (-2147483648 đến 2147483647)
          return numValue >= -2147483648 && numValue <= 2147483647;
        },
        defaultMessage(args: ValidationArguments) {
          return validationOptions?.message as string || `${args.property} không hợp lệ`;
        },
      },
    });
  };
}
