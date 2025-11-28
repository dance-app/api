import { randomUUID } from 'crypto';

/**
 * Generates a Stripe-style prefixed ID
 * Example: workspace_123e4567-e89b-12d3-a456-426614174000
 *
 * @param prefix The prefix for the ID (e.g., 'workspace', 'user', 'event')
 * @returns A prefixed UUID string
 */
export function generateId(prefix: string): string {
  const uuid = randomUUID();
  return `${prefix}_${uuid}`;
}

/**
 * Validates if a string is a valid prefixed ID
 *
 * @param id The ID to validate
 * @param prefix The expected prefix
 * @returns true if the ID is valid
 */
export function isValidId(id: string, prefix: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const parts = id.split('_');

  if (parts.length !== 2) return false;
  if (parts[0] !== prefix) return false;

  return uuidRegex.test(parts[1]);
}

/**
 * Extracts the UUID portion from a prefixed ID
 *
 * @param id The prefixed ID
 * @returns The UUID portion without the prefix
 */
export function extractUuid(id: string): string | null {
  const parts = id.split('_');
  return parts.length === 2 ? parts[1] : null;
}

/**
 * Extracts the prefix from a prefixed ID
 *
 * @param id The prefixed ID
 * @returns The prefix portion
 */
export function extractPrefix(id: string): string | null {
  const parts = id.split('_');
  return parts.length === 2 ? parts[0] : null;
}

// ID Prefixes
export const ID_PREFIXES = {
  USER: 'user',
  ACCOUNT: 'acc',
  PASSWORD_RESET_TOKEN: 'prt',
  EMAIL_CONFIRMATION_TOKEN: 'ect',
  WORKSPACE: 'workspace',
  WORKSPACE_CONFIG: 'wc',
  MEMBER: 'member',
  EVENT: 'event',
  ATTENDEE: 'attendee',
  NOTIFICATION: 'notif',
  NOTIFICATION_PREFERENCES: 'np',
  INVITATION: 'inv',
  DANCE_TYPE: 'dance',
  MATERIAL: 'material',
  MATERIAL_STUDENT_SHARE: 'mss',
} as const;
