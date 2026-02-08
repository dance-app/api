import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function IsE164Phone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isE164Phone',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        validate(value: unknown, _args: ValidationArguments) {
          if (value === null || value === undefined || value === '') {
            return true;
          }
          if (typeof value !== 'string') return false;
          const phone = parsePhoneNumberFromString(value);
          return !!phone && phone.isValid();
        },
      },
    });
  };
}
