/**
 * Prisma client singleton with SQLite adapter.
 *
 * Prisma v7 with the `prisma-client` generator requires an explicit adapter.
 * We use `better-sqlite3` for the local SQLite database.
 *
 * In development Next.js hot-reloads modules, which would create a new
 * PrismaClient on every reload and exhaust the DB connection pool.
 * We attach the instance to `globalThis` so it survives HMR.
 */

import { PrismaClient } from '@/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // Resolve the SQLite database file relative to the project root (same as prisma.config.ts)
  const dbPath = path.resolve(process.cwd(), 'dev.db');
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
