// test/prisma-test-env.ts
import { execSync } from 'child_process';
import { config } from 'dotenv';
config({ path: '.env.test' });

// Reset the test database & apply migrations
execSync(
  'npx prisma migrate reset --force --skip-seed --schema=prisma/schema.prisma',
  { stdio: 'inherit' },
);
