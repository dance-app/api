# User Module

## Overview
Handles administrative user management including listing, viewing, updating, and deleting user accounts.

**IMPORTANT**: All endpoints in this module require super admin access. Regular users cannot access these endpoints - they are for system administration only. User profile management for regular users is handled through workspace member endpoints.

## Endpoints (JSON)

### `GET /users`
List all users with pagination

**Access:** Super admin only

**Request:**
```bash
GET /users?limit=10&offset=0
Authorization: Bearer {super_admin_token}
```

**Response:**
```json
{
  "data": {
    "data": [
      {
        "id": "user_123e4567-e89b-12d3-a456-426614174000",
        "firstName": "John",
        "lastName": "Doe",
        "isSuperAdmin": false,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-02T00:00:00.000Z"
      }
    ],
    "meta": {
      "totalCount": 100,
      "count": 10,
      "limit": 10,
      "offset": 0
    }
  },
  "error": null
}
```

---

### `GET /users/:id`
Get user by ID

**Access:** Super admin only

**Request:**
```bash
GET /users/user_123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "data": {
    "id": "user_123e4567-e89b-12d3-a456-426614174000",
    "firstName": "John",
    "lastName": "Doe",
    "isSuperAdmin": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z",
    "accounts": [
      {
        "id": "acc_123e4567-e89b-12d3-a456-426614174000",
        "email": "john@example.com",
        "provider": "LOCAL",
        "isEmailVerified": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  },
  "error": null
}
```

---

### `PATCH /users/:id`
Update user profile

**Access:** Super admin only

**Request:**
```bash
PATCH /users/user_123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

**Response:**
```json
{
  "data": {
    "id": "user_123e4567-e89b-12d3-a456-426614174000",
    "firstName": "Jane",
    "lastName": "Smith",
    "isSuperAdmin": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-02T10:30:00.000Z",
    "accounts": [...]
  },
  "error": null
}
```

**Note:** Password changes and email verification are handled through the `auth` module endpoints.

---

### `DELETE /users/:id`
Soft delete user

**Access:** Super admin only

**Request:**
```bash
DELETE /users/user_123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer {super_admin_token}
```

**Response:**
```json
{
  "data": {
    "id": "user_123e4567-e89b-12d3-a456-426614174000",
    "firstName": "John",
    "lastName": "Doe",
    "isSuperAdmin": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-02T10:30:00.000Z"
  },
  "error": null
}
```

**Note:** This is a soft delete - the user record remains in the database with `deletedAt` timestamp set.

---

## Response Format

All responses are wrapped in the standard envelope:
```json
{
  "data": T,
  "error": null,
  "meta": { /* optional metadata */ }
}
```

## Error Messages

Errors use message codes for i18n support:
- `user-not-found` - User with specified ID not found or is deleted

**Note:** Super admin guard returns 404 (instead of 403) to hide admin-only routes from regular users.

## Related Endpoints

### Auth Module (User Profile & Authentication)
- `POST /auth/sign-up` → Create new user account
- `POST /auth/sign-in` → Sign in user
- `GET /auth/me` → Get current user profile
- `PATCH /auth/change-password` → Change user password
- `POST /auth/verify-email` → Verify user email
- `POST /auth/forgot-password` → Request password reset
- `POST /auth/reset-password` → Reset password with token

### Workspace Module (Regular User Access)
Regular users access user information through workspace member endpoints:
- `GET /workspaces/:slug/members` → List members in a workspace
- `GET /workspaces/:slug/members/:memberId` → Get member details
- `PATCH /workspaces/:slug/members/:memberId` → Update member profile

## Testing

### E2E Tests
```bash
# Run E2E tests
pnpm run test:e2e

# Test file location
src/user/user.e2e.spec.ts
```

**Test coverage:**
- ✅ GET /users - List users with pagination (super admin only)
- ✅ GET /users/:id - Get user by ID (super admin only)
- ✅ PATCH /users/:id - Update user (super admin only)
- ✅ DELETE /users/:id - Soft delete user (super admin only)
- ✅ Regular users blocked from all endpoints (404)
- ✅ Soft delete verification
- ✅ Error handling (404, 401)

### Unit Tests
```bash
# Run unit tests
pnpm run test

# Test file location
src/user/user.service.unit.spec.ts
```

**Test coverage:**
- ✅ DTO transformation (toDto, toDtoList)
- ✅ Read all users with pagination
- ✅ Find/get user by ID
- ✅ Update user
- ✅ Delete user (soft delete)
- ✅ Read user by email
- ✅ Error handling for all service methods

## Implementation Notes

### Soft Deletes
Users are soft deleted, not hard deleted:
- `deletedAt` timestamp is set when user is deleted
- Deleted users are filtered from all queries
- Deleted users cannot be accessed or modified
- Attempting to delete an already deleted user returns 404

### Security
- Passwords are NEVER returned in any response
- Account details only shown when explicitly requested (by ID)
- **ALL routes require super admin access** - regular users blocked (404)
- SuperAdminGuard returns 404 instead of 403 to hide admin routes

### DTOs
- `UserResponseDto` - Safe user data without sensitive fields
- `SafeAccountDto` - Account data without password
- `UpdateUserDto` - Fields allowed for update (firstName, lastName only)

### ID Format
All user IDs use prefixed UUIDs:
```
user_123e4567-e89b-12d3-a456-426614174000
```
Generated via `generateId(ID_PREFIXES.USER)`

## Module Structure

```
src/user/
├── README.md                   # This file
├── user.module.ts             # NestJS module definition
├── user.controller.ts         # HTTP endpoints
├── user.service.ts            # Business logic
├── user.e2e.spec.ts          # E2E tests
├── user.service.unit.spec.ts # Unit tests
├── user.types.ts             # TypeScript types
└── dto/
    ├── index.ts              # Barrel exports
    ├── user.dto.ts           # Base DTOs
    ├── user-response.dto.ts  # Response DTOs
    └── public-user.dto.ts    # Public user DTO
```

## Development Guidelines

When making changes to this module:
1. Update tests first (TDD approach)
2. Ensure all tests pass: `pnpm run test && pnpm run test:e2e`
3. Update this README if adding new endpoints
4. Follow patterns from validated modules (auth, workspace)
5. Run linter: `pnpm run lint:check`
6. Never expose sensitive data (passwords, tokens)
7. Always use DTOs for responses
8. Always use error message codes from constants
