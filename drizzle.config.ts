import { defineConfig } from 'drizzle-kit';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const databaseUrl = process.env.DATABASE_URL || 'data/mosa.db';
mkdirSync(dirname(resolve(databaseUrl)), { recursive: true });

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: { url: databaseUrl },
});
