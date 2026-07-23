import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Rejects dates outside a sane calendar range. Without this, a malformed or
 * garbled date (e.g. year 60817 from a mis-set date picker) passes @IsDate()
 * — it's a real JS Date — and only fails deep inside a Prisma query with a
 * raw 500 and a stack trace, instead of a clean 400 at the API boundary.
 */
export function IsReasonableDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isReasonableDate',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be a real calendar date between 1900 and 2100`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          if (!(value instanceof Date) || Number.isNaN(value.getTime())) return false;
          const year = value.getFullYear();
          return year >= 1900 && year <= 2100;
        },
      },
    });
  };
}
