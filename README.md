# Dance App - API

## Description

REST API build with [Nest](https://github.com/nestjs/nest).

## Installation

```bash
$ pnpm install
```

## Running the app

### Start the database

```bash
yarn docker:db:up
```

### Debug database

1. With [PgAdmin](https://www.pgadmin.org/):

```bash
yarn docker:pg-admin:up
```

You can see the DB at [http://localhost:5050/](http://localhost:5050/)

2. With Prisma studio

```bash
yarn db:dev:debug
```

You can see the DB at [http://localhost:5555/](http://localhost:5555/)

### Start the server

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Test

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Migrate

After changing schema

```
npx prisma migrate dev
```

### Tutorial followed: [video](https://www.youtube.com/watch?v=GHTA143_b-s)
