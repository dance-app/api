# Create database with Prisma

## Intro

Using [Prisma](https://www.prisma.io/docs/getting-started) as ORM to handle database makes 
very easy to setup the tables and the database model changes.

## Step

1. The database should be launched, see docker-compose

```bash
pnpm run db:dev:start
```

2. Create the schema with prisma in `/prisma/schema.prisma`

3. Use [Prisma Migrate](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases/using-prisma-migrate-typescript-postgresql) to create the database

```bash
npx prisma migrate dev --name init
```

*Where `init` is the name of the first migration

Prisma will create the PostgreSQL code in `/prisma/migrations/[timestamp_name]/migrations.sql` file
