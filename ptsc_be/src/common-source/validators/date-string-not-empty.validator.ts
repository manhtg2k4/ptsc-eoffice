import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator: Kiểm tra empty trước, rồi mới kiểm tra định dạng ISO date
 * - Nếu empty string → báo "không được để trống"
 * - Nếu sai định dạng → báo "không hợp lệ"
 */
export function IsDateStringNotEmpty(validationOptions?: ValidationOptions & { emptyMessage?: string; formatMessage?: string }) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isDateStringNotEmpty',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Nếu undefined hoặc null thì bỏ qua (để @IsOptional xử lý)
          if (value === undefined || value === null) {
            return true;
          }

          // Kiểm tra empty string
          if (typeof value === 'string' && value.trim() === '') {
            // Lưu flag để defaultMessage biết là lỗi empty
            (args.object as any).__isEmptyError = true;
            return false;
          }

          // Kiểm tra định dạng ISO date
          const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
          if (typeof value === 'string' && !isoDateRegex.test(value)) {
            (args.object as any).__isEmptyError = false;
            return false;
          }

          // Kiểm tra date có hợp lệ không
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            (args.object as any).__isEmptyError = false;
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const isEmptyError = (args.object as any).__isEmptyError;
          if (isEmptyError) {
            return validationOptions?.emptyMessage || `${args.property} không được để trống`;
          }
          return validationOptions?.formatMessage || `${args.property} không hợp lệ. Vui lòng sử dụng định dạng ISO (YYYY-MM-DDTHH:mm:ss.sssZ)`;
        },
      },
    });
  };
}
