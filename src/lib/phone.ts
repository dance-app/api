import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function normalizePhoneE164(value: string | null | undefined) {
  if (!value) return value;
  const phone = parsePhoneNumberFromString(value);
  if (!phone || !phone.isValid()) return value;
  return phone.number;
}
