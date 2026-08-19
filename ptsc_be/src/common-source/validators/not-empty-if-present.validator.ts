import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator: Nếu field được gửi lên (không phải undefined) thì không được rỗng
 * Dùng cho các trường optional trong Update DTO
 */
export function IsNotEmptyIfPresent(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNotEmptyIfPresent',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Nếu value là undefined hoặc null thì bỏ qua (optional)
          if (value === undefined || value === null) {
            return true;
          }
          // Nếu value là string rỗng hoặc chỉ có whitespace thì không hợp lệ
          if (typeof value === 'string' && value.trim() === '') {
            return false;
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} không được để trống`;
        },
      },
    });
  };
}
