# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Database Commands
- `pnpm run db:dev:start` - Start PostgreSQL database with Docker
- `pnpm run db:dev:debug` - Open Prisma Studio at http://localhost:5555/
- `pnpm run db:dev:reset` - Reset database with fresh data
- `pnpm run db:dev:generate` - Generate Prisma client
- `pnpm run db:dev:migrate` - Run database migrations

### Application Commands
- `pnpm run start:dev` - Start development server with hot reload at http://localhost:3333/
- `pnpm run build` - Build for production (includes DB generation and migration)
- `pnpm run lint` - Run ESLint with auto-fix
- `pnpm run format` - Format code with Prettier

### Testing Commands
- `pnpm run test` - Run unit tests
- `pnpm run test:e2e` - Run end-to-end tests (includes test DB reset)
- `pnpm run test:cov` - Run tests with coverage

### Test Database Commands
- `pnpm run db:test:reset` - Reset test database (run before e2e tests)
- `pnpm run db:test:start` - Start test database container

## Architecture Overview

This is a NestJS REST API for a dance app with multi-workspace functionality.

### Core Domain Models
- **User**: System users with authentication accounts
- **Workspace**: Separate organizations/schools with their own members and events
- **Member**: Users within a specific workspace context (can have different roles per workspace)
- **Event**: Dance classes/events within a workspace
- **Invitation**: System for inviting users to workspaces or events
- **Notification**: User notifications system

### Key Architecture Patterns

#### Module Structure
Each domain has its own module (AuthModule, WorkspaceModule, etc.) with controllers, services, DTOs, and guards.

#### Authentication & Authorization
- JWT-based authentication with Passport
- Multi-level authorization: SuperAdmin > Workspace roles (OWNER, TEACHER, STUDENT)
- Guards: `JwtGuard`, `SuperAdminGuard`, `MemberGuard`, `WorkspaceRolesGuard`
- Decorators: `@GetAuthUser()`, `@Roles()`, `@WorkspaceId()`, `@CurrentWorkspace()`

#### Database Access
- Prisma ORM with PostgreSQL
- Separate dev/test database configurations
- Comprehensive seed data in `prisma/seed.ts`

#### Email System
- Handlebars templates in `src/mail/templates/`
- Transactional emails for invitations, password resets, email verification

#### Testing Strategy
- Unit tests with Jest
- E2E tests with separate test database
- Flow-based E2E tests in `test/flows/` for complex user journeys
- Custom testing utilities in `test/` directory

### Path Aliases
- `@/` maps to `src/`
- `@/lib/` maps to `lib/`
- `@/test/` maps to `test/`

### Environment Configuration
- Environment-specific config files: `.env.dev`, `.env.test`, `.env.production`
- Validation in `src/env.validation.ts`
- NODE_ENV determines which config file is used

### Database Schema Notes
- Members can exist without users (anonymous members)
- Invitations handle both workspace and event invites
- Workspace-scoped permissions and data isolation
- Support for recurring events with Google Calendar-style rules