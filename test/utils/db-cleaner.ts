import { PrismaClient } from '@prisma/client';

/**
 * Dynamically truncates all public tables safely with CASCADE.
 * Use after each test to ensure a clean DB state for integration tests.
 */
export async function truncateAllTables(prisma: PrismaClient): Promise<void> {
  const result = await prisma.$queryRawUnsafe<[{ string_agg: string | null }]>(
    `SELECT string_agg(quote_ident(tablename), ', ') as string_agg 
     FROM pg_tables 
     WHERE schemaname = 'public'`
  );

  const tableList = result[0]?.string_agg;
  if (!tableList) return;

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} CASCADE`);
}
