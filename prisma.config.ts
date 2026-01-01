import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
    // shadowDatabaseUrl can be added here if needed for migrations/tests
    // shadowDatabaseUrl: process.env['SHADOW_DATABASE_URL'],
  },
});
