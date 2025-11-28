# Auth Module

## Overview
- Handles sign-up, sign-in, refresh, forgot/reset password, email verification, profile (`/auth/me`), and password change.
- All IDs are prefixed UUID strings (e.g., `user_…`, `acc_…`) generated via `src/lib/id-generator.ts`.
- Successful responses are wrapped in the shared envelope returned by `buildResponse` (`{ data, error: null, meta? }`); errors surface message codes from `SUCCESS_MESSAGES`/`ERROR_MESSAGES` so the frontend can localize.
- Emits `user.created` when a brand-new user is created; listeners (e.g., invitations/notifications) hook into this to link pending invites.

## Endpoints (JSON)
- `POST /auth/sign-up` → `{ user, accessToken, refreshToken }`
- `POST /auth/sign-in` → `{ user, accessToken, refreshToken }`
- `POST /auth/refresh-token` → `{ accessToken }`
- `POST /auth/forgot-password` → `{ message: password-reset-email-sent }`
- `POST /auth/reset-password` → `{ message: password-reset-success }`
- `POST /auth/verify-email` → `{ message: email-verified-success }`
- `GET /auth/me` → `SafeUserDto`
- `PATCH /auth/change-password` → `{ message: password-changed-success }`

All of the above are wrapped under `data` in the response envelope.

## Message Codes
- Success: `password-reset-email-sent`, `password-reset-success`, `email-verified-success`, `password-changed-success`
- Errors (selected): `email-already-exists`, `password-required-for-email-sign-up`, `invalid-refresh-token`, `invalid-token`, `account-not-found`, `email-already-verified`, `password-required-for-email-sign-in`, `social-login-required`, `invalid-credentials`, `email-not-verified`, `forbidden-credentials`, `invalid-or-expired-token`, `account-not-local`, `current-password-incorrect`, `user-not-found`

## Testing
- Unit/e2e: `pnpm run test` or run the auth e2e spec `src/auth/auth.e2e.spec.ts` (uses mocked mail service and Prisma test helpers).
- Lint: `pnpm run lint:check`

## Notes
- JWT payload fields: `uid` (user id), `aid` (account id), `email`, `provider`, `isSuperAdmin`.
- Forgot/reset flows silently hide unknown emails; reset and verification tokens are one-time and time-bound.
