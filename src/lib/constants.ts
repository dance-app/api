export const MOCK_USER = {
  JOHN: {
    id: 'john',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@email.com',
    password: 'adminadmin',
    isSuperAdmin: true,
    isVerified: true,
  },
  JANE: {
    id: 'jane',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@email.com',
    password: 'adminadmin',
    isSuperAdmin: false,
    isVerified: true,
  },
  SYSTEM: {
    id: 'system',
    firstName: 'System',
    lastName: 'User',
    email: 'system@email.com',
    password: 'adminadmin',
    isSuperAdmin: true,
    isVerified: true,
  },
};

export const SUCCESS_MESSAGES = {
  PASSWORD_RESET_SUCCESS: 'password-reset-success',
  PASSWORD_RESET_EMAIL_SENT: 'password-reset-email-sent',
  EMAIL_VERIFIED_SUCCESS: 'email-verified-success',
  PASSWORD_CHANGED_SUCCESS: 'password-changed-success',
} as const;

export const ERROR_MESSAGES = {
  MIN_8_CHARACTERS: 'min-8-characters',
  MEMBER_NOT_FOUND: 'member-not-found',
  USER_ALREADY_MEMBER: 'user-already-member',
  WORKSPACE_NOT_FOUND: 'workspace-not-found',
  EMAIL_ALREADY_EXISTS: 'email-already-exists',
  PASSWORD_REQUIRED_FOR_EMAIL_SIGN_UP: 'password-required-for-email-sign-up',
  INVALID_REFRESH_TOKEN: 'invalid-refresh-token',
  INVALID_TOKEN: 'invalid-token',
  ACCOUNT_NOT_FOUND: 'account-not-found',
  EMAIL_ALREADY_VERIFIED: 'email-already-verified',
  PASSWORD_REQUIRED_FOR_EMAIL_SIGN_IN: 'password-required-for-email-sign-in',
  SOCIAL_LOGIN_REQUIRED: 'social-login-required',
  INVALID_CREDENTIALS: 'invalid-credentials',
  EMAIL_NOT_VERIFIED: 'email-not-verified',
  FORBIDDEN_CREDENTIALS: 'forbidden-credentials',
  INVALID_OR_EXPIRED_TOKEN: 'invalid-or-expired-token',
  ACCOUNT_NOT_LOCAL: 'account-not-local',
  CURRENT_PASSWORD_INCORRECT: 'current-password-incorrect',
  USER_NOT_FOUND: 'user-not-found',
  DANCE_ROLE_FILTER_INVALID: 'dance-role-filter-invalid',
} as const;
