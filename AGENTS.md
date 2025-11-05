# Repository Guidelines

## Project Structure & Module Organization
`src/` hosts the NestJS modules, controllers, and providers; mirror its feature folders when adding new APIs. Share cross-cutting utilities in `lib/`, and keep generated Prisma types under `prisma/`. Integration and unit specs live in `test/`, while documentation assets sit in `docs/`. The build artifact in `dist/` is disposable—never edit it by hand.

## Build, Test, and Development Commands
- `pnpm install` — install dependencies (lockfile is pnpm-lock.yaml; keep it in sync).
- `pnpm run start:dev` — watch-mode API server with `NODE_ENV=dev`.
- `pnpm run build` — run Prisma generate/migrate against `.env.dev`, then compile Nest to `dist/`.
- `pnpm run lint:check` / `pnpm run format:check` — ensure ESLint and Prettier compliance.
- `pnpm run test` / `pnpm run test:e2e` — execute Jest unit suites or end-to-end tests after seeding the test DB.

## Coding Style & Naming Conventions
TypeScript code uses ESLint + Prettier defaults (2-space indentation, single quotes, trailing commas where valid). Use `PascalCase` for classes/providers, `camelCase` for variables and methods, and `SCREAMING_SNAKE_CASE` for environment constants. Match Nest patterns: controllers end with `.controller.ts`, services with `.service.ts`, DTOs in `dto/` folders. Run `pnpm run format` before committing any large refactor.

## Testing Guidelines
Write Jest specs alongside features, naming files `*.spec.ts`. Prefer focused unit tests for services and guards, and reserve the `test/` directory for e2e suites driven by Supertest. Keep coverage healthy by running `pnpm run test:cov`; investigate dips below the current threshold before opening a PR. Seed data for e2e runs via the existing Prisma seed in `prisma/seed.ts`.

## Database & Environment Setup
Use `.env.dev` for local development and `.env.test` for automated suites; avoid committing either. Start Postgres containers with `pnpm run db:dev:start` or `pnpm run db:test:start`, and tear them down using the matching `...:kill` scripts. Reset schemas with `pnpm run db:dev:reset` or `pnpm run db:test:reset` when migrations drift. Keep Prisma schema updates in `prisma/schema.prisma` and regenerate clients via `pnpm run db:dev:generate`.

## Commit & Pull Request Guidelines
Follow the existing imperative, concise commit style (`Fix missing workspace field`). Group related changes per commit, and include database migration snapshots together with schema edits. Before raising a PR, run lint, format, unit, and e2e checks, and note the output in the PR description. Reference Jira issues or GitHub tickets with `Closes #123` and add screenshots for API contract changes where applicable.
