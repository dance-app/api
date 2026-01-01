# Codex Rules for Dance App API

## Project Snapshot
- NestJS REST API with Prisma + PostgreSQL for a dance school manager.
- Auth + workspace modules are the reference implementations; treat them as read-only unless the user explicitly approves changes.
- Remaining modules need consistency, tests, and docs; mirror validated patterns when touching them.

## Module Status
**Validated (reference only, do not modify without explicit approval):**
- auth
- workspace

**Non-validated (bring up to validated standards if you work here):**
- invitation, member, material, notification, user, event, database, mail, pagination, role, ping

Rules:
1) Never edit validated modules unless the user says so. Use them as the pattern library.
2) When in non-validated modules, follow validated patterns and add tests + docs.

## Core Patterns to Follow
- **Structure:** `src/<feature>/` with module, controller, service, dto/, guard/, decorator/, event/, README.md, and tests (`*.e2e.spec.ts`, `*.service.unit.spec.ts`).
- **IDs:** Always use prefixed UUID helpers from `src/lib/id-generator.ts` (`generateId`, `isValidId`, `ID_PREFIXES`).
- **Responses:** Wrap all responses with `buildResponse` from `@/lib/api-response`.
- **Messages:** Use message codes from `src/lib/constants.ts`; add new codes there (kebab-case).
- **DTOs:** Use `class-validator`; export from `dto/index.ts`; never expose sensitive fields.
- **Events:** Use `EventEmitter2`; name events `resource.action` (e.g., `user.created`).
- **Docs:** Every module needs a README covering overview, endpoints, message codes, testing, notes.

## Testing Expectations
- E2E tests are required for each module (`feature.e2e.spec.ts`); use `PrismaTestingService`, mock externals, and reset DB between flows.
- Unit tests for complex services are recommended (`feature.service.unit.spec.ts`) with dependencies mocked.
- Run commands: `pnpm run test`, `pnpm run test:e2e`, `pnpm run test:cov`. Keep coverage healthy.

## Workflow Checklist
1) Read `AGENTS.md` and validated modules before changing anything.
2) Plan against existing patterns; do not invent new ones.
3) Add/update DTOs with validation; keep controllers thin and services focused.
4) Add/keep message codes + prefixed IDs; wrap responses with `buildResponse`.
5) Write/refresh E2E + unit tests; use test utilities in `test/`.
6) Update module README.md.
7) Run `pnpm run lint:check` and appropriate tests before handing off.

## Git and Commits
- Use concise imperative messages; group related changes.
- Include migration snapshots with schema edits.
- No AI footers or attribution; keep commits professional.

## Environment + Commands
- Use `.env.dev` for local, `.env.test` for tests; do not commit real env files.
- Common commands: `pnpm install`, `pnpm run start:dev`, `pnpm run build`, `pnpm run format:check`, `pnpm run lint:check`, test commands above.
- Use `pnpm run db:dev:start|kill|reset|generate` (or `...:test:*`) to manage Postgres and Prisma.

## Quick No-Gos
- Do not use plain UUIDs or direct Prisma calls in controllers.
- Do not skip tests or docs on new/refactored work.
- Do not expose sensitive fields; use DTOs.
- Do not create new patterns; follow auth/workspace.
- Do not modify validated modules without explicit user approval.

## References
- `src/auth/` and `src/workspace/` for gold-standard patterns.
- `test/` utilities (`PrismaTestingService`, `MockMailService`, `assertions.ts`, `flows/`).
- `AGENTS.md` for general repo expectations.
