# Claude Rules for Dance App API

## Project Overview
This is a NestJS REST API for a dance school management application, using Prisma ORM with PostgreSQL. The project is undergoing a major refactoring to ensure all features are well-documented and well-tested with consistent patterns.

## CRITICAL: Validated vs Non-Validated Modules

### Validated Modules (REFERENCE ONLY - DO NOT MODIFY WITHOUT EXPLICIT PERMISSION)
The following modules have been completely refactored and are considered the "gold standard":
- **auth** - Authentication and user management (e2e tested, documented)
- **workspace** - Workspace management (unit tested)

**IMPORTANT RULES:**
1. **NEVER modify validated modules** unless explicitly requested by the user
2. **ALWAYS use validated modules as reference** when working on non-validated modules
3. Study auth/workspace patterns before implementing features in other modules
4. If you need to understand a pattern, read the validated module code first

### Non-Validated Modules (NEEDS WORK)
The following modules have NOT been refactored and may have inconsistent patterns, missing tests, or incomplete documentation:
- **invitation** - Invitation management
- **member** - Member/student management
- **material** - Learning materials
- **notification** - Notification system
- **user** - User profile management
- **event** - Event/class scheduling
- **database** - Database service wrapper
- **mail** - Email service
- **pagination** - Pagination utilities
- **role** - Role-based access control
- **ping** - Health check

**IMPORTANT RULES:**
1. When working on non-validated modules, you MUST follow the patterns from validated modules
2. Any new features or significant changes MUST include comprehensive tests
3. Any new modules or refactored modules MUST be documented with a README.md

## Code Patterns (Based on Validated Modules)

### 1. Module Structure
Every feature module should follow this structure:
```
src/feature/
├── README.md                    # Module documentation (REQUIRED)
├── feature.module.ts           # NestJS module definition
├── feature.controller.ts       # HTTP controllers
├── feature.service.ts          # Business logic
├── feature.e2e.spec.ts        # E2E tests (REQUIRED)
├── feature.service.unit.spec.ts # Unit tests (RECOMMENDED)
├── feature.types.ts           # TypeScript types
├── dto/                       # Data Transfer Objects
│   ├── index.ts
│   ├── create-feature.dto.ts
│   ├── update-feature.dto.ts
│   └── ...
├── guard/                     # Auth guards (if needed)
│   └── feature.guard.ts
├── decorator/                 # Custom decorators (if needed)
│   └── feature.decorator.ts
└── event/                     # Domain events (if needed)
    └── feature-event.ts
```

### 2. ID Generation
**ALWAYS use prefixed UUIDs for all database IDs:**
- Import from `@/lib/id-generator`
- Use `generateId(ID_PREFIXES.XXX)` for creating new IDs
- Use `isValidId(id, ID_PREFIXES.XXX)` for validation
- NEVER use plain UUIDs or auto-increment IDs

Available prefixes (from `src/lib/id-generator.ts`):
```typescript
USER: 'user'
ACCOUNT: 'acc'
PASSWORD_RESET_TOKEN: 'prt'
EMAIL_CONFIRMATION_TOKEN: 'ect'
WORKSPACE: 'workspace'
WORKSPACE_CONFIG: 'wc'
MEMBER: 'member'
EVENT: 'event'
ATTENDEE: 'attendee'
NOTIFICATION: 'notif'
NOTIFICATION_PREFERENCES: 'np'
INVITATION: 'inv'
DANCE_TYPE: 'dance'
MATERIAL: 'material'
MATERIAL_STUDENT_SHARE: 'mss'
```

### 3. API Response Format
**ALWAYS wrap responses in the standard envelope:**
```typescript
import { buildResponse } from '@/lib/api-response';

// Success response
return buildResponse(data, meta?);
// Returns: { data: T, error: null, meta?: any }
```

### 4. Error/Success Messages
**Use message codes for i18n support:**
```typescript
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/lib/constants';

// Success
return buildResponse({ message: SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESS });

// Error (throw HttpException)
throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
```

**IMPORTANT:** When adding new messages, add them to `src/lib/constants.ts` with kebab-case naming.

### 5. DTOs and Validation
- Use `class-validator` decorators for all input validation
- Export DTOs from `dto/index.ts` barrel file
- Create separate DTOs for create, update, search, and response operations
- NEVER expose sensitive fields (passwords, tokens) in response DTOs

Example structure:
```typescript
// create-feature.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

### 6. Testing Requirements

#### E2E Tests (REQUIRED for all modules)
- File naming: `feature.e2e.spec.ts` or `feature.e2e-spec.ts`
- Test complete user flows, not individual methods
- Use `PrismaTestingService` for database setup/teardown
- Mock external services (e.g., `MockMailService` for email)
- Use test assertions from `@/test/assertions.ts`

Example test structure (see `src/auth/auth.e2e.spec.ts`):
```typescript
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaTestingService } from '@/test/prisma-testing.service';

describe('Feature flow', () => {
  let app: INestApplication;
  const prismaTesting = new PrismaTestingService();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [/* modules */],
    })
      .overrideProvider(ExternalService)
      .useClass(MockExternalService)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await prismaTesting.close();
    await app.close();
  });

  describe('POST /endpoint', () => {
    beforeEach(async () => {
      await prismaTesting.reset();
    });

    it('should create successfully', () => {
      return request(app.getHttpServer())
        .post('/endpoint')
        .send(dto)
        .expect(201)
        .expect((res) => {
          // Assertions
        });
    });
  });
});
```

#### Unit Tests (RECOMMENDED for complex services)
- File naming: `feature.service.unit.spec.ts`
- Mock all dependencies
- Test business logic in isolation
- Use descriptive test names that explain behavior

Example test structure (see `src/workspace/workspace.service.unit.spec.ts`):
```typescript
describe('FeatureService', () => {
  let service: FeatureService;
  let database: MockDatabaseService;

  beforeEach(async () => {
    // Setup mocks
    database = { /* mock implementation */ };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FeatureService,
        { provide: DatabaseService, useValue: database },
      ],
    }).compile();

    service = moduleRef.get(FeatureService);
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      database.table.method.mockResolvedValue(mockData);
      const result = await service.methodName(params);
      expect(result).toEqual(expected);
    });

    it('should handle error case', async () => {
      database.table.method.mockResolvedValue(null);
      await expect(service.methodName(params)).rejects.toThrow(NotFoundException);
    });
  });
});
```

#### Test Utilities
Available test helpers in `test/`:
- `PrismaTestingService` - Database setup/teardown/reset
- `MockMailService` - Mock email service
- `assertions.ts` - Reusable test assertions for common shapes
- `flows/` - Reusable test flows for complex user journeys

**When adding new test utilities:**
1. Add to `test/` directory
2. Make them reusable and generic
3. Document their usage in comments

### 7. Documentation Requirements

#### Module README.md (REQUIRED)
Every module MUST have a `README.md` documenting:
1. **Overview** - What the module does
2. **Endpoints** - List all HTTP endpoints with request/response shapes
3. **Message Codes** - Success/error message codes used
4. **Testing** - How to run tests for this module
5. **Notes** - Any important implementation details

See `src/auth/README.md` as the reference template.

#### Code Comments
- Add JSDoc comments for public methods and complex logic
- Explain the "why", not the "what"
- NEVER add comments that just restate the code
- ONLY add comments where logic isn't self-evident

### 8. Guards and Decorators

#### Authentication Guards
- `@UseGuards(JwtGuard)` - Require authentication
- `@UseGuards(JwtGuard, MemberGuard)` - Require workspace membership
- `@UseGuards(JwtGuard, SuperAdminGuard)` - Require super admin
- `@Public()` - Skip authentication (use sparingly)

#### Custom Decorators
- `@GetAuthUser()` - Get authenticated user from request
- `@Roles(...)` - Specify required roles (if using RolesGuard)

### 9. Event-Driven Architecture
Use NestJS EventEmitter for domain events:
```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

// Emit event
this.eventEmitter.emit('user.created', payload);

// Listen for event (in another service)
@OnEvent('user.created')
handleUserCreated(payload: UserCreatedEvent) {
  // Handle event
}
```

**Event naming convention:** `resource.action` (e.g., `user.created`, `workspace.deleted`)

## Development Workflow

### Before Starting Work on a Module
1. **Read AGENTS.md** for general coding guidelines
2. **Study validated modules** (auth, workspace) to understand patterns
3. **Check if working on non-validated module** - if yes, plan to bring it up to standard
4. **Ask user for clarification** if requirements are unclear

### When Adding New Features
1. **Plan the implementation** - consider existing patterns
2. **Create/update DTOs** with proper validation
3. **Implement service layer** with business logic
4. **Implement controller** with proper guards
5. **Write E2E tests** covering all flows
6. **Write unit tests** for complex logic
7. **Update/create README.md** documenting the feature
8. **Add message codes** to constants if needed
9. **Run linter** - `pnpm run lint:check`
10. **Run tests** - `pnpm run test` and `pnpm run test:e2e`

### When Refactoring Non-Validated Modules
1. **Start with tests** - write comprehensive tests first
2. **Follow validated patterns** exactly
3. **Update documentation** - create/update README.md
4. **Verify no regressions** - ensure all tests pass
5. **Request user review** before considering module "validated"

## Database and Prisma

### Schema Changes
1. Edit `prisma/schema.prisma`
2. Create migration: `pnpm run db:dev:migrate`
3. Update seed if needed: `prisma/seed.ts`
4. Regenerate client: `pnpm run db:dev:generate`

### Soft Deletes
Use `deletedAt` field for soft deletes:
```typescript
// Soft delete
await this.database.table.update({
  where: { id },
  data: {
    deletedAt: new Date(),
    slug: null, // Clear unique fields if needed
  },
});

// Filter out soft deleted
await this.database.table.findMany({
  where: { deletedAt: null },
});
```

## Environment and Configuration

### Environment Files
- `.env.dev` - Local development (DO NOT commit)
- `.env.test` - Test environment (DO NOT commit)
- `.env.example` - Template for required variables (COMMIT this)

### Configuration Validation
Use `src/env.validation.ts` with Joi schemas for runtime validation of environment variables.

## Common Pitfalls to Avoid

1. **DON'T use plain UUIDs** - Always use prefixed IDs
2. **DON'T expose sensitive data** - Use DTOs to filter responses
3. **DON'T skip tests** - Tests are REQUIRED, not optional
4. **DON'T use direct Prisma queries in controllers** - Keep logic in services
5. **DON'T modify validated modules casually** - Ask first
6. **DON'T create new patterns** - Follow existing validated patterns
7. **DON'T skip documentation** - Update/create README.md
8. **DON'T use magic strings** - Use constants from `@/lib/constants`
9. **DON'T mix concerns** - Keep controllers thin, services focused
10. **DON'T commit without linting** - Run `pnpm run lint:check` first

## Testing Commands Reference
```bash
# Unit tests (matches *.unit.spec.ts)
pnpm run test

# E2E tests (resets test DB first)
pnpm run test:e2e

# Test coverage
pnpm run test:cov

# Watch mode for unit tests
pnpm run test:watch
```

## Quick Checklist for Code Reviews

Before considering any module "validated":
- [ ] Has comprehensive E2E tests covering all endpoints
- [ ] Has unit tests for complex business logic
- [ ] Has README.md documenting the module
- [ ] Uses prefixed IDs everywhere
- [ ] Uses buildResponse for all responses
- [ ] Uses message codes from constants
- [ ] Has proper DTOs with validation
- [ ] Follows NestJS best practices
- [ ] All tests pass (unit + e2e)
- [ ] Linter passes with no errors
- [ ] No sensitive data exposed
- [ ] Guards properly applied
- [ ] Soft deletes used where appropriate
- [ ] Events emitted for significant actions

## Getting Help

- **AGENTS.md** - General repository guidelines
- **src/auth/** - Reference implementation for authentication flows
- **src/workspace/** - Reference implementation for CRUD with soft deletes
- **test/flows/** - Examples of complex integration test flows

---

**Remember:** The goal is consistency and quality. When in doubt, follow the patterns from validated modules (auth, workspace) exactly.
