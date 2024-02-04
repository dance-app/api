# Dance App - API

## Description

REST API build with [Nest](https://github.com/nestjs/nest).

## Installation

```bash
$ yarn install
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
$ yarn start

# watch mode
$ yarn start:dev

# production mode
$ yarn start:prod
```

### Run tests

```bash
# unit tests
$ yarn test

# e2e tests
$ yarn test:e2e

# test coverage
$ yarn test:cov
```

## Migrate

After changing schema

```
npx prisma migrate dev
```

# Tutorial followed: [video](https://www.youtube.com/watch?v=GHTA143_b-s)
