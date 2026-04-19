import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { AppDataSource } from './AppDataSource';

/**
 * Lightweight migration runner: applies every *.sql file in `migrations/`
 * in lexical order. Tracks applied files in `_applied_migrations`.
 *
 * For production, replace with a real migration tool (e.g. node-pg-migrate)
 * — this is sufficient for dev and CI bootstrap.
 */
async function main(): Promise<void> {
  await AppDataSource.initialize();
  const runner = AppDataSource.createQueryRunner();

  await runner.query(`
    CREATE TABLE IF NOT EXISTS _applied_migrations (
      filename     VARCHAR(255) PRIMARY KEY,
      applied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const dir = join(__dirname, 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const already = await runner.query(
      `SELECT 1 FROM _applied_migrations WHERE filename = $1`,
      [file],
    );
    if (already.length > 0) {
      console.log(`✓ ${file} (already applied)`);
      continue;
    }

    const sql = readFileSync(join(dir, file), 'utf8');
    console.log(`→ applying ${file}`);
    await runner.query(sql);
    await runner.query(
      `INSERT INTO _applied_migrations (filename) VALUES ($1)`,
      [file],
    );
    console.log(`✓ ${file}`);
  }

  await runner.release();
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
