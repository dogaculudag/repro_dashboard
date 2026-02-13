import * as dotenv from 'dotenv';
import path from 'path';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { truncateAllTables } from './utils/db-cleaner';

// Load .env.test BEFORE any Prisma/DATABASE_URL usage (must run before test files load)
// Ensures tests never touch development database
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });
if (process.env.NODE_ENV !== 'test') {
  throw new Error('Tests must run with NODE_ENV=test (use cross-env or vitest env config)');
}

// Import real prisma at top level (before vi.mock in test files takes effect)
import { prisma as realPrisma } from '@/lib/db';

beforeAll(async () => {
  await realPrisma.$connect();
});

afterEach(async () => {
  await truncateAllTables(realPrisma);
});

afterAll(async () => {
  await realPrisma.$disconnect();
});
