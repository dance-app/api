# Dance App - API

## Description

REST API build with [Nest](https://github.com/nestjs/nest).

## Installation

```bash
$ pnpm install
```

## Running the app

### Start the database

This will start the local database with docker

```bash
pnpm run db:dev:start
```

### Debug database

With Prisma studio

```bash
pnpm run db:dev:debug
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

### Tutorial followed: [video](https://www.youtube.com/watch?v=GHTA143_b-s)
